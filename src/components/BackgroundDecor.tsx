// Static positions — no Math.random() to avoid hydration mismatch
const DECOR: {
  emoji: string
  x: number   // % from left
  y: number   // % from top
  size: number
  op: number  // opacity
  rot: number // degrees
  anim: string
  dur: string
}[] = [
  // ── Mario side (left) ────────────────────────────────────────
  { emoji: '⭐', x:  3, y: 10, size: 36, op: 0.18, rot:  15, anim: 'decor-spin',    dur: '14s'  },
  { emoji: '🍄', x:  8, y: 40, size: 28, op: 0.16, rot: -10, anim: 'decor-float-a', dur: '5.5s' },
  { emoji: '🪙', x:  4, y: 68, size: 22, op: 0.14, rot:   5, anim: 'decor-float-b', dur: '6s'   },
  { emoji: '❤️', x: 14, y: 22, size: 20, op: 0.15, rot:  20, anim: 'decor-float-a', dur: '7s'   },
  { emoji: '⭐', x: 18, y: 80, size: 18, op: 0.12, rot: -20, anim: 'decor-spin',    dur: '18s'  },
  { emoji: '🍄', x: 23, y: 55, size: 24, op: 0.13, rot:   8, anim: 'decor-float-b', dur: '8s'   },
  { emoji: '🪙', x: 10, y: 90, size: 18, op: 0.11, rot: -12, anim: 'decor-float-a', dur: '6.5s' },
  { emoji: '⭐', x: 28, y: 12, size: 16, op: 0.10, rot:  30, anim: 'decor-spin',    dur: '22s'  },
  { emoji: '🍄', x:  2, y: 52, size: 16, op: 0.10, rot: -5,  anim: 'decor-float-b', dur: '9s'   },

  // ── Taylor Swift side (right) ─────────────────────────────────
  { emoji: '✨', x: 72, y:  8, size: 34, op: 0.20, rot:  10, anim: 'decor-sparkle', dur: '4s'   },
  { emoji: '🎸', x: 87, y: 38, size: 28, op: 0.16, rot: -15, anim: 'decor-float-a', dur: '6s'   },
  { emoji: '🎵', x: 78, y: 68, size: 22, op: 0.14, rot:  18, anim: 'decor-float-b', dur: '7.5s' },
  { emoji: '💜', x: 93, y: 20, size: 20, op: 0.15, rot:  -8, anim: 'decor-sparkle', dur: '5s'   },
  { emoji: '🦋', x: 82, y: 85, size: 26, op: 0.16, rot:  12, anim: 'decor-float-a', dur: '8s'   },
  { emoji: '✨', x: 96, y: 55, size: 18, op: 0.18, rot:  -5, anim: 'decor-sparkle', dur: '3.5s' },
  { emoji: '🎵', x: 68, y: 30, size: 16, op: 0.12, rot:  22, anim: 'decor-float-b', dur: '9s'   },
  { emoji: '💜', x: 76, y: 50, size: 18, op: 0.11, rot: -18, anim: 'decor-float-a', dur: '6s'   },
  { emoji: '🎸', x: 90, y: 78, size: 16, op: 0.10, rot:  10, anim: 'decor-float-b', dur: '10s'  },

  // ── Centre sprinkle ───────────────────────────────────────────
  { emoji: '⭐', x: 38, y:  6, size: 20, op: 0.10, rot:  25, anim: 'decor-spin',    dur: '16s'  },
  { emoji: '✨', x: 58, y: 14, size: 20, op: 0.12, rot: -10, anim: 'decor-sparkle', dur: '4.5s' },
  { emoji: '🪙', x: 44, y: 92, size: 16, op: 0.10, rot:   5, anim: 'decor-float-a', dur: '7s'   },
  { emoji: '💜', x: 62, y: 88, size: 16, op: 0.10, rot: -15, anim: 'decor-float-b', dur: '8.5s' },
]

export function BackgroundDecor() {
  return (
    <div
      className="pointer-events-none select-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden
    >
      {DECOR.map((d, i) => (
        <span
          key={i}
          className={d.anim}
          style={{
            position: 'absolute',
            left: `${d.x}%`,
            top: `${d.y}%`,
            fontSize: `${d.size}px`,
            opacity: d.op,
            '--r':   `${d.rot}deg`,
            '--op':  d.op,
            '--dur': d.dur,
            lineHeight: 1,
            display: 'block',
            willChange: 'transform',
          } as React.CSSProperties}
        >
          {d.emoji}
        </span>
      ))}
    </div>
  )
}
