export const dashboardCardPreferenceKey = 'life-os-dashboard-cards'
export const financeCategoryPreferenceKey = 'life-os-finance-categories'
export const habitCategoryPreferenceKey = 'life-os-habit-categories'

export const defaultFinanceCategories = ['Salary', 'Food', 'Rent', 'Transport', 'Health']
export const defaultHabitCategories = ['Health', 'Learning', 'Finance', 'Mindset']

export function readStringList(key: string, fallback: string[]) {
  try {
    const saved = localStorage.getItem(key)
    const parsed = saved ? JSON.parse(saved) : null

    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : fallback
  } catch {
    return fallback
  }
}
