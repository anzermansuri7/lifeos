import { useEffect, useState } from 'react'
import { Download, Save, ShieldAlert, Trash2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import SectionCard from '../components/SectionCard'
import ThemeToggle from '../components/ThemeToggle'
import { getCurrentUser, supabase } from '../lib/supabaseClient'
import { cn } from '../utils/cn'
import { defaultTimezone } from '../utils/format'
import {
  dashboardCardPreferenceKey,
  defaultFinanceCategories,
  defaultHabitCategories,
  financeCategoryPreferenceKey,
  habitCategoryPreferenceKey,
  readStringList,
} from '../utils/preferences'

type PermissionSection = 'habits' | 'finance' | 'sleep' | 'health' | 'journal'

type GuardianInvite = {
  id: string
  user_id: string
  guardian_user_id: string | null
  guardian_email: string
  display_name: string | null
  permission_sections: PermissionSection[]
  status: 'pending' | 'approved' | 'revoked'
}

const dashboardCards = [
  'Daily score',
  'Habits completed today',
  'Pending habits',
  "Today's expenses",
  'Sleep duration',
  'Weight latest log',
  'Journal status',
  'Prayer status',
  'Guardian status',
]

const guardianPermissions: Array<{ id: PermissionSection; label: string }> = [
  { id: 'habits', label: 'Habits' },
  { id: 'finance', label: 'Finance summary' },
  { id: 'sleep', label: 'Sleep' },
  { id: 'health', label: 'Health' },
  { id: 'journal', label: 'Journal shared entries only' },
]

const exportTables = [
  'profiles',
  'habits',
  'habit_logs',
  'quit_habits',
  'quit_habit_logs',
  'finance_transactions',
  'health_logs',
  'sleep_logs',
  'journal_entries',
  'prayer_logs',
  'guardians',
  'guardian_permissions',
]

export default function Settings() {
  const [userId, setUserId] = useState('')
  const [profile, setProfile] = useState({ full_name: '', avatar_url: '', timezone: defaultTimezone })
  const [visibleCards, setVisibleCards] = useState<string[]>(() => readStringList(dashboardCardPreferenceKey, dashboardCards))
  const [financeCategories, setFinanceCategories] = useState<string[]>(() => readStringList(financeCategoryPreferenceKey, defaultFinanceCategories))
  const [habitCategories, setHabitCategories] = useState<string[]>(() => readStringList(habitCategoryPreferenceKey, defaultHabitCategories))
  const [newFinanceCategory, setNewFinanceCategory] = useState('')
  const [newHabitCategory, setNewHabitCategory] = useState('')
  const [guardians, setGuardians] = useState<GuardianInvite[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function loadSettings() {
    const user = await getCurrentUser()

    if (!user) {
      setIsLoading(false)
      return
    }

    setUserId(user.id)
    setError('')

    const [profileResult, guardiansResult] = await Promise.all([
      supabase.from('profiles').select('full_name, avatar_url, timezone').eq('user_id', user.id).maybeSingle(),
      supabase.from('guardians').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ])

    if (profileResult.error) {
      throw profileResult.error
    }

    if (guardiansResult.error) {
      throw guardiansResult.error
    }

    if (profileResult.data) {
      setProfile({
        full_name: profileResult.data.full_name ?? '',
        avatar_url: profileResult.data.avatar_url ?? '',
        timezone: profileResult.data.timezone ?? defaultTimezone,
      })
    }

    setGuardians((guardiansResult.data ?? []).map((guardian) => ({
      ...guardian,
      permission_sections: guardian.permission_sections ?? [],
    })))
    setIsLoading(false)
  }

  useEffect(() => {
    loadSettings().catch((error) => {
      setError(error instanceof Error ? error.message : 'Unable to load settings.')
      setIsLoading(false)
    })
  }, [])

  useEffect(() => {
    localStorage.setItem(dashboardCardPreferenceKey, JSON.stringify(visibleCards))
  }, [visibleCards])

  useEffect(() => {
    localStorage.setItem(financeCategoryPreferenceKey, JSON.stringify(financeCategories))
  }, [financeCategories])

  useEffect(() => {
    localStorage.setItem(habitCategoryPreferenceKey, JSON.stringify(habitCategories))
  }, [habitCategories])

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setMessage('')
    setError('')

    const result = await supabase.from('profiles').upsert({
      user_id: userId,
      full_name: profile.full_name.trim() || null,
      avatar_url: profile.avatar_url.trim() || null,
      timezone: profile.timezone.trim() || defaultTimezone,
    })

    if (result.error) {
      setError(result.error.message)
      setIsSaving(false)
      return
    }

    setMessage('Profile updated.')
    setIsSaving(false)
  }

  async function updateGuardianPermission(guardian: GuardianInvite, section: PermissionSection, enabled: boolean) {
    const nextSections = enabled
      ? Array.from(new Set([...guardian.permission_sections, section]))
      : guardian.permission_sections.filter((item) => item !== section)

    const guardianResult = await supabase
      .from('guardians')
      .update({ permission_sections: nextSections })
      .eq('id', guardian.id)
      .eq('user_id', userId)

    if (guardianResult.error) {
      setError(guardianResult.error.message)
      return
    }

    if (guardian.status === 'approved' && guardian.guardian_user_id) {
      if (enabled) {
        const permissionResult = await supabase.from('guardian_permissions').upsert(
          {
            user_id: userId,
            owner_user_id: userId,
            guardian_id: guardian.id,
            guardian_user_id: guardian.guardian_user_id,
            section,
            can_read: true,
            approved_at: new Date().toISOString(),
          },
          { onConflict: 'owner_user_id,guardian_user_id,section' },
        )

        if (permissionResult.error) {
          setError(permissionResult.error.message)
          return
        }
      } else {
        const permissionResult = await supabase
          .from('guardian_permissions')
          .delete()
          .eq('guardian_id', guardian.id)
          .eq('owner_user_id', userId)
          .eq('section', section)

        if (permissionResult.error) {
          setError(permissionResult.error.message)
          return
        }
      }
    }

    await loadSettings()
  }

  async function exportCsv() {
    setIsExporting(true)
    setError('')

    const rows: Record<string, unknown>[] = []

    for (const table of exportTables) {
      const result = await supabase.from(table).select('*').eq('user_id', userId)

      if (result.error) {
        setError(`Could not export ${table}: ${result.error.message}`)
        setIsExporting(false)
        return
      }

      ;(result.data ?? []).forEach((row) => rows.push({ table, ...row }))
    }

    const csv = toCsv(rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `life-os-export-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    setIsExporting(false)
  }

  function addCategory(type: 'finance' | 'habit') {
    if (type === 'finance' && newFinanceCategory.trim()) {
      setFinanceCategories((current) => Array.from(new Set([...current, newFinanceCategory.trim()])))
      setNewFinanceCategory('')
    }

    if (type === 'habit' && newHabitCategory.trim()) {
      setHabitCategories((current) => Array.from(new Set([...current, newHabitCategory.trim()])))
      setNewHabitCategory('')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your profile, preferences, categories, guardian access, exports, and account safety." />

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">{error}</div> : null}
      {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">{message}</div> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Profile update">
          <form onSubmit={saveProfile} className="space-y-4">
            <Input label="Full name" value={profile.full_name} onChange={(value) => setProfile({ ...profile, full_name: value })} placeholder="Your name" />
            <Input label="Avatar URL" value={profile.avatar_url} onChange={(value) => setProfile({ ...profile, avatar_url: value })} placeholder="https://..." />
            <Input label="Timezone" value={profile.timezone} onChange={(value) => setProfile({ ...profile, timezone: value })} placeholder="Asia/Kolkata" />
            <button type="submit" disabled={isSaving || !userId} className="inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70 dark:bg-white dark:text-neutral-950">
              <Save className="size-4" aria-hidden="true" />
              {isSaving ? 'Saving...' : 'Save profile'}
            </button>
          </form>
        </SectionCard>

        <SectionCard title="Appearance">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-white">Dark mode</p>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Switch between light and dark mode.</p>
            </div>
            <ThemeToggle />
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Dashboard card visibility">
          <div className="grid gap-2 sm:grid-cols-2">
            {dashboardCards.map((card) => (
              <CheckRow
                key={card}
                label={card}
                checked={visibleCards.includes(card)}
                onChange={(checked) => setVisibleCards((current) => checked ? [...current, card] : current.filter((item) => item !== card))}
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Custom categories">
          <div className="grid gap-5 md:grid-cols-2">
            <CategoryEditor title="Finance" categories={financeCategories} value={newFinanceCategory} onValueChange={setNewFinanceCategory} onAdd={() => addCategory('finance')} onRemove={(category) => setFinanceCategories((current) => current.filter((item) => item !== category))} />
            <CategoryEditor title="Habits" categories={habitCategories} value={newHabitCategory} onValueChange={setNewHabitCategory} onAdd={() => addCategory('habit')} onRemove={(category) => setHabitCategories((current) => current.filter((item) => item !== category))} />
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Guardian permission management">
        {isLoading ? <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading guardians...</p> : null}
        {!isLoading && guardians.length ? (
          <div className="space-y-4">
            {guardians.map((guardian) => (
              <article key={guardian.id} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-neutral-950 dark:text-white">{guardian.display_name || guardian.guardian_email}</p>
                    <p className="mt-1 text-sm capitalize text-neutral-500 dark:text-neutral-400">{guardian.status}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {guardianPermissions.map((permission) => (
                    <CheckRow
                      key={permission.id}
                      label={permission.label}
                      checked={guardian.permission_sections.includes(permission.id)}
                      onChange={(checked) => updateGuardianPermission(guardian, permission.id, checked)}
                    />
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : null}
        {!isLoading && !guardians.length ? <p className="text-sm text-neutral-500 dark:text-neutral-400">No guardians invited yet.</p> : null}
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Export data as CSV">
          <div className="space-y-4">
            <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-400">Download a manual CSV export of your Life OS data that is accessible to your account.</p>
            <button type="button" onClick={exportCsv} disabled={isExporting || !userId} className="inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70 dark:bg-white dark:text-neutral-950">
              <Download className="size-4" aria-hidden="true" />
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Delete account warning">
          <div className="space-y-4">
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <ShieldAlert className="size-4" aria-hidden="true" />
                Permanent action
              </div>
              Deleting an account can remove profile, tracking, guardian, and report data. This MVP only shows the warning UI and does not perform account deletion.
            </div>
            <Input label="Type DELETE to acknowledge" value={deleteConfirm} onChange={setDeleteConfirm} placeholder="DELETE" />
            <button type="button" disabled={deleteConfirm !== 'DELETE'} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900/60 dark:text-rose-300">
              <Trash2 className="size-4" aria-hidden="true" />
              Delete account disabled in MVP
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) {
    return 'table\n'
  }

  const headers = Array.from(rows.reduce((keys, row) => {
    Object.keys(row).forEach((key) => keys.add(key))
    return keys
  }, new Set<string>()))

  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)
    return `"${text.replaceAll('"', '""')}"`
  }

  return [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n')
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-neutral-200 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-neutral-400 dark:border-neutral-800" placeholder={placeholder} />
    </label>
  )
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-11 items-center gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 dark:border-neutral-800 dark:text-neutral-300">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-neutral-950 dark:accent-white" />
      {label}
    </label>
  )
}

function CategoryEditor({ title, categories, value, onValueChange, onAdd, onRemove }: { title: string; categories: string[]; value: string; onValueChange: (value: string) => void; onAdd: () => void; onRemove: (category: string) => void }) {
  return (
    <div>
      <p className="text-sm font-semibold text-neutral-950 dark:text-white">{title}</p>
      <div className="mt-3 flex gap-2">
        <input value={value} onChange={(event) => onValueChange(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-400 dark:border-neutral-800" placeholder="New category" />
        <button type="button" onClick={onAdd} className="rounded-lg bg-neutral-950 px-3 py-2 text-sm font-semibold text-white dark:bg-white dark:text-neutral-950">Add</button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {categories.map((category) => (
          <button key={category} type="button" onClick={() => onRemove(category)} className={cn('rounded-md bg-neutral-100 px-2 py-1 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300')}>
            {category} ×
          </button>
        ))}
      </div>
    </div>
  )
}
