import type { SessionSet } from '../db'
import { buildPyramidSteps } from '../stores/timerStore'
import { formatDuration } from './utils'
import type { TimelineBlock } from '../components/timer/SetTimeline'

// --- Sequence types ---

export type SequenceStep =
  | { type: 'exercise'; exerciseIndex: number; rep: number; timed: boolean; duration: number }
  | { type: 'rest'; duration: number; rep: number }

export function buildSequence(set: SessionSet): SequenceStep[] {
  const steps: SequenceStep[] = []
  const pyramidDurations =
    set.timerMode === 'pyramid' && set.stepIncrement && set.peakTime
      ? buildPyramidSteps(set.stepIncrement, set.peakTime)
      : []
  const reps = pyramidDurations.length > 0 ? pyramidDurations.length : set.reps

  const alternate = pyramidDurations.length > 0 && set.pyramidStyle === 'alternate'
  const n = set.exercises.length
  const allIndices = Array.from({ length: n }, (_, i) => i)

  for (let rep = 0; rep < reps; rep++) {
    const pyramidDuration = pyramidDurations[rep] ?? 0
    // Alternate: one exercise per pyramid step, rotating through the list.
    const indices = alternate ? (n > 0 ? [rep % n] : []) : allIndices
    for (const ei of indices) {
      const ex = set.exercises[ei]
      // In pyramid mode, override duration with pyramid step duration
      const duration =
        set.timerMode === 'none'
          ? 0
          : pyramidDuration > 0
            ? pyramidDuration
            : (ex.targetDuration ?? set.exerciseDuration ?? 0)
      steps.push({
        type: 'exercise',
        exerciseIndex: ei,
        rep,
        timed: duration > 0,
        duration,
      })
      const isLast = rep === reps - 1 && ei === indices[indices.length - 1]
      if (!isLast && set.restDuration > 0) {
        steps.push({ type: 'rest', duration: set.restDuration, rep })
      }
    }
  }
  return steps
}

export function sequenceToBlocks(set: Pick<SessionSet, 'exercises'>, steps: SequenceStep[]): TimelineBlock[] {
  return steps.map((step) =>
    step.type === 'rest'
      ? { kind: 'rest', duration: step.duration }
      : {
          kind: 'work',
          duration: step.duration,
          label: set.exercises[step.exerciseIndex]?.name,
          variant: set.exercises.length > 1 ? step.exerciseIndex : undefined,
        },
  )
}

export function setToBlocks(set: SessionSet): TimelineBlock[] {
  return sequenceToBlocks(set, buildSequence(set))
}

/** One-line description of a set's structure, e.g. "3 rounds · 30s work · 15s rest". */
export function describeSet(set: SessionSet): string {
  const parts: (string | false | 0 | undefined)[] =
    set.timerMode === 'pyramid'
      ? [
          `Pyramid ${formatDuration(set.stepIncrement ?? 0)}→${formatDuration(set.peakTime ?? 0)}`,
          set.pyramidStyle === 'alternate' && set.exercises.length > 1 && 'alternating',
        ]
      : [
          set.reps > 1 && `${set.reps} rounds`,
          set.timerMode === 'none'
            ? set.exerciseReps && `${set.exerciseReps} reps`
            : set.exerciseDuration && `${formatDuration(set.exerciseDuration)} work`,
        ]
  parts.push(set.restDuration > 0 && `${formatDuration(set.restDuration)} rest`)
  return parts.filter(Boolean).join(' · ')
}
