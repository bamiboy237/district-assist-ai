CREATE TABLE IF NOT EXISTS import_jobs (
    id UUID PRIMARY KEY,
    district_id UUID NOT NULL REFERENCES districts(id),
    filename TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('received', 'processing', 'completed', 'failed')),
    total_rows INTEGER NOT NULL DEFAULT 0 CHECK (total_rows >= 0),
    accepted_rows INTEGER NOT NULL DEFAULT 0 CHECK (accepted_rows >= 0),
    rejected_rows INTEGER NOT NULL DEFAULT 0 CHECK (rejected_rows >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS import_errors (
    id UUID PRIMARY KEY,
    import_job_id UUID NOT NULL REFERENCES import_jobs(id),
    row_number INTEGER NOT NULL CHECK (row_number > 0),
    field TEXT,
    code TEXT NOT NULL,
    message TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS import_jobs_district_id_idx ON import_jobs(district_id);
CREATE INDEX IF NOT EXISTS import_errors_import_job_id_idx ON import_errors(import_job_id);
