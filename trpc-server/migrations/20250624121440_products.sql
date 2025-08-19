CREATE TABLE products (
    id BIGINT PRIMARY KEY DEFAULT ulid64(),

    name VARCHAR(127) NOT NULL,
    description VARCHAR(255),

    base_unit VARCHAR(15) NOT NULL,
    more_units jsonb NOT NULL DEFAULT '{}',

    _sort TEXT NOT NULL GENERATED ALWAYS AS (
        create_sortable(name)
    ) STORED,
    _search tsvector NOT NULL GENERATED ALWAYS AS (
        create_searchable(name, description)
    ) STORED
);

CREATE INDEX ON products (_sort);
CREATE INDEX ON products USING GIN (_search);

CREATE TABLE product_units (
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    unit VARCHAR(15) NOT NULL,
    base_unit_multiplier DECIMAL(10, 3) NOT NULL,

    PRIMARY KEY (product_id, unit)
);

CREATE UNIQUE INDEX ON product_units (product_id, (LOWER(unit)));

