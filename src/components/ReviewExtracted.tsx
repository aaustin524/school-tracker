'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ExtractedAssignment, Child } from '@/types'
import { SUBJECTS, ASSIGNMENT_TYPES, cn } from '@/lib/helpers'
import { Loader2, CheckCircle } from 'lucide-react'

interface ReviewExtractedProps {
  assignments: ExtractedAssignment[]
  studyTasks: ExtractedAssignment[]
  childId: string
  documentId: string
  childOptions: Child[]
}

const CONFIDENCE_STYLES = {
  high: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-600',
}

type ItemWithFlag = ExtractedAssignment & { _isStudyTask: boolean; _index: number }

function ReviewSection({
  title,
  emoji,
  items,
  selected,
  edits,
  dateErrors,
  onToggle,
  onEdit,
}: {
  title: string
  emoji: string
  items: ItemWithFlag[]
  selected: Set<string>
  edits: Record<string, Partial<ExtractedAssignment>>
  dateErrors: Set<string>
  onToggle: (key: string) => void
  onEdit: (key: string, field: keyof ExtractedAssignment, value: string) => void
}) {
  if (items.length === 0) return null

  function getMerged(item: ItemWithFlag): ExtractedAssignment {
    const key = `${item._isStudyTask ? 's' : 'a'}-${item._index}`
    return { ...item, ...edits[key] }
  }

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-indigo-600">
        {emoji} {title} ({items.length})
      </h3>
      <div className="space-y-3">
        {items.map((item) => {
          const key = `${item._isStudyTask ? 's' : 'a'}-${item._index}`
          const merged = getMerged(item)
          const isSelected = selected.has(key)
          const hasDateError = dateErrors.has(key)

          return (
            <div
              key={key}
              className={cn(
                'rounded-2xl border-2 p-4 transition-opacity',
                isSelected
                  ? item._isStudyTask ? 'border-purple-200 bg-purple-50' : 'border-blue-200 bg-blue-50'
                  : 'border-gray-200 bg-gray-50 opacity-50'
              )}
            >
              <div className="mb-3 flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(key)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', CONFIDENCE_STYLES[item.confidence])}>
                      {item.confidence} confidence
                    </span>
                    {item.for_assignment && (
                      <span className="rounded-full bg-purple-100 text-purple-700 px-2 py-0.5 text-xs font-bold">
                        📋 for: {item.for_assignment}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={merged.title}
                    onChange={(e) => onEdit(key, 'title', e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>

              <div className="ml-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-500">Type</label>
                  <select
                    value={merged.type}
                    onChange={(e) => onEdit(key, 'type', e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {ASSIGNMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-500">Subject</label>
                  <select
                    value={merged.subject}
                    onChange={(e) => onEdit(key, 'subject', e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold text-gray-500">
                    Due date {hasDateError && <span className="text-red-500">*required</span>}
                  </label>
                  <input
                    type="date"
                    value={merged.due_date ?? ''}
                    onChange={(e) => onEdit(key, 'due_date', e.target.value)}
                    className={cn(
                      'w-full rounded-xl border px-2 py-1.5 text-xs focus:outline-none focus:ring-2',
                      hasDateError ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-indigo-400'
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
    </div>
  )
}

export function ReviewExtracted({ assignments, studyTasks, childId, documentId, childOptions }: ReviewExtractedProps) {
  const router = useRouter()

  const allItems: ItemWithFlag[] = [
    ...assignments.map((a, i) => ({ ...a, _isStudyTask: false, _index: i })),
    ...studyTasks.map((s, i) => ({ ...s, _isStudyTask: true, _index: i })),
  ]

  const [selected, setSelected] = useState<Set<string>>(
    new Set(allItems.map((item) => `${item._isStudyTask ? 's' : 'a'}-${item._index}`))
  )
  const [edits, setEdits] = useState<Record<string, Partial<ExtractedAssignment>>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [dateErrors, setDateErrors] = useState<Set<string>>(new Set())

  function toggleSelect(key: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function updateEdit(key: string, field: keyof ExtractedAssignment, value: string) {
    setEdits((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }))
    if (field === 'due_date') {
      setDateErrors((prev) => {
        const next = new Set(prev)
        if (value) next.delete(key)
        else next.add(key)
        return next
      })
      if (value) setSaveError('')
    }
  }

  function getMerged(item: ItemWithFlag): ExtractedAssignment {
    const key = `${item._isStudyTask ? 's' : 'a'}-${item._index}`
    return { ...item, ...edits[key] }
  }

  async function handleSave() {
    const errors = new Set<string>()
    Array.from(selected).forEach((key) => {
      const item = allItems.find((i) => `${i._isStudyTask ? 's' : 'a'}-${i._index}` === key)
      if (item && !getMerged(item).due_date) errors.add(key)
    })
    if (errors.size > 0) {
      setDateErrors(errors)
      setSaveError(`${errors.size} item${errors.size !== 1 ? 's' : ''} need a due date before saving. Set them above or uncheck them.`)
      return
    }

    setSaving(true)
    setSaveError('')

    try {
      const results = await Promise.all(
        Array.from(selected).map(async (key) => {
          const item = allItems.find((i) => `${i._isStudyTask ? 's' : 'a'}-${i._index}` === key)!
          const merged = getMerged(item)
          const res = await fetch('/api/assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              child_id: childId,
              title: merged.title,
              type: merged.type,
              subject: merged.subject,
              due_date: merged.due_date,
              notes: merged.notes ?? '',
              source_doc_id: documentId,
              is_study_task: item._isStudyTask,
            }),
          })
          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
            throw new Error(err.error ?? `Failed to save: ${merged.title}`)
          }
          return res
        })
      )

      if (results.length > 0) {
        const child = childOptions.find((c) => c.id === childId)
        const slug = child ? child.name.toLowerCase().replace(/\s+/g, '-') : ''
        router.push(slug ? `/${slug}` : '/')
      }
    } catch (err) {
      setSaveError(String(err))
      setSaving(false)
    }
  }

  if (allItems.length === 0) {
    return (
      <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-6 text-center">
        <p className="text-sm font-bold text-amber-800">No assignments were found in this document.</p>
        <button onClick={() => router.push('/')} className="mt-4 text-sm text-blue-600 underline font-bold">
          Back to dashboard
        </button>
      </div>
    )
  }

  const assignmentItems = allItems.filter((i) => !i._isStudyTask)
  const studyItems = allItems.filter((i) => i._isStudyTask)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-500">
          {selected.size} of {allItems.length} items selected
        </p>
        <button
          onClick={() => setSelected(
            selected.size === allItems.length
              ? new Set()
              : new Set(allItems.map((i) => `${i._isStudyTask ? 's' : 'a'}-${i._index}`))
          )}
          className="text-xs text-indigo-600 underline font-bold"
        >
          {selected.size === allItems.length ? 'Deselect all' : 'Select all'}
        </button>
      </div>

      <ReviewSection
        title="Assignments & Tests"
        emoji="📋"
        items={assignmentItems}
        selected={selected}
        edits={edits}
        dateErrors={dateErrors}
        onToggle={toggleSelect}
        onEdit={updateEdit}
      />

      <ReviewSection
        title="Study Plan"
        emoji="🧠"
        items={studyItems}
        selected={selected}
        edits={edits}
        dateErrors={dateErrors}
        onToggle={toggleSelect}
        onEdit={updateEdit}
      />

      {saveError && (
        <div className="rounded-2xl bg-red-50 border-2 border-red-200 p-3 text-sm font-bold text-red-700">
          ⚠️ {saveError}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving || selected.size === 0}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 text-sm font-black text-white shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {saving ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
        ) : (
          <><CheckCircle className="h-4 w-4" /> Save {selected.size} item{selected.size !== 1 ? 's' : ''}</>
        )}
      </button>
    </div>
  )
}
