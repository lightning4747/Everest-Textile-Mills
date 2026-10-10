// @ts-nocheck
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import app from '../index.js';
import { generateRevenueForecast } from '../services/forecaster.js';
import type { Server } from 'http';

describe('ONNX Revenue Forecasting Suite', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll((done) => {
    server = app.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 3000;
      baseUrl = `http://localhost:${port}`;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('Service: generateRevenueForecast', () => {
    it('generates 6-month forecast with default settings', async () => {
      const result = await generateRevenueForecast();

      expect(result).toBeDefined();
      expect(result.horizon).toBe(6);
      expect(result.startMonthNum).toBe(11); // Default November
      expect(result.initialLagRevenue).toBe(1240000);
      expect(result.forecast).toHaveLength(6);

      expect(result.forecast[0].monthName).toBe('Nov');
      expect(result.forecast[0].monthNum).toBe(11);
      expect(typeof result.forecast[0].predictedRevenue).toBe('number');
      expect(result.forecast[0].predictedRevenue).toBeGreaterThan(0);
    });

    it('generates forecast with custom startMonthNum, lastRevenue, and horizon', async () => {
      const result = await generateRevenueForecast({
        startMonthNum: 5,
        lastRevenue: 950000,
        horizon: 3,
      });

      expect(result.horizon).toBe(3);
      expect(result.startMonthNum).toBe(5);
      expect(result.initialLagRevenue).toBe(950000);
      expect(result.forecast).toHaveLength(3);

      expect(result.forecast[0].monthName).toBe('May');
      expect(result.forecast[1].monthName).toBe('Jun');
      expect(result.forecast[2].monthName).toBe('Jul');
    });
  });

  describe('API Endpoints', () => {
    it('POST /api/v1/forecast returns 6-month predictions', async () => {
      const res = await fetch(`${baseUrl}/api/v1/forecast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startMonthNum: 11,
          lastRevenue: 1240000,
          horizon: 6,
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.forecast).toHaveLength(6);
      expect(json.data.forecast[0].monthName).toBe('Nov');
    });

    it('POST /api/forecast returns 6-month predictions', async () => {
      const res = await fetch(`${baseUrl}/api/forecast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startMonthNum: 1,
          lastRevenue: 800000,
          horizon: 4,
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.forecast).toHaveLength(4);
      expect(json.data.forecast[0].monthName).toBe('Jan');
    });

    it('GET /api/v1/forecast returns default or queried predictions', async () => {
      const res = await fetch(`${baseUrl}/api/v1/forecast?startMonthNum=3&lastRevenue=1000000&horizon=6`);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.forecast).toHaveLength(6);
      expect(json.data.forecast[0].monthName).toBe('Mar');
    });

    it('rejects invalid startMonthNum (>12)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/forecast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startMonthNum: 15,
        }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.code).toBe('BAD_REQUEST');
    });
  });
});
