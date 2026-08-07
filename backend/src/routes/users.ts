import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, asyncHandler, roleGuard, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get(
  '/',
  roleGuard(['ADMIN']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ data: users });
  })
);

router.put(
  '/:id/active',
  roleGuard(['ADMIN']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { active } = req.body;
    if (typeof active !== 'boolean') {
      return res.status(400).json({ error: 'active must be a boolean' });
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { active },
      select: { id: true, name: true, active: true },
    });
    res.json(user);
  })
);

export default router;
