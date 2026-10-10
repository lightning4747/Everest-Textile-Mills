// @ts-nocheck
import type { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { badRequest } from '../lib/response.js';

type Target = 'body' | 'query' | 'params';

/**
 * Middleware factory: validates req[target] against a Zod schema.
 * On failure: returns 400 with field-level errors.
 * On success: replaces req[target] with the parsed (coerced) value.
 */
export function validate(schema: ZodSchema, target: Target = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const details = result.error.flatten().fieldErrors;
      badRequest(res, 'Validation failed', details);
      return;
    }
    // Replace with parsed/coerced value
    if (target === 'query') {
      try {
        (req as unknown as Record<string, unknown>)[target] = result.data;
      } catch {
        // Express req.query might be getter-only on some runtimes/setups
        Object.assign(req.query, result.data);
      }
    } else {
      (req as unknown as Record<string, unknown>)[target] = result.data;
    }
    next();
  };
}

/** Shared Zod schemas used across modules */
export const paginationSchema = {
  page:  (z: typeof import('zod').z) => z.coerce.number().int().positive().default(1),
  limit: (z: typeof import('zod').z) => z.coerce.number().int().positive().max(200).default(50),
};
