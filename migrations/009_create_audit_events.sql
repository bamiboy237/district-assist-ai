CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY,
    district_id UUID REFERENCES districts(id) ON DELETE SET NULL,
    actor_user_id TEXT NOT NULL CHECK (char_length(actor_user_id) > 0),
    action TEXT NOT NULL CHECK (char_length(action) > 0),
    request_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_events_district_created_idx
ON audit_events(district_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_events_actor_created_idx
ON audit_events(actor_user_id, created_at DESC);
