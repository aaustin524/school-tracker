'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { notFound } from 'next/navigation'
import { format, addDays, addWeeks } from 'date-fns'
import { toast } from 'sonner'
import type { Assignment, Child } from '@/types'
import { getSupabase } from '@/lib/supabase'
import { AddAssignmentDialog } from '@/components/AddAssignmentDialog'
import { nameToSlug, getWeekRange, getSubjectColor, calculateStreak } from '@/lib/helpers'
import { BadgeDisplay } from '@/components/BadgeDisplay'
import { Trash2, ChevronDown, ChevronLeft, ChevronRight, Printer, Pencil, Check, X, Sparkles, BookOpen, Trophy, NotebookPen, CheckCircle2 } from 'lucide-react'
import { EditAssignmentDialog } from '@/components/EditAssignmentDialog'
import { ChildPageSkeleton } from '@/components/Skeleton'
import { StudyMaterials } from '@/components/StudyMaterials'
import { WeeklyBucket } from '@/components/WeeklyBucket'
import type { StudyMaterial } from '@/types'

interface ChildPageProps {
  params: { childSlug: string }
}

const CHILD_CONFIG: Record<string, { emoji: string; gradient: string }> = {
  coral: { emoji: '⭐', gradient: 'from-red-500 to-yellow-400'  },
  sky:   { emoji: '✨', gradient: 'from-purple-500 to-pink-400' },
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const TYPE_META = {
  test: { badge: 'TEST', badgeClass: 'bg-red-50 text-red-600 border border-red-100' },
  quiz: { badge: 'QUIZ', badgeClass: 'bg-amber-50 text-amber-700 border border-amber-100' },
  project: { badge: 'PROJECT', badgeClass: 'bg-violet-50 text-violet-700 border border-violet-100' },
  homework: { badge: 'HW', badgeClass: 'bg-sky-50 text-sky-700 border border-sky-100' },
  reading: { badge: 'READ', badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
  other: { badge: 'TASK', badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200' },
  study: { badge: 'STUDY', badgeClass: 'bg-purple-50 text-purple-700 border border-purple-100' },
} as const

function formatCompactTitle(title: string) {
  return title
    .replace(/\s*-\s*part\s+(\d+)/gi, ' (Pt $1)')
    .replace(/\s*-\s*chapter\s+(\d+)/gi, ' (Ch $1)')
    .replace(/\s*-\s*lesson\s+(\d+)/gi, ' (Lsn $1)')
    .replace(/\s*-\s*section\s+(\d+)/gi, ' (Sec $1)')
    .replace(/\bpart\s+(\d+)\b/gi, 'Pt $1')
    .replace(/\bchapter\s+(\d+)\b/gi, 'Ch $1')
    .replace(/\bsection\s+(\d+)\b/gi, 'Sec $1')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function buildGroupPreview(items: Assignment[], type: string) {
  if (items.length === 0) return ''
  if (items.length === 1) return formatCompactTitle(items[0].title)

  const compactTitles = items.map((item) => formatCompactTitle(item.title))
  const baseNames = compactTitles.map((title) =>
    title
      .replace(/\(([^)]+)\)/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
  )
  const uniqueBaseNames = Array.from(new Set(baseNames.filter(Boolean)))
  const partMatches = compactTitles
    .map((title) => title.match(/\(Pt\s+([^)]+)\)/i)?.[1]?.trim())
    .filter((part): part is string => Boolean(part))

  if (uniqueBaseNames.length === 1) {
    if (partMatches.length >= 2) {
      return `${uniqueBaseNames[0]} (Pt ${partMatches.join(', ')})`
    }
    return `${uniqueBaseNames[0]} (multiple)`
  }

  if (type === 'study') {
    return `${compactTitles[0]} + ${items.length - 1} more`
  }

  return `${compactTitles[0]} + ${items.length - 1} more`
}

// ── Assignment type card ────────────────────────────────────────────
function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  badge,
  children,
}: {
  title: string
  icon: React.ReactNode
  defaultOpen?: boolean
  badge?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-3xl bg-white/70 border-2 border-white shadow-lg overflow-hidden">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <div className="rounded-2xl bg-indigo-50 p-2 text-indigo-500">{icon}</div>
        <div className="flex-1">
          <p className="text-sm font-black uppercase tracking-wider text-indigo-600">{title}</p>
        </div>
        {badge && (
          <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-black text-indigo-600">
            {badge}
          </span>
        )}
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="border-t border-gray-100 px-5 py-4">{children}</div>}
    </div>
  )
}

