import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { v4 as uuid } from 'uuid'
import { X, Minus, Plus } from 'lucide-react'
import { db, type SessionType, type SessionExercise, type SessionSet, type Session } from '../../db'
import { formatDuration } from '../../lib/utils'
import ExerciseInput from './ExerciseInput'

const SESSION_TYPES: { value: SessionType; label: string }[] = [
  { value: 'strength', label: 'Strength' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'hiit', label: 'HIIT' },
  { value: 'flexibility', label: 'Flexibility' },
  { value: 'custom', label: 'Custom' },
]

interface Props {
  clientId?: string
  session?: Session
  onClose: () => void
}

function Stepper({
  label,
  value,
  onChange,
  step,
  min,
  max,
  format,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step: number
  min: number
  max: number
  format?: (v: number) => string
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 text-lg font-bold"
        >
          −
        </button>
        <span className="w-16 text-center font-semibold">
          {format ? format(value) : value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 text-lg font-bold"
        >
          +
        </button>
      </div>
    </div>
  )
}

export default function SessionForm({ clientId, session, onClose }: Props) {
  const clients = useLiveQuery(() => db.clients.orderBy('name').toArray(), [])
  const [selectedClientId, setSelectedClientId] = useState(clientId ?? session?.clientId ?? '')
  const [type, setType] = useState<SessionType>(session?.type ?? 'strength')
  const [date, setDate] = useState(
    (session?.date ?? new Date()).toISOString().slice(0, 10),
  )
  const [notes, setNotes] = useState(session?.notes ?? '')
  const [setCount, setSetCount] = useState(session?.sets.length ?? 3)
  const [restDuration, setRestDuration] = useState(session?.sets[0]?.restDuration ?? 30)
  const [repsPerSet, setRepsPerSet] = useState(session?.sets[0]?.reps ?? 1)
  const [exercises, setExercises] = useState<SessionExercise[]>(
    session?.sets[0]?.exercises.map((ex) => ({
      ...ex,
      completed: false,
    })) ?? [],
  )

  const isEdit = !!session

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedClientId) return

    const exerciseList = exercises.filter((ex) => ex.name.trim())
    const sets: SessionSet[] = Array.from({ length: setCount }, () => ({
      exercises: exerciseList.map((ex) => ({ ...ex, completed: false })),
      restDuration,
      reps: repsPerSet,
      completed: false,
    }))

    const data = {
      clientId: selectedClientId,
      type,
      date: new Date(date),
      notes: notes.trim() || undefined,
      sets,
    }

    if (isEdit) {
      await db.sessions.update(session.id, data)
    } else {
      await db.sessions.add({
        id: uuid(),
        ...data,
        status: 'planned' as const,
        createdAt: new Date(),
      })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-lg max-h-[85dvh] overflow-y-auto rounded-t-2xl md:rounded-2xl bg-white p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Edit Session' : 'Plan Session'}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400">
            <X size={20} />
          </button>
        </div>

        {!clientId && (
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Client *</span>
            <select
              required
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none bg-white"
            >
              <option value="">Select client...</option>
              {clients?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <div>
          <span className="text-sm font-medium text-gray-700">Type</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {SESSION_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  type === t.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
          />
        </label>

        <div className="space-y-2">
          <Stepper label="Sets" value={setCount} onChange={setSetCount} step={1} min={1} max={20} />
          <Stepper label="Reps per Set" value={repsPerSet} onChange={setRepsPerSet} step={1} min={1} max={20} />
          <Stepper
            label="Rest Between"
            value={restDuration}
            onChange={setRestDuration}
            step={5}
            min={0}
            max={300}
            format={(v) => (v === 0 ? 'None' : formatDuration(v))}
          />
        </div>

        <ExerciseInput exercises={exercises} onChange={setExercises} />

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none resize-none"
            placeholder="Session notes..."
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-lg bg-primary-600 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
        >
          {isEdit ? 'Save Changes' : 'Plan Session'}
        </button>
      </form>
    </div>
  )
}
