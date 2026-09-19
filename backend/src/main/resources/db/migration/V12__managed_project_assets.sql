CREATE TABLE project_assets (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL,
    owner_email VARCHAR(255) NOT NULL,
    owner_user_id UUID,
    creator VARCHAR(255) NOT NULL,
    storage_key VARCHAR(255) NOT NULL UNIQUE,
    media_type VARCHAR(32) NOT NULL,
    byte_size BIGINT NOT NULL,
    pixel_width INTEGER NOT NULL,
    pixel_height INTEGER NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    state VARCHAR(24) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    unreferenced_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX ix_project_assets_project ON project_assets(project_id);
CREATE INDEX ix_project_assets_owner ON project_assets(owner_email);
CREATE INDEX ix_project_assets_cleanup ON project_assets(unreferenced_at);
CREATE TABLE project_asset_locks (id INTEGER PRIMARY KEY);
INSERT INTO project_asset_locks(id) VALUES (0);
