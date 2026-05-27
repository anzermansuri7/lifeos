import { NavLink } from 'react-router-dom'
import Logo from './Logo'
import { primaryNavItems } from '../routes/navigation'
import { cn } from '../utils/cn'

export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-neutral-200 bg-white/90 px-4 py-5 backdrop-blur lg:flex lg:flex-col dark:border-neutral-800 dark:bg-neutral-950/90">
      <Logo />
      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {primaryNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                isActive
                  ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white',
              )
            }
          >
            <item.icon className="size-5" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-sm font-medium text-neutral-950 dark:text-white">Today’s focus</p>
        <p className="mt-1 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
          Review habits, protect sleep, and close one meaningful loop.
        </p>
      </div>
    </aside>
  )
}
