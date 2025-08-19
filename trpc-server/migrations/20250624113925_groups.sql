CREATE TABLE groups (
    id BIGINT PRIMARY KEY DEFAULT ulid64(),

    name VARCHAR(63) NOT NULL,
    description VARCHAR(127),

    deletable BOOLEAN NOT NULL DEFAULT TRUE,

    _sort TEXT NOT NULL GENERATED ALWAYS AS (
        create_sortable(name)
    ) STORED,
    _search tsvector NOT NULL GENERATED ALWAYS AS (
        create_searchable(name, description)
    ) STORED,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER groups_modified_at
BEFORE UPDATE ON groups
FOR EACH ROW
EXECUTE FUNCTION trigger_modified_at();

CREATE INDEX ON groups (_sort);
CREATE INDEX ON groups USING GIN (_search);

CREATE TABLE group_member_users (
    group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    member_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    PRIMARY KEY (group_id, member_user_id)
);

CREATE TABLE group_member_groups (
    group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    member_group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,

    PRIMARY KEY (group_id, member_group_id),
    CHECK (group_id != member_group_id)
);

CREATE OR REPLACE FUNCTION get_parent_group_ids_for_group(
    p_group_id BIGINT
) RETURNS BIGINT[] LANGUAGE SQL STABLE AS $$
    -- Purpose:
    --     For a given group ID, recursively finds all parent group IDs it is a member of.
    --     For example, if C is in B and B is in A, get_group_parent_ids(C) -> {B, A}.

    WITH RECURSIVE parent_groups AS (
        -- Anchor: Find the direct parents of the starting group.
        SELECT gmg.group_id
        FROM   group_member_groups gmg
        WHERE  gmg.member_group_id = p_group_id

        UNION ALL

        -- Recursive: Find the parents of the groups we just found.
        SELECT gmg.group_id
        FROM   group_member_groups gmg
        JOIN   parent_groups pg ON gmg.member_group_id = pg.group_id
    )
    -- Safety clause to prevent infinite loops on circular dependencies
    CYCLE group_id SET is_cycle USING path_tracker
    
    SELECT coalesce(array_agg(DISTINCT group_id), '{}') FROM parent_groups;
$$;

CREATE OR REPLACE FUNCTION get_group_ids_for_user(
    p_user_id BIGINT
) RETURNS BIGINT[] LANGUAGE SQL STABLE AS $$
    -- Purpose:
    --     For a given user ID, finds all group IDs the user is a member of,
    --     both directly and indirectly through nested groups.

    WITH RECURSIVE all_user_groups AS (
        -- Anchor: Find the groups the user is directly a member of.
        SELECT gm.group_id
        FROM   group_member_users gm
        WHERE  gm.member_user_id = p_user_id

        UNION ALL

        -- Recursive: Find the parents of the groups we have already found.
        SELECT gmg.group_id
        FROM   group_member_groups gmg
        JOIN   all_user_groups aug ON gmg.member_group_id = aug.group_id
    )
    CYCLE group_id SET is_cycle USING path_tracker
    
    SELECT coalesce(array_agg(DISTINCT group_id), '{}') FROM all_user_groups;
$$;

CREATE OR REPLACE FUNCTION get_member_user_ids_for_group(
    p_group_id BIGINT
) RETURNS BIGINT[] LANGUAGE SQL STABLE AS $$
    -- Purpose:
    --     For a given group ID, finds all users who are members of that group
    --     or any of its nested sub-groups.

    WITH RECURSIVE group_and_sub_groups AS (
        -- Anchor: Start with the group itself.
        SELECT p_group_id AS group_id

        UNION ALL

        -- Recursive: Find all direct child groups of the groups we've found.
        SELECT gmg.member_group_id
        FROM   group_member_groups gmg
        JOIN   group_and_sub_groups sgs ON gmg.group_id = sgs.group_id
    )
    CYCLE group_id SET is_cycle USING path_tracker
    
    -- Now that we have the full list of relevant groups, find all their user members.
    SELECT coalesce(array_agg(DISTINCT gmu.member_user_id), '{}')
    FROM   group_member_users gmu
    WHERE  gmu.group_id IN (SELECT group_id FROM group_and_sub_groups);
$$;
