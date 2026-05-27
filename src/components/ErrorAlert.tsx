type ErrorAlertProps = {
  message: string
}

export default function ErrorAlert({ message }: ErrorAlertProps) {
  if (!message) {
    return null
  }

  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
      {message}
    </div>
  )
}
