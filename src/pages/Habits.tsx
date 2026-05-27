import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Banknote, Check, Clock, Edit3, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import SectionCard from '../components/SectionCard'
import { getCurrentUser, supabase } from '../lib/supabaseClient'
import { cn } from '../utils/cn'
import { formatMoney } from '../utils/format'
import { defaultHabitCategories, habitCategoryPreferenceKey, readStringList } from '../utils/preferences'

type Habit = {
  id: string
  user_id: string
  name: string
  description: string | null
  category: string
  frequency: 'daily' | 'weekly' | 'custom'
  custom_schedule: string | null
  target_count: number
  priority: 'low' | 'medium' | 'high'
  is_active: boolean
  created_at: string
}

type HabitLog = {
  id: string
  habit_id: string
  log_date: string
  status: 'done' | 'skipped' | 'failed' | 'partial'
  count: number
}

type QuitHabit = {
  id: string
  user_id: string
  name: string
  category: string
  reason: string | null
  start_date: string
  money_saved_per_day: number
  time_saved_minutes_per_day: number
  notes: string | null
  is_active: boolean
  created_at: string
}

type QuitHabitLog = {
  id: string
  quit_habit_id: string
  log_date: string
  avoided: boolean
  urge_count: number
  relapsed: boolean
  trigger: string | null
  money_saved: number
  time_saved_minutes: number
  note: string | null
}

type HabitForm = {
  name: string
  description: string
  category: string
  frequency: Habit['frequency']
  custom_schedule: string
  target_count: string
  priority: Habit['priority']
}

type QuitHabitForm = {
  name: string
  category: string
  reason: string
  money_saved_per_day: string
  time_saved_minutes_per_day: string
  notes: string
}

const defaultForm: HabitForm = {
  name: '',
  description: '',
  category: 'General',
  frequency: 'daily',
  custom_schedule: '',
  target_count: '1',
  priority: 'medium',
}

const defaultQuitForm: QuitHabitForm = {
  name: '',
  category: 'General',
  reason: '',
  money_saved_per_day: '0',
  time_saved_minutes_per_day: '0',
  notes: '',
}

const statuses: HabitLog['status'][] = ['done', 'partial', 'skipped', 'failed']
const quitExamples = ['Junk food', 'Late-night scrolling', 'Overspending', 'Smoking', 'Wasting time']

const statusStyles = {
  done: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300',
  partial: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300',
  skipped: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
  failed: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300',
}

function getLocalDate(date = new Date()) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return offsetDate.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

function getLastSevenDates() {
  return Array.from({ length: 7 }, (_, index) => getLocalDate(addDays(new Date(), index - 6)))
}

function getLookbackDate(days: number) {
  return getLocalDate(addDays(new Date(), -days))
}

function calculateStreak(habitId: string, logs: HabitLog[]) {
  const completedDates = new Set(logs.filter((log) => log.habit_id === habitId && ['done', 'partial'].includes(log.status)).map((log) => log.log_date))
  let streak = 0
  let cursor = new Date()

  while (completedDates.has(getLocalDate(cursor))) {
    streak += 1
    cursor = addDays(cursor, -1)
  }

  return streak
}

function calculateRecoveryStreak(quitHabit: QuitHabit, logs: QuitHabitLog[]) {
  const logsByDate = new Map(logs.filter((log) => log.quit_habit_id === quitHabit.id).map((log) => [log.log_date, log]))
  let streak = 0
  let cursor = new Date()
  const startDate = new Date(`${quitHabit.start_date}T00:00:00`)

  while (cursor >= startDate) {
    const dateKey = getLocalDate(cursor)
    const log = logsByDate.get(dateKey)

    if (log?.relapsed) {
      break
    }

    streak += 1
    cursor = addDays(cursor, -1)
  }

  return streak
}

function getTodayLog(habitId: string, logs: HabitLog[]) {
  return logs.find((log) => log.habit_id === habitId && log.log_date === getLocalDate())
}

function getTodayQuitLog(quitHabitId: string, logs: QuitHabitLog[]) {
  return logs.find((log) => log.quit_habit_id === quitHabitId && log.log_date === getLocalDate())
}

