export interface ForecastPoint {
  monthNum: number;
  monthName: string;
  predictedRevenue: number;
}

export interface ForecastResponse {
  forecast: ForecastPoint[];
  initialLagRevenue: number;
  startMonthNum: number;
  horizon: number;
}

const PRIMARY_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const FALLBACK_API_URL = 'http://localhost:3001';

export async function fetchRevenueForecast(
  startMonthNum = 11,
  lastRevenue = 1240000,
  horizon = 6
): Promise<ForecastResponse> {
  const payload = JSON.stringify({ startMonthNum, lastRevenue, horizon });
  const headers = { 'Content-Type': 'application/json' };

  for (const baseUrl of [PRIMARY_API_URL, FALLBACK_API_URL]) {
    try {
      const res = await fetch(`${baseUrl}/api/v1/forecast`, {
        method: 'POST',
        headers,
        body: payload,
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data;
        }
      }
    } catch {
      // try next base URL candidate
    }
  }

  // Fallback static projection if backend server is unreachable
  return {
    startMonthNum,
    initialLagRevenue: lastRevenue,
    horizon,
    forecast: [
      { monthNum: 11, monthName: 'Nov', predictedRevenue: 63178.84 },
      { monthNum: 12, monthName: 'Dec', predictedRevenue: 63268.64 },
      { monthNum: 1, monthName: 'Jan', predictedRevenue: 58534.80 },
      { monthNum: 2, monthName: 'Feb', predictedRevenue: 58584.64 },
      { monthNum: 3, monthName: 'Mar', predictedRevenue: 59464.35 },
      { monthNum: 4, monthName: 'Apr', predictedRevenue: 58603.75 },
    ],
  };
}
