import { useTimerStore, buildPyramidSteps } from '../../stores/timerStore'
import { Play } from 'lucide-react'
import { formatDuration, cn } from '../../lib/utils'

const STANDARD_PRESETS = [
  { label: 'Tabata', exerciseTime: 20, restTime: 10, rounds: 8 },
  { label: 'Classic', exerciseTime: 40, restTime: 20, rounds: 10 },
] as const

const PYRAMID_PRESETS = [
  { label: '10→40', stepIncrement: 10, peakTime: 40, restTime: 10 },
  { label: '15→60', stepIncrement: 15, peakTime: 60, restTime: 15 },
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

  const pyramidSteps =
    config.mode === 'pyramid'
      ? buildPyramidSteps(config.stepIncrement, config.peakTime)
      : []

  const totalSeconds =
    config.mode === 'pyramid'
      ? pyramidSteps.reduce((a, b) => a + b, 0) +
        config.restTime * Math.max(0, pyramidSteps.length - 1)
      : (config.exerciseTime + config.restTime) * config.rounds

  return (
    <div className="flex flex-1 flex-col p-4">
      <h1 className="text-lg font-semibold mb-4">HIIT Timer</h1>

      {/* Mode toggle */}
      <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 mb-4">
        {(['standard', 'pyramid'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setConfig({ mode: m })}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              config.mode === m
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {m === 'standard' ? 'Standard' : 'Pyramid'}
          </button>
        ))}
      </div>

      {/* Presets */}
      <div className="flex gap-2 mb-4">
        {config.mode === 'standard'
          ? STANDARD_PRESETS.map((p) => (
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
            ))
          : PYRAMID_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() =>
                  setConfig({
                    stepIncrement: p.stepIncrement,
                    peakTime: p.peakTime,
                    restTime: p.restTime,
                  })
                }
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {p.label}
              </button>
            ))}
      </div>

      {/* Steppers */}
      <div className="space-y-3 mb-4">
        {config.mode === 'standard' ? (
          <>
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
          </>
        ) : (
          <>
            <Stepper
              label="Step Size"
              value={config.stepIncrement}
              onChange={(v) => setConfig({ stepIncrement: v })}
              step={5}
              min={5}
              max={60}
              format={formatDuration}
            />
            <Stepper
              label="Peak"
              value={config.peakTime}
              onChange={(v) => setConfig({ peakTime: v })}
              step={5}
              min={10}
              max={300}
              format={formatDuration}
            />
            <Stepper
              label="Rest"
              value={config.restTime}
              onChange={(v) => setConfig({ restTime: v })}
              step={5}
              min={5}
              max={120}
              format={formatDuration}
            />
          </>
        )}
      </div>

      {/* Pyramid sequence preview */}
      {config.mode === 'pyramid' && pyramidSteps.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 mb-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
            Sequence ({pyramidSteps.length} steps)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {pyramidSteps.map((d, i) => (
              <span
                key={i}
                className="rounded-md bg-white border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700"
              >
                {formatDuration(d)}
              </span>
            ))}
          </div>
        </div>
      )}

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
