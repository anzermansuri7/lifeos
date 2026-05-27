import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BedDouble,
  BookOpenText,
  CheckCircle2,
  Flame,
  MoonStar,
  Scale,
  ShieldCheck,
  WalletCards,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { getCurrentUser, supabase } from '../lib/supabaseClient'
import { cn } from '../utils/cn'
import { formatMoney } from '../utils/format'
import { dashboardCardPreferenceKey, readStringList } from '../utils/preferences'

type TodayData = {
  activeHabits: number
  completedHabits: number
  pendingHabits: number
  todayExpenses: number
  sleepMinutes: number | null
  latestWeightKg: number | null
  journalEntriesToday: number
  prayersToday: number
  quranPagesToday: number
  approvedGuardians: number
  pendingGuardians: number
}

type TodayCardProps = {
  label: string
  value: string
  helper: string
  icon: LucideIcon
  tone: 'emerald' | 'sky' | 'violet' | 'amber' | 'rose' | 'slate'
  actionLabel?: string
  actionPath?: string
}

const emptyTodayData: TodayData = {
  activeHabits: 0,
  completedHabits: 0,
  pendingHabits: 0,
  todayExpenses: 0,
  sleepMinutes: null,
  latestWeightKg: null,
  journalEntriesToday: 0,
  prayersToday: 0,
  quranPagesToday: 0,
  approvedGuardians: 0,
  pendingGuardians: 0,
}

const cardTones = {
  emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  sky: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  violet: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  rose: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
}

function getLocalDate() {
  const date = new Date()
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)

  return offsetDate.toISOString().slice(0, 10)
}

