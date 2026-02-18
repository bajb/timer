import { create } from 'zustand'
import type { HIITConfig } from '../db'

export type TimerPhase = 'idle' | 'exercise' | 'rest' | 'complete'

export function buildPyramidSteps(increment: number, peak: number): number[] {
  const steps: number[] = []
  for (let t = increment; t <= peak; t += increment) {
    steps.push(t)
  }
  for (let t = peak - increment; t >= increment; t -= increment) {
    steps.push(t)
  }
  return steps
}

interface TimerState {
  phase: TimerPhase
  timeRemaining: number
  currentRound: number
  config: HIITConfig
  steps: number[]
  isPaused: boolean
  audioEnabled: boolean
  vibrationEnabled: boolean

  setConfig: (config: Partial<HIITConfig>) => void
  start: () => void
  pause: () => void
  resume: () => void
  stop: () => void
  tick: () => void
  setAudioEnabled: (enabled: boolean) => void
  setVibrationEnabled: (enabled: boolean) => void
}

const DEFAULT_CONFIG: HIITConfig = {
  mode: 'standard',
  exerciseTime: 30,
  restTime: 15,
  rounds: 8,
  completedRounds: 0,
  stepIncrement: 10,
  peakTime: 40,
}

export const useTimerStore = create<TimerState>((set, get) => ({
  phase: 'idle',
  timeRemaining: 0,
  currentRound: 1,
  config: { ...DEFAULT_CONFIG },
  steps: [],
  isPaused: false,
  audioEnabled: localStorage.getItem('fittrack-audio') !== 'false',
  vibrationEnabled: localStorage.getItem('fittrack-vibration') !== 'false',

  setConfig: (partial) =>
    set((s) => ({ config: { ...s.config, ...partial } })),

  start: () => {
    const { config } = get()
    const steps =
      config.mode === 'pyramid'
        ? buildPyramidSteps(config.stepIncrement, config.peakTime)
        : []
    const rounds = config.mode === 'pyramid' ? steps.length : config.rounds
    set({
      phase: 'exercise',
      timeRemaining: config.mode === 'pyramid' ? steps[0] : config.exerciseTime,
      currentRound: 1,
      isPaused: false,
      steps,
      config: { ...config, rounds, completedRounds: 0 },
    })
  },

  pause: () => set({ isPaused: true }),
  resume: () => set({ isPaused: false }),

  stop: () =>
    set({
      phase: 'idle',
      timeRemaining: 0,
      currentRound: 1,
      isPaused: false,
    }),

  tick: () => {
    const { phase, timeRemaining, currentRound, config, isPaused, steps } = get()
    if (isPaused || phase === 'idle' || phase === 'complete') return

    if (timeRemaining > 1) {
      set({ timeRemaining: timeRemaining - 1 })
      return
    }

    // Time expired — transition
    if (phase === 'exercise') {
      if (currentRound >= config.rounds) {
        set({
          phase: 'complete',
          timeRemaining: 0,
          config: { ...config, completedRounds: currentRound },
        })
      } else {
        set({ phase: 'rest', timeRemaining: config.restTime })
      }
    } else if (phase === 'rest') {
      const nextRound = currentRound + 1
      const exerciseTime =
        config.mode === 'pyramid' && steps[nextRound - 1]
          ? steps[nextRound - 1]
          : config.exerciseTime
      set({
        phase: 'exercise',
        timeRemaining: exerciseTime,
        currentRound: nextRound,
      })
    }
  },

  setAudioEnabled: (enabled) => {
    localStorage.setItem('fittrack-audio', String(enabled))
    set({ audioEnabled: enabled })
  },

  setVibrationEnabled: (enabled) => {
    localStorage.setItem('fittrack-vibration', String(enabled))
    set({ vibrationEnabled: enabled })
  },
}))
