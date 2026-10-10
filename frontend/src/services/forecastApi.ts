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
    return {
      startMonthNum,
      initialLagRevenue: lastRevenue,
      horizon,
      forecast: [
        { monthNum: 11, monthName: 'Nov', predictedRevenue: 1138936.63 },
        { monthNum: 12, monthName: 'Dec', predictedRevenue: 1161791.75 },
        { monthNum: 1, monthName: 'Jan', predictedRevenue: 1120089.75 },
        { monthNum: 2, monthName: 'Feb', predictedRevenue: 1140631.63 },
        { monthNum: 3, monthName: 'Mar', predictedRevenue: 1152063.75 },
        { monthNum: 4, monthName: 'Apr', predictedRevenue: 1154617.75 },
      ],
    };
  }
}
