-- Saves when an asset was last saved to the millisecond (2026-11-07), not the second, so PUT /api/assets/{id} can
-- tell two saves within one second apart when it refuses an out-of-date one. Run once:
--   "C:/Program Files/MySQL/MySQL Server 8.4/bin/mysql.exe" -u gameatlas -p gameatlas < backend/sql/asset-updated-at-ms.sql
-- A database made from tables.sql after that date already has it, so this isn't needed there. Saved times keep
-- their value (with .000 added).

ALTER TABLE assets MODIFY updated_at DATETIME(3) NOT NULL;

SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'assets' AND COLUMN_NAME = 'updated_at';
