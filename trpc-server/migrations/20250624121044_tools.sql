CREATE TABLE tools (
    id BIGINT PRIMARY KEY DEFAULT ulid64(),

    custom_id INT NOT NULL CHECK (custom_id >= 0),
    brand VARCHAR(63) NOT NULL,
    category VARCHAR(63) NOT NULL,
    label VARCHAR(31),

    archived_since TIMESTAMPTZ,

    _sort TEXT NOT NULL GENERATED ALWAYS AS (
        create_sortable(lpad(custom_id::TEXT, 20, '0'), brand, category, label)
    ) STORED,
    _search tsvector NOT NULL GENERATED ALWAYS AS (
        create_searchable(custom_id::TEXT, brand, category, label)
    ) STORED,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER tools_modified_at
BEFORE UPDATE ON tools
FOR EACH ROW
EXECUTE FUNCTION trigger_modified_at();

CREATE INDEX ON tools (_sort);
CREATE INDEX ON tools USING GIN (_search);

CREATE INDEX ON tools (brand);
CREATE INDEX ON tools (category);

CREATE UNIQUE INDEX ON tools (custom_id) WHERE archived_since IS NULL;
