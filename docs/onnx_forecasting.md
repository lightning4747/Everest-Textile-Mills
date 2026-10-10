# ONNX Revenue Forecasting Pipeline Documentation

## Overview
The Everest Textile Mills ERP system integrates a trained XGBoost revenue prediction model (`revenue_model.onnx`) to generate high-performance multi-month revenue projections directly within the Bun backend and Express API.

## Architecture
1. **Model Storage:** Model binary `revenue_model.onnx` resides in `backend/models/`.
2. **Inference Engine:** `onnxruntime-node` loads the ONNX session asynchronously during server startup.
3. **Iterative Projection:** The `generateRevenueForecast` service executes multi-step predictions across a 6-month horizon using lag feature feeding.
4. **API Endpoint:** Express routes at `/api/forecast` and `/api/v1/forecast` expose prediction requests.
5. **Dashboard UI:** React frontend fetches forecast metrics from `/api/v1/forecast` and renders projections in Recharts Area Charts.

## ONNX Model Specifications
* **Input Name:** `float_input`
* **Input Shape:** `[1, 2]` Float32 Tensor (`[month_num, lag_revenue]`)
* **Output Name:** `variable`
* **Output Shape:** `[1, 1]` Float32 Tensor (`[predicted_revenue]`)

## API Specification

### Endpoint
`POST /api/v1/forecast` or `POST /api/forecast`

### Request Body (Optional)
```json
{
  "startMonthNum": 11,
  "lastRevenue": 1240000,
  "horizon": 6
}
```

### Response Body
```json
{
  "success": true,
  "data": {
    "forecast": [
      {
        "monthNum": 11,
        "monthName": "Nov",
        "predictedRevenue": 63178.84
      },
      {
        "monthNum": 12,
        "monthName": "Dec",
        "predictedRevenue": 63268.64
      }
    ],
    "initialLagRevenue": 1240000,
    "startMonthNum": 11,
    "horizon": 6
  }
}
```

## Running Tests
To run the automated ONNX forecaster integration test suite:
```bash
DATABASE_URL="postgres://postgres:postgres@localhost:5432/everest_erp" JWT_SECRET="everest-secret-key-32-chars-long-string-min" bun test backend/src/__tests__/forecast.test.ts
```
