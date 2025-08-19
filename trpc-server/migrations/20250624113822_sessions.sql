CREATE TABLE user_sessions (
    id BIGINT PRIMARY KEY DEFAULT ulid64(),

    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    inet_addr VARCHAR(63),
    user_agent VARCHAR(255),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 year')
);

CREATE INDEX ON user_sessions (user_id);
