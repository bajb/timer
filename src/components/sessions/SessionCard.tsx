import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight } from 'lucide-react'
import { db, type Session, type SessionStatus } from '../../db'
import { formatDate, formatDuration, cn } from '../../lib/utils'

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
  const client = useLiveQuery(() => db.clients.get(session.clientId), [session.clientId])

  const exerciseNames = session.sets[0]?.exercises
    .map((e) => e.name)
    .filter(Boolean)
    .join(', ')
  const setCount = session.sets.length
  const reps = session.sets[0]?.reps ?? 1
  const hasPyramid = session.sets.some((s) => s.timerMode === 'pyramid')

  return (
    <button
      onClick={() => navigate(`/sessions/${session.id}`)}
      className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left transition-colors hover:bg-gray-50"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium capitalize">{session.type}</p>
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
          {client?.name ?? 'Unknown client'} &middot; {formatDate(session.date)}
          {session.duration != null && ` · ${formatDuration(session.duration)}`}
        </p>
        {exerciseNames && (
          <p className="text-xs text-gray-400 truncate mt-0.5">
            {exerciseNames} &middot; {setCount} {setCount === 1 ? 'set' : 'sets'}
            {reps > 1 && ` · ${reps}x`}
            {hasPyramid && ' · Pyramid'}
          </p>
        )}
      </div>
      <ChevronRight size={16} className="text-gray-400" />
    </button>
  )
}
