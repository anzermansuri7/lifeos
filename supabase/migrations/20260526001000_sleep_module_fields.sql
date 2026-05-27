alter table public.sleep_logs
  add column if not exists sleep_quality text,
  add column if not exists late_phone_usage boolean not null default false,
  add column if not exists sleep_goal_minutes integer not null default 480 check (sleep_goal_minutes > 0);

alter table public.sleep_logs
  drop constraint if exists sleep_logs_sleep_quality_check,
  add constraint sleep_logs_sleep_quality_check
    check (sleep_quality is null or sleep_quality in ('poor', 'okay', 'good'));
