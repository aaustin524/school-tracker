'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { addDays, format } from 'date-fns'
import { AlertTriangle, CalendarDays, CheckCircle2, SlidersHorizontal, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import type { Assignment, Child } from '@/types'
import { getSupabase } from '@/lib/supabase'
import { AddAssignmentDialog } from '@/components/AddAssignmentDialog'
import { AssignmentCard } from '@/components/AssignmentCard'
import { DashboardSkeleton } from '@/components/Skeleton'
import { getSubjectColor, getWeekRange, formatRelativeDate, nameToSlug } from '@/lib/helpers'

const CHILD_CONFIG: Record<string, { emoji: string; gradient: string; ring: string; accent: string; fillTop: string; fillBottom: string }> = {
  coral: { emoji: '⭐', gradient: 'from-red-500 to-yellow-400', ring: 'ring-red-300', accent: '#f97316', fillTop: '#fde047', fillBottom: '#ef4444' },
  sky: { emoji: '✨', gradient: 'from-purple-500 to-pink-400', ring: 'ring-purple-300', accent: '#a855f8', fillTop: '#e879f9', fillBottom: '#7c3aed' },
}

const TYPE_ICONS: Record<string, string> = { test: '📋', quiz: '✏️', project: '🔬' }

const TIME_FILTERS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'upcoming', label: 'Upcoming' },
] as const

type TimeFilter = (typeof TIME_FILTERS)[number]['key']

type ChildDashboardData = {
  child: Child
  dueTodayItems: Assignment[]
  overdueItems: Assignment[]
  completedTodayItems: Assignment[]
  primaryItems: Assignment[]
  secondaryItems: Assignment[]
  weekPct: number
  weekTotal: number
}

function sortByDueDate(items: Assignment[]) {
  return [...items].sort((a, b) => a.due_date.localeCompare(b.due_date))
}

function matchesTimeFilter(dateStr: string, filter: TimeFilter, todayStr: string, fridayStr: string) {
  if (filter === 'today') return dateStr === todayStr
  if (filter === 'week') return dateStr >= todayStr && dateStr <= fridayStr
  return dateStr > fridayStr
}

function getUrgencyRank(assignment: Assignment, todayStr: string, tomorrowStr: string, twoWeeksStr: string) {
  if (assignment.completed) return null
  if (assignment.due_date < todayStr) return 0
  if (assignment.due_date === todayStr) return 1
  if (assignment.due_date === tomorrowStr) return 2
  if (
    !assignment.is_study_task &&
    (assignment.type === 'test' || assignment.type === 'quiz' || assignment.type === 'project') &&
    assignment.due_date <= twoWeeksStr
  ) {
    return 3
  }
  return null
}

function getPrimarySectionLabel(filter: TimeFilter) {
  if (filter === 'today') return '📅 Due Today'
  if (filter === 'week') return '🗓️ This Week'
  return '🌤️ Upcoming'
}

function getEmptyStateCopy(filter: TimeFilter) {
  if (filter === 'today') {
    return {
      emoji: '🎉',
      title: 'Free day!',
      body: 'Nothing due today. That is a win.',
    }
  }
  if (filter === 'week') {
    return {
      emoji: '🌈',
      title: 'This week looks calm',
      body: 'No unfinished items left for the school week.',
    }
  }
  return {
    emoji: '✨',
    title: 'Future is looking clear',
    body: 'Nothing waiting beyond this week right now.',
  }
}

function MiniBucket({ pct, theme }: { pct: number; theme: string }) {
  const [animPct, setAnimPct] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setAnimPct(pct), 350)
    return () => clearTimeout(t)
  }, [pct])

  const cfg = CHILD_CONFIG[theme] ?? CHILD_CONFIG.coral

  return (
    <div className="flex min-w-[54px] flex-col items-center gap-1.5">
      <div style={{ position: 'relative', width: 42, height: 52 }}>
        <div
          style={{
            position: 'absolute',
            top: -11,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 26,
            height: 13,
            border: '2.5px solid rgba(255,255,255,0.8)',
            borderBottom: 'none',
            borderRadius: '13px 13px 0 0',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            border: '2.5px solid rgba(255,255,255,0.8)',
            borderRadius: '4px 4px 15px 15px',
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.2)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: `${animPct}%`,
              background: `linear-gradient(to top, ${cfg.fillBottom}, ${cfg.fillTop})`,
              transition: 'height 1.3s cubic-bezier(0.4,0,0.2,1)',
              opacity: 0.9,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontSize: 9,
                fontWeight: 900,
                fontFamily: 'Nunito, sans-serif',
                color: 'rgba(255,255,255,0.95)',
                textShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}
            >
              {pct}%
            </span>
          </div>
        </div>
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/80">week</span>
    </div>
  )
}

