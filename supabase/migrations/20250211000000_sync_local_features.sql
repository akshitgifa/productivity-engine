-- Migration: Sync local-first features to Supabase
-- Add sort_order to tasks for manual reordering
alter table tasks add column if not exists sort_order integer default 0;

-- Add sort_order and is_read to notes
alter table notes add column if not exists sort_order integer default 0;
alter table notes add column if not exists is_read boolean default false;

-- Create context_cards table
create table if not exists context_cards (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  content text not null,
  updated_at timestamp with time zone default now()
);

-- Disable RLS for context_cards (Solo Mode consistency)
alter table context_cards disable row level security;

-- Add updated_at trigger for context_cards
create trigger update_context_cards_updated_at
    before update on context_cards
    for each row
    execute function update_updated_at_column();
