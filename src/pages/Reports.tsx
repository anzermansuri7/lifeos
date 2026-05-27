import { useEffect, useMemo, useState } from 'react'
import LogCalendar from '../components/LogCalendar'
import PageHeader from '../components/PageHeader'
import SectionCard from '../components/SectionCard'
import { getCurrentUser, supabase } from '../lib/supabaseClient'
import { formatMoney } from '../utils/format'

type Habit = {
  id: string
  name: string
  target_count: number
}

type HabitLog = {
  habit_id: string
  log_date: string
  status: string
  count: number | null
}

type FinanceTransaction = {
  transaction_date: string
  type: string
  category: string
  amount: number
}

type SleepLog = {
  sleep_date: string
  duration_minutes: number | null
  sleep_quality: string | null
  late_phone_usage: boolean
}

type HealthLog = {
  log_date: string
  weight_kg: number | null
  water_glasses: number
  workout_done: boolean
  workout_minutes: number
  walking_minutes: number
  cheat_meal: boolean
}

type JournalEntry = {
  entry_date: string
  title: string | null
  mood: string | null
  is_private: boolean
}

type PrayerLog = {
  prayer_date: string
  prayer_name: string
  status: string
  quran_pages: number
}

const expenseTypes = ['expense']

function getLocalDate(date = new Date()) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return offsetDate.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function minutesToLabel(minutes: number | null | undefined) {
  if (!minutes) {
    return 'No log'
  }

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(value.toFixed(1)).replace(/\.0$/, '')
}

