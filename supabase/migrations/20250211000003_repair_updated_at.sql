-- Repair: add updated_at to tables that were missed
-- (migration 20250211000001 was marked applied via CLI but never actually executed)

alter table activity_logs add column if not exists updated_at timestamp with time zone default now();
alter table subtasks add column if not exists updated_at timestamp with time zone default now();

-- Ensure triggers exist for automatic updated_at updates
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

do $$
declare
    t text;
begin
    for t in select table_name 
             from information_schema.tables 
             where table_schema = 'public' 
             and table_name in ('projects', 'tasks', 'notes', 'activity_logs', 'subtasks', 'context_cards')
    loop
        execute format('drop trigger if exists update_%I_updated_at on %I', t, t);
        execute format('create trigger update_%I_updated_at before update on %I for each row execute function update_updated_at_column()', t, t);
    end loop;
end;
$$;
