-- Add is_blocked column to users table
-- Run: psql -d <dbname> -f backend/migrations/add_user_is_blocked.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false;
