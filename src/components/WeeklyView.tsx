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
  onEdit: (updated: Assignment) => void
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const DAY_EMOJIS = ['🌅', '🌤️', '⛅', '🌈', '🎉']

export function WeeklyView({ assignments, childList, onToggleComplete, onDelete, onEdit }: WeeklyViewProps) {
  const childMap = useMemo(
    () => Object.fromEntries(childList.map((c) => [c.id, c])),
    [childList]
  )

  const { start } = getWeekRange()

  const dayColumns = useMemo(() => {
    return DAYS.map((day, i) => {
      const date = addDays(start, i)
      const dateStr = format(date, 'yyyy-MM-dd')
      const dayAssignments = assignments.filter((a) => a.due_date === dateStr && !a.completed)
      return { day, date, dateStr, assignments: dayAssignments }
    })
  }, [assignments, start])

  const overdue = useMemo(() => {
    const mondayStr = format(start, 'yyyy-MM-dd')
    return assignments.filter((a) => !a.completed && a.due_date < mondayStr)
  }, [assignments, start])

  const hasAny = dayColumns.some((d) => d.assignments.length > 0) || overdue.length > 0

  if (!hasAny) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="text-6xl">🌟</div>
        <p className="text-xl font-black text-indigo-400">All caught up!</p>
        <p className="text-sm text-gray-400 font-medium">No assignments this week. Great job!</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {overdue.length > 0 && (
        <div className="rounded-2xl bg-red-50 border-2 border-red-200 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-red-500">
            ⚠️ Overdue
          </h2>
          <div className="space-y-2">
            {overdue.map((a) => (
              <AssignmentCard
                key={a.id}
                assignment={a}
                child={childMap[a.child_id]}
                onToggleComplete={onToggleComplete}
                onDelete={onDelete}
                onEdit={onEdit}
                showChild
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-4 text-sm font-black uppercase tracking-wider text-indigo-400">
          📅 Week of {format(start, 'MMMM d')}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          {dayColumns.map(({ day, date, assignments: dayAssignments }, i) => {
            const isToday = format(new Date(), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
            return (
              <div key={day}>
                <div className={`mb-2 rounded-xl p-2 text-center ${isToday ? 'bg-indigo-600 text-white' : 'bg-white/60'}`}>
                  <div className={`text-xs font-black uppercase tracking-wide ${isToday ? 'text-indigo-200' : 'text-gray-400'}`}>
                    {DAY_EMOJIS[i]} {day.slice(0, 3)}
                  </div>
                  <div className={`text-2xl font-black ${isToday ? 'text-white' : 'text-gray-700'}`}>
                    {format(date, 'd')}
                  </div>
                  {dayAssignments.length > 0 && (
                    <div className={`text-xs font-bold ${isToday ? 'text-indigo-200' : 'text-indigo-400'}`}>
                      {dayAssignments.length} item{dayAssignments.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {dayAssignments.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-gray-200 p-3 text-center text-xs font-bold text-gray-300">
                      Free! 🎈
                    </div>
                  ) : (
                    dayAssignments.map((a) => (
                      <AssignmentCard
                        key={a.id}
                        assignment={a}
                        child={childMap[a.child_id]}
                        onToggleComplete={onToggleComplete}
                        onDelete={onDelete}
                        onEdit={onEdit}
                        showChild
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
