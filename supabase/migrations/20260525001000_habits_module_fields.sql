alter table public.habits
  add column if not exists category text not null default 'General',
  add column if not exists priority text not null default 'medium',
  add column if not exists custom_schedule text;

alter table public.habits
  drop constraint if exists habits_frequency_check,
  add constraint habits_frequency_check check (frequency in ('daily', 'weekly', 'custom'));

alter table public.habits
  drop constraint if exists habits_priority_check,
  add constraint habits_priority_check check (priority in ('low', 'medium', 'high'));

alter table public.habit_logs
  add column if not exists status text not null default 'done';

alter table public.habit_logs
  drop constraint if exists habit_logs_status_check,
  add constraint habit_logs_status_check check (status in ('done', 'skipped', 'failed', 'partial'));
