'use client'

import type { Child, AssignmentType } from '@/types'
import { ASSIGNMENT_TYPES, SUBJECTS, cn } from '@/lib/helpers'
import type { ParsedImportAssignment } from '@/components/import-review/types'

interface ImportReviewRowProps {
  item: ParsedImportAssignment
  childOptions: Child[]
  selected: boolean
  onToggleSelected: (id: string) => void
  onChange: <K extends keyof ParsedImportAssignment>(id: string, field: K, value: ParsedImportAssignment[K]) => void
}

function getConfidenceStyle(confidence?: number) {
  if (confidence == null) return 'border-slate-200 bg-white'
  if (confidence < 0.45) return 'border-rose-200 bg-rose-50/80'
  if (confidence < 0.75) return 'border-amber-200 bg-amber-50/80'
  return 'border-emerald-200 bg-emerald-50/70'
}

function getConfidenceLabel(confidence?: number) {
  if (confidence == null) return 'No score'
  if (confidence < 0.45) return 'Low confidence'
  if (confidence < 0.75) return 'Review suggested'
  return 'High confidence'
}

export function ImportReviewRow({
  item,
  childOptions,
  selected,
  onToggleSelected,
  onChange,
}: ImportReviewRowProps) {
  const confidenceStyle = getConfidenceStyle(item.confidence)

  return (
    <div
      className={cn(
        'rounded-[1.75rem] border p-4 shadow-sm transition',
        confidenceStyle,
        selected ? 'ring-2 ring-indigo-300' : 'opacity-90'
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelected(item.id)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Assignment</p>
            <p className="mt-1 text-xs font-bold text-slate-500">
              {getConfidenceLabel(item.confidence)}
              {item.confidence != null ? ` • ${Math.round(item.confidence * 100)}%` : ''}
            </p>
            {item.is_study_task && (
              <p className="mt-1 text-xs font-bold text-purple-600">
                Study task{item.for_assignment ? ` for ${item.for_assignment}` : ''}
              </p>
            )}
          </div>
        </div>

        <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="xl:col-span-2">
            <label className="mb-1 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Title
            </label>
            <input
              type="text"
              value={item.title}
              onChange={(e) => onChange(item.id, 'title', e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Child
            </label>
            <select
              value={item.child_name}
              onChange={(e) => onChange(item.id, 'child_name', e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {childOptions.map((child) => (
                <option key={child.id} value={child.name}>
                  {child.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Subject
            </label>
            <select
              value={item.subject}
              onChange={(e) => onChange(item.id, 'subject', e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {SUBJECTS.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Due Date
            </label>
            <input
              type="date"
              value={item.due_date}
              onChange={(e) => onChange(item.id, 'due_date', e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Type
            </label>
            <select
              value={item.type}
              onChange={(e) => onChange(item.id, 'type', e.target.value as AssignmentType)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium capitalize text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {ASSIGNMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
