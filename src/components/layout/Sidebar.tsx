import { NavLink } from 'react-router-dom'
import { Calendar, Timer, Settings } from 'lucide-react'
import { cn } from '../../lib/utils'

const links = [
  { to: '/sessions', icon: Calendar, label: 'Sessions' },
  { to: '/timer', icon: Timer, label: 'Timer' },
  { to: '/settings', icon: Settings, label: 'Settings' },
] as const

export default function Sidebar() {
  return (
    <aside className="hidden md:flex w-56 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-14 items-center px-4 font-semibold text-primary-600 text-lg">
        FitTrack
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50',
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
