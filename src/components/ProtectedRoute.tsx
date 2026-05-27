import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getCurrentUser, supabase } from '../lib/supabaseClient'
import LoadingState from './LoadingState'

type AuthState = 'loading' | 'authenticated' | 'anonymous'

export default function ProtectedRoute() {
  const [authState, setAuthState] = useState<AuthState>('loading')
  const location = useLocation()

  useEffect(() => {
    let isMounted = true

    getCurrentUser().then((user) => {
      if (isMounted) {
        setAuthState(user ? 'authenticated' : 'anonymous')
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setAuthState(session?.user ? 'authenticated' : 'anonymous')
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (authState === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center bg-neutral-50 text-sm text-neutral-500 dark:bg-neutral-950 dark:text-neutral-400">
        <LoadingState label="Loading Life OS..." />
      </div>
    )
  }

  if (authState === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
