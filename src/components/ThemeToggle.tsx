import { Moon, Sun } from 'lucide-react'
import { useDarkMode } from '../hooks/useDarkMode'

export default function ThemeToggle() {
  const { isDark, setIsDark } = useDarkMode()

  return (
    <button
      type="button"
      onClick={() => setIsDark(!isDark)}
      className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
    >
      {isDark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
      <span>{isDark ? 'Light' : 'Dark'}</span>
    </button>
  )
}
