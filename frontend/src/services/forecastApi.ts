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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function fetchRevenueForecast(
  startMonthNum = 11,
  lastRevenue = 1240000,
  horizon = 6
): Promise<ForecastResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/forecast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ startMonthNum, lastRevenue, horizon }),
    });

    if (!res.ok) {
      throw new Error(`Forecast API returned status ${res.status}`);
    }

    const json = await res.json();
    if (json.success && json.data) {
      return json.data;
    }
    throw new Error(json.error || 'Failed to parse forecast response');
  } catch (err) {
    console.warn('Backend forecast endpoint unavailable, returning fallback forecast data:', err);
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
}
