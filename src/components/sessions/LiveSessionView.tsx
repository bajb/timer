import { useState, useEffect } from 'react'
import { Check, ChevronDown, ChevronUp, Clock } from 'lucide-react'
import { db, type Session, type SessionExercise } from '../../db'
import { formatDuration, cn } from '../../lib/utils'

interface Props {
  session: Session
}

export default function LiveSessionView({ session }: Props) {
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)

  // Elapsed timer
  useEffect(() => {
    if (!session.startedAt) return
    const update = () => {
      setElapsed(Math.round((Date.now() - session.startedAt!.getTime()) / 1000))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [session.startedAt])

  const currentSetIndex = session.sets.findIndex((s) => !s.completed)
  const isLastSet = currentSetIndex === session.sets.length - 1 || currentSetIndex === -1
  const activeSetIdx = currentSetIndex === -1 ? session.sets.length - 1 : currentSetIndex
  const activeSet = session.sets[activeSetIdx]
  const allExercisesDone = activeSet?.exercises.every((e) => e.completed) ?? false

  async function toggleExercise(setIdx: number, exIdx: number) {
    const sets = session.sets.map((s, si) => {
      if (si !== setIdx) return s
      const exercises = s.exercises.map((ex, ei) => {
        if (ei !== exIdx) return ex
        const toggled = { ...ex, completed: !ex.completed }
        // Auto-fill actuals from targets when checking on
        if (toggled.completed) {
          toggled.actualReps ??= toggled.targetReps
          toggled.actualWeight ??= toggled.targetWeight
          toggled.actualDuration ??= toggled.targetDuration
        }
        return toggled
      })
      return {
        exercises,
        completed: exercises.every((e) => e.completed),
      }
    })
    await db.sessions.update(session.id, { sets })
  }

  async function updateExerciseActual(
    setIdx: number,
    exIdx: number,
    patch: Partial<SessionExercise>,
  ) {
    const sets = session.sets.map((s, si) => {
      if (si !== setIdx) return s
      return {
        ...s,
        exercises: s.exercises.map((ex, ei) =>
          ei === exIdx ? { ...ex, ...patch } : ex,
        ),
      }
    })
    await db.sessions.update(session.id, { sets })
  }

  async function startNextSet() {
    // Current set should already be marked completed via toggleExercise
    // Just collapse the expanded exercise
    setExpandedExercise(null)
  }

  async function completeSession() {
    const now = new Date()
    const duration = session.startedAt
      ? Math.round((now.getTime() - session.startedAt.getTime()) / 1000)
      : undefined
    await db.sessions.update(session.id, {
      status: 'completed' as const,
      completedAt: now,
      duration,
    })
  }

  const expandKey = (setIdx: number, exIdx: number) => `${setIdx}-${exIdx}`

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold capitalize">{session.type} Session</h1>
          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-600">
            <Clock size={14} />
            {formatDuration(elapsed)}
          </div>
        </div>
        {/* Set progress dots */}
        <div className="mt-2 flex items-center gap-1.5">
          {session.sets.map((s, i) => (
            <div
              key={i}
              className={cn(
                'h-2 flex-1 rounded-full transition-colors',
                s.completed
                  ? 'bg-green-500'
                  : i === activeSetIdx
                    ? 'bg-primary-500'
                    : 'bg-gray-200',
              )}
            />
          ))}
        </div>
      </header>

      {/* Current set */}
      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">
          Set {activeSetIdx + 1} of {session.sets.length}
        </h2>

        <div className="space-y-2">
          {activeSet?.exercises.map((ex, exIdx) => {
            const key = expandKey(activeSetIdx, exIdx)
            const isExpanded = expandedExercise === key

            return (
              <div
                key={exIdx}
                className={cn(
                  'rounded-xl border bg-white transition-colors',
                  ex.completed ? 'border-green-200 bg-green-50/50' : 'border-gray-200',
                )}
              >
                {/* Exercise row */}
                <div className="flex items-center gap-3 p-3">
                  <button
                    onClick={() => toggleExercise(activeSetIdx, exIdx)}
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                      ex.completed
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-gray-300',
                    )}
                  >
                    {ex.completed && <Check size={14} />}
                  </button>
                  <button
                    onClick={() => setExpandedExercise(isExpanded ? null : key)}
                    className="flex flex-1 items-center justify-between min-w-0"
                  >
                    <div className="text-left min-w-0">
                      <p
                        className={cn(
                          'font-medium text-sm',
                          ex.completed && 'line-through text-gray-400',
                        )}
                      >
                        {ex.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {[
                          ex.targetReps && `${ex.actualReps ?? ex.targetReps} reps`,
                          ex.targetWeight && `${ex.actualWeight ?? ex.targetWeight}kg`,
                          ex.targetDuration && `${ex.actualDuration ?? ex.targetDuration}s`,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400" />
                    )}
                  </button>
                </div>

                {/* Expanded: edit actual values */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-3 pb-3 pt-2 space-y-2">
                    <p className="text-xs text-gray-500 font-medium">Actual values</p>
                    <div className="grid grid-cols-3 gap-2">
                      {ex.targetReps != null && (
                        <label className="block">
                          <span className="text-xs text-gray-400">Reps</span>
                          <input
                            type="number"
                            value={ex.actualReps ?? ex.targetReps ?? ''}
                            onChange={(e) =>
                              updateExerciseActual(activeSetIdx, exIdx, {
                                actualReps: e.target.value ? Number(e.target.value) : undefined,
                              })
                            }
                            className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
                          />
                        </label>
                      )}
                      {ex.targetWeight != null && (
                        <label className="block">
                          <span className="text-xs text-gray-400">Weight (kg)</span>
                          <input
                            type="number"
                            value={ex.actualWeight ?? ex.targetWeight ?? ''}
                            onChange={(e) =>
                              updateExerciseActual(activeSetIdx, exIdx, {
                                actualWeight: e.target.value ? Number(e.target.value) : undefined,
                              })
                            }
                            className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
                          />
                        </label>
                      )}
                      {ex.targetDuration != null && (
                        <label className="block">
                          <span className="text-xs text-gray-400">Duration (s)</span>
                          <input
                            type="number"
                            value={ex.actualDuration ?? ex.targetDuration ?? ''}
                            onChange={(e) =>
                              updateExerciseActual(activeSetIdx, exIdx, {
                                actualDuration: e.target.value ? Number(e.target.value) : undefined,
                              })
                            }
                            className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
                          />
                        </label>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Notes..."
                      value={ex.notes ?? ''}
                      onChange={(e) =>
                        updateExerciseActual(activeSetIdx, exIdx, {
                          notes: e.target.value || undefined,
                        })
                      }
                      className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom action bar */}
      {allExercisesDone && (
        <div className="border-t border-gray-200 bg-white p-4">
          {isLastSet ? (
            <button
              onClick={completeSession}
              className="w-full rounded-xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
            >
              Complete Session
            </button>
          ) : (
            <button
              onClick={startNextSet}
              className="w-full rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
            >
              Start Next Set
            </button>
          )}
        </div>
      )}
    </div>
  )
}
