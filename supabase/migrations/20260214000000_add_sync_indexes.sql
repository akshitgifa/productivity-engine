-- Migration: Add indexes on updated_at for all synced tables
-- These indexes optimize the metadata-driven sync logic (checking for the latest update).

create index if not exists idx_projects_updated_at on projects(updated_at);
create index if not exists idx_tasks_updated_at on tasks(updated_at);
create index if not exists idx_notes_updated_at on notes(updated_at);
create index if not exists idx_activity_logs_updated_at on activity_logs(updated_at);
create index if not exists idx_subtasks_updated_at on subtasks(updated_at);
create index if not exists idx_context_cards_updated_at on context_cards(updated_at);
