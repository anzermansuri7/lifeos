alter table public.quit_habits
  add column if not exists category text not null default 'General',
  add column if not exists money_saved_per_day numeric(12, 2) not null default 0 check (money_saved_per_day >= 0),
  add column if not exists time_saved_minutes_per_day integer not null default 0 check (time_saved_minutes_per_day >= 0),
  add column if not exists notes text;

alter table public.quit_habit_logs
  add column if not exists urge_count integer not null default 0 check (urge_count >= 0),
  add column if not exists relapsed boolean not null default false,
  add column if not exists trigger text,
  add column if not exists money_saved numeric(12, 2) not null default 0 check (money_saved >= 0),
  add column if not exists time_saved_minutes integer not null default 0 check (time_saved_minutes >= 0);
