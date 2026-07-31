CREATE TABLE IF NOT EXISTS support_plans (
    id UUID PRIMARY KEY,
    district_id UUID NOT NULL REFERENCES districts(id),
    student_id UUID NOT NULL REFERENCES students(id),
    status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
    goal TEXT NOT NULL,
    start_date DATE NOT NULL,
    review_date DATE NOT NULL CHECK (review_date >= start_date),
    version INTEGER NOT NULL DEFAULT 0 CHECK (version >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS support_plans_student_id_idx ON support_plans(district_id, student_id);
