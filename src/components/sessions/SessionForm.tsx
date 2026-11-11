import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import { X, Plus, Copy, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import {
  db,
  type SessionType,
  type SessionExercise,
  type SessionSet,
  type SetTimerMode,
  type PyramidStyle,
  type Session,
} from '../../db'
import { formatDuration, cn } from '../../lib/utils'
import { buildPyramidSteps } from '../../stores/timerStore'
import ExerciseInput from './ExerciseInput'
import SetTimeline from '../timer/SetTimeline'
import { setToBlocks } from '../../lib/sequence'

const SESSION_TYPES: { value: SessionType; label: string }[] = [
  { value: 'strength', label: 'Strength' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'hiit', label: 'HIIT' },
  { value: 'flexibility', label: 'Flexibility' },
  { value: 'custom', label: 'Custom' },
]

interface Props {
  session?: Session
  onClose: () => void
}

interface SetDraft {
  timerMode: SetTimerMode
  exercises: SessionExercise[]
  restDuration: number
  exerciseDuration: number
  exerciseReps: number
  reps: number
  stepIncrement: number
  peakTime: number
  pyramidStyle: PyramidStyle
}

function defaultSet(): SetDraft {
  return {
    timerMode: 'standard',
    exercises: [],
    restDuration: 30,
    exerciseDuration: 30,
    exerciseReps: 10,
    reps: 1,
    stepIncrement: 10,
    peakTime: 40,
    pyramidStyle: 'alternate',
  }
}

function setFromExisting(set: SessionSet): SetDraft {
  return {
    timerMode: set.timerMode ?? 'standard',
    exercises: set.exercises.map((ex) => ({ ...ex, completed: false })),
    restDuration: set.restDuration,
    exerciseDuration: set.exerciseDuration ?? 30,
    exerciseReps: set.exerciseReps ?? 10,
    reps: set.reps,
    stepIncrement: set.stepIncrement ?? 10,
    peakTime: set.peakTime ?? 40,
    pyramidStyle: set.pyramidStyle ?? 'all',
  }
}

function draftToSet(draft: SetDraft): SessionSet {
  const exerciseList = draft.exercises.filter((ex) => ex.name.trim())
  const pyramidSteps =
    draft.timerMode === 'pyramid'
      ? buildPyramidSteps(draft.stepIncrement, draft.peakTime)
      : []
  const reps = draft.timerMode === 'pyramid' ? pyramidSteps.length : draft.reps

  return {
    mode: 'circuit' as const,
    exercises: exerciseList.map((ex) => ({ ...ex, completed: false })),
    restDuration: draft.restDuration,
    exerciseDuration: draft.timerMode === 'standard' ? draft.exerciseDuration : undefined,
    exerciseReps: draft.timerMode === 'none' ? draft.exerciseReps : undefined,
    reps,
    timerMode: draft.timerMode,
    stepIncrement: draft.timerMode === 'pyramid' ? draft.stepIncrement : undefined,
    peakTime: draft.timerMode === 'pyramid' ? draft.peakTime : undefined,
    pyramidStyle: draft.timerMode === 'pyramid' ? draft.pyramidStyle : undefined,
    completed: false,
  }
}

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
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-2.5">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-600 text-sm font-bold"
        >
          −
        </button>
        <span className="w-14 text-center text-sm font-semibold">
          {format ? format(value) : value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-600 text-sm font-bold"
        >
          +
        </button>
      </div>
    </div>
  )
}

