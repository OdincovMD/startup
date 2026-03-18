-- Partial unique index: at most one pending request per (user_id, audience, tier, is_trial)
-- Run: psql -d <dbname> -f backend/migrations/add_subscription_request_unique_pending.sql
-- Idempotent: IF NOT EXISTS not supported for indexes, use DO block.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_sub_request_unique_pending'
  ) THEN
    CREATE UNIQUE INDEX idx_sub_request_unique_pending
    ON subscription_requests (user_id, audience, tier, is_trial)
    WHERE status = 'pending';
  END IF;
END $$;
