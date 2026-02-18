import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft } from 'lucide-react'
import { db } from '../db'
import { formatDate, formatDuration } from '../lib/utils'

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const session = useLiveQuery(() => (id ? db.sessions.get(id) : undefined), [id])
  const client = useLiveQuery(
    () => (session ? db.clients.get(session.clientId) : undefined),
    [session],
  )

  if (!session) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-400">
        Session not found
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 md:hidden">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-semibold capitalize">{session.type} Session</h1>
          <p className="text-sm text-gray-500">
            {client?.name} &middot; {formatDate(session.date)}
            {session.duration != null && ` · ${formatDuration(session.duration)}`}
          </p>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {session.exercises.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-gray-700">Exercises</h2>
            <ul className="space-y-2">
              {session.exercises.map((ex, i) => (
                <li key={i} className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="font-medium">{ex.name}</p>
                  <p className="text-sm text-gray-500">
                    {[
                      ex.sets && `${ex.sets} sets`,
                      ex.reps && `${ex.reps} reps`,
                      ex.weight && `${ex.weight}kg`,
                      ex.duration && `${ex.duration}s`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {ex.notes && <p className="mt-1 text-sm text-gray-400">{ex.notes}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}
        {session.notes && (
          <section>
            <h2 className="mb-1 text-sm font-semibold text-gray-700">Notes</h2>
            <p className="text-sm text-gray-600">{session.notes}</p>
          </section>
        )}
      </div>
    </div>
  )
}
