import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authMiddleware, asyncHandler, roleGuard, AuthRequest } from '../middleware/auth';
import { validate, paginate } from '../middleware/validate';
import { ApiError } from '../middleware/error';
import { challanCreateSchema } from '../lib/schemas';
import { generateInvoicePdf } from '../lib/invoice';

const router = Router();
router.use(authMiddleware);

async function generateChallanNumber(): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const latest = await tx.challan.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { challanNumber: true },
    });

    let next = 1001;
    if (latest) {
      const match = latest.challanNumber.match(/-(\d+)$/);
      if (match) next = parseInt(match[1], 10) + 1;
    }
    const number = `CH-${next}`;

    const exists = await tx.challan.findUnique({ where: { challanNumber: number } });
    if (exists) {
      const count = await tx.challan.count();
      return `CH-${1001 + count}`;
    }
    return number;
  });
}

async function getProductSnapshot(ids: string[]) {
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      sku: true,
      category: true,
      unitPrice: true,
      currentStock: true,
      location: true,
    },
  });
  return products;
}

async function deductStock(tx: Prisma.TransactionClient, challan: any, userId: string) {
  for (const item of challan.items) {
    const product = await tx.product.findUnique({ where: { id: item.productId } });
    if (!product) {
      throw new ApiError(404, `Product not found for item ${item.productId}`);
    }
    if (product.currentStock < item.quantity) {
      throw new ApiError(
        400,
        `Insufficient stock for ${product.name}. Available: ${product.currentStock}, required: ${item.quantity}`
      );
    }
  }

  for (const item of challan.items) {
    await tx.product.update({
      where: { id: item.productId },
      data: { currentStock: { decrement: item.quantity } },
    });
    await tx.stockMovement.create({
      data: {
        productId: item.productId,
        quantityChanged: item.quantity,
        movementType: 'OUT',
        reason: `Challan ${challan.challanNumber} confirmed`,
        createdBy: userId,
      },
    });
  }
}

router.post(
  '/',
  roleGuard(['ADMIN', 'SALES']),
  validate(challanCreateSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { customerId, items, status } = req.body;

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new ApiError(404, 'Customer not found');

    const productIds = items.map((i: any) => i.productId);
    const products = await getProductSnapshot(productIds);
    if (products.length !== productIds.length) {
      throw new ApiError(400, 'One or more products were not found');
    }

    const totalQuantity = items.reduce((sum: number, i: any) => sum + i.quantity, 0);
    const challanNumber = await generateChallanNumber();

    const challan = await prisma.$transaction(async (tx) => {
      const created = await tx.challan.create({
        data: {
          challanNumber,
          customerId,
          status: status === 'CONFIRMED' ? 'CONFIRMED' : 'DRAFT',
          totalQuantity,
          createdBy: req.user!.id,
          productSnapshot: products,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: products.find((p) => p.id === item.productId)?.unitPrice ?? 0,
            })),
          },
        },
        include: { items: { include: { product: true } }, customer: true },
      });

      if (created.status === 'CONFIRMED') {
        await deductStock(tx, created, req.user!.id);
      }
      return created;
    });

    res.status(201).json(challan);
  })
);

router.put(
  '/:id/confirm',
  roleGuard(['ADMIN', 'SALES', 'WAREHOUSE']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const challan = await prisma.challan.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!challan) throw new ApiError(404, 'Challan not found');
    if (challan.status !== 'DRAFT') {
      throw new ApiError(400, `Only draft challans can be confirmed (current: ${challan.status})`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      await deductStock(tx, challan, req.user!.id);
      return tx.challan.update({
        where: { id: challan.id },
        data: { status: 'CONFIRMED' },
        include: { items: { include: { product: true } }, customer: true },
      });
    });

    res.json(updated);
  })
);

router.put(
  '/:id/cancel',
  roleGuard(['ADMIN', 'SALES']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const challan = await prisma.challan.findUnique({ where: { id: req.params.id } });
    if (!challan) throw new ApiError(404, 'Challan not found');
    if (challan.status !== 'DRAFT') {
      throw new ApiError(400, 'Only draft challans can be cancelled');
    }

    const updated = await prisma.challan.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
    });
    res.json(updated);
  })
);

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status, customerId } = req.query;
    const { skip, take } = paginate(req.query.skip, req.query.take, 20);

    const where: Prisma.ChallanWhereInput = {};
    if (status) where.status = String(status) as any;
    if (customerId) where.customerId = String(customerId);

    const [data, total] = await Promise.all([
      prisma.challan.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, businessName: true } },
          creator: { select: { id: true, name: true, role: true } },
          items: true,
        },
      }),
      prisma.challan.count({ where }),
    ]);

    res.json({ data, total, skip, take, page: Math.floor(skip / take) + 1 });
  })
);

router.get(
  '/:id/invoice',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const challan = await prisma.challan.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        creator: { select: { name: true, role: true } },
        items: { include: { product: true } },
      },
    });
    if (!challan) throw new ApiError(404, 'Challan not found');

    const pdf = await generateInvoicePdf({
      challanNumber: challan.challanNumber,
      status: challan.status,
      totalQuantity: challan.totalQuantity,
      createdAt: challan.createdAt.toISOString(),
      customer: {
        name: challan.customer.name,
        businessName: challan.customer.businessName,
        mobile: challan.customer.mobile,
        email: challan.customer.email,
        address: challan.customer.address,
        gstNumber: challan.customer.gstNumber,
      },
      creator: challan.creator,
      items: challan.items.map((i) => ({
        name: i.product.name,
        sku: i.product.sku,
        price: i.price || i.product.unitPrice,
        quantity: i.quantity,
      })),
      productSnapshot: challan.productSnapshot as any[],
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${challan.challanNumber}.pdf"`
    );
    res.send(pdf);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const challan = await prisma.challan.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        creator: { select: { id: true, name: true, role: true } },
        items: { include: { product: true } },
      },
    });
    if (!challan) throw new ApiError(404, 'Challan not found');
    res.json(challan);
  })
);

export default router;
