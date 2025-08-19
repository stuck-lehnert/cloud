CREATE TABLE projects (
    id BIGINT PRIMARY KEY DEFAULT ulid64(),

    title VARCHAR(63) NOT NULL,
    description VARCHAR(127),

    address jsonb,

    customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,

    leader_group_id BIGINT NOT NULL REFERENCES groups(id),
    member_group_id BIGINT NOT NULL REFERENCES groups(id),
    visitor_group_id BIGINT NOT NULL REFERENCES groups(id),

    finished_at TIMESTAMPTZ,

    _sort TEXT NOT NULL GENERATED ALWAYS AS (
        create_sortable(title)
    ) STORED,
    _search tsvector NOT NULL GENERATED ALWAYS AS (
        create_searchable(title, description, jsonb_to_search_string(address))
    ) STORED,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER projects_modified_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION trigger_modified_at();

CREATE INDEX ON projects (_sort);
CREATE INDEX ON projects USING GIN (_search);

CREATE INDEX ON projects (customer_id);
CREATE INDEX ON projects (leader_group_id);
CREATE INDEX ON projects (member_group_id);
CREATE INDEX ON projects (visitor_group_id);
