import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Pencil, Phone, Mail, Plus } from 'lucide-react'
import { db } from '../db'
import { getInitials, formatDate, cn } from '../lib/utils'
import GoalList from '../components/goals/GoalList'
import SessionCard from '../components/sessions/SessionCard'
import SessionForm from '../components/sessions/SessionForm'
import ClientForm from '../components/clients/ClientForm'

type Tab = 'goals' | 'sessions' | 'info'

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('goals')
  const [showSessionForm, setShowSessionForm] = useState(false)
  const [showEditClient, setShowEditClient] = useState(false)

  const client = useLiveQuery(() => (id ? db.clients.get(id) : undefined), [id])
  const sessions = useLiveQuery(
    () =>
      id
        ? db.sessions.where('clientId').equals(id).reverse().sortBy('date')
        : [],
    [id],
  )

  if (!client) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-400">
        Client not found
      </div>
    )
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'goals', label: 'Goals' },
    { key: 'sessions', label: `Sessions${sessions?.length ? ` (${sessions.length})` : ''}` },
    { key: 'info', label: 'Info' },
  ]

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/clients')} className="text-gray-500 md:hidden">
            <ArrowLeft size={20} />
          </button>
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: client.avatarColor }}
          >
            {getInitials(client.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">{client.name}</h1>
            {client.email && <p className="text-sm text-gray-500 truncate">{client.email}</p>}
          </div>
          <button onClick={() => setShowEditClient(true)} className="text-gray-400">
            <Pencil size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="mt-3 flex gap-4 border-t border-gray-100 pt-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'pb-1 text-sm font-medium border-b-2 transition-colors',
                tab === t.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'goals' && <GoalList clientId={client.id} />}

        {tab === 'sessions' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Sessions</h3>
              <button
                onClick={() => setShowSessionForm(true)}
                className="flex items-center gap-1 text-sm font-medium text-primary-600"
              >
                <Plus size={14} />
                Add
              </button>
            </div>
            {sessions && sessions.length > 0 ? (
              <div className="space-y-2">
                {sessions.map((s) => (
                  <SessionCard key={s.id} session={s} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No sessions logged</p>
            )}
          </div>
        )}

        {tab === 'info' && (
          <div className="space-y-4">
            {client.phone && (
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-gray-400" />
                <a href={`tel:${client.phone}`} className="text-sm text-primary-600">
                  {client.phone}
                </a>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-gray-400" />
                <a href={`mailto:${client.email}`} className="text-sm text-primary-600">
                  {client.email}
                </a>
              </div>
            )}
            {client.notes && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Notes</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
            <p className="text-xs text-gray-400">
              Added {formatDate(client.createdAt)}
            </p>
          </div>
        )}
      </div>

      {showSessionForm && (
        <SessionForm clientId={client.id} onClose={() => setShowSessionForm(false)} />
      )}
      {showEditClient && (
        <ClientForm client={client} onClose={() => setShowEditClient(false)} />
      )}
    </div>
  )
}
