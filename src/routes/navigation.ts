import {
  Activity,
  BarChart3,
  BedDouble,
  BookOpenText,
  HeartPulse,
  Home,
  Landmark,
  MoonStar,
  Settings,
  ShieldCheck,
} from 'lucide-react'
import type { NavItem } from '../types/navigation'

export const primaryNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: Home },
  { label: 'Habits', path: '/habits', icon: Activity },
  { label: 'Money', path: '/finance', icon: Landmark },
  { label: 'Health', path: '/health', icon: HeartPulse },
  { label: 'Sleep', path: '/sleep', icon: BedDouble },
  { label: 'Journal', path: '/journal', icon: BookOpenText },
  { label: 'Prayer', path: '/prayer', icon: MoonStar },
  { label: 'Guardian', path: '/guardian', icon: ShieldCheck },
  { label: 'Reports', path: '/reports', icon: BarChart3 },
  { label: 'Settings', path: '/settings', icon: Settings },
]

export const mobileNavItems: NavItem[] = [
  primaryNavItems[0],
  primaryNavItems[1],
  primaryNavItems[6],
  primaryNavItems[5],
  { label: 'More', path: '/settings', icon: BarChart3 },
]
