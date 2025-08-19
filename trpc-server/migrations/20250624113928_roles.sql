CREATE TABLE roles (
    name VARCHAR(127) PRIMARY KEY,
    description VARCHAR(255),

    _search tsvector NOT NULL GENERATED ALWAYS AS (
        create_searchable(name, description)
    ) STORED
);

CREATE TABLE user_roles (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_name TEXT NOT NULL REFERENCES roles(name) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_name)
);

CREATE TABLE group_roles (
    group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    role_name TEXT NOT NULL REFERENCES roles(name) ON DELETE CASCADE,
    PRIMARY KEY (group_id, role_name)
);

CREATE OR REPLACE FUNCTION get_user_roles(
    p_user_id BIGINT
) RETURNS TEXT[] LANGUAGE SQL STABLE AS $$
    -- Purpose:
    --     Calculates the complete set of roles for a user, including roles
    --     assigned directly and those inherited from group memberships.

    SELECT coalesce(array_agg(DISTINCT role_name ORDER BY role_name), '{}')
    FROM (
        -- 1. Get roles assigned directly to the user
        SELECT ur.role_name
        FROM   user_roles ur
        WHERE  ur.user_id = p_user_id

        UNION

        -- 2. Get roles inherited from all groups the user is a member of
        SELECT gr.role_name
        FROM   group_roles gr
        WHERE  gr.group_id = ANY(get_group_ids_for_user(p_user_id))
    ) AS all_roles;
$$;
