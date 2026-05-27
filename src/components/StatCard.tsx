import type { LucideIcon } from 'lucide-react'
import { cn } from '../utils/cn'

const tones = {
  emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  sky: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  violet: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
}

type StatCardProps = {
  label: string
  value: string
  helper: string
  icon: LucideIcon
  tone: keyof typeof tones
}

export default function StatCard({ label, value, helper, icon: Icon, tone }: StatCardProps) {
  return (
    <article className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white">{value}</p>
        </div>
        <div className={cn('grid size-10 place-items-center rounded-lg', tones[tone])}>
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">{helper}</p>
    </article>
  )
}
