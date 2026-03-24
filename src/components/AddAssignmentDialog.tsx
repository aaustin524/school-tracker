'use client'

import { useState } from 'react'
import { format, addDays, addWeeks, startOfWeek, parseISO } from 'date-fns'
import type { Child, AssignmentType } from '@/types'
import { SUBJECTS, ASSIGNMENT_TYPES } from '@/lib/helpers'
import { Plus, X } from 'lucide-react'

interface AddAssignmentDialogProps {
  childOptions: Child[]
  onAdded: () => void
}

type Recurrence = 'none' | 'weekdays' | 'weekly'

function generateDates(startDate: string, recurrence: Recurrence, weeks: number): string[] {
  if (recurrence === 'none') return [startDate]
  const start = parseISO(startDate)
  const dates: string[] = []

  if (recurrence === 'weekdays') {
    for (let w = 0; w < weeks; w++) {
      const monday = startOfWeek(addWeeks(start, w), { weekStartsOn: 1 })
      for (let d = 0; d < 5; d++) {
        const date = format(addDays(monday, d), 'yyyy-MM-dd')
        if (date >= startDate) dates.push(date)
      }
    }
  } else {
    for (let w = 0; w < weeks; w++) {
      dates.push(format(addWeeks(start, w), 'yyyy-MM-dd'))
    }
  }

  return dates
}

export function AddAssignmentDialog({ childOptions, onAdded }: AddAssignmentDialogProps) {
  const [open, setOpen] = useState(false)
  const [childId, setChildId] = useState(childOptions[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [type, setType] = useState<AssignmentType>('homework')
  const [subject, setSubject] = useState('General')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [recurrence, setRecurrence] = useState<Recurrence>('none')
  const [weeks, setWeeks] = useState(4)
  const [saving, setSaving] = useState(false)

  function reset() {
    setTitle(''); setDueDate(''); setNotes(''); setRecurrence('none'); setWeeks(4)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title || !dueDate || !childId) return
    setSaving(true)

    const dates = generateDates(dueDate, recurrence, weeks)
    await Promise.all(
      dates.map((due_date) =>
        fetch('/api/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ child_id: childId, title, type, subject, due_date, notes }),
        })
      )
    )

    setSaving(false)
    setOpen(false)
    reset()
    onAdded()
  }

  const dateCount = dueDate && recurrence !== 'none' ? generateDates(dueDate, recurrence, weeks).length : 0

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add Assignment
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold">Add Assignment</h2>
          <button onClick={() => { setOpen(false); reset() }} className="text-gray-400 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Child</label>
            <select
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {childOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Read 20 minutes"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AssignmentType)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ASSIGNMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Recurrence */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Repeat</label>
            <div className="flex gap-2">
              {(['none', 'weekdays', 'weekly'] as Recurrence[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRecurrence(r)}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-bold transition-colors ${
                    recurrence === r
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-600 hover:border-blue-300'
                  }`}
                >
                  {r === 'none' ? 'Once' : r === 'weekdays' ? 'Every weekday' : 'Every week'}
                </button>
              ))}
            </div>
            {recurrence !== 'none' && (
              <div className="mt-2 flex items-center gap-2">
                <label className="text-xs text-gray-500">For</label>
                <select
                  value={weeks}
                  onChange={(e) => setWeeks(Number(e.target.value))}
                  className="rounded border border-gray-300 px-2 py-1 text-sm"
                >
                  {[2, 4, 6, 8].map((w) => <option key={w} value={w}>{w} weeks</option>)}
                </select>
                {dueDate && (
                  <span className="text-xs text-blue-600 font-semibold">→ {dateCount} assignments</span>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {recurrence !== 'none' ? 'Start date' : 'Due date'}
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => { setOpen(false); reset() }}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : recurrence !== 'none' ? `Add ${dateCount || ''} Assignments` : 'Add Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
