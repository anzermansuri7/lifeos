import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key'

if (import.meta.env.DEV && (supabaseUrl.includes('placeholder') || supabaseAnonKey.includes('placeholder'))) {
  console.warn('Supabase environment variables are not configured. Update .env.local before testing auth or data features.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function signup(name, email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
      },
    },
  })

  if (error) {
    throw error
  }

  if (data.user) {
    await supabase.from('profiles').upsert({
      user_id: data.user.id,
      full_name: name,
    })
  }

  return data
}

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    throw error
  }

  return data
}

export async function logout() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    return null
  }

  return user
}