function SetCard({
  draft,
  index,
  expanded,
  onToggle,
  onChange,
  onDuplicate,
  onRemove,
  canRemove,
}: {
  draft: SetDraft
  index: number
  expanded: boolean
  onToggle: () => void
  onChange: (d: SetDraft) => void
  onDuplicate: () => void
  onRemove: () => void
  canRemove: boolean
}) {
  const pyramidSteps =
    draft.timerMode === 'pyramid'
      ? buildPyramidSteps(draft.stepIncrement, draft.peakTime)
      : []

  const exerciseCount = draft.exercises.filter((e) => e.name.trim()).length

  // Preview with a placeholder exercise until one is named, so the shape still shows.
  const previewSet = draftToSet(draft)
  if (previewSet.exercises.length === 0) {
    previewSet.exercises = [{ name: 'Exercise', completed: false }]
  }
  const previewBlocks = setToBlocks(previewSet)
  const summary = [
    draft.timerMode === 'none'
      ? `${draft.exerciseReps} reps`
      : draft.timerMode === 'pyramid'
        ? `Pyramid ${pyramidSteps.length} steps`
        : `${formatDuration(draft.exerciseDuration)} work`,
    draft.timerMode !== 'pyramid' && draft.reps > 1 ? `${draft.reps} rounds` : null,
    draft.restDuration > 0 ? `${formatDuration(draft.restDuration)} rest` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <span className="text-sm font-semibold text-gray-700">Set {index + 1}</span>
        <span className="flex-1 min-w-0">
          <span className="block truncate text-xs text-gray-400">{summary}</span>
          {exerciseCount > 0 && (
            <span className="block truncate text-xs text-gray-600">
              {draft.exercises.map((e) => e.name.trim()).filter(Boolean).join(', ')}
            </span>
          )}
        </span>
        {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-3 py-3 space-y-3">
          {/* Rounds — set level */}
          {draft.timerMode !== 'pyramid' && (
            <Stepper
              label="Rounds"
              value={draft.reps}
              onChange={(v) => onChange({ ...draft, reps: v })}
              step={1}
              min={1}
              max={20}
            />
          )}

          {/* Mode toggles */}
          <div className="space-y-2">
            <div className="flex rounded-lg bg-gray-100 p-0.5">
              {(['none', 'timer'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() =>
                    onChange({ ...draft, timerMode: m === 'none' ? 'none' : 'standard' })
                  }
                  className={cn(
                    'flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                    (m === 'none' ? draft.timerMode === 'none' : draft.timerMode !== 'none')
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500',
                  )}
                >
                  {m === 'none' ? 'Reps' : 'Timer'}
                </button>
              ))}
            </div>
            {draft.timerMode !== 'none' && (
              <div className="flex rounded-lg bg-gray-100 p-0.5">
                {(['standard', 'pyramid'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onChange({ ...draft, timerMode: m })}
                    className={cn(
                      'flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                      draft.timerMode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500',
                    )}
                  >
                    {m === 'standard' ? 'Standard' : 'Pyramid'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mode-specific config */}
          <div className="space-y-2">
            {draft.timerMode === 'none' && (
              <Stepper
                label="Reps"
                value={draft.exerciseReps}
                onChange={(v) => onChange({ ...draft, exerciseReps: v })}
                step={1}
                min={1}
                max={100}
              />
            )}
            {draft.timerMode === 'standard' && (
              <Stepper
                label="Exercise Time"
                value={draft.exerciseDuration}
                onChange={(v) => onChange({ ...draft, exerciseDuration: v })}
                step={5}
                min={5}
                max={300}
                format={formatDuration}
              />
            )}
            {draft.timerMode === 'pyramid' && (
              <>
                <Stepper
                  label="Step Size"
                  value={draft.stepIncrement}
                  onChange={(v) => onChange({ ...draft, stepIncrement: v })}
                  step={5}
                  min={5}
                  max={60}
                  format={formatDuration}
                />
                <Stepper
                  label="Peak"
                  value={draft.peakTime}
                  onChange={(v) => onChange({ ...draft, peakTime: v })}
                  step={5}
                  min={10}
                  max={300}
                  format={formatDuration}
                />
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-600">Each step</p>
                  <div className="flex rounded-lg bg-gray-100 p-0.5">
                    {(['alternate', 'all'] as const).map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => onChange({ ...draft, pyramidStyle: style })}
                        className={cn(
                          'flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                          draft.pyramidStyle === style ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500',
                        )}
                      >
                        {style === 'alternate' ? 'Alternate exercises' : 'All exercises'}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            <Stepper
              label="Rest"
              value={draft.restDuration}
              onChange={(v) => onChange({ ...draft, restDuration: v })}
              step={5}
              min={0}
              max={300}
              format={(v) => (v === 0 ? 'None' : formatDuration(v))}
            />
          </div>

          {/* Visual preview of the set */}
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-2">
            <SetTimeline blocks={previewBlocks} />
          </div>

          {/* Exercises */}
          <ExerciseInput
            exercises={draft.exercises}
            onChange={(exercises) => onChange({ ...draft, exercises })}
          />

          {/* Set actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onDuplicate}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <Copy size={12} />
              Duplicate
            </button>
            {canRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500"
              >
                <Trash2 size={12} />
                Remove
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function SessionForm({ session, onClose }: Props) {
  const [name, setName] = useState(session?.name ?? '')
  const [type, setType] = useState<SessionType>(session?.type ?? 'strength')
  const [notes, setNotes] = useState(session?.notes ?? '')
  const [sets, setSets] = useState<SetDraft[]>(
    session?.sets.map(setFromExisting) ?? [defaultSet()],
  )
  const [expandedSet, setExpandedSet] = useState(0)

  const isEdit = !!session

  function updateSet(index: number, draft: SetDraft) {
    setSets((prev) => prev.map((s, i) => (i === index ? draft : s)))
  }

  function duplicateSet(index: number) {
    const copy = { ...sets[index], exercises: sets[index].exercises.map((e) => ({ ...e })) }
    setSets((prev) => [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)])
    setExpandedSet(index + 1)
  }

  function removeSet(index: number) {
    setSets((prev) => prev.filter((_, i) => i !== index))
    if (expandedSet >= index && expandedSet > 0) setExpandedSet(expandedSet - 1)
  }

  function addSet() {
    const lastSet = sets[sets.length - 1]
    // Keep the timing settings, but each set gets its own exercises.
    const newSet = lastSet ? { ...lastSet, exercises: [] } : defaultSet()
    setSets((prev) => [...prev, newSet])
    setExpandedSet(sets.length)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const sessionSets: SessionSet[] = sets.map(draftToSet)

    const data = {
      name: name.trim() || undefined,
      type,
      notes: notes.trim() || undefined,
      sets: sessionSets,
    }

    if (isEdit) {
      await db.sessions.update(session.id, data)
    } else {
      await db.sessions.add({
        id: uuid(),
        ...data,
        status: 'planned' as const,
        createdAt: new Date(),
      })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-lg max-h-[85dvh] overflow-y-auto rounded-t-2xl md:rounded-2xl bg-white p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Edit Session' : 'Plan Session'}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400">
            <X size={20} />
          </button>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Upper body circuit"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
          />
        </label>

        <div>
          <span className="text-sm font-medium text-gray-700">Type</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {SESSION_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  type === t.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Per-set configuration */}
        <div className="space-y-3">
          <span className="text-sm font-medium text-gray-700">Sets</span>
          {sets.map((draft, i) => (
            <SetCard
              key={i}
              draft={draft}
              index={i}
              expanded={expandedSet === i}
              onToggle={() => setExpandedSet(expandedSet === i ? -1 : i)}
              onChange={(d) => updateSet(i, d)}
              onDuplicate={() => duplicateSet(i)}
              onRemove={() => removeSet(i)}
              canRemove={sets.length > 1}
            />
          ))}
          <button
            type="button"
            onClick={addSet}
            className="flex w-full items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-200 py-2.5 text-sm font-medium text-gray-400 hover:border-gray-300 hover:text-gray-500"
          >
            <Plus size={14} />
            Add Set
          </button>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none resize-none"
            placeholder="Session notes..."
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-lg bg-primary-600 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
        >
          {isEdit ? 'Save Changes' : 'Plan Session'}
        </button>
      </form>
    </div>
  )
}
