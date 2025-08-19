CREATE TABLE customers (
    id BIGINT PRIMARY KEY DEFAULT ulid64(),

    salutation VARCHAR(31),
    name VARCHAR(127) NOT NULL,

    address jsonb,

    _sort TEXT NOT NULL GENERATED ALWAYS AS (
        create_sortable(name)
    ) STORED,
    _search tsvector NOT NULL GENERATED ALWAYS AS (
        create_searchable(salutation, name, jsonb_to_search_string(address))
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
