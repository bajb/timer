import { useEffect, useRef } from 'react'
import { Pause, Play, Square } from 'lucide-react'
import { useTimerStore } from '../../stores/timerStore'
import { useAudio } from '../../hooks/useAudio'
import { useVibration } from '../../hooks/useVibration'
import { useWakeLock } from '../../hooks/useWakeLock'
import ProgressRing from './ProgressRing'

export default function TimerRunning() {
  const { phase, timeRemaining, currentRound, config, isPaused, audioEnabled, vibrationEnabled, pause, resume, stop, tick } =
    useTimerStore()
  const intervalRef = useRef<ReturnType<typeof setInterval>>()
  const prevPhaseRef = useRef(phase)

  const { tickBeep, phaseChangeBeep, completeBeep } = useAudio(audioEnabled)
  const vibration = useVibration(vibrationEnabled)

  useWakeLock(phase === 'exercise' || phase === 'rest')

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

  const totalTime = phase === 'exercise' ? config.exerciseTime : config.restTime
  const progress = totalTime > 0 ? timeRemaining / totalTime : 0
  const phaseColor = phase === 'exercise' ? '#22c55e' : '#ef4444'
  const phaseLabel = phase === 'exercise' ? 'EXERCISE' : 'REST'

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
        Round {currentRound} of {config.rounds}
      </p>

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
