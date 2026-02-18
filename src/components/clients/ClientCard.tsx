import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { Client } from '../../db'
import { getInitials } from '../../lib/utils'

export default function ClientCard({ client }: { client: Client }) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(`/clients/${client.id}`)}
      className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left transition-colors hover:bg-gray-50"
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
        style={{ backgroundColor: client.avatarColor }}
      >
        {getInitials(client.name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{client.name}</p>
        {(client.email || client.phone) && (
          <p className="text-xs text-gray-500 truncate">
            {client.email || client.phone}
          </p>
        )}
      </div>
      <ChevronRight size={16} className="text-gray-400" />
    </button>
  )
}
