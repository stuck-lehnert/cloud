CREATE TABLE user_sessions (
    id TEXT PRIMARY KEY DEFAULT generate_id(),

    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    inet_addr VARCHAR(63),
    user_agent VARCHAR(255),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 year')
);

CREATE INDEX ON user_sessions (user_id);
