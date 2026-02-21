-- Migration: Remove unused fields from students table
-- Fields removed: photo_url, university, level, direction, contacts

-- Drop index on university column first
DROP INDEX IF EXISTS idx_student_university;

-- Remove unused columns
ALTER TABLE students DROP COLUMN IF EXISTS photo_url;
ALTER TABLE students DROP COLUMN IF EXISTS university;
ALTER TABLE students DROP COLUMN IF EXISTS level;
ALTER TABLE students DROP COLUMN IF EXISTS direction;
ALTER TABLE students DROP COLUMN IF EXISTS contacts;
