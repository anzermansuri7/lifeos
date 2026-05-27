import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthFormShell from '../components/AuthFormShell'
import FormField from '../components/FormField'
import { signup } from '../lib/supabaseClient'

export default function Signup() {
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name')).trim()
    const email = String(form.get('email')).trim()
    const password = String(form.get('password'))

    if (!name) {
      setError('Please enter your name.')
      setIsSubmitting(false)
      return
    }

    try {
      await signup(name, email, password)
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to create an account.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthFormShell title="Create Life OS" description="Use email and password to start a clean workspace for your habits and decisions.">
      <form onSubmit={handleSubmit}>
        <fieldset disabled={isSubmitting} className="space-y-4">
          <FormField label="Name" name="name" type="text" placeholder="Your name" autoComplete="name" />
          <FormField label="Email" name="email" type="email" placeholder="you@example.com" autoComplete="email" />
          <FormField label="Password" name="password" type="password" placeholder="At least 6 characters" autoComplete="new-password" minLength={6} />
        </fieldset>

        {error ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-6 w-full rounded-lg bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
        >
          {isSubmitting ? 'Creating account...' : 'Sign up'}
        </button>

        <p className="mt-4 text-center text-sm text-neutral-600 dark:text-neutral-400">
          Already have an account? <Link className="font-medium text-neutral-950 underline-offset-4 hover:underline dark:text-white" to="/login">Log in</Link>
        </p>
      </form>
    </AuthFormShell>
  )
}
