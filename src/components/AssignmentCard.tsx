'use client'

import { useState } from 'react'
import type { Assignment, Child } from '@/types'
import { cn, formatDisplayDate, THEME_COLORS } from '@/lib/helpers'
import { Trash2 } from 'lucide-react'

interface AssignmentCardProps {
  assignment: Assignment
  child?: Child
  onToggleComplete: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
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

export function AssignmentCard({
  assignment,
  child,
  onToggleComplete,
  onDelete,
  showChild = false,
}: AssignmentCardProps) {
  const [loading, setLoading] = useState(false)
  const theme = child ? THEME_COLORS[child.theme] ?? THEME_COLORS.coral : THEME_COLORS.coral

  async function handleToggle() {
    setLoading(true)
    await onToggleComplete(assignment.id, !assignment.completed)
    setLoading(false)
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3 transition-opacity',
        theme.bg,
        theme.border,
        assignment.completed && 'opacity-50'
      )}
    >
      <button
        onClick={handleToggle}
        disabled={loading}
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors',
          assignment.completed
            ? 'border-green-500 bg-green-500 text-white'
            : 'border-gray-400 bg-white hover:border-green-400'
        )}
      >
        {assignment.completed && (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm">{TYPE_ICONS[assignment.type] ?? '📌'}</span>
          <span
            className={cn(
              'text-sm font-medium',
              assignment.completed && 'line-through text-gray-500'
            )}
          >
            {assignment.title}
          </span>
          {showChild && child && (
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', theme.badge)}>
              {child.name.split(' ')[0]}
            </span>
          )}
        </div>

        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 flex-wrap">
          <span>{assignment.subject}</span>
          <span>·</span>
          <span>{formatDisplayDate(assignment.due_date)}</span>
          {assignment.notes && (
            <>
              <span>·</span>
              <span className="truncate max-w-[200px]">{assignment.notes}</span>
            </>
          )}
        </div>
      </div>

      <button
        onClick={() => onDelete(assignment.id)}
        className="shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
        title="Delete assignment"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
