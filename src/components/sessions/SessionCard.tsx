import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight } from 'lucide-react'
import { db, type Session } from '../../db'
import { formatDate, formatDuration } from '../../lib/utils'

export default function SessionCard({ session }: { session: Session }) {
  const navigate = useNavigate()
  const client = useLiveQuery(() => db.clients.get(session.clientId), [session.clientId])

  return (
    <button
      onClick={() => navigate(`/sessions/${session.id}`)}
      className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left transition-colors hover:bg-gray-50"
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium capitalize">{session.type}</p>
        <p className="text-xs text-gray-500 truncate">
          {client?.name ?? 'Unknown client'} &middot; {formatDate(session.date)}
          {session.duration != null && ` · ${formatDuration(session.duration)}`}
        </p>
        {session.exercises.length > 0 && (
          <p className="text-xs text-gray-400 truncate mt-0.5">
            {session.exercises.map((e) => e.name).join(', ')}
          </p>
        )}
      </div>
      <ChevronRight size={16} className="text-gray-400" />
    </button>
  )
}
