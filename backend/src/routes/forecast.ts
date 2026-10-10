// @ts-nocheck
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ok, badRequest } from '../lib/response.js';
import { generateRevenueForecast } from '../services/forecaster.js';

const router = Router();

const ForecastInputSchema = z.object({
  startMonthNum: z.coerce.number().int().min(1).max(12).optional(),
  lastRevenue: z.coerce.number().nonnegative().optional(),
  horizon: z.coerce.number().int().min(1).max(24).optional(),
});

/**
 * POST /api/forecast or POST /api/v1/forecast
 * Body: { startMonthNum?: number, lastRevenue?: number, horizon?: number }
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = ForecastInputSchema.safeParse(req.body ?? {});

    if (!parseResult.success) {
      return badRequest(res, 'Invalid forecast parameters', parseResult.error.format());
    }

    const { startMonthNum, lastRevenue, horizon } = parseResult.data;
    const result = await generateRevenueForecast({ startMonthNum, lastRevenue, horizon });

    return ok(res, result);
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/forecast or GET /api/v1/forecast
 * Query params: ?startMonthNum=11&lastRevenue=1240000&horizon=6
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = ForecastInputSchema.safeParse(req.query ?? {});

    if (!parseResult.success) {
      return badRequest(res, 'Invalid forecast query parameters', parseResult.error.format());
    }

    const { startMonthNum, lastRevenue, horizon } = parseResult.data;
    const result = await generateRevenueForecast({ startMonthNum, lastRevenue, horizon });

    return ok(res, result);
  } catch (error) {
    return next(error);
  }
});

export default router;
