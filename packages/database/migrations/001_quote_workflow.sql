CREATE TABLE customers (
 id text PRIMARY KEY,
 organization_id text NOT NULL,
 owner_id text NOT NULL,
 name text NOT NULL,
 UNIQUE (organization_id, id)
);
CREATE TABLE demands (
 id text PRIMARY KEY,
 organization_id text NOT NULL,
 customer_id text NOT NULL,
 product_id text NOT NULL,
 quantity integer NOT NULL CHECK (quantity > 0),
 currency text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY (organization_id, customer_id) REFERENCES customers(organization_id, id)
);
CREATE TABLE offers (
 id text PRIMARY KEY,
 organization_id text NOT NULL,
 payload jsonb NOT NULL,
 UNIQUE (organization_id, id)
);
CREATE TABLE verifications (
 offer_id text PRIMARY KEY,
 organization_id text NOT NULL,
 payload jsonb NOT NULL,
 FOREIGN KEY (organization_id, offer_id) REFERENCES offers(organization_id, id)
);
CREATE TABLE quotes (
 id text PRIMARY KEY,
 organization_id text NOT NULL,
 demand_id text NOT NULL REFERENCES demands(id),
 payload jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE audit_events (
 id bigserial PRIMARY KEY,
 organization_id text NOT NULL,
 actor_id text NOT NULL,
 action text NOT NULL,
 record_id text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX demands_customer ON demands(organization_id, customer_id);
CREATE INDEX quotes_demand ON quotes(organization_id, demand_id);
