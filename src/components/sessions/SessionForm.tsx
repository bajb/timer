import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { v4 as uuid } from 'uuid'
import { X } from 'lucide-react'
import { db, type Session, type SessionType, type Exercise } from '../../db'
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

export default function SessionForm({ clientId, session, onClose }: Props) {
  const clients = useLiveQuery(() => db.clients.orderBy('name').toArray(), [])
  const [selectedClientId, setSelectedClientId] = useState(clientId ?? session?.clientId ?? '')
  const [type, setType] = useState<SessionType>(session?.type ?? 'strength')
  const [date, setDate] = useState(
    (session?.date ?? new Date()).toISOString().slice(0, 10),
  )
  const [notes, setNotes] = useState(session?.notes ?? '')
  const [exercises, setExercises] = useState<Exercise[]>(session?.exercises ?? [])

  const isEdit = !!session

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedClientId) return

    const data = {
      clientId: selectedClientId,
      type,
      date: new Date(date),
      notes: notes.trim() || undefined,
      exercises: exercises.filter((ex) => ex.name.trim()),
    }

    if (isEdit) {
      await db.sessions.update(session.id, data)
    } else {
      await db.sessions.add({
        id: uuid(),
        ...data,
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
            {isEdit ? 'Edit Session' : 'New Session'}
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
          {isEdit ? 'Save Changes' : 'Log Session'}
        </button>
      </form>
    </div>
  )
}
