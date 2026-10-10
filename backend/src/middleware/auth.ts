// @ts-nocheck
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';
import { unauthorized, forbidden } from '../lib/response.js';

export type UserRole = 'admin' | 'manager' | 'operator' | 'qc_inspector' | 'viewer' | 'client';

export interface AuthPayload {
  sub: string;   // user id
  email: string;
  role: UserRole;
  name: string;
}

// Augment Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/**
 * Parses and verifies the JWT in `Authorization: Bearer <token>`.
 * Attaches `req.user` on success. Returns 401 on failure.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    unauthorized(res);
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    unauthorized(res, 'Invalid or expired token');
  }
}

/**
 * Role-based authorization. Must be used AFTER authenticate().
 * Usage: router.get('/foo', authenticate, authorize('admin', 'manager'), handler)
 */
export function authorize(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      unauthorized(res);
      return;
    }
    if (!roles.includes(req.user.role)) {
      forbidden(res, `Role '${req.user.role}' is not allowed here`);
      return;
    }
    next();
  };
}

/**
 * Sign a JWT for a user.
 */
export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: '8h' });
}
