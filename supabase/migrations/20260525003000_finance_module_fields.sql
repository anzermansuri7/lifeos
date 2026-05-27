alter table public.finance_transactions
  add column if not exists payment_method text,
  add column if not exists need_or_want text not null default 'need',
  add column if not exists notes text;

update public.finance_transactions
set type = 'variable_expense'
where type = 'expense';

alter table public.finance_transactions
  drop constraint if exists finance_transactions_type_check,
  add constraint finance_transactions_type_check
    check (type in ('income', 'fixed_expense', 'variable_expense', 'avoidable_expense'));

alter table public.finance_transactions
  drop constraint if exists finance_transactions_need_or_want_check,
  add constraint finance_transactions_need_or_want_check
    check (need_or_want in ('need', 'want'));

alter table public.debts
  add column if not exists debt_type text not null default 'other',
  add column if not exists emi_amount numeric(12, 2) not null default 0 check (emi_amount >= 0),
  add column if not exists credit_limit numeric(12, 2) check (credit_limit >= 0),
  add column if not exists due_date date,
  add column if not exists status text not null default 'active';

alter table public.debts
  drop constraint if exists debts_debt_type_check,
  add constraint debts_debt_type_check
    check (debt_type in ('loan', 'emi', 'credit_card', 'other'));

alter table public.debts
  drop constraint if exists debts_status_check,
  add constraint debts_status_check
    check (status in ('active', 'paid', 'closed'));
