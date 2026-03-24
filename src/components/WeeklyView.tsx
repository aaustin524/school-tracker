'use client'

import { useMemo } from 'react'
import { format, addDays } from 'date-fns'
import type { Assignment, Child } from '@/types'
import { getWeekRange } from '@/lib/helpers'
import { AssignmentCard } from './AssignmentCard'

interface WeeklyViewProps {
  assignments: Assignment[]
  childList: Child[]
  onToggleComplete: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export function WeeklyView({ assignments, childList, onToggleComplete, onDelete }: WeeklyViewProps) {
  const childMap = useMemo(
    () => Object.fromEntries(childList.map((c) => [c.id, c])),
    [childList]
  )

  const { start } = getWeekRange()

  const dayColumns = useMemo(() => {
    return DAYS.map((day, i) => {
      const date = addDays(start, i)
      const dateStr = format(date, 'yyyy-MM-dd')
      const dayAssignments = assignments.filter(
        (a) => a.due_date === dateStr && !a.completed
      )
      return { day, date, dateStr, assignments: dayAssignments }
    })
  }, [assignments, start])

  const overdue = useMemo(() => {
    const mondayStr = format(start, 'yyyy-MM-dd')
    return assignments.filter(
      (a) => !a.completed && a.due_date < mondayStr
    )
  }, [assignments, start])

  return (
    <div className="space-y-6">
      {overdue.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-red-600">
            Overdue
          </h2>
          <div className="space-y-2">
            {overdue.map((a) => (
              <AssignmentCard
                key={a.id}
                assignment={a}
                child={childMap[a.child_id]}
                onToggleComplete={onToggleComplete}
                onDelete={onDelete}
                showChild
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          This Week — {format(start, 'MMM d')} to {format(addDays(start, 4), 'MMM d')}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          {dayColumns.map(({ day, date, assignments: dayAssignments }) => (
            <div key={day} className="min-h-[80px]">
              <div className="mb-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {day.slice(0, 3)}
                </div>
                <div className="text-lg font-bold text-gray-800">
                  {format(date, 'd')}
                </div>
              </div>
              <div className="space-y-2">
                {dayAssignments.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 p-2 text-center text-xs text-gray-400">
                    Free
                  </div>
                ) : (
                  dayAssignments.map((a) => (
                    <AssignmentCard
                      key={a.id}
                      assignment={a}
                      child={childMap[a.child_id]}
                      onToggleComplete={onToggleComplete}
                      onDelete={onDelete}
                      showChild
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
