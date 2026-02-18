import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus } from 'lucide-react'
import { db, type Goal } from '../../db'
import GoalCard from './GoalCard'
import GoalForm from './GoalForm'
import GoalProgress from './GoalProgress'

interface Props {
  clientId: string
}

export default function GoalList({ clientId }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)

  const goals = useLiveQuery(
    () => db.goals.where('clientId').equals(clientId).toArray(),
    [clientId],
  )

  const latestCheckIns = useLiveQuery(async () => {
    if (!goals) return {}
    const map: Record<string, Awaited<ReturnType<typeof db.goalCheckIns.get>>> = {}
    for (const g of goals) {
      const cis = await db.goalCheckIns
        .where('goalId')
        .equals(g.id)
        .reverse()
        .sortBy('recordedAt')
      if (cis.length > 0) map[g.id] = cis[0]
    }
    return map
  }, [goals])

  // Refresh selected goal from live data
  const liveSelectedGoal = goals?.find((g) => g.id === selectedGoal?.id)

  if (liveSelectedGoal) {
    return (
      <GoalProgress
        goal={liveSelectedGoal}
        onBack={() => setSelectedGoal(null)}
        onEdit={() => {
          setEditingGoal(liveSelectedGoal)
          setSelectedGoal(null)
        }}
      />
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Goals</h3>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 text-sm font-medium text-primary-600"
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      {goals && goals.length > 0 ? (
        <div className="space-y-2">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              latestCheckIn={latestCheckIns?.[goal.id]}
              onSelect={setSelectedGoal}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">No goals yet</p>
      )}

      {showForm && (
        <GoalForm clientId={clientId} onClose={() => setShowForm(false)} />
      )}
      {editingGoal && (
        <GoalForm
          clientId={clientId}
          goal={editingGoal}
          onClose={() => setEditingGoal(null)}
        />
      )}
    </div>
  )
}
