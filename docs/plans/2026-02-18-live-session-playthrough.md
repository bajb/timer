# Live Session Playthrough

**Date:** 2026-02-18
**Status:** Approved

## Overview

Rework sessions from "log after the fact" to "plan then play through live." Sessions are pre-planned with set-based exercise structure, then executed in real-time with exercise check-off, inline editing, and elapsed time tracking.

## Data Model Changes

### SessionExercise (replaces Exercise)

| Field | Type | Notes |
|-------|------|-------|
| name | string | Exercise name |
| targetReps | number? | Planned reps |
| targetWeight | number? | Planned weight |
| targetDuration | number? | Planned duration in seconds |
| actualReps | number? | Recorded during live session |
| actualWeight | number? | Recorded during live session |
| actualDuration | number? | Recorded during live session |
| completed | boolean | Checked off during session |
| notes | string? | Per-exercise notes |

### SessionSet

| Field | Type | Notes |
|-------|------|-------|
| exercises | SessionExercise[] | Exercises in this set |
| completed | boolean | All exercises checked off |

### Session (updated fields)

| Field | Type | Notes |
|-------|------|-------|
| sets | SessionSet[] | Replaces `exercises: Exercise[]` |
| status | enum | `planned`, `in_progress`, `completed` |
| startedAt | Date? | When "Start Session" was tapped |
| completedAt | Date? | When session was finished |

All other Session fields remain the same.

## Planning Flow

1. Pick client, type, date (same as current form)
2. Define exercises: name, target reps/weight/duration
3. Choose set count (default 3) — generates N identical sets (circuit style)
4. Optionally customize individual sets before saving
5. Session saves with `status: 'planned'`

## Live Session View

### Session States

| Status | View |
|--------|------|
| `planned` | Summary of planned sets + "Start Session" button |
| `in_progress` | Live workout: current set, check-off, elapsed timer, inline editing |
| `completed` | Summary with actual values recorded |

### In-Progress UI

- **Header**: Client name, session type, elapsed stopwatch
- **Current Set**: "Set 2 of 4" with exercise list
  - Tap exercise to expand: inline edit actual weight/reps
  - Check off when done (strikethrough + green check)
- **"Start Next Set" button**: appears when all exercises in current set are done
- **Set progress dots**: visual indicator of current position
- **"Complete Session" button**: on last set when all exercises checked
- No automated rest timer — trainer manually starts next set

### On Completion

- `duration` auto-calculated from `startedAt` to now
- `status` flips to `completed`
- `completedAt` set to current time

## Migration

Dexie version bump from 1 to 2. Existing sessions (if any) get migrated:
- `exercises[]` converted to a single `SessionSet` with `completed: true`
- `status` set to `completed`
- Existing `duration`, `createdAt` preserved
