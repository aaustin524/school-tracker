'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { format, addDays } from 'date-fns'
import { toast } from 'sonner'
import type { Assignment, Child } from '@/types'
import { getSupabase } from '@/lib/supabase'
import { AddAssignmentDialog } from '@/components/AddAssignmentDialog'
import { AssignmentCard } from '@/components/AssignmentCard'
import { nameToSlug, getWeekRange, getSubjectColor, formatRelativeDate } from '@/lib/helpers'
import { DashboardSkeleton } from '@/components/Skeleton'
import { AlertTriangle } from 'lucide-react'

const CHILD_CONFIG: Record<string, { emoji: string; gradient: string; ring: string; accent: string; fillTop: string; fillBottom: string }> = {
  coral: { emoji: '⭐', gradient: 'from-red-500 to-yellow-400', ring: 'ring-red-300',    accent: '#f97316', fillTop: '#fde047', fillBottom: '#ef4444' },
  sky:   { emoji: '✨', gradient: 'from-purple-500 to-pink-400', ring: 'ring-purple-300', accent: '#a855f8', fillTop: '#e879f9', fillBottom: '#7c3aed' },
}

const TYPE_ICONS: Record<string, string> = { test: '📋', quiz: '✏️', project: '🔬' }

// ── Mini bucket for dashboard child cards ────────────────────────
function MiniBucket({ pct, theme }: { pct: number; theme: string }) {
  const [animPct, setAnimPct] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setAnimPct(pct), 350)
    return () => clearTimeout(t)
  }, [pct])

  const cfg = CHILD_CONFIG[theme] ?? CHILD_CONFIG.coral

  return (
    <div className="flex flex-col items-center gap-1">
      <div style={{ position: 'relative', width: 42, height: 52 }}>
        {/* Handle */}
        <div style={{
          position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
          width: 26, height: 13,
          border: `2.5px solid rgba(255,255,255,0.8)`, borderBottom: 'none',
          borderRadius: '13px 13px 0 0',
        }} />
        {/* Body */}
        <div style={{
          position: 'absolute', inset: 0,
          border: `2.5px solid rgba(255,255,255,0.8)`,
          borderRadius: '4px 4px 15px 15px',
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.2)',
        }}>
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: `${animPct}%`,
            background: `linear-gradient(to top, ${cfg.fillBottom}, ${cfg.fillTop})`,
            transition: 'height 1.3s cubic-bezier(0.4,0,0.2,1)',
            opacity: 0.9,
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              fontSize: 9, fontWeight: 900, fontFamily: 'Nunito, sans-serif',
              color: 'rgba(255,255,255,0.95)',
              textShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }}>
              {pct}%
            </span>
          </div>
        </div>
      </div>
      <span className="text-xs font-black text-white/80">week</span>
    </div>
  )
}

