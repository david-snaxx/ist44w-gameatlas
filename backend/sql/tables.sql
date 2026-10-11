-- GameAtlas tables (PLAN.md §5.6). Run once against the `gameatlas` database:
--   mysql -u gameatlas -p gameatlas < backend/sql/tables.sql
--
-- `users` already exists and is listed here only so the whole schema is in one place.
-- A project owns everything in it, so every table below cascades when its project is deleted.

CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash VARCHAR(72) NOT NULL,
    display_name VARCHAR(64) NOT NULL,
    created_at DATETIME NOT NULL,
    project_ids JSON NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    created_at DATETIME NOT NULL,
    -- MySQL can't enforce anything inside a JSON array, so the routes keep these lists correct
    member_user_ids JSON NOT NULL,
    blueprint_ids JSON NOT NULL,
    asset_ids JSON NOT NULL,
    dialogue_ids JSON NOT NULL
);

-- `id` is the internal UUID that projects.blueprint_ids holds; `schema_key` is the snake_case ID
-- the API shows as a blueprint's `id`. It only has to be unique inside one project.
CREATE TABLE IF NOT EXISTS blueprints (
    id CHAR(36) PRIMARY KEY,
    project_id CHAR(36) NOT NULL,
    schema_key VARCHAR(64) NOT NULL,
    name VARCHAR(120) NOT NULL,
    description TEXT NULL,
    kind VARCHAR(16) NOT NULL DEFAULT 'form',
    version INT NOT NULL DEFAULT 1,
    fields JSON NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    UNIQUE KEY blueprint_key_per_project (project_id, schema_key),
    FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
);

-- `asset_key` is the snake_case ID users see. It only has to be unique among one blueprint's assets.
CREATE TABLE IF NOT EXISTS assets (
    id CHAR(36) PRIMARY KEY,
    project_id CHAR(36) NOT NULL,
    blueprint_id CHAR(36) NOT NULL,
    asset_key VARCHAR(64) NOT NULL,
    schema_version INT NOT NULL,
    data JSON NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    UNIQUE KEY asset_key_per_blueprint (blueprint_id, asset_key),
    FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
    -- Deleting a blueprint takes its assets with it
    FOREIGN KEY (blueprint_id) REFERENCES blueprints (id) ON DELETE CASCADE
);

-- `nodes` and `edges` hold the canvas layout too; the downloaded file leaves it out.
CREATE TABLE IF NOT EXISTS dialogues (
    id CHAR(36) PRIMARY KEY,
    project_id CHAR(36) NOT NULL,
    dialogue_key VARCHAR(64) NOT NULL,
    name VARCHAR(120) NOT NULL,
    description TEXT NOT NULL,
    speaker_blueprint VARCHAR(64) NOT NULL,
    item_blueprint VARCHAR(64) NOT NULL,
    nodes JSON NOT NULL,
    edges JSON NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    UNIQUE KEY dialogue_key_per_project (project_id, dialogue_key),
    FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
);
