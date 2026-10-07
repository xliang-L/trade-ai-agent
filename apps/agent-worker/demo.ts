import { calculateQuote, checkQuoteSend, matchOffers } from '../../packages/domain/quote.ts';
import type { Demand, Offer, PricingRule, Verification } from '../../packages/domain/quote.ts';

const now = Date.parse('2026-10-07T12:00:00Z');
const demand: Demand = { id: 'demo-demand', productId: 'apple-128-black-demo', quantity: 10, currency: 'USD' };
const offer: Offer = { id: 'demo-supplier-a', version: 1, kind: 'external', productId: demand.productId, currency: 'USD', quantity: 30, reserved: 0, costMinor: 20000, expiresAt: now + 24 * 3600000, active: true };
const rule: PricingRule = { version: 'demo-rule-v1', markupMinor: 200, minimumProfitMinor: 100, validityMs: 48 * 3600000 };
console.log('模拟询单匹配货源数：', matchOffers(demand, [offer], now).length);
try { calculateQuote(demand, offer, undefined, rule, now); } catch (error) { console.log('未核验报价被拦截：', (error as Error).message); }
const verification: Verification = { offerId: offer.id, offerVersion: offer.version, quantity: 20, costMinor: offer.costMinor, currency: 'USD', verifiedBy: 'demo-procurement-user', expiresAt: now + 6 * 3600000, revoked: false };
const quote = calculateQuote(demand, offer, verification, rule, now);
console.log('人工核验后报价草案：', { unitPrice: quote.unitPriceMinor / 100, currency: quote.currency, quantity: quote.quantity, expiresAt: new Date(quote.expiresAt).toISOString() });
checkQuoteSend(quote, offer, verification, { mode: 'ai', controlVersion: 1 }, 1, now);
console.log('有效报价通过模拟发送检查；没有连接或发送到真实渠道。');
try { checkQuoteSend(quote, offer, verification, { mode: 'human', controlVersion: 2 }, 1, now); } catch (error) { console.log('人工接管后发送被拦截：', (error as Error).message); }
