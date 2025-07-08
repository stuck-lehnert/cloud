CREATE TABLE projects (
    id TEXT PRIMARY KEY DEFAULT generate_id(),

    title VARCHAR(63) NOT NULL,
    description VARCHAR(127),

    loc_country VARCHAR(63),
    loc_city VARCHAR(63),
    loc_zip VARCHAR(31),
    loc_street_address VARCHAR(127),

    customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,

    lead_group_id TEXT NOT NULL REFERENCES groups(id),
    modify_group_id TEXT NOT NULL REFERENCES groups(id),
    view_group_id TEXT NOT NULL REFERENCES groups(id),

    _sort TEXT NOT NULL GENERATED ALWAYS AS (
        create_sortable(title)
    ) STORED,
    _search tsvector NOT NULL GENERATED ALWAYS AS (
        create_searchable(title, description, loc_country, loc_city, loc_zip, loc_street_address)
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
CREATE INDEX ON projects (lead_group_id);
CREATE INDEX ON projects (modify_group_id);
CREATE INDEX ON projects (view_group_id);
