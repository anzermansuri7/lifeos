import { useEffect, useMemo, useState } from 'react'
import { Check, Mail, ShieldCheck, UserCheck, X } from 'lucide-react'
import type { ReactNode } from 'react'
import PageHeader from '../components/PageHeader'
import SectionCard from '../components/SectionCard'
import { getCurrentUser, supabase } from '../lib/supabaseClient'
import { cn } from '../utils/cn'
import { formatMoney } from '../utils/format'

type GuardianStatus = 'pending' | 'approved' | 'revoked'
type PermissionSection = 'habits' | 'finance' | 'sleep' | 'health' | 'journal'

type GuardianInvite = {
  id: string
  user_id: string
  guardian_user_id: string | null
  guardian_email: string
  display_name: string | null
  permission_sections: PermissionSection[]
  status: GuardianStatus
  created_at: string
}

type Permission = {
  id: string
  guardian_id: string | null
  owner_user_id: string
  guardian_user_id: string
  section: PermissionSection
  can_read: boolean
  approved_at: string | null
}

type GuardianDashboardUser = {
  ownerId: string
  guardianId: string
  userName: string
  permissions: PermissionSection[]
  habitCompletion: string
  missedHabits: string
  sleepSummary: string
  financeSummary: string
  sharedJournalEntries: Array<{
    id: string
    entry_date: string
    title: string | null
    content: string
    mood: string | null
  }>
  weeklyProgress: string
}

const permissionOptions: Array<{ id: PermissionSection; label: string; description: string }> = [
  { id: 'habits', label: 'Habits', description: 'Habit checklist and status logs' },
  { id: 'finance', label: 'Finance summary', description: 'Summary totals only for MVP sharing' },
  { id: 'sleep', label: 'Sleep', description: 'Sleep duration and quality logs' },
  { id: 'health', label: 'Health', description: 'Health and workout logs' },
  { id: 'journal', label: 'Journal shared entries only', description: 'Only entries marked public to guardian' },
]

const defaultPermissions: PermissionSection[] = ['habits', 'sleep']

