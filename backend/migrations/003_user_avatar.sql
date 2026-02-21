-- Migration: Add photo_url column to users table
-- Created: 2026-02-20

ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);
