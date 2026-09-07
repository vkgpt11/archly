ALTER TABLE user_llm_settings ADD COLUMN encryption_key_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_llm_settings ADD CONSTRAINT ck_llm_provider CHECK (provider IN ('OPENAI'));
ALTER TABLE user_llm_settings ADD CONSTRAINT ck_llm_ciphertext CHECK (LENGTH(encrypted_api_key) >= 32);
ALTER TABLE user_llm_settings ADD CONSTRAINT ck_llm_key_version CHECK (encryption_key_version >= 0);

CREATE TABLE ai_credential_audit_events (
    id UUID PRIMARY KEY, user_subject VARCHAR(255) NOT NULL, action VARCHAR(48) NOT NULL,
    provider VARCHAR(32) NOT NULL, key_version INTEGER, outcome VARCHAR(24) NOT NULL,
    correlation_id VARCHAR(128), occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT ck_ai_audit_action CHECK (action IN ('CREATED','UPDATED','TESTED','USED','ROTATED','DELETED','DECRYPT_FAILED')),
    CONSTRAINT ck_ai_audit_outcome CHECK (outcome IN ('SUCCESS','FAILURE'))
);
CREATE INDEX ix_ai_credential_audit_user_time ON ai_credential_audit_events(user_subject, occurred_at);

CREATE TABLE ai_usage_events (
    id UUID PRIMARY KEY, request_id VARCHAR(128) NOT NULL UNIQUE, user_subject VARCHAR(255) NOT NULL,
    model VARCHAR(120) NOT NULL, input_tokens BIGINT NOT NULL DEFAULT 0, output_tokens BIGINT NOT NULL DEFAULT 0,
    estimated_cost_micros BIGINT NOT NULL DEFAULT 0, status VARCHAR(48) NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX ix_ai_usage_user_time ON ai_usage_events(user_subject, occurred_at);

CREATE TABLE ai_rate_limit_buckets (
    bucket_key VARCHAR(320) PRIMARY KEY, request_count INTEGER NOT NULL, window_started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT ck_ai_bucket_count CHECK (request_count >= 0)
);