function formatSleep(minutes: number | null) {
  if (!minutes) {
    return 'No sleep log'
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  return `${hours}h ${remainingMinutes}m`
}

function TodayCard({ label, value, helper, icon: Icon, tone, actionLabel, actionPath }: TodayCardProps) {
  return (
    <article className="rounded-lg border border-neutral-200 bg-white p-3 shadow-sm sm:p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <p className="text-xs text-neutral-500 sm:text-sm dark:text-neutral-400">{label}</p>
          <p className="mt-2 text-lg font-semibold tracking-tight text-neutral-950 sm:mt-3 sm:text-2xl dark:text-white">{value}</p>
        </div>
        <div className={cn('grid size-8 shrink-0 place-items-center rounded-lg sm:size-10', cardTones[tone])}>
          <Icon className="size-4 sm:size-5" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-3 hidden text-sm leading-6 text-neutral-600 sm:block dark:text-neutral-400">{helper}</p>
      {actionLabel && actionPath ? (
        <Link
          to={actionPath}
          className="mt-3 inline-flex rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          {actionLabel}
        </Link>
      ) : null}
    </article>
  )
}

export default function Dashboard() {
  const [todayData, setTodayData] = useState<TodayData>(emptyTodayData)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadTodayDashboard() {
      setIsLoading(true)
      setError('')

      const user = await getCurrentUser()

      if (!user) {
        if (isMounted) {
          setTodayData(emptyTodayData)
          setIsLoading(false)
        }
        return
      }

      const today = getLocalDate()

      const [
        habitsResult,
        habitLogsResult,
        expensesResult,
        sleepResult,
        healthResult,
        journalResult,
        prayerResult,
        guardiansResult,
      ] = await Promise.all([
        supabase.from('habits').select('id, name').eq('user_id', user.id).eq('is_active', true),
        supabase.from('habit_logs').select('habit_id').eq('user_id', user.id).eq('log_date', today),
        supabase
          .from('finance_transactions')
          .select('amount')
          .eq('user_id', user.id)
          .eq('type', 'expense')
          .eq('transaction_date', today),
        supabase
          .from('sleep_logs')
          .select('duration_minutes')
          .eq('user_id', user.id)
          .eq('sleep_date', today)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('health_logs')
          .select('weight_kg')
          .eq('user_id', user.id)
          .not('weight_kg', 'is', null)
          .order('log_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('journal_entries')
          .select('id')
          .eq('user_id', user.id)
          .eq('entry_date', today),
        supabase
          .from('prayer_logs')
          .select('status, quran_pages')
          .eq('user_id', user.id)
          .eq('prayer_date', today),
        supabase.from('guardians').select('status').eq('user_id', user.id),
      ])

      const queryError =
        habitsResult.error ||
        habitLogsResult.error ||
        expensesResult.error ||
        sleepResult.error ||
        healthResult.error ||
        journalResult.error ||
        prayerResult.error ||
        guardiansResult.error

      if (queryError) {
        throw queryError
      }

      const activeHabits = habitsResult.data?.length ?? 0
      const completedHabitIds = new Set((habitLogsResult.data ?? []).map((log) => log.habit_id))
      const completedHabits = completedHabitIds.size
      const todayExpenses = (expensesResult.data ?? []).reduce((total, transaction) => total + Number(transaction.amount ?? 0), 0)
      const prayerLogs = prayerResult.data ?? []
      const guardians = guardiansResult.data ?? []

      if (isMounted) {
        setTodayData({
          activeHabits,
          completedHabits,
          pendingHabits: Math.max(activeHabits - completedHabits, 0),
          todayExpenses,
          sleepMinutes: sleepResult.data?.duration_minutes ?? null,
          latestWeightKg: healthResult.data?.weight_kg ? Number(healthResult.data.weight_kg) : null,
          journalEntriesToday: journalResult.data?.length ?? 0,
          prayersToday: prayerLogs.filter((log) => log.status === 'prayed').length,
          quranPagesToday: prayerLogs.reduce((total, log) => total + (log.status === 'prayed' ? Number(log.quran_pages ?? 0) : 0), 0),
          approvedGuardians: guardians.filter((guardian) => guardian.status === 'approved').length,
          pendingGuardians: guardians.filter((guardian) => guardian.status === 'pending').length,
        })
      }
    }

    loadTodayDashboard()
      .catch((error) => {
        if (isMounted) {
          setError(error instanceof Error ? error.message : 'Unable to load today’s dashboard.')
          setTodayData(emptyTodayData)
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const dailyScore = useMemo(() => {
    const habitScore = todayData.activeHabits ? (todayData.completedHabits / todayData.activeHabits) * 55 : 0
    const sleepScore = todayData.sleepMinutes ? Math.min(todayData.sleepMinutes / 480, 1) * 20 : 0
    const prayerScore = (todayData.prayersToday / 6) * 10
    const journalScore = todayData.journalEntriesToday > 0 ? 10 : 0
    const healthScore = todayData.latestWeightKg ? 10 : 0

    return Math.round(habitScore + sleepScore + prayerScore + journalScore + healthScore)
  }, [todayData])

  const cards: TodayCardProps[] = [
    {
      label: 'Daily score',
      value: isLoading ? '...' : `${dailyScore}%`,
      helper: todayData.activeHabits ? 'Based on habits, sleep, journal, and latest health signals.' : 'Add today’s first log to start building your score.',
      icon: Flame,
      tone: 'emerald',
    },
    {
      label: 'Habits completed today',
      value: isLoading ? '...' : `${todayData.completedHabits}/${todayData.activeHabits}`,
      helper: todayData.activeHabits ? 'Completed habit logs recorded for today.' : 'No active habits yet.',
      icon: CheckCircle2,
      tone: 'sky',
      actionLabel: 'Log',
      actionPath: '/habits',
    },
    {
      label: 'Pending habits',
      value: isLoading ? '...' : String(todayData.pendingHabits),
      helper: todayData.pendingHabits ? 'Habits still waiting for a check-in.' : 'Nothing pending right now.',
      icon: Activity,
      tone: 'amber',
      actionLabel: 'Open',
      actionPath: '/habits',
    },
    {
      label: "Today's expenses",
      value: isLoading ? '...' : todayData.todayExpenses ? formatMoney(todayData.todayExpenses) : 'No expenses',
      helper: todayData.todayExpenses ? 'Total expense transactions logged today.' : 'No spending logged for today.',
      icon: WalletCards,
      tone: 'rose',
      actionLabel: 'Add',
      actionPath: '/finance',
    },
    {
      label: 'Sleep duration',
      value: isLoading ? '...' : formatSleep(todayData.sleepMinutes),
      helper: todayData.sleepMinutes ? 'Latest sleep log for today.' : 'Add a sleep log to track recovery.',
      icon: BedDouble,
      tone: 'violet',
      actionLabel: 'Log',
      actionPath: '/sleep',
    },
    {
      label: 'Weight latest log',
      value: isLoading ? '...' : todayData.latestWeightKg ? `${todayData.latestWeightKg} kg` : 'No weight log',
      helper: todayData.latestWeightKg ? 'Most recent weight entry from health logs.' : 'No weight entry has been recorded yet.',
      icon: Scale,
      tone: 'slate',
      actionLabel: 'Log',
      actionPath: '/health',
    },
    {
      label: 'Journal status',
      value: isLoading ? '...' : todayData.journalEntriesToday ? 'Written' : 'Not written',
      helper: todayData.journalEntriesToday ? `${todayData.journalEntriesToday} journal entry recorded today.` : 'Capture one note before the day disappears.',
      icon: BookOpenText,
      tone: 'emerald',
      actionLabel: 'Write',
      actionPath: '/journal',
    },
    {
      label: 'Prayer status',
      value: isLoading ? '...' : `${todayData.prayersToday}/6`,
      helper: todayData.prayersToday ? `${todayData.quranPagesToday} Quran pages/ruku logged today.` : 'Log prayers and Quran recitation for today.',
      icon: MoonStar,
      tone: 'violet',
      actionLabel: 'Log',
      actionPath: '/prayer',
    },
    {
      label: 'Guardian status',
      value: isLoading ? '...' : todayData.approvedGuardians ? `${todayData.approvedGuardians} active` : 'Not shared',
      helper: todayData.pendingGuardians ? `${todayData.pendingGuardians} guardian invitation pending.` : 'Approved guardians will appear here.',
      icon: ShieldCheck,
      tone: 'sky',
      actionLabel: 'Manage',
      actionPath: '/guardian',
    },
  ]
  const visibleCards = readStringList(dashboardCardPreferenceKey, cards.map((card) => card.label))
  const visibleDashboardCards = cards.filter((card) => visibleCards.includes(card.label))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Today Dashboard"
        description="A focused readout of today’s habits, money, recovery, journal status, and guardian sharing."
      />

      {error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {visibleDashboardCards.map((card) => (
          <TodayCard key={card.label} {...card} />
        ))}
      </div>
    </div>
  )
}
