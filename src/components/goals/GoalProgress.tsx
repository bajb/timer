import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { v4 as uuid } from 'uuid'
import { ArrowLeft, Plus, Pencil, TrendingUp } from 'lucide-react'
import { db, type Goal, type GoalStatus } from '../../db'
import { formatDate } from '../../lib/utils'

const STATUS_OPTIONS: { value: GoalStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'achieved', label: 'Achieved' },
  { value: 'paused', label: 'Paused' },
  { value: 'abandoned', label: 'Abandoned' },
]

interface Props {
  goal: Goal
  onBack: () => void
  onEdit: () => void
}

export default function GoalProgress({ goal, onBack, onEdit }: Props) {
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [checkInValue, setCheckInValue] = useState('')
  const [checkInNote, setCheckInNote] = useState('')

  const checkIns = useLiveQuery(
    () => db.goalCheckIns.where('goalId').equals(goal.id).reverse().sortBy('recordedAt'),
    [goal.id],
  )

  const latestValue = checkIns?.[0]?.value ?? goal.startValue
  const range = goal.targetValue - goal.startValue
  const progress = range !== 0 ? Math.min(1, Math.max(0, (latestValue - goal.startValue) / range)) : 0
  const pct = Math.round(progress * 100)

  async function handleCheckIn(e: React.FormEvent) {
    e.preventDefault()
    const val = Number(checkInValue)
    if (isNaN(val)) return

    await db.goalCheckIns.add({
      id: uuid(),
      goalId: goal.id,
      value: val,
      note: checkInNote.trim() || undefined,
      recordedAt: new Date(),
    })
    setCheckInValue('')
    setCheckInNote('')
    setShowCheckIn(false)
  }

  async function updateStatus(status: GoalStatus) {
    await db.goals.update(goal.id, { status })
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="text-gray-500">
          <ArrowLeft size={18} />
        </button>
        <h3 className="flex-1 font-semibold truncate">{goal.title}</h3>
        <button onClick={onEdit} className="text-gray-400">
          <Pencil size={16} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-2xl font-bold">{latestValue}</span>
          <span className="text-sm text-gray-500">
            Target: {goal.targetValue} {goal.metricUnit}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-100">
          <div
            className="h-2 rounded-full bg-primary-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">{pct}% complete</p>
      </div>

      {/* Status selector */}
      <div className="flex gap-2 mb-4">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s.value}
            onClick={() => updateStatus(s.value)}
            className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
              goal.status === s.value
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Add check-in */}
      {showCheckIn ? (
        <form onSubmit={handleCheckIn} className="rounded-xl border border-gray-200 bg-white p-3 mb-4 space-y-2">
          <div className="flex gap-2">
            <input
              type="number"
              step="any"
              required
              value={checkInValue}
              onChange={(e) => setCheckInValue(e.target.value)}
              placeholder={`Value (${goal.metricUnit})`}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white"
            >
              Log
            </button>
          </div>
          <input
            type="text"
            value={checkInNote}
            onChange={(e) => setCheckInNote(e.target.value)}
            placeholder="Note (optional)"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
          />
        </form>
      ) : (
        <button
          onClick={() => setShowCheckIn(true)}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-primary-600"
        >
          <Plus size={16} />
          Log Check-in
        </button>
      )}

      {/* Check-in history */}
      <h4 className="text-sm font-semibold text-gray-700 mb-2">History</h4>
      {checkIns && checkIns.length > 0 ? (
        <div className="space-y-2">
          {checkIns.map((ci) => (
            <div
              key={ci.id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
            >
              <TrendingUp size={14} className="text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">
                  {ci.value} {goal.metricUnit}
                </span>
                {ci.note && (
                  <p className="text-xs text-gray-400 truncate">{ci.note}</p>
                )}
              </div>
              <span className="text-xs text-gray-400 shrink-0">
                {formatDate(ci.recordedAt)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">No check-ins yet</p>
      )}
    </div>
  )
}
