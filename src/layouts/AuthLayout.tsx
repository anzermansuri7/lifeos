import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import Logo from '../components/Logo'
import ThemeToggle from '../components/ThemeToggle'
import { getCurrentUser } from '../lib/supabaseClient'

type AuthCheckState = 'loading' | 'authenticated' | 'anonymous'

export default function AuthLayout() {
  const [authState, setAuthState] = useState<AuthCheckState>('loading')

  useEffect(() => {
    let isMounted = true

    getCurrentUser().then((user) => {
      if (isMounted) {
        setAuthState(user ? 'authenticated' : 'anonymous')
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  if (authState === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center bg-neutral-50 text-sm text-neutral-500 dark:bg-neutral-950 dark:text-neutral-400">
        Loading Life OS...
      </div>
    )
  }

  if (authState === 'authenticated') {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-white">
      <header className="flex items-center justify-between px-4 py-5 sm:px-8">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="grid min-h-[calc(100vh-88px)] place-items-center px-4 py-6 sm:py-10">
        <Outlet />
      </main>
    </div>
  )
}
