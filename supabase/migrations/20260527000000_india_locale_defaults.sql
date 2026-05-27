alter table public.profiles
  alter column timezone set default 'Asia/Kolkata';

update public.profiles
set timezone = 'Asia/Kolkata'
where timezone is null or timezone in ('UTC', 'Asia/Calcutta');
