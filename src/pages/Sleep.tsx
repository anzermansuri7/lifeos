import { useEffect, useMemo, useState } from 'react'
import { BedDouble, Clock, Moon, Phone, Plus, Trophy } from 'lucide-react'
import type { ReactNode } from 'react'
import LogCalendar from '../components/LogCalendar'
import PageHeader from '../components/PageHeader'
import SectionCard from '../components/SectionCard'
import { getCurrentUser, supabase } from '../lib/supabaseClient'
import { cn } from '../utils/cn'

type SleepQuality = 'poor' | 'okay' | 'good'

type SleepLog = {
  id: string
  user_id: string
  sleep_date: string
  slept_at: string | null
  woke_at: string | null
  duration_minutes: number | null
  sleep_quality: SleepQuality | null
  late_phone_usage: boolean
  sleep_goal_minutes: number
  notes: string | null
}

const defaultForm = {
  sleep_date: getLocalDate(),
  sleep_time: '23:00',
  wake_time: '07:00',
  sleep_quality: 'okay' as SleepQuality,
  late_phone_usage: false,
  sleep_goal_hours: '8',
  notes: '',
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

function minutesToLabel(minutes: number | null | undefined) {
  if (!minutes) {
    return 'No log'
  }

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

function toDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`)
}

function calculateDurationMinutes(date: string, sleepTime: string, wakeTime: string) {
  const sleptAt = toDateTime(date, sleepTime)
  let wokeAt = toDateTime(date, wakeTime)

  if (wokeAt <= sleptAt) {
    wokeAt = addDays(wokeAt, 1)
  }

  return Math.round((wokeAt.getTime() - sleptAt.getTime()) / 60_000)
}

function timeFromIso(value: string | null, fallback: string) {
  if (!value) {
    return fallback
  }

  return new Date(value).toTimeString().slice(0, 5)
}

export default function Sleep() {
  const [userId, setUserId] = useState('')
  const [logs, setLogs] = useState<SleepLog[]>([])
  const [form, setForm] = useState(defaultForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadSleep() {
    const user = await getCurrentUser()

    if (!user) {
      setIsLoading(false)
      return
    }

    const since = getLocalDate(addDays(new Date(), -6))
    setUserId(user.id)
    setError('')

    const result = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('sleep_date', since)
      .order('sleep_date', { ascending: false })

    if (result.error) {
      throw result.error
    }

    const sleepLogs = (result.data ?? []) as SleepLog[]
    const todayLog = sleepLogs.find((log) => log.sleep_date === getLocalDate())

    setLogs(sleepLogs)
    setForm(todayLog ? toForm(todayLog) : defaultForm)
    setIsLoading(false)
  }

  useEffect(() => {
    loadSleep().catch((error) => {
      setError(error instanceof Error ? error.message : 'Unable to load sleep logs.')
      setIsLoading(false)
    })
  }, [])

  const calculatedDuration = calculateDurationMinutes(form.sleep_date, form.sleep_time, form.wake_time)
  const loggedDurations = logs.filter((log) => log.duration_minutes)
  const averageSleep = loggedDurations.length
    ? Math.round(loggedDurations.reduce((total, log) => total + (log.duration_minutes ?? 0), 0) / loggedDurations.length)
    : null
  const bestSleep = loggedDurations.reduce<SleepLog | null>((best, log) => (!best || (log.duration_minutes ?? 0) > (best.duration_minutes ?? 0) ? log : best), null)
  const worstSleep = loggedDurations.reduce<SleepLog | null>((worst, log) => (!worst || (log.duration_minutes ?? 0) < (worst.duration_minutes ?? 0) ? log : worst), null)
  const lateUsageCount = logs.filter((log) => log.late_phone_usage).length
  const calendarLogs = useMemo(
    () =>
      logs.map((log) => ({
        date: log.sleep_date,
        title: 'Sleep log',
        details: `${minutesToLabel(log.duration_minutes)} - ${log.sleep_quality ?? 'unrated'} - phone ${log.late_phone_usage ? 'yes' : 'no'}`,
        tone: log.sleep_quality === 'good' ? 'emerald' as const : log.sleep_quality === 'poor' ? 'rose' as const : 'amber' as const,
      })),
    [logs],
  )

  async function saveSleep(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError('')

    const sleptAt = toDateTime(form.sleep_date, form.sleep_time)
    let wokeAt = toDateTime(form.sleep_date, form.wake_time)

    if (wokeAt <= sleptAt) {
      wokeAt = addDays(wokeAt, 1)
    }

    const result = await supabase.from('sleep_logs').upsert(
      {
        user_id: userId,
        sleep_date: form.sleep_date,
        slept_at: sleptAt.toISOString(),
        woke_at: wokeAt.toISOString(),
        duration_minutes: calculatedDuration,
        sleep_quality: form.sleep_quality,
        quality: form.sleep_quality === 'poor' ? 3 : form.sleep_quality === 'okay' ? 6 : 9,
        late_phone_usage: form.late_phone_usage,
        sleep_goal_minutes: Math.round(Number(form.sleep_goal_hours || 8) * 60),
        notes: form.notes.trim() || null,
      },
      { onConflict: 'user_id,sleep_date' },
    )

    if (result.error) {
      setError(result.error.message)
      setIsSaving(false)
      return
    }

    await loadSleep()
    setIsSaving(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Sleep" description="Manual sleep and wake tracking with weekly patterns. No wearable integrations." />

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">{error}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InsightCard label="Average sleep this week" value={minutesToLabel(averageSleep)} icon={<Clock className="size-5" />} />
        <InsightCard label="Best sleep day" value={bestSleep ? `${bestSleep.sleep_date.slice(5)} · ${minutesToLabel(bestSleep.duration_minutes)}` : 'No log'} icon={<Trophy className="size-5" />} />
        <InsightCard label="Worst sleep day" value={worstSleep ? `${worstSleep.sleep_date.slice(5)} · ${minutesToLabel(worstSleep.duration_minutes)}` : 'No log'} icon={<Moon className="size-5" />} />
        <InsightCard label="Late-night usage count" value={String(lateUsageCount)} icon={<Phone className="size-5" />} />
      </div>

      <div className="grid gap-6">
        <SectionCard title="Sleep log">
          <form onSubmit={saveSleep} className="grid gap-4 md:grid-cols-2">
            <Input label="Sleep date" type="date" value={form.sleep_date} onChange={(value) => setForm({ ...form, sleep_date: value })} required />
            <Input label="Sleep goal, hours" type="number" value={form.sleep_goal_hours} onChange={(value) => setForm({ ...form, sleep_goal_hours: value })} required />
            <Input label="Sleep time" type="time" value={form.sleep_time} onChange={(value) => setForm({ ...form, sleep_time: value })} required />
            <Input label="Wake-up time" type="time" value={form.wake_time} onChange={(value) => setForm({ ...form, wake_time: value })} required />

            <label className="block">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Sleep quality</span>
              <select
                value={form.sleep_quality}
                onChange={(event) => setForm({ ...form, sleep_quality: event.target.value as SleepQuality })}
                className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950"
              >
                <option value="poor">Poor</option>
                <option value="okay">Okay</option>
                <option value="good">Good</option>
              </select>
            </label>

            <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Auto duration</p>
              <p className="mt-2 text-2xl font-semibold text-neutral-950 dark:text-white">{minutesToLabel(calculatedDuration)}</p>
            </div>

            <label className="flex min-h-11 items-center gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 md:col-span-2 dark:border-neutral-800 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={form.late_phone_usage}
                onChange={(event) => setForm({ ...form, late_phone_usage: event.target.checked })}
                className="size-4 accent-neutral-950 dark:accent-white"
              />
              Late-night phone usage
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Notes</span>
              <textarea
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                className="mt-2 min-h-24 w-full resize-none rounded-lg border border-neutral-200 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-neutral-400 dark:border-neutral-800"
                placeholder="Caffeine, stress, screens, room temperature..."
              />
            </label>

            <button type="submit" disabled={isSaving || !userId} className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70 md:col-span-2 dark:bg-white dark:text-neutral-950">
              <Plus className="size-4" aria-hidden="true" />
              {isSaving ? 'Saving...' : 'Save sleep log'}
            </button>
          </form>
        </SectionCard>

      </div>

      <SectionCard title="Sleep calendar">
        <LogCalendar logs={calendarLogs} emptyMessage="No sleep log for this date." />
      </SectionCard>

      <SectionCard title="Recent sleep logs">
        {isLoading ? <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading sleep logs...</p> : null}
        {!isLoading && logs.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {logs.map((log) => (
              <article key={log.id} className="rounded-lg border border-neutral-200 p-4 text-sm dark:border-neutral-800">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-neutral-950 dark:text-white">{log.sleep_date}</p>
                  <span className={cn('rounded-md px-2 py-1 text-xs capitalize', qualityClass(log.sleep_quality))}>{log.sleep_quality ?? 'Unrated'}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-neutral-600 dark:text-neutral-400">
                  <p>Duration: {minutesToLabel(log.duration_minutes)}</p>
                  <p>Goal: {minutesToLabel(log.sleep_goal_minutes)}</p>
                  <p>Phone: {log.late_phone_usage ? 'Yes' : 'No'}</p>
                  <p>Wake: {timeFromIso(log.woke_at, '--:--')}</p>
                </div>
                {log.notes ? <p className="mt-3 leading-6 text-neutral-600 dark:text-neutral-400">{log.notes}</p> : null}
              </article>
            ))}
          </div>
        ) : null}
        {!isLoading && !logs.length ? <EmptyState title="No recent sleep logs" body="Your last seven days of manual sleep entries will appear here." /> : null}
      </SectionCard>
    </div>
  )
}

function toForm(log: SleepLog) {
  return {
    sleep_date: log.sleep_date,
    sleep_time: timeFromIso(log.slept_at, '23:00'),
    wake_time: timeFromIso(log.woke_at, '07:00'),
    sleep_quality: log.sleep_quality ?? 'okay',
    late_phone_usage: log.late_phone_usage,
    sleep_goal_hours: String(Math.round((log.sleep_goal_minutes / 60) * 10) / 10),
    notes: log.notes ?? '',
  }
}

function qualityClass(quality: SleepQuality | null) {
  if (quality === 'good') {
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
  }

  if (quality === 'poor') {
    return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
  }

  return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
}

function InsightCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <article className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
          <p className="mt-3 text-xl font-semibold tracking-tight text-neutral-950 dark:text-white">{value}</p>
        </div>
        <div className="grid size-10 place-items-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">{icon}</div>
      </div>
    </article>
  )
}

function Input({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-neutral-200 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-neutral-400 dark:border-neutral-800"
        required={required}
        min={type === 'number' ? 0 : undefined}
        step={type === 'number' ? '0.25' : undefined}
      />
    </label>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid h-full min-h-48 place-items-center rounded-lg border border-dashed border-neutral-300 p-5 text-center dark:border-neutral-700">
      <div>
        <BedDouble className="mx-auto size-8 text-neutral-400" aria-hidden="true" />
        <p className="mt-3 font-medium text-neutral-900 dark:text-white">{title}</p>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{body}</p>
      </div>
    </div>
  )
}
