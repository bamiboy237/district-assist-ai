CREATE TABLE IF NOT EXISTS districts (
    id         UUID PRIMARY KEY,
    name       TEXT NOT NULL,
    state_code CHAR(2) NOT NULL,
    clerk_organization_id TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
