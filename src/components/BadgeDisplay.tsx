'use client'

import { ALL_BADGES, getEarnedBadgeIds } from '@/lib/badges'
import type { Assignment } from '@/types'

export function BadgeDisplay({ assignments, accent }: { assignments: Assignment[]; accent: string }) {
  const earned = getEarnedBadgeIds(assignments)
  const earnedBadges = ALL_BADGES.filter((b) => earned.has(b.id))
  const lockedBadges = ALL_BADGES.filter((b) => !earned.has(b.id))

  return (
    <div className="rounded-2xl bg-white/70 border-2 border-white shadow-sm px-5 py-4">
      <p className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">🏅 Badges</p>

      {earnedBadges.length === 0 && (
        <p className="text-xs text-gray-400 italic mb-3">No badges yet — keep completing assignments!</p>
      )}

      {earnedBadges.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {earnedBadges.map((badge) => (
            <div
              key={badge.id}
              title={badge.desc}
              className="group relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black shadow-sm border-2 border-white"
              style={{ background: `linear-gradient(135deg, ${accent}22, ${accent}44)`, borderColor: `${accent}44` }}
            >
              <span className="text-base">{badge.emoji}</span>
              <span style={{ color: accent }}>{badge.name}</span>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                <div className="bg-gray-800 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap shadow-lg">
                  {badge.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Locked badges */}
      <div className="flex flex-wrap gap-1.5">
        {lockedBadges.map((badge) => (
          <div
            key={badge.id}
            title={`Locked: ${badge.desc}`}
            className="group relative flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-gray-400 bg-gray-100 border border-gray-200 opacity-50"
          >
            <span className="grayscale">{badge.emoji}</span>
            <span className="hidden sm:inline">{badge.name}</span>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
              <div className="bg-gray-800 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap shadow-lg">
                🔒 {badge.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
