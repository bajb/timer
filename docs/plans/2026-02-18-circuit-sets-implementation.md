# Circuit-Based Sets Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rework sets into structured circuits with rest periods, looping reps, auto-advancing timers, and free set navigation.

**Architecture:** Add `restDuration`, `reps`, and `instanceData` (2D completion tracker) to `SessionSet`. Build a sequence player in `LiveSessionView` that steps through exercise→rest→exercise→rest sequences, auto-advancing on timed items. Template exercises stay clean for planning; `instanceData[rep][exerciseIdx]` tracks per-instance actuals.

**Tech Stack:** React 18, TypeScript, Dexie.js, Zustand (audio/vibration settings), Tailwind CSS, Lucide React

---

### Task 1: Update data model

**Files:**
- Modify: `src/db/index.ts`

**Step 1: Add ExerciseInstance and update SessionSet**

Add a new interface for tracking per-instance completion:

```typescript
export interface ExerciseInstance {
  completed: boolean
  actualReps?: number
  actualWeight?: number
  actualDuration?: number
  notes?: string
}
```

Update `SessionSet`:

```typescript
export interface SessionSet {
  exercises: SessionExercise[]        // template exercises
  restDuration: number                // seconds between exercises
  reps: number                        // circuit loops
  completed: boolean
  instanceData?: ExerciseInstance[][]  // [rep][exerciseIdx], created on session start
}
```

**Step 2: Add Dexie v3 migration**

Default `restDuration: 30` and `reps: 1` on existing sets. Convert existing exercise-level `completed`/actual fields into `instanceData` with 1 rep:

```typescript
db.version(3).stores({}).upgrade(tx =>
  tx.table('sessions').toCollection().modify((session: Record<string, unknown>) => {
    const sets = session.sets as any[]
    for (const set of sets) {
      set.restDuration ??= 30
      set.reps ??= 1
      if (!set.instanceData) {
        set.instanceData = [
          set.exercises.map((ex: any) => ({
            completed: ex.completed ?? false,
            actualReps: ex.actualReps,
            actualWeight: ex.actualWeight,
            actualDuration: ex.actualDuration,
            notes: ex.notes,
          })),
        ]
      }
    }
  })
)
```

**Step 3: Build and verify**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```
feat: add restDuration, reps, instanceData to SessionSet with v3 migration
```

---

### Task 2: Update SessionForm with rest and reps steppers

**Files:**
- Modify: `src/components/sessions/SessionForm.tsx`

**Step 1: Add state for restDuration and repsPerSet**

```typescript
const [restDuration, setRestDuration] = useState(session?.sets[0]?.restDuration ?? 30)
const [repsPerSet, setRepsPerSet] = useState(session?.sets[0]?.reps ?? 1)
```

**Step 2: Add two new stepper rows after the "Number of Sets" stepper**

- "Rest Between Exercises": 5s increments, default 30s, range 0-300, format with `formatDuration`
- "Reps per Set": 1 increment, default 1, range 1-20

**Step 3: Update handleSubmit to include restDuration and reps**

```typescript
const sets: SessionSet[] = Array.from({ length: setCount }, () => ({
  exercises: exerciseList.map((ex) => ({ ...ex, completed: false })),
  restDuration,
  reps: repsPerSet,
  completed: false,
}))
```

**Step 4: Build and verify**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```
feat: add rest duration and reps per set steppers to SessionForm
```

---

### Task 3: Rewrite LiveSessionView as circuit sequence player

**Files:**
- Rewrite: `src/components/sessions/LiveSessionView.tsx`

This is the main change. The component becomes a state machine that steps through an exercise→rest sequence.

**Step 1: Define sequence types and builder**

A sequence step is either an exercise or a rest:

