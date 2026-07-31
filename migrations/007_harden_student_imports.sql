ALTER TABLE import_jobs
    ADD COLUMN IF NOT EXISTS file_checksum TEXT,
    ADD COLUMN IF NOT EXISTS failure_code TEXT,
    ADD COLUMN IF NOT EXISTS failure_message TEXT;

ALTER TABLE import_jobs
    DROP CONSTRAINT IF EXISTS import_jobs_file_checksum_format;

ALTER TABLE import_jobs
    ADD CONSTRAINT import_jobs_file_checksum_format
    CHECK (file_checksum IS NULL OR file_checksum ~ '^[0-9a-f]{64}$');

CREATE UNIQUE INDEX IF NOT EXISTS import_jobs_active_file_checksum_uidx
    ON import_jobs (district_id, file_checksum)
    WHERE file_checksum IS NOT NULL AND status <> 'failed';
