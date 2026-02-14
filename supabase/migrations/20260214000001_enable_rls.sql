-- Enable RLS and add policies for all tables

-- Projects
alter table projects enable row level security;
create policy "Users can only see their own projects" on projects
  for all using (auth.uid() = user_id);

-- Tasks
alter table tasks enable row level security;
create policy "Users can only see their own tasks" on tasks
  for all using (auth.uid() = user_id);

-- Activity Logs
alter table activity_logs enable row level security;
create policy "Users can only see their own activity logs" on activity_logs
  for all using (auth.uid() = user_id);

-- Notes
alter table notes enable row level security;
create policy "Users can only see their own notes" on notes
  for all using (auth.uid() = user_id);

-- Subtasks (indirectly through tasks)
alter table subtasks enable row level security;
create policy "Users can see subtasks of their tasks" on subtasks
  for all using (
    exists (
      select 1 from tasks 
      where tasks.id = subtasks.task_id 
      and tasks.user_id = auth.uid()
    )
  );

-- Context Cards (indirectly through projects)
alter table context_cards enable row level security;
create policy "Users can see context cards of their projects" on context_cards
  for all using (
    exists (
      select 1 from projects 
      where projects.id = context_cards.project_id 
      and projects.user_id = auth.uid()
    )
  );
