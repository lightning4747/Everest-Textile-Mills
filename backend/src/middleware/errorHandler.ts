import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { logger } from '../lib/logger.js';
import { serverError } from '../lib/response.js';

/**
 * Global error handler — must be registered LAST in Express.
 * Catches any error thrown or passed to next(err).
 */
export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const requestId = (req as Request & { id?: string }).id ?? 'unknown';

  if (err instanceof Error) {
    logger.error({ requestId, err: err.message, stack: err.stack }, 'Unhandled error');
  } else {
    logger.error({ requestId, err }, 'Unhandled non-Error thrown');
  }

  // Don't leak error details in production
  serverError(res);
};

/**
 * 404 handler — register after all routes.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.path}`,
    code: 'NOT_FOUND',
  });
}
