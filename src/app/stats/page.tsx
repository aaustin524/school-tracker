'use client'

import { useState, useEffect } from 'react'
import { format, subWeeks, startOfWeek, addDays } from 'date-fns'
import { getSupabase } from '@/lib/supabase'
import { calculateStreak, getSubjectColor } from '@/lib/helpers'
import type { Assignment, Child } from '@/types'

const CHILD_CONFIG: Record<string, { emoji: string; accent: string; bar: string }> = {
  coral: { emoji: '⭐', accent: 'text-orange-600', bar: 'bg-gradient-to-r from-red-400 to-yellow-400' },
  sky:   { emoji: '✨', accent: 'text-purple-600', bar: 'bg-gradient-to-r from-purple-500 to-pink-400' },
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white/80 border-2 border-white shadow-sm p-4 text-center">
      <div className="text-3xl font-black text-indigo-700">{value}</div>
      <div className="text-xs font-black uppercase tracking-wide text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

function BarRow({ label, value, max, color, count }: { label: string; value: number; max: number; color: string; count: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs font-bold text-gray-600 truncate">{label}</span>
      <div className="flex-1 h-4 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-xs font-black text-gray-500">{count}</span>
    </div>
  )
}

export default function StatsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [assignRes, childrenRes] = await Promise.all([
        fetch('/api/assignments'),
        getSupabase().from('children').select('*').order('name'),
      ])
      setAssignments(await assignRes.json())
      setChildren(childrenRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-gray-200 rounded-2xl w-48" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  const today = format(new Date(), 'yyyy-MM-dd')

  // ── Per-child summaries ───────────────────────────────────────────
  const childStats = children.map((child) => {
    const mine = assignments.filter((a) => a.child_id === child.id)
    const completed = mine.filter((a) => a.completed)
    const total = mine.length
    const rate = total > 0 ? Math.round((completed.length / total) * 100) : 0
    const streak = calculateStreak(mine)
    const cfg = CHILD_CONFIG[child.theme] ?? CHILD_CONFIG.coral

    // Best streak (approximate by looking at all past days)
    let bestStreak = streak
    let run = 0
    const sorted = [...mine].sort((a, b) => a.due_date.localeCompare(b.due_date))
    const dayMap = new Map<string, Assignment[]>()
    for (const a of sorted) {
      const list = dayMap.get(a.due_date) ?? []
      list.push(a)
      dayMap.set(a.due_date, list)
    }
    for (const [date, items] of Array.from(dayMap.entries())) {
      if (date >= today) break
      if (items.every((a) => a.completed)) {
        run++
        bestStreak = Math.max(bestStreak, run)
      } else {
        run = 0
      }
    }

    return { child, mine, completed, total, rate, streak, bestStreak, cfg }
  })

  // ── Weekly completion chart (last 8 weeks) ────────────────────────
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const monday = startOfWeek(subWeeks(new Date(), 7 - i), { weekStartsOn: 1 })
    const mondayStr = format(monday, 'yyyy-MM-dd')
    const fridayStr = format(addDays(monday, 4), 'yyyy-MM-dd')
    const label = format(monday, 'MMM d')
    return { monday, mondayStr, fridayStr, label }
  })

  const weekData = weeks.map(({ mondayStr, fridayStr, label }) => {
    const childBars = children.map((child) => {
      const items = assignments.filter(
        (a) => a.child_id === child.id && a.due_date >= mondayStr && a.due_date <= fridayStr && a.due_date < today
      )
      const done = items.filter((a) => a.completed).length
      const pct = items.length > 0 ? Math.round((done / items.length) * 100) : null
      const cfg = CHILD_CONFIG[child.theme] ?? CHILD_CONFIG.coral
      return { child, done, total: items.length, pct, cfg }
    })
    return { label, childBars }
  })

  // ── Subject breakdown ──────────────────────────────────────────────
  const subjectCounts: Record<string, number> = {}
  for (const a of assignments) {
    subjectCounts[a.subject] = (subjectCounts[a.subject] ?? 0) + 1
  }
  const subjectEntries = Object.entries(subjectCounts).sort((a, b) => b[1] - a[1])
  const maxSubjectCount = subjectEntries[0]?.[1] ?? 1

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <p className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-1">Overview</p>
        <h1 className="text-4xl font-black text-indigo-800">Stats &amp; Progress</h1>
      </div>

      {/* ── Per-child summary cards ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {childStats.map(({ child, completed, total, rate, streak, bestStreak, cfg }) => (
          <div key={child.id} className="rounded-3xl bg-white/80 border-2 border-white shadow-lg overflow-hidden">
            <div className={`px-5 py-4 flex items-center gap-3 ${child.theme === 'coral' ? 'bg-gradient-to-r from-red-500 to-yellow-400' : 'bg-gradient-to-r from-purple-500 to-pink-400'}`}>
              <span className="text-4xl">{cfg.emoji}</span>
              <div className="text-white">
                <div className="font-black text-xl">{child.name.split(' ')[0]}</div>
                <div className="text-sm font-semibold opacity-80">{child.grade}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-0 divide-x divide-gray-100 p-0">
              <div className="p-4 text-center">
                <div className={`text-3xl font-black ${cfg.accent}`}>{completed.length}</div>
                <div className="text-xs font-bold text-gray-400 mt-0.5 uppercase tracking-wide">completed</div>
              </div>
              <div className="p-4 text-center">
                <div className={`text-3xl font-black ${cfg.accent}`}>{rate}%</div>
                <div className="text-xs font-bold text-gray-400 mt-0.5 uppercase tracking-wide">completion</div>
              </div>
              <div className="p-4 text-center">
                <div className={`text-3xl font-black ${cfg.accent}`}>🔥{streak}</div>
                <div className="text-xs font-bold text-gray-400 mt-0.5 uppercase tracking-wide">streak</div>
                {bestStreak > streak && (
                  <div className="text-xs text-gray-400">best: {bestStreak}</div>
                )}
              </div>
            </div>
            {/* Completion progress bar */}
            <div className="px-5 pb-4">
              <div className="flex justify-between text-xs font-bold text-gray-400 mb-1">
                <span>{completed.length} of {total} all-time</span>
                <span>{rate}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                <div className={`h-full rounded-full ${cfg.bar} transition-all duration-700`} style={{ width: `${rate}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Weekly completion chart ──────────────────────────────────── */}
      <div className="rounded-3xl bg-white/80 border-2 border-white shadow-lg p-6">
        <h2 className="text-sm font-black uppercase tracking-wider text-indigo-600 mb-5">📅 Completion Rate — Last 8 Weeks</h2>
        <div className="grid grid-cols-8 gap-2 items-end" style={{ height: 120 }}>
          {weekData.map(({ label, childBars }) => (
            <div key={label} className="flex flex-col items-center gap-1 h-full justify-end">
              <div className="flex items-end gap-0.5 h-full">
                {childBars.map(({ child, pct, cfg }) => (
                  <div
                    key={child.id}
                    title={pct !== null ? `${child.name.split(' ')[0]}: ${pct}%` : 'No data'}
                    className={`w-4 rounded-t-md transition-all duration-700 ${pct !== null ? cfg.bar : 'bg-gray-100'}`}
                    style={{ height: pct !== null ? `${Math.max(pct, 4)}%` : '8%' }}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-400 font-bold whitespace-nowrap" style={{ fontSize: 9 }}>{label}</span>
            </div>
          ))}
        </div>
        {/* Legend */}
        <div className="flex gap-4 mt-4">
          {children.map((child) => {
            const cfg = CHILD_CONFIG[child.theme] ?? CHILD_CONFIG.coral
            return (
              <div key={child.id} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-sm ${cfg.bar}`} />
                <span className="text-xs font-bold text-gray-500">{child.name.split(' ')[0]}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Subject breakdown ────────────────────────────────────────── */}
      <div className="rounded-3xl bg-white/80 border-2 border-white shadow-lg p-6">
        <h2 className="text-sm font-black uppercase tracking-wider text-indigo-600 mb-5">📚 Assignments by Subject</h2>
        <div className="space-y-3">
          {subjectEntries.map(([subject, count]) => (
            <BarRow
              key={subject}
              label={subject}
              value={count}
              max={maxSubjectCount}
              color={getSubjectColor(subject).split(' ')[0].replace('text-', 'bg-').replace('100', '400')}
              count={count}
            />
          ))}
        </div>
      </div>

      {/* ── Test scores ──────────────────────────────────────────────── */}
      {(() => {
        const scored = assignments.filter((a) => a.completed && a.score != null)
        if (scored.length === 0) return null
        return (
          <div className="rounded-3xl bg-white/80 border-2 border-white shadow-lg p-6">
            <h2 className="text-sm font-black uppercase tracking-wider text-indigo-600 mb-5">🎯 Recent Scores</h2>
            <div className="space-y-2">
              {[...scored].sort((a, b) => b.due_date.localeCompare(a.due_date)).slice(0, 10).map((a) => {
                const child = children.find((c) => c.id === a.child_id)
                const cfg = CHILD_CONFIG[child?.theme ?? 'coral'] ?? CHILD_CONFIG.coral
                const scoreColor = a.score! >= 90 ? 'bg-green-100 text-green-700'
                  : a.score! >= 80 ? 'bg-blue-100 text-blue-700'
                  : a.score! >= 70 ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
                return (
                  <div key={a.id} className="flex items-center gap-3">
                    <span>{cfg.emoji}</span>
                    <span className="flex-1 text-sm font-bold text-gray-700 truncate">{a.title}</span>
                    <span className="text-xs text-gray-400">{a.subject}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${scoreColor}`}>{a.score}/100</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* ── Quick totals ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total assignments" value={assignments.length} />
        <StatCard label="Completed" value={assignments.filter((a) => a.completed).length} />
        <StatCard label="Remaining" value={assignments.filter((a) => !a.completed && a.due_date >= today).length} />
        <StatCard label="Overdue" value={assignments.filter((a) => !a.completed && a.due_date < today).length} sub="needs attention" />
      </div>
    </div>
  )
}