function formatMinutes(minutes: number) {
  if (minutes < 60) {
    return `${minutes}m`
  }

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

export default function Habits() {
  const [activeTab, setActiveTab] = useState<'build' | 'quit'>('build')
  const [userId, setUserId] = useState('')
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<HabitLog[]>([])
  const [quitHabits, setQuitHabits] = useState<QuitHabit[]>([])
  const [quitLogs, setQuitLogs] = useState<QuitHabitLog[]>([])
  const [form, setForm] = useState<HabitForm>(defaultForm)
  const [quitForm, setQuitForm] = useState<QuitHabitForm>(defaultQuitForm)
  const [habitCategoryOptions] = useState(() => readStringList(habitCategoryPreferenceKey, defaultHabitCategories))
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null)
  const [editingQuitHabitId, setEditingQuitHabitId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showQuitForm, setShowQuitForm] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const lastSevenDates = useMemo(() => getLastSevenDates(), [])

  async function loadHabits() {
    setError('')
    const user = await getCurrentUser()

    if (!user) {
      setIsLoading(false)
      return
    }

    setUserId(user.id)

    const [habitsResult, logsResult, quitHabitsResult, quitLogsResult] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: true }),
      supabase.from('habit_logs').select('id, habit_id, log_date, status, count').eq('user_id', user.id).gte('log_date', getLookbackDate(90)),
      supabase.from('quit_habits').select('*').eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: true }),
      supabase.from('quit_habit_logs').select('*').eq('user_id', user.id).gte('log_date', getLookbackDate(90)),
    ])

    const queryError = habitsResult.error || logsResult.error || quitHabitsResult.error || quitLogsResult.error

    if (queryError) {
      throw queryError
    }

    setHabits((habitsResult.data ?? []).map((habit) => ({ ...habit, target_count: Number(habit.target_count ?? 1) })))
    setLogs((logsResult.data ?? []).map((log) => ({ ...log, count: Number(log.count ?? 0) })))
    setQuitHabits((quitHabitsResult.data ?? []).map((habit) => ({
      ...habit,
      money_saved_per_day: Number(habit.money_saved_per_day ?? 0),
    })))
    setQuitLogs((quitLogsResult.data ?? []).map((log) => ({
      ...log,
      money_saved: Number(log.money_saved ?? 0),
    })))
    setIsLoading(false)
  }

  useEffect(() => {
    loadHabits().catch((error) => {
      setError(error instanceof Error ? error.message : 'Unable to load habits.')
      setIsLoading(false)
    })
  }, [])

  function resetForm() {
    setForm(defaultForm)
    setEditingHabitId(null)
    setShowForm(false)
  }

  function resetQuitForm() {
    setQuitForm(defaultQuitForm)
    setEditingQuitHabitId(null)
    setShowQuitForm(false)
  }

  function editHabit(habit: Habit) {
    setForm({
      name: habit.name,
      description: habit.description ?? '',
      category: habit.category,
      frequency: habit.frequency,
      custom_schedule: habit.custom_schedule ?? '',
      target_count: String(habit.target_count ?? 1),
      priority: habit.priority,
    })
    setEditingHabitId(habit.id)
    setShowForm(true)
  }

  function editQuitHabit(habit: QuitHabit) {
    setQuitForm({
      name: habit.name,
      category: habit.category,
      reason: habit.reason ?? '',
      money_saved_per_day: String(habit.money_saved_per_day ?? 0),
      time_saved_minutes_per_day: String(habit.time_saved_minutes_per_day ?? 0),
      notes: habit.notes ?? '',
    })
    setEditingQuitHabitId(habit.id)
    setShowQuitForm(true)
  }

  async function saveHabit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const targetCount = Math.max(1, Math.floor(Number(form.target_count || 1)))

    if (!userId || !form.name.trim()) {
      setError('Habit name is required.')
      return
    }

    setIsSaving(true)
    setError('')

    const payload = {
      user_id: userId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category.trim() || 'General',
      frequency: form.frequency,
      custom_schedule: form.frequency === 'custom' ? form.custom_schedule.trim() || null : null,
      target_count: targetCount,
      priority: form.priority,
    }

    const result = editingHabitId ? await supabase.from('habits').update(payload).eq('id', editingHabitId).eq('user_id', userId) : await supabase.from('habits').insert(payload)

    if (result.error) {
      setError(result.error.message)
      setIsSaving(false)
      return
    }

    resetForm()
    await loadHabits()
    setIsSaving(false)
  }

  async function saveQuitHabit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!userId || !quitForm.name.trim()) {
      setError('Quit habit name is required.')
      return
    }

    setIsSaving(true)
    setError('')

    const payload = {
      user_id: userId,
      name: quitForm.name.trim(),
      category: quitForm.category.trim() || 'General',
      reason: quitForm.reason.trim() || null,
      money_saved_per_day: Number(quitForm.money_saved_per_day || 0),
      time_saved_minutes_per_day: Number(quitForm.time_saved_minutes_per_day || 0),
      notes: quitForm.notes.trim() || null,
    }

    const result = editingQuitHabitId
      ? await supabase.from('quit_habits').update(payload).eq('id', editingQuitHabitId).eq('user_id', userId)
      : await supabase.from('quit_habits').insert({ ...payload, start_date: getLocalDate() })

    if (result.error) {
      setError(result.error.message)
      setIsSaving(false)
      return
    }

    resetQuitForm()
    await loadHabits()
    setIsSaving(false)
  }

  async function deleteHabit(habitId: string) {
    if (!window.confirm('Delete this habit and its logs?')) {
      return
    }

    const result = await supabase.from('habits').delete().eq('id', habitId).eq('user_id', userId)

    if (result.error) {
      setError(result.error.message)
      return
    }

    await loadHabits()
  }

  async function deleteQuitHabit(habitId: string) {
    if (!window.confirm('Delete this quit habit and its logs?')) {
      return
    }

    const result = await supabase.from('quit_habits').delete().eq('id', habitId).eq('user_id', userId)

    if (result.error) {
      setError(result.error.message)
      return
    }

    await loadHabits()
  }

  async function logHabit(habit: Habit, status: HabitLog['status']) {
    const targetCount = Math.max(1, Number(habit.target_count ?? 1))
    const count = status === 'done' ? targetCount : status === 'partial' ? Math.max(1, Math.ceil(targetCount / 2)) : 0

    const result = await supabase.from('habit_logs').upsert(
      { user_id: userId, habit_id: habit.id, log_date: getLocalDate(), status, count },
      { onConflict: 'habit_id,log_date' },
    )

    if (result.error) {
      setError(result.error.message)
      return
    }

    await loadHabits()
  }

  async function logQuitHabit(quitHabit: QuitHabit, values: Partial<QuitHabitLog>) {
    const existing = getTodayQuitLog(quitHabit.id, quitLogs)
    const relapsed = values.relapsed ?? existing?.relapsed ?? false
    const avoided = values.avoided ?? !relapsed
    const moneySaved = values.money_saved ?? (relapsed ? 0 : quitHabit.money_saved_per_day)
    const timeSaved = values.time_saved_minutes ?? (relapsed ? 0 : quitHabit.time_saved_minutes_per_day)

    const result = await supabase.from('quit_habit_logs').upsert(
      {
        user_id: userId,
        quit_habit_id: quitHabit.id,
        log_date: getLocalDate(),
        avoided,
        relapsed,
        urge_count: values.urge_count ?? existing?.urge_count ?? 0,
        trigger: values.trigger ?? existing?.trigger ?? null,
        money_saved: moneySaved,
        time_saved_minutes: timeSaved,
        note: values.note ?? existing?.note ?? null,
      },
      { onConflict: 'quit_habit_id,log_date' },
    )

    if (result.error) {
      setError(result.error.message)
      return
    }

    await loadHabits()
  }

  const weeklyLogs = logs.filter((log) => log.log_date >= lastSevenDates[0])
  const completedToday = habits.filter((habit) => ['done', 'partial'].includes(getTodayLog(habit.id, logs)?.status ?? '')).length
  const weeklyTotals = weeklyLogs.reduce((totals, log) => {
    totals[log.status] += 1
    return totals
  }, { done: 0, partial: 0, skipped: 0, failed: 0 })
  const quitTotals = quitLogs.reduce(
    (totals, log) => {
      totals.urges += log.urge_count
      totals.relapses += log.relapsed ? 1 : 0
      totals.money += log.money_saved
      totals.minutes += log.time_saved_minutes
      return totals
    },
    { urges: 0, relapses: 0, money: 0, minutes: 0 },
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Habits"
        description="Build useful habits and manually track the habits you are quitting."
        action={
          <button
            type="button"
            onClick={() => {
              if (activeTab === 'quit') {
                setShowQuitForm(true)
                setEditingQuitHabitId(null)
                setQuitForm(defaultQuitForm)
              } else {
                setShowForm(true)
                setEditingHabitId(null)
                setForm(defaultForm)
              }
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-neutral-950"
          >
            <Plus className="size-4" aria-hidden="true" />
            {activeTab === 'quit' ? 'New quit habit' : 'New habit'}
          </button>
        }
      />

      <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900">
        {[
          ['build', 'Build habits'],
          ['quit', 'Quit habits'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setActiveTab(value as 'build' | 'quit')}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium transition',
              activeTab === value ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950' : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">{error}</div> : null}

      {activeTab === 'build' ? (
        <>
          {showForm ? (
            <SectionCard title={editingHabitId ? 'Edit habit' : 'Create habit'}>
              <form onSubmit={saveHabit} className="grid gap-4 lg:grid-cols-2">
                <Input label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} placeholder="Morning walk" required />
                <Input label="Category" value={form.category} onChange={(value) => setForm({ ...form, category: value })} placeholder="Health" suggestions={habitCategoryOptions} />
                <Select label="Frequency" value={form.frequency} onChange={(value) => setForm({ ...form, frequency: value as Habit['frequency'] })} options={['daily', 'weekly', 'custom']} />
                <Input label="Target quantity" type="number" value={form.target_count} onChange={(value) => setForm({ ...form, target_count: value })} placeholder="1" required />
                <Select label="Priority" value={form.priority} onChange={(value) => setForm({ ...form, priority: value as Habit['priority'] })} options={['low', 'medium', 'high']} />
                {form.frequency === 'custom' ? <Input label="Custom schedule" value={form.custom_schedule} onChange={(value) => setForm({ ...form, custom_schedule: value })} placeholder="Mon, Wed, Fri or 3x/week" className="lg:col-span-2" /> : null}
                <Textarea label="Description" value={form.description} onChange={(value) => setForm({ ...form, description: value })} placeholder="What does success look like?" className="lg:col-span-2" />
                <FormActions isSaving={isSaving} onCancel={resetForm} />
              </form>
            </SectionCard>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <SectionCard title="Today's habit checklist">
              {isLoading ? <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading habits...</p> : null}
              {!isLoading && habits.length ? (
                <div className="space-y-3">
                  {habits.map((habit) => {
                    const todayLog = getTodayLog(habit.id, logs)
                    const streak = calculateStreak(habit.id, logs)
                    return (
                      <article key={habit.id} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-base font-semibold text-neutral-950 dark:text-white">{habit.name}</h2>
                              <Tag>{habit.category}</Tag>
                              <Tag>{habit.priority}</Tag>
                            </div>
                            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{habit.frequency === 'custom' ? habit.custom_schedule || 'Custom schedule' : habit.frequency} - target {habit.target_count}/day - {streak} day streak</p>
                            {habit.description ? <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">{habit.description}</p> : null}
                          </div>
                          <IconButtons onEdit={() => editHabit(habit)} onDelete={() => deleteHabit(habit.id)} label={habit.name} />
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {statuses.map((status) => (
                            <button key={status} type="button" onClick={() => logHabit(habit, status)} className={cn('rounded-lg border px-3 py-2 text-sm font-medium capitalize transition', todayLog?.status === status ? statusStyles[status] : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800')}>
                              {status}
                            </button>
                          ))}
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : null}
              {!isLoading && !habits.length ? <EmptyState title="No habits yet" body="Create your first habit to start today's checklist." /> : null}
            </SectionCard>

            <div className="space-y-6">
              <SectionCard title="Today">
                <div className="grid grid-cols-2 gap-3">
                  <Metric value={`${completedToday}/${habits.length}`} label="completed" />
                  <Metric value={String(habits.length - completedToday)} label="pending" />
                </div>
              </SectionCard>
              <SectionCard title="Weekly habit summary">
                <div className="grid grid-cols-2 gap-3">
                  {statuses.map((status) => <div key={status} className={cn('rounded-lg border p-3 text-center', statusStyles[status])}><p className="text-xl font-semibold">{weeklyTotals[status]}</p><p className="mt-1 text-xs capitalize">{status}</p></div>)}
                </div>
              </SectionCard>
            </div>
          </div>
        </>
      ) : (
        <>
          {showQuitForm ? (
            <SectionCard title={editingQuitHabitId ? 'Edit quit habit' : 'Add bad habit to quit'}>
              <form onSubmit={saveQuitHabit} className="grid gap-4 lg:grid-cols-2">
                <Input label="Habit to quit" value={quitForm.name} onChange={(value) => setQuitForm({ ...quitForm, name: value })} placeholder="Late-night scrolling" required />
                <Input label="Category" value={quitForm.category} onChange={(value) => setQuitForm({ ...quitForm, category: value })} placeholder="Digital" suggestions={habitCategoryOptions} />
                <Input label="Money saved per clean day" type="number" value={quitForm.money_saved_per_day} onChange={(value) => setQuitForm({ ...quitForm, money_saved_per_day: value })} placeholder="0" />
                <Input label="Time saved per clean day, minutes" type="number" value={quitForm.time_saved_minutes_per_day} onChange={(value) => setQuitForm({ ...quitForm, time_saved_minutes_per_day: value })} placeholder="30" />
                <Textarea label="Reason" value={quitForm.reason} onChange={(value) => setQuitForm({ ...quitForm, reason: value })} placeholder="Why are you quitting this?" className="lg:col-span-2" />
                <Textarea label="Notes" value={quitForm.notes} onChange={(value) => setQuitForm({ ...quitForm, notes: value })} placeholder="Rules, replacement behavior, or reminders." className="lg:col-span-2" />
                <FormActions isSaving={isSaving} onCancel={resetQuitForm} />
              </form>
            </SectionCard>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <SectionCard title="Quit habits">
              {isLoading ? <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading quit habits...</p> : null}
              {!isLoading && quitHabits.length ? (
                <div className="space-y-3">
                  {quitHabits.map((habit) => {
                    const todayLog = getTodayQuitLog(habit.id, quitLogs)
                    const streak = calculateRecoveryStreak(habit, quitLogs)
                    const habitLogs = quitLogs.filter((log) => log.quit_habit_id === habit.id)
                    const moneySaved = habitLogs.reduce((total, log) => total + log.money_saved, 0)
                    const timeSaved = habitLogs.reduce((total, log) => total + log.time_saved_minutes, 0)

                    return (
                      <article key={habit.id} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-base font-semibold text-neutral-950 dark:text-white">{habit.name}</h2>
                              <Tag>{habit.category}</Tag>
                              <Tag>{streak} day recovery streak</Tag>
                            </div>
                            {habit.reason ? <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">{habit.reason}</p> : null}
                          </div>
                          <IconButtons onEdit={() => editQuitHabit(habit)} onDelete={() => deleteQuitHabit(habit.id)} label={habit.name} />
                        </div>

                        <div className="mt-4 grid gap-2 sm:grid-cols-3">
                          <button type="button" onClick={() => logQuitHabit(habit, { avoided: true, relapsed: false })} className={cn('rounded-lg border px-3 py-2 text-sm font-medium', todayLog && !todayLog.relapsed ? statusStyles.done : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800')}>Clean day</button>
                          <button type="button" onClick={() => logQuitHabit(habit, { urge_count: (todayLog?.urge_count ?? 0) + 1 })} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800">Track urge {todayLog?.urge_count ? `(${todayLog.urge_count})` : ''}</button>
                          <button type="button" onClick={() => logQuitHabit(habit, { avoided: false, relapsed: true, money_saved: 0, time_saved_minutes: 0 })} className={cn('rounded-lg border px-3 py-2 text-sm font-medium', todayLog?.relapsed ? statusStyles.failed : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800')}>Relapse</button>
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <input
                            defaultValue={todayLog?.trigger ?? ''}
                            onBlur={(event) => logQuitHabit(habit, { trigger: event.target.value.trim() || null })}
                            className="rounded-lg border border-neutral-200 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-neutral-400 dark:border-neutral-800"
                            placeholder="Trigger, e.g. boredom"
                          />
                          <input
                            defaultValue={todayLog?.note ?? ''}
                            onBlur={(event) => logQuitHabit(habit, { note: event.target.value.trim() || null })}
                            className="rounded-lg border border-neutral-200 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-neutral-400 dark:border-neutral-800"
                            placeholder="Note"
                          />
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <Metric value={String(streak)} label="streak" />
                          <Metric value={String(habitLogs.reduce((total, log) => total + log.urge_count, 0))} label="urges" />
                          <Metric value={formatMoney(moneySaved)} label="saved" />
                          <Metric value={formatMinutes(timeSaved)} label="time" />
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : null}
              {!isLoading && !quitHabits.length ? <EmptyState title="No quit habits yet" body="Add a bad habit like junk food, late-night scrolling, overspending, smoking, or wasting time." /> : null}
            </SectionCard>

            <div className="space-y-6">
              <SectionCard title="Manual report">
                <div className="grid grid-cols-2 gap-3">
                  <Metric value={String(quitTotals.urges)} label="urges" icon={<AlertTriangle className="size-4" />} />
                  <Metric value={String(quitTotals.relapses)} label="relapses" icon={<RotateCcw className="size-4" />} />
                  <Metric value={formatMoney(quitTotals.money)} label="money saved" icon={<Banknote className="size-4" />} />
                  <Metric value={formatMinutes(quitTotals.minutes)} label="time saved" icon={<Clock className="size-4" />} />
                </div>
              </SectionCard>

              <SectionCard title="Examples">
                <div className="flex flex-wrap gap-2">
                  {quitExamples.map((example) => (
                    <button key={example} type="button" onClick={() => { setActiveTab('quit'); setShowQuitForm(true); setQuitForm({ ...defaultQuitForm, name: example }) }} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800">
                      {example}
                    </button>
                  ))}
                </div>
              </SectionCard>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Input({ label, value, onChange, placeholder, type = 'text', required = false, className, suggestions }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; required?: boolean; className?: string; suggestions?: string[] }) {
  const listId = suggestions?.length ? `${label.toLowerCase().replaceAll(' ', '-')}-options` : undefined

  return (
    <label className={cn('block', className)}>
      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} list={listId} className="mt-2 w-full rounded-lg border border-neutral-200 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-neutral-400 dark:border-neutral-800" placeholder={placeholder} required={required} min={type === 'number' ? 0 : undefined} />
      {listId ? (
        <datalist id={listId}>
          {suggestions?.map((option) => <option key={option} value={option} />)}
        </datalist>
      ) : null}
    </label>
  )
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm capitalize outline-none focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}

function Textarea({ label, value, onChange, placeholder, className }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-24 w-full resize-none rounded-lg border border-neutral-200 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-neutral-400 dark:border-neutral-800" placeholder={placeholder} />
    </label>
  )
}

function FormActions({ isSaving, onCancel }: { isSaving: boolean; onCancel: () => void }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row lg:col-span-2">
      <button type="submit" disabled={isSaving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70 dark:bg-white dark:text-neutral-950"><Check className="size-4" aria-hidden="true" />{isSaving ? 'Saving...' : 'Save'}</button>
      <button type="button" onClick={onCancel} className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-700 dark:border-neutral-800 dark:text-neutral-200"><X className="size-4" aria-hidden="true" />Cancel</button>
    </div>
  )
}

function IconButtons({ onEdit, onDelete, label }: { onEdit: () => void; onDelete: () => void; label: string }) {
  return (
    <div className="flex gap-2">
      <button type="button" onClick={onEdit} className="grid size-9 place-items-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800" aria-label={`Edit ${label}`}><Edit3 className="size-4" aria-hidden="true" /></button>
      <button type="button" onClick={onDelete} className="grid size-9 place-items-center rounded-lg border border-neutral-200 text-rose-600 hover:bg-rose-50 dark:border-neutral-800 dark:text-rose-300 dark:hover:bg-rose-950/30" aria-label={`Delete ${label}`}><Trash2 className="size-4" aria-hidden="true" /></button>
    </div>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md bg-neutral-100 px-2 py-1 text-xs capitalize text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{children}</span>
}

function Metric({ value, label, icon }: { value: string; label: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-neutral-50 p-4 text-center dark:bg-neutral-800">
      <p className="flex items-center justify-center gap-2 text-xl font-semibold text-neutral-950 dark:text-white">{icon}{value}</p>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
    </div>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 p-6 text-center dark:border-neutral-700">
      <p className="font-medium text-neutral-900 dark:text-white">{title}</p>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{body}</p>
    </div>
  )
}
