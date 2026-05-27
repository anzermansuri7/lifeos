import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  description: string
  action?: ReactNode
}

export default function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">Life OS</p>
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-950 dark:text-white">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600 dark:text-neutral-400">{description}</p>
      </div>
      {action}
    </header>
  )
}
