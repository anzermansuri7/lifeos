create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  timezone text default 'Asia/Kolkata',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  category text not null default 'General',
  frequency text not null default 'daily' check (frequency in ('daily', 'weekly', 'custom')),
  custom_schedule text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  target_count integer not null default 1 check (target_count > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  log_date date not null default current_date,
  status text not null default 'done' check (status in ('done', 'skipped', 'failed', 'partial')),
  count integer not null default 1 check (count >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, log_date)
);

create table public.quit_habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'General',
  reason text,
  start_date date not null default current_date,
  money_saved_per_day numeric(12, 2) not null default 0 check (money_saved_per_day >= 0),
  time_saved_minutes_per_day integer not null default 0 check (time_saved_minutes_per_day >= 0),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quit_habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quit_habit_id uuid not null references public.quit_habits(id) on delete cascade,
  log_date date not null default current_date,
  avoided boolean not null default true,
  urge_count integer not null default 0 check (urge_count >= 0),
  relapsed boolean not null default false,
  trigger text,
  money_saved numeric(12, 2) not null default 0 check (money_saved >= 0),
  time_saved_minutes integer not null default 0 check (time_saved_minutes >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quit_habit_id, log_date)
);

create table public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_date date not null default current_date,
  type text not null check (type in ('income', 'fixed_expense', 'variable_expense', 'avoidable_expense')),
  category text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  payment_method text,
  need_or_want text not null default 'need' check (need_or_want in ('need', 'want')),
  description text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  period text not null default 'monthly' check (period in ('weekly', 'monthly', 'yearly')),
  amount numeric(12, 2) not null check (amount >= 0),
  starts_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  lender text,
  debt_type text not null default 'other' check (debt_type in ('loan', 'emi', 'credit_card', 'other')),
  balance numeric(12, 2) not null default 0 check (balance >= 0),
  minimum_payment numeric(12, 2) not null default 0 check (minimum_payment >= 0),
  emi_amount numeric(12, 2) not null default 0 check (emi_amount >= 0),
  credit_limit numeric(12, 2) check (credit_limit >= 0),
  due_day integer check (due_day between 1 and 31),
  due_date date,
  status text not null default 'active' check (status in ('active', 'paid', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.receivables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  payer text,
  amount numeric(12, 2) not null check (amount >= 0),
  due_date date,
  status text not null default 'pending' check (status in ('pending', 'received', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.health_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  weight_kg numeric(5, 2),
  waist_cm numeric(5, 2),
  water_glasses integer not null default 0 check (water_glasses >= 0),
  breakfast_done boolean not null default false,
  lunch_done boolean not null default false,
  dinner_done boolean not null default false,
  snacks_done boolean not null default false,
  cheat_meal boolean not null default false,
  craving_count integer not null default 0 check (craving_count >= 0),
  craving_note text,
  workout_done boolean not null default false,
  workout_type text,
  workout_minutes integer not null default 0 check (workout_minutes >= 0),
  walking_minutes integer not null default 0 check (walking_minutes >= 0),
  steps integer check (steps >= 0),
  calories integer check (calories >= 0),
  mood text,
  energy_level integer check (energy_level between 1 and 10),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create table public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sleep_date date not null default current_date,
  slept_at timestamptz,
  woke_at timestamptz,
  duration_minutes integer check (duration_minutes >= 0),
  quality integer check (quality between 1 and 10),
  sleep_quality text check (sleep_quality is null or sleep_quality in ('poor', 'okay', 'good')),
  late_phone_usage boolean not null default false,
  sleep_goal_minutes integer not null default 480 check (sleep_goal_minutes > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, sleep_date)
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null default current_date,
  title text,
  content text not null,
  mood text,
  wins text,
  failures text,
  lessons_learned text,
  tomorrow_focus text,
  is_private boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.guardians (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  guardian_user_id uuid references auth.users(id) on delete cascade,
  guardian_email text not null,
  display_name text,
  permission_sections text[] not null default '{}' check (
    permission_sections <@ array['habits', 'finance', 'sleep', 'health', 'journal']::text[]
  ),
  status text not null default 'pending' check (status in ('pending', 'approved', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, guardian_email)
);

create table public.guardian_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  guardian_id uuid references public.guardians(id) on delete cascade,
  guardian_user_id uuid not null references auth.users(id) on delete cascade,
  section text not null check (section in ('profile', 'habits', 'quit_habits', 'finance', 'health', 'sleep', 'journal', 'tasks')),
  can_read boolean not null default true,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, guardian_user_id, section),
  check (user_id = owner_user_id),
  check (owner_user_id <> guardian_user_id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done', 'cancelled')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_approved_guardian(
  owner_id uuid,
  shared_section text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.guardian_permissions gp
    where gp.owner_user_id = owner_id
      and gp.guardian_user_id = auth.uid()
      and gp.section = shared_section
      and gp.can_read = true
      and gp.approved_at is not null
  );
$$;

create index profiles_user_id_idx on public.profiles(user_id);
create index habits_user_id_idx on public.habits(user_id);
create index habit_logs_user_id_idx on public.habit_logs(user_id);
create index habit_logs_habit_id_idx on public.habit_logs(habit_id);
create index quit_habits_user_id_idx on public.quit_habits(user_id);
create index quit_habit_logs_user_id_idx on public.quit_habit_logs(user_id);
create index quit_habit_logs_quit_habit_id_idx on public.quit_habit_logs(quit_habit_id);
create index finance_transactions_user_id_date_idx on public.finance_transactions(user_id, transaction_date desc);
create index budgets_user_id_idx on public.budgets(user_id);
create index debts_user_id_idx on public.debts(user_id);
create index receivables_user_id_idx on public.receivables(user_id);
create index health_logs_user_id_date_idx on public.health_logs(user_id, log_date desc);
create index sleep_logs_user_id_date_idx on public.sleep_logs(user_id, sleep_date desc);
create index journal_entries_user_id_date_idx on public.journal_entries(user_id, entry_date desc);
create index guardians_user_id_idx on public.guardians(user_id);
create index guardians_guardian_user_id_idx on public.guardians(guardian_user_id);
create index guardian_permissions_owner_idx on public.guardian_permissions(owner_user_id);
create index guardian_permissions_guardian_idx on public.guardian_permissions(guardian_user_id);
create index tasks_user_id_due_date_idx on public.tasks(user_id, due_date);

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger habits_set_updated_at before update on public.habits for each row execute function public.set_updated_at();
create trigger habit_logs_set_updated_at before update on public.habit_logs for each row execute function public.set_updated_at();
create trigger quit_habits_set_updated_at before update on public.quit_habits for each row execute function public.set_updated_at();
create trigger quit_habit_logs_set_updated_at before update on public.quit_habit_logs for each row execute function public.set_updated_at();
create trigger finance_transactions_set_updated_at before update on public.finance_transactions for each row execute function public.set_updated_at();
create trigger budgets_set_updated_at before update on public.budgets for each row execute function public.set_updated_at();
create trigger debts_set_updated_at before update on public.debts for each row execute function public.set_updated_at();
create trigger receivables_set_updated_at before update on public.receivables for each row execute function public.set_updated_at();
create trigger health_logs_set_updated_at before update on public.health_logs for each row execute function public.set_updated_at();
create trigger sleep_logs_set_updated_at before update on public.sleep_logs for each row execute function public.set_updated_at();
create trigger journal_entries_set_updated_at before update on public.journal_entries for each row execute function public.set_updated_at();
create trigger guardians_set_updated_at before update on public.guardians for each row execute function public.set_updated_at();
create trigger guardian_permissions_set_updated_at before update on public.guardian_permissions for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.quit_habits enable row level security;
alter table public.quit_habit_logs enable row level security;
alter table public.finance_transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.debts enable row level security;
alter table public.receivables enable row level security;
alter table public.health_logs enable row level security;
alter table public.sleep_logs enable row level security;
alter table public.journal_entries enable row level security;
alter table public.guardians enable row level security;
alter table public.guardian_permissions enable row level security;
alter table public.tasks enable row level security;

create policy "Users can read their profile or connected guardian profiles"
on public.profiles for select
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.guardian_permissions gp
    where gp.owner_user_id = profiles.user_id
      and gp.guardian_user_id = auth.uid()
      and gp.can_read = true
      and gp.approved_at is not null
  )
);

create policy "Users can insert their profile"
on public.profiles for insert
with check (auth.uid() = user_id);

create policy "Users can update their profile"
on public.profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their profile"
on public.profiles for delete
using (auth.uid() = user_id);

create policy "Users can read their habits or shared habits"
on public.habits for select
using (auth.uid() = user_id or public.is_approved_guardian(user_id, 'habits'));

create policy "Users can insert their habits"
on public.habits for insert
with check (auth.uid() = user_id);

create policy "Users can update their habits"
on public.habits for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their habits"
on public.habits for delete
using (auth.uid() = user_id);

create policy "Users can read their habit logs or shared habit logs"
on public.habit_logs for select
using (auth.uid() = user_id or public.is_approved_guardian(user_id, 'habits'));

create policy "Users can insert their habit logs"
on public.habit_logs for insert
with check (auth.uid() = user_id);

create policy "Users can update their habit logs"
on public.habit_logs for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their habit logs"
on public.habit_logs for delete
using (auth.uid() = user_id);

create policy "Users can read their quit habits or shared quit habits"
on public.quit_habits for select
using (auth.uid() = user_id or public.is_approved_guardian(user_id, 'quit_habits'));

create policy "Users can insert their quit habits"
on public.quit_habits for insert
with check (auth.uid() = user_id);

create policy "Users can update their quit habits"
on public.quit_habits for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their quit habits"
on public.quit_habits for delete
using (auth.uid() = user_id);

create policy "Users can read their quit habit logs or shared quit habit logs"
on public.quit_habit_logs for select
using (auth.uid() = user_id or public.is_approved_guardian(user_id, 'quit_habits'));

create policy "Users can insert their quit habit logs"
on public.quit_habit_logs for insert
with check (auth.uid() = user_id);

create policy "Users can update their quit habit logs"
on public.quit_habit_logs for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their quit habit logs"
on public.quit_habit_logs for delete
using (auth.uid() = user_id);

create policy "Users can read their finance transactions"
on public.finance_transactions for select
using (auth.uid() = user_id);

create policy "Users can insert their finance transactions"
on public.finance_transactions for insert
with check (auth.uid() = user_id);

create policy "Users can update their finance transactions"
on public.finance_transactions for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their finance transactions"
on public.finance_transactions for delete
using (auth.uid() = user_id);

create policy "Users can read their budgets or shared finance"
on public.budgets for select
using (auth.uid() = user_id or public.is_approved_guardian(user_id, 'finance'));

create policy "Users can insert their budgets"
on public.budgets for insert
with check (auth.uid() = user_id);

create policy "Users can update their budgets"
on public.budgets for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their budgets"
on public.budgets for delete
using (auth.uid() = user_id);

create policy "Users can read their debts or shared finance"
on public.debts for select
using (auth.uid() = user_id or public.is_approved_guardian(user_id, 'finance'));

create policy "Users can insert their debts"
on public.debts for insert
with check (auth.uid() = user_id);

create policy "Users can update their debts"
on public.debts for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their debts"
on public.debts for delete
using (auth.uid() = user_id);

create policy "Users can read their receivables or shared finance"
on public.receivables for select
using (auth.uid() = user_id or public.is_approved_guardian(user_id, 'finance'));

create policy "Users can insert their receivables"
on public.receivables for insert
with check (auth.uid() = user_id);

create policy "Users can update their receivables"
on public.receivables for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their receivables"
on public.receivables for delete
using (auth.uid() = user_id);

create policy "Users can read their health logs or shared health"
on public.health_logs for select
using (auth.uid() = user_id or public.is_approved_guardian(user_id, 'health'));

create policy "Users can insert their health logs"
on public.health_logs for insert
with check (auth.uid() = user_id);

create policy "Users can update their health logs"
on public.health_logs for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their health logs"
on public.health_logs for delete
using (auth.uid() = user_id);

create policy "Users can read their sleep logs or shared sleep"
on public.sleep_logs for select
using (auth.uid() = user_id or public.is_approved_guardian(user_id, 'sleep'));

create policy "Users can insert their sleep logs"
on public.sleep_logs for insert
with check (auth.uid() = user_id);

create policy "Users can update their sleep logs"
on public.sleep_logs for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their sleep logs"
on public.sleep_logs for delete
using (auth.uid() = user_id);

create policy "Users can read their journal entries or shared non-private journal entries"
on public.journal_entries for select
using (
  auth.uid() = user_id
  or (is_private = false and public.is_approved_guardian(user_id, 'journal'))
);

create policy "Users can insert their journal entries"
on public.journal_entries for insert
with check (auth.uid() = user_id);

create policy "Users can update their journal entries"
on public.journal_entries for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their journal entries"
on public.journal_entries for delete
using (auth.uid() = user_id);

create policy "Users can read their guardians or guardian invitations"
on public.guardians for select
using (auth.uid() = user_id or auth.uid() = guardian_user_id);

create policy "Invited guardians can read invitations by email"
on public.guardians for select
using (lower(guardian_email) = lower(auth.jwt() ->> 'email'));

create policy "Users can insert their guardians"
on public.guardians for insert
with check (auth.uid() = user_id);

create policy "Users can update their guardians"
on public.guardians for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Invited guardians can claim pending invitations"
on public.guardians for update
using (
  status = 'pending'
  and lower(guardian_email) = lower(auth.jwt() ->> 'email')
)
with check (
  status = 'pending'
  and lower(guardian_email) = lower(auth.jwt() ->> 'email')
  and guardian_user_id = auth.uid()
);

create policy "Users can delete their guardians"
on public.guardians for delete
using (auth.uid() = user_id);

create policy "Users can read their guardian permissions"
on public.guardian_permissions for select
using (auth.uid() = owner_user_id or auth.uid() = guardian_user_id);

create policy "Users can insert guardian permissions they own"
on public.guardian_permissions for insert
with check (auth.uid() = owner_user_id and user_id = owner_user_id);

create policy "Users can update guardian permissions they own"
on public.guardian_permissions for update
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id and user_id = owner_user_id);

create policy "Users can delete guardian permissions they own"
on public.guardian_permissions for delete
using (auth.uid() = owner_user_id);

create policy "Users can read their tasks or shared tasks"
on public.tasks for select
using (auth.uid() = user_id or public.is_approved_guardian(user_id, 'tasks'));

create policy "Users can insert their tasks"
on public.tasks for insert
with check (auth.uid() = user_id);

create policy "Users can update their tasks"
on public.tasks for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their tasks"
on public.tasks for delete
using (auth.uid() = user_id);

create or replace function public.get_guardian_finance_summary(
  owner_id uuid,
  month_start date,
  month_end date
)
returns table (
  monthly_expenses numeric,
  budget_total numeric,
  overspending numeric,
  avoidable_spending numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with allowed as (
    select exists (
      select 1
      from public.guardian_permissions gp
      where gp.owner_user_id = owner_id
        and gp.guardian_user_id = auth.uid()
        and gp.section = 'finance'
        and gp.can_read = true
        and gp.approved_at is not null
    ) as can_read
  ),
  expenses as (
    select
      coalesce(sum(amount) filter (where type in ('fixed_expense', 'variable_expense', 'avoidable_expense')), 0) as total_expense,
      coalesce(sum(amount) filter (where type = 'avoidable_expense'), 0) as avoidable_total
    from public.finance_transactions
    where user_id = owner_id
      and transaction_date between month_start and month_end
  ),
  budget as (
    select coalesce(sum(amount), 0) as total_budget
    from public.budgets
    where user_id = owner_id
      and period = 'monthly'
  )
  select
    case when allowed.can_read then expenses.total_expense else 0 end as monthly_expenses,
    case when allowed.can_read then budget.total_budget else 0 end as budget_total,
    case when allowed.can_read then greatest(expenses.total_expense - budget.total_budget, 0) else 0 end as overspending,
    case when allowed.can_read then expenses.avoidable_total else 0 end as avoidable_spending
  from allowed, expenses, budget;
$$;
