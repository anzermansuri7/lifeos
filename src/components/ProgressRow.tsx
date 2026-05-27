type ProgressRowProps = {
  label: string
  value: string
  percent: number
}

export default function ProgressRow({ label, value, percent }: ProgressRowProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-neutral-800 dark:text-neutral-200">{label}</span>
        <span className="text-neutral-500 dark:text-neutral-400">{value}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div className="h-full rounded-full bg-neutral-950 dark:bg-white" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