export default function Guardian() {
  const [userId, setUserId] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [guardianEmail, setGuardianEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionSection[]>(defaultPermissions)
  const [outgoing, setOutgoing] = useState<GuardianInvite[]>([])
  const [incoming, setIncoming] = useState<GuardianInvite[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [dashboardUsers, setDashboardUsers] = useState<GuardianDashboardUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadGuardianData() {
    const user = await getCurrentUser()

    if (!user?.email) {
      setIsLoading(false)
      return
    }

    setUserId(user.id)
    setUserEmail(user.email)
    setError('')

    const [outgoingResult, incomingResult, permissionsResult] = await Promise.all([
      supabase.from('guardians').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase
        .from('guardians')
        .select('*')
        .or(`guardian_user_id.eq.${user.id},guardian_email.eq.${user.email.toLowerCase()}`)
        .order('created_at', { ascending: false }),
      supabase.from('guardian_permissions').select('*').or(`owner_user_id.eq.${user.id},guardian_user_id.eq.${user.id}`),
    ])

    const queryError = outgoingResult.error || incomingResult.error || permissionsResult.error

    if (queryError) {
      throw queryError
    }

    const outgoingInvites = normalizeInvites(outgoingResult.data ?? [])
    const incomingInvites = normalizeInvites(incomingResult.data ?? []).filter((invite) => invite.user_id !== user.id)
    const permissionRows = (permissionsResult.data ?? []) as Permission[]

    setOutgoing(outgoingInvites)
    setIncoming(incomingInvites)
    setPermissions(permissionRows)
    setDashboardUsers(await loadGuardianDashboard(user.id, incomingInvites, permissionRows))
    setIsLoading(false)
  }

  useEffect(() => {
    loadGuardianData().catch((error) => {
      setError(error instanceof Error ? error.message : 'Unable to load guardian records.')
      setIsLoading(false)
    })
  }, [])

  const approvedCount = outgoing.filter((invite) => invite.status === 'approved').length
  const pendingCount = outgoing.filter((invite) => invite.status === 'pending').length
  const connectedUserCount = dashboardUsers.length

  const permissionsByGuardian = useMemo(() => {
    const map = new Map<string, Permission[]>()

    permissions.forEach((permission) => {
      if (!permission.guardian_id) {
        return
      }

      map.set(permission.guardian_id, [...(map.get(permission.guardian_id) ?? []), permission])
    })

    return map
  }, [permissions])

  async function inviteGuardian(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!userId || !guardianEmail.trim()) {
      setError('Guardian email is required.')
      return
    }

    setIsSaving(true)
    setError('')

    const result = await supabase.from('guardians').upsert(
      {
        user_id: userId,
        guardian_email: guardianEmail.trim().toLowerCase(),
        display_name: displayName.trim() || null,
        permission_sections: selectedPermissions,
        status: 'pending',
      },
      { onConflict: 'user_id,guardian_email' },
    )

    if (result.error) {
      setError(result.error.message)
      setIsSaving(false)
      return
    }

    setGuardianEmail('')
    setDisplayName('')
    setSelectedPermissions(defaultPermissions)
    await loadGuardianData()
    setIsSaving(false)
  }

  async function claimInvitation(invite: GuardianInvite) {
    setError('')
    const result = await supabase
      .from('guardians')
      .update({ guardian_user_id: userId })
      .eq('id', invite.id)
      .eq('guardian_email', userEmail.toLowerCase())
      .eq('status', 'pending')

    if (result.error) {
      setError(result.error.message)
      return
    }

    await loadGuardianData()
  }

  async function approveGuardian(invite: GuardianInvite) {
    if (!invite.guardian_user_id) {
      setError('The guardian must create an account or login and claim this invitation before approval.')
      return
    }

    setError('')

    const updateResult = await supabase
      .from('guardians')
      .update({ status: 'approved' })
      .eq('id', invite.id)
      .eq('user_id', userId)

    if (updateResult.error) {
      setError(updateResult.error.message)
      return
    }

    const rows = invite.permission_sections.map((section) => ({
      user_id: userId,
      owner_user_id: userId,
      guardian_id: invite.id,
      guardian_user_id: invite.guardian_user_id,
      section,
      can_read: true,
      approved_at: new Date().toISOString(),
    }))

    if (rows.length) {
      const permissionsResult = await supabase.from('guardian_permissions').upsert(rows, {
        onConflict: 'owner_user_id,guardian_user_id,section',
      })

      if (permissionsResult.error) {
        setError(permissionsResult.error.message)
        return
      }
    }

    await loadGuardianData()
  }

  async function revokeGuardian(invite: GuardianInvite) {
    setError('')

    const [inviteResult, permissionsResult] = await Promise.all([
      supabase.from('guardians').update({ status: 'revoked' }).eq('id', invite.id).eq('user_id', userId),
      supabase.from('guardian_permissions').delete().eq('guardian_id', invite.id).eq('owner_user_id', userId),
    ])

    const resultError = inviteResult.error || permissionsResult.error

    if (resultError) {
      setError(resultError.message)
      return
    }

    await loadGuardianData()
  }

  async function deleteGuardianPermanently(invite: GuardianInvite) {
    const confirmed = window.confirm('Permanently delete this guardian record? This removes the invitation and all related permissions.')

    if (!confirmed) {
      return
    }

    setError('')

    const [permissionsResult, inviteResult] = await Promise.all([
      supabase.from('guardian_permissions').delete().eq('guardian_id', invite.id).eq('owner_user_id', userId),
      supabase.from('guardians').delete().eq('id', invite.id).eq('user_id', userId),
    ])

    const resultError = permissionsResult.error || inviteResult.error

    if (resultError) {
      setError(resultError.message)
      return
    }

    await loadGuardianData()
  }

  async function updateInvitePermissions(invite: GuardianInvite, section: PermissionSection, enabled: boolean) {
    const nextPermissions = enabled
      ? Array.from(new Set([...invite.permission_sections, section]))
      : invite.permission_sections.filter((item) => item !== section)

    const updateResult = await supabase
      .from('guardians')
      .update({ permission_sections: nextPermissions })
      .eq('id', invite.id)
      .eq('user_id', userId)

    if (updateResult.error) {
      setError(updateResult.error.message)
      return
    }

    if (invite.status === 'approved' && invite.guardian_user_id) {
      if (enabled) {
        const permissionResult = await supabase.from('guardian_permissions').upsert(
          {
            user_id: userId,
            owner_user_id: userId,
            guardian_id: invite.id,
            guardian_user_id: invite.guardian_user_id,
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
          .eq('guardian_id', invite.id)
          .eq('owner_user_id', userId)
          .eq('section', section)

        if (permissionResult.error) {
          setError(permissionResult.error.message)
          return
        }
      }
    }

    await loadGuardianData()
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Guardian" description="Invite trusted people for accountability, approve them in-app, and control exactly what they can read." />

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">{error}</div> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Approved guardians" value={String(approvedCount)} icon={<ShieldCheck className="size-5" />} />
        <Metric label="Pending sent" value={String(pendingCount)} icon={<Mail className="size-5" />} />
        <Metric label="Connected users" value={String(connectedUserCount)} icon={<UserCheck className="size-5" />} />
      </div>

      <SectionCard title="Guardian dashboard">
        {isLoading ? <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading guardian dashboard...</p> : null}
        {!isLoading && dashboardUsers.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {dashboardUsers.map((user) => (
              <article key={user.guardianId} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-950 dark:text-white">{user.userName}</h2>
                    <PermissionPills sections={user.permissions} />
                  </div>
                  <StatusBadge status="approved" />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <DashboardTile label="Today's habit completion" value={user.habitCompletion} />
                  <DashboardTile label="Missed habits" value={user.missedHabits} />
                  <DashboardTile label="Sleep summary" value={user.sleepSummary} />
                  <DashboardTile label="Money summary" value={user.financeSummary} />
                  <DashboardTile label="Weekly progress" value={user.weeklyProgress} className="sm:col-span-2" />
                </div>

                <div className="mt-4">
                  <p className="text-sm font-semibold text-neutral-950 dark:text-white">Shared journal entries</p>
                  {user.sharedJournalEntries.length ? (
                    <div className="mt-2 space-y-2">
                      {user.sharedJournalEntries.map((entry) => (
                        <div key={entry.id} className="rounded-lg bg-neutral-50 p-3 text-sm dark:bg-neutral-800">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium text-neutral-900 dark:text-white">{entry.title || entry.entry_date}</p>
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">{entry.mood || 'No mood'}</span>
                          </div>
                          <p className="mt-2 line-clamp-3 leading-6 text-neutral-600 dark:text-neutral-300">{entry.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 rounded-lg border border-dashed border-neutral-300 p-3 text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
                      No shared journal entries available.
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : null}
        {!isLoading && !dashboardUsers.length ? <EmptyState text="Approved connected users will appear here after they grant permissions." /> : null}
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <SectionCard title="Invite guardian">
          <form onSubmit={inviteGuardian} className="space-y-4">
            <Input label="Guardian email" type="email" value={guardianEmail} onChange={setGuardianEmail} placeholder="guardian@example.com" required />
            <Input label="Display name" value={displayName} onChange={setDisplayName} placeholder="Optional name" />

            <div>
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Permissions</p>
              <div className="mt-2 space-y-2">
                {permissionOptions.map((option) => (
                  <PermissionCheckbox
                    key={option.id}
                    label={option.label}
                    description={option.description}
                    checked={selectedPermissions.includes(option.id)}
                    onChange={(checked) => {
                      setSelectedPermissions((current) =>
                        checked ? Array.from(new Set([...current, option.id])) : current.filter((item) => item !== option.id),
                      )
                    }}
                  />
                ))}
              </div>
            </div>

            <button type="submit" disabled={isSaving || !userId} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70 dark:bg-white dark:text-neutral-950">
              <Mail className="size-4" aria-hidden="true" />
              {isSaving ? 'Creating invitation...' : 'Create invitation'}
            </button>

            <p className="text-xs leading-5 text-neutral-500 dark:text-neutral-400">
              No external email is sent yet. The guardian will see this invitation inside Life OS after signing up or logging in with the same email.
            </p>
          </form>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Pending invitations inside app">
            {isLoading ? <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading invitations...</p> : null}
            {!isLoading && incoming.length ? (
              <div className="space-y-3">
                {incoming.map((invite) => (
                  <article key={invite.id} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-neutral-950 dark:text-white">{invite.display_name || invite.guardian_email}</p>
                        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Invitation status: {invite.status}</p>
                      </div>
                      {invite.status === 'pending' && !invite.guardian_user_id ? (
                        <button type="button" onClick={() => claimInvitation(invite)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700 dark:border-neutral-800 dark:text-neutral-200">
                          <Check className="size-4" aria-hidden="true" />
                          Claim invite
                        </button>
                      ) : null}
                    </div>
                    <PermissionPills sections={invite.permission_sections} />
                  </article>
                ))}
              </div>
            ) : null}
            {!isLoading && !incoming.length ? <EmptyState text="No guardian invitations for this account." /> : null}
          </SectionCard>

          <SectionCard title="Your guardians">
            {isLoading ? <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading guardians...</p> : null}
            {!isLoading && outgoing.length ? (
              <div className="space-y-3">
                {outgoing.map((invite) => (
                  <article key={invite.id} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-neutral-950 dark:text-white">{invite.display_name || invite.guardian_email}</p>
                          <StatusBadge status={invite.status} />
                          {invite.guardian_user_id ? <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Account linked</span> : <span className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">Waiting for login</span>}
                        </div>
                        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{invite.guardian_email}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {invite.status === 'pending' ? (
                          <button type="button" onClick={() => approveGuardian(invite)} className="inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-3 py-2 text-sm font-semibold text-white dark:bg-white dark:text-neutral-950">
                            <Check className="size-4" aria-hidden="true" />
                            Approve
                          </button>
                        ) : null}
                        {invite.status === 'approved' ? (
                          <button type="button" onClick={() => revokeGuardian(invite)} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 dark:border-rose-900/60 dark:text-rose-300">
                            <X className="size-4" aria-hidden="true" />
                            Revoke
                          </button>
                        ) : null}
                        {invite.status === 'revoked' ? (
                          <button type="button" onClick={() => deleteGuardianPermanently(invite)} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50">
                            <X className="size-4" aria-hidden="true" />
                            Delete permanently
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 md:grid-cols-2">
                      {permissionOptions.map((option) => {
                        const activePermission = permissionsByGuardian.get(invite.id)?.some((permission) => permission.section === option.id && permission.can_read)
                        return (
                          <PermissionCheckbox
                            key={option.id}
                            label={option.label}
                            description={invite.status === 'approved' ? `${option.description}${activePermission ? ' - active' : ''}` : option.description}
                            checked={invite.permission_sections.includes(option.id)}
                            onChange={(checked) => updateInvitePermissions(invite, option.id, checked)}
                          />
                        )
                      })}
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
            {!isLoading && !outgoing.length ? <EmptyState text="Invite a guardian to start accountability sharing." /> : null}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

async function loadGuardianDashboard(currentUserId: string, incomingInvites: GuardianInvite[], permissions: Permission[]) {
  const approvedInvites = incomingInvites.filter((invite) => invite.status === 'approved' && invite.guardian_user_id === currentUserId)

  return Promise.all(
    approvedInvites.map(async (invite) => {
      const activePermissions = permissions
        .filter((permission) => permission.owner_user_id === invite.user_id && permission.guardian_user_id === currentUserId && permission.can_read && permission.approved_at)
        .map((permission) => permission.section)

      const profileResult = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', invite.user_id)
        .maybeSingle()

      const [habitSummary, sleepSummary, financeSummary, journalEntries] = await Promise.all([
        activePermissions.includes('habits') ? getHabitSummary(invite.user_id) : Promise.resolve({ habitCompletion: 'No permission', missedHabits: 'No permission', weeklyProgress: 'No permission' }),
        activePermissions.includes('sleep') ? getSleepSummary(invite.user_id) : Promise.resolve('No permission'),
        activePermissions.includes('finance') ? getFinanceSummary(invite.user_id) : Promise.resolve('No permission'),
        activePermissions.includes('journal') ? getSharedJournalEntries(invite.user_id) : Promise.resolve([]),
      ])

      return {
        ownerId: invite.user_id,
        guardianId: invite.id,
        userName: profileResult.data?.full_name || 'Connected user',
        permissions: activePermissions,
        habitCompletion: habitSummary.habitCompletion,
        missedHabits: habitSummary.missedHabits,
        sleepSummary,
        financeSummary,
        sharedJournalEntries: journalEntries,
        weeklyProgress: habitSummary.weeklyProgress,
      }
    }),
  )
}

async function getHabitSummary(ownerId: string) {
  const today = getLocalDate()
  const weekStart = getLocalDate(addDays(new Date(), -6))

  const [habitsResult, todayLogsResult, weekLogsResult] = await Promise.all([
    supabase.from('habits').select('id, name').eq('user_id', ownerId).eq('is_active', true),
    supabase.from('habit_logs').select('habit_id, status').eq('user_id', ownerId).eq('log_date', today),
    supabase.from('habit_logs').select('habit_id, status').eq('user_id', ownerId).gte('log_date', weekStart),
  ])

  if (habitsResult.error || todayLogsResult.error || weekLogsResult.error) {
    return { habitCompletion: 'Unavailable', missedHabits: 'Unavailable', weeklyProgress: 'Unavailable' }
  }

  const habits = habitsResult.data ?? []
  const todayDoneIds = new Set((todayLogsResult.data ?? []).filter((log) => ['done', 'partial'].includes(log.status)).map((log) => log.habit_id))
  const weeklyDone = (weekLogsResult.data ?? []).filter((log) => ['done', 'partial'].includes(log.status)).length
  const weeklyTarget = habits.length * 7

  return {
    habitCompletion: habits.length ? `${todayDoneIds.size}/${habits.length}` : 'No habits',
    missedHabits: habits.length ? String(Math.max(habits.length - todayDoneIds.size, 0)) : '0',
    weeklyProgress: weeklyTarget ? `${Math.round((weeklyDone / weeklyTarget) * 100)}% completed this week` : 'No weekly data',
  }
}

async function getSleepSummary(ownerId: string) {
  const weekStart = getLocalDate(addDays(new Date(), -6))

  const result = await supabase
    .from('sleep_logs')
    .select('sleep_date, duration_minutes, sleep_quality')
    .eq('user_id', ownerId)
    .gte('sleep_date', weekStart)
    .order('sleep_date', { ascending: false })

  if (result.error || !result.data?.length) {
    return result.error ? 'Unavailable' : 'No sleep logs'
  }

  const logs = result.data.filter((log) => log.duration_minutes)
  const average = logs.length ? Math.round(logs.reduce((total, log) => total + Number(log.duration_minutes ?? 0), 0) / logs.length) : null
  const latest = result.data[0]

  return `${minutesToLabel(average)} avg · latest ${minutesToLabel(latest.duration_minutes)} · ${latest.sleep_quality || 'unrated'}`
}

async function getFinanceSummary(ownerId: string) {
  const { start, end } = getMonthRange()
  const result = await supabase.rpc('get_guardian_finance_summary', {
    owner_id: ownerId,
    month_start: start,
    month_end: end,
  })

  if (result.error || !result.data?.length) {
    return result.error ? 'Unavailable' : 'No finance summary'
  }

  const summary = result.data[0]
  return `${formatMoney(Number(summary.monthly_expenses ?? 0))} expenses this month`
}

async function getSharedJournalEntries(ownerId: string) {
  const result = await supabase
    .from('journal_entries')
    .select('id, entry_date, title, content, mood')
    .eq('user_id', ownerId)
    .eq('is_private', false)
    .order('entry_date', { ascending: false })
    .limit(3)

  if (result.error) {
    return []
  }

  return result.data ?? []
}

function getLocalDate(date = new Date()) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return offsetDate.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

function getMonthRange() {
  const now = new Date()
  return {
    start: getLocalDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    end: getLocalDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  }
}

function minutesToLabel(minutes: number | null | undefined) {
  if (!minutes) {
    return 'No log'
  }

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

function normalizeInvites(data: unknown[]): GuardianInvite[] {
  return data.map((item) => {
    const invite = item as GuardianInvite
    return {
      ...invite,
      permission_sections: invite.permission_sections ?? [],
    }
  })
}

function Input({ label, value, onChange, placeholder, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-neutral-200 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-neutral-400 dark:border-neutral-800" placeholder={placeholder} required={required} />
    </label>
  )
}

function PermissionCheckbox({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 size-4 accent-neutral-950 dark:accent-white" />
      <span>
        <span className="block font-medium text-neutral-900 dark:text-white">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-neutral-500 dark:text-neutral-400">{description}</span>
      </span>
    </label>
  )
}

function PermissionPills({ sections }: { sections: PermissionSection[] }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {sections.map((section) => (
        <span key={section} className="rounded-md bg-neutral-100 px-2 py-1 text-xs capitalize text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{section === 'finance' ? 'finance summary' : section}</span>
      ))}
      {!sections.length ? <span className="text-sm text-neutral-500 dark:text-neutral-400">No permissions selected.</span> : null}
    </div>
  )
}

function StatusBadge({ status }: { status: GuardianStatus }) {
  return (
    <span className={cn('rounded-md px-2 py-1 text-xs capitalize', status === 'approved' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : status === 'revoked' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300')}>
      {status}
    </span>
  )
}

function DashboardTile({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn('rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800', className)}>
      <p className="text-xs font-medium uppercase text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-neutral-950 dark:text-white">{value}</p>
    </div>
  )
}

function Metric({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <article className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white">{value}</p>
        </div>
        <div className="grid size-10 place-items-center rounded-lg bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">{icon}</div>
      </div>
    </article>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 p-6 text-center dark:border-neutral-700">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{text}</p>
    </div>
  )
}

