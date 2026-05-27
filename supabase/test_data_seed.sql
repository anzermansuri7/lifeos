-- Life OS test data seed
--
-- How to use:
-- 1. Create/login with your test user in the app first.
-- 2. In Supabase SQL Editor, replace the email values below.
-- 3. Run this file.
--
-- This inserts about one week of manual test data for:
-- profile, habits, quit habits, money, health, sleep,
-- journal, prayer, and optional guardian records.

do $$
declare
  target_email text := 'anzermansuri10@gmail.com';
  guardian_email_input text := 'guardian@example.com';
  target_user_id uuid;
  guardian_account_id uuid;
  hydration_id uuid;
  reading_id uuid;
  workout_id uuid;
  scrolling_id uuid;
  junk_food_id uuid;
  guardian_row_id uuid;
  day_offset integer;
  log_day date;
begin
  select id into target_user_id
  from auth.users
  where lower(email) = lower(target_email)
  limit 1;

  if target_user_id is null then
    raise exception 'No auth user found for %. Create this user first or update target_email.', target_email;
  end if;

  select id into guardian_account_id
  from auth.users
  where lower(email) = lower(guardian_email_input)
  limit 1;

  delete from public.journal_entries where user_id = target_user_id and title like 'Test journal%';
  delete from public.sleep_logs where user_id = target_user_id and sleep_date between current_date - 6 and current_date;
  delete from public.health_logs where user_id = target_user_id and log_date between current_date - 6 and current_date;
  delete from public.prayer_logs where user_id = target_user_id and prayer_date between current_date - 6 and current_date;
  delete from public.finance_transactions where user_id = target_user_id and transaction_date between current_date - 6 and current_date;
  delete from public.quit_habits where user_id = target_user_id and name in ('Late-night scrolling', 'Junk food');
  delete from public.habits where user_id = target_user_id and name in ('Hydration', 'Reading', 'Workout');

  insert into public.profiles (user_id, full_name, timezone)
  values (target_user_id, 'Test User', 'Asia/Kolkata')
  on conflict (user_id)
  do update set full_name = excluded.full_name, timezone = excluded.timezone;

  insert into public.habits (user_id, name, description, category, frequency, priority)
  values (target_user_id, 'Hydration', 'Drink enough water.', 'Health', 'daily', 'high')
  returning id into hydration_id;

  insert into public.habits (user_id, name, description, category, frequency, priority)
  values (target_user_id, 'Reading', 'Read for at least 20 minutes.', 'Learning', 'daily', 'medium')
  returning id into reading_id;

  insert into public.habits (user_id, name, description, category, frequency, priority)
  values (target_user_id, 'Workout', 'Strength or mobility session.', 'Health', 'custom', 'high')
  returning id into workout_id;

  for day_offset in 0..6 loop
    log_day := current_date - day_offset;

    insert into public.habit_logs (user_id, habit_id, log_date, status, count)
    values
      (target_user_id, hydration_id, log_day, case when day_offset in (2, 5) then 'partial' else 'done' end, 1),
      (target_user_id, reading_id, log_day, case when day_offset = 3 then 'skipped' else 'done' end, case when day_offset = 3 then 0 else 1 end)
    on conflict (habit_id, log_date) do update set status = excluded.status, count = excluded.count;

    if day_offset in (0, 2, 4, 6) then
      insert into public.habit_logs (user_id, habit_id, log_date, status, count)
      values (target_user_id, workout_id, log_day, 'done', 1)
      on conflict (habit_id, log_date) do update set status = excluded.status, count = excluded.count;
    end if;
  end loop;

  insert into public.quit_habits (user_id, name, category, reason, money_saved_per_day, time_saved_minutes_per_day, notes)
  values (target_user_id, 'Late-night scrolling', 'Digital', 'Protect sleep and attention.', 0, 45, 'Keep phone outside bedroom.')
  returning id into scrolling_id;

  insert into public.quit_habits (user_id, name, category, reason, money_saved_per_day, time_saved_minutes_per_day, notes)
  values (target_user_id, 'Junk food', 'Health', 'Improve energy and reduce cravings.', 8, 10, 'Replace with fruit or protein.')
  returning id into junk_food_id;

  for day_offset in 0..6 loop
    log_day := current_date - day_offset;

    insert into public.quit_habit_logs (user_id, quit_habit_id, log_date, avoided, urge_count, relapsed, trigger, money_saved, time_saved_minutes, note)
    values
      (target_user_id, scrolling_id, log_day, day_offset <> 4, day_offset + 1, day_offset = 4, case when day_offset = 4 then 'Boredom' else 'Evening fatigue' end, 0, case when day_offset = 4 then 0 else 45 end, 'Manual test log'),
      (target_user_id, junk_food_id, log_day, day_offset <> 2, 1 + (day_offset % 3), day_offset = 2, case when day_offset = 2 then 'Stress' else 'Afternoon craving' end, case when day_offset = 2 then 0 else 8 end, case when day_offset = 2 then 0 else 10 end, 'Manual test log')
    on conflict (quit_habit_id, log_date) do update
    set avoided = excluded.avoided,
        urge_count = excluded.urge_count,
        relapsed = excluded.relapsed,
        trigger = excluded.trigger,
        money_saved = excluded.money_saved,
        time_saved_minutes = excluded.time_saved_minutes,
        note = excluded.note;
  end loop;

  for day_offset in 0..6 loop
    log_day := current_date - day_offset;

    insert into public.finance_transactions (user_id, transaction_date, type, category, amount, payment_method, need_or_want, description, notes)
    values
      (target_user_id, log_day, 'income', 'Salary', case when day_offset = 6 then 2500 else 0 end, 'Bank', 'need', 'Test income', 'Seed data'),
      (target_user_id, log_day, 'expense', 'Food', 18 + day_offset, 'Card', 'need', 'Meals', 'Seed data'),
      (target_user_id, log_day, 'expense', 'Transport', 7 + day_offset, 'UPI', 'need', 'Commute', 'Seed data');
  end loop;

  for day_offset in 0..6 loop
    log_day := current_date - day_offset;

    insert into public.health_logs (
      user_id, log_date, weight_kg, waist_cm, water_glasses,
      breakfast_done, lunch_done, dinner_done, snacks_done,
      cheat_meal, craving_count, craving_note, workout_done,
      workout_type, workout_minutes, walking_minutes, steps, calories, mood, energy_level, notes
    )
    values (
      target_user_id, log_day, 78.5 - (day_offset * 0.15), 91.5 - (day_offset * 0.05), 6 + (day_offset % 3),
      true, true, day_offset <> 3, true,
      day_offset = 2, day_offset % 4, 'Test craving note', day_offset in (0, 2, 4, 6),
      case when day_offset in (0, 4) then 'Strength' else 'Walk' end, case when day_offset in (0, 2, 4, 6) then 45 else 0 end, 25 + (day_offset * 5),
      6500 + (day_offset * 400), 2100, 'steady', 7, 'Seed health log'
    )
    on conflict (user_id, log_date) do update
    set weight_kg = excluded.weight_kg,
        waist_cm = excluded.waist_cm,
        water_glasses = excluded.water_glasses,
        breakfast_done = excluded.breakfast_done,
        lunch_done = excluded.lunch_done,
        dinner_done = excluded.dinner_done,
        snacks_done = excluded.snacks_done,
        cheat_meal = excluded.cheat_meal,
        craving_count = excluded.craving_count,
        craving_note = excluded.craving_note,
        workout_done = excluded.workout_done,
        workout_type = excluded.workout_type,
        workout_minutes = excluded.workout_minutes,
        walking_minutes = excluded.walking_minutes,
        steps = excluded.steps,
        calories = excluded.calories,
        mood = excluded.mood,
        energy_level = excluded.energy_level,
        notes = excluded.notes;
  end loop;

  for day_offset in 0..6 loop
    log_day := current_date - day_offset;

    insert into public.sleep_logs (
      user_id, sleep_date, slept_at, woke_at, duration_minutes,
      quality, sleep_quality, late_phone_usage, sleep_goal_minutes, notes
    )
    values (
      target_user_id,
      log_day,
      (log_day - 1 + time '23:00')::timestamptz,
      (log_day + time '06:45' + (day_offset || ' minutes')::interval * 7)::timestamptz,
      465 + (day_offset * 7),
      case when day_offset in (1, 5) then 6 else 9 end,
      case when day_offset in (1, 5) then 'okay' else 'good' end,
      day_offset in (1, 3, 5),
      480,
      'Seed sleep log'
    )
    on conflict (user_id, sleep_date) do update
    set slept_at = excluded.slept_at,
        woke_at = excluded.woke_at,
        duration_minutes = excluded.duration_minutes,
        quality = excluded.quality,
        sleep_quality = excluded.sleep_quality,
        late_phone_usage = excluded.late_phone_usage,
        sleep_goal_minutes = excluded.sleep_goal_minutes,
        notes = excluded.notes;
  end loop;

  for day_offset in 0..6 loop
    log_day := current_date - day_offset;

    insert into public.journal_entries (
      user_id, entry_date, title, content, mood, wins, failures,
      lessons_learned, tomorrow_focus, is_private
    )
    values (
      target_user_id,
      log_day,
      'Test journal ' || log_day,
      'This is a test journal entry for Life OS modules.',
      case when day_offset in (0, 4) then 'great' when day_offset = 3 then 'low' else 'good' end,
      'Completed key habits and reviewed the day.',
      'Got distracted once and recovered.',
      'Plan the next day before opening social apps.',
      'One focused block tomorrow.',
      day_offset not in (0, 2, 5)
    )
    on conflict (user_id, entry_date) do update
    set title = excluded.title,
        content = excluded.content,
        mood = excluded.mood,
        wins = excluded.wins,
        failures = excluded.failures,
        lessons_learned = excluded.lessons_learned,
        tomorrow_focus = excluded.tomorrow_focus,
        is_private = excluded.is_private;
  end loop;

  insert into public.guardians (user_id, guardian_user_id, guardian_email, display_name, permission_sections, status)
  values (
    target_user_id,
    guardian_account_id,
    lower(guardian_email_input),
    'Test Guardian',
    array['habits', 'finance', 'sleep', 'health', 'journal']::text[],
    case when guardian_account_id is null then 'pending' else 'approved' end
  )
  on conflict (user_id, guardian_email)
  do update set
    guardian_user_id = excluded.guardian_user_id,
    display_name = excluded.display_name,
    permission_sections = excluded.permission_sections,
    status = excluded.status
  returning id into guardian_row_id;

  if guardian_account_id is not null then
    insert into public.guardian_permissions (user_id, owner_user_id, guardian_id, guardian_user_id, section, can_read, approved_at)
    select target_user_id, target_user_id, guardian_row_id, guardian_account_id, section, true, now()
    from unnest(array['habits', 'finance', 'sleep', 'health', 'journal']::text[]) as section
    on conflict (owner_user_id, guardian_user_id, section)
    do update set can_read = true, approved_at = excluded.approved_at, guardian_id = excluded.guardian_id;
  end if;
end $$;
