# Set Modes: Circuit/Repeat + Standard/Pyramid Timer

**Date:** 2026-02-18
**Status:** Approved

## Overview

Sets gain two orthogonal configuration axes: structure mode (circuit vs repeat) and timer mode (standard vs pyramid). Sets are also individually configurable and duplicatable within the session form.

## Set Structure Modes

- **Circuit**: Multiple exercises loop together. A → rest → B → rest → A → rest → B (current behaviour).
- **Repeat**: Single exercise repeated N times. A → rest → A → rest → A.

## Timer Modes

- **Standard**: Fixed duration per work step (current behaviour). Duration comes from exercise `targetDuration`.
- **Pyramid**: Durations ramp up by `stepIncrement` to `peakTime` then back down. Each rep through the circuit uses the corresponding pyramid duration.

Example — pyramid with step 10s, peak 40s: durations are `[10, 20, 30, 40, 30, 20, 10]`. In circuit mode with exercises [Squats, Press], this means:
- Rep 1 (10s): Squats 10s → rest → Press 10s → rest
- Rep 2 (20s): Squats 20s → rest → Press 20s → rest
- ...
- Rep 4 (40s peak): Squats 40s → rest → Press 40s → rest
- ...
- Rep 7 (10s): Squats 10s → rest → Press 10s

In pyramid mode, `reps` is derived from the step count (not user-configured).

## Data Model

Add to `SessionSet`:

| Field | Type | Notes |
|---|---|---|
| mode | 'circuit' \| 'repeat' | Set structure mode, default 'circuit' |
| timerMode | 'standard' \| 'pyramid' | Timer behaviour, default 'standard' |
| stepIncrement | number (optional) | Pyramid: seconds per step (e.g. 10) |
| peakTime | number (optional) | Pyramid: peak duration (e.g. 40) |

## SessionForm Changes

- Replace shared set config with per-set configuration
- Each set is a card showing: mode, exercises, timer config
- Per set: mode toggle (circuit/repeat), timer toggle (standard/pyramid)
- Circuit: exercise list + rest + reps (standard) or exercise list + rest + pyramid config
- Repeat: single exercise name + rest + reps (standard) or single exercise name + rest + pyramid config
- Duplicate Set button per card
- Add Set button at bottom

## LiveSessionView Changes

`buildSequence()` updated:
- When `timerMode === 'pyramid'`: generate pyramid step durations, each rep uses corresponding duration (overriding exercise targetDuration)
- When `mode === 'repeat'`: same logic, just one exercise
- Reps derived from pyramid steps length in pyramid mode

## Migration

Dexie v4: default `mode: 'circuit'`, `timerMode: 'standard'` on existing sets.
