alter table public.health_logs
  add column if not exists waist_cm numeric(5, 2),
  add column if not exists water_glasses integer not null default 0 check (water_glasses >= 0),
  add column if not exists breakfast_done boolean not null default false,
  add column if not exists lunch_done boolean not null default false,
  add column if not exists dinner_done boolean not null default false,
  add column if not exists snacks_done boolean not null default false,
  add column if not exists cheat_meal boolean not null default false,
  add column if not exists craving_count integer not null default 0 check (craving_count >= 0),
  add column if not exists craving_note text,
  add column if not exists workout_done boolean not null default false,
  add column if not exists workout_type text,
  add column if not exists workout_minutes integer not null default 0 check (workout_minutes >= 0),
  add column if not exists walking_minutes integer not null default 0 check (walking_minutes >= 0);
