import { useEffect, useMemo, useState } from 'react'
import { Droplets, Dumbbell, Plus, Scale } from 'lucide-react'
import type { ReactNode } from 'react'
import LogCalendar from '../components/LogCalendar'
import PageHeader from '../components/PageHeader'
import SectionCard from '../components/SectionCard'
import { getCurrentUser, supabase } from '../lib/supabaseClient'
import { cn } from '../utils/cn'

type HealthLog = {
  id: string
  user_id: string
  log_date: string
  weight_kg: number | null
  waist_cm: number | null
  water_glasses: number
  breakfast_done: boolean
  lunch_done: boolean
  dinner_done: boolean
  snacks_done: boolean
  cheat_meal: boolean
  craving_count: number
  craving_note: string | null
  workout_done: boolean
  workout_type: string | null
  workout_minutes: number
  walking_minutes: number
  notes: string | null
}

const defaultForm = {
  log_date: getLocalDate(),
  weight_kg: '',
  waist_cm: '',
  water_glasses: '0',
  breakfast_done: false,
  lunch_done: false,
  dinner_done: false,
  snacks_done: false,
  cheat_meal: false,
  craving_count: '0',
  craving_note: '',
  workout_done: false,
  workout_type: '',
  workout_minutes: '0',
  walking_minutes: '0',
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

function formatNumber(value: number | null, suffix: string) {
  return value === null ? 'No log' : `${value}${suffix}`
}

export default function Health() {
  const [userId, setUserId] = useState('')
  const [logs, setLogs] = useState<HealthLog[]>([])
  const [form, setForm] = useState(defaultForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadHealth() {
    const user = await getCurrentUser()

    if (!user) {
      setIsLoading(false)
      return
    }

    const since = getLocalDate(addDays(new Date(), -30))
    setUserId(user.id)
    setError('')

    const result = await supabase
      .from('health_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('log_date', since)
      .order('log_date', { ascending: false })

    if (result.error) {
      throw result.error
    }

    const healthLogs = (result.data ?? []).map((log) => ({
      ...log,
      weight_kg: log.weight_kg === null ? null : Number(log.weight_kg),
      waist_cm: log.waist_cm === null ? null : Number(log.waist_cm),
    }))

    const todayLog = healthLogs.find((log) => log.log_date === getLocalDate())
    setLogs(healthLogs)
    setForm(todayLog ? toForm(todayLog) : defaultForm)
    setIsLoading(false)
  }

  useEffect(() => {
    loadHealth().catch((error) => {
      setError(error instanceof Error ? error.message : 'Unable to load health logs.')
      setIsLoading(false)
    })
  }, [])

  const latestWeight = logs.find((log) => log.weight_kg !== null)?.weight_kg ?? null
  const todayLog = logs.find((log) => log.log_date === getLocalDate())
  const waterToday = todayLog?.water_glasses ?? 0
  const workoutDays = logs.filter((log) => log.workout_done).length
  const workoutConsistency = logs.length ? Math.round((workoutDays / Math.min(logs.length, 7)) * 100) : 0

  const calendarLogs = useMemo(
    () =>
      logs.map((log) => ({
        date: log.log_date,
        title: log.workout_done ? 'Health and workout log' : 'Health log',
        details: [
          log.weight_kg !== null ? `Weight ${log.weight_kg} kg` : null,
          `Water ${log.water_glasses}`,
          log.workout_done ? `Workout ${log.workout_minutes}m` : null,
          log.walking_minutes ? `Walk ${log.walking_minutes}m` : null,
          log.cheat_meal ? 'Cheat meal' : null,
          log.craving_count ? `Cravings ${log.craving_count}` : null,
        ].filter(Boolean).join(' - '),
        tone: log.cheat_meal ? 'amber' as const : log.workout_done ? 'emerald' as const : 'sky' as const,
      })),
    [logs],
  )

  async function saveHealth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError('')

    const payload = {
      user_id: userId,
      log_date: form.log_date,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
      waist_cm: form.waist_cm ? Number(form.waist_cm) : null,
      water_glasses: Number(form.water_glasses || 0),
      breakfast_done: form.breakfast_done,
      lunch_done: form.lunch_done,
      dinner_done: form.dinner_done,
      snacks_done: form.snacks_done,
      cheat_meal: form.cheat_meal,
      craving_count: Number(form.craving_count || 0),
      craving_note: form.craving_note.trim() || null,
      workout_done: form.workout_done,
      workout_type: form.workout_type.trim() || null,
      workout_minutes: Number(form.workout_minutes || 0),
      walking_minutes: Number(form.walking_minutes || 0),
      notes: form.notes.trim() || null,
    }

    const result = await supabase.from('health_logs').upsert(payload, { onConflict: 'user_id,log_date' })

    if (result.error) {
      setError(result.error.message)
      setIsSaving(false)
      return
    }

    await loadHealth()
    setIsSaving(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Health" description="Manual weight, meals, cravings, water, workouts, walking, and notes. No fitness device integrations." />

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">{error}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Latest weight" value={formatNumber(latestWeight, ' kg')} icon={<Scale className="size-5" />} />
        <SummaryCard label="Water today" value={`${waterToday} glasses`} icon={<Droplets className="size-5" />} />
        <SummaryCard label="Workout consistency" value={`${workoutConsistency}%`} icon={<Dumbbell className="size-5" />} />
      </div>

      <div className="grid gap-6">
        <SectionCard title="Daily health log">
          <form onSubmit={saveHealth} className="grid gap-4 md:grid-cols-2">
            <Input label="Date" type="date" value={form.log_date} onChange={(value) => setForm({ ...form, log_date: value })} required />
            <Input label="Weight, kg" type="number" value={form.weight_kg} onChange={(value) => setForm({ ...form, weight_kg: value })} placeholder="72.5" />
            <Input label="Water intake, glasses" type="number" value={form.water_glasses} onChange={(value) => setForm({ ...form, water_glasses: value })} placeholder="8" />
            <Input label="Walking minutes" type="number" value={form.walking_minutes} onChange={(value) => setForm({ ...form, walking_minutes: value })} placeholder="30" />
            <Input label="Workout minutes" type="number" value={form.workout_minutes} onChange={(value) => setForm({ ...form, workout_minutes: value })} placeholder="45" />

            <div className="md:col-span-2">
              <CheckBox label="Workout done" checked={form.workout_done} onChange={(checked) => setForm({ ...form, workout_done: checked })} />
            </div>

            <Textarea label="Notes" value={form.notes} onChange={(value) => setForm({ ...form, notes: value })} placeholder="Anything useful about today?" className="md:col-span-2" />

            <button type="submit" disabled={isSaving || !userId} className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70 md:col-span-2 dark:bg-white dark:text-neutral-950">
              <Plus className="size-4" aria-hidden="true" />
              {isSaving ? 'Saving...' : 'Save health log'}
            </button>
          </form>
        </SectionCard>

      </div>

      <SectionCard title="Health calendar">
        <LogCalendar logs={calendarLogs} emptyMessage="No health log for this date." />
      </SectionCard>

      <SectionCard title="Recent manual logs">
        {isLoading ? <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading health logs...</p> : null}
        {!isLoading && logs.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {logs.slice(0, 6).map((log) => (
              <article key={log.id} className="rounded-lg border border-neutral-200 p-4 text-sm dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-neutral-950 dark:text-white">{log.log_date}</p>
                  <span className={cn('rounded-md px-2 py-1 text-xs', log.cheat_meal ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300')}>
                    {log.cheat_meal ? 'Cheat meal' : 'Regular'}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-neutral-600 dark:text-neutral-400">
                  <p>Weight: {formatNumber(log.weight_kg, ' kg')}</p>
                  <p>Water: {log.water_glasses}</p>
                  <p>Walk: {log.walking_minutes}m</p>
                  <p>Workout: {log.workout_done ? `${log.workout_minutes}m` : 'No'}</p>
                </div>
                {log.notes ? <p className="mt-3 leading-6 text-neutral-600 dark:text-neutral-400">{log.notes}</p> : null}
              </article>
            ))}
          </div>
        ) : null}
        {!isLoading && !logs.length ? <EmptyState title="No health logs yet" body="Add your first manual health log to begin tracking." /> : null}
      </SectionCard>
    </div>
  )
}

function toForm(log: HealthLog) {
  return {
    log_date: log.log_date,
    weight_kg: log.weight_kg === null ? '' : String(log.weight_kg),
    waist_cm: log.waist_cm === null ? '' : String(log.waist_cm),
    water_glasses: String(log.water_glasses ?? 0),
    breakfast_done: log.breakfast_done,
    lunch_done: log.lunch_done,
    dinner_done: log.dinner_done,
    snacks_done: log.snacks_done,
    cheat_meal: log.cheat_meal,
    craving_count: String(log.craving_count ?? 0),
    craving_note: log.craving_note ?? '',
    workout_done: log.workout_done,
    workout_type: log.workout_type ?? '',
    workout_minutes: String(log.workout_minutes ?? 0),
    walking_minutes: String(log.walking_minutes ?? 0),
    notes: log.notes ?? '',
  }
}

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <article className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white">{value}</p>
        </div>
        <div className="grid size-10 place-items-center rounded-lg bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">{icon}</div>
      </div>
    </article>
  )
}

function Input({ label, value, onChange, placeholder = '', type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-neutral-200 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-neutral-400 dark:border-neutral-800" placeholder={placeholder} required={required} min={type === 'number' ? 0 : undefined} step={type === 'number' ? '0.1' : undefined} />
    </label>
  )
}

function Textarea({ label, value, onChange, placeholder, className }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-20 w-full resize-none rounded-lg border border-neutral-200 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-neutral-400 dark:border-neutral-800" placeholder={placeholder} />
    </label>
  )
}

function CheckBox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-11 items-center gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 dark:border-neutral-800 dark:text-neutral-300">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-neutral-950 dark:accent-white" />
      {label}
    </label>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid h-full min-h-48 place-items-center rounded-lg border border-dashed border-neutral-300 p-5 text-center dark:border-neutral-700">
      <div>
        <p className="font-medium text-neutral-900 dark:text-white">{title}</p>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{body}</p>
      </div>
    </div>
  )
}
