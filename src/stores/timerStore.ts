import { create } from 'zustand'
import type { HIITConfig } from '../db'

export type TimerPhase = 'idle' | 'exercise' | 'rest' | 'complete'

interface TimerState {
  phase: TimerPhase
  timeRemaining: number
  currentRound: number
  config: HIITConfig
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
  exerciseTime: 30,
  restTime: 15,
  rounds: 8,
  completedRounds: 0,
}

export const useTimerStore = create<TimerState>((set, get) => ({
  phase: 'idle',
  timeRemaining: 0,
  currentRound: 1,
  config: { ...DEFAULT_CONFIG },
  isPaused: false,
  audioEnabled: localStorage.getItem('fittrack-audio') !== 'false',
  vibrationEnabled: localStorage.getItem('fittrack-vibration') !== 'false',

  setConfig: (partial) =>
    set((s) => ({ config: { ...s.config, ...partial } })),

  start: () => {
    const { config } = get()
    set({
      phase: 'exercise',
      timeRemaining: config.exerciseTime,
      currentRound: 1,
      isPaused: false,
      config: { ...config, completedRounds: 0 },
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
    const { phase, timeRemaining, currentRound, config, isPaused } = get()
    if (isPaused || phase === 'idle' || phase === 'complete') return

    if (timeRemaining > 1) {
      set({ timeRemaining: timeRemaining - 1 })
      return
    }

    // Time expired — transition
    if (phase === 'exercise') {
      if (currentRound >= config.rounds) {
        // All rounds done
        set({
          phase: 'complete',
          timeRemaining: 0,
          config: { ...config, completedRounds: currentRound },
        })
      } else {
        // Go to rest
        set({ phase: 'rest', timeRemaining: config.restTime })
      }
    } else if (phase === 'rest') {
      // Start next round
      set({
        phase: 'exercise',
        timeRemaining: config.exerciseTime,
        currentRound: currentRound + 1,
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
