import type { ReactNode } from 'react'

type AuthFormShellProps = {
  title: string
  description: string
  children: ReactNode
}

export default function AuthFormShell({ title, description, children }: AuthFormShellProps) {
  return (
    <section className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-5 shadow-sm sm:p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-6">
        <p className="mb-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">Life OS</p>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">{description}</p>
      </div>
      {children}
    </section>
  )
}
