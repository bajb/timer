import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus } from 'lucide-react'
import { db } from '../../db'
import SessionCard from './SessionCard'
import SessionForm from './SessionForm'

export default function SessionList() {
  const [showForm, setShowForm] = useState(false)

  const sessions = useLiveQuery(
    () => db.sessions.orderBy('date').reverse().toArray(),
    [],
  )

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <h1 className="text-lg font-semibold">Sessions</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white"
        >
          <Plus size={16} />
          Add
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-4">
        {sessions && sessions.length > 0 ? (
          <div className="space-y-2">
            {sessions.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 text-sm">
            No sessions logged yet
          </div>
        )}
      </div>
      {showForm && <SessionForm onClose={() => setShowForm(false)} />}
    </div>
  )
}
