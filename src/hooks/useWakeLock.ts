import { useEffect, useRef } from 'react'

export function useWakeLock(active: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return

    let released = false

    navigator.wakeLock.request('screen').then((sentinel) => {
      if (released) {
        sentinel.release()
        return
      }
      wakeLockRef.current = sentinel
    }).catch(() => {
      // Wake Lock not available or denied
    })

    return () => {
      released = true
      wakeLockRef.current?.release()
      wakeLockRef.current = null
    }
  }, [active])
}
