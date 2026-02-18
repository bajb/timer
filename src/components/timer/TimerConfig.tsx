import { useTimerStore } from '../../stores/timerStore'
import { Play } from 'lucide-react'
import { formatDuration } from '../../lib/utils'

const PRESETS = [
  { label: 'Tabata', exerciseTime: 20, restTime: 10, rounds: 8 },
  { label: 'Classic', exerciseTime: 40, restTime: 20, rounds: 10 },
] as const

function Stepper({
  label,
  value,
  onChange,
  step,
  min,
  max,
  format,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step: number
  min: number
  max: number
  format?: (v: number) => string
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 text-lg font-bold"
        >
          −
        </button>
        <span className="w-16 text-center font-semibold">
          {format ? format(value) : value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 text-lg font-bold"
        >
          +
        </button>
      </div>
    </div>
  )
}

export default function TimerConfig() {
  const config = useTimerStore((s) => s.config)
  const setConfig = useTimerStore((s) => s.setConfig)
  const start = useTimerStore((s) => s.start)

  const totalSeconds = (config.exerciseTime + config.restTime) * config.rounds

  return (
    <div className="flex flex-1 flex-col p-4">
      <h1 className="text-lg font-semibold mb-4">HIIT Timer</h1>

      <div className="flex gap-2 mb-4">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() =>
              setConfig({
                exerciseTime: p.exerciseTime,
                restTime: p.restTime,
                rounds: p.rounds,
              })
            }
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="space-y-3 mb-6">
        <Stepper
          label="Exercise"
          value={config.exerciseTime}
          onChange={(v) => setConfig({ exerciseTime: v })}
          step={5}
          min={5}
          max={300}
          format={formatDuration}
        />
        <Stepper
          label="Rest"
          value={config.restTime}
          onChange={(v) => setConfig({ restTime: v })}
          step={5}
          min={5}
          max={300}
          format={formatDuration}
        />
        <Stepper
          label="Rounds"
          value={config.rounds}
          onChange={(v) => setConfig({ rounds: v })}
          step={1}
          min={1}
          max={50}
        />
      </div>

      <div className="mb-6 text-center">
        <span className="text-sm text-gray-500">Total Time: </span>
        <span className="font-semibold">{formatDuration(totalSeconds)}</span>
      </div>

      <button
        onClick={start}
        className="flex items-center justify-center gap-2 rounded-xl bg-primary-600 py-3 text-white font-semibold text-lg hover:bg-primary-700 transition-colors"
      >
        <Play size={22} />
        Start
      </button>
    </div>
  )
}
