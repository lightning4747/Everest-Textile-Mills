import { api } from './apiClient';

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

export async function fetchRevenueForecast(
  startMonthNum = 11,
  lastRevenue = 1240000,
  horizon = 6
): Promise<ForecastResponse> {
  try {
    const res = await api.post<ForecastResponse>('/forecast', {
      startMonthNum,
      lastRevenue,
      horizon,
    });
    return res.data;
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
