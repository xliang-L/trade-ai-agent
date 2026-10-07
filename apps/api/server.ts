import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { openDatabase, seedDemo, WorkflowStore } from '../../packages/database/store.ts';
import type { Actor } from '../../packages/database/store.ts';

async function body(request: IncomingMessage): Promise<Record<string, unknown>> {
  let content = '';
  for await (const chunk of request) {
    content += chunk.toString();
    if (Buffer.byteLength(content) > 16384) throw new Error('request_too_large');
  }
  const value: unknown = JSON.parse(content);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_body');
  return value as Record<string, unknown>;
}
function str(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  if (typeof value !== 'string' || !value.trim() || value.length > 200) throw new Error('invalid_body');
  return value;
}
function num(input: Record<string, unknown>, key: string): number {
  const value = input[key];
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) throw new Error('invalid_body');
  return value;
}
function send(response: ServerResponse, status: number, data: unknown) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(data));
}

/** 本机演示 API：身份是固定测试身份，不是生产登录或权限认证。 */
export function createDemoServer(store: WorkflowStore) {
  return createServer(async (request, response) => {
    const actor: Actor = { organizationId: 'demo-company', userId: 'demo-sales-a', role: 'sales' };
    try {
      if (request.method === 'GET' && request.url === '/health') return send(response, 200, { mode: 'local-demo', status: 'ok' });
      if (request.method === 'GET' && request.url === '/customers') return send(response, 200, await store.customers(actor));
      if (request.method === 'POST' && request.url === '/demands') {
        const data = await body(request);
        return send(response, 201, await store.createDemand(actor, str(data, 'customerId'), { productId: str(data, 'productId'), quantity: num(data, 'quantity'), currency: str(data, 'currency') }));
      }
      if (request.method === 'POST' && request.url === '/matches') {
        const data = await body(request);
        const matches = await store.matches(actor, str(data, 'demandId'), Date.now());
        return send(response, 200, matches.map(({ id, productId, quantity, reserved, currency, expiresAt }) => ({ id, productId, availableQuantity: quantity - reserved, currency, expiresAt })));
      }
      if (request.method === 'POST' && request.url === '/quotes') {
        const data = await body(request);
        return send(response, 201, await store.quote(actor, str(data, 'demandId'), str(data, 'offerId'), Date.now()));
      }
      return send(response, 404, { error: 'not_found' });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      const known = /^(forbidden|not_found|invalid_[a-z_]+|verification_[a-z_]+|offer_[a-z_]+|insufficient_stock|currency_mismatch|product_mismatch|profit_below_floor|request_too_large)$/.test(message);
      send(response, message === 'forbidden' ? 403 : message === 'not_found' ? 404 : known || error instanceof SyntaxError ? 400 : 500, { error: known ? message : error instanceof SyntaxError ? 'invalid_json' : 'internal_error' });
    }
  });
}

if (import.meta.main) {
  const db = await openDatabase('.data/development');
  await seedDemo(db, Date.now());
  const server = createDemoServer(new WorkflowStore(db));
  server.listen(3000, '127.0.0.1', () => console.log('本机演示 API：http://127.0.0.1:3000（固定测试销售身份）'));
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => server.close(() => { void db.close().then(() => process.exit(0)); }));
}
