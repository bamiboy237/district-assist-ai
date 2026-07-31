CREATE TABLE IF NOT EXISTS specialist_school_assignments (
    district_id UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
    clerk_user_id TEXT NOT NULL CHECK (char_length(clerk_user_id) > 0),
    school_name TEXT NOT NULL CHECK (char_length(school_name) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (district_id, clerk_user_id, school_name)
);

CREATE INDEX IF NOT EXISTS specialist_school_assignments_user_idx
ON specialist_school_assignments(district_id, clerk_user_id);
