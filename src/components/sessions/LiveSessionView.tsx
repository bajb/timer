import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Pause,
  Pencil,
  Play,
  SkipForward,
  Square,
  Undo2,
} from 'lucide-react'
import { db, type Session, type SessionSet, type ExerciseInstance } from '../../db'
import { formatDuration, cn } from '../../lib/utils'
import { useAudio } from '../../hooks/useAudio'
import { useVibration } from '../../hooks/useVibration'
import { useWakeLock } from '../../hooks/useWakeLock'
import { useTimerStore } from '../../stores/timerStore'
import ProgressRing from '../timer/ProgressRing'
import SessionForm from './SessionForm'
import SetTimeline from '../timer/SetTimeline'
import { buildSequence, sequenceToBlocks, type SequenceStep } from '../../lib/sequence'

function findFirstIncompleteStep(set: SessionSet, sequence: SequenceStep[]): number {
  for (let i = 0; i < sequence.length; i++) {
    const step = sequence[i]
    if (step.type === 'exercise') {
      const inst = set.instanceData?.[step.rep]?.[step.exerciseIndex]
      if (!inst?.completed) return i
    }
    // Rest steps: skip if the prior exercise was completed
    if (step.type === 'rest') {
      // Check if the next exercise step is incomplete
      const next = sequence[i + 1]
      if (next?.type === 'exercise') {
        const inst = set.instanceData?.[next.rep]?.[next.exerciseIndex]
        if (!inst?.completed) return i
      }
    }
  }
  return sequence.length // all done
}

// --- Component ---

interface Props {
  session: Session
}

