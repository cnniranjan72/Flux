import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authMiddleware, asyncHandler, AuthRequest } from '../middleware/auth';
import { validate, paginate } from '../middleware/validate';
import { ApiError } from '../middleware/error';
import { productCreateSchema, productUpdateSchema, stockMovementSchema } from '../lib/schemas';

const router = Router();
router.use(authMiddleware);

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { search, category, lowStock } = req.query;
    const { skip, take } = paginate(req.query.skip, req.query.take, 20);

    const where: Prisma.ProductWhereInput = {};
    if (search) {
      const term = String(search);
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { sku: { contains: term, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = String(category);
    if (lowStock === 'true') {
      where.currentStock = { lte: prisma.product.fields.minStockAlert };
    }

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({ data, total, skip, take, page: Math.floor(skip / take) + 1 });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        stockMovements: {
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
    if (!product) throw new ApiError(404, 'Product not found');
    res.json(product);
  })
);

router.post(
  '/',
  validate(productCreateSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const product = await prisma.product.create({
      data: {
        name: req.body.name,
        sku: req.body.sku,
        category: req.body.category,
        unitPrice: req.body.unitPrice,
        currentStock: req.body.currentStock,
        minStockAlert: req.body.minStockAlert,
        location: req.body.location,
      },
    });

    if (req.body.currentStock > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          quantityChanged: req.body.currentStock,
          movementType: 'IN',
          reason: 'Initial stock on product creation',
          createdBy: req.user!.id,
        },
      });
    }

    res.status(201).json(product);
  })
);

router.put(
  '/:id',
  validate(productUpdateSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const exists = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!exists) throw new ApiError(404, 'Product not found');

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(product);
  })
);

router.post(
  '/stock-movements',
  validate(stockMovementSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { productId, quantityChanged, movementType, reason } = req.body;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new ApiError(404, 'Product not found');

    const delta = movementType === 'IN' ? quantityChanged : -quantityChanged;
    const newStock = product.currentStock + delta;

    if (newStock < 0) {
      throw new ApiError(400, `Insufficient stock. Current stock is ${product.currentStock}`);
    }

    const [movement] = await prisma.$transaction([
      prisma.stockMovement.create({
        data: { productId, quantityChanged, movementType, reason, createdBy: req.user!.id },
        include: { user: { select: { name: true } } },
      }),
      prisma.product.update({
        where: { id: productId },
        data: { currentStock: newStock },
      }),
    ]);

    res.status(201).json({ movement, currentStock: newStock });
  })
);

router.get(
  '/:id/movements',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) throw new ApiError(404, 'Product not found');

    const { skip, take } = paginate(req.query.skip, req.query.take, 50);
    const [data, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where: { productId: req.params.id },
        include: { user: { select: { name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.stockMovement.count({ where: { productId: req.params.id } }),
    ]);

    res.json({ data, total });
  })
);

export default router;
