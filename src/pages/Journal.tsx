import { useEffect, useMemo, useState } from 'react'
import { BookOpenText, Eye, EyeOff, Plus, Search } from 'lucide-react'
import LogCalendar from '../components/LogCalendar'
import PageHeader from '../components/PageHeader'
import SectionCard from '../components/SectionCard'
import { getCurrentUser, supabase } from '../lib/supabaseClient'
import { cn } from '../utils/cn'

type Mood = 'great' | 'good' | 'okay' | 'low' | 'hard'

type JournalEntry = {
  id: string
  user_id: string
  entry_date: string
  title: string | null
  content: string
  mood: Mood | null
  wins: string | null
  failures: string | null
  lessons_learned: string | null
  tomorrow_focus: string | null
  is_private: boolean
  created_at: string
}

const moodOptions: Array<[Mood, string]> = [
  ['great', 'Great'],
  ['good', 'Good'],
  ['okay', 'Okay'],
  ['low', 'Low'],
  ['hard', 'Hard'],
]

const defaultForm = {
  entry_date: getLocalDate(),
  title: '',
  mood: 'okay' as Mood,
  content: '',
  wins: '',
  failures: '',
  lessons_learned: '',
  tomorrow_focus: '',
  shared_with_guardian: false,
}

function getLocalDate(date = new Date()) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return offsetDate.toISOString().slice(0, 10)
}

