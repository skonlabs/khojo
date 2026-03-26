-- Performance index for the inconsistency detector query which fetches recent
-- runs per user ordered by timestamp. Without this, the query does a full
-- table scan on every evaluation.
CREATE INDEX IF NOT EXISTS idx_runs_user_timestamp
  ON public.runs (user_id, timestamp DESC);
