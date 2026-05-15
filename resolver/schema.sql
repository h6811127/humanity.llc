-- Tech Spec v0.5 §3.2 (SQLite `profiles` + indexes)
CREATE TABLE IF NOT EXISTS profiles (
    profile_id TEXT PRIMARY KEY,
    handle TEXT UNIQUE NOT NULL,
    manifesto_line TEXT NOT NULL,
    public_key TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    revoked INTEGER DEFAULT 0,
    revoked_at INTEGER,
    revocation_secret_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_profiles_handle ON profiles(handle);
CREATE INDEX IF NOT EXISTS idx_profiles_revoked ON profiles(revoked);
