/** 最小业务原型：金额以指定币种的最小单位存储。 */
export type Offer = {
  id: string;
  version: number;
  kind: 'internal' | 'external';
  productId: string;
  currency: string;
  quantity: number;
  reserved: number;
  costMinor: number;
  expiresAt: number;
  active: boolean;
};
export type Demand = { id: string; productId: string; quantity: number; currency: string };
export type Verification = {
  offerId: string;
  offerVersion: number;
  quantity: number;
  costMinor: number;
  currency: string;
  verifiedBy: string;
  expiresAt: number;
  revoked: boolean;
};
export type PricingRule = { version: string; markupMinor: number; minimumProfitMinor: number; validityMs: number };
export type Quote = {
  offerId: string;
  offerVersion: number;
  demandId: string;
  quantity: number;
  currency: string;
  unitPriceMinor: number;
  totalMinor: number;
  expiresAt: number;
  ruleVersion: string;
};
export type Conversation = { mode: 'ai' | 'human'; controlVersion: number };

function integer(value: number, name: string, minimum = 0): void {
  if (!Number.isSafeInteger(value) || value < minimum) throw new Error(`invalid_${name}`);
}

function checkOffer(offer: Offer, quantity: number, now: number): void {
  integer(quantity, 'quantity', 1);
  integer(offer.quantity, 'stock');
  integer(offer.reserved, 'reserved');
  integer(offer.costMinor, 'cost');
  integer(now, 'time');
  integer(offer.expiresAt, 'offer_expiry');
  if (!offer.active || offer.expiresAt <= now) throw new Error('offer_unavailable');
  if (offer.reserved > offer.quantity) throw new Error('invalid_stock');
  if (quantity > offer.quantity - offer.reserved) throw new Error('insufficient_stock');
}

function checkVerification(offer: Offer, verification: Verification | undefined, quantity: number, now: number): asserts verification is Verification {
  if (!verification || verification.revoked || !verification.verifiedBy) throw new Error('verification_required');
  integer(verification.expiresAt, 'verification_expiry');
  integer(verification.quantity, 'verified_quantity', 1);
  integer(verification.costMinor, 'verified_cost');
  if (verification.expiresAt <= now) throw new Error('verification_expired');
  if (verification.offerId !== offer.id || verification.offerVersion !== offer.version || verification.costMinor !== offer.costMinor || verification.currency !== offer.currency) throw new Error('verification_stale');
  if (quantity > verification.quantity) throw new Error('verification_quantity_exceeded');
}

/** 只做同 SKU 硬匹配；替代型号尚未实现。 */
export function matchOffers(demand: Demand, offers: Offer[], now: number): Offer[] {
  integer(demand.quantity, 'quantity', 1);
  return offers.filter(offer => {
    if (offer.productId !== demand.productId || offer.currency !== demand.currency) return false;
    try { checkOffer(offer, demand.quantity, now); return true; } catch { return false; }
  }).sort((a, b) => a.costMinor - b.costMinor);
}

export function calculateQuote(demand: Demand, offer: Offer, verification: Verification | undefined, rule: PricingRule, now: number): Quote {
  checkOffer(offer, demand.quantity, now);
  if (demand.productId !== offer.productId) throw new Error('product_mismatch');
  if (demand.currency !== offer.currency) throw new Error('currency_mismatch');
  checkVerification(offer, verification, demand.quantity, now);
  integer(rule.markupMinor, 'markup');
  integer(rule.minimumProfitMinor, 'minimum_profit');
  integer(rule.validityMs, 'validity', 1);
  if (rule.markupMinor < rule.minimumProfitMinor) throw new Error('profit_below_floor');
  const unitPriceMinor = verification.costMinor + rule.markupMinor;
  const totalMinor = unitPriceMinor * demand.quantity;
  integer(unitPriceMinor, 'price');
  integer(totalMinor, 'total');
  integer(now + rule.validityMs, 'expiry');
  return {
    offerId: offer.id, offerVersion: offer.version, demandId: demand.id,
    quantity: demand.quantity, currency: demand.currency, unitPriceMinor, totalMinor,
    expiresAt: Math.min(now + rule.validityMs, offer.expiresAt, verification.expiresAt),
    ruleVersion: rule.version,
  };
}

/** 原型发送准入检查；生产实现还需要事务、授权、幂等、审批与渠道网关。 */
export function checkQuoteSend(quote: Quote, offer: Offer, verification: Verification | undefined, conversation: Conversation, expectedControlVersion: number, now: number): void {
  if (conversation.mode !== 'ai' || conversation.controlVersion !== expectedControlVersion) throw new Error('human_control_or_stale_run');
  if (quote.expiresAt <= now) throw new Error('quote_expired');
  if (quote.offerId !== offer.id || quote.offerVersion !== offer.version) throw new Error('quote_stale');
  checkOffer(offer, quote.quantity, now);
  checkVerification(offer, verification, quote.quantity, now);
}
