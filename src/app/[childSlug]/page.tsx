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
import { Trash2, ChevronDown, ChevronLeft, ChevronRight, Printer, Pencil, Check, X } from 'lucide-react'
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

// ── Assignment type card ────────────────────────────────────────────
function TestCard({ assignment, onToggle, onDelete, onEdit }: {
  assignment: Assignment
  onToggle: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
  onEdit: (updated: Assignment) => void
}) {
  const [open, setOpen] = useState(false)
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
  const isHighPriority = assignment.type === 'test' || assignment.type === 'quiz'

  const typeLabel = assignment.type === 'test' ? '📋 TEST'
    : assignment.type === 'quiz' ? '✏️ QUIZ'
    : assignment.type === 'project' ? '🔬 PROJECT'
    : '📝 HW'

  const borderColor = isOverdue
    ? 'border-red-400'
    : assignment.type === 'test' || assignment.type === 'quiz'
    ? 'border-red-300'
    : assignment.type === 'project'
    ? 'border-purple-300'
    : 'border-blue-200'

  const badgeColor = assignment.type === 'test' || assignment.type === 'quiz'
    ? 'bg-red-100 text-red-700'
    : assignment.type === 'project'
    ? 'bg-purple-100 text-purple-700'
    : 'bg-blue-100 text-blue-700'

  return (
    <div className={`rounded-xl border-2 bg-white overflow-hidden ${borderColor} ${assignment.completed ? 'opacity-50' : ''}`}>
      {/* Header */}
      <div className="px-4 pt-3 pb-3">
        {/* Row 1: complete button + type badge + urgency + chevron */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onToggle(assignment.id, !assignment.completed)}
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 font-bold text-xs transition-all ${
              assignment.completed
                ? 'bg-green-400 border-green-400 text-white'
                : 'border-gray-300 bg-white hover:border-green-400'
            }`}
          >
            {assignment.completed && '✓'}
          </button>
          <span className={`rounded-full px-1.5 py-0.5 text-xs font-black ${badgeColor}`}>{typeLabel}</span>
          {!assignment.completed && isOverdue && (
            <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-black text-white">Overdue</span>
          )}
          {!assignment.completed && isDueToday && isHighPriority && (
            <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-black text-white animate-pulse">Today!</span>
          )}
          {!assignment.completed && isDueTomorrow && isHighPriority && (
            <span className="rounded-full bg-orange-400 px-1.5 py-0.5 text-xs font-black text-white">Tmrw</span>
          )}
          <div className="flex-1" />
          <button onClick={() => setOpen((o) => !o)} className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
        {/* Row 2: title — full width, wraps freely */}
        <p className={`mt-1.5 ml-6 pr-1 text-sm font-bold text-gray-800 leading-snug ${assignment.completed ? 'line-through' : ''}`}>
          {assignment.title}
        </p>
      </div>
      {/* Details — smooth height animation via CSS grid trick */}
      <div className={`grid transition-all duration-200 ease-in-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-1.5">
            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${getSubjectColor(assignment.subject)}`}>
              {assignment.subject}
            </span>
            {assignment.notes && (
              <p className="text-xs text-gray-500 italic">{assignment.notes}</p>
            )}
            {assignment.completed && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">Score:</span>
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
                  className="w-20 rounded-lg border border-gray-300 px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
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

function StudyCard({ assignment, onToggle, onDelete, onEdit }: {
  assignment: Assignment
  onToggle: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
  onEdit: (updated: Assignment) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`rounded-xl border-2 border-purple-200 bg-white overflow-hidden ${assignment.completed ? 'opacity-50' : ''}`}>
      {/* Header */}
      <div className="px-4 pt-3 pb-3">
        {/* Row 1: complete button + badge + chevron */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onToggle(assignment.id, !assignment.completed)}
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 font-bold text-xs transition-all ${
              assignment.completed
                ? 'bg-green-400 border-green-400 text-white'
                : 'border-purple-300 bg-white hover:border-green-400'
            }`}
          >
            {assignment.completed && '✓'}
          </button>
          <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-xs font-black text-purple-700">🧠 STUDY</span>
          <div className="flex-1" />
          <button onClick={() => setOpen((o) => !o)} className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
        {/* Row 2: title — full width, wraps freely */}
        <p className={`mt-1.5 ml-6 pr-1 text-sm font-bold text-gray-800 leading-snug ${assignment.completed ? 'line-through' : ''}`}>
          {assignment.title}
        </p>
      </div>
      {/* Details — smooth height animation */}
      <div className={`grid transition-all duration-200 ease-in-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="border-t border-purple-100 bg-purple-50 px-4 py-3 space-y-1.5">
            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${getSubjectColor(assignment.subject)}`}>
              {assignment.subject}
            </span>
            {assignment.notes && (
              <p className="text-xs text-purple-600 italic">{assignment.notes}</p>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`rounded-3xl bg-gradient-to-r ${cfg.gradient} p-6 text-white shadow-lg`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <span className="text-6xl">{cfg.emoji}</span>
            <div>
              <h1 className="text-3xl font-black">{child.name}</h1>
              <p className="font-bold text-white/80">{child.grade}</p>
            </div>
          </div>
          <div className="flex gap-3 items-center">
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

      {/* Weekly Bucket */}
      {weekTotal > 0 && (
        <WeeklyBucket
          pct={weekPct}
          done={weekDone}
          total={weekTotal}
          theme={child.theme}
        />
      )}

      {/* Teacher Notes */}
      <div className="no-print rounded-2xl bg-white/70 border-2 border-white shadow-sm px-5 py-4">
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

      {/* Badges */}
      <BadgeDisplay
        assignments={assignments}
        accent={child.theme === 'coral' ? '#f97316' : '#a855f8'}
      />

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs font-black">
        <span className="flex items-center gap-1 bg-red-100 text-red-700 rounded-full px-3 py-1">📋 Test / Quiz</span>
        <span className="flex items-center gap-1 bg-purple-100 text-purple-700 rounded-full px-3 py-1">🔬 Project</span>
        <span className="flex items-center gap-1 bg-blue-100 text-blue-700 rounded-full px-3 py-1">📝 Homework</span>
        <span className="flex items-center gap-1 bg-purple-50 border border-purple-200 text-purple-600 rounded-full px-3 py-1">🧠 Study Task</span>
        <div className="ml-auto">
          <AddAssignmentDialog childOptions={children} onAdded={loadData} />
        </div>
      </div>

      {/* Overdue */}
      {overdue.length > 0 && (
        <div className="rounded-2xl bg-red-50 border-2 border-red-300 p-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-red-500 mb-3">⚠️ Overdue</h2>
          <div className="space-y-2">
            {overdue.map((a) => a.is_study_task
              ? <StudyCard key={a.id} assignment={a} onToggle={handleToggleComplete} onDelete={handleDelete} onEdit={handleEdit} />
              : <TestCard key={a.id} assignment={a} onToggle={handleToggleComplete} onDelete={handleDelete} onEdit={handleEdit} />
            )}
          </div>
        </div>
      )}

      {/* Weekly grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-indigo-400">
            📅 {weekLabel} · {format(start, 'MMMM d')}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekOffset((o) => o - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white border-2 border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors shadow-sm"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
          {dayColumns.map(({ day, date, dateStr, tests, study }) => {
            const isToday = dateStr === todayStr
            return (
              <div key={day} className={`rounded-2xl p-2 ${isToday ? 'bg-indigo-50 border-2 border-indigo-300' : 'bg-white/60 border-2 border-transparent'}`}>
                {/* Day header */}
                <div className={`mb-3 rounded-xl py-2 px-3 text-center ${isToday ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>
                  <div className={`text-xs font-black uppercase tracking-wide ${isToday ? 'text-indigo-200' : 'text-gray-400'}`}>
                    {day.slice(0, 3)}
                  </div>
                  <div className={`text-2xl font-black ${isToday ? 'text-white' : 'text-gray-700'}`}>
                    {format(date, 'd')}
                  </div>
                  {isToday && <div className="text-xs font-black text-indigo-200">Today</div>}
                </div>

                {/* Tests & assignments */}
                {tests.length > 0 && (
                  <div className="space-y-2 mb-2">
                    {tests.map((a) => (
                      <TestCard key={a.id} assignment={a} onToggle={handleToggleComplete} onDelete={handleDelete} onEdit={handleEdit} />
                    ))}
                  </div>
                )}

                {/* Divider if both exist */}
                {tests.length > 0 && study.length > 0 && (
                  <div className="flex items-center gap-1 my-2">
                    <div className="flex-1 h-px bg-purple-200" />
                    <span className="text-xs text-purple-300 font-bold">study</span>
                    <div className="flex-1 h-px bg-purple-200" />
                  </div>
                )}

                {/* Study tasks */}
                {study.length > 0 && (
                  <div className="space-y-2">
                    {study.map((a) => (
                      <StudyCard key={a.id} assignment={a} onToggle={handleToggleComplete} onDelete={handleDelete} onEdit={handleEdit} />
                    ))}
                  </div>
                )}

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

      {/* Study Materials */}
      <StudyMaterials
        childId={child.id}
        materials={materials}
        onRefresh={async () => {
          const res = await fetch(`/api/study-materials?child_id=${child.id}`)
          setMaterials(await res.json())
        }}
      />

      {/* Completed */}
      {doneCount > 0 && (
        <details className="rounded-2xl bg-white/50 border border-green-200 p-4">
          <summary className="cursor-pointer text-sm font-black text-green-600 select-none">
            ✅ Completed ({doneCount})
          </summary>
          <div className="mt-3 space-y-2">
            {assignments.filter((a) => a.completed).map((a) =>
              a.is_study_task
                ? <StudyCard key={a.id} assignment={a} onToggle={handleToggleComplete} onDelete={handleDelete} onEdit={handleEdit} />
                : <TestCard  key={a.id} assignment={a} onToggle={handleToggleComplete} onDelete={handleDelete} onEdit={handleEdit} />
            )}
          </div>
        </details>
      )}
    </div>
  )
}
