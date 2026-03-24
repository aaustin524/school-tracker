'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ExtractedAssignment, Child } from '@/types'
import { SUBJECTS, ASSIGNMENT_TYPES, cn } from '@/lib/helpers'
import { Loader2, CheckCircle } from 'lucide-react'

interface ReviewExtractedProps {
  assignments: ExtractedAssignment[]
  childId: string
  documentId: string
  childOptions: Child[]
}

const CONFIDENCE_STYLES = {
  high: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-600',
}

export function ReviewExtracted({ assignments, childId, documentId, childOptions }: ReviewExtractedProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<number>>(
    new Set(assignments.map((_, i) => i))
  )
  const [edits, setEdits] = useState<Record<number, Partial<ExtractedAssignment>>>({})
  const [saving, setSaving] = useState(false)
  const [dateErrors, setDateErrors] = useState<Set<number>>(new Set())

  function toggleSelect(i: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  function updateEdit(i: number, field: keyof ExtractedAssignment, value: string) {
    setEdits((prev) => ({
      ...prev,
      [i]: { ...prev[i], [field]: value },
    }))
    if (field === 'due_date') {
      setDateErrors((prev) => {
        const next = new Set(prev)
        if (value) next.delete(i)
        else next.add(i)
        return next
      })
    }
  }

  function getMerged(i: number): ExtractedAssignment {
    return { ...assignments[i], ...edits[i] }
  }

  async function handleSave() {
    // Validate: all selected items need a due_date
    const errors = new Set<number>()
    Array.from(selected).forEach((i) => {
      const merged = getMerged(i)
      if (!merged.due_date) errors.add(i)
    })
    if (errors.size > 0) {
      setDateErrors(errors)
      return
    }

    setSaving(true)
    const toSave = Array.from(selected).map((i) => getMerged(i))

    await Promise.all(
      toSave.map((a) =>
        fetch('/api/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            child_id: childId,
            title: a.title,
            type: a.type,
            subject: a.subject,
            due_date: a.due_date,
            notes: a.notes ?? '',
            source_doc_id: documentId,
          }),
        })
      )
    )

    const child = childOptions.find((c) => c.id === childId)
    const slug = child ? child.name.toLowerCase().replace(/\s+/g, '-') : ''
    router.push(slug ? `/${slug}` : '/')
  }

  if (assignments.length === 0) {
    return (
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-6 text-center">
        <p className="text-sm font-medium text-amber-800">
          No assignments were found in this document.
        </p>
        <p className="mt-1 text-xs text-amber-600">
          Try uploading a different document or add assignments manually.
        </p>
        <button
          onClick={() => router.push('/')}
          className="mt-4 text-sm text-blue-600 underline"
        >
          Back to dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {selected.size} of {assignments.length} assignments selected
        </p>
        <button
          onClick={() =>
            setSelected(
              selected.size === assignments.length
                ? new Set()
                : new Set(assignments.map((_, i) => i))
            )
          }
          className="text-xs text-blue-600 underline"
        >
          {selected.size === assignments.length ? 'Deselect all' : 'Select all'}
        </button>
      </div>

      <div className="space-y-3">
        {assignments.map((a, i) => {
          const merged = getMerged(i)
          const isSelected = selected.has(i)
          const hasDateError = dateErrors.has(i)

          return (
            <div
              key={i}
              className={cn(
                'rounded-lg border p-4 transition-opacity',
                isSelected ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50 opacity-60'
              )}
            >
              <div className="mb-3 flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(i)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        CONFIDENCE_STYLES[a.confidence]
                      )}
                    >
                      {a.confidence} confidence
                    </span>
                  </div>
                  <input
                    type="text"
                    value={merged.title}
                    onChange={(e) => updateEdit(i, 'title', e.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="ml-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Type</label>
                  <select
                    value={merged.type}
                    onChange={(e) => updateEdit(i, 'type', e.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {ASSIGNMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-500">Subject</label>
                  <select
                    value={merged.subject}
                    onChange={(e) => updateEdit(i, 'subject', e.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-gray-500">
                    Due date {hasDateError && <span className="text-red-500">*required</span>}
                  </label>
                  <input
                    type="date"
                    value={merged.due_date ?? ''}
                    onChange={(e) => updateEdit(i, 'due_date', e.target.value)}
                    className={cn(
                      'w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1',
                      hasDateError
                        ? 'border-red-400 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500'
                    )}
                  />
                </div>
              </div>

              {merged.notes && (
                <p className="ml-7 mt-2 text-xs text-gray-500">{merged.notes}</p>
              )}
            </div>
          )
        })}
      </div>

      <button
        onClick={handleSave}
        disabled={saving || selected.size === 0}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <CheckCircle className="h-4 w-4" />
            Save {selected.size} Assignment{selected.size !== 1 ? 's' : ''}
          </>
        )}
      </button>
    </div>
  )
}
