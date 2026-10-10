/**
 * Standard API response shapes.
 * Every endpoint must use these helpers to ensure consistency.
 */
import type { Response } from 'express';

// ── Success ──────────────────────────────────────────────────────────────────
export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

// ── Error ────────────────────────────────────────────────────────────────────
export interface ApiError {
  success: false;
  error: string;
  code: string;     // machine-readable, e.g. "VALIDATION_ERROR"
  details?: unknown;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function ok<T>(res: Response, data: T, status = 200, meta?: ApiSuccess['meta']): void {
  const body: ApiSuccess<T> = { success: true, data };
  if (meta) body.meta = meta;
  res.status(status).json(body);
}

export function created<T>(res: Response, data: T): void {
  ok(res, data, 201);
}

export function fail(res: Response, status: number, message: string, code: string, details?: unknown): void {
  const body: ApiError = { success: false, error: message, code };
  if (details !== undefined) body.details = details;
  res.status(status).json(body);
}

// Common error shortcuts
export const notFound    = (res: Response, msg = 'Resource not found') => fail(res, 404, msg, 'NOT_FOUND');
export const badRequest  = (res: Response, msg: string, details?: unknown) => fail(res, 400, msg, 'BAD_REQUEST', details);
export const unauthorized = (res: Response, msg = 'Unauthorized') => fail(res, 401, msg, 'UNAUTHORIZED');
export const forbidden   = (res: Response, msg = 'Forbidden') => fail(res, 403, msg, 'FORBIDDEN');
export const conflict    = (res: Response, msg: string) => fail(res, 409, msg, 'CONFLICT');
export const serverError = (res: Response, msg = 'Internal server error') => fail(res, 500, msg, 'INTERNAL_ERROR');
