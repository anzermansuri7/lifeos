create table if not exists public.prayer_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prayer_date date not null default current_date,
  prayer_name text not null check (prayer_name in ('fazar', 'zohr', 'asar', 'magrib', 'isha', 'tahajjud')),
  status text not null default 'pending' check (status in ('prayed', 'missed', 'skipped', 'pending')),
  quran_pages numeric(6,2) not null default 5 check (quran_pages >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, prayer_date, prayer_name)
);

create index if not exists prayer_logs_user_id_date_idx on public.prayer_logs(user_id, prayer_date desc);

alter table public.prayer_logs enable row level security;

drop trigger if exists prayer_logs_set_updated_at on public.prayer_logs;
create trigger prayer_logs_set_updated_at before update on public.prayer_logs for each row execute function public.set_updated_at();

drop policy if exists "Users can read their prayer logs" on public.prayer_logs;
create policy "Users can read their prayer logs"
on public.prayer_logs for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their prayer logs" on public.prayer_logs;
create policy "Users can insert their prayer logs"
on public.prayer_logs for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their prayer logs" on public.prayer_logs;
create policy "Users can update their prayer logs"
on public.prayer_logs for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their prayer logs" on public.prayer_logs;
create policy "Users can delete their prayer logs"
on public.prayer_logs for delete
using (auth.uid() = user_id);
