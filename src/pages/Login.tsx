import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthFormShell from '../components/AuthFormShell'
import FormField from '../components/FormField'
import { login } from '../lib/supabaseClient'

export default function Login() {
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname ?? '/dashboard'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email')).trim()
    const password = String(form.get('password'))

    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to log in.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthFormShell title="Welcome back" description="Sign in with your email and password to continue tracking your life systems.">
      <form onSubmit={handleSubmit}>
        <fieldset disabled={isSubmitting} className="space-y-4">
          <FormField label="Email" name="email" type="email" placeholder="you@example.com" autoComplete="email" />
          <FormField label="Password" name="password" type="password" placeholder="Enter your password" autoComplete="current-password" />
        </fieldset>

        {error ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-6 w-full rounded-lg bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
        >
          {isSubmitting ? 'Logging in...' : 'Log in'}
        </button>

        <p className="mt-4 text-center text-sm text-neutral-600 dark:text-neutral-400">
          New here? <Link className="font-medium text-neutral-950 underline-offset-4 hover:underline dark:text-white" to="/signup">Create an account</Link>
        </p>
      </form>
    </AuthFormShell>
  )
}
