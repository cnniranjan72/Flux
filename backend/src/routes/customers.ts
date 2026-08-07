import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authMiddleware, asyncHandler, AuthRequest } from '../middleware/auth';
import { validate, paginate } from '../middleware/validate';
import { ApiError } from '../middleware/error';
import { customerCreateSchema, customerUpdateSchema, followUpSchema } from '../lib/schemas';

const router = Router();
router.use(authMiddleware);

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { search, status, type } = req.query;
    const { skip, take } = paginate(req.query.skip, req.query.take, 20);

    const where: Prisma.CustomerWhereInput = {};
    if (search) {
      const term = String(search);
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { mobile: { contains: term, mode: 'insensitive' } },
        { businessName: { contains: term, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = String(status) as any;
    if (type) where.type = String(type);

    const [data, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          mobile: true,
          email: true,
          businessName: true,
          type: true,
          status: true,
          followUpDate: true,
          createdAt: true,
          _count: { select: { followUps: true, challans: true } },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({ data, total, skip, take, page: Math.floor(skip / take) + 1 });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        followUps: {
          include: { creator: { select: { name: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
        challans: {
          orderBy: { createdAt: 'desc' },
          include: { items: true },
        },
      },
    });
    if (!customer) throw new ApiError(404, 'Customer not found');
    res.json(customer);
  })
);

router.post(
  '/',
  validate(customerCreateSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const body = req.body;
    const customer = await prisma.customer.create({
      data: {
        name: body.name,
        mobile: body.mobile,
        email: body.email,
        businessName: body.businessName,
        gstNumber: body.gstNumber,
        type: body.type,
        address: body.address,
        status: body.status,
        followUpDate: body.followUpDate ? new Date(body.followUpDate) : null,
        notes: body.notes,
      },
    });
    res.status(201).json(customer);
  })
);

router.put(
  '/:id',
  validate(customerUpdateSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const exists = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!exists) throw new ApiError(404, 'Customer not found');

    const body = req.body as any;
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        ...body,
        followUpDate: body.followUpDate ? new Date(body.followUpDate) : body.followUpDate,
      },
    });
    res.json(customer);
  })
);

router.post(
  '/:id/follow-ups',
  validate(followUpSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!customer) throw new ApiError(404, 'Customer not found');

    const followUp = await prisma.followUp.create({
      data: {
        customerId: req.params.id,
        note: req.body.note,
        nextFollowDate: new Date(req.body.nextFollowDate || Date.now()),
        createdBy: req.user!.id,
      },
      include: { creator: { select: { name: true, role: true } } },
    });

    if (req.body.nextFollowDate) {
      await prisma.customer.update({
        where: { id: req.params.id },
        data: { followUpDate: new Date(req.body.nextFollowDate) },
      });
    }

    res.status(201).json(followUp);
  })
);

export default router;
