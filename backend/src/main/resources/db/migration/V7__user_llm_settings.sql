CREATE TABLE user_llm_settings (
    id UUID PRIMARY KEY,
    user_subject VARCHAR(255) NOT NULL UNIQUE,
    provider VARCHAR(32) NOT NULL,
    model VARCHAR(120) NOT NULL,
    encrypted_api_key VARCHAR(2048) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);
