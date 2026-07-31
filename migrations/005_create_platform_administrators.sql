CREATE TABLE IF NOT EXISTS platform_administrators (
    user_id TEXT PRIMARY KEY CHECK (char_length(user_id) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
