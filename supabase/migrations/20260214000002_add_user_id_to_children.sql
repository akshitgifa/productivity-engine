-- Add user_id to child tables for consistency and performance
-- Subtasks
alter table subtasks add column if not exists user_id uuid references auth.users(id);
-- Update existing subtasks based on their parent task's user_id
update subtasks s set user_id = t.user_id from tasks t where s.task_id = t.id and s.user_id is null;

-- Context Cards
alter table context_cards add column if not exists user_id uuid references auth.users(id);
-- Update existing context cards based on their parent project's user_id
update context_cards c set user_id = p.user_id from projects p where c.project_id = p.id and c.user_id is null;

-- Simplified RLS Policies
drop policy if exists "Users can see subtasks of their tasks" on subtasks;
drop policy if exists "Users can only see their own subtasks" on subtasks;
create policy "Users can only see their own subtasks" on subtasks
  for all using (auth.uid() = user_id);

drop policy if exists "Users can see context cards of their projects" on context_cards;
drop policy if exists "Users can only see their own context cards" on context_cards;
create policy "Users can only see their own context cards" on context_cards
  for all using (auth.uid() = user_id);
