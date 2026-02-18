# Pyramid HIIT Timer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Pyramid timer mode to the HIIT timer where work durations ramp up to a peak then back down, with fixed rest between each step.

**Architecture:** Extend `HIITConfig` with `mode`, `stepIncrement`, and `peakTime` fields. Add a `buildPyramidSteps()` utility. Store pre-builds a steps array on `start()` and `tick()` looks up the current step's duration. Config UI swaps controls based on mode toggle.

**Tech Stack:** React 18, TypeScript, Zustand, Tailwind CSS, Lucide React

---

### Task 1: Extend HIITConfig and add pyramid step builder

**Files:**
- Modify: `src/db/index.ts`
- Modify: `src/stores/timerStore.ts`

**Step 1: Add pyramid fields to HIITConfig**

In `src/db/index.ts`, update the `HIITConfig` interface:

```typescript
export interface HIITConfig {
  mode: 'standard' | 'pyramid'
  exerciseTime: number
  restTime: number
  rounds: number
  completedRounds: number
  // Pyramid-specific
  stepIncrement: number
  peakTime: number
}
```

**Step 2: Add buildPyramidSteps utility to timerStore**

In `src/stores/timerStore.ts`, add above the store creation:

```typescript
export function buildPyramidSteps(increment: number, peak: number): number[] {
  const steps: number[] = []
  for (let t = increment; t <= peak; t += increment) {
    steps.push(t)
  }
  // Descend (skip peak since it's already included)
  for (let t = peak - increment; t >= increment; t -= increment) {
    steps.push(t)
  }
  return steps
}
```

**Step 3: Update DEFAULT_CONFIG**

```typescript
const DEFAULT_CONFIG: HIITConfig = {
  mode: 'standard',
  exerciseTime: 30,
  restTime: 15,
  rounds: 8,
  completedRounds: 0,
  stepIncrement: 10,
  peakTime: 40,
}
```

**Step 4: Add `steps` to store state and update `start()` and `tick()`**

Add `steps: number[]` to `TimerState`. Update `start()`:

```typescript
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
```

Update `tick()` — replace the exercise→rest and rest→exercise transitions:

```typescript
tick: () => {
  const { phase, timeRemaining, currentRound, config, isPaused, steps } = get()
  if (isPaused || phase === 'idle' || phase === 'complete') return

  if (timeRemaining > 1) {
    set({ timeRemaining: timeRemaining - 1 })
    return
  }

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
```

**Step 5: Build and verify**

Run: `npx tsc --noEmit`

**Step 6: Commit**

```
feat: extend HIITConfig with pyramid mode and step builder
```

---

### Task 2: Update TimerConfig with mode toggle and pyramid controls

**Files:**
- Modify: `src/components/timer/TimerConfig.tsx`

**Step 1: Add mode toggle and pyramid presets**

Add a pyramid preset alongside the existing ones. Replace the entire `PRESETS` and add mode-aware presets:

```typescript
const STANDARD_PRESETS = [
  { label: 'Tabata', exerciseTime: 20, restTime: 10, rounds: 8 },
  { label: 'Classic', exerciseTime: 40, restTime: 20, rounds: 10 },
] as const

const PYRAMID_PRESETS = [
  { label: '10→40', stepIncrement: 10, peakTime: 40, restTime: 10 },
  { label: '15→60', stepIncrement: 15, peakTime: 60, restTime: 15 },
] as const
```

**Step 2: Add mode toggle UI**

At the top of the config (after the h1), add a two-button toggle for Standard / Pyramid:

```tsx
<div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 mb-4">
  {(['standard', 'pyramid'] as const).map((m) => (
    <button
      key={m}
      onClick={() => setConfig({ mode: m })}
      className={cn(
        'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
        config.mode === m
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-500 hover:text-gray-700',
      )}
    >
      {m === 'standard' ? 'Standard' : 'Pyramid'}
    </button>
  ))}
</div>
```

Add `cn` import from `../../lib/utils`.

**Step 3: Swap presets and steppers based on mode**

Show `STANDARD_PRESETS` with standard steppers when `config.mode === 'standard'`, and `PYRAMID_PRESETS` with pyramid steppers (step increment, peak time, rest time) when `config.mode === 'pyramid'`.

Pyramid steppers:

