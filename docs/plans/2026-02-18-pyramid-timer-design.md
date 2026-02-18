# Pyramid Timer for HIIT

**Date:** 2026-02-18
**Status:** Approved

## Overview

Add a Pyramid timer mode alongside the existing Standard HIIT timer. In Pyramid mode, work durations increase by a fixed increment up to a peak, then decrease back down, with a fixed rest between every step.

## Example

Step increment 10s, peak 40s, rest 10s:

```
10s work → 10s rest → 20s work → 10s rest → 30s work → 10s rest → 40s work → 10s rest → 30s work → 10s rest → 20s work → 10s rest → 10s work
```

## Config Model

Extend `HIITConfig` with mode and pyramid-specific fields:

| Field | Type | Notes |
|---|---|---|
| mode | 'standard' \| 'pyramid' | Discriminator, defaults to 'standard' |
| stepIncrement | number | Pyramid: seconds per step increase (e.g. 10) |
| peakTime | number | Pyramid: longest work step in seconds (e.g. 40) |

Existing fields (`exerciseTime`, `restTime`, `rounds`) remain for standard mode. In pyramid mode, `restTime` is reused for the fixed rest duration, and `rounds` is derived from the generated step list.

## Step Generation

```
steps = [increment, 2*increment, ..., peak, ..., 2*increment, increment]
```

For increment=10, peak=40: `[10, 20, 30, 40, 30, 20, 10]` → 7 work steps.

## Timer Store Changes

- `start()` pre-builds a `steps: number[]` array from config
- `tick()` uses `steps[currentRound - 1]` for the current work duration instead of fixed `exerciseTime`
- `completedRounds` tracks position through the step array
- Phase transitions work identically: exercise → rest → exercise → ... → complete

## TimerConfig UI

- Mode toggle at top: Standard / Pyramid
- **Standard mode**: existing controls (exercise time, rest time, rounds) + Tabata/Classic presets
- **Pyramid mode**: step increment stepper (5s increments, 5-60s), peak time stepper (10s increments, 10-300s), rest time stepper (5s increments, 5-120s)
- Pyramid preset: "Pyramid 10→40" (10s increment, 40s peak, 10s rest)
- Show generated sequence preview below config: visual list of step durations

## TimerRunning UI

- Phase display (EXERCISE/REST) unchanged
- Round label shows "Step N of M" with current step's work duration
- Progress ring and countdown unchanged
- Audio/vibration/wake lock unchanged

## Migration

No DB migration needed — `HIITConfig` on sessions is optional and existing sessions don't use pyramid mode. New fields default via store.
