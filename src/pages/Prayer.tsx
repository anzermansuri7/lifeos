import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Check, MinusCircle, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import LogCalendar from '../components/LogCalendar'
import PageHeader from '../components/PageHeader'
import SectionCard from '../components/SectionCard'
import { getCurrentUser, supabase } from '../lib/supabaseClient'
import { cn } from '../utils/cn'

type PrayerName = 'fazar' | 'zohr' | 'asar' | 'magrib' | 'isha' | 'tahajjud'
type PrayerStatus = 'prayed' | 'missed' | 'skipped' | 'pending'

type PrayerLog = {
  id: string
  prayer_date: string
  prayer_name: PrayerName
  status: PrayerStatus
  quran_pages: number
  notes: string | null
}

const prayers: Array<{ id: PrayerName; label: string }> = [
  { id: 'fazar', label: 'Fazar' },
  { id: 'zohr', label: 'Zohr' },
  { id: 'asar', label: 'Asar' },
  { id: 'magrib', label: 'Magrib' },
  { id: 'isha', label: 'Isha' },
  { id: 'tahajjud', label: 'Tahajjud' },
]

const statusStyles: Record<PrayerStatus, string> = {
  prayed: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300',
  missed: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300',
  skipped: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
  pending: 'border-neutral-200 bg-neutral-50 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300',
}

function getLocalDate(date = new Date()) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return offsetDate.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(value.toFixed(1)).replace(/\.0$/, '')
}

