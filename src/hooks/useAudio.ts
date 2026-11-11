import { useRef, useCallback } from 'react'
import { useTimerStore, type SoundProfile } from '../stores/timerStore'

let audioCtx: AudioContext | null = null
let output: AudioNode | null = null

function getCtx(): { ctx: AudioContext; out: AudioNode } {
  if (!audioCtx) {
    audioCtx = new AudioContext()
    // Compressor lets the loud profiles push volume without harsh clipping.
    const comp = audioCtx.createDynamicsCompressor()
    comp.threshold.value = -12
    comp.ratio.value = 12
    comp.connect(audioCtx.destination)
    output = comp
  }
  if (audioCtx.state === 'suspended') void audioCtx.resume()
  return { ctx: audioCtx, out: output! }
}

interface Tone {
  freq: number
  ms: number
  type?: OscillatorType
  gain?: number
  /** Seconds after "now" to start. */
  at?: number
  /** Frequency-modulation trill (Hz rate, Hz depth) — used for the whistle. */
  trill?: [number, number]
  /** Glide to this frequency over the tone. */
  slideTo?: number
}

function play(tones: Tone[]) {
  try {
    const { ctx, out } = getCtx()
    for (const t of tones) {
      const start = ctx.currentTime + (t.at ?? 0)
      const end = start + t.ms / 1000
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = t.type ?? 'sine'
      osc.frequency.setValueAtTime(t.freq, start)
      if (t.slideTo) osc.frequency.linearRampToValueAtTime(t.slideTo, end)
      if (t.trill) {
        const lfo = ctx.createOscillator()
        const depth = ctx.createGain()
        lfo.frequency.value = t.trill[0]
        depth.gain.value = t.trill[1]
        lfo.connect(depth).connect(osc.frequency)
        lfo.start(start)
        lfo.stop(end)
      }
      const peak = t.gain ?? 0.3
      // Short attack avoids clicks; exponential release for a natural tail.
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.01)
      gain.gain.setValueAtTime(peak, Math.max(start + 0.01, end - 0.05))
      gain.gain.exponentialRampToValueAtTime(0.0001, end)
      osc.connect(gain).connect(out)
      osc.start(start)
      osc.stop(end + 0.02)
    }
  } catch {
    // Audio API not available
  }
}

/** Air horn: stacked detuned sawtooths, slightly dissonant like a real horn. */
function horn(ms: number, at = 0): Tone[] {
  return [233, 311, 466].flatMap((f) => [
    { freq: f, ms, type: 'sawtooth' as const, gain: 0.35, at },
    { freq: f * 1.01, ms, type: 'sawtooth' as const, gain: 0.25, at },
  ])
}

/** Referee-style pea whistle: high tone with a fast trill. */
function whistle(ms: number, at = 0): Tone[] {
  return [
    { freq: 3000, ms, type: 'sine', gain: 0.6, trill: [35, 180], at },
    { freq: 3000 * 1.5, ms, type: 'sine', gain: 0.12, trill: [35, 270], at },
  ]
}

const SOUNDS: Record<SoundProfile, { tick: Tone[]; phase: Tone[]; complete: Tone[] }> = {
  // Soft sine beeps (the original sounds).
  relaxed: {
    tick: [{ freq: 880, ms: 80 }],
    phase: [{ freq: 660, ms: 300 }],
    complete: [{ freq: 1200, ms: 500 }],
  },
  // Harsher square-wave beeps, double-pulse on changes — cuts through music in a home gym.
  loud: {
    tick: [{ freq: 1000, ms: 120, type: 'square', gain: 0.5 }],
    phase: [
      { freq: 1100, ms: 150, type: 'square', gain: 0.6 },
      { freq: 1500, ms: 250, type: 'square', gain: 0.6, at: 0.18 },
    ],
    complete: [
      { freq: 1000, ms: 150, type: 'square', gain: 0.6 },
      { freq: 1300, ms: 150, type: 'square', gain: 0.6, at: 0.18 },
      { freq: 1700, ms: 450, type: 'square', gain: 0.6, at: 0.36 },
    ],
  },
  // Whistle pips for the countdown, a long whistle blast on changes, air horn to finish.
  whistle: {
    tick: whistle(140),
    phase: whistle(650),
    complete: [...horn(1300)],
  },
}

export const SOUND_PROFILES: { value: SoundProfile; label: string; hint: string }[] = [
  { value: 'relaxed', label: 'Relaxed', hint: 'Soft beeps' },
  { value: 'loud', label: 'Loud', hint: 'Sharp beeps for a home gym' },
  { value: 'whistle', label: 'Whistle & Horn', hint: 'For loud environments' },
]

/** Play a profile's phase-change sound then its finish sound (Settings preview). */
export function previewSound(profile: SoundProfile) {
  const s = SOUNDS[profile]
  play(s.phase)
  const offset = profile === 'whistle' ? 0.9 : 0.7
  play(s.complete.map((t) => ({ ...t, at: (t.at ?? 0) + offset })))
}

export function useAudio(enabled: boolean) {
  const lastTickRef = useRef(0)
  const profile = useTimerStore((s) => s.soundProfile)
  const sounds = SOUNDS[profile] ?? SOUNDS.relaxed

  const countdownBeep = useCallback(() => {
    if (enabled) play(sounds.tick)
  }, [enabled, sounds])

  const phaseChangeBeep = useCallback(() => {
    if (enabled) play(sounds.phase)
  }, [enabled, sounds])

  const completeBeep = useCallback(() => {
    if (enabled) play(sounds.complete)
  }, [enabled, sounds])

  const tickBeep = useCallback(
    (timeRemaining: number) => {
      if (!enabled || timeRemaining > 3 || timeRemaining < 1) return
      const now = Date.now()
      if (now - lastTickRef.current < 800) return
      lastTickRef.current = now
      play(sounds.tick)
    },
    [enabled, sounds],
  )

  return { countdownBeep, phaseChangeBeep, completeBeep, tickBeep }
}
