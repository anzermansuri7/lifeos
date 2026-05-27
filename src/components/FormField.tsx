type FormFieldProps = {
  label: string
  name: string
  type: string
  placeholder: string
  autoComplete?: string
  minLength?: number
}

export default function FormField({ label, name, type, placeholder, autoComplete, minLength }: FormFieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        minLength={minLength}
        className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-4 focus:ring-neutral-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white dark:focus:border-neutral-600 dark:focus:ring-neutral-800"
        required
      />
    </label>
  )
}
