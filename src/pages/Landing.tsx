import {
  Activity,
  BarChart3,
  BedDouble,
  BookOpenText,
  CheckCircle2,
  HeartPulse,
  Landmark,
  MoonStar,
  ShieldCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import ThemeToggle from '../components/ThemeToggle'

type ModuleCard = {
  title: string
  description: string
  icon: LucideIcon
}

const modules: ModuleCard[] = [
  { title: 'Today Dashboard', description: 'A daily command center for habits, money, health, sleep, journal, prayer, and accountability.', icon: CheckCircle2 },
  { title: 'Habits', description: 'Build useful habits, quit bad patterns, and track streaks with simple manual logs.', icon: Activity },
  { title: 'Money', description: 'Log income and expenses quickly without budgets, debt dashboards, charts, or bank integrations.', icon: Landmark },
  { title: 'Health', description: 'Log weight, water, meals, cravings, workouts, walking minutes, and notes manually.', icon: HeartPulse },
  { title: 'Sleep', description: 'Record sleep time, wake time, quality, phone usage, goals, and weekly patterns.', icon: BedDouble },
  { title: 'Journal', description: 'Capture daily moods, wins, failures, lessons, and tomorrow focus privately by default.', icon: BookOpenText },
  { title: 'Prayer', description: 'Log six daily prayers and Quran pages or ruku after each prayer.', icon: MoonStar },
  { title: 'Guardian', description: 'Invite trusted accountability partners and choose exactly what they can see.', icon: ShieldCheck },
  { title: 'Reports', description: 'Review all manual logs in one calendar-first view with clean date filters.', icon: BarChart3 },
]

const previewRows = [
  ['Fazar', 'Prayed', '5 pages'],
  ['Hydration', 'Done', '1 day streak'],
  ['Sleep', 'Good', '7h 45m'],
  ['Expense', 'Food', '₹240'],
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-white">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-neutral-50/95 px-4 py-4 backdrop-blur sm:px-8 dark:border-neutral-800 dark:bg-neutral-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Logo />
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/login" className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-white dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900">
              Log in
            </Link>
            <Link to="/signup" className="rounded-lg bg-neutral-950 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200">
              Register
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
          <div className="relative mx-auto grid min-h-[calc(100vh-72px)] max-w-7xl items-center gap-10 px-4 py-14 sm:px-8 lg:grid-cols-[1fr_520px]">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase text-neutral-500 dark:text-neutral-400">Free for all. Manual by design.</p>
              <h1 className="mt-5 max-w-4xl text-5xl font-semibold text-neutral-950 sm:text-6xl lg:text-7xl dark:text-white">
                Life OS
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-600 dark:text-neutral-300">
                A private personal operating system for tracking the daily things that actually shape your life.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/signup" className="inline-flex items-center justify-center rounded-lg bg-neutral-950 px-5 py-3 text-sm font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200">
                  Create free account
                </Link>
                <Link to="/login" className="inline-flex items-center justify-center rounded-lg border border-neutral-200 px-5 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900">
                  Log in
                </Link>
              </div>
            </div>

            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
              <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Today score</p>
                    <p className="mt-1 text-3xl font-semibold">86%</p>
                  </div>
                  <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">On track</span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <MiniStat label="Prayers" value="4/6" />
                  <MiniStat label="Habits" value="5/7" />
                  <MiniStat label="Sleep" value="7h 45m" />
                  <MiniStat label="Spend" value="₹240" />
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {previewRows.map(([title, status, value]) => (
                  <div key={title} className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-950">
                    <div>
                      <p className="font-semibold text-neutral-950 dark:text-white">{title}</p>
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{status}</p>
                    </div>
                    <span className="text-neutral-600 dark:text-neutral-300">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold text-neutral-950 dark:text-white">One place for daily tracking</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">No paid APIs, no bank sync, no wearable dependency, no external auth providers. Just manual tracking and clear records.</p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {modules.map((module) => (
              <ModuleCard key={module.title} {...module} />
            ))}
          </div>
        </section>

        <section className="border-t border-neutral-200 bg-white px-4 py-12 sm:px-8 dark:border-neutral-800 dark:bg-neutral-950">
          <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Start with a free account</h2>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">Life OS is built for manual self-tracking, reflection, and accountability.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/signup" className="inline-flex items-center justify-center rounded-lg bg-neutral-950 px-5 py-3 text-sm font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200">
                Register free
              </Link>
              <Link to="/login" className="inline-flex items-center justify-center rounded-lg border border-neutral-200 px-5 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900">
                Log in
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-neutral-100 p-3 dark:bg-neutral-800">
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-neutral-950 dark:text-white">{value}</p>
    </div>
  )
}

function ModuleCard({ title, description, icon: Icon }: ModuleCard) {
  return (
    <article className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="grid size-10 place-items-center rounded-lg bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-neutral-950 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">{description}</p>
    </article>
  )
}