```typescript
type SequenceStep =
  | { type: 'exercise'; exerciseIndex: number; rep: number; timed: boolean; duration: number }
  | { type: 'rest'; duration: number }

function buildSequence(set: SessionSet): SequenceStep[] {
  const steps: SequenceStep[] = []
  for (let rep = 0; rep < set.reps; rep++) {
    for (let ei = 0; ei < set.exercises.length; ei++) {
      const ex = set.exercises[ei]
      steps.push({
        type: 'exercise',
        exerciseIndex: ei,
        rep,
        timed: (ex.targetDuration ?? 0) > 0,
        duration: ex.targetDuration ?? 0,
      })
      // Add rest after every exercise except the very last step
      const isLast = rep === set.reps - 1 && ei === set.exercises.length - 1
      if (!isLast && set.restDuration > 0) {
        steps.push({ type: 'rest', duration: set.restDuration })
      }
    }
  }
  return steps
}
```

**Step 2: Build component state machine**

State:
- `activeSetIdx`: number — tappable set navigation
- `stepIndex`: number — position in the current set's sequence
- `countdown`: number | null — active countdown (for timed exercises and rest)
- `isPaused`: boolean
- `expandedExercise`: string | null — for inline editing

Behaviour:
- On mount / set change: build sequence, find first non-completed step
- **Timed exercise** (`targetDuration > 0`): start countdown automatically, auto-advance when hits 0
- **Non-timed exercise**: show "Done" button, wait for tap, then advance
- **Rest**: start countdown automatically, auto-advance when hits 0
- On exercise complete: write to `instanceData[rep][exerciseIndex]` in Dexie, auto-fill actuals from targets
- On all steps done: mark set `completed`, if last set show "Complete Session"
- Audio: `tickBeep` at 3/2/1, `phaseChangeBeep` on transitions, `completeBeep` on session done
- Vibration: `phaseChange()` on transitions, `complete()` on session done
- WakeLock: active when any countdown is running

**Step 3: Build the UI**

Layout:
- **Header**: elapsed time, set progress dots (tappable for navigation)
- **Phase display**: large indicator showing current step
  - Exercise: green banner with name, big countdown if timed, "Done" button if not
  - Rest: red banner "REST", big countdown
- **Round indicator**: "Round 2 of 3" (derived from current step's `rep`)
- **Exercise detail** (below phase): target values, tap to expand for inline actual editing
- **Controls**: Pause/Resume, Skip (advance to next step)
- **Bottom bar**: "Complete Session" when all sets done

**Step 4: Initialize instanceData on session start**

In `SessionDetailPage`'s `PlannedView.startSession()`, initialize `instanceData` for each set:

```typescript
const sets = session.sets.map(set => ({
  ...set,
  instanceData: Array.from({ length: set.reps }, () =>
    set.exercises.map(() => ({ completed: false }))
  ),
}))
await db.sessions.update(session.id, { sets, status: 'in_progress', startedAt: new Date() })
```

**Step 5: Build and verify**

Run: `npx vite build`

**Step 6: Commit**

```
feat: rewrite LiveSessionView as circuit sequence player with auto-timer
```

---

### Task 4: Update SessionDetailPage views

**Files:**
- Modify: `src/pages/SessionDetailPage.tsx`

**Step 1: Update PlannedView**

Show rest duration and reps info in the summary banner:

```
"3 sets · 2 exercises · 2 reps/set · 30s rest"
```

Move instanceData initialization to `startSession()` as described in Task 3 Step 4.

**Step 2: Update CompletedView**

Iterate `set.instanceData` grouped by rep. Show "Round N" headings within each set section. Display actual values from instanceData alongside exercise template names.

**Step 3: Build and verify**

Run: `npx vite build`

**Step 4: Commit**

```
feat: update planned and completed views for circuit set model
```

---

### Task 5: Update SessionCard and final verification

**Files:**
- Modify: `src/components/sessions/SessionCard.tsx`

**Step 1: Update exercise summary line**

Show reps info when > 1:

```typescript
const reps = session.sets[0]?.reps ?? 1
// "3 exercises · 4 sets · 2x"
const repsLabel = reps > 1 ? ` · ${reps}x` : ''
```

**Step 2: Full build verification**

Run: `npx vite build && npx tsc --noEmit`
Expected: exit 0 on both.

**Step 3: Commit**

```
feat: complete circuit-based sets with auto-timer
```
