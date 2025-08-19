CREATE TABLE tool_trackings (
    id BIGINT PRIMARY KEY DEFAULT ulid64(),

    comment VARCHAR(255),

    tool_id BIGINT NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
    responsible_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    project_id BIGINT REFERENCES projects(id) ON DELETE SET NULL,
    
    started_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    ended_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,

    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    deadline_at TIMESTAMPTZ,

    _sort TEXT NOT NULL GENERATED ALWAYS AS (
        create_sortable(reverse(to_iso8601(started_at)))
    ) STORED,
    _search tsvector NOT NULL GENERATED ALWAYS AS (
        create_searchable(comment)
    ) STORED
);

-- Disallow mulitple simultaneous (active) trackings per tool
CREATE UNIQUE INDEX ON tool_trackings (tool_id) WHERE ended_at IS NULL;

CREATE INDEX ON tool_trackings USING GIN (_search);
CREATE INDEX ON tool_trackings (_sort);

CREATE INDEX ON tool_trackings (tool_id);
CREATE INDEX ON tool_trackings (responsible_id);
CREATE INDEX ON tool_trackings (project_id);
CREATE INDEX ON tool_trackings (started_by_user_id);
CREATE INDEX ON tool_trackings (ended_by_user_id);
CREATE INDEX ON tool_trackings (started_at);
CREATE INDEX ON tool_trackings (ended_at);
CREATE INDEX ON tool_trackings ((ended_at IS NULL));

