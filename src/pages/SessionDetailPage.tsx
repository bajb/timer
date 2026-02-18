import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Play, Check } from 'lucide-react'
import { db, type Session, type Client } from '../db'
import { formatDate, formatDuration, cn } from '../lib/utils'
import LiveSessionView from '../components/sessions/LiveSessionView'

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

  if (session.status === 'in_progress') {
    return <LiveSessionView session={session} />
  }

  if (session.status === 'planned') {
    return <PlannedView session={session} client={client} onBack={() => navigate(-1)} />
  }

  return <CompletedView session={session} client={client} onBack={() => navigate(-1)} />
}

// --- Planned View ---

function PlannedView({
  session,
  client,
  onBack,
}: {
  session: Session
  client?: Client
  onBack: () => void
}) {
  const exercises = session.sets[0]?.exercises ?? []

  async function startSession() {
    await db.sessions.update(session.id, {
      status: 'in_progress' as const,
      startedAt: new Date(),
    })
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <button onClick={onBack} className="text-gray-500 md:hidden">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-semibold capitalize">{session.type} Session</h1>
          <p className="text-sm text-gray-500">
            {client?.name} &middot; {formatDate(session.date)}
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
          <p className="text-sm text-blue-700 font-medium">
            {session.sets.length} {session.sets.length === 1 ? 'set' : 'sets'} &middot;{' '}
            {exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'}
          </p>
        </div>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Exercises per set</h2>
          <ul className="space-y-2">
            {exercises.map((ex, i) => (
              <li key={i} className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="font-medium text-sm">{ex.name}</p>
                <p className="text-xs text-gray-500">
                  {[
                    ex.targetReps && `${ex.targetReps} reps`,
                    ex.targetWeight && `${ex.targetWeight}kg`,
                    ex.targetDuration && `${ex.targetDuration}s`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {session.notes && (
          <section>
            <h2 className="mb-1 text-sm font-semibold text-gray-700">Notes</h2>
            <p className="text-sm text-gray-600">{session.notes}</p>
          </section>
        )}
      </div>

      <div className="border-t border-gray-200 bg-white p-4">
        <button
          onClick={startSession}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
        >
          <Play size={18} />
          Start Session
        </button>
      </div>
    </div>
  )
}

// --- Completed View ---

function CompletedView({
  session,
  client,
  onBack,
}: {
  session: Session
  client?: Client
  onBack: () => void
}) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <button onClick={onBack} className="text-gray-500 md:hidden">
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
        {session.sets.map((set, setIdx) => (
          <section key={setIdx}>
            <h2 className="mb-2 text-sm font-semibold text-gray-700">
              Set {setIdx + 1}
            </h2>
            <ul className="space-y-2">
              {set.exercises.map((ex, exIdx) => (
                <li
                  key={exIdx}
                  className={cn(
                    'rounded-lg border bg-white p-3',
                    ex.completed ? 'border-green-200' : 'border-gray-200',
                  )}
                >
                  <div className="flex items-center gap-2">
                    {ex.completed && (
                      <Check size={14} className="text-green-500 shrink-0" />
                    )}
                    <p className="font-medium text-sm">{ex.name}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {[
                      ex.actualReps && `${ex.actualReps} reps`,
                      ex.actualWeight && `${ex.actualWeight}kg`,
                      ex.actualDuration && `${ex.actualDuration}s`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                    {ex.targetReps && ex.actualReps !== ex.targetReps && (
                      <span className="text-gray-400"> (target: {ex.targetReps})</span>
                    )}
                    {ex.targetWeight && ex.actualWeight !== ex.targetWeight && (
                      <span className="text-gray-400"> (target: {ex.targetWeight}kg)</span>
                    )}
                  </p>
                  {ex.notes && (
                    <p className="mt-1 text-xs text-gray-400">{ex.notes}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
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
