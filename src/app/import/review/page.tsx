'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Upload, WandSparkles } from 'lucide-react'
import { toast } from 'sonner'
import type { Child, ExtractedAssignment } from '@/types'
import { getSupabase } from '@/lib/supabase'
import { ImportReviewRow } from '@/components/import-review/ImportReviewRow'
import { ImportReviewToolbar } from '@/components/import-review/ImportReviewToolbar'
import type { ParsedImportAssignment } from '@/components/import-review/types'

const CONFIDENCE_TO_SCORE: Record<ExtractedAssignment['confidence'], number> = {
  high: 0.92,
  medium: 0.65,
  low: 0.35,
}

type ReviewPayload = {
  assignments?: ExtractedAssignment[]
  study_tasks?: ExtractedAssignment[]
  child_id?: string
  document_id?: string | null
}

function normalizeParsedItems(payload: ReviewPayload, children: Child[]): ParsedImportAssignment[] {
  const childName = children.find((child) => child.id === payload.child_id)?.name ?? children[0]?.name ?? ''
  const baseAssignments = payload.assignments ?? []
  const studyTasks = payload.study_tasks ?? []

  return [
    ...baseAssignments.map((item, index) => ({
      id: `assignment-${index}-${item.title}`,
      title: item.title,
      child_name: childName,
      subject: item.subject,
      due_date: item.due_date ?? '',
      type: item.type,
      confidence: item.confidence ? CONFIDENCE_TO_SCORE[item.confidence] : undefined,
      notes: item.notes,
      source_doc_id: payload.document_id ?? null,
    })),
    ...studyTasks.map((item, index) => ({
      id: `study-${index}-${item.title}`,
      title: item.title,
      child_name: childName,
      subject: item.subject,
      due_date: item.due_date ?? '',
      type: item.type,
      confidence: item.confidence ? CONFIDENCE_TO_SCORE[item.confidence] : undefined,
      notes: item.notes,
      is_study_task: true,
      for_assignment: item.for_assignment,
      source_doc_id: payload.document_id ?? null,
    })),
  ]
}

function ImportReviewContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [children, setChildren] = useState<Child[]>([])
  const [items, setItems] = useState<ParsedImportAssignment[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkSubject, setBulkSubject] = useState('')
  const [bulkChild, setBulkChild] = useState('')
  const [loadingChildren, setLoadingChildren] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dataError, setDataError] = useState('')

  useEffect(() => {
    const rawData = searchParams.get('data')
    let mounted = true

    async function loadChildrenAndData() {
      try {
        const { data } = await getSupabase()
          .from('children')
          .select('*')
          .order('name')

        if (!mounted) return

        const childData = data ?? []
        setChildren(childData)

        if (!rawData) {
          setDataError('No parsed import data found. Please upload a document first.')
          return
        }

        try {
          const parsed = JSON.parse(decodeURIComponent(rawData)) as ReviewPayload
          const normalized = normalizeParsedItems(parsed, childData)
          setItems(normalized)
          setSelectedIds(new Set(normalized.map((item) => item.id)))
        } catch {
          setDataError('We could not read the parsed import data. Please try uploading again.')
        }
      } finally {
        if (mounted) {
          setLoadingChildren(false)
        }
      }
    }

    loadChildrenAndData()

    return () => {
      mounted = false
    }
  }, [searchParams])

  const selectedCount = selectedIds.size
  const allSelected = items.length > 0 && selectedCount === items.length

  const confidenceSummary = useMemo(() => {
    const low = items.filter((item) => item.confidence != null && item.confidence < 0.45).length
    const medium = items.filter((item) => item.confidence != null && item.confidence >= 0.45 && item.confidence < 0.75).length
    return { low, medium }
  }, [items])

  function updateItem<K extends keyof ParsedImportAssignment>(id: string, field: K, value: ParsedImportAssignment[K]) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(items.map((item) => item.id)))
  }

  function approveAll() {
    setSelectedIds(new Set(items.map((item) => item.id)))
    toast.success('All parsed assignments are selected.')
  }

  function deleteSelected() {
    if (selectedIds.size === 0) return
    setItems((prev) => prev.filter((item) => !selectedIds.has(item.id)))
    setSelectedIds(new Set())
    toast.success('Selected assignments removed from review.')
  }

  function applySubjectToSelected() {
    if (!bulkSubject || selectedIds.size === 0) return
    setItems((prev) => prev.map((item) => (selectedIds.has(item.id) ? { ...item, subject: bulkSubject } : item)))
    toast.success(`Applied ${bulkSubject} to selected assignments.`)
  }

  function applyChildToSelected() {
    if (!bulkChild || selectedIds.size === 0) return
    setItems((prev) => prev.map((item) => (selectedIds.has(item.id) ? { ...item, child_name: bulkChild } : item)))
    toast.success(`Applied ${bulkChild} to selected assignments.`)
  }

  async function handleConfirmSave() {
    if (items.length === 0) {
      toast.error('There are no assignments to save.')
      return
    }

    const selectedItems = items.filter((item) => selectedIds.has(item.id))
    if (selectedItems.length === 0) {
      toast.error('Select at least one assignment to save.')
      return
    }

    const missingChild = selectedItems.find((item) => !children.find((child) => child.name === item.child_name))
    if (missingChild) {
      toast.error(`Match a child for "${missingChild.title}" before saving.`)
      return
    }

    setSaving(true)

    try {
      const payload = selectedItems.map((item) => {
        const child = children.find((entry) => entry.name === item.child_name)!
        return {
          child_id: child.id,
          title: item.title,
          subject: item.subject,
          due_date: item.due_date,
          type: item.type,
          notes: item.notes ?? '',
          source_doc_id: item.source_doc_id ?? undefined,
          is_study_task: item.is_study_task ?? false,
        }
      })

      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to save assignments.' }))
        throw new Error(error.error ?? 'Failed to save assignments.')
      }

      toast.success(`Saved ${payload.length} assignment${payload.length === 1 ? '' : 's'} successfully.`)
      router.push('/')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save assignments.')
      setSaving(false)
    }
  }

  function handleCancel() {
    router.push('/')
  }

  if (loadingChildren) {
    return (
      <div className="mx-auto max-w-6xl py-10">
        <div className="rounded-[2rem] border border-white bg-white/90 p-10 text-center shadow-[0_18px_40px_-24px_rgba(15,23,42,0.28)]">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-indigo-500" />
          <p className="mt-3 text-sm font-medium text-slate-500">Loading import review...</p>
        </div>
      </div>
    )
  }

  if (dataError) {
    return (
      <div className="mx-auto max-w-3xl py-10">
        <div className="rounded-[2rem] border border-amber-200 bg-amber-50/90 p-8 text-center shadow-sm">
          <p className="text-lg font-black text-amber-800">Import data unavailable</p>
          <p className="mt-2 text-sm font-medium text-amber-700">{dataError}</p>
          <button
            onClick={() => router.push('/upload')}
            className="mt-5 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-black text-white transition hover:bg-amber-600"
          >
            Back to upload
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <div className="rounded-[2.25rem] border border-white/70 bg-gradient-to-br from-white via-indigo-50/80 to-amber-50/70 p-6 shadow-[0_24px_60px_-24px_rgba(79,70,229,0.35)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-indigo-500">Import Review</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-800">Review before saving</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500">
              Clean up parsed assignments and study tasks, confirm the details, and save them in one pass.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-indigo-100 bg-white/85 px-4 py-3 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-500">Parsed items</p>
              <p className="mt-2 text-3xl font-black text-slate-800">{items.length}</p>
            </div>
            <div className="rounded-3xl border border-amber-100 bg-white/85 px-4 py-3 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-500">Review suggested</p>
              <p className="mt-2 text-3xl font-black text-slate-800">{confidenceSummary.medium}</p>
            </div>
            <div className="rounded-3xl border border-rose-100 bg-white/85 px-4 py-3 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-500">Low confidence</p>
              <p className="mt-2 text-3xl font-black text-slate-800">{confidenceSummary.low}</p>
            </div>
          </div>
        </div>
      </div>

      <ImportReviewToolbar
        selectedCount={selectedCount}
        allSelected={allSelected}
        childOptions={children}
        bulkSubject={bulkSubject}
        bulkChild={bulkChild}
        onToggleAll={toggleAll}
        onApproveAll={approveAll}
        onDeleteSelected={deleteSelected}
        onBulkSubjectChange={setBulkSubject}
        onBulkSubjectApply={applySubjectToSelected}
        onBulkChildChange={setBulkChild}
        onBulkChildApply={applyChildToSelected}
      />

      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-emerald-200 bg-emerald-50/80 p-10 text-center shadow-sm">
            <WandSparkles className="mx-auto h-7 w-7 text-emerald-500" />
            <p className="mt-3 text-lg font-black text-emerald-700">Nothing left to review</p>
            <p className="mt-1 text-sm font-medium text-emerald-600">
              Bring in another import or head back to the dashboard.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <ImportReviewRow
              key={item.id}
              item={item}
              childOptions={children}
              selected={selectedIds.has(item.id)}
              onToggleSelected={toggleSelected}
              onChange={updateItem}
            />
          ))
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-[2rem] border border-white bg-white/90 p-5 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.28)] sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm font-medium text-slate-500">
          Saving uses the existing assignments API and keeps the selected rows only.
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleCancel}
            className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmSave}
            disabled={saving || selectedCount === 0 || items.length === 0}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-sky-500 px-5 py-2.5 text-sm font-black text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Confirm & Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ImportReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl py-10">
          <div className="rounded-[2rem] border border-white bg-white/90 p-10 text-center shadow-[0_18px_40px_-24px_rgba(15,23,42,0.28)]">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-indigo-500" />
            <p className="mt-3 text-sm font-medium text-slate-500">Loading import review...</p>
          </div>
        </div>
      }
    >
      <ImportReviewContent />
    </Suspense>
  )
}
