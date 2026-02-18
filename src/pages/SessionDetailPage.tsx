import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Play, Check, RotateCcw, Copy } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { db, type Session, type Client } from '../db'
import { buildPyramidSteps } from '../stores/timerStore'
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

  const firstSet = session.sets[0]
  const reps = firstSet?.reps ?? 1
  const restDuration = firstSet?.restDuration ?? 0
  const isPyramid = firstSet?.timerMode === 'pyramid'

  async function startSession() {
    const sets = session.sets.map((set) => {
      const pyramidSteps =
        set.timerMode === 'pyramid' && set.stepIncrement && set.peakTime
          ? buildPyramidSteps(set.stepIncrement, set.peakTime)
          : []
      const reps = pyramidSteps.length > 0 ? pyramidSteps.length : set.reps
      return {
        ...set,
        reps,
        instanceData: Array.from({ length: reps }, () =>
          set.exercises.map(() => ({ completed: false })),
        ),
      }
    })
    await db.sessions.update(session.id, {
      sets,
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
            {isPyramid && ' · Pyramid'}
            {!isPyramid && reps > 1 && ` · ${reps} reps/set`}
            {restDuration > 0 && ` · ${formatDuration(restDuration)} rest`}
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
  const navigate = useNavigate()

  async function resumeSession() {
    // Reset completed status — put back to in_progress so the user can continue
    const sets = session.sets.map((s) => ({ ...s, completed: false }))
    await db.sessions.update(session.id, {
      sets,
      status: 'in_progress' as const,
      completedAt: undefined,
      duration: undefined,
    })
  }

  async function repeatSession() {
    // Clone the session plan with today's date, fresh status
    const newId = uuid()
    const sets = session.sets.map((set) => ({
      mode: set.mode,
      exercises: set.exercises.map((ex) => ({ ...ex, completed: false })),
      restDuration: set.restDuration,
      reps: set.reps,
      timerMode: set.timerMode,
      stepIncrement: set.stepIncrement,
      peakTime: set.peakTime,
      completed: false,
    }))
    await db.sessions.add({
      id: newId,
      clientId: session.clientId,
      type: session.type,
      date: new Date(),
      notes: session.notes,
      sets,
      status: 'planned' as const,
      createdAt: new Date(),
    })
    navigate(`/sessions/${newId}`)
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
            {session.duration != null && ` · ${formatDuration(session.duration)}`}
          </p>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {session.sets.map((set, setIdx) => (
          <section key={setIdx}>
            <h2 className="mb-2 text-sm font-semibold text-gray-700">
              Set {setIdx + 1}
              {set.restDuration > 0 && (
                <span className="font-normal text-gray-400"> · {formatDuration(set.restDuration)} rest</span>
              )}
            </h2>
            {(set.instanceData ?? [[]]).map((repExercises, repIdx) => (
              <div key={repIdx} className="mb-3">
                {(set.reps > 1 || (set.instanceData?.length ?? 0) > 1) && (
                  <p className="mb-1 text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Round {repIdx + 1}
                  </p>
                )}
                <ul className="space-y-2">
                  {set.exercises.map((ex, exIdx) => {
                    const instance = repExercises[exIdx]
                    return (
                      <li
                        key={exIdx}
                        className={cn(
                          'rounded-lg border bg-white p-3',
                          instance?.completed ? 'border-green-200' : 'border-gray-200',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {instance?.completed && (
                            <Check size={14} className="text-green-500 shrink-0" />
                          )}
                          <p className="font-medium text-sm">{ex.name}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {[
                            instance?.actualReps && `${instance.actualReps} reps`,
                            instance?.actualWeight && `${instance.actualWeight}kg`,
                            instance?.actualDuration && `${instance.actualDuration}s`,
                          ]
                            .filter(Boolean)
                            .join(' · ') || (
                            [
                              ex.targetReps && `${ex.targetReps} reps`,
                              ex.targetWeight && `${ex.targetWeight}kg`,
                              ex.targetDuration && `${ex.targetDuration}s`,
                            ]
                              .filter(Boolean)
                              .join(' · ')
                          )}
                          {ex.targetReps && instance?.actualReps && instance.actualReps !== ex.targetReps && (
                            <span className="text-gray-400"> (target: {ex.targetReps})</span>
                          )}
                          {ex.targetWeight && instance?.actualWeight && instance.actualWeight !== ex.targetWeight && (
                            <span className="text-gray-400"> (target: {ex.targetWeight}kg)</span>
                          )}
                        </p>
                        {instance?.notes && (
                          <p className="mt-1 text-xs text-gray-400">{instance.notes}</p>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </section>
        ))}
        {session.notes && (
          <section>
            <h2 className="mb-1 text-sm font-semibold text-gray-700">Notes</h2>
            <p className="text-sm text-gray-600">{session.notes}</p>
          </section>
        )}
      </div>

      <div className="border-t border-gray-200 bg-white p-4 flex gap-3">
        <button
          onClick={resumeSession}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <RotateCcw size={16} />
          Resume
        </button>
        <button
          onClick={repeatSession}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
        >
          <Copy size={16} />
          Repeat
        </button>
      </div>
    </div>
  )
}
