import { useCallback } from 'react'

export function useVibration(enabled: boolean) {
  const vibrate = useCallback(
    (pattern: number | number[]) => {
      if (!enabled || !navigator.vibrate) return
      navigator.vibrate(pattern)
    },
    [enabled],
  )

  const phaseChange = useCallback(() => {
    vibrate([100, 50, 100])
  }, [vibrate])

  const complete = useCallback(() => {
    vibrate([200, 100, 200, 100, 400])
  }, [vibrate])

  return { vibrate, phaseChange, complete }
}
