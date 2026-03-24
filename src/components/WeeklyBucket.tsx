'use client'

import { useEffect, useState } from 'react'

const MILESTONES = [
  { pct: 0,   emoji: '🚀', text: "Let's go!" },
  { pct: 1,   emoji: '💪', text: 'Good start!' },
  { pct: 50,  emoji: '🔥', text: 'Halfway there!' },
  { pct: 75,  emoji: '⭐', text: 'Almost done!' },
  { pct: 100, emoji: '🎉', text: 'ALL DONE!' },
]

function getMsg(pct: number) {
  return [...MILESTONES].reverse().find((m) => pct >= m.pct) ?? MILESTONES[0]
}

// Fixed positions — no Math.random() to avoid hydration mismatch
const BUBBLES = [
  { x: 18, delay: '0s',    dur: '2.1s' },
  { x: 42, delay: '0.7s',  dur: '2.6s' },
  { x: 68, delay: '0.3s',  dur: '1.9s' },
  { x: 80, delay: '1.3s',  dur: '2.4s' },
  { x: 30, delay: '1.8s',  dur: '2.8s' },
]

const CONFETTI = ['⭐', '🎉', '✨', '🌟', '🎊']

export function WeeklyBucket({
  pct,
  done,
  total,
  theme,
}: {
  pct: number
  done: number
  total: number
  theme: string
}) {
  const [animPct, setAnimPct] = useState(0)

  // Delay the fill animation so it plays on mount
  useEffect(() => {
    const t = setTimeout(() => setAnimPct(pct), 200)
    return () => clearTimeout(t)
  }, [pct])

  const isMario    = theme === 'coral'
  const particle   = isMario ? '⭐' : '✨'
  const accent     = isMario ? '#f97316' : '#a855f8'
  const fillTop    = isMario ? '#fde047' : '#e879f9'
  const fillBottom = isMario ? '#ef4444' : '#7c3aed'
  const bgGlow     = isMario ? 'rgba(249,115,22,0.07)' : 'rgba(168,85,247,0.07)'
  const msg        = getMsg(pct)
  const isComplete = pct === 100

  return (
    <div
      className="rounded-3xl border-2 border-white shadow-lg px-6 py-5"
      style={{ background: `linear-gradient(135deg, #ffffff 0%, ${bgGlow} 100%)` }}
    >
      <p className="text-xs font-black uppercase tracking-widest text-center mb-5"
         style={{ color: accent }}>
        🪣 Weekly Bucket
      </p>

      <div className="flex items-center justify-center gap-10">

        {/* ── Bucket visual ── */}
        <div
          className="relative flex-shrink-0"
          style={{ width: 90, height: 118, animation: 'bucket-float 3s ease-in-out infinite' }}
        >
          {/* Handle */}
          <div style={{
            position: 'absolute', top: -17, left: '50%',
            transform: 'translateX(-50%)',
            width: 54, height: 21,
            border: `3.5px solid ${accent}`,
            borderBottom: 'none',
            borderRadius: '27px 27px 0 0',
          }} />

          {/* Body */}
          <div style={{
            position: 'absolute', inset: 0,
            border: `3px solid ${accent}`,
            borderRadius: '6px 6px 24px 24px',
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.55)',
            boxShadow: `inset 0 -4px 12px ${fillBottom}22`,
          }}>

            {/* Fill */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              height: `${animPct}%`,
              background: `linear-gradient(to top, ${fillBottom}, ${fillTop})`,
              transition: 'height 1.4s cubic-bezier(0.4, 0, 0.2, 1)',
              opacity: 0.88,
            }}>
              {/* Wavy liquid surface */}
              {animPct > 3 && (
                <div style={{
                  position: 'absolute', top: -8, left: -4, right: -4,
                  height: 18,
                  background: fillTop,
                  animation: 'liquid-wave 2.2s ease-in-out infinite',
                  opacity: 0.9,
                }} />
              )}

              {/* Rising bubbles / particles */}
              {animPct > 8 && BUBBLES.map((b, i) => (
                <span key={i} style={{
                  position: 'absolute',
                  left: `${b.x}%`,
                  bottom: '8%',
                  fontSize: 9,
                  animation: `bubble-rise ${b.dur} ease-in infinite`,
                  animationDelay: b.delay,
                }}>
                  {particle}
                </span>
              ))}
            </div>

            {/* Tick marks at 25 / 50 / 75 */}
            {[25, 50, 75].map((mark) => (
              <div key={mark} style={{
                position: 'absolute', right: 5, bottom: `${mark}%`,
                width: 9, height: 1.5,
                background: animPct >= mark ? 'rgba(255,255,255,0.85)' : `${accent}35`,
                borderRadius: 1, transition: 'background 0.4s',
              }} />
            ))}

            {/* % label */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontSize: 20, fontWeight: 900,
                fontFamily: 'Nunito, sans-serif',
                color: animPct > 52 ? 'rgba(255,255,255,0.95)' : accent,
                textShadow: animPct > 52 ? '0 1px 6px rgba(0,0,0,0.25)' : 'none',
                transition: 'color 0.6s',
              }}>
                {pct}%
              </span>
            </div>
          </div>

          {/* Confetti burst when complete */}
          {isComplete && CONFETTI.map((e, i) => (
            <span key={i} style={{
              position: 'absolute',
              fontSize: 14,
              left: `${8 + i * 18}%`,
              top: -10,
              animation: `celebrate-pop 1.4s ease-out infinite`,
              animationDelay: `${i * 0.25}s`,
            }}>
              {e}
            </span>
          ))}
        </div>

        {/* ── Stats panel ── */}
        <div className="flex flex-col items-center gap-2">
          {/* Big fraction */}
          <div className="text-center">
            <span className="text-4xl font-black" style={{ color: accent }}>{done}</span>
            <span className="text-lg font-bold text-gray-300"> / </span>
            <span className="text-xl font-black text-gray-400">{total}</span>
            <p className="text-xs font-bold text-gray-400 mt-0.5">tasks this week</p>
          </div>

          {/* Message */}
          <div className="text-center mt-1">
            <div className="text-3xl">{msg.emoji}</div>
            <p className="text-sm font-black mt-1" style={{ color: accent }}>{msg.text}</p>
          </div>

          {/* Milestone dots */}
          <div className="flex items-center gap-1.5 mt-2">
            {[25, 50, 75, 100].map((m) => (
              <div key={m} style={{
                width: 11, height: 11,
                borderRadius: '50%',
                background: pct >= m ? accent : '#e5e7eb',
                boxShadow: pct >= m ? `0 0 6px ${accent}80` : 'none',
                transition: 'background 0.5s, box-shadow 0.5s',
              }} />
            ))}
          </div>
          <p className="text-xs font-bold text-gray-400">
            {pct < 100 ? `next milestone: ${[25,50,75,100].find(m => pct < m)}%` : '🏆 complete!'}
          </p>
        </div>
      </div>
    </div>
  )
}