export default function Prayer() {
  const [userId, setUserId] = useState('')
  const [selectedDate, setSelectedDate] = useState(getLocalDate())
  const [defaultPages, setDefaultPages] = useState('5')
  const [logs, setLogs] = useState<PrayerLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadPrayerLogs() {
    const user = await getCurrentUser()

    if (!user) {
      setIsLoading(false)
      return
    }

    const since = getLocalDate(addDays(new Date(), -30))
    setUserId(user.id)
    setError('')

    const result = await supabase
      .from('prayer_logs')
      .select('id, prayer_date, prayer_name, status, quran_pages, notes')
      .eq('user_id', user.id)
      .gte('prayer_date', since)
      .order('prayer_date', { ascending: false })

    if (result.error) {
      throw result.error
    }

    setLogs((result.data ?? []).map((log) => ({ ...log, quran_pages: Number(log.quran_pages ?? 0) })))
    setIsLoading(false)
  }

  useEffect(() => {
    loadPrayerLogs().catch((error) => {
      setError(error instanceof Error ? error.message : 'Unable to load prayer logs.')
      setIsLoading(false)
    })
  }, [])

  const logsForDate = logs.filter((log) => log.prayer_date === selectedDate)
  const prayedToday = logsForDate.filter((log) => log.status === 'prayed').length
  const missedToday = logsForDate.filter((log) => log.status === 'missed').length
  const quranPagesToday = logsForDate.reduce((total, log) => total + (log.status === 'prayed' ? log.quran_pages : 0), 0)
  const weeklyLogs = logs.filter((log) => log.prayer_date >= getLocalDate(addDays(new Date(), -6)))
  const weeklyPrayed = weeklyLogs.filter((log) => log.status === 'prayed').length

  const calendarLogs = useMemo(
    () =>
      logs.map((log) => ({
        date: log.prayer_date,
        title: prayers.find((prayer) => prayer.id === log.prayer_name)?.label ?? 'Prayer',
        details: `${log.status} - Quran ${formatNumber(log.quran_pages)} pages/ruku`,
        tone: log.status === 'prayed' ? 'emerald' as const : log.status === 'missed' ? 'rose' as const : log.status === 'skipped' ? 'amber' as const : 'neutral' as const,
      })),
    [logs],
  )

  async function savePrayer(prayerName: PrayerName, status: PrayerStatus, pages?: number, notes?: string | null) {
    if (!userId) {
      return
    }

    setIsSaving(true)
    setError('')

    const existing = logsForDate.find((log) => log.prayer_name === prayerName)
    const quranPages = pages ?? existing?.quran_pages ?? Number(defaultPages || 5)

    const result = await supabase.from('prayer_logs').upsert(
      {
        user_id: userId,
        prayer_date: selectedDate,
        prayer_name: prayerName,
        status,
        quran_pages: Math.max(0, quranPages),
        notes: notes ?? existing?.notes ?? null,
      },
      { onConflict: 'user_id,prayer_date,prayer_name' },
    )

    if (result.error) {
      setError(result.error.message)
      setIsSaving(false)
      return
    }

    await loadPrayerLogs()
    setIsSaving(false)
  }

  function getLog(prayerName: PrayerName) {
    return logsForDate.find((log) => log.prayer_name === prayerName)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Prayer" description="Track six daily prayers and Quran recitation manually." />

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">{error}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Prayers logged" value={isLoading ? '...' : `${prayedToday}/6`} />
        <Metric label="Missed" value={isLoading ? '...' : String(missedToday)} />
        <Metric label="Quran today" value={isLoading ? '...' : `${formatNumber(quranPagesToday)} pages/ruku`} />
        <Metric label="This week" value={isLoading ? '...' : `${weeklyPrayed}/42`} />
      </div>

      <SectionCard title="Daily prayer log">
        <div className="mb-5 grid gap-4 md:grid-cols-[1fr_220px]">
          <Input label="Date" type="date" value={selectedDate} onChange={setSelectedDate} />
          <Input label="Default Quran pages/ruku" type="number" value={defaultPages} onChange={setDefaultPages} />
        </div>

        {isLoading ? <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading prayer logs...</p> : null}
        {!isLoading ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {prayers.map((prayer) => {
              const log = getLog(prayer.id)
              const status = log?.status ?? 'pending'
              const pagesValue = String(log?.quran_pages ?? defaultPages)

              return (
                <article key={prayer.id} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-neutral-950 dark:text-white">{prayer.label}</h2>
                      <span className={cn('mt-2 inline-flex rounded-md border px-2 py-1 text-xs capitalize', statusStyles[status])}>{status}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                      <BookOpen className="size-4" aria-hidden="true" />
                      {formatNumber(Number(pagesValue || 0))}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-[150px_1fr]">
                    <Input
                      label="Quran pages/ruku"
                      type="number"
                      value={pagesValue}
                      onChange={(value) => savePrayer(prayer.id, status === 'pending' ? 'prayed' : status, Number(value || 0))}
                    />
                    <Input
                      label="Notes"
                      value={log?.notes ?? ''}
                      onChange={(value) => savePrayer(prayer.id, status, Number(pagesValue || 0), value.trim() || null)}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <StatusButton label="Prayed" icon={<Check className="size-4" />} active={status === 'prayed'} disabled={isSaving} onClick={() => savePrayer(prayer.id, 'prayed', Number(pagesValue || defaultPages || 5))} />
                    <StatusButton label="Missed" icon={<XCircle className="size-4" />} active={status === 'missed'} disabled={isSaving} onClick={() => savePrayer(prayer.id, 'missed', 0)} />
                    <StatusButton label="Skipped" icon={<MinusCircle className="size-4" />} active={status === 'skipped'} disabled={isSaving} onClick={() => savePrayer(prayer.id, 'skipped', 0)} />
                  </div>
                </article>
              )
            })}
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title="Recent prayer logs">
        {logs.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {logs.slice(0, 12).map((log) => (
              <div key={log.id} className="rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-neutral-950 dark:text-white">{prayers.find((prayer) => prayer.id === log.prayer_name)?.label}</p>
                  <span className={cn('rounded-md border px-2 py-1 text-xs capitalize', statusStyles[log.status])}>{log.status}</span>
                </div>
                <p className="mt-2 text-neutral-600 dark:text-neutral-400">{log.prayer_date} - Quran {formatNumber(log.quran_pages)} pages/ruku</p>
                {log.notes ? <p className="mt-2 text-neutral-600 dark:text-neutral-400">{log.notes}</p> : null}
              </div>
            ))}
          </div>
        ) : <EmptyState />}
      </SectionCard>

      <SectionCard title="Prayer calendar">
        <PrayerCalendar logs={calendarLogs} />
      </SectionCard>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-neutral-200 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-neutral-400 dark:border-neutral-800" min={type === 'number' ? 0 : undefined} step={type === 'number' ? '0.5' : undefined} />
    </label>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-neutral-950 dark:text-white">{value}</p>
    </article>
  )
}

function StatusButton({ label, icon, active, disabled, onClick }: { label: string; icon: ReactNode; active: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cn('inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition disabled:opacity-60', active ? 'border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-neutral-950' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800')}>
      {icon}
      {label}
    </button>
  )
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 p-6 text-center dark:border-neutral-700">
      <p className="font-medium text-neutral-900 dark:text-white">No prayer logs yet</p>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">Start with today's prayers and Quran pages/ruku.</p>
    </div>
  )
}

function PrayerCalendar({ logs }: { logs: Array<{ date: string; title: string; details: string; tone: 'emerald' | 'amber' | 'rose' | 'neutral' }> }) {
  return <LogCalendar logs={logs} emptyMessage="No prayer logs for this date." />
}
