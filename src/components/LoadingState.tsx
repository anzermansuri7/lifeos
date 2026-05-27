type LoadingStateProps = {
  label?: string
}

export default function LoadingState({ label = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex min-h-24 items-center justify-center rounded-lg border border-neutral-200 bg-white p-6 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
      {label}
    </div>
  )
}