```tsx
<Stepper
  label="Step Size"
  value={config.stepIncrement}
  onChange={(v) => setConfig({ stepIncrement: v })}
  step={5}
  min={5}
  max={60}
  format={formatDuration}
/>
<Stepper
  label="Peak"
  value={config.peakTime}
  onChange={(v) => setConfig({ peakTime: v })}
  step={5}
  min={10}
  max={300}
  format={formatDuration}
/>
<Stepper
  label="Rest"
  value={config.restTime}
  onChange={(v) => setConfig({ restTime: v })}
  step={5}
  min={5}
  max={120}
  format={formatDuration}
/>
```

**Step 4: Add sequence preview for pyramid mode**

Below the steppers when in pyramid mode, show the generated step list and total time:

```tsx
import { buildPyramidSteps } from '../../stores/timerStore'

// inside component:
const pyramidSteps = config.mode === 'pyramid'
  ? buildPyramidSteps(config.stepIncrement, config.peakTime)
  : []
const totalSeconds = config.mode === 'pyramid'
  ? pyramidSteps.reduce((a, b) => a + b, 0) + config.restTime * (pyramidSteps.length - 1)
  : (config.exerciseTime + config.restTime) * config.rounds
```

Render the preview:

```tsx
{config.mode === 'pyramid' && pyramidSteps.length > 0 && (
  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 mb-4">
    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
      Sequence ({pyramidSteps.length} steps)
    </p>
    <div className="flex flex-wrap gap-1.5">
      {pyramidSteps.map((d, i) => (
        <span
          key={i}
          className="rounded-md bg-white border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700"
        >
          {formatDuration(d)}
        </span>
      ))}
    </div>
  </div>
)}
```

**Step 5: Build and verify**

Run: `npx tsc --noEmit`

**Step 6: Commit**

```
feat: add pyramid mode toggle and config UI to TimerConfig
```

---

### Task 3: Update TimerRunning for pyramid step display

**Files:**
- Modify: `src/components/timer/TimerRunning.tsx`

**Step 1: Show current step duration in round label**

Replace the round label line:

```tsx
<p className="text-sm text-gray-500 font-medium">
  Round {currentRound} of {config.rounds}
</p>
```

With mode-aware label:

```tsx
const steps = useTimerStore((s) => s.steps)
const currentStepDuration =
  config.mode === 'pyramid' && steps[currentRound - 1]
    ? steps[currentRound - 1]
    : config.exerciseTime

// ...

<p className="text-sm text-gray-500 font-medium">
  Step {currentRound} of {config.rounds}
  {config.mode === 'pyramid' && phase === 'exercise' && (
    <span className="text-gray-400"> · {formatDuration(currentStepDuration)}</span>
  )}
</p>
```

**Step 2: Update totalTime calculation for progress ring**

Replace the `totalTime` calculation:

```typescript
const totalTime =
  phase === 'exercise'
    ? (config.mode === 'pyramid' && steps[currentRound - 1]
        ? steps[currentRound - 1]
        : config.exerciseTime)
    : config.restTime
```

Add `formatDuration` import from `../../lib/utils`.

**Step 3: Build and verify**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```
feat: update TimerRunning to show pyramid step info and correct progress
```

---

### Task 4: Update TimerComplete for pyramid total time

**Files:**
- Modify: `src/components/timer/TimerComplete.tsx`

**Step 1: Update total time calculation**

The current total time formula `(exerciseTime + restTime) * completedRounds` is wrong for pyramid. Replace with:

```typescript
const steps = useTimerStore((s) => s.steps)

const totalTime =
  config.mode === 'pyramid'
    ? steps.slice(0, config.completedRounds).reduce((a, b) => a + b, 0) +
      config.restTime * Math.max(0, config.completedRounds - 1)
    : (config.exerciseTime + config.restTime) * config.completedRounds
```

**Step 2: Update summary label**

```tsx
<p className="mt-1 text-gray-500">
  {config.completedRounds} {config.mode === 'pyramid' ? 'steps' : 'rounds'} &middot; {formatDuration(totalTime)}
</p>
```

**Step 3: Build and verify**

Run: `npx vite build && npx tsc --noEmit`

**Step 4: Commit**

```
feat: add pyramid timer with step increment and peak configuration
```
