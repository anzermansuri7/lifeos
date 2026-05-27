import { NavLink } from 'react-router-dom'
import { mobileNavItems } from '../routes/navigation'
import { cn } from '../utils/cn'

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 px-2 py-2 backdrop-blur lg:hidden dark:border-neutral-800 dark:bg-neutral-950/95">
      <div className="grid grid-cols-4 gap-1">
        {mobileNavItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-xs font-medium transition',
                isActive
                  ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950'
                  : 'text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900',
              )
            }
          >
            <item.icon className="size-5" aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
