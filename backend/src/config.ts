// @ts-nocheck
import { z } from 'zod';

const envSchema = z.object({
  PORT:          z.string().default('3000'),
  DATABASE_URL:  z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET:    z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  NODE_ENV:      z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL:     z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
  CORS_ORIGIN:   z.string().default('http://localhost:5173'),
});

function parseEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    for (const [key, msgs] of Object.entries(result.error.flatten().fieldErrors)) {
      console.error(`  ${key}: ${msgs?.join(', ')}`);
    }
    process.exit(1);
  }
  return result.data;
}

export const config = parseEnv();