export default function Journal() {
  const [userId, setUserId] = useState('')
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [form, setForm] = useState(defaultForm)
  const [filters, setFilters] = useState({ date: '', mood: 'all', shared: 'all' })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadJournal() {
    const user = await getCurrentUser()

    if (!user) {
      setIsLoading(false)
      return
    }

    setUserId(user.id)
    setError('')

    const result = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false })
      .limit(60)

    if (result.error) {
      throw result.error
    }

    const journalEntries = (result.data ?? []) as JournalEntry[]
    const todayEntry = journalEntries.find((entry) => entry.entry_date === getLocalDate())

    setEntries(journalEntries)
    setForm(todayEntry ? toForm(todayEntry) : defaultForm)
    setIsLoading(false)
  }

  useEffect(() => {
    loadJournal().catch((error) => {
      setError(error instanceof Error ? error.message : 'Unable to load journal entries.')
      setIsLoading(false)
    })
  }, [])

  const filteredEntries = useMemo(
    () =>
      entries.filter((entry) => {
        const matchesDate = filters.date ? entry.entry_date === filters.date : true
        const matchesMood = filters.mood === 'all' ? true : entry.mood === filters.mood
        const matchesShared =
          filters.shared === 'all'
            ? true
            : filters.shared === 'shared'
              ? !entry.is_private
              : entry.is_private

        return matchesDate && matchesMood && matchesShared
      }),
    [entries, filters],
  )
  const calendarLogs = useMemo(
    () =>
      entries.map((entry) => ({
        date: entry.entry_date,
        title: entry.title || 'Journal entry',
        details: `${entry.mood ?? 'No mood'} - ${entry.is_private ? 'Private' : 'Shared with guardian'}`,
        tone: entry.is_private ? 'neutral' as const : 'emerald' as const,
      })),
    [entries],
  )

  async function saveEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!userId || !form.content.trim()) {
      setError('Daily journal entry is required.')
      return
    }

    setIsSaving(true)
    setError('')

    const result = await supabase.from('journal_entries').upsert(
      {
        user_id: userId,
        entry_date: form.entry_date,
        title: form.title.trim() || null,
        content: form.content.trim(),
        mood: form.mood,
        wins: form.wins.trim() || null,
        failures: form.failures.trim() || null,
        lessons_learned: form.lessons_learned.trim() || null,
        tomorrow_focus: form.tomorrow_focus.trim() || null,
        is_private: !form.shared_with_guardian,
      },
      { onConflict: 'user_id,entry_date' },
    )

    if (result.error) {
      setError(result.error.message)
      setIsSaving(false)
      return
    }

    await loadJournal()
    setIsSaving(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Journal" description="Daily reflection with mood, wins, failures, lessons, and tomorrow's focus. Entries stay private by default." />

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <SectionCard title="Daily journal entry">
          <form onSubmit={saveEntry} className="grid gap-4 md:grid-cols-2">
            <Input label="Date" type="date" value={form.entry_date} onChange={(value) => setForm({ ...form, entry_date: value })} required />
            <Input label="Title" value={form.title} onChange={(value) => setForm({ ...form, title: value })} placeholder="Optional title" />

            <label className="block">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Mood</span>
              <select
                value={form.mood}
                onChange={(event) => setForm({ ...form, mood: event.target.value as Mood })}
                className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950"
              >
                {moodOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>

            <label className="flex min-h-11 items-center gap-3 self-end rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 dark:border-neutral-800 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={form.shared_with_guardian}
                onChange={(event) => setForm({ ...form, shared_with_guardian: event.target.checked })}
                className="size-4 accent-neutral-950 dark:accent-white"
              />
              Public to guardian
            </label>

            <Textarea label="Daily entry" value={form.content} onChange={(value) => setForm({ ...form, content: value })} placeholder="What happened today?" className="md:col-span-2" required />
            <Textarea label="Wins" value={form.wins} onChange={(value) => setForm({ ...form, wins: value })} placeholder="What went well?" />
            <Textarea label="Failures" value={form.failures} onChange={(value) => setForm({ ...form, failures: value })} placeholder="What did not go well?" />
            <Textarea label="Lessons learned" value={form.lessons_learned} onChange={(value) => setForm({ ...form, lessons_learned: value })} placeholder="What should you remember?" />
            <Textarea label="Tomorrow focus" value={form.tomorrow_focus} onChange={(value) => setForm({ ...form, tomorrow_focus: value })} placeholder="One thing for tomorrow." />

            <button type="submit" disabled={isSaving || !userId} className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70 md:col-span-2 dark:bg-white dark:text-neutral-950">
              <Plus className="size-4" aria-hidden="true" />
              {isSaving ? 'Saving...' : 'Save journal entry'}
            </button>
          </form>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Filters">
            <div className="space-y-4">
              <Input label="Date" type="date" value={filters.date} onChange={(value) => setFilters({ ...filters, date: value })} />
              <label className="block">
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Mood</span>
                <select value={filters.mood} onChange={(event) => setFilters({ ...filters, mood: event.target.value })} className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950">
                  <option value="all">All moods</option>
                  {moodOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Shared with guardian</span>
                <select value={filters.shared} onChange={(event) => setFilters({ ...filters, shared: event.target.value })} className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950">
                  <option value="all">All entries</option>
                  <option value="shared">Shared only</option>
                  <option value="private">Private only</option>
                </select>
              </label>
              <button type="button" onClick={() => setFilters({ date: '', mood: 'all', shared: 'all' })} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-700 dark:border-neutral-800 dark:text-neutral-200">
                <Search className="size-4" aria-hidden="true" />
                Clear filters
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Privacy">
            <div className="space-y-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
              <p className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800">Journal entries are private by default.</p>
              <p className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800">Turning on public-to-guardian makes the entry readable only to approved guardians with journal permission.</p>
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Journal calendar">
        <LogCalendar logs={calendarLogs} emptyMessage="No journal entry for this date." />
      </SectionCard>

      <SectionCard title="Journal history">
        {isLoading ? <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading journal entries...</p> : null}
        {!isLoading && filteredEntries.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {filteredEntries.map((entry) => (
              <article key={entry.id} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-neutral-950 dark:text-white">{entry.title || entry.entry_date}</p>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{entry.entry_date} · {entry.mood ?? 'No mood'}</p>
                  </div>
                  <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs', entry.is_private ? 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300')}>
                    {entry.is_private ? <EyeOff className="size-3" aria-hidden="true" /> : <Eye className="size-3" aria-hidden="true" />}
                    {entry.is_private ? 'Private' : 'Guardian'}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-neutral-700 dark:text-neutral-300">{entry.content}</p>
                <div className="mt-4 grid gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                  {entry.wins ? <Detail label="Wins" value={entry.wins} /> : null}
                  {entry.failures ? <Detail label="Failures" value={entry.failures} /> : null}
                  {entry.lessons_learned ? <Detail label="Lessons" value={entry.lessons_learned} /> : null}
                  {entry.tomorrow_focus ? <Detail label="Tomorrow" value={entry.tomorrow_focus} /> : null}
                </div>
              </article>
            ))}
          </div>
        ) : null}
        {!isLoading && !filteredEntries.length ? <EmptyState /> : null}
      </SectionCard>
    </div>
  )
}

function toForm(entry: JournalEntry) {
  return {
    entry_date: entry.entry_date,
    title: entry.title ?? '',
    mood: entry.mood ?? 'okay',
    content: entry.content,
    wins: entry.wins ?? '',
    failures: entry.failures ?? '',
    lessons_learned: entry.lessons_learned ?? '',
    tomorrow_focus: entry.tomorrow_focus ?? '',
    shared_with_guardian: !entry.is_private,
  }
}

function Input({ label, value, onChange, placeholder = '', type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-neutral-200 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-neutral-400 dark:border-neutral-800" placeholder={placeholder} required={required} />
    </label>
  )
}

function Textarea({ label, value, onChange, placeholder, className, required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; className?: string; required?: boolean }) {
  return (
    <label className={cn('block', className)}>
      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-28 w-full resize-none rounded-lg border border-neutral-200 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-neutral-400 dark:border-neutral-800" placeholder={placeholder} required={required} />
    </label>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800">
      <p className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-1 leading-6">{value}</p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 p-6 text-center dark:border-neutral-700">
      <BookOpenText className="mx-auto size-8 text-neutral-400" aria-hidden="true" />
      <p className="mt-3 font-medium text-neutral-900 dark:text-white">No journal entries found</p>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">Write an entry or adjust your filters.</p>
    </div>
  )
}