export default function LiveSessionView({ session }: Props) {
  const navigate = useNavigate()
  const [activeSetIdx, setActiveSetIdx] = useState(() => {
    const idx = session.sets.findIndex((s) => !s.completed)
    return idx === -1 ? session.sets.length - 1 : idx
  })
  const [stepIndex, setStepIndex] = useState(0)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [started, setStarted] = useState(() =>
    session.sets.some((s) =>
      s.instanceData?.some((rep) => rep.some((inst) => inst.completed)),
    ),
  )

  const countdownRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const prevStepRef = useRef<string>('')

  const audioEnabled = useTimerStore((s) => s.audioEnabled)
  const vibrationEnabled = useTimerStore((s) => s.vibrationEnabled)
  const { tickBeep, phaseChangeBeep, completeBeep } = useAudio(audioEnabled)
  const vibration = useVibration(vibrationEnabled)

  const activeSet = session.sets[activeSetIdx]
  const sequence = useMemo(() => buildSequence(activeSet), [activeSet])
  const timelineBlocks = useMemo(() => sequenceToBlocks(activeSet, sequence), [activeSet, sequence])

  const isTimerActive = countdown !== null && !isPaused
  useWakeLock(isTimerActive)

  // Elapsed timer
  useEffect(() => {
    if (!session.startedAt) return
    const update = () =>
      setElapsed(Math.round((Date.now() - session.startedAt!.getTime()) / 1000))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [session.startedAt])

  // Sync step index when switching sets
  useEffect(() => {
    const idx = findFirstIncompleteStep(activeSet, sequence)
    setStepIndex(Math.min(idx, sequence.length - 1))
    setCountdown(null)
    setIsPaused(false)
  }, [activeSetIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-start countdown for timed steps
  const currentStep = sequence[stepIndex] as SequenceStep | undefined
  useEffect(() => {
    if (!currentStep || !started) return

    const stepKey = `${activeSetIdx}-${stepIndex}`
    if (stepKey === prevStepRef.current) return
    prevStepRef.current = stepKey

    if (currentStep.type === 'rest') {
      setCountdown(currentStep.duration)
      setIsPaused(false)
      phaseChangeBeep()
      vibration.phaseChange()
    } else if (currentStep.type === 'exercise' && currentStep.timed) {
      const inst = activeSet.instanceData?.[currentStep.rep]?.[currentStep.exerciseIndex]
      if (!inst?.completed) {
        setCountdown(currentStep.duration)
        setIsPaused(false)
        phaseChangeBeep()
        vibration.phaseChange()
      } else {
        setCountdown(null)
      }
    } else {
      setCountdown(null)
    }
  }, [currentStep, stepIndex, activeSetIdx, started]) // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown interval
  useEffect(() => {
    clearInterval(countdownRef.current)
    if (countdown === null || countdown <= 0 || isPaused) return

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) return 0
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(countdownRef.current)
  }, [countdown !== null && countdown > 0, isPaused]) // eslint-disable-line react-hooks/exhaustive-deps

  // Tick beeps at 3, 2, 1
  useEffect(() => {
    if (countdown !== null) tickBeep(countdown)
  }, [countdown, tickBeep])

  // Auto-advance when countdown hits 0
  useEffect(() => {
    if (countdown !== 0) return
    if (!currentStep) return

    if (currentStep.type === 'exercise' && currentStep.timed) {
      completeExercise(currentStep.rep, currentStep.exerciseIndex)
    }
    // Advance to next step
    advanceStep()
  }, [countdown]) // eslint-disable-line react-hooks/exhaustive-deps

  function advanceStep() {
    const next = stepIndex + 1
    if (next < sequence.length) {
      setStepIndex(next)
    } else {
      // Set complete
      markSetComplete()
    }
  }

  async function completeExercise(rep: number, exerciseIndex: number) {
    const sets = session.sets.map((s, si) => {
      if (si !== activeSetIdx) return s
      const instanceData = (s.instanceData ?? []).map((repData, ri) =>
        repData.map((inst, ei) => {
          if (ri !== rep || ei !== exerciseIndex) return inst
          const ex = s.exercises[exerciseIndex]
          return {
            ...inst,
            completed: true,
            actualReps: inst.actualReps ?? ex.targetReps,
            actualWeight: inst.actualWeight ?? ex.targetWeight,
            actualDuration: inst.actualDuration ?? ex.targetDuration,
          }
        }),
      )
      return { ...s, instanceData }
    })
    await db.sessions.update(session.id, { sets })
  }

  async function updateInstanceField(
    rep: number,
    exerciseIndex: number,
    patch: Partial<ExerciseInstance>,
  ) {
    const sets = session.sets.map((s, si) => {
      if (si !== activeSetIdx) return s
      const instanceData = (s.instanceData ?? []).map((repData, ri) =>
        repData.map((inst, ei) =>
          ri === rep && ei === exerciseIndex ? { ...inst, ...patch } : inst,
        ),
      )
      return { ...s, instanceData }
    })
    await db.sessions.update(session.id, { sets })
  }

  async function uncompleteExercise(rep: number, exerciseIndex: number) {
    const sets = session.sets.map((s, si) => {
      if (si !== activeSetIdx) return s
      const instanceData = (s.instanceData ?? []).map((repData, ri) =>
        repData.map((inst, ei) =>
          ri === rep && ei === exerciseIndex ? { ...inst, completed: false } : inst,
        ),
      )
      return { ...s, instanceData, completed: false }
    })
    await db.sessions.update(session.id, { sets })
  }

  function jumpToExercise(rep: number, exerciseIndex: number) {
    // Find the step index for this exercise in the sequence
    const idx = sequence.findIndex(
      (s) => s.type === 'exercise' && s.rep === rep && s.exerciseIndex === exerciseIndex,
    )
    if (idx !== -1) {
      setCountdown(null)
      setIsPaused(false)
      prevStepRef.current = '' // allow auto-start to re-trigger
      setStepIndex(idx)
    }
  }

  async function markSetComplete() {
    const sets = session.sets.map((s, si) =>
      si === activeSetIdx ? { ...s, completed: true } : s,
    )
    await db.sessions.update(session.id, { sets })
    setCountdown(null)
  }

  async function redoSet() {
    const sets = session.sets.map((s, si) => {
      if (si !== activeSetIdx) return s
      return {
        ...s,
        completed: false,
        instanceData: (s.instanceData ?? []).map((repData) =>
          repData.map(() => ({ completed: false })),
        ),
      }
    })
    await db.sessions.update(session.id, { sets })
    setStepIndex(0)
    setCountdown(null)
    setIsPaused(false)
    prevStepRef.current = ''
  }

  async function handleDone() {
    if (!currentStep || currentStep.type !== 'exercise') return
    await completeExercise(currentStep.rep, currentStep.exerciseIndex)
    advanceStep()
  }

  function skip() {
    setCountdown(null)
    if (currentStep?.type === 'exercise') {
      completeExercise(currentStep.rep, currentStep.exerciseIndex)
    }
    advanceStep()
  }

  async function completeSession() {
    const now = new Date()
    const duration = session.startedAt
      ? Math.round((now.getTime() - session.startedAt.getTime()) / 1000)
      : undefined
    await db.sessions.update(session.id, {
      status: 'completed' as const,
      completedAt: now,
      duration,
    })
    completeBeep()
    vibration.complete()
  }

  async function endSessionEarly() {
    if (!confirm('End this session with current progress?')) return
    await completeSession()
  }

  const allSetsDone = session.sets.every((s) => s.completed)
  const currentSetDone = activeSet.completed
  const isExerciseStep = currentStep?.type === 'exercise'
  const isRestStep = currentStep?.type === 'rest'
  const currentExercise =
    isExerciseStep ? activeSet.exercises[currentStep.exerciseIndex] : null
  const currentRep = currentStep ? currentStep.rep + 1 : 1
  const totalReps = activeSet.reps

  const countdownTotal =
    currentStep?.type === 'rest'
      ? activeSet.restDuration
      : currentStep?.type === 'exercise' && currentStep.timed
        ? currentStep.duration
        : 0
  const progress = countdownTotal > 0 && countdown !== null ? countdown / countdownTotal : 0

  const expandKey = (rep: number, ei: number) => `${activeSetIdx}-${rep}-${ei}`

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="text-gray-500"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-semibold">{session.name || <span className="capitalize">{session.type} Session</span>}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowEdit(true)}
              className="text-gray-400 hover:text-gray-600"
              title="Edit session"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={endSessionEarly}
              className="text-gray-400 hover:text-red-500"
              title="End session"
            >
              <Square size={16} />
            </button>
            <div className="flex items-center gap-1.5 text-sm font-medium text-gray-600">
              <Clock size={14} />
              {formatDuration(elapsed)}
            </div>
          </div>
        </div>
        {/* Tappable set progress */}
        <div className="mt-2 flex items-center gap-1.5">
          {session.sets.map((s, i) => (
            <button
              key={i}
              onClick={() => setActiveSetIdx(i)}
              className={cn(
                'h-2 flex-1 rounded-full transition-colors',
                s.completed
                  ? 'bg-green-500'
                  : i === activeSetIdx
                    ? 'bg-primary-500'
                    : 'bg-gray-200',
              )}
            />
          ))}
        </div>
        <p className="mt-1 text-xs text-gray-400 text-center">
          Set {activeSetIdx + 1} of {session.sets.length}
          {totalReps > 1 && ` · Round ${currentRep} of ${totalReps}`}
        </p>
        <SetTimeline
          className="mt-2"
          blocks={timelineBlocks}
          activeIndex={started ? stepIndex : undefined}
          allDone={currentSetDone}
          activeRemaining={countdownTotal > 0 && countdown !== null ? progress : undefined}
        />
      </header>

      {showEdit && (
        <SessionForm session={session} onClose={() => setShowEdit(false)} />
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {!started ? (
          /* Ready screen — before first exercise */
          <div className="flex flex-1 flex-col items-center justify-center gap-5 p-6">
            <p className="text-sm font-medium text-gray-400 uppercase tracking-wide">
              {activeSet.exercises.length} {activeSet.exercises.length === 1 ? 'exercise' : 'exercises'}
              {activeSet.reps > 1 && ` · ${activeSet.reps} rounds`}
            </p>
            <ul className="w-full max-w-xs space-y-1.5">
              {activeSet.exercises.map((ex, i) => {
                const exReps = ex.targetReps ?? activeSet.exerciseReps ?? 0
                const exDuration = ex.targetDuration ?? activeSet.exerciseDuration ?? 0
                return (
                  <li key={i} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm">
                    <div className="h-2 w-2 shrink-0 rounded-full bg-gray-300" />
                    <span className="flex-1 truncate">{ex.name}</span>
                    <span className="text-xs text-gray-400">
                      {[
                        exReps > 0 && `${exReps} reps`,
                        ex.targetWeight && `${ex.targetWeight}kg`,
                        exDuration > 0 && formatDuration(exDuration),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </li>
                )
              })}
            </ul>
            <button
              onClick={() => setStarted(true)}
              className="mt-2 flex h-28 w-28 items-center justify-center rounded-full bg-green-600 text-white font-bold text-xl shadow-lg hover:bg-green-700 hover:scale-105 active:scale-95 transition-all"
            >
              START
            </button>
          </div>
        ) : (
          <>
            {/* Active phase display */}
            <div className="flex flex-col items-center p-4 gap-3 shrink-0">
              {currentSetDone ? (
                <div className="text-center">
                  <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-green-100 mb-3">
                    <Check size={32} className="text-green-600" />
                  </div>
                  <p className="font-semibold text-lg">Set Complete</p>
                  <div className="mt-4 flex gap-3 justify-center">
                    <button
                      onClick={redoSet}
                      className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Redo Set
                    </button>
                    {!allSetsDone && (
                      <button
                        onClick={() => {
                          const next = session.sets.findIndex((s, i) => i > activeSetIdx && !s.completed)
                          if (next !== -1) setActiveSetIdx(next)
                        }}
                        className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white"
                      >
                        Next Set
                      </button>
                    )}
                  </div>
                </div>
              ) : isRestStep ? (
                <>
                  <div className="rounded-full bg-red-500 px-5 py-1.5 text-sm font-bold text-white tracking-wider">
                    REST
                  </div>
                  <ProgressRing progress={progress} size={160} strokeWidth={8} color="#ef4444">
                    <div className="text-4xl font-bold tabular-nums">{countdown ?? 0}</div>
                  </ProgressRing>
                </>
              ) : isExerciseStep && currentExercise ? (
                <>
                  <div className="rounded-full bg-green-500 px-5 py-1.5 text-sm font-bold text-white tracking-wider">
                    {currentExercise.name.toUpperCase()}
                  </div>

                  {currentStep.timed && countdown !== null ? (
                    <>
                      <ProgressRing progress={progress} size={160} strokeWidth={8} color="#22c55e">
                        <div className="text-4xl font-bold tabular-nums">{countdown}</div>
                      </ProgressRing>
                      {(currentExercise.targetReps || activeSet.exerciseReps || currentExercise.targetWeight) && (
                        <p className="text-sm text-gray-500">
                          {[
                            (currentExercise.targetReps ?? activeSet.exerciseReps) && `${currentExercise.targetReps ?? activeSet.exerciseReps} reps`,
                            currentExercise.targetWeight && `${currentExercise.targetWeight}kg`,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="rounded-xl border border-gray-200 bg-white p-4 w-full max-w-xs text-center">
                      <p className="text-2xl font-bold mb-1">
                        {[
                          (currentExercise.targetReps ?? activeSet.exerciseReps) && `${currentExercise.targetReps ?? activeSet.exerciseReps} reps`,
                          currentExercise.targetWeight && `${currentExercise.targetWeight}kg`,
                        ]
                          .filter(Boolean)
                          .join(' × ')}
                      </p>
                      {currentExercise.notes && (
                        <p className="text-sm text-gray-500">{currentExercise.notes}</p>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      const key = expandKey(currentStep.rep, currentStep.exerciseIndex)
                      setExpandedExercise(expandedExercise === key ? null : key)
                    }}
                    className="flex items-center gap-1 text-xs text-gray-400"
                  >
                    Edit actuals
                    {expandedExercise === expandKey(currentStep.rep, currentStep.exerciseIndex) ? (
                      <ChevronUp size={12} />
                    ) : (
                      <ChevronDown size={12} />
                    )}
                  </button>
                  {expandedExercise === expandKey(currentStep.rep, currentStep.exerciseIndex) && (
                    <div className="w-full max-w-xs space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        {currentExercise.targetReps != null && (
                          <label className="block">
                            <span className="text-xs text-gray-400">Reps</span>
                            <input
                              type="number"
                              value={
                                activeSet.instanceData?.[currentStep.rep]?.[currentStep.exerciseIndex]
                                  ?.actualReps ??
                                currentExercise.targetReps ??
                                ''
                              }
                              onChange={(e) =>
                                updateInstanceField(currentStep.rep, currentStep.exerciseIndex, {
                                  actualReps: e.target.value ? Number(e.target.value) : undefined,
                                })
                              }
                              className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
                            />
                          </label>
                        )}
                        {currentExercise.targetWeight != null && (
                          <label className="block">
                            <span className="text-xs text-gray-400">Weight</span>
                            <input
                              type="number"
                              value={
                                activeSet.instanceData?.[currentStep.rep]?.[currentStep.exerciseIndex]
                                  ?.actualWeight ??
                                currentExercise.targetWeight ??
                                ''
                              }
                              onChange={(e) =>
                                updateInstanceField(currentStep.rep, currentStep.exerciseIndex, {
                                  actualWeight: e.target.value ? Number(e.target.value) : undefined,
                                })
                              }
                              className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
                            />
                          </label>
                        )}
                        {currentExercise.targetDuration != null && (
                          <label className="block">
                            <span className="text-xs text-gray-400">Duration</span>
                            <input
                              type="number"
                              value={
                                activeSet.instanceData?.[currentStep.rep]?.[currentStep.exerciseIndex]
                                  ?.actualDuration ??
                                currentExercise.targetDuration ??
                                ''
                              }
                              onChange={(e) =>
                                updateInstanceField(currentStep.rep, currentStep.exerciseIndex, {
                                  actualDuration: e.target.value ? Number(e.target.value) : undefined,
                                })
                              }
                              className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Set overview — exercises with rest rows */}
            {!currentSetDone && (
              <div className="flex-1 overflow-y-auto border-t border-gray-100 px-4 py-3">
                {Array.from({ length: activeSet.reps }, (_, rep) => {
                  // Determine which exercise the current rest follows
                  const restAfterExIdx =
                    isRestStep && currentStep.rep === rep && stepIndex > 0
                      ? (() => {
                          const prev = sequence[stepIndex - 1]
                          return prev?.type === 'exercise' ? prev.exerciseIndex : -1
                        })()
                      : -1

                  return (
                    <div key={rep} className="mb-3 last:mb-0">
                      {totalReps > 1 && (
                        <p className="mb-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">
                          Round {rep + 1}
                        </p>
                      )}
                      <ul className="space-y-1">
                        {sequence.map((step, seqIdx) => {
                          if (step.type !== 'exercise' || step.rep !== rep) return null
                          const ei = step.exerciseIndex
                          const ex = activeSet.exercises[ei]
                          const inst = activeSet.instanceData?.[rep]?.[ei]
                          const isCurrent =
                            isExerciseStep &&
                            currentStep.rep === rep &&
                            currentStep.exerciseIndex === ei
                          const showRest = sequence[seqIdx + 1]?.type === 'rest'
                          const isRestActive = restAfterExIdx === ei

                          const exDuration = step.duration

                          return (
                            <li key={seqIdx}>
                              {/* Exercise row */}
                              <div
                                onClick={() => {
                                  if (inst?.completed) {
                                    uncompleteExercise(rep, ei)
                                  }
                                  jumpToExercise(rep, ei)
                                }}
                                className={cn(
                                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer',
                                  isCurrent
                                    ? 'bg-green-50 border border-green-300 font-semibold text-green-800'
                                    : inst?.completed
                                      ? 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                      : 'bg-white border border-gray-100 text-gray-700 hover:bg-gray-50',
                                )}
                              >
                                {inst?.completed ? (
                                  <Undo2 size={14} className="text-gray-400 shrink-0" />
                                ) : isCurrent ? (
                                  <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-500 animate-pulse" />
                                ) : (
                                  <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-gray-300" />
                                )}
                                <span className="flex-1 truncate">{ex.name}</span>
                                <span className="shrink-0 text-xs opacity-70">
                                  {[
                                    (ex.targetReps ?? activeSet.exerciseReps) && `${ex.targetReps ?? activeSet.exerciseReps} reps`,
                                    ex.targetWeight && `${ex.targetWeight}kg`,
                                    exDuration > 0 && formatDuration(exDuration),
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </span>
                              </div>

                              {/* Rest row between exercises */}
                              {showRest && (
                                <div
                                  className={cn(
                                    'flex items-center gap-2 px-3 py-1 my-0.5',
                                    isRestActive && 'rounded-md bg-amber-50',
                                  )}
                                >
                                  <div className={cn('flex-1 border-t', isRestActive ? 'border-amber-300' : 'border-gray-200')} />
                                  <span className={cn('text-[11px] font-medium', isRestActive ? 'text-amber-600' : 'text-gray-300')}>
                                    {formatDuration(activeSet.restDuration)} rest
                                  </span>
                                  <div className={cn('flex-1 border-t', isRestActive ? 'border-amber-300' : 'border-gray-200')} />
                                </div>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom controls */}
      <div className="border-t border-gray-200 bg-white p-4">
        {!started ? (
          null
        ) : allSetsDone ? (
          <button
            onClick={completeSession}
            className="w-full rounded-xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
          >
            Complete Session
          </button>
        ) : currentSetDone ? null : (
          <div className="flex gap-3">
            {/* Pause/Resume — only shown during countdowns */}
            {countdown !== null && countdown > 0 && (
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700"
              >
                {isPaused ? <Play size={20} /> : <Pause size={20} />}
              </button>
            )}

            {/* Main action — Done for untimed exercises */}
            {isExerciseStep && !currentStep.timed ? (
              <button
                onClick={handleDone}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white"
              >
                <Check size={18} />
                Done
              </button>
            ) : (
              <div className="flex-1" />
            )}

            {/* Skip */}
            <button
              onClick={skip}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500"
            >
              <SkipForward size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
