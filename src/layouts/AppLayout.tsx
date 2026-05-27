import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import Logo from '../components/Logo'
import Sidebar from '../components/Sidebar'
import ThemeToggle from '../components/ThemeToggle'
import { logout } from '../lib/supabaseClient'

export default function AppLayout() {
  const [logoutError, setLogoutError] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const navigate = useNavigate()

  async function handleLogout() {
    setLogoutError('')
    setIsLoggingOut(true)

    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : 'Unable to log out.')
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-white">
      <Sidebar />
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-neutral-200 bg-neutral-50/85 px-4 py-3 backdrop-blur lg:px-8 dark:border-neutral-800 dark:bg-neutral-950/85">
          <div className="flex items-center justify-between gap-4">
            <div className="lg:hidden">
              <Logo />
            </div>
            <div className="hidden text-sm text-neutral-500 lg:block dark:text-neutral-400">Build the day with intent.</div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                <LogOut className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
              </button>
            </div>
          </div>
          {logoutError ? <p className="mt-2 text-right text-xs text-red-600 dark:text-red-300">{logoutError}</p> : null}
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-10">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
