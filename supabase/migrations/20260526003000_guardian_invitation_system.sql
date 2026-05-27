alter table public.guardians
  add column if not exists permission_sections text[] not null default '{}';

alter table public.guardians
  drop constraint if exists guardians_permission_sections_check,
  add constraint guardians_permission_sections_check
    check (
      permission_sections <@ array[
        'habits',
        'finance',
        'sleep',
        'health',
        'journal'
      ]::text[]
    );

drop policy if exists "Invited guardians can read invitations by email" on public.guardians;
create policy "Invited guardians can read invitations by email"
on public.guardians for select
using (lower(guardian_email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "Invited guardians can claim pending invitations" on public.guardians;
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
