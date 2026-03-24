'use client'

import { useState } from 'react'
import type { Assignment, Child } from '@/types'
import { cn, formatRelativeDate, getSubjectColor, THEME_COLORS } from '@/lib/helpers'
import { format, addDays } from 'date-fns'
import { Trash2, ChevronDown } from 'lucide-react'
import { EditAssignmentDialog } from '@/components/EditAssignmentDialog'

interface AssignmentCardProps {
  assignment: Assignment
  child?: Child
  onToggleComplete: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
  onEdit: (updated: Assignment) => void
  showChild?: boolean
}

const TYPE_ICONS: Record<string, string> = {
  homework: '📝',
  test: '📋',
  project: '🔬',
  quiz: '✏️',
  reading: '📖',
  other: '📌',
}

const TYPE_BADGE: Record<string, string> = {
  homework: 'bg-blue-100 text-blue-700',
  test:     'bg-red-100 text-red-700',
  project:  'bg-purple-100 text-purple-700',
  quiz:     'bg-yellow-100 text-yellow-700',
  reading:  'bg-green-100 text-green-700',
  other:    'bg-gray-100 text-gray-600',
}

const TYPE_BORDER: Record<string, string> = {
  homework: 'border-blue-200',
  test:     'border-red-200',
  project:  'border-purple-200',
  quiz:     'border-yellow-200',
  reading:  'border-green-200',
  other:    'border-gray-200',
}

export function AssignmentCard({
  assignment,
  child,
  onToggleComplete,
  onDelete,
  onEdit,
  showChild = false,
}: AssignmentCardProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [scoreInput, setScoreInput] = useState(assignment.score?.toString() ?? '')
  const theme = child ? THEME_COLORS[child.theme] ?? THEME_COLORS.coral : THEME_COLORS.coral

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd')
  const isOverdue = !assignment.completed && assignment.due_date < todayStr
  const isDueToday = assignment.due_date === todayStr
  const isDueTomorrow = assignment.due_date === tomorrowStr

  async function handleToggle() {
    setLoading(true)
    await onToggleComplete(assignment.id, !assignment.completed)
    setLoading(false)
  }

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

  const borderColor = isOverdue
    ? 'border-red-400'
    : assignment.is_study_task
    ? 'border-purple-200'
    : TYPE_BORDER[assignment.type] ?? 'border-gray-200'

  const badgeColor = assignment.is_study_task
    ? 'bg-purple-100 text-purple-700'
    : TYPE_BADGE[assignment.type] ?? TYPE_BADGE.other

  const badgeLabel = assignment.is_study_task
    ? '🧠 Study'
    : `${TYPE_ICONS[assignment.type] ?? '📌'} ${assignment.type}`

  return (
    <div className={cn('rounded-xl border-2 bg-white overflow-hidden', borderColor, assignment.completed && 'opacity-50')}>
      {/* Header — two rows so title never gets squeezed */}
      <div className="px-4 pt-3 pb-3">
        {/* Row 1: complete + type badge + urgency badges + child badge + chevron */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={handleToggle}
            disabled={loading}
            className={cn(
              'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 font-bold text-xs transition-all',
              assignment.completed
                ? 'border-green-400 bg-green-400 text-white'
                : 'border-gray-300 bg-white hover:border-green-400'
            )}
          >
            {assignment.completed && '✓'}
          </button>

          <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-black capitalize', badgeColor)}>
            {badgeLabel}
          </span>

          {!assignment.completed && isOverdue && (
            <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-black text-white">Overdue</span>
          )}
          {!assignment.completed && isDueToday && (
            <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-black text-white animate-pulse">Today!</span>
          )}
          {!assignment.completed && isDueTomorrow && (
            <span className="rounded-full bg-orange-400 px-1.5 py-0.5 text-xs font-black text-white">Tmrw</span>
          )}
          {showChild && child && (
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-black', theme.badge)}>
              {child.name.split(' ')[0]}
            </span>
          )}

          <div className="flex-1" />
          <button
            onClick={() => setOpen((o) => !o)}
            className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', open && 'rotate-180')} />
          </button>
        </div>

        {/* Row 2: title — full width, wraps freely */}
        <p className={cn('mt-1.5 ml-6 pr-1 text-sm font-bold text-gray-800 leading-snug', assignment.completed && 'line-through text-gray-400')}>
          {assignment.title}
        </p>
      </div>

      {/* Expanded details — smooth height animation */}
      <div className={cn('grid transition-all duration-200 ease-in-out', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <div className={cn(
            'border-t px-4 py-3 space-y-1.5',
            assignment.is_study_task ? 'border-purple-100 bg-purple-50' : 'border-gray-100 bg-gray-50'
          )}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', getSubjectColor(assignment.subject))}>
                {assignment.subject}
              </span>
              <span className="text-xs text-gray-500">📅 {formatRelativeDate(assignment.due_date)}</span>
            </div>
            {assignment.notes && (
              <p className="text-xs italic text-gray-500">{assignment.notes}</p>
            )}
            {assignment.completed && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">Score:</span>
                {assignment.score != null && (
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-black', scoreColor)}>
                    {assignment.score}/100
                  </span>
                )}
                <input
                  type="number"
                  min={0}
                  max={100}
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
