import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 20 },  // Ramp up to 20 virtual users
    { duration: '15s', target: 20 }, // Sustain load
    { duration: '5s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<45'], // 95% of requests must complete below 45ms
    http_req_failed: ['rate<0.01'],   // Error rate must be under 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

export function setup() {
  if (__ENV.AUTH_TOKEN) return { token: __ENV.AUTH_TOKEN };
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: 'admin@everest.local',
    password: 'secret',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  try {
    const data = JSON.parse(loginRes.body);
    return { token: data.data?.token || data.token };
  } catch (e) {
    return { token: '' };
  }
}

export default function (data) {
  const token = data?.token || __ENV.AUTH_TOKEN || '';
  const payload = JSON.stringify({
    orderId: 'ORD-1033',
    machineId: 'DY-01',
    metres: 120 + Math.floor(Math.random() * 50),
    producedDate: new Date().toISOString().split('T')[0],
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };

  const res = http.post(`${BASE_URL}/fabric-rolls`, payload, params);

  check(res, {
    'status is 201 or 200': (r) => r.status === 201 || r.status === 200,
    'response has roll ID': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body && (body.data?.id || body.id);
      } catch (e) {
        return false;
      }
    },
  });

  sleep(0.05); // 50ms pacing between iterations
}
