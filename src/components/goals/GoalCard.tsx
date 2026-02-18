import { Target, TrendingUp } from 'lucide-react'
import type { Goal, GoalCheckIn } from '../../db'
import { cn } from '../../lib/utils'

const STATUS_STYLES: Record<Goal['status'], string> = {
  active: 'bg-blue-50 text-blue-700',
  achieved: 'bg-green-50 text-green-700',
  paused: 'bg-yellow-50 text-yellow-700',
  abandoned: 'bg-gray-100 text-gray-500',
}

interface Props {
  goal: Goal
  latestCheckIn?: GoalCheckIn
  onSelect: (goal: Goal) => void
}

export default function GoalCard({ goal, latestCheckIn, onSelect }: Props) {
  const currentValue = latestCheckIn?.value ?? goal.startValue
  const range = goal.targetValue - goal.startValue
  const progress = range !== 0 ? Math.min(1, Math.max(0, (currentValue - goal.startValue) / range)) : 0
  const pct = Math.round(progress * 100)

  return (
    <button
      onClick={() => onSelect(goal)}
      className="w-full rounded-xl border border-gray-200 bg-white p-3 text-left transition-colors hover:bg-gray-50"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-primary-500 shrink-0 mt-0.5" />
          <span className="font-medium text-sm">{goal.title}</span>
        </div>
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize', STATUS_STYLES[goal.status])}>
          {goal.status}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
        <TrendingUp size={12} />
        <span>
          {currentValue} / {goal.targetValue} {goal.metricUnit}
        </span>
      </div>

      <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
        <div
          className="h-1.5 rounded-full bg-primary-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </button>
  )
}
