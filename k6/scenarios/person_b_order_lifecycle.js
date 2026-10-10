import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

export const options = {
  scenarios: {
    order_lifecycle: {
      executor: 'constant-vus',
      vus: 20,
      duration: '1m',
    },
  },
  thresholds: {
    'http_req_duration{type:read}': ['p(95)<250'],
    'http_req_duration{type:dispatch}': ['p(95)<600'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      email: 'admin@everest.local',
      password: 'changeme123',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  let token = '';
  if (loginRes.status === 200) {
    const body = loginRes.json();
    token = body.data?.token || '';
  }

  return { token };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    ...(data.token ? { Authorization: `Bearer ${data.token}` } : {}),
  };

  const rand = Math.random();

  if (rand < 0.40) {
    // 40% Reads: GET /sales-orders & GET /fabric-rolls/pending
    const ordersRes = http.get(`${BASE_URL}/sales-orders?limit=10`, {
      headers,
      tags: { type: 'read' },
    });
    check(ordersRes, {
      'get sales orders status 200': (r) => r.status === 200,
    });

    const pendingRes = http.get(`${BASE_URL}/fabric-rolls/pending`, {
      headers,
      tags: { type: 'read' },
    });
    check(pendingRes, {
      'get pending rolls status 200': (r) => r.status === 200,
    });
  } else if (rand < 0.70) {
    // 30% QC Inspections: PATCH /fabric-rolls/:id/qc
    // First fetch a pending roll if available
    const pendingRes = http.get(`${BASE_URL}/fabric-rolls/pending`, { headers });
    let rollId = null;

    if (pendingRes.status === 200) {
      const rolls = pendingRes.json()?.data || [];
      if (rolls.length > 0) {
        rollId = rolls[0].id;
      }
    }

    if (rollId) {
      const qcRes = http.patch(
        `${BASE_URL}/fabric-rolls/${rollId}/qc`,
        JSON.stringify({
          qc_result: 'passed',
          checked_by: 'K6 Inspector',
        }),
        { headers, tags: { type: 'qc' } }
      );
      check(qcRes, {
        'qc patch status 200 or 400': (r) => r.status === 200 || r.status === 400,
      });
    } else {
      // If no pending roll, read stats as fallback
      const statsRes = http.get(`${BASE_URL}/fabric-rolls/stats`, {
        headers,
        tags: { type: 'read' },
      });
      check(statsRes, { 'stats status 200': (r) => r.status === 200 });
    }
  } else if (rand < 0.90) {
    // 20% Create Sales Order: POST /sales-orders
    const payload = JSON.stringify({
      buyer: `K6 Buyer ${Math.floor(Math.random() * 1000)}`,
      fabricType: 'Cotton Denim',
      colour: 'Indigo Blue',
      quantityMetres: 2500,
      unitPrice: 120,
      deliveryDate: '2026-11-30',
    });

    const postOrderRes = http.post(`${BASE_URL}/sales-orders`, payload, {
      headers,
      tags: { type: 'create_order' },
    });
    check(postOrderRes, {
      'create order status 201': (r) => r.status === 201,
    });
  } else {
    // 10% Dispatches: POST /dispatches
    // Look for ready_to_ship order
    const readyOrdersRes = http.get(`${BASE_URL}/sales-orders?status=ready_to_ship&limit=1`, {
      headers,
    });
    let orderId = null;

    if (readyOrdersRes.status === 200) {
      const orders = readyOrdersRes.json()?.data || [];
      if (orders.length > 0) {
        orderId = orders[0].id;
      }
    }

    if (orderId) {
      const dispatchPayload = JSON.stringify({
        orderId: orderId,
        dispatchDate: new Date().toISOString().split('T')[0],
        truckNo: 'KA-04-K6-9999',
        invoiceNo: `INV-K6-${Math.floor(Math.random() * 10000)}`,
      });

      const dispatchRes = http.post(`${BASE_URL}/dispatches`, dispatchPayload, {
        headers,
        tags: { type: 'dispatch' },
      });
      check(dispatchRes, {
        'create dispatch status 201 or 400': (r) => r.status === 201 || r.status === 400,
      });
    } else {
      // If no ready_to_ship order, query dispatches list as fallback
      const listDispatchesRes = http.get(`${BASE_URL}/dispatches?limit=5`, {
        headers,
        tags: { type: 'read' },
      });
      check(listDispatchesRes, {
        'list dispatches status 200': (r) => r.status === 200,
      });
    }
  }

  sleep(1);
}
