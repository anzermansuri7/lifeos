type EmptyStateProps = {
  title: string
  description: string
}

export default function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 p-6 text-center dark:border-neutral-700">
      <p className="font-medium text-neutral-900 dark:text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-neutral-500 dark:text-neutral-400">{description}</p>
    </div>
  )
}
