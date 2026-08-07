import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, asyncHandler, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get(
  '/summary',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const [
      totalCustomers,
      activeCustomers,
      totalProducts,
      lowStockCount,
      totalChallans,
      confirmedChallans,
      draftChallans,
      recentChallans,
      dueFollowUps,
      lowStockProducts,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { status: 'ACTIVE' } }),
      prisma.product.count(),
      prisma.product.count({ where: { currentStock: { lte: prisma.product.fields.minStockAlert } } }),
      prisma.challan.count(),
      prisma.challan.count({ where: { status: 'CONFIRMED' } }),
      prisma.challan.count({ where: { status: 'DRAFT' } }),
      prisma.challan.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { name: true } }, creator: { select: { name: true } } },
      }),
      prisma.customer.findMany({
        where: { followUpDate: { not: null } },
        orderBy: { followUpDate: 'asc' },
        take: 8,
        select: {
          id: true,
          name: true,
          mobile: true,
          status: true,
          followUpDate: true,
        },
      }),
      prisma.product.findMany({
        where: { currentStock: { lte: prisma.product.fields.minStockAlert } },
        orderBy: { currentStock: 'asc' },
        take: 5,
        select: {
          id: true,
          name: true,
          sku: true,
          currentStock: true,
          minStockAlert: true,
        },
      }),
    ]);

    const days = 7;
    const trend: { date: string; label: string; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - i);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      const count = await prisma.challan.count({
        where: { createdAt: { gte: day, lt: next } },
      });
      trend.push({
        date: day.toISOString().slice(0, 10),
        label: day.toLocaleDateString('en-IN', { weekday: 'short' }),
        count,
      });
    }

    res.json({
      customers: {
        total: totalCustomers,
        active: activeCustomers,
        dueFollowUps,
      },
      products: {
        total: totalProducts,
        lowStock: lowStockCount,
        lowStockProducts,
      },
      challans: {
        total: totalChallans,
        confirmed: confirmedChallans,
        draft: draftChallans,
        recent: recentChallans,
        trend,
      },
    });
  })
);

export default router;
