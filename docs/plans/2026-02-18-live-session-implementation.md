# Live Session Playthrough — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rework sessions from post-hoc logging to plan-then-execute with set-based exercises, live check-off, inline editing, and elapsed time tracking.

**Architecture:** Update the Dexie data model to use `SessionSet[]` instead of `Exercise[]`, add session status lifecycle (`planned` → `in_progress` → `completed`). Rework `SessionForm` for circuit-style planning. Build a new `LiveSessionView` component for the in-progress state. `SessionDetailPage` becomes a router between planned/live/completed views.

**Tech Stack:** React 18, TypeScript, Dexie.js, Zustand (timer store unchanged), Tailwind CSS, Lucide React

---

### Task 1: Update data model and Dexie migration

**Files:**
- Modify: `src/db/index.ts`

**Step 1: Replace Exercise/Session types with new set-based types**

Replace the `Exercise` interface and update `Session`:

```typescript
export interface SessionExercise {
  name: string
  targetReps?: number
  targetWeight?: number
  targetDuration?: number
  actualReps?: number
  actualWeight?: number
  actualDuration?: number
  completed: boolean
  notes?: string
}

export interface SessionSet {
  exercises: SessionExercise[]
  completed: boolean
}

export interface Session {
  id: string
  clientId: string
  date: Date
  type: SessionType
  notes?: string
  sets: SessionSet[]
  hiitConfig?: HIITConfig
  status: 'planned' | 'in_progress' | 'completed'
  startedAt?: Date
  completedAt?: Date
  duration?: number
  createdAt: Date
}
```

Remove the old `Exercise` interface entirely.

**Step 2: Add Dexie v2 migration**

Add `status` to the sessions index. Keep v1 stores definition, add v2 with upgrade:

```typescript
db.version(1).stores({
  clients: 'id, name, createdAt',
  goals: 'id, clientId, status, createdAt',
  goalCheckIns: 'id, goalId, sessionId, recordedAt',
  sessions: 'id, clientId, date, type, createdAt',
})

db.version(2).stores({
  sessions: 'id, clientId, date, type, status, createdAt',
}).upgrade(tx =>
  tx.table('sessions').toCollection().modify(session => {
    // Migrate old flat exercises[] to single completed set
    const oldExercises = (session as any).exercises ?? []
    session.sets = [{
      exercises: oldExercises.map((ex: any) => ({
        name: ex.name,
        targetReps: ex.reps,
        targetWeight: ex.weight,
        targetDuration: ex.duration,
        actualReps: ex.reps,
        actualWeight: ex.weight,
        actualDuration: ex.duration,
        completed: true,
        notes: ex.notes,
      })),
      completed: true,
    }]
    session.status = 'completed'
    delete (session as any).exercises
  })
)
```

**Step 3: Build and verify**

Run: `npx vite build`
Expected: Type errors in files still referencing old `Exercise` type and `session.exercises`. That's expected — we fix those in subsequent tasks.

**Step 4: Commit**

```
feat: update data model to set-based sessions with status lifecycle
```

---

### Task 2: Update SessionForm for set-based planning

**Files:**
- Rewrite: `src/components/sessions/SessionForm.tsx`
- Rewrite: `src/components/sessions/ExerciseInput.tsx`

**Step 1: Rewrite ExerciseInput for SessionExercise (target fields only)**

The planning form only shows target fields (no actual values, no completed state). Rename the field labels from `sets/reps/weight/duration` to `targetReps/targetWeight/targetDuration`. Remove the old "Sets" field (sets are now structural, not per-exercise).

Props change from `Exercise[]` to `SessionExercise[]`.

```typescript
import { Trash2, Plus } from 'lucide-react'
import type { SessionExercise } from '../../db'

interface Props {
  exercises: SessionExercise[]
  onChange: (exercises: SessionExercise[]) => void
}

const empty = (): SessionExercise => ({ name: '', completed: false })
```

Each exercise row shows: name, target reps, target weight (kg), target duration (s), notes. Three columns on mobile, four on wider.

**Step 2: Rewrite SessionForm with set count**

Add a "Number of Sets" stepper (default 3, range 1-20). On submit, generate N identical `SessionSet` objects from the exercise list. Session saves with `status: 'planned'`.

Key changes to `handleSubmit`:
```typescript
const exerciseList = exercises.filter(ex => ex.name.trim())
const sets: SessionSet[] = Array.from({ length: setCount }, () => ({
  exercises: exerciseList.map(ex => ({ ...ex })),
  completed: false,
}))

await db.sessions.add({
  id: uuid(),
  clientId: selectedClientId,
  type,
  date: new Date(date),
  notes: notes.trim() || undefined,
  sets,
  status: 'planned',
  createdAt: new Date(),
})
```

For edit mode: if editing a `planned` session, allow changing exercises and set count. If editing a `completed` session, keep the old modal behavior but work with sets.

**Step 3: Build and verify**

Run: `npx vite build`
Expected: May still have errors in SessionCard/SessionDetailPage (fixed in next tasks).

**Step 4: Commit**

```
feat: rework SessionForm for set-based planning with set count
```

---

### Task 3: Update SessionCard and SessionList

**Files:**
- Modify: `src/components/sessions/SessionCard.tsx`
- Modify: `src/components/sessions/SessionList.tsx`

**Step 1: Update SessionCard to use sets and show status**

