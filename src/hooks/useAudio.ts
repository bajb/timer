import { useRef, useCallback } from 'react'

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  return audioCtx
}

function beep(frequency: number, duration: number) {
  try {
    const ctx = getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = frequency
    gain.gain.value = 0.3
    osc.start()
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000)
    osc.stop(ctx.currentTime + duration / 1000)
  } catch {
    // Audio API not available
  }
}

export function useAudio(enabled: boolean) {
  const lastTickRef = useRef(0)

  const countdownBeep = useCallback(() => {
    if (!enabled) return
    beep(880, 100)
  }, [enabled])

  const phaseChangeBeep = useCallback(() => {
    if (!enabled) return
    beep(660, 300)
  }, [enabled])

  const completeBeep = useCallback(() => {
    if (!enabled) return
    beep(1200, 500)
  }, [enabled])

  const tickBeep = useCallback(
    (timeRemaining: number) => {
      if (!enabled || timeRemaining > 3 || timeRemaining < 1) return
      const now = Date.now()
      if (now - lastTickRef.current < 800) return
      lastTickRef.current = now
      beep(880, 80)
    },
    [enabled],
  )

  return { countdownBeep, phaseChangeBeep, completeBeep, tickBeep }
}
