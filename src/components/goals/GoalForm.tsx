import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import { X } from 'lucide-react'
import { db, type Goal, type MetricType } from '../../db'

const METRIC_OPTIONS: { value: MetricType; label: string; defaultUnit: string }[] = [
  { value: 'weight', label: 'Weight', defaultUnit: 'kg' },
  { value: 'reps', label: 'Reps', defaultUnit: 'reps' },
  { value: 'time', label: 'Time', defaultUnit: 'seconds' },
  { value: 'distance', label: 'Distance', defaultUnit: 'km' },
  { value: 'custom', label: 'Custom', defaultUnit: '' },
]

interface Props {
  clientId: string
  goal?: Goal
  onClose: () => void
}

export default function GoalForm({ clientId, goal, onClose }: Props) {
  const [title, setTitle] = useState(goal?.title ?? '')
  const [metricType, setMetricType] = useState<MetricType>(goal?.metricType ?? 'weight')
  const [metricUnit, setMetricUnit] = useState(
    goal?.metricUnit ?? METRIC_OPTIONS[0].defaultUnit,
  )
  const [startValue, setStartValue] = useState(String(goal?.startValue ?? ''))
  const [targetValue, setTargetValue] = useState(String(goal?.targetValue ?? ''))
  const [deadline, setDeadline] = useState(
    goal?.deadline ? goal.deadline.toISOString().slice(0, 10) : '',
  )

  const isEdit = !!goal

  function handleMetricChange(type: MetricType) {
    setMetricType(type)
    const opt = METRIC_OPTIONS.find((m) => m.value === type)
    if (opt && !isEdit) setMetricUnit(opt.defaultUnit)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    const data = {
      title: title.trim(),
      metricType,
      metricUnit: metricUnit.trim() || metricType,
      startValue: Number(startValue) || 0,
      targetValue: Number(targetValue) || 0,
      deadline: deadline ? new Date(deadline) : undefined,
    }

    if (isEdit) {
      await db.goals.update(goal.id, data)
    } else {
      await db.goals.add({
        id: uuid(),
        clientId,
        ...data,
        status: 'active',
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
        className="relative z-10 w-full max-w-lg rounded-t-2xl md:rounded-2xl bg-white p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{isEdit ? 'Edit Goal' : 'New Goal'}</h2>
          <button type="button" onClick={onClose} className="text-gray-400">
            <X size={20} />
          </button>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Title *</span>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            placeholder="e.g. Lose 10kg"
          />
        </label>

        <div>
          <span className="text-sm font-medium text-gray-700">Metric Type</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {METRIC_OPTIONS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => handleMetricChange(m.value)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  metricType === m.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Unit</span>
          <input
            type="text"
            value={metricUnit}
            onChange={(e) => setMetricUnit(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            placeholder="e.g. kg, reps, seconds"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Start Value</span>
            <input
              type="number"
              step="any"
              value={startValue}
              onChange={(e) => setStartValue(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Target Value</span>
            <input
              type="number"
              step="any"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Deadline (optional)</span>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-lg bg-primary-600 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
        >
          {isEdit ? 'Save Changes' : 'Add Goal'}
        </button>
      </form>
    </div>
  )
}
