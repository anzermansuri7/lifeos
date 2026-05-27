import type { ReactNode } from 'react'
import { cn } from '../utils/cn'

type SectionCardProps = {
  title?: string
  children: ReactNode
  className?: string
}

export default function SectionCard({ title, children, className }: SectionCardProps) {
  return (
    <section className={cn('rounded-lg border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900', className)}>
      {title ? <h2 className="mb-4 text-sm font-semibold text-neutral-950 dark:text-white">{title}</h2> : null}
      {children}
    </section>
  )
}
