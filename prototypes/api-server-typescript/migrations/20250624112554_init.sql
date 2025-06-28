CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION generate_id() RETURNS TEXT AS $$
DECLARE
    unix_time BIGINT;
    timestamp BYTEA;
BEGIN
    unix_time = (EXTRACT(EPOCH FROM CLOCK_TIMESTAMP()) * 1000)::BIGINT;
    timestamp = DECODE(LPAD(TO_HEX(unix_time), 12, '0'), 'hex');
    RETURN encode(timestamp || gen_random_bytes(4), 'hex');
END;
$$ LANGUAGE PLPGSQL VOLATILE;


CREATE OR REPLACE FUNCTION create_query(
    query TEXT
) RETURNS tsquery LANGUAGE SQL IMMUTABLE AS $$
    SELECT to_tsquery(
        'simple',
        array_to_string(
            ARRAY(
                SELECT (quote_literal(TRIM(qpart)) || ':*')
                FROM unnest(string_to_array(query, ' ')) AS qpart
                WHERE LENGTH(TRIM(qpart)) > 0
            ),
            ' & '
        )
    );
$$;


CREATE OR REPLACE FUNCTION create_searchable(
    VARIADIC props TEXT[]
) RETURNS tsvector AS $$
    SELECT to_tsvector(
        'simple',
        array_to_string(
            ARRAY(
                SELECT coalesce(prop, '')
                FROM unnest(props) AS prop
            ),
            ' '
        )
    );
$$ LANGUAGE SQL IMMUTABLE;


CREATE OR REPLACE FUNCTION create_sortable(
    VARIADIC parts TEXT[]
) RETURNS TEXT AS $$
    SELECT LEFT(LOWER(string_agg(coalesce(elem, ''), '~')), 255)
    FROM unnest(parts) AS elem;
$$ LANGUAGE SQL IMMUTABLE;


CREATE OR REPLACE FUNCTION jsonb_to_tsvector(data jsonb)
RETURNS tsvector AS $$
DECLARE
    v_search_values jsonb;
    v_search_strings TEXT[];
BEGIN
    IF data IS NULL THEN
        RETURN ''::tsvector;
    END IF;

    v_search_values := jsonb_path_query_array(data, 'lax $.** \\? (@.type() == "string" || @.type() == "number")');

    IF v_search_values IS NULL OR v_search_values = '[]'::jsonb THEN
        RETURN ''::tsvector;
    END IF;

    SELECT array_agg(elem::text)
    INTO v_search_strings
    FROM jsonb_array_elements(v_search_values) elem;

    RETURN to_tsvector('simple', array_to_string(v_search_strings, ' '));
END;
$$ LANGUAGE PLPGSQL IMMUTABLE;


CREATE OR REPLACE FUNCTION trigger_modified_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.modified_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE PLPGSQL;


CREATE OR REPLACE FUNCTION to_iso8601(val TIMESTAMPTZ)
RETURNS TEXT AS $$
BEGIN
    RETURN to_char(val, 'YYYY-MM-DD"T"HH24:MI:SSOF');
END
$$ LANGUAGE PLPGSQL IMMUTABLE;
