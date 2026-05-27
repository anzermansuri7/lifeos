drop policy if exists "Users can read their profile or shared profiles" on public.profiles;
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

drop policy if exists "Users can read their finance transactions or shared finance" on public.finance_transactions;
create policy "Users can read their finance transactions"
on public.finance_transactions for select
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
