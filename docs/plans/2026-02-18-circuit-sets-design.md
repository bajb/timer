# Circuit-Based Sets with Auto-Timer

**Date:** 2026-02-18
**Status:** Approved

## Overview

Rework sets from flat exercise lists into structured circuits with rest periods, looping reps, and an auto-advancing timer during live sessions. Trainers can navigate freely between sets.

## Set Model (Planning)

| Field | Type | Notes |
|---|---|---|
| exercises | SessionExercise[] | Exercises in the circuit |
| restDuration | number | Seconds of rest between each exercise |
| reps | number | How many times to loop through exercises |
| completed | boolean | All reps completed |

## Execution Sequence

A set with exercises [Squats, Press] × 2 reps × 30s rest expands to:

```
Squats → 30s rest → Press → 30s rest → Squats → 30s rest → Press → [set done]
```

Last exercise of the last rep has no trailing rest.

### Item Types

- **Timed exercise** (has `targetDuration`): auto-countdown, auto-advance to rest when timer hits 0
- **Non-timed exercise** (reps/weight only): shows targets, trainer taps "Done", rest starts automatically
- **Rest**: auto-countdown, auto-advance to next exercise when timer hits 0

### Sequence Position Tracking

Position in the sequence is derived from exercise completion state:
- Each exercise instance in the expanded sequence maps to `(rep index, exercise index)`
- Track `currentRep` and `currentExerciseIndex` in component state
- Rest is an ephemeral state between exercises (not persisted)

## Live View Changes

- **Set navigation**: progress dots are tappable — go to any set freely
- **Sequence player**: steps through expanded exercise+rest sequence
  - Big countdown during timed exercises and rest periods
  - Phase indicator: exercise name (green) or "REST" (red)
  - Round indicator: "Round 2 of 3"
  - Pause/skip controls always available
  - Audio/vibration cues on transitions (reuse existing hooks)
- **Non-timed items**: show exercise name + targets prominently, "Done" button
- **Inline editing**: tap to expand any exercise to adjust actual reps/weight

## SessionForm Changes

Add two new steppers alongside existing set count:
- **Rest Between Exercises**: stepper (5s increments, default 30s, range 0s-300s)
- **Reps per Set**: stepper (default 1, range 1-20)

## Migration

Dexie v3: add `restDuration: 30` and `reps: 1` defaults to existing sets.
