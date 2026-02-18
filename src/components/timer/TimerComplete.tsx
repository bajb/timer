import { Trophy, RotateCcw } from 'lucide-react'
import { useTimerStore } from '../../stores/timerStore'
import { formatDuration } from '../../lib/utils'

export default function TimerComplete() {
  const config = useTimerStore((s) => s.config)
  const steps = useTimerStore((s) => s.steps)
  const stop = useTimerStore((s) => s.stop)
  const start = useTimerStore((s) => s.start)

  const totalTime =
    config.mode === 'pyramid'
      ? steps.slice(0, config.completedRounds).reduce((a, b) => a + b, 0) +
        config.restTime * Math.max(0, config.completedRounds - 1)
      : (config.exerciseTime + config.restTime) * config.completedRounds

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success-500/10">
        <Trophy size={40} className="text-success-500" />
      </div>
      <div>
        <h2 className="text-2xl font-bold">Workout Complete!</h2>
        <p className="mt-1 text-gray-500">
          {config.completedRounds} {config.mode === 'pyramid' ? 'steps' : 'rounds'} &middot; {formatDuration(totalTime)}
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={stop}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700"
        >
          Done
        </button>
        <button
          onClick={start}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white"
        >
          <RotateCcw size={16} />
          Restart
        </button>
      </div>
    </div>
  )
}
