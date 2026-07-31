CREATE TABLE IF NOT EXISTS students (
    id             UUID PRIMARY KEY,
    district_id    UUID NOT NULL REFERENCES districts(id),
    external_id    TEXT NOT NULL,
    first_name     TEXT NOT NULL,
    last_name      TEXT NOT NULL,
    grade_level    INTEGER NOT NULL,
    school_name    TEXT NOT NULL,
    program_status TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (district_id, external_id)
)