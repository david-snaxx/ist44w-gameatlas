-- Creates the GameAtlas database and the user the app logs in as. Run this once, as root:
--   "C:/Program Files/MySQL/MySQL Server 8.4/bin/mysql.exe" -u root -p < backend/sql/init.sql
-- mysql asks for the root password, so it never has to be typed into a file or a command.
--
-- Replace PUT_THE_PASSWORD_FROM_backend/.env_HERE with the DB_PASSWORD value in backend/.env
-- (that file is gitignored, which is why the real password isn't written here).
--
-- Then create the tables:
--   "C:/Program Files/MySQL/MySQL Server 8.4/bin/mysql.exe" -u gameatlas -p gameatlas < backend/sql/tables.sql

CREATE DATABASE IF NOT EXISTS gameatlas
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

-- MySQL 8.4 removed mysql_native_password, so this uses the default caching_sha2_password,
-- which mysql2 (the driver the backend uses) supports.
CREATE USER IF NOT EXISTS 'gameatlas'@'localhost' IDENTIFIED BY 'PUT_THE_PASSWORD_FROM_backend/.env_HERE';

-- Enough to run the app and to create or change its tables. No rights over any other database.
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER, REFERENCES
    ON gameatlas.* TO 'gameatlas'@'localhost';

FLUSH PRIVILEGES;

SELECT 'gameatlas database and user are ready' AS result;