Replace `session.exercises` references with `session.sets`. Show session status as a colored badge. Extract unique exercise names from `sets[0].exercises` for the preview line.

```typescript
const exerciseNames = session.sets[0]?.exercises.map(e => e.name).filter(Boolean).join(', ')

const STATUS_BADGE: Record<string, string> = {
  planned: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  completed: 'bg-green-50 text-green-700',
}
```

Show badge next to the session type. Show exercise count and set count: "3 exercises · 4 sets".

**Step 2: SessionList — no structural changes needed**

SessionList already just renders SessionCard components. No changes required.

**Step 3: Build and verify**

Run: `npx vite build`

**Step 4: Commit**

```
feat: update SessionCard to show set-based info and status badge
```

---

### Task 4: Build LiveSessionView component

**Files:**
- Create: `src/components/sessions/LiveSessionView.tsx`

This is the main new component — the in-progress workout view.

**Step 1: Build the component**

Props: `{ session: Session }` (session must be `in_progress`)

Layout:
- **Header bar**: Elapsed time (calculated from `session.startedAt` to now, updating every second), set progress dots
- **Current set card**: "Set N of M" heading, list of exercises
- **Each exercise row**:
  - Name (left), check button (right)
  - Tap row to expand: shows target values as labels, editable actual value inputs
  - When checked: row gets green check, strikethrough on name, collapsed
- **Bottom bar**: "Start Next Set" button (disabled until all exercises checked), or "Complete Session" on last set

State management:
- `currentSetIndex` tracked in component state (derived from first non-completed set)
- Exercise updates write directly to Dexie via `db.sessions.update()` so data persists if app is closed
- Elapsed time via `useEffect` with 1-second interval, calculating `Date.now() - session.startedAt`

Key handlers:
```typescript
async function toggleExercise(setIdx: number, exIdx: number) {
  const sets = [...session.sets]
  const ex = { ...sets[setIdx].exercises[exIdx] }
  ex.completed = !ex.completed
  // If checking on and no actual values, copy from targets
  if (ex.completed) {
    ex.actualReps ??= ex.targetReps
    ex.actualWeight ??= ex.targetWeight
    ex.actualDuration ??= ex.targetDuration
  }
  sets[setIdx] = {
    ...sets[setIdx],
    exercises: sets[setIdx].exercises.map((e, i) => i === exIdx ? ex : e),
  }
  // Mark set completed if all exercises done
  sets[setIdx].completed = sets[setIdx].exercises.every((_, i) =>
    i === exIdx ? ex.completed : sets[setIdx].exercises[i].completed
  )
  await db.sessions.update(session.id, { sets })
}

async function updateExerciseActual(
  setIdx: number, exIdx: number,
  patch: Partial<SessionExercise>
) {
  const sets = [...session.sets]
  sets[setIdx] = {
    ...sets[setIdx],
    exercises: sets[setIdx].exercises.map((e, i) =>
      i === exIdx ? { ...e, ...patch } : e
    ),
  }
  await db.sessions.update(session.id, { sets })
}

async function completeSession() {
  const now = new Date()
  const duration = session.startedAt
    ? Math.round((now.getTime() - session.startedAt.getTime()) / 1000)
    : undefined
  await db.sessions.update(session.id, {
    status: 'completed',
    completedAt: now,
    duration,
  })
}
```

**Step 2: Build and verify**

Run: `npx vite build`

**Step 3: Commit**

```
feat: add LiveSessionView for in-progress workout playthrough
```

---

### Task 5: Rewrite SessionDetailPage as state router

**Files:**
- Rewrite: `src/pages/SessionDetailPage.tsx`

**Step 1: Route between three views based on session.status**

```typescript
import LiveSessionView from '../components/sessions/LiveSessionView'

// Inside component:
if (session.status === 'in_progress') {
  return <LiveSessionView session={session} />
}

if (session.status === 'planned') {
  return <PlannedSessionView session={session} client={client} />
}

// Default: completed view (existing summary, updated for sets)
return <CompletedSessionView session={session} client={client} />
```

**Step 2: Build PlannedSessionView inline**

Shows session summary (type, date, client, exercises, set count) with a prominent "Start Session" button. On tap:

```typescript
async function startSession() {
  await db.sessions.update(session.id, {
    status: 'in_progress',
    startedAt: new Date(),
  })
}
```

The `useLiveQuery` on the page will automatically re-render with the updated status, switching to `LiveSessionView`.

**Step 3: Build CompletedSessionView inline**

Update the existing completed view to iterate over `session.sets` instead of `session.exercises`. Show each set as a section with its exercises, actual values, and check marks.

**Step 4: Build and verify**

Run: `npx vite build`
Expected: exit 0, clean build

**Step 5: Commit**

```
feat: rewrite SessionDetailPage to route planned/live/completed views
```

---

### Task 6: Update ClientDetailPage references

**Files:**
- Modify: `src/pages/ClientDetailPage.tsx:104`

**Step 1: No structural changes needed**

`ClientDetailPage` renders `SessionCard` components (updated in Task 3) and opens `SessionForm` (updated in Task 2). Both already use the new types. Verify this file compiles with no changes, or fix any remaining type errors.

**Step 2: Full build verification**

Run: `npx vite build && npx tsc --noEmit`
Expected: exit 0 on both commands. Zero type errors, clean production build.

**Step 3: Commit**

```
feat: complete live session playthrough implementation
```
