import { Trash2, Plus } from 'lucide-react'
import type { SessionExercise } from '../../db'

interface Props {
  exercises: SessionExercise[]
  onChange: (exercises: SessionExercise[]) => void
}

const empty = (): SessionExercise => ({ name: '', completed: false })

export default function ExerciseInput({ exercises, onChange }: Props) {
  function update(index: number, patch: Partial<SessionExercise>) {
    const next = exercises.map((ex, i) => (i === index ? { ...ex, ...patch } : ex))
    onChange(next)
  }

  function remove(index: number) {
    onChange(exercises.filter((_, i) => i !== index))
  }

  function add() {
    onChange([...exercises, empty()])
  }

  return (
    <div className="space-y-3">
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

      {exercises.map((ex, i) => (
        <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Exercise name"
              value={ex.name}
              onChange={(e) => update(i, { name: e.target.value })}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-gray-400 hover:text-red-500"
            >
              <Trash2 size={16} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              placeholder="Reps"
              value={ex.targetReps ?? ''}
              onChange={(e) => update(i, { targetReps: e.target.value ? Number(e.target.value) : undefined })}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
            />
            <input
              type="number"
              placeholder="Weight (kg)"
              value={ex.targetWeight ?? ''}
              onChange={(e) => update(i, { targetWeight: e.target.value ? Number(e.target.value) : undefined })}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
            />
            <input
              type="number"
              placeholder="Duration (s)"
              value={ex.targetDuration ?? ''}
              onChange={(e) => update(i, { targetDuration: e.target.value ? Number(e.target.value) : undefined })}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
            />
          </div>
          <input
            type="text"
            placeholder="Notes (optional)"
            value={ex.notes ?? ''}
            onChange={(e) => update(i, { notes: e.target.value || undefined })}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
          />
        </div>
      ))}

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
