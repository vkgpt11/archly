CREATE TABLE ai_generation_requests (
    request_id VARCHAR(64) PRIMARY KEY,
    user_subject VARCHAR(255) NOT NULL,
    fingerprint VARCHAR(64) NOT NULL,
    state VARCHAR(24) NOT NULL,
    encrypted_result TEXT,
    encryption_key_version INTEGER,
    failure_status INTEGER,
    failure_message VARCHAR(512),
    lease_until TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX ix_ai_generation_expiry ON ai_generation_requests(expires_at);
CREATE INDEX ix_ai_generation_user ON ai_generation_requests(user_subject);
ALTER TABLE ai_usage_events ADD COLUMN cached_input_tokens BIGINT NOT NULL DEFAULT 0;
ALTER TABLE ai_usage_events ADD COLUMN provider_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ai_usage_events ADD COLUMN repair_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ai_usage_events ADD COLUMN unknown_usage_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ai_usage_events ADD COLUMN pricing_version VARCHAR(120) NOT NULL DEFAULT 'legacy-unversioned';
ALTER TABLE ai_usage_events ADD COLUMN duration_millis BIGINT NOT NULL DEFAULT 0;

CREATE TABLE ai_budget_reservations (
    request_id VARCHAR(64) PRIMARY KEY,
    user_subject VARCHAR(255) NOT NULL,
    reserved_cost_micros BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX ix_ai_budget_reservation_time ON ai_budget_reservations(created_at);
