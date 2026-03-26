'use client'

import type { Child } from '@/types'
import { SUBJECTS } from '@/lib/helpers'

interface ImportReviewToolbarProps {
  selectedCount: number
  allSelected: boolean
  readyCount: number
  childOptions: Child[]
  bulkSubject: string
  bulkChild: string
  saving: boolean
  onToggleAll: () => void
  onApproveAll: () => void
  onApproveReady: () => void
  onDeleteSelected: () => void
  onBulkSubjectChange: (value: string) => void
  onBulkSubjectApply: () => void
  onBulkChildChange: (value: string) => void
  onBulkChildApply: () => void
  onConfirmSave: () => void
  onCancel: () => void
}

export function ImportReviewToolbar({
  selectedCount,
  allSelected,
  readyCount,
  childOptions,
  bulkSubject,
  bulkChild,
  saving,
  onToggleAll,
  onApproveAll,
  onApproveReady,
  onDeleteSelected,
  onBulkSubjectChange,
  onBulkSubjectApply,
  onBulkChildChange,
  onBulkChildApply,
  onConfirmSave,
  onCancel,
}: ImportReviewToolbarProps) {
  return (
    <div className="rounded-[2rem] border border-white bg-white/90 p-5 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.28)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-500">Bulk Actions</p>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {selectedCount} item{selectedCount === 1 ? '' : 's'} selected
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onApproveReady}
            disabled={readyCount === 0}
            className="rounded-full bg-gradient-to-r from-indigo-600 to-sky-500 px-4 py-2 text-sm font-black text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
          >
            Approve all ready items
          </button>
          <button
            onClick={onToggleAll}
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-200"
          >
            {allSelected ? 'Clear selection' : 'Select all'}
          </button>
          <button
            onClick={onApproveAll}
            className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-600"
          >
            Approve All
          </button>
          <button
            onClick={onDeleteSelected}
            disabled={selectedCount === 0}
            className="rounded-full bg-rose-100 px-4 py-2 text-sm font-black text-rose-600 transition hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Delete selected
          </button>
          <button
            onClick={onCancel}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirmSave}
            disabled={saving || selectedCount === 0}
            className="rounded-full bg-gradient-to-r from-indigo-600 to-sky-500 px-4 py-2 text-sm font-black text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Confirm & Save'}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Apply Subject</p>
          <div className="mt-2 flex gap-2">
            <select
              value={bulkSubject}
              onChange={(e) => onBulkSubjectChange(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">Choose subject</option>
              {SUBJECTS.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
            <button
              onClick={onBulkSubjectApply}
              disabled={!bulkSubject || selectedCount === 0}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-black text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Apply Child</p>
          <div className="mt-2 flex gap-2">
            <select
              value={bulkChild}
              onChange={(e) => onBulkChildChange(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">Choose child</option>
              {childOptions.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </select>
            <button
              onClick={onBulkChildApply}
              disabled={!bulkChild || selectedCount === 0}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-black text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
