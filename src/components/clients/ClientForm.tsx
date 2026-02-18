import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import { X } from 'lucide-react'
import { db, type Client } from '../../db'
import { generateAvatarColor } from '../../lib/utils'

interface Props {
  client?: Client
  onClose: () => void
}

export default function ClientForm({ client, onClose }: Props) {
  const [name, setName] = useState(client?.name ?? '')
  const [email, setEmail] = useState(client?.email ?? '')
  const [phone, setPhone] = useState(client?.phone ?? '')
  const [notes, setNotes] = useState(client?.notes ?? '')

  const isEdit = !!client

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return

    const now = new Date()

    if (isEdit) {
      await db.clients.update(client.id, {
        name: trimmedName,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
        updatedAt: now,
      })
    } else {
      await db.clients.add({
        id: uuid(),
        name: trimmedName,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
        avatarColor: generateAvatarColor(),
        createdAt: now,
        updatedAt: now,
      })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-lg rounded-t-2xl md:rounded-2xl bg-white p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{isEdit ? 'Edit Client' : 'New Client'}</h2>
          <button type="button" onClick={onClose} className="text-gray-400">
            <X size={20} />
          </button>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Name *</span>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            placeholder="Full name"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            placeholder="email@example.com"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Phone</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            placeholder="Phone number"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none resize-none"
            placeholder="Any notes..."
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-lg bg-primary-600 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
        >
          {isEdit ? 'Save Changes' : 'Add Client'}
        </button>
      </form>
    </div>
  )
}
