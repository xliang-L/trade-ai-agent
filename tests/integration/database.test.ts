import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase, seedDemo, WorkflowStore } from '../../packages/database/store.ts';
import type { Actor } from '../../packages/database/store.ts';
import { createDemoServer } from '../../apps/api/server.ts';
const now = Date.now();
const sales: Actor = { organizationId: 'demo-company', userId: 'demo-sales-a', role: 'sales' };
const buyer: Actor = { organizationId: 'demo-company', userId: 'demo-buyer', role: 'procurement' };
const input = { productId: 'demo-phone-128-black', quantity: 10, currency: 'USD' };

test('workflow persists across restart; authorization and audit remain enforced', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'trade-database-'));
  let db = await openDatabase(directory);
  try {
    await seedDemo(db, now);
    let store = new WorkflowStore(db);
    assert.equal((await store.customers(sales)).length, 1);
    assert.equal((await store.customers({ ...sales, organizationId: 'another-company' })).length, 0);
    await assert.rejects(store.createDemand(sales, 'demo-customer-b', input), /forbidden/);
    const demand = await store.createDemand(sales, 'demo-customer-a', input);
    assert.equal((await store.matches(sales, demand.id, now)).length, 1);
    await assert.rejects(store.quote(sales, demand.id, 'demo-offer-a', now), /verification_required/);
    await assert.rejects(store.verify(sales, 'demo-offer-a', 1, 10, 3600000, now), /forbidden/);
    await assert.rejects(store.verify(buyer, 'demo-offer-a', 2, 10, 3600000, now), /offer_version_conflict/);
    await store.verify(buyer, 'demo-offer-a', 1, 10, 3600000, now);
    const quote = await store.quote(sales, demand.id, 'demo-offer-a', now);
    assert.equal(quote.totalMinor, 202000);
    await db.close();
    db = await openDatabase(directory);
    store = new WorkflowStore(db);
    assert.equal((await store.demand(sales, demand.id)).quantity, 10);
    await assert.rejects(store.demand({ ...sales, userId: 'demo-sales-b' }, demand.id), /not_found/);
    const audits = await db.query<{ action: string }>('SELECT action FROM audit_events ORDER BY id');
    assert.deepEqual(audits.rows.map(x => x.action), ['demand.created', 'offer.verified', 'quote.created']);
    const quotes = await db.query('SELECT id FROM quotes');
    assert.equal(quotes.rows.length, 1);
  } finally { await db.close(); await rm(directory, { recursive: true, force: true }); }
});

test('local demo HTTP validates input and never exposes cost in match responses', async () => {
  const db = await openDatabase();
  await seedDemo(db, now);
  const store = new WorkflowStore(db);
  const server = createDemoServer(store);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}`;
  const post = (path: string, data: unknown) => fetch(url + path, { method: 'POST', body: JSON.stringify(data) });
  try {
    assert.equal((await post('/demands', { ...input, customerId: 'demo-customer-a', quantity: 0 })).status, 400);
    assert.equal((await post('/demands', { ...input, customerId: 'demo-customer-b' })).status, 403);
    const created = await post('/demands', { ...input, customerId: 'demo-customer-a' });
    assert.equal(created.status, 201);
    const demand = await created.json() as { id: string };
    const matches = await post('/matches', { demandId: demand.id });
    const json = await matches.text();
    assert.equal(matches.status, 200);
    assert.ok(!json.includes('costMinor'));
    assert.equal((await post('/quotes', { demandId: demand.id, offerId: 'demo-offer-a' })).status, 400);
    await store.verify(buyer, 'demo-offer-a', 1, 10, 3600000, now);
    assert.equal((await post('/quotes', { demandId: demand.id, offerId: 'demo-offer-a' })).status, 201);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await db.close();
  }
});
