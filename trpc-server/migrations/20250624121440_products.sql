CREATE TABLE products (
    id BIGINT PRIMARY KEY DEFAULT ulid64(),

    serial_id INT GENERATED ALWAYS AS IDENTITY (START WITH 100),

    name VARCHAR(127) NOT NULL,
    description VARCHAR(255),

    base_unit VARCHAR(15) NOT NULL,
    more_units jsonb NOT NULL DEFAULT '{}',

    _sort TEXT NOT NULL GENERATED ALWAYS AS (
        create_sortable(name)
    ) STORED,
    _search tsvector NOT NULL GENERATED ALWAYS AS (
        create_searchable(name, description)
    ) STORED,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TRIGGER products_modified_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION trigger_modified_at();

CREATE INDEX ON products (_sort);
CREATE INDEX ON products USING GIN (_search);

