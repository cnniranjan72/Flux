import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { asyncHandler, authMiddleware, roleGuard, AuthRequest } from '../middleware/auth';
import { ApiError } from '../middleware/error';
import { loginSchema, registerSchema } from '../lib/schemas';

const router = Router();

router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) {
      throw new ApiError(401, 'Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new ApiError(401, 'Invalid credentials');
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email, name: user.name },
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'] }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, role: user.role, email: user.email },
    });
  })
);

router.post(
  '/register',
  authMiddleware,
  roleGuard(['ADMIN']),
  validate(registerSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email, password, name, role } = req.body;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      throw new ApiError(409, 'User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name, role },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    res.status(201).json({ message: 'User created', user });
  })
);

router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    res.json({ user: req.user });
  })
);

export default router;
