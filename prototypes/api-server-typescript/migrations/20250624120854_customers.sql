CREATE TABLE customers (
    id TEXT PRIMARY KEY DEFAULT generate_id(),

    salutation VARCHAR(31),
    name VARCHAR(127) NOT NULL,

    loc_country VARCHAR(63),
    loc_city VARCHAR(63),
    loc_zip VARCHAR(31),
    loc_street_address VARCHAR(127),

    _sort TEXT NOT NULL GENERATED ALWAYS AS (
        create_sortable(name)
    ) STORED,
    _search tsvector NOT NULL GENERATED ALWAYS AS (
        create_searchable(salutation, name, loc_country, loc_city, loc_zip, loc_street_address)
    ) STORED,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER customers_modified_at
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION trigger_modified_at();

CREATE INDEX ON customers (_sort);
CREATE INDEX ON customers USING GIN (_search);
