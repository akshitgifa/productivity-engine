-- Migration to add recurrence_type to tasks table
ALTER TABLE tasks ADD COLUMN recurrence_type TEXT DEFAULT 'completion' CHECK (recurrence_type IN ('completion', 'schedule'));

-- Update existing recurring tasks to have a default recurrence_type
UPDATE tasks SET recurrence_type = 'completion' WHERE recurrence_interval_days IS NOT NULL AND recurrence_type IS NULL;
