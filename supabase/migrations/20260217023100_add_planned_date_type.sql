-- Migration: Add planned_date_type to tasks
-- Description: Adds a column to distinguish between 'on' (hard date) and 'before' (soft window) planning types.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS planned_date_type text DEFAULT 'on';

-- Add index for performance in distribution logic
CREATE INDEX IF NOT EXISTS idx_tasks_planned_date_type ON tasks(planned_date_type);
