-- Creates the GameAtlas database and the user the app logs in as. Run this once, as root, from the project folder
-- (mysql asks for the root password), then tables.sql:
--   mysql -u root -p -e "source backend/sql/init.sql"
--   mysql -u root -p gameatlas -e "source backend/sql/tables.sql"
--
-- The user's password is the local-only default in backend/src/config.ts, so the app needs no .env to log in.
-- It only works from the same computer ('gameatlas'@'localhost'). It meets MySQL's password-strength check in
-- case that's turned on.

CREATE DATABASE IF NOT EXISTS gameatlas
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

-- MySQL 8.4 removed mysql_native_password, so this uses the default caching_sha2_password,
-- which mysql2 (the driver the backend uses) supports.
CREATE USER IF NOT EXISTS 'gameatlas'@'localhost' IDENTIFIED BY 'GameAtlas-local-1';

-- Enough to run the app and to create or change its tables. No rights over any other database.
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER, REFERENCES
    ON gameatlas.* TO 'gameatlas'@'localhost';

FLUSH PRIVILEGES;

SELECT 'gameatlas database and user are ready' AS result;
