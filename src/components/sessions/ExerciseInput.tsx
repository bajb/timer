import { Trash2, Plus } from 'lucide-react'
import type { Exercise } from '../../db'

interface Props {
  exercises: Exercise[]
  onChange: (exercises: Exercise[]) => void
}

const emptyExercise = (): Exercise => ({ name: '' })

export default function ExerciseInput({ exercises, onChange }: Props) {
  function update(index: number, patch: Partial<Exercise>) {
    const next = exercises.map((ex, i) => (i === index ? { ...ex, ...patch } : ex))
    onChange(next)
  }

  function remove(index: number) {
    onChange(exercises.filter((_, i) => i !== index))
  }

  function add() {
    onChange([...exercises, emptyExercise()])
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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <input
              type="number"
              placeholder="Sets"
              value={ex.sets ?? ''}
              onChange={(e) => update(i, { sets: e.target.value ? Number(e.target.value) : undefined })}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
            />
            <input
              type="number"
              placeholder="Reps"
              value={ex.reps ?? ''}
              onChange={(e) => update(i, { reps: e.target.value ? Number(e.target.value) : undefined })}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
            />
            <input
              type="number"
              placeholder="Weight (kg)"
              value={ex.weight ?? ''}
              onChange={(e) => update(i, { weight: e.target.value ? Number(e.target.value) : undefined })}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
            />
            <input
              type="number"
              placeholder="Duration (s)"
              value={ex.duration ?? ''}
              onChange={(e) => update(i, { duration: e.target.value ? Number(e.target.value) : undefined })}
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