export default function DashboardPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [childFilter, setChildFilter] = useState<string>('all')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today')
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

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleToggleComplete(id: string, completed: boolean) {
    const updated = assignments.map((a) => (a.id === id ? { ...a, completed } : a))
    setAssignments(updated)

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
          if (item) {
            setAssignments((prev) => [...prev, item].sort((a, b) => a.due_date.localeCompare(b.due_date)))
          }
        },
      },
    })
  }

  function handleEdit(updated: Assignment) {
    setAssignments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
  }

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const tomorrowStr = format(addDays(today, 1), 'yyyy-MM-dd')
  const todayLabel = format(today, 'EEEE, MMMM d')
  const { start } = getWeekRange()
  const mondayStr = format(start, 'yyyy-MM-dd')
  const fridayStr = format(addDays(start, 4), 'yyyy-MM-dd')
  const twoWeeksStr = format(addDays(today, 14), 'yyyy-MM-dd')

  const childrenById = useMemo(
    () => new Map(children.map((child) => [child.id, child])),
    [children]
  )

  const selectedChildren = useMemo(
    () => (childFilter === 'all' ? children : children.filter((child) => child.id === childFilter)),
    [childFilter, children]
  )

  const dueToday = useMemo(
    () => assignments.filter((a) => !a.completed && a.due_date === todayStr),
    [assignments, todayStr]
  )

  const completedToday = useMemo(
    () => assignments.filter((a) => a.completed && a.due_date === todayStr),
    [assignments, todayStr]
  )

  const overdue = useMemo(
    () => assignments.filter((a) => !a.completed && a.due_date < todayStr),
    [assignments, todayStr]
  )

  const upcoming = useMemo(
    () => sortByDueDate(assignments.filter((a) => !a.completed && a.due_date >= todayStr)),
    [assignments, todayStr]
  )

  const upcomingBig = useMemo(
    () =>
      upcoming.filter(
        (a) =>
          !a.is_study_task &&
          (a.type === 'test' || a.type === 'quiz' || a.type === 'project') &&
          a.due_date <= twoWeeksStr
      ),
    [twoWeeksStr, upcoming]
  )

  const weekStats = useMemo(() => {
    const stats = new Map<string, { weekTotal: number; weekDone: number; weekPct: number }>()

    children.forEach((child) => {
      const childAssignments = assignments.filter((a) => a.child_id === child.id)
      const weekItems = childAssignments.filter((a) => a.due_date >= mondayStr && a.due_date <= fridayStr)
      const weekDone = weekItems.filter((a) => a.completed).length
      const weekTotal = weekItems.length

      stats.set(child.id, {
        weekTotal,
        weekDone,
        weekPct: weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0,
      })
    })

    return stats
  }, [assignments, children, fridayStr, mondayStr])

  const childCards = useMemo<ChildDashboardData[]>(
    () =>
      selectedChildren.map((child) => {
        const childAssignments = sortByDueDate(assignments.filter((a) => a.child_id === child.id))
        const dueTodayItems = childAssignments.filter((a) => !a.completed && a.due_date === todayStr)
        const overdueItems = childAssignments.filter((a) => !a.completed && a.due_date < todayStr)
        const completedTodayItems = childAssignments.filter((a) => a.completed && a.due_date === todayStr)

        const primaryItems = childAssignments.filter(
          (a) => !a.completed && matchesTimeFilter(a.due_date, timeFilter, todayStr, fridayStr)
        )

        const secondaryItems = childAssignments.filter((a) => {
          if (a.completed) return false
          if (timeFilter === 'today') return a.due_date > todayStr
          if (timeFilter === 'week') return a.due_date > fridayStr
          return false
        }).slice(0, 3)

        const stats = weekStats.get(child.id) ?? { weekTotal: 0, weekDone: 0, weekPct: 0 }

        return {
          child,
          dueTodayItems,
          overdueItems,
          completedTodayItems,
          primaryItems,
          secondaryItems,
          weekPct: stats.weekPct,
          weekTotal: stats.weekTotal,
        }
      }),
    [assignments, fridayStr, selectedChildren, timeFilter, todayStr, weekStats]
  )

  const filteredUpcomingBig = useMemo(
    () =>
      upcomingBig.filter((assignment) => {
        const matchesChild = childFilter === 'all' || assignment.child_id === childFilter
        return matchesChild && matchesTimeFilter(assignment.due_date, timeFilter, todayStr, fridayStr)
      }),
    [childFilter, fridayStr, timeFilter, todayStr, upcomingBig]
  )

  const topUrgentItems = useMemo(
    () =>
      assignments
        .filter((assignment) => childFilter === 'all' || assignment.child_id === childFilter)
        .map((assignment) => ({
          assignment,
          rank: getUrgencyRank(assignment, todayStr, tomorrowStr, twoWeeksStr),
        }))
        .filter((entry): entry is { assignment: Assignment; rank: number } => entry.rank !== null)
        .sort((a, b) => {
          if (a.rank !== b.rank) return a.rank - b.rank
          if (a.assignment.due_date !== b.assignment.due_date) {
            return a.assignment.due_date.localeCompare(b.assignment.due_date)
          }
          return a.assignment.title.localeCompare(b.assignment.title)
        })
        .slice(0, 5),
    [assignments, childFilter, todayStr, tomorrowStr, twoWeeksStr]
  )

  const groupedUrgentItems = useMemo(() => {
    const groups: Array<{
      key: 'overdue' | 'today' | 'tomorrow'
      label: string
      items: typeof topUrgentItems
    }> = [
      {
        key: 'overdue',
        label: 'Overdue',
        items: topUrgentItems.filter(({ rank }) => rank === 0),
      },
      {
        key: 'today',
        label: 'Today',
        items: topUrgentItems.filter(({ rank }) => rank === 1),
      },
      {
        key: 'tomorrow',
        label: 'Tomorrow',
        items: topUrgentItems.filter(({ rank }) => rank >= 2),
      },
    ]

    return groups.filter((group) => group.items.length > 0)
  }, [topUrgentItems])

  if (loading) return <DashboardSkeleton />

  return (
    <div className="space-y-8 pb-4">
      <div className="rounded-[2rem] border border-white/70 bg-gradient-to-br from-white via-indigo-50/80 to-amber-50/70 p-6 shadow-[0_24px_60px_-24px_rgba(79,70,229,0.35)]">
        <div className="text-center">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.35em] text-indigo-500">Family Dashboard</p>
          <h1 className="text-4xl font-black tracking-tight text-slate-800">{todayLabel}</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm font-medium text-slate-500">
            A calm, clear look at what needs attention today and what is coming next.
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-amber-100 bg-white/90 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-amber-500">
              <CalendarDays className="h-4 w-4" />
              <span className="text-xs font-black uppercase tracking-[0.22em]">Due Today</span>
            </div>
            <p className="mt-3 text-3xl font-black text-slate-800">{dueToday.length}</p>
            <p className="mt-1 text-sm font-medium text-slate-500">Assignments still waiting today</p>
          </div>

          <div className="rounded-3xl border border-rose-100 bg-white/90 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-rose-500">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-black uppercase tracking-[0.22em]">Overdue</span>
            </div>
            <p className="mt-3 text-3xl font-black text-slate-800">{overdue.length}</p>
            <p className="mt-1 text-sm font-medium text-slate-500">Past-due items to wrap up first</p>
          </div>

          <div className="rounded-3xl border border-emerald-100 bg-white/90 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-500">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-black uppercase tracking-[0.22em]">Completed Today</span>
            </div>
            <p className="mt-3 text-3xl font-black text-slate-800">{completedToday.length}</p>
            <p className="mt-1 text-sm font-medium text-slate-500">Due-today items already finished</p>
          </div>

          <div className="rounded-3xl border border-indigo-100 bg-white/90 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-indigo-500">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-black uppercase tracking-[0.22em]">Big Next 14 Days</span>
            </div>
            <p className="mt-3 text-3xl font-black text-slate-800">{upcomingBig.length}</p>
            <p className="mt-1 text-sm font-medium text-slate-500">Tests, quizzes, and projects ahead</p>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200/70 bg-white/80 p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-slate-600">
              <SlidersHorizontal className="h-4 w-4" />
              <span className="text-xs font-black uppercase tracking-[0.24em]">Filter View</span>
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setChildFilter('all')}
                  className={`rounded-full px-4 py-2 text-sm font-black transition ${
                    childFilter === 'all'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All
                </button>
                {children.map((child) => {
                  const cfg = CHILD_CONFIG[child.theme] ?? CHILD_CONFIG.coral
                  const active = childFilter === child.id

                  return (
                    <button
                      key={child.id}
                      onClick={() => setChildFilter(child.id)}
                      className={`rounded-full px-4 py-2 text-sm font-black transition ${
                        active
                          ? 'text-white shadow-sm'
                          : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                      }`}
                      style={active ? { backgroundColor: cfg.accent } : undefined}
                    >
                      {cfg.emoji} {child.name.split(' ')[0]}
                    </button>
                  )
                })}
              </div>

              <div className="flex flex-wrap gap-2">
                {TIME_FILTERS.map((option) => (
                  <button
                    key={option.key}
                    onClick={() => setTimeFilter(option.key)}
                    className={`rounded-full px-4 py-2 text-sm font-black transition ${
                      timeFilter === option.key
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white bg-white/90 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.35)] overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="rounded-2xl bg-rose-100 p-2 text-rose-500">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.22em] text-slate-700">Needs Attention First</h2>
            <p className="text-sm text-slate-500">The top urgent unfinished items across the planner.</p>
          </div>
        </div>

        {topUrgentItems.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-3xl">🌟</p>
            <p className="mt-2 text-base font-black text-slate-700">Nothing urgent right now</p>
            <p className="mt-1 text-sm font-medium text-slate-500">You are in a nice, manageable spot.</p>
          </div>
        ) : (
          <div>
            {groupedUrgentItems.map((group, groupIndex) => (
              <div key={group.key} className={groupIndex > 0 ? 'border-t border-slate-100' : ''}>
                <div className="px-5 pt-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                    {group.label}
                  </p>
                </div>
                <div className="divide-y divide-slate-100">
                  {group.items.map(({ assignment, rank }) => {
                    const child = childrenById.get(assignment.child_id)
                    const cfg = child ? (CHILD_CONFIG[child.theme] ?? CHILD_CONFIG.coral) : CHILD_CONFIG.coral
                    const highlight =
                      rank === 0
                        ? 'bg-rose-50 text-rose-600'
                        : rank === 1
                        ? 'bg-red-50 text-red-600'
                        : rank === 2
                        ? 'bg-orange-50 text-orange-600'
                        : 'bg-indigo-50 text-indigo-600'

                    return (
                      <div key={assignment.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                        <span className="text-xl">{cfg.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-black text-slate-800">{assignment.title}</p>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-black ${highlight}`}>
                              {rank === 0 ? 'Overdue' : rank === 1 ? 'Today' : rank === 2 ? 'Tomorrow' : 'Big item'}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-500">{child?.name.split(' ')[0] ?? 'Child'}</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${getSubjectColor(assignment.subject)}`}>
                              {assignment.subject}
                            </span>
                          </div>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                          {formatRelativeDate(assignment.due_date)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {childCards.map(({ child, dueTodayItems, overdueItems, completedTodayItems, primaryItems, secondaryItems, weekPct, weekTotal }) => {
          const cfg = CHILD_CONFIG[child.theme] ?? CHILD_CONFIG.coral
          const emptyState = getEmptyStateCopy(timeFilter)

          return (
            <div key={child.id} className="overflow-hidden rounded-[2rem] border border-white bg-white/90 shadow-[0_22px_50px_-28px_rgba(15,23,42,0.4)]">
              <div className={`bg-gradient-to-r ${cfg.gradient} px-5 py-5 text-white`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{cfg.emoji}</span>
                    <div>
                      <div className="text-xl font-black">{child.name.split(' ')[0]}</div>
                      <div className="text-sm font-semibold opacity-85">{child.grade}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {weekTotal > 0 && <MiniBucket pct={weekPct} theme={child.theme} />}
                    <a
                      href={`/${nameToSlug(child.name)}`}
                      className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-black transition-colors hover:bg-white/30"
                    >
                      Full week →
                    </a>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-white/18 px-3 py-2 backdrop-blur-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/80">Due today</p>
                    <p className="mt-1 text-lg font-black">{dueTodayItems.length}</p>
                  </div>
                  <div className="rounded-2xl bg-white/18 px-3 py-2 backdrop-blur-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/80">Overdue</p>
                    <p className="mt-1 text-lg font-black">{overdueItems.length}</p>
                  </div>
                  <div className="rounded-2xl bg-white/18 px-3 py-2 backdrop-blur-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/80">Done today</p>
                    <p className="mt-1 text-lg font-black">{completedTodayItems.length}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-5 p-5">
                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                    {getPrimarySectionLabel(timeFilter)}
                  </p>

                  {primaryItems.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/70 p-5 text-center">
                      <p className="text-3xl">{emptyState.emoji}</p>
                      <p className="mt-2 text-sm font-black text-emerald-700">{emptyState.title}</p>
                      <p className="mt-1 text-xs font-medium text-emerald-600">{emptyState.body}</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {primaryItems.map((assignment) => (
                        <AssignmentCard
                          key={assignment.id}
                          assignment={assignment}
                          child={child}
                          onToggleComplete={handleToggleComplete}
                          onDelete={handleDelete}
                          onEdit={handleEdit}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {secondaryItems.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                      {timeFilter === 'today' ? '⏭️ Coming Up Next' : '🌤️ After This Week'}
                    </p>
                    <div className="space-y-2.5">
                      {secondaryItems.map((assignment) => (
                        <AssignmentCard
                          key={assignment.id}
                          assignment={assignment}
                          child={child}
                          onToggleComplete={handleToggleComplete}
                          onDelete={handleDelete}
                          onEdit={handleEdit}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {completedTodayItems.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-emerald-500">
                      ✅ Done Today ({completedTodayItems.length})
                    </p>
                    <div className="space-y-2.5">
                      {completedTodayItems.map((assignment) => (
                        <AssignmentCard
                          key={assignment.id}
                          assignment={assignment}
                          child={child}
                          onToggleComplete={handleToggleComplete}
                          onDelete={handleDelete}
                          onEdit={handleEdit}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="overflow-hidden rounded-3xl border border-white bg-white/90 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.35)]">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
          <span className="text-lg">🗓️</span>
          <h2 className="text-sm font-black uppercase tracking-[0.22em] text-indigo-600">
            Big Items
          </h2>
          <span className="ml-auto rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-black text-indigo-600">
            {timeFilter === 'today' ? 'today view' : timeFilter === 'week' ? 'this week' : 'upcoming'}
          </span>
        </div>

        {filteredUpcomingBig.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-3xl">📚</p>
            <p className="mt-2 text-base font-black text-slate-700">No big items in this view</p>
            <p className="mt-1 text-sm font-medium text-slate-500">Tests, quizzes, and projects will show up here when they matter.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredUpcomingBig.map((assignment) => {
              const child = childrenById.get(assignment.child_id)
              const cfg = child ? (CHILD_CONFIG[child.theme] ?? CHILD_CONFIG.coral) : CHILD_CONFIG.coral
              const icon = TYPE_ICONS[assignment.type] ?? '📌'
              const isToday = assignment.due_date === todayStr
              const isTomorrow = assignment.due_date === tomorrowStr
              const urgent = isToday || isTomorrow

              return (
                <div key={assignment.id} className={`flex items-center gap-3 px-5 py-3 ${urgent ? 'bg-red-50/50' : ''}`}>
                  <span className="text-xl shrink-0">{cfg.emoji}</span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-slate-800">
                        {icon} {assignment.title}
                      </span>
                      {urgent && (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-black text-white ${isToday ? 'bg-red-500 animate-pulse' : 'bg-orange-400'}`}>
                          {isToday ? 'TODAY!' : 'Tomorrow'}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">{child?.name.split(' ')[0]}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${getSubjectColor(assignment.subject)}`}>
                        {assignment.subject}
                      </span>
                    </div>
                  </div>

                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${urgent ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                    {formatRelativeDate(assignment.due_date)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <AddAssignmentDialog childOptions={children} onAdded={loadData} />
      </div>
    </div>
  )
}
