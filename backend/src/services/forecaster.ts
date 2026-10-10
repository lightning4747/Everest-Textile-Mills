import * as ort from 'onnxruntime-node';
import path from 'path';
import fs from 'fs';

export interface ForecastPoint {
  monthNum: number;
  monthName: string;
  predictedRevenue: number;
}

export interface ForecastResult {
  forecast: ForecastPoint[];
  initialLagRevenue: number;
  startMonthNum: number;
  horizon: number;
}

export interface ForecastOptions {
  startMonthNum?: number; // 1 to 12 (default: 11 for November)
  lastRevenue?: number;    // Initial lag revenue in ₹ (default: 1240000)
  horizon?: number;        // Forecast horizon in months (default: 6)
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

let sessionInstance: ort.InferenceSession | null = null;

function getModelPath(): string {
  const candidates = [
    path.resolve(process.cwd(), 'models/revenue_model.onnx'),
    path.resolve(process.cwd(), 'backend/models/revenue_model.onnx'),
    path.resolve(__dirname, '../../models/revenue_model.onnx'),
    path.resolve(__dirname, '../models/revenue_model.onnx'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return path.resolve(process.cwd(), 'models/revenue_model.onnx');
}

/**
 * Initializes and caches the ONNX Inference Session.
 */
export async function getInferenceSession(): Promise<ort.InferenceSession> {
  if (sessionInstance) {
    return sessionInstance;
  }

  const modelPath = getModelPath();
  if (!fs.existsSync(modelPath)) {
    throw new Error(`ONNX model file not found at path: ${modelPath}`);
  }

  sessionInstance = await ort.InferenceSession.create(modelPath);
  return sessionInstance;
}

/**
 * Runs iterative 6-month revenue predictions using the ONNX model.
 * Model input: float_input of shape [1, 2] -> [month_num, lag_revenue]
 * Model output: variable of shape [1, 1] -> [predicted_revenue]
 */
export async function generateRevenueForecast(options: ForecastOptions = {}): Promise<ForecastResult> {
  const session = await getInferenceSession();

  const startMonthNum = options.startMonthNum ?? 11; // November
  const lastRevenue = options.lastRevenue ?? 1240000;
  const horizon = options.horizon ?? 6;

  const forecast: ForecastPoint[] = [];
  let currentLag = lastRevenue;

  for (let step = 0; step < horizon; step++) {
    // 1-indexed month number (1 to 12)
    const currentMonthNum = ((startMonthNum - 1 + step) % 12) + 1;
    const monthName = MONTH_NAMES[currentMonthNum - 1];

    // Feature tensor shape [1, 2] -> [month_num, lag_revenue]
    const inputData = new Float32Array([currentMonthNum, currentLag]);
    const tensor = new ort.Tensor('float32', inputData, [1, 2]);

    const feeds: Record<string, ort.Tensor> = {};
    const inputName = session.inputNames[0] || 'float_input';
    feeds[inputName] = tensor;

    const outputMap = await session.run(feeds);
    const outputName = session.outputNames[0] || 'variable';
    const outputTensor = outputMap[outputName];

    const predictedVal = Number(outputTensor.data[0]);
    // Ensure non-negative prediction
    const predictedRevenue = Math.max(0, Math.round(predictedVal * 100) / 100);

    forecast.push({
      monthNum: currentMonthNum,
      monthName,
      predictedRevenue,
    });

    // Update lag revenue for the next month iteration
    currentLag = predictedRevenue;
  }

  return {
    forecast,
    initialLagRevenue: lastRevenue,
    startMonthNum,
    horizon,
  };
}
