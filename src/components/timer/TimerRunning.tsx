import { useEffect, useRef } from 'react'
import { Pause, Play, Square } from 'lucide-react'
import { useTimerStore } from '../../stores/timerStore'
import { useAudio } from '../../hooks/useAudio'
import { useVibration } from '../../hooks/useVibration'
import { useWakeLock } from '../../hooks/useWakeLock'
import { formatDuration } from '../../lib/utils'
import ProgressRing from './ProgressRing'
import SetTimeline from './SetTimeline'
import { hiitBlocks } from '../../stores/timerStore'

export default function TimerRunning() {
  const { phase, timeRemaining, currentRound, config, isPaused, audioEnabled, vibrationEnabled, pause, resume, stop, tick } =
    useTimerStore()
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const prevPhaseRef = useRef(phase)

  const { tickBeep, phaseChangeBeep, completeBeep } = useAudio(audioEnabled)
  const vibration = useVibration(vibrationEnabled)

  useWakeLock(phase === 'ready' || phase === 'exercise' || phase === 'rest')

  useEffect(() => {
    if (isPaused || phase === 'idle' || phase === 'complete') {
      clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(tick, 1000)
    return () => clearInterval(intervalRef.current)
  }, [isPaused, phase, tick])

  // Audio/vibration on phase transitions
  useEffect(() => {
    if (prevPhaseRef.current !== phase) {
      if (phase === 'complete') {
        completeBeep()
        vibration.complete()
      } else if (phase === 'exercise' || phase === 'rest') {
        // No beep entering 'ready'; the 3-2-1 ticks cover it.
        phaseChangeBeep()
        vibration.phaseChange()
      }
      prevPhaseRef.current = phase
    }
  }, [phase, completeBeep, phaseChangeBeep, vibration])

  // Countdown beeps at 3, 2, 1
  useEffect(() => {
    tickBeep(timeRemaining)
  }, [timeRemaining, tickBeep])

  const steps = useTimerStore((s) => s.steps)
  const currentStepDuration =
    config.mode === 'pyramid' && steps[currentRound - 1]
      ? steps[currentRound - 1]
      : config.exerciseTime

  const startCountdown = useTimerStore((s) => s.startCountdown)
  const totalTime =
    phase === 'ready' ? startCountdown : phase === 'exercise' ? currentStepDuration : config.restTime
  const progress = totalTime > 0 ? timeRemaining / totalTime : 0
  const phaseColor =
    phase === 'ready' ? '#f59e0b' : phase === 'exercise' ? '#22c55e' : '#ef4444'
  const phaseLabel =
    phase === 'ready' ? 'GET READY' : phase === 'exercise' ? 'EXERCISE' : 'REST'

  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <div
        className="rounded-full px-4 py-1 text-sm font-bold text-white tracking-wider"
        style={{ backgroundColor: phaseColor }}
      >
        {phaseLabel}
      </div>

      <ProgressRing progress={progress} size={260} strokeWidth={10} color={phaseColor}>
        <div className="text-center">
          <div className="text-6xl font-bold tabular-nums">
            {minutes > 0 && `${minutes}:`}
            {String(seconds).padStart(minutes > 0 ? 2 : 1, '0')}
          </div>
        </div>
      </ProgressRing>

      <p className="text-sm text-gray-500 font-medium">
        Step {currentRound} of {config.rounds}
        {config.mode === 'pyramid' && phase === 'exercise' && (
          <span className="text-gray-400"> &middot; {formatDuration(currentStepDuration)}</span>
        )}
      </p>

      <SetTimeline
        className="w-full max-w-md"
        blocks={hiitBlocks(config)}
        activeIndex={(currentRound - 1) * (config.restTime > 0 ? 2 : 1) + (phase === 'rest' ? 1 : 0)}
        activeRemaining={phase === 'ready' ? undefined : progress}
      />

      <div className="flex gap-4">
        <button
          onClick={isPaused ? resume : pause}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-700"
        >
          {isPaused ? <Play size={24} /> : <Pause size={24} />}
        </button>
        <button
          onClick={stop}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600"
        >
          <Square size={24} />
        </button>
      </div>
    </div>
  )
}
