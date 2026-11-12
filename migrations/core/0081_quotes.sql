-- Products and USD price revisions retain the exact meaning copied into each quote.
CREATE TABLE quote_products (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 active INTEGER NOT NULL CHECK(active IN (0,1)),
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE TABLE quote_prices (
 id TEXT PRIMARY KEY,
 product_id TEXT NOT NULL REFERENCES quote_products(id) ON DELETE CASCADE,
 version INTEGER NOT NULL CHECK(version>0),
 unit_price_cents INTEGER NOT NULL CHECK(unit_price_cents>=0 AND unit_price_cents<=1000000000),
 created_by TEXT NOT NULL REFERENCES operators(id),
 created_at TEXT NOT NULL,
 UNIQUE(product_id,version)
);
CREATE TABLE quote_versions (
 id TEXT PRIMARY KEY,
 opportunity_id TEXT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
 version INTEGER NOT NULL CHECK(version>0),
 content_json TEXT NOT NULL CHECK(json_valid(content_json)),
 created_by TEXT NOT NULL REFERENCES operators(id),
 created_at TEXT NOT NULL,
 UNIQUE(opportunity_id,version)
);
CREATE TRIGGER quote_version_immutable BEFORE UPDATE ON quote_versions
BEGIN SELECT RAISE(ABORT,'Quote versions are immutable; create a new version.'); END;
CREATE TRIGGER quote_price_immutable BEFORE UPDATE ON quote_prices
BEGIN SELECT RAISE(ABORT,'Book prices are immutable; create a new price revision.'); END;
