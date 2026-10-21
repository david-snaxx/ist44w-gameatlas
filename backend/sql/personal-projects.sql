-- Adds personal projects (2026-10-21) to a database whose tables were made before them. Run once:
--   "C:/Program Files/MySQL/MySQL Server 8.4/bin/mysql.exe" -u gameatlas -p gameatlas < backend/sql/personal-projects.sql
-- A database made from tables.sql after that date already has the column, so this isn't needed there.

ALTER TABLE projects
    ADD COLUMN personal_user_id CHAR(36) NULL AFTER created_at,
    ADD UNIQUE KEY one_personal_project_per_user (personal_user_id);

-- Marks each user's existing personal project: the one named "<display name> (personal)" with only them in it
UPDATE projects
    JOIN users ON projects.name = CONCAT(users.display_name, ' (personal)')
        AND projects.member_user_ids = JSON_ARRAY(users.id)
SET projects.personal_user_id = users.id;

SELECT name, personal_user_id FROM projects;
