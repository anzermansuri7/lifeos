import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import SectionCard from '../components/SectionCard'
import { getCurrentUser, supabase } from '../lib/supabaseClient'
import { formatMoney } from '../utils/format'
import { defaultFinanceCategories, financeCategoryPreferenceKey, readStringList } from '../utils/preferences'

type TransactionType = 'income' | 'expense'

type FinanceTransaction = {
  id: string
  transaction_date: string
  type: TransactionType
  category: string
  amount: number
  notes: string | null
}

const defaultTransaction = {
  type: 'expense' as TransactionType,
  category: '',
  amount: '',
  transaction_date: getLocalDate(),
  notes: '',
}

function getLocalDate(date = new Date()) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return offsetDate.toISOString().slice(0, 10)
}

function getMonthRange() {
  const now = new Date()
  return {
    start: getLocalDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    end: getLocalDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  }
}

function normalizeType(type: string): TransactionType {
  return type === 'income' ? 'income' : 'expense'
}

export default function Finance() {
  const [userId, setUserId] = useState('')
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([])
  const [transactionForm, setTransactionForm] = useState(defaultTransaction)
  const [financeCategoryOptions] = useState(() => readStringList(financeCategoryPreferenceKey, defaultFinanceCategories))
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadFinance() {
    const user = await getCurrentUser()

    if (!user) {
      setIsLoading(false)
      return
    }

    const { start, end } = getMonthRange()
    setUserId(user.id)
    setError('')

    const result = await supabase
      .from('finance_transactions')
      .select('id, transaction_date, type, category, amount, notes')
      .eq('user_id', user.id)
      .gte('transaction_date', start)
      .lte('transaction_date', end)
      .order('transaction_date', { ascending: false })

    if (result.error) {
      throw result.error
    }

    setTransactions((result.data ?? []).map((item) => ({ ...item, type: normalizeType(item.type), amount: Number(item.amount ?? 0) })))
    setIsLoading(false)
  }

  useEffect(() => {
    loadFinance().catch((error) => {
      setError(error instanceof Error ? error.message : 'Unable to load money check-ins.')
      setIsLoading(false)
    })
  }, [])

  const totals = useMemo(() => {
    const income = transactions.filter((item) => item.type === 'income').reduce((total, item) => total + item.amount, 0)
    const expenses = transactions.filter((item) => item.type === 'expense').reduce((total, item) => total + item.amount, 0)
    return { income, expenses, balance: income - expenses }
  }, [transactions])

  async function saveTransaction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!userId || !transactionForm.category.trim() || !transactionForm.amount) {
      setError('Type, category, and amount are required.')
      return
    }

    setIsSaving(true)
    setError('')

    const result = await supabase.from('finance_transactions').insert({
      user_id: userId,
      type: transactionForm.type,
      category: transactionForm.category.trim(),
      amount: Number(transactionForm.amount),
      transaction_date: transactionForm.transaction_date,
      payment_method: null,
      need_or_want: 'need',
      description: transactionForm.notes.trim() || null,
      notes: transactionForm.notes.trim() || null,
    })

    if (result.error) {
      setError(result.error.message)
      setIsSaving(false)
      return
    }

    setTransactionForm(defaultTransaction)
    await loadFinance()
    setIsSaving(false)
  }

  async function removeTransaction(id: string) {
    const result = await supabase.from('finance_transactions').delete().eq('id', id).eq('user_id', userId)

    if (result.error) {
      setError(result.error.message)
      return
    }

    await loadFinance()
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Money" description="A quick manual money check-in. No bank sync, budgets, debt dashboards, or charts." />

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">{error}</div> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Income" value={formatMoney(totals.income)} />
        <Metric label="Expenses" value={formatMoney(totals.expenses)} />
        <Metric label="Balance" value={formatMoney(totals.balance)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <SectionCard title="Quick money log">
          <form onSubmit={saveTransaction} className="space-y-4">
            <Select label="Type" value={transactionForm.type} onChange={(value) => setTransactionForm({ ...transactionForm, type: value as TransactionType })} />
            <Input label="Category" value={transactionForm.category} onChange={(value) => setTransactionForm({ ...transactionForm, category: value })} placeholder="Food, travel, salary" suggestions={financeCategoryOptions} />
            <Input label="Amount" type="number" value={transactionForm.amount} onChange={(value) => setTransactionForm({ ...transactionForm, amount: value })} placeholder="0" />
            <Input label="Date" type="date" value={transactionForm.transaction_date} onChange={(value) => setTransactionForm({ ...transactionForm, transaction_date: value })} placeholder="" />
            <Textarea label="Notes" value={transactionForm.notes} onChange={(value) => setTransactionForm({ ...transactionForm, notes: value })} placeholder="Optional. Keep it short." />
            <button type="submit" disabled={isSaving || !userId} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70 dark:bg-white dark:text-neutral-950">
              <Plus className="size-4" aria-hidden="true" />
              {isSaving ? 'Saving...' : 'Save check-in'}
            </button>
          </form>
        </SectionCard>

        <SectionCard title="This month">
          {isLoading ? <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading money logs...</p> : null}
          {!isLoading && transactions.length ? (
            <div className="space-y-2">
              {transactions.slice(0, 12).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-950 dark:text-white">{transaction.category}</p>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{transaction.transaction_date} - {transaction.type}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-semibold text-neutral-950 dark:text-white">{transaction.type === 'income' ? formatMoney(transaction.amount) : `-${formatMoney(transaction.amount)}`}</span>
                    <button type="button" onClick={() => removeTransaction(transaction.id)} className="grid size-8 place-items-center rounded-lg text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30" aria-label={`Delete ${transaction.category}`}>
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {!isLoading && !transactions.length ? <p className="rounded-lg border border-dashed border-neutral-300 p-5 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">No money logs this month.</p> : null}
        </SectionCard>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-2 text-xl font-semibold text-neutral-950 dark:text-white">{value}</p>
    </article>
  )
}

function Input({ label, value, onChange, placeholder, type = 'text', suggestions }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; suggestions?: string[] }) {
  const listId = suggestions?.length ? `${label.toLowerCase().replaceAll(' ', '-')}-money-options` : undefined

  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} list={listId} className="mt-2 w-full rounded-lg border border-neutral-200 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-neutral-400 dark:border-neutral-800" placeholder={placeholder} min={type === 'number' ? 0 : undefined} />
      {listId ? (
        <datalist id={listId}>
          {suggestions?.map((option) => <option key={option} value={option} />)}
        </datalist>
      ) : null}
    </label>
  )
}

function Select({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950">
        <option value="expense">Expense</option>
        <option value="income">Income</option>
      </select>
    </label>
  )
}

function Textarea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-20 w-full resize-none rounded-lg border border-neutral-200 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-neutral-400 dark:border-neutral-800" placeholder={placeholder} />
    </label>
  )
}
