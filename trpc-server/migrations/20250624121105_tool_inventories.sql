CREATE TABLE tool_inventories (
    id BIGINT PRIMARY KEY DEFAULT ulid64(),

    tool_id BIGINT NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    comment VARCHAR(255),

    _sort TEXT NOT NULL GENERATED ALWAYS AS (
        create_sortable(reverse(to_iso8601(created_at)))
    ) STORED,
    _search tsvector NOT NULL GENERATED ALWAYS AS (
        create_searchable(comment)
    ) STORED
);

CREATE INDEX ON tool_inventories USING GIN (_search);
CREATE INDEX ON tool_inventories (_sort);

CREATE INDEX ON tool_inventories (tool_id);
