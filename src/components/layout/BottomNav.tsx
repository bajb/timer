import { NavLink } from 'react-router-dom'
import { Calendar, Timer, Settings } from 'lucide-react'
import { cn } from '../../lib/utils'

const tabs = [
  { to: '/sessions', icon: Calendar, label: 'Sessions' },
  { to: '/timer', icon: Timer, label: 'Timer' },
  { to: '/settings', icon: Settings, label: 'Settings' },
] as const

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="flex h-14">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 text-xs transition-colors',
                isActive ? 'text-primary-600' : 'text-gray-500',
              )
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
