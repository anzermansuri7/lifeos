import { useEffect, useState } from 'react'

const storageKey = 'life-os-theme'

export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem(storageKey)

    if (savedTheme) {
      return savedTheme === 'dark'
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem(storageKey, isDark ? 'dark' : 'light')
  }, [isDark])

  return { isDark, setIsDark }
}