function formatPrayerName(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function habitTone(status: string) {
  if (status === 'done') {
    return 'emerald' as const
  }

  if (status === 'partial') {
    return 'sky' as const
  }

  if (status === 'skipped') {
    return 'amber' as const
  }

  return 'rose' as const
}

export default function Reports() {
  const [startDate, setStartDate] = useState(getLocalDate(addDays(new Date(), -29)))
  const [endDate, setEndDate] = useState(getLocalDate())
  const [habits, setHabits] = useState<Habit[]>([])
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([])
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([])
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([])
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>([])
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([])
  const [prayerLogs, setPrayerLogs] = useState<PrayerLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  function setQuickRange(days: number) {
    setStartDate(getLocalDate(addDays(new Date(), -(days - 1))))
    setEndDate(getLocalDate())
  }

  async function loadReports() {
    const user = await getCurrentUser()

    if (!user) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError('')

    const [habitsResult, habitResult, financeResult, sleepResult, healthResult, journalResult, prayerResult] = await Promise.all([
      supabase.from('habits').select('id, name, target_count').eq('user_id', user.id),
      supabase.from('habit_logs').select('habit_id, log_date, status, count').eq('user_id', user.id).gte('log_date', startDate).lte('log_date', endDate),
      supabase.from('finance_transactions').select('transaction_date, type, category, amount').eq('user_id', user.id).gte('transaction_date', startDate).lte('transaction_date', endDate),
      supabase.from('sleep_logs').select('sleep_date, duration_minutes, sleep_quality, late_phone_usage').eq('user_id', user.id).gte('sleep_date', startDate).lte('sleep_date', endDate),
      supabase.from('health_logs').select('log_date, weight_kg, water_glasses, workout_done, workout_minutes, walking_minutes, cheat_meal').eq('user_id', user.id).gte('log_date', startDate).lte('log_date', endDate),
      supabase.from('journal_entries').select('entry_date, title, mood, is_private').eq('user_id', user.id).gte('entry_date', startDate).lte('entry_date', endDate),
      supabase.from('prayer_logs').select('prayer_date, prayer_name, status, quran_pages').eq('user_id', user.id).gte('prayer_date', startDate).lte('prayer_date', endDate),
    ])

    const queryError = habitsResult.error || habitResult.error || financeResult.error || sleepResult.error || healthResult.error || journalResult.error || prayerResult.error

    if (queryError) {
      throw queryError
    }

    setHabits((habitsResult.data ?? []).map((habit) => ({ ...habit, target_count: Number(habit.target_count ?? 1) })))
    setHabitLogs((habitResult.data ?? []).map((log) => ({ ...log, count: log.count === null ? null : Number(log.count ?? 0) })))
    setTransactions((financeResult.data ?? []).map((item) => ({ ...item, amount: Number(item.amount ?? 0) })))
    setSleepLogs(sleepResult.data ?? [])
    setHealthLogs((healthResult.data ?? []).map((item) => ({
      ...item,
      weight_kg: item.weight_kg === null ? null : Number(item.weight_kg),
      water_glasses: Number(item.water_glasses ?? 0),
      workout_minutes: Number(item.workout_minutes ?? 0),
      walking_minutes: Number(item.walking_minutes ?? 0),
    })))
    setJournalEntries(journalResult.data ?? [])
    setPrayerLogs((prayerResult.data ?? []).map((log) => ({ ...log, quran_pages: Number(log.quran_pages ?? 0) })))
    setIsLoading(false)
  }

  useEffect(() => {
    loadReports().catch((error) => {
      setError(error instanceof Error ? error.message : 'Unable to load reports.')
      setIsLoading(false)
    })
  }, [startDate, endDate])

  const reportData = useMemo(() => {
    const doneHabitLogs = habitLogs.filter((log) => ['done', 'partial'].includes(log.status))
    const expenses = transactions.filter((transaction) => expenseTypes.includes(transaction.type))
    const income = transactions.filter((transaction) => transaction.type === 'income').reduce((total, item) => total + item.amount, 0)
    const expenseTotal = expenses.reduce((total, item) => total + item.amount, 0)
    const sleepAverageMinutes = sleepLogs.length ? Math.round(sleepLogs.reduce((total, log) => total + Number(log.duration_minutes ?? 0), 0) / sleepLogs.length) : 0
    const expenseCategories = new Set(expenses.map((transaction) => transaction.category)).size
    const weightLogs = healthLogs.slice().sort((a, b) => a.log_date.localeCompare(b.log_date)).filter((log) => log.weight_kg !== null)

    return {
      income,
      expenseTotal,
      balance: income - expenseTotal,
      completedHabitLogs: doneHabitLogs.length,
      habitConsistency: habitLogs.length ? `${Math.round((doneHabitLogs.length / habitLogs.length) * 100)}%` : 'No logs',
      expenseCategories,
      sleepAverage: minutesToLabel(sleepAverageMinutes),
      weightTrend: weightLogs.length >= 2 ? `${weightLogs[0].weight_kg} kg to ${weightLogs[weightLogs.length - 1].weight_kg} kg` : 'No trend',
    }
  }, [habitLogs, transactions, sleepLogs, healthLogs])

  const calendarLogs = useMemo(
    () => [
      ...habitLogs.map((log) => {
        const habit = habits.find((item) => item.id === log.habit_id)
        const targetCount = habit?.target_count ?? 1
        const loggedCount = Number(log.count ?? 0)

        return {
          date: log.log_date,
          title: `Habit - ${habit?.name ?? 'Habit'}`,
          details: `${log.status} - ${loggedCount}/${targetCount}`,
          tone: habitTone(log.status),
        }
      }),
      ...transactions.map((transaction) => ({
        date: transaction.transaction_date,
        title: `Finance - ${transaction.category}`,
        details: `${transaction.type.replace('_', ' ')} - ${transaction.type === 'income' ? formatMoney(transaction.amount) : `-${formatMoney(transaction.amount)}`}`,
        tone: transaction.type === 'income' ? 'emerald' as const : 'amber' as const,
      })),
      ...healthLogs.map((log) => ({
        date: log.log_date,
        title: 'Health log',
        details: [
          log.weight_kg !== null ? `Weight ${log.weight_kg} kg` : null,
          `Water ${log.water_glasses}`,
          log.workout_done ? `Workout ${log.workout_minutes}m` : null,
          log.walking_minutes ? `Walk ${log.walking_minutes}m` : null,
          log.cheat_meal ? 'Cheat meal' : null,
        ].filter(Boolean).join(' - '),
        tone: log.cheat_meal ? 'amber' as const : log.workout_done ? 'emerald' as const : 'sky' as const,
      })),
      ...sleepLogs.map((log) => ({
        date: log.sleep_date,
        title: 'Sleep log',
        details: `${minutesToLabel(log.duration_minutes)} - ${log.sleep_quality ?? 'unrated'} - phone ${log.late_phone_usage ? 'yes' : 'no'}`,
        tone: log.sleep_quality === 'good' ? 'emerald' as const : log.sleep_quality === 'poor' ? 'rose' as const : 'amber' as const,
      })),
      ...journalEntries.map((entry) => ({
        date: entry.entry_date,
        title: `Journal - ${entry.title || 'Daily entry'}`,
        details: `${entry.mood ?? 'No mood'} - ${entry.is_private ? 'Private' : 'Shared with guardian'}`,
        tone: entry.is_private ? 'neutral' as const : 'violet' as const,
      })),
      ...prayerLogs.map((log) => ({
        date: log.prayer_date,
        title: `Prayer - ${formatPrayerName(log.prayer_name)}`,
        details: `${log.status} - Quran ${formatNumber(log.quran_pages)} pages/ruku`,
        tone: log.status === 'prayed' ? 'emerald' as const : log.status === 'missed' ? 'rose' as const : log.status === 'skipped' ? 'amber' as const : 'neutral' as const,
      })),
    ],
    [habitLogs, habits, healthLogs, journalEntries, prayerLogs, sleepLogs, transactions],
  )
  const activityBreakdown = [
    { label: 'Habits', value: habitLogs.length, helper: `${reportData.completedHabitLogs} completed or partial` },
    { label: 'Finance', value: transactions.length, helper: `${reportData.expenseCategories} expense categories` },
    { label: 'Health', value: healthLogs.length, helper: `${healthLogs.filter((log) => log.workout_done).length} workout days` },
    { label: 'Sleep', value: sleepLogs.length, helper: `${reportData.sleepAverage} average` },
    { label: 'Journal', value: journalEntries.length, helper: `${journalEntries.filter((entry) => !entry.is_private).length} shared` },
    { label: 'Prayer', value: prayerLogs.length, helper: `${prayerLogs.filter((log) => log.status === 'prayed').length} prayed` },
  ]
  const overviewCards = [
    { label: 'Total logs', value: String(calendarLogs.length), helper: 'All modules in range' },
    { label: 'Habit consistency', value: reportData.habitConsistency, helper: `${reportData.completedHabitLogs} completed signals` },
    { label: 'Expenses', value: formatMoney(reportData.expenseTotal), helper: `${reportData.expenseCategories} categories` },
    { label: 'Balance', value: formatMoney(reportData.balance), helper: `${formatMoney(reportData.income)} income` },
    { label: 'Sleep average', value: reportData.sleepAverage, helper: `${sleepLogs.length} sleep logs` },
    { label: 'Weight trend', value: reportData.weightTrend, helper: `${healthLogs.length} health logs` },
    { label: 'Prayer', value: String(prayerLogs.filter((log) => log.status === 'prayed').length), helper: 'Prayed in range' },
  ]

  return (
    <div className="space-y-8">
      <PageHeader title="Reports" description="Calendar-first summaries from your manual Life OS logs." />

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">{error}</div> : null}

      <SectionCard title="Report range">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Start date" value={startDate} onChange={setStartDate} />
            <Input label="End date" value={endDate} onChange={setEndDate} />
          </div>
          <div className="grid grid-cols-3 gap-2 sm:flex">
            <QuickRangeButton label="Today" onClick={() => setQuickRange(1)} />
            <QuickRangeButton label="7 days" onClick={() => setQuickRange(7)} />
            <QuickRangeButton label="30 days" onClick={() => setQuickRange(30)} />
          </div>
        </div>
      </SectionCard>

      <div className="hidden gap-6 sm:grid xl:grid-cols-[1fr_360px]">
        <SectionCard title="Range overview">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {overviewCards.map((card) => (
              <ReportCard key={card.label} label={card.label} value={isLoading ? 'Loading...' : card.value} helper={card.helper} />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Activity mix">
          <div className="space-y-3">
            {activityBreakdown.map((item) => (
              <ActivityRow key={item.label} label={item.label} value={isLoading ? '...' : String(item.value)} helper={isLoading ? 'Loading...' : item.helper} />
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="All logs calendar">
        {isLoading ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading calendar logs...</p>
        ) : (
          <LogCalendar logs={calendarLogs} emptyMessage="No Life OS logs for this date." />
        )}
      </SectionCard>
    </div>
  )
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-neutral-200 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-neutral-400 dark:border-neutral-800" />
    </label>
  )
}

function QuickRangeButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-800">
      {label}
    </button>
  )
}

function ReportCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <article className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-2 text-xl font-semibold text-neutral-950 dark:text-white">{value}</p>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{helper}</p>
    </article>
  )
}

function ActivityRow({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 px-3 py-2.5 dark:border-neutral-800">
      <div>
        <p className="text-sm font-medium text-neutral-900 dark:text-white">{label}</p>
        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{helper}</p>
      </div>
      <span className="rounded-md bg-neutral-100 px-2 py-1 text-sm font-semibold text-neutral-900 dark:bg-neutral-800 dark:text-white">{value}</span>
    </div>
  )
}
