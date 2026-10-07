import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { calculateQuote, matchOffers } from '../domain/quote.ts';
import type { Demand, Offer, PricingRule, Quote, Verification } from '../domain/quote.ts';

export type Actor = { organizationId: string; userId: string; role: 'sales' | 'procurement' };
export type Customer = { id: string; name: string; ownerId: string };
const demoRule: PricingRule = { version: 'demo-v1', markupMinor: 200, minimumProfitMinor: 100, validityMs: 48 * 3600000 };

export async function openDatabase(directory?: string): Promise<PGlite> {
  const db = new PGlite(directory);
  await db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY)');
  const existing = await db.query('SELECT version FROM schema_migrations WHERE version = $1', ['001']);
  if (!existing.rows.length) {
    const sql = await readFile(new URL('./migrations/001_quote_workflow.sql', import.meta.url), 'utf8');
    await db.transaction(async tx => {
      await tx.exec(sql);
      await tx.query('INSERT INTO schema_migrations VALUES ($1)', ['001']);
    });
  }
  return db;
}

export class WorkflowStore {
  db: PGlite;
  constructor(db: PGlite) { this.db = db; }

  async customers(actor: Actor): Promise<Customer[]> {
    const result = await this.db.query<{ id: string; name: string; owner_id: string }>(
      'SELECT id, name, owner_id FROM customers WHERE organization_id = $1 AND owner_id = $2 ORDER BY name',
      [actor.organizationId, actor.userId]);
    return result.rows.map(row => ({ id: row.id, name: row.name, ownerId: row.owner_id }));
  }

  async createDemand(actor: Actor, customerId: string, demand: Omit<Demand, 'id'>): Promise<Demand> {
    if (actor.role !== 'sales') throw new Error('forbidden');
    if (!Number.isSafeInteger(demand.quantity) || demand.quantity < 1 || !demand.productId.trim() || !/^[A-Z]{3}$/.test(demand.currency)) throw new Error('invalid_demand');
    const record = { ...demand, id: randomUUID() };
    await this.db.transaction(async tx => {
      const customer = await tx.query('SELECT id FROM customers WHERE organization_id = $1 AND owner_id = $2 AND id = $3', [actor.organizationId, actor.userId, customerId]);
      if (!customer.rows.length) throw new Error('forbidden');
      await tx.query('INSERT INTO demands(id, organization_id, customer_id, product_id, quantity, currency) VALUES ($1,$2,$3,$4,$5,$6)', [record.id, actor.organizationId, customerId, record.productId, record.quantity, record.currency]);
      await tx.query('INSERT INTO audit_events(organization_id,actor_id,action,record_id) VALUES ($1,$2,$3,$4)', [actor.organizationId, actor.userId, 'demand.created', record.id]);
    });
    return record;
  }

  async demand(actor: Actor, id: string, db: Pick<PGlite, 'query'> = this.db): Promise<Demand> {
    const result = await db.query<{ id: string; product_id: string; quantity: number; currency: string }>(
      'SELECT d.id,d.product_id,d.quantity,d.currency FROM demands d JOIN customers c ON c.id=d.customer_id AND c.organization_id=d.organization_id WHERE d.id=$1 AND d.organization_id=$2 AND c.owner_id=$3', [id, actor.organizationId, actor.userId]);
    const row = result.rows[0];
    if (!row) throw new Error('not_found');
    return { id: row.id, productId: row.product_id, quantity: row.quantity, currency: row.currency };
  }

  async matches(actor: Actor, demandId: string, now: number): Promise<Offer[]> {
    const demand = await this.demand(actor, demandId);
    const offers = await this.db.query<{ payload: Offer }>('SELECT payload FROM offers WHERE organization_id=$1', [actor.organizationId]);
    return matchOffers(demand, offers.rows.map(x => x.payload), now);
  }

  async verify(actor: Actor, offerId: string, expectedVersion: number, quantity: number, validityMs: number, now: number): Promise<Verification> {
    if (actor.role !== 'procurement') throw new Error('forbidden');
    if (!Number.isSafeInteger(validityMs) || validityMs < 1 || validityMs > 48 * 3600000 || !Number.isSafeInteger(quantity) || quantity < 1) throw new Error('invalid_verification');
    return this.db.transaction(async tx => {
      const result = await tx.query<{ payload: Offer }>('SELECT payload FROM offers WHERE id=$1 AND organization_id=$2 FOR UPDATE', [offerId, actor.organizationId]);
      const offer = result.rows[0]?.payload;
      if (!offer) throw new Error('not_found');
      if (offer.version !== expectedVersion) throw new Error('offer_version_conflict');
      if (!offer.active || offer.expiresAt <= now || quantity > offer.quantity - offer.reserved) throw new Error('offer_unavailable');
      const verification: Verification = { offerId, offerVersion: offer.version, quantity, costMinor: offer.costMinor, currency: offer.currency, verifiedBy: actor.userId, expiresAt: Math.min(now + validityMs, offer.expiresAt), revoked: false };
      await tx.query('INSERT INTO verifications(offer_id,organization_id,payload) VALUES ($1,$2,$3) ON CONFLICT(offer_id) DO UPDATE SET payload=EXCLUDED.payload', [offerId, actor.organizationId, JSON.stringify(verification)]);
      await tx.query('INSERT INTO audit_events(organization_id,actor_id,action,record_id) VALUES ($1,$2,$3,$4)', [actor.organizationId, actor.userId, 'offer.verified', offerId]);
      return verification;
    });
  }

  async quote(actor: Actor, demandId: string, offerId: string, now: number): Promise<Quote & { id: string }> {
    if (actor.role !== 'sales') throw new Error('forbidden');
    return this.db.transaction(async tx => {
      const demand = await this.demand(actor, demandId, tx);
      const offers = await tx.query<{ payload: Offer }>('SELECT payload FROM offers WHERE id=$1 AND organization_id=$2 FOR UPDATE', [offerId, actor.organizationId]);
      const offer = offers.rows[0]?.payload;
      if (!offer) throw new Error('not_found');
      const verified = await tx.query<{ payload: Verification }>('SELECT payload FROM verifications WHERE offer_id=$1 AND organization_id=$2', [offerId, actor.organizationId]);
      const quote = { ...calculateQuote(demand, offer, verified.rows[0]?.payload, demoRule, now), id: randomUUID() };
      await tx.query('INSERT INTO quotes(id,organization_id,demand_id,payload) VALUES ($1,$2,$3,$4)', [quote.id, actor.organizationId, demandId, JSON.stringify(quote)]);
      await tx.query('INSERT INTO audit_events(organization_id,actor_id,action,record_id) VALUES ($1,$2,$3,$4)', [actor.organizationId, actor.userId, 'quote.created', quote.id]);
      return quote;
    });
  }
}

export async function seedDemo(db: PGlite, now: number): Promise<void> {
  await db.transaction(async tx => {
    for (const [id, owner] of [['demo-customer-a','demo-sales-a'], ['demo-customer-b','demo-sales-b']]) {
      await tx.query('INSERT INTO customers(id,organization_id,owner_id,name) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING', [id, 'demo-company', owner, id]);
    }
    const offer: Offer = { id: 'demo-offer-a', version: 1, kind: 'external', productId: 'demo-phone-128-black', currency: 'USD', quantity: 100, reserved: 0, costMinor: 20000, expiresAt: now + 48 * 3600000, active: true };
    await tx.query('INSERT INTO offers(id,organization_id,payload) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [offer.id,'demo-company',JSON.stringify(offer)]);
  });
}
