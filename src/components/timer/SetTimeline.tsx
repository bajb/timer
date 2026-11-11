import { formatDuration, cn } from '../../lib/utils'

export interface TimelineBlock {
  kind: 'work' | 'rest'
  /** Seconds. 0 means untimed (rep-based) work. */
  duration: number
  label?: string
  /** Exercise index — gives each exercise its own shade so alternation is visible. */
  variant?: number
}

const WORK_SHADES = ['bg-green-500', 'bg-sky-500', 'bg-amber-400', 'bg-violet-500']

interface Props {
  blocks: TimelineBlock[]
  /** Index of the block in progress. Blocks before it render as done. */
  activeIndex?: number
  /** Render every block as done (e.g. the set is complete). */
  allDone?: boolean
  /** Progress through the active block, 1 = just started, 0 = finished. */
  activeRemaining?: number
  showTotal?: boolean
  className?: string
}

/**
 * A strip showing the shape of a set: work blocks (green) and rest blocks (red),
 * widths proportional to time. Work block height scales with duration, so a
 * pyramid looks like a pyramid.
 */
export default function SetTimeline({
  blocks,
  activeIndex,
  allDone,
  activeRemaining,
  showTotal = true,
  className,
}: Props) {
  if (blocks.length === 0) return null

  const timedWork = blocks.filter((b) => b.kind === 'work' && b.duration > 0)
  const maxWork = Math.max(1, ...timedWork.map((b) => b.duration))
  // Untimed blocks get the average work width so they still read as "a block".
  const untimedWidth =
    timedWork.length > 0
      ? timedWork.reduce((a, b) => a + b.duration, 0) / timedWork.length
      : 30
  const totalSeconds = blocks.reduce((a, b) => a + b.duration, 0)
  const hasUntimed = blocks.some((b) => b.kind === 'work' && b.duration === 0)
  // One legend entry per exercise when they're coloured individually.
  const legend = new Map<number, string>()
  for (const b of blocks) {
    if (b.kind === 'work' && b.variant !== undefined && !legend.has(b.variant)) {
      legend.set(b.variant, b.label || `Exercise ${b.variant + 1}`)
    }
  }

  return (
    <div className={className}>
      <div className="flex h-10 items-end gap-0.5" aria-hidden>
        {blocks.map((b, i) => {
          const done = allDone || (activeIndex !== undefined && i < activeIndex)
          const active = !allDone && i === activeIndex
          const untimed = b.kind === 'work' && b.duration === 0
          const height =
            b.kind === 'rest'
              ? 30
              : untimed
                ? 70
                : 40 + 60 * (b.duration / maxWork)
          return (
            <div
              key={i}
              title={`${b.label ?? (b.kind === 'rest' ? 'Rest' : 'Work')}${b.duration > 0 ? ` · ${formatDuration(b.duration)}` : ''}`}
              className={cn(
                'relative min-w-[3px] overflow-hidden rounded-sm transition-opacity',
                b.kind === 'rest' ? 'bg-red-300' : WORK_SHADES[(b.variant ?? 0) % WORK_SHADES.length],
                untimed && 'bg-green-100 border border-dashed border-green-500',
                done && 'opacity-30',
                active && 'ring-2 ring-offset-1 ring-gray-900',
              )}
              style={{ flexGrow: untimed ? untimedWidth : b.duration, flexBasis: 0, height: `${height}%` }}
            >
              {active && activeRemaining !== undefined && b.duration > 0 && (
                <div
                  className="absolute inset-y-0 left-0 bg-white/50"
                  style={{ width: `${(1 - activeRemaining) * 100}%` }}
                />
              )}
            </div>
          )
        })}
      </div>
      {showTotal && (
        <div className="mt-1 flex justify-between gap-2 text-[11px] text-gray-400">
          <span className="flex min-w-0 flex-wrap gap-x-2">
            {legend.size > 0 ? (
              [...legend].map(([v, label]) => (
                <span key={v} className="truncate">
                  <span className={cn('mr-1 inline-block h-2 w-2 rounded-sm align-middle', WORK_SHADES[v % WORK_SHADES.length])} />
                  {label}
                </span>
              ))
            ) : (
              <span>
                <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-green-500 align-middle" />
                Work
              </span>
            )}
            <span>
              <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-red-300 align-middle" />
              Rest
            </span>
          </span>
          <span className="shrink-0">
            {totalSeconds > 0 ? formatDuration(totalSeconds) : ''}
            {hasUntimed && (totalSeconds > 0 ? ' + reps' : 'Rep-based')}
          </span>
        </div>
      )}
    </div>
  )
}
