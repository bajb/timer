import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Search } from 'lucide-react'
import { db } from '../../db'
import ClientCard from './ClientCard'
import ClientForm from './ClientForm'

export default function ClientList() {
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)

  const clients = useLiveQuery(() => db.clients.orderBy('name').toArray(), [])

  const filtered = clients?.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-semibold">Clients</h1>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white"
          >
            <Plus size={16} />
            Add
          </button>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none"
          />
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-4">
        {filtered && filtered.length > 0 ? (
          <div className="space-y-2">
            {filtered.map((client) => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center py-16 text-center text-gray-400">
            <p className="text-sm">
              {search ? 'No clients match your search' : 'No clients yet'}
            </p>
            {!search && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-2 text-sm text-primary-600 font-medium"
              >
                Add your first client
              </button>
            )}
          </div>
        )}
      </div>
      {showForm && <ClientForm onClose={() => setShowForm(false)} />}
    </div>
  )
}
