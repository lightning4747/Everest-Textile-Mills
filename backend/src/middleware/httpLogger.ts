// @ts-nocheck
import pinoHttp from 'pino-http';
import { logger } from '../lib/logger.js';

/**
 * HTTP request logger middleware.
 * Logs: method, url, status, response time, request id.
 */
export const httpLogger = pinoHttp({
  logger,
  customLogLevel(_req, res) {
    if (res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage(req, res) {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  redact: ['req.headers.authorization'], // don't log tokens
});
