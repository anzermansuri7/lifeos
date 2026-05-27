alter table public.journal_entries
  add column if not exists wins text,
  add column if not exists failures text,
  add column if not exists lessons_learned text,
  add column if not exists tomorrow_focus text;

alter table public.journal_entries
  alter column is_private set default true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'journal_entries_user_id_entry_date_key'
  ) then
    alter table public.journal_entries
      add constraint journal_entries_user_id_entry_date_key unique (user_id, entry_date);
  end if;
end $$;
