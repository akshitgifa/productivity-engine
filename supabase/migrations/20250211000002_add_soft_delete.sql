-- Migration: Add soft-delete support + incremental sync timestamps
-- Adds is_deleted to all major tables for cross-device deletion propagation.

alter table tasks add column if not exists is_deleted boolean default false;
alter table projects add column if not exists is_deleted boolean default false;
alter table notes add column if not exists is_deleted boolean default false;
alter table subtasks add column if not exists is_deleted boolean default false;
alter table context_cards add column if not exists is_deleted boolean default false;

-- Index for efficient filtering of non-deleted records
create index if not exists idx_tasks_is_deleted on tasks (is_deleted) where is_deleted = false;
create index if not exists idx_projects_is_deleted on projects (is_deleted) where is_deleted = false;
create index if not exists idx_notes_is_deleted on notes (is_deleted) where is_deleted = false;

-- Auto-purge: permanently delete soft-deleted records older than 30 days
-- This can be run as a Supabase cron job or Edge Function
-- DELETE FROM tasks WHERE is_deleted = true AND updated_at < NOW() - INTERVAL '30 days';
