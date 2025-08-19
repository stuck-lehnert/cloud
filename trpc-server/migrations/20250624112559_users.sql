CREATE TABLE users (
    id BIGINT PRIMARY KEY DEFAULT ulid64(),

    salutation VARCHAR(31),
    first_name VARCHAR(63) NOT NULL,
    last_name VARCHAR(63),

    username VARCHAR(63) UNIQUE,
    password VARCHAR(127),
    totp_secret VARCHAR(127),

    phone VARCHAR(31),
    email VARCHAR(127),

    disabled_since TIMESTAMPTZ,

    _sort TEXT NOT NULL GENERATED ALWAYS AS (
        create_sortable(last_name, first_name)
    ) STORED,
    _search tsvector NOT NULL GENERATED ALWAYS AS (
        create_searchable(salutation, first_name, last_name, username, phone, email)
    ) STORED,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER users_modified_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION trigger_modified_at();

CREATE INDEX ON users (_sort);
CREATE INDEX ON users USING GIN (_search);
