-- Low-screen-time cleanup:
-- - simplify money tracking to income/expense
-- - remove postponed finance/task tables that encourage over-tracking
-- - keep guardian finance sharing as a tiny monthly expense summary

update public.finance_transactions
set type = 'expense'
where type in ('fixed_expense', 'variable_expense', 'avoidable_expense');

alter table public.finance_transactions
  drop constraint if exists finance_transactions_type_check,
  add constraint finance_transactions_type_check check (type in ('income', 'expense'));

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
    select coalesce(sum(amount) filter (where type = 'expense'), 0) as total_expense
    from public.finance_transactions
    where user_id = owner_id
      and transaction_date between month_start and month_end
  )
  select
    case when allowed.can_read then expenses.total_expense else 0 end as monthly_expenses,
    0::numeric as budget_total,
    0::numeric as overspending,
    0::numeric as avoidable_spending
  from allowed, expenses;
$$;

drop table if exists public.budgets cascade;
drop table if exists public.debts cascade;
drop table if exists public.receivables cascade;
drop table if exists public.tasks cascade;
