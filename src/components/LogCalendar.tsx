import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '../utils/cn'

export type CalendarLogTone = 'emerald' | 'sky' | 'amber' | 'rose' | 'violet' | 'neutral'

export type CalendarLog = {
  date: string
  title: string
  details?: string
  tone?: CalendarLogTone
}

type LogCalendarProps = {
  logs: CalendarLog[]
  emptyMessage?: string
}

const toneClasses: Record<CalendarLogTone, string> = {
  emerald: 'bg-emerald-500',
  sky: 'bg-sky-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  violet: 'bg-violet-500',
  neutral: 'bg-neutral-500',
}

const detailToneClasses: Record<CalendarLogTone, string> = {
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
  sky: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200',
  amber: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
  rose: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200',
  violet: 'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-200',
  neutral: 'border-neutral-200 bg-neutral-50 text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200',
}

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toDateKey(date: Date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return offsetDate.toISOString().slice(0, 10)
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(date)
}

function getMonthDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const leadingBlankDays = firstDay.getDay()
  const days = Array.from({ length: daysInMonth }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1))

  return {
    leadingBlankDays,
    days,
  }
}

function getRecentDays(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (count - 1 - index))
    return date
  })
}

export default function LogCalendar({ logs, emptyMessage = 'No logs for this month yet.' }: LogCalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const { leadingBlankDays, days } = getMonthDays(visibleMonth)
  const recentDays = getRecentDays(7)

  const logsByDate = useMemo(() => {
    return logs.reduce((map, log) => {
      const currentLogs = map.get(log.date) ?? []
      currentLogs.push(log)
      map.set(log.date, currentLogs)
      return map
    }, new Map<string, CalendarLog[]>())
  }, [logs])

  const selectedLogs = selectedDate ? logsByDate.get(selectedDate) ?? [] : []

  function changeMonth(offset: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
    setSelectedDate(null)
  }

  return (
    <div className="space-y-4">
      <div className="sm:hidden">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-neutral-950 dark:text-white">Last 7 days</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Tap a day</p>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {recentDays.map((day) => {
            const dateKey = toDateKey(day)
            const dayLogs = logsByDate.get(dateKey) ?? []
            const isSelected = dateKey === selectedDate
            const label = new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(day).slice(0, 1)

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => setSelectedDate(dateKey)}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-between rounded-lg border px-1.5 py-2 text-xs transition',
                  isSelected ? 'border-neutral-400 bg-neutral-100 text-neutral-950 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white' : 'border-neutral-200 text-neutral-700 dark:border-neutral-800 dark:text-neutral-300',
                )}
              >
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400">{label}</span>
                <span className="font-semibold">{day.getDate()}</span>
                <span className="flex max-w-full gap-0.5 overflow-hidden">
                  {dayLogs.slice(0, 3).map((log, index) => <span key={`${log.title}-${index}`} className={cn('size-1.5 rounded-full', toneClasses[log.tone ?? 'neutral'])} />)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="hidden items-center justify-between gap-3 sm:flex">
        <button type="button" onClick={() => changeMonth(-1)} className="grid size-9 place-items-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800" aria-label="Previous month">
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <p className="text-sm font-semibold text-neutral-950 dark:text-white">{monthLabel(visibleMonth)}</p>
        <button type="button" onClick={() => changeMonth(1)} className="grid size-9 place-items-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800" aria-label="Next month">
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="hidden grid-cols-7 gap-1 text-center text-[11px] font-medium text-neutral-500 sm:grid dark:text-neutral-400">
        {weekdayLabels.map((label) => <div key={label}>{label}</div>)}
      </div>

      <div className="hidden grid-cols-7 gap-1 sm:grid">
        {Array.from({ length: leadingBlankDays }, (_, index) => <div key={`blank-${index}`} className="aspect-square" />)}
        {days.map((day) => {
          const dateKey = toDateKey(day)
          const dayLogs = logsByDate.get(dateKey) ?? []
          const isToday = dateKey === toDateKey(new Date())
          const isSelected = dateKey === selectedDate

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => setSelectedDate(dateKey)}
              className={cn(
                'flex aspect-square min-h-10 flex-col items-center justify-between rounded-lg border p-1.5 text-xs transition',
                isSelected ? 'border-neutral-400 bg-neutral-100 text-neutral-950 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white' : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800',
                isToday && !isSelected ? 'ring-1 ring-neutral-950 dark:ring-white' : '',
              )}
            >
              <span>{day.getDate()}</span>
              <span className="flex max-w-full gap-0.5 overflow-hidden">
                {dayLogs.slice(0, 4).map((log, index) => <span key={`${log.title}-${index}`} className={cn('size-1.5 rounded-full', toneClasses[log.tone ?? 'neutral'])} />)}
              </span>
            </button>
          )
        })}
      </div>

      {selectedDate ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-neutral-950/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-5 shadow-xl dark:border-neutral-800 dark:bg-neutral-950">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Logs for</p>
                <h2 className="text-lg font-semibold text-neutral-950 dark:text-white">{selectedDate}</h2>
              </div>
              <button type="button" onClick={() => setSelectedDate(null)} className="grid size-9 place-items-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800" aria-label="Close calendar logs">
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
              {selectedLogs.length ? selectedLogs.map((log, index) => (
                <div key={`${log.title}-${index}`} className={cn('rounded-lg border p-3 text-sm', detailToneClasses[log.tone ?? 'neutral'])}>
                  <p className="font-semibold">{log.title}</p>
                  {log.details ? <p className="mt-1 opacity-80">{log.details}</p> : null}
                </div>
              )) : <p className="rounded-lg border border-dashed border-neutral-300 p-4 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">{emptyMessage}</p>}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
