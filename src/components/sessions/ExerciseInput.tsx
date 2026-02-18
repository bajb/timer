import { useState } from 'react'
import { Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import type { SessionExercise } from '../../db'

interface Props {
  exercises: SessionExercise[]
  onChange: (exercises: SessionExercise[]) => void
}

const empty = (): SessionExercise => ({ name: '', completed: false })

function exerciseSummary(ex: SessionExercise): string {
  const parts = [
    ex.targetReps && `${ex.targetReps} reps`,
    ex.targetWeight && `${ex.targetWeight}kg`,
    ex.targetDuration && `${ex.targetDuration}s`,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : ''
}

export default function ExerciseInput({ exercises, onChange }: Props) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  function update(index: number, patch: Partial<SessionExercise>) {
    const next = exercises.map((ex, i) => (i === index ? { ...ex, ...patch } : ex))
    onChange(next)
  }

  function remove(index: number) {
    onChange(exercises.filter((_, i) => i !== index))
    if (expandedIdx === index) setExpandedIdx(null)
    else if (expandedIdx !== null && expandedIdx > index) setExpandedIdx(expandedIdx - 1)
  }

  function add() {
    onChange([...exercises, empty()])
    setExpandedIdx(exercises.length)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Exercises</span>
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 text-sm font-medium text-primary-600"
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      {exercises.map((ex, i) => {
        const expanded = expandedIdx === i
        const summary = exerciseSummary(ex)

        return (
          <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
            {/* Name row — always visible */}
            <div className="flex items-center gap-2 p-2.5">
              <input
                type="text"
                placeholder="Exercise name"
                value={ex.name}
                onChange={(e) => update(i, { name: e.target.value })}
                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setExpandedIdx(expanded ? null : i)}
                className="text-gray-400 hover:text-gray-600"
              >
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-gray-400 hover:text-red-500"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Summary when collapsed */}
            {!expanded && summary && (
              <p className="px-2.5 pb-2 text-xs text-gray-400">{summary}</p>
            )}

            {/* Detail fields when expanded */}
            {expanded && (
              <div className="border-t border-gray-100 p-2.5 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-xs text-gray-500">Reps</span>
                    <input
                      type="number"
                      placeholder="—"
                      value={ex.targetReps ?? ''}
                      onChange={(e) =>
                        update(i, { targetReps: e.target.value ? Number(e.target.value) : undefined })
                      }
                      className="mt-0.5 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-500">Duration (s)</span>
                    <input
                      type="number"
                      placeholder="—"
                      value={ex.targetDuration ?? ''}
                      onChange={(e) =>
                        update(i, {
                          targetDuration: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className="mt-0.5 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-xs text-gray-500">Weight (kg)</span>
                    <input
                      type="number"
                      placeholder="—"
                      value={ex.targetWeight ?? ''}
                      onChange={(e) =>
                        update(i, {
                          targetWeight: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className="mt-0.5 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-500">Notes</span>
                    <input
                      type="text"
                      placeholder="—"
                      value={ex.notes ?? ''}
                      onChange={(e) => update(i, { notes: e.target.value || undefined })}
                      className="mt-0.5 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {exercises.length === 0 && (
        <button
          type="button"
          onClick={add}
          className="w-full rounded-lg border-2 border-dashed border-gray-200 py-4 text-sm text-gray-400"
        >
          Add an exercise
        </button>
      )}
    </div>
  )
}
