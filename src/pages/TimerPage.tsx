import TimerConfig from '../components/timer/TimerConfig'
import TimerRunning from '../components/timer/TimerRunning'
import TimerComplete from '../components/timer/TimerComplete'
import { useTimerStore } from '../stores/timerStore'

export default function TimerPage() {
  const phase = useTimerStore((s) => s.phase)

  if (phase === 'complete') return <TimerComplete />
  if (phase !== 'idle') return <TimerRunning />
  return <TimerConfig />
}
