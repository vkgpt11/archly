ALTER TABLE user_llm_settings ADD COLUMN api_key_hint VARCHAR(16);
ALTER TABLE user_llm_settings ADD COLUMN last_successful_use_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_llm_settings ADD COLUMN last_error_code VARCHAR(64);
