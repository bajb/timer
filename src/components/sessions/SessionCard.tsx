import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { type Session, type SessionStatus } from '../../db'
import { formatDuration, cn } from '../../lib/utils'

const STATUS_BADGE: Record<SessionStatus, string> = {
  planned: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  completed: 'bg-green-50 text-green-700',
}

const STATUS_LABEL: Record<SessionStatus, string> = {
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Done',
}

export default function SessionCard({ session }: { session: Session }) {
  const navigate = useNavigate()

  // Each set's exercises, e.g. "Legs, Arms | Core, Back"
  const exerciseNames = session.sets
    .map((s) => s.exercises.map((e) => e.name).filter(Boolean).join(', '))
    .filter(Boolean)
    .join(' | ')
  const setCount = session.sets.length
  const hasPyramid = session.sets.some((s) => s.timerMode === 'pyramid')

  return (
    <button
      onClick={() => navigate(`/sessions/${session.id}`)}
      className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left transition-colors hover:bg-gray-50"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{session.name || <span className="capitalize">{session.type}</span>}</p>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              STATUS_BADGE[session.status],
            )}
          >
            {STATUS_LABEL[session.status]}
          </span>
        </div>
        <p className="text-xs text-gray-500 truncate">
          <span className="capitalize">{session.type}</span>
          {session.duration != null && ` · ${formatDuration(session.duration)}`}
        </p>
        {exerciseNames && (
          <p className="text-xs text-gray-400 truncate mt-0.5">
            {setCount} {setCount === 1 ? 'set' : 'sets'}
            {hasPyramid && ' · Pyramid'} &middot; {exerciseNames}
          </p>
        )}
      </div>
      <ChevronRight size={16} className="text-gray-400" />
    </button>
  )
}
