-- Add planned_date column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS planned_date text;

-- Add index for performance in Today view logic
CREATE INDEX IF NOT EXISTS idx_tasks_planned_date ON tasks(planned_date);
