-- Migration: Update researcher fields
-- Remove: photo_url, contacts
-- Change to VARCHAR: position, desired_positions, employment_type_preference

-- Remove unused columns
ALTER TABLE researchers DROP COLUMN IF EXISTS photo_url;
ALTER TABLE researchers DROP COLUMN IF EXISTS contacts;

-- Convert JSON arrays to VARCHAR (simple text)
-- First add new columns
ALTER TABLE researchers ADD COLUMN IF NOT EXISTS position_text VARCHAR(500);
ALTER TABLE researchers ADD COLUMN IF NOT EXISTS desired_positions_text VARCHAR(500);
ALTER TABLE researchers ADD COLUMN IF NOT EXISTS employment_type_text VARCHAR(500);

-- Copy data from JSON arrays to text (join with comma)
UPDATE researchers SET position_text = (
  SELECT string_agg(elem::text, ', ')
  FROM jsonb_array_elements_text(COALESCE(position::jsonb, '[]'::jsonb)) AS elem
) WHERE position IS NOT NULL;

UPDATE researchers SET desired_positions_text = (
  SELECT string_agg(elem::text, ', ')
  FROM jsonb_array_elements_text(COALESCE(desired_positions::jsonb, '[]'::jsonb)) AS elem
) WHERE desired_positions IS NOT NULL;

UPDATE researchers SET employment_type_text = (
  SELECT string_agg(elem::text, ', ')
  FROM jsonb_array_elements_text(COALESCE(employment_type_preference::jsonb, '[]'::jsonb)) AS elem
) WHERE employment_type_preference IS NOT NULL;

-- Drop old JSON columns
ALTER TABLE researchers DROP COLUMN IF EXISTS position;
ALTER TABLE researchers DROP COLUMN IF EXISTS desired_positions;
ALTER TABLE researchers DROP COLUMN IF EXISTS employment_type_preference;

-- Rename new columns to original names
ALTER TABLE researchers RENAME COLUMN position_text TO position;
ALTER TABLE researchers RENAME COLUMN desired_positions_text TO desired_positions;
ALTER TABLE researchers RENAME COLUMN employment_type_text TO employment_type_preference;
