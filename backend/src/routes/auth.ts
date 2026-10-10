import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { ok, unauthorized } from '../lib/response.js';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { signToken } from '../middleware/auth.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

/**
 * POST /api/v1/auth/login
 * Returns JWT on valid credentials.
 */
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body as z.infer<typeof loginSchema>;

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      unauthorized(res, 'Invalid email or password');
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      unauthorized(res, 'Invalid email or password');
      return;
    }

    const token = signToken({ sub: user.id, email: user.email, role: user.role, name: user.name });
    ok(res, { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/auth/me
 * Returns current user info from JWT.
 */
router.get('/me', authenticate, (req, res) => {
  ok(res, req.user);
});

/**
 * POST /api/v1/auth/logout
 * Stateless JWT — just acknowledge.
 */
router.post('/logout', authenticate, (_req, res) => {
  ok(res, { message: 'Logged out' });
});

export default router;
