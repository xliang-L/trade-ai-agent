import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateQuote, checkQuoteSend, matchOffers } from '../packages/domain/quote.ts';
import type { Offer, Verification } from '../packages/domain/quote.ts';
const now = 1000000;
const demand = { id: 'd', productId: 'sku-1', quantity: 10, currency: 'USD' };
const offer: Offer = { id: 'a', version: 1, kind: 'external', productId: 'sku-1', currency: 'USD', quantity: 20, reserved: 0, costMinor: 20000, expiresAt: now + 10000, active: true };
const verification: Verification = { offerId: 'a', offerVersion: 1, quantity: 10, costMinor: 20000, currency: 'USD', verifiedBy: 'buyer', expiresAt: now + 5000, revoked: false };
const rule = { version: 'v1', markupMinor: 200, minimumProfitMinor: 100, validityMs: 48 * 3600000 };
const make = (o = offer, v: Verification | undefined = verification) => calculateQuote(demand, o, v, rule, now);

test('same SKU preserves separate suppliers and filters market variants and expired offers', () => {
  const second = { ...offer, id: 'b', costMinor: 19900 };
  const candidates = matchOffers(demand, [offer, second, { ...offer, id: 'variant', productId: 'sku-2' }, { ...offer, id: 'expired', expiresAt: now }], now);
  assert.deepEqual(candidates.map(x => x.id), ['b', 'a']);
});
test('unverified external and internal stock cannot generate quote', () => {
  assert.throws(() => calculateQuote(demand, offer, undefined, rule, now), /verification_required/);
  assert.throws(() => calculateQuote(demand, { ...offer, kind: 'internal' }, undefined, rule, now), /verification_required/);
});
test('reserved stock is excluded', () => { assert.throws(() => make({ ...offer, reserved: 11 }), /insufficient_stock/); });
test('quote calculation is exact and expires at earliest verification or supply limit', () => {
  assert.equal(make().unitPriceMinor, 20200);
  assert.equal(make().totalMinor, 202000);
  assert.equal(make().expiresAt, verification.expiresAt);
  assert.equal(make({ ...offer, expiresAt: now + 1000 }).expiresAt, now + 1000);
});
test('cost or version update invalidates verification', () => {
  assert.throws(() => make({ ...offer, version: 2 }), /verification_stale/);
  assert.throws(() => make({ ...offer, costMinor: 21000 }), /verification_stale/);
});
test('revoked, expired or insufficient verification is rejected', () => {
  assert.throws(() => make(offer, { ...verification, revoked: true }), /verification_required/);
  assert.throws(() => make(offer, { ...verification, expiresAt: now }), /verification_expired/);
  assert.throws(() => make(offer, { ...verification, quantity: 9 }), /verification_quantity_exceeded/);
});
test('profit floor and currencies are enforced', () => {
  assert.throws(() => calculateQuote(demand, offer, verification, { ...rule, markupMinor: 99 }, now), /profit_below_floor/);
  assert.throws(() => calculateQuote({ ...demand, currency: 'EUR' }, offer, verification, rule, now), /currency_mismatch/);
});
test('human takeover or stale control version prevents send', () => {
  const quote = make();
  assert.throws(() => checkQuoteSend(quote, offer, verification, { mode: 'human', controlVersion: 2 }, 1, now), /human_control/);
  assert.throws(() => checkQuoteSend(quote, offer, verification, { mode: 'ai', controlVersion: 2 }, 1, now), /stale_run/);
});
test('send rechecks quote expiry, current stock and supply revision', () => {
  const quote = make();
  const conversation = { mode: 'ai' as const, controlVersion: 1 };
  checkQuoteSend(quote, offer, verification, conversation, 1, now);
  assert.throws(() => checkQuoteSend(quote, offer, verification, conversation, 1, quote.expiresAt), /quote_expired/);
  assert.throws(() => checkQuoteSend(quote, { ...offer, version: 2 }, verification, conversation, 1, now), /quote_stale/);
  assert.throws(() => checkQuoteSend(quote, { ...offer, reserved: 11 }, verification, conversation, 1, now), /insufficient_stock/);
});
test('fractional and unsafe monetary values are rejected', () => {
  assert.throws(() => make({ ...offer, costMinor: 1.1 }), /invalid_cost/);
  assert.throws(() => calculateQuote(demand, offer, verification, { ...rule, markupMinor: Number.MAX_SAFE_INTEGER }, now), /invalid_price/);
});