function AssignmentItemCard({ assignment, onToggle, onDelete, onEdit, compact = false }: {
  assignment: Assignment
  onToggle: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
  onEdit: (updated: Assignment) => void
  compact?: boolean
}) {
  const [open, setOpen] = useState(!compact)
  const [scoreInput, setScoreInput] = useState(assignment.score?.toString() ?? '')

  async function handleScoreSave() {
    const val = scoreInput.trim()
    const score = val === '' ? null : Math.min(100, Math.max(0, parseInt(val)))
    if (isNaN(score as number) && score !== null) return
    const res = await fetch(`/api/assignments/${assignment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score }),
    })
    if (res.ok) onEdit({ ...assignment, score })
  }

  const scoreColor = assignment.score != null
    ? assignment.score >= 90 ? 'bg-green-100 text-green-700'
    : assignment.score >= 80 ? 'bg-blue-100 text-blue-700'
    : assignment.score >= 70 ? 'bg-yellow-100 text-yellow-700'
    : 'bg-red-100 text-red-700'
    : ''
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd')
  const isOverdue = !assignment.completed && assignment.due_date < todayStr
  const isDueToday = assignment.due_date === todayStr
  const isDueTomorrow = assignment.due_date === tomorrowStr
  const itemType = assignment.is_study_task ? 'study' : assignment.type
  const meta = TYPE_META[itemType]
  const compactTitle = formatCompactTitle(assignment.title)
  const relativeLabel = !assignment.completed
    ? isDueToday
      ? 'Today'
      : isDueTomorrow
        ? 'Tomorrow'
        : null
    : null

  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${assignment.completed ? 'opacity-55' : ''}`}>
      <div className="min-w-0 min-h-[84px] px-3 py-2.5">
        <div className="flex items-start gap-2">
          <button
            onClick={() => onToggle(assignment.id, !assignment.completed)}
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 font-bold text-xs transition-all ${
              assignment.completed
                ? 'border-green-400 bg-green-400 text-white'
                : 'border-slate-300 bg-white hover:border-green-400'
            }`}
          >
            {assignment.completed && '✓'}
          </button>
          <div className="min-w-0 flex-1 self-stretch pt-0.5">
            <div className="flex items-start gap-2">
              <span className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] ${meta.badgeClass}`}>
                {meta.badge}
              </span>
              <p
                className={`min-w-0 flex-1 text-[13px] font-bold leading-5 text-slate-800 break-words ${assignment.completed ? 'line-through text-slate-400' : ''}`}
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                }}
                title={assignment.title}
              >
                {compactTitle}
              </p>
            </div>
            <div className="mt-1.5 flex min-w-0 items-center gap-1.5 overflow-hidden pl-[0.125rem] text-xs font-medium text-slate-500">
              <span className="truncate">{assignment.subject}</span>
              {relativeLabel && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className={`font-semibold ${isDueToday ? 'text-indigo-600' : 'text-orange-500'}`}>{relativeLabel}</span>
                </>
              )}
              {!relativeLabel && !assignment.completed && isOverdue && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="font-semibold text-red-600">Overdue</span>
                </>
              )}
            </div>
          </div>
          <button onClick={() => setOpen((o) => !o)} className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors">
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      <div className={`grid transition-all duration-200 ease-in-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="space-y-2 border-t border-slate-100 bg-slate-50/90 px-4 py-3">
            {assignment.notes && (
              <p className="text-xs italic text-slate-500">{assignment.notes}</p>
            )}
            {assignment.completed && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Score:</span>
                {assignment.score != null && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-black ${scoreColor}`}>
                    {assignment.score}/100
                  </span>
                )}
                <input
                  type="number" min={0} max={100}
                  value={scoreInput}
                  onChange={(e) => setScoreInput(e.target.value)}
                  onBlur={handleScoreSave}
                  onKeyDown={(e) => e.key === 'Enter' && handleScoreSave()}
                  placeholder="0–100"
                  className="w-20 rounded-lg border border-slate-300 px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            )}
            <div className="flex items-center gap-3 pt-0.5">
              <EditAssignmentDialog assignment={assignment} onSaved={onEdit} />
              <button
                onClick={() => onDelete(assignment.id)}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 font-semibold transition-colors"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AssignmentGroup({
  label,
  items,
  onToggle,
  onDelete,
  onEdit,
}: {
  label: string
  items: Assignment[]
  onToggle: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
  onEdit: (updated: Assignment) => void
}) {
  const [open, setOpen] = useState(false)
  const sample = items[0]
  const itemType = sample.is_study_task ? 'study' : sample.type
  const meta = TYPE_META[itemType]
  const previewText = buildGroupPreview(items, itemType)

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex min-h-[84px] min-w-0 w-full items-center justify-between px-3 py-2.5 text-left"
      >
        <div className="min-w-0 pt-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] ${meta.badgeClass}`}>
              {meta.badge}
            </span>
            <span className="text-[13px] font-black leading-5 text-slate-800">{label}</span>
          </div>
          <p
            className="mt-1 text-xs font-medium text-slate-500"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
            }}
            title={items.map((item) => item.title).join('\n')}
          >
            {previewText}
          </p>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <div className={`grid transition-all duration-200 ease-in-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="space-y-2 border-t border-slate-100 bg-slate-50/80 p-3">
            {items.map((item) => (
              <AssignmentItemCard
                key={item.id}
                assignment={item}
                compact
                onToggle={onToggle}
                onDelete={onDelete}
                onEdit={onEdit}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function countLabel(type: string, count: number) {
  const labels: Record<string, string> = {
    test: count === 1 ? 'Test' : 'Tests',
    quiz: count === 1 ? 'Quiz' : 'Quizzes',
    project: count === 1 ? 'Project' : 'Projects',
    homework: count === 1 ? 'Homework' : 'Homework',
    reading: count === 1 ? 'Reading' : 'Reading Tasks',
    other: count === 1 ? 'Task' : 'Tasks',
    study: count === 1 ? 'Study Task' : 'Study Tasks',
  }
  return `${count} ${labels[type] ?? 'Items'}`
}

function renderDayAssignmentGroups({
  items,
  onToggle,
  onDelete,
  onEdit,
}: {
  items: Assignment[]
  onToggle: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
  onEdit: (updated: Assignment) => void
}) {
  const groups = new Map<string, Assignment[]>()

  items.forEach((item) => {
    const key = item.is_study_task ? 'study' : item.type
    groups.set(key, [...(groups.get(key) ?? []), item])
  })

  return Array.from(groups.entries()).map(([key, groupedItems]) => (
    groupedItems.length > 1 ? (
      <AssignmentGroup
        key={`${key}-${groupedItems[0].due_date}`}
        label={countLabel(key, groupedItems.length)}
        items={groupedItems}
        onToggle={onToggle}
        onDelete={onDelete}
        onEdit={onEdit}
      />
    ) : (
      <AssignmentItemCard
        key={groupedItems[0].id}
        assignment={groupedItems[0]}
        compact
        onToggle={onToggle}
        onDelete={onDelete}
        onEdit={onEdit}
      />
    )
  ))
}

export default function ChildPage({ params }: ChildPageProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [child, setChild] = useState<Child | null>(null)
  const [materials, setMaterials] = useState<StudyMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesText, setNotesText] = useState('')
  const pendingDeletes = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const loadData = useCallback(async () => {
    const childrenRes = await getSupabase().from('children').select('*').order('name')
    const allChildren: Child[] = childrenRes.data ?? []
    setChildren(allChildren)
    const matched = allChildren.find((c) => nameToSlug(c.name) === params.childSlug)
    if (!matched) { setLoading(false); return }
    setChild(matched)
    const [assignRes, materialsRes] = await Promise.all([
      fetch(`/api/assignments?child_id=${matched.id}`),
      fetch(`/api/study-materials?child_id=${matched.id}`),
    ])
    setAssignments(await assignRes.json())
    setMaterials(await materialsRes.json())
    setLoading(false)
  }, [params.childSlug])

  useEffect(() => { loadData() }, [loadData])

  async function handleToggleComplete(id: string, completed: boolean) {
    const updated = assignments.map((a) => (a.id === id ? { ...a, completed } : a))
    setAssignments(updated)

    // Fire confetti if all of today's assignments are now done
    if (completed) {
      const today = format(new Date(), 'yyyy-MM-dd')
      const todayItems = updated.filter((a) => a.due_date === today)
      if (todayItems.length > 0 && todayItems.every((a) => a.completed)) {
        import('canvas-confetti').then(({ default: confetti }) => {
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } })
        })
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

  async function handleSaveNotes() {
    if (!child) return
    const res = await fetch(`/api/children/${child.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: notesText }),
    })
    if (res.ok) {
      const updated: Child = await res.json()
      setChild(updated)
      toast.success('Notes saved')
    }
    setEditingNotes(false)
  }

  if (loading) return <ChildPageSkeleton />

  if (!child) return notFound()

  const cfg = CHILD_CONFIG[child.theme] ?? CHILD_CONFIG.coral
  const { start } = getWeekRange(addWeeks(new Date(), weekOffset))
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const mondayStr = format(start, 'yyyy-MM-dd')
  const fridayStr = format(addDays(start, 4), 'yyyy-MM-dd')
  const weekLabel = weekOffset === 0 ? 'This Week'
    : weekOffset === 1 ? 'Next Week'
    : weekOffset === -1 ? 'Last Week'
    : format(start, 'MMM d, yyyy')

  const activeCount = assignments.filter((a) => !a.completed).length
  const doneCount = assignments.filter((a) => a.completed).length
  const streak = calculateStreak(assignments)

  // Progress bar: this week only
  const weekAssignments = assignments.filter((a) => a.due_date >= mondayStr && a.due_date <= fridayStr)
  const weekDone = weekAssignments.filter((a) => a.completed).length
  const weekTotal = weekAssignments.length
  const weekPct = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0

  const dayColumns = DAYS.map((day, i) => {
    const date = addDays(start, i)
    const dateStr = format(date, 'yyyy-MM-dd')
    const items = assignments.filter((a) => a.due_date === dateStr && !a.completed)
    const tests = items.filter((a) => !a.is_study_task)
    const study = items.filter((a) => a.is_study_task)
    return { day, date, dateStr, tests, study }
  })

  // Overdue — only shown on current week view
  const overdue = weekOffset === 0
    ? assignments.filter((a) => !a.completed && a.due_date < mondayStr)
    : []

  const todayItems = assignments.filter((a) => !a.completed && a.due_date === todayStr)
  const urgentUpcoming = assignments
    .filter((a) => !a.completed && a.due_date > todayStr && a.due_date <= format(addDays(new Date(), 2), 'yyyy-MM-dd'))
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
  const todaysFocus = [...todayItems, ...urgentUpcoming].slice(0, 3)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`rounded-3xl bg-gradient-to-r ${cfg.gradient} p-6 text-white shadow-lg`}>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <span className="text-6xl shrink-0">{cfg.emoji}</span>
            <div className="min-w-0">
              <h1 className="text-3xl font-black">{child.name}</h1>
              <p className="font-bold text-white/80">{child.grade}</p>
              <p className="mt-1 text-sm font-medium text-white/75">
                Focus on what needs to get done this week.
              </p>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-4 xl:items-end">
            <div className="flex flex-wrap items-center gap-3">
              {streak > 0 && (
                <div className="bg-white/20 rounded-2xl px-4 py-2 text-center">
                  <div className="text-2xl font-black">🔥 {streak}</div>
                  <div className="text-xs font-bold text-white/80">day streak</div>
                </div>
              )}
              <div className="bg-white/20 rounded-2xl px-4 py-2 text-center">
                <div className="text-2xl font-black">{activeCount}</div>
                <div className="text-xs font-bold text-white/80">to do</div>
              </div>
              <div className="bg-white/20 rounded-2xl px-4 py-2 text-center">
                <div className="text-2xl font-black">{doneCount}</div>
                <div className="text-xs font-bold text-white/80">done ✓</div>
              </div>
              <button
                onClick={() => window.print()}
                className="no-print bg-white/20 hover:bg-white/30 rounded-2xl p-2.5 transition-colors"
                title="Print weekly summary"
              >
                <Printer className="h-5 w-5 text-white" />
              </button>
            </div>
            {weekTotal > 0 && (
              <div className="w-full max-w-md rounded-3xl bg-white/15 p-3 backdrop-blur-sm">
                <WeeklyBucket
                  pct={weekPct}
                  done={weekDone}
                  total={weekTotal}
                  theme={child.theme}
                />
              </div>
            )}
          </div>
        </div>
        {/* Weekly progress bar */}
        {weekTotal > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs font-bold text-white/70 mb-1.5">
              <span>This week&apos;s progress</span>
              <span>{weekDone} / {weekTotal} done · {weekPct}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-white transition-all duration-700 ease-out"
                style={{ width: `${weekPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="rounded-3xl bg-white/75 border-2 border-white shadow-lg p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-indigo-400">
              🎯 Today&apos;s Focus
            </p>
            <h2 className="mt-1 text-xl font-black text-gray-800">Start here</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setWeekOffset((o) => o - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white border-2 border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors shadow-sm"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-600">
              {weekLabel}
            </div>
            {weekOffset !== 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-600 hover:bg-indigo-200 transition-colors"
              >
                Today
              </button>
            )}
            <button
              onClick={() => setWeekOffset((o) => o + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white border-2 border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors shadow-sm"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {todaysFocus.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/80 p-4 text-center">
            <p className="text-sm font-black text-emerald-700">Nothing urgent today.</p>
            <p className="mt-1 text-xs font-medium text-emerald-600">This week is looking manageable.</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {todaysFocus.map((item) => (
              <div key={item.id} className="rounded-2xl bg-gradient-to-br from-white to-indigo-50 border border-indigo-100 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className={`rounded-2xl p-2 ${item.is_study_task ? 'bg-purple-100 text-purple-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    {item.is_study_task ? <Sparkles className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-gray-800 leading-snug">{item.title}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${getSubjectColor(item.subject)}`}>{item.subject}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-black text-gray-500">
                        {item.due_date === todayStr ? 'Today' : format(new Date(item.due_date), 'EEE')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weekly grid */}
      <div className="rounded-3xl bg-white/75 border-2 border-white shadow-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-indigo-400">
            📅 This Week · {format(start, 'MMMM d')}
          </h2>
          <div className="flex items-center gap-3 text-xs font-black">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-500">Consistent weekly cards</span>
            <div className="ml-auto">
              <AddAssignmentDialog childOptions={children} onAdded={loadData} />
            </div>
          </div>
        </div>

        {overdue.length > 0 && (
        <div className="rounded-2xl bg-red-50 border-2 border-red-300 p-4 mb-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-red-500 mb-3">⚠️ Overdue</h2>
          <div className="space-y-2">
            {overdue.map((a) => a.is_study_task
              ? <AssignmentItemCard key={a.id} assignment={a} onToggle={handleToggleComplete} onDelete={handleDelete} onEdit={handleEdit} />
              : <AssignmentItemCard key={a.id} assignment={a} onToggle={handleToggleComplete} onDelete={handleDelete} onEdit={handleEdit} />
            )}
          </div>
        </div>
      )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
          {dayColumns.map(({ day, date, dateStr, tests, study }) => {
            const isToday = dateStr === todayStr
            return (
              <div key={day} className={`rounded-2xl p-3 ${isToday ? 'bg-indigo-50/95 border border-indigo-300 shadow-md sm:-mx-1' : 'bg-white/75 border border-white shadow-sm'}`}>
                {/* Day header */}
                <div className={`mb-3 rounded-xl px-3 py-3 text-center ${isToday ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100'}`}>
                  <div className={`text-xs font-black uppercase tracking-wide ${isToday ? 'text-indigo-200' : 'text-gray-400'}`}>
                    {day.slice(0, 3)}
                  </div>
                  <div className={`font-black ${isToday ? 'text-white text-3xl' : 'text-gray-700 text-2xl'}`}>
                    {format(date, 'd')}
                  </div>
                  {isToday && <div className="text-xs font-black text-indigo-200">Today</div>}
                </div>

                <div className="space-y-2.5">
                  {renderDayAssignmentGroups({
                    items: [...tests, ...study],
                    onToggle: handleToggleComplete,
                    onDelete: handleDelete,
                    onEdit: handleEdit,
                  })}
                </div>

                {tests.length === 0 && study.length === 0 && (
                  <div className="rounded-xl border-2 border-dashed border-gray-200 p-3 text-center text-xs font-bold text-gray-300">
                    Free 🎈
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <CollapsibleSection title="Teacher Notes" icon={<NotebookPen className="h-4 w-4" />}>
        <div className="no-print">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-black uppercase tracking-wider text-gray-400">📋 Teacher Notes</p>
            {!editingNotes && (
              <button
                onClick={() => { setNotesText(child.notes ?? ''); setEditingNotes(true) }}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-600 font-semibold transition-colors"
              >
                <Pencil className="h-3 w-3" /> Edit
              </button>
            )}
          </div>
          {editingNotes ? (
            <div className="space-y-2">
              <textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                rows={3}
                placeholder="Teacher name, email, classroom links, important dates..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveNotes}
                  className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  <Check className="h-3 w-3" /> Save
                </button>
                <button
                  onClick={() => setEditingNotes(false)}
                  className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <X className="h-3 w-3" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {child.notes || <span className="text-gray-400 italic">No notes yet — click Edit to add teacher contact info, links, or reminders.</span>}
            </p>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Badges" icon={<Trophy className="h-4 w-4" />} badge={`${doneCount} done`}>
        <BadgeDisplay
          assignments={assignments}
          accent={child.theme === 'coral' ? '#f97316' : '#a855f8'}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Study Materials" icon={<BookOpen className="h-4 w-4" />} badge={materials.length > 0 ? `${materials.length}` : undefined}>
        <StudyMaterials
          childId={child.id}
          materials={materials}
          onRefresh={async () => {
            const res = await fetch(`/api/study-materials?child_id=${child.id}`)
            setMaterials(await res.json())
          }}
        />
      </CollapsibleSection>

      {doneCount > 0 && (
        <CollapsibleSection title="Completed Items" icon={<CheckCircle2 className="h-4 w-4" />} badge={`${doneCount}`}>
          <div className="space-y-2">
            {assignments.filter((a) => a.completed).map((a) =>
              a.is_study_task
                ? <AssignmentItemCard key={a.id} assignment={a} onToggle={handleToggleComplete} onDelete={handleDelete} onEdit={handleEdit} />
                : <AssignmentItemCard key={a.id} assignment={a} onToggle={handleToggleComplete} onDelete={handleDelete} onEdit={handleEdit} />
            )}
          </div>
        </CollapsibleSection>
      )}
    </div>
  )
}
