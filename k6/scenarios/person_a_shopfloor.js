import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const readDuration = new Trend('http_req_duration_read');
const writeDuration = new Trend('http_req_duration_write');
const errorRate = new Rate('error_rate');

export const options = {
  vus: 20,
  duration: '30s',
  thresholds: {
    'http_req_duration{type:read}': ['p(95)<200'],
    'http_req_duration{type:write}': ['p(95)<500'],
    'http_req_failed': ['rate<0.01'],
    'error_rate': ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      email: 'admin@everest.local',
      password: 'changeme123',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  check(loginRes, {
    'login successful': (r) => r.status === 200,
  });

  const body = loginRes.json();
  const token = body && body.data ? body.data.token : null;
  return { token };
}

const MACHINES = ['SP-01', 'SP-02', 'SP-03', 'WV-01', 'WV-02', 'WV-03', 'DY-01', 'DY-02', 'DY-03'];
const STATUSES = ['running', 'idle', 'maintenance', 'breakdown'];
const SHIFTS = ['A', 'B', 'C'];
const YARN_TYPES = ['Cotton', 'Polyester', 'Wool', 'Silk', 'Blended'];

export default function (data) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.token}`,
    },
  };

  const rand = Math.random();

  if (rand < 0.50) {
    // 50% reads: GET /machines & GET /yarn/stock
    const mRes = http.get(`${BASE_URL}/machines`, {
      ...params,
      tags: { type: 'read' },
    });
    readDuration.add(mRes.timings.duration);
    const mOk = check(mRes, { 'GET /machines status 200': (r) => r.status === 200 });
    errorRate.add(!mOk);

    const yRes = http.get(`${BASE_URL}/yarn/stock`, {
      ...params,
      tags: { type: 'read' },
    });
    readDuration.add(yRes.timings.duration);
    const yOk = check(yRes, { 'GET /yarn/stock status 200': (r) => r.status === 200 });
    errorRate.add(!yOk);
  } else if (rand < 0.80) {
    // 30% status writes: PATCH /machines/:id/status
    const machineId = MACHINES[Math.floor(Math.random() * MACHINES.length)];
    const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
    const shift = SHIFTS[Math.floor(Math.random() * SHIFTS.length)];

    const payload = JSON.stringify({
      status,
      shift,
      progress: Math.floor(Math.random() * 100),
      operator: 'LoadTest Operator',
    });

    const res = http.patch(`${BASE_URL}/machines/${machineId}/status`, payload, {
      ...params,
      tags: { type: 'write' },
    });
    writeDuration.add(res.timings.duration);
    const ok = check(res, { 'PATCH /machines/:id/status status 200': (r) => r.status === 200 });
    errorRate.add(!ok);
  } else {
    // 20% receipt writes: POST /yarn/receipts
    const yarnType = YARN_TYPES[Math.floor(Math.random() * YARN_TYPES.length)];
    const qty = Math.floor(Math.random() * 500) + 100;
    const inv = `K6-INV-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

    const payload = JSON.stringify({
      date: '2026-10-10',
      supplierName: 'Shree Yarns Pvt. Ltd.',
      yarnType,
      colour: 'White',
      quantityKg: qty,
      receivedBy: 'LoadTest Bot',
      invoiceNo: inv,
    });

    const res = http.post(`${BASE_URL}/yarn/receipts`, payload, {
      ...params,
      tags: { type: 'write' },
    });
    writeDuration.add(res.timings.duration);
    const ok = check(res, { 'POST /yarn/receipts status 201': (r) => r.status === 201 });
    errorRate.add(!ok);
  }

  sleep(0.1);
}