export default function DashboardPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const pendingDeletes = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const loadData = useCallback(async () => {
    const [assignmentsRes, childrenRes] = await Promise.all([
      fetch('/api/assignments'),
      getSupabase().from('children').select('*').order('name'),
    ])
    setAssignments(await assignmentsRes.json())
    setChildren(childrenRes.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function handleToggleComplete(id: string, completed: boolean) {
    const updated = assignments.map((a) => (a.id === id ? { ...a, completed } : a))
    setAssignments(updated)

    // Fire confetti if all of a child's today assignments are done
    if (completed) {
      const today = format(new Date(), 'yyyy-MM-dd')
      const a = assignments.find((x) => x.id === id)
      if (a) {
        const siblingToday = updated.filter((x) => x.child_id === a.child_id && x.due_date === today)
        if (siblingToday.length > 0 && siblingToday.every((x) => x.completed)) {
          import('canvas-confetti').then(({ default: confetti }) => {
            confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } })
          })
        }
      }
    }

    await fetch(`/api/assignments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed }),
    })
    toast.success(completed ? 'Marked complete! ✓' : 'Marked incomplete')
  }

  function handleDelete(id: string) {
    const item = assignments.find((a) => a.id === id)
    setAssignments((prev) => prev.filter((a) => a.id !== id))
    const timeout = setTimeout(() => {
      pendingDeletes.current.delete(id)
      fetch(`/api/assignments/${id}`, { method: 'DELETE' })
    }, 5000)
    pendingDeletes.current.set(id, timeout)
    toast('Assignment removed', {
      action: {
        label: 'Undo',
        onClick: () => {
          clearTimeout(pendingDeletes.current.get(id))
          pendingDeletes.current.delete(id)
          if (item) setAssignments((prev) => [...prev, item].sort((a, b) => a.due_date.localeCompare(b.due_date)))
        },
      },
    })
  }

  function handleEdit(updated: Assignment) {
    setAssignments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
  }

  if (loading) return <DashboardSkeleton />

  const todayStr    = format(new Date(), 'yyyy-MM-dd')
  const todayLabel  = format(new Date(), 'EEEE, MMMM d')
  const { start }   = getWeekRange()
  const mondayStr   = format(start, 'yyyy-MM-dd')
  const fridayStr   = format(addDays(start, 4), 'yyyy-MM-dd')
  const twoWeeksStr = format(addDays(new Date(), 14), 'yyyy-MM-dd')

  // ── Overdue: incomplete items before today ───────────────────
  const overdueByChild = children.map((child) => ({
    child,
    items: assignments.filter(
      (a) => a.child_id === child.id && !a.completed && a.due_date < todayStr
    ),
  })).filter((x) => x.items.length > 0)

  // ── Upcoming tests/quizzes/projects (next 14 days) ───────────
  const upcomingBig = assignments
    .filter((a) =>
      !a.completed &&
      !a.is_study_task &&
      (a.type === 'test' || a.type === 'quiz' || a.type === 'project') &&
      a.due_date >= todayStr &&
      a.due_date <= twoWeeksStr
    )
    .sort((a, b) => a.due_date.localeCompare(b.due_date))

  // ── Upcoming = not completed, today or future ────────────────
  const upcoming = assignments
    .filter((a) => !a.completed && a.due_date >= todayStr)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))

  return (
    <div className="space-y-6">
      {/* Date header */}
      <div className="text-center">
        <p className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-1">Today</p>
        <h1 className="text-4xl font-black text-indigo-800">{todayLabel}</h1>
      </div>

      {/* ── Overdue banner ─────────────────────────────────────── */}
      {overdueByChild.length > 0 && (
        <div className="rounded-2xl bg-red-50 border-2 border-red-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
            <p className="text-sm font-black text-red-600 uppercase tracking-wide">Overdue Items</p>
          </div>
          <div className="space-y-2">
            {overdueByChild.map(({ child, items }) => {
              const cfg = CHILD_CONFIG[child.theme] ?? CHILD_CONFIG.coral
              return (
                <div key={child.id} className="flex items-center gap-3 flex-wrap">
                  <span className="text-lg">{cfg.emoji}</span>
                  <span className="text-sm font-black text-gray-700">{child.name.split(' ')[0]}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((a) => (
                      <span key={a.id} className="rounded-full bg-red-100 border border-red-200 px-2.5 py-1 text-xs font-bold text-red-700">
                        {a.title} · <span className="font-black">{formatRelativeDate(a.due_date)}</span>
                      </span>
                    ))}
                  </div>
                  <a
                    href={`/${nameToSlug(child.name)}`}
                    className="ml-auto text-xs font-black text-red-500 hover:text-red-700 underline underline-offset-2"
                  >
                    View →
                  </a>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Per-child today cards ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {children.map((child) => {
          const cfg = CHILD_CONFIG[child.theme] ?? CHILD_CONFIG.coral

          const todayItems = assignments.filter(
            (a) => a.child_id === child.id && a.due_date === todayStr && !a.completed
          )
          const upcomingItems = upcoming.filter(
            (a) => a.child_id === child.id && a.due_date !== todayStr
          ).slice(0, 3)
          const doneToday = assignments.filter(
            (a) => a.child_id === child.id && a.due_date === todayStr && a.completed
          )

          // Mini bucket stats
          const weekItems  = assignments.filter((a) => a.child_id === child.id && a.due_date >= mondayStr && a.due_date <= fridayStr)
          const weekDone   = weekItems.filter((a) => a.completed).length
          const weekTotal  = weekItems.length
          const weekPct    = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0

          return (
            <div key={child.id} className="rounded-3xl bg-white/80 border-2 border-white shadow-lg overflow-hidden">
              {/* Child header */}
              <div className={`bg-gradient-to-r ${cfg.gradient} px-5 py-4 text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{cfg.emoji}</span>
                    <div>
                      <div className="font-black text-xl">{child.name.split(' ')[0]}</div>
                      <div className="text-sm font-semibold opacity-80">{child.grade}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {weekTotal > 0 && <MiniBucket pct={weekPct} theme={child.theme} />}
                    <a
                      href={`/${nameToSlug(child.name)}`}
                      className="text-xs font-black bg-white/20 hover:bg-white/30 rounded-full px-3 py-1.5 transition-colors"
                    >
                      Full week →
                    </a>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Today's items */}
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-gray-400 mb-2">
                    📅 Due Today
                  </p>
                  {todayItems.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-green-200 bg-green-50/50 p-4 text-center">
                      <span className="text-3xl">🎉</span>
                      <p className="text-sm font-black text-green-600 mt-1">Free day!</p>
                      <p className="text-xs text-green-400 font-medium">Nothing due today</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {todayItems.map((a) => (
                        <AssignmentCard key={a.id} assignment={a} child={child}
                          onToggleComplete={handleToggleComplete} onDelete={handleDelete} onEdit={handleEdit} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Coming up */}
                {upcomingItems.length > 0 && (
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-gray-400 mb-2">
                      ⏭️ Coming Up
                    </p>
                    <div className="space-y-2">
                      {upcomingItems.map((a) => (
                        <AssignmentCard key={a.id} assignment={a} child={child}
                          onToggleComplete={handleToggleComplete} onDelete={handleDelete} onEdit={handleEdit} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed today */}
                {doneToday.length > 0 && (
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-green-400 mb-2">
                      ✅ Done Today ({doneToday.length})
                    </p>
                    <div className="space-y-2">
                      {doneToday.map((a) => (
                        <AssignmentCard key={a.id} assignment={a} child={child}
                          onToggleComplete={handleToggleComplete} onDelete={handleDelete} onEdit={handleEdit} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Upcoming tests & projects (next 14 days) ──────────── */}
      {upcomingBig.length > 0 && (
        <div className="rounded-3xl bg-white/80 border-2 border-white shadow-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <span className="text-lg">🗓️</span>
            <h2 className="text-sm font-black uppercase tracking-wider text-indigo-600">
              Upcoming Tests &amp; Projects
            </h2>
            <span className="ml-auto rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-black text-indigo-600">
              next 14 days
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {upcomingBig.map((a) => {
              const child = children.find((c) => c.id === a.child_id)
              const cfg   = child ? (CHILD_CONFIG[child.theme] ?? CHILD_CONFIG.coral) : CHILD_CONFIG.coral
              const icon  = TYPE_ICONS[a.type] ?? '📌'
              const isToday    = a.due_date === todayStr
              const isTomorrow = a.due_date === format(addDays(new Date(), 1), 'yyyy-MM-dd')
              const urgent     = isToday || isTomorrow

              return (
                <div key={a.id} className={`flex items-center gap-3 px-5 py-3 ${urgent ? 'bg-red-50/50' : ''}`}>
                  {/* Child emoji */}
                  <span className="text-xl shrink-0">{cfg.emoji}</span>

                  {/* Type icon + title */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-gray-800">{icon} {a.title}</span>
                      {urgent && (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-black text-white ${isToday ? 'bg-red-500 animate-pulse' : 'bg-orange-400'}`}>
                          {isToday ? 'TODAY!' : 'Tomorrow'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-bold text-gray-400">{child?.name.split(' ')[0]}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${getSubjectColor(a.subject)}`}>
                        {a.subject}
                      </span>
                    </div>
                  </div>

                  {/* Date */}
                  <span className={`shrink-0 text-xs font-black rounded-full px-2.5 py-1 ${
                    urgent ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {formatRelativeDate(a.due_date)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Add button */}
      <div className="flex justify-center">
        <AddAssignmentDialog childOptions={children} onAdded={loadData} />
      </div>
    </div>
  )
}
