'use client'

import { useState } from 'react'
import type { Assignment, AssignmentType } from '@/types'
import { SUBJECTS, ASSIGNMENT_TYPES } from '@/lib/helpers'
import { Pencil, X } from 'lucide-react'
import { toast } from 'sonner'

interface EditAssignmentDialogProps {
  assignment: Assignment
  onSaved: (updated: Assignment) => void
}

export function EditAssignmentDialog({ assignment, onSaved }: EditAssignmentDialogProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(assignment.title)
  const [type, setType] = useState<AssignmentType>(assignment.type)
  const [subject, setSubject] = useState(assignment.subject)
  const [dueDate, setDueDate] = useState(assignment.due_date)
  const [notes, setNotes] = useState(assignment.notes ?? '')
  const [saving, setSaving] = useState(false)

  function handleOpen() {
    // Reset to current assignment values each time dialog opens
    setTitle(assignment.title)
    setType(assignment.type)
    setSubject(assignment.subject)
    setDueDate(assignment.due_date)
    setNotes(assignment.notes ?? '')
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title || !dueDate) return
    setSaving(true)

    const res = await fetch(`/api/assignments/${assignment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, type, subject, due_date: dueDate, notes }),
    })

    if (res.ok) {
      const updated: Assignment = await res.json()
      onSaved(updated)
      toast.success('Assignment updated')
      setOpen(false)
    } else {
      toast.error('Failed to save changes')
    }
    setSaving(false)
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-600 font-semibold transition-colors"
      >
        <Pencil className="h-3 w-3" /> Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-base font-semibold">Edit Assignment</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
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

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Due date</label>
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
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
