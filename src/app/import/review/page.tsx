'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, Loader2, WandSparkles } from 'lucide-react'
import { toast } from 'sonner'
import type { Child, ExtractedAssignment } from '@/types'
import { getSupabase } from '@/lib/supabase'
import { ImportReviewRow } from '@/components/import-review/ImportReviewRow'
import { ImportReviewToolbar } from '@/components/import-review/ImportReviewToolbar'
import { IMPORT_REVIEW_STORAGE_KEY, type ImportReviewType, type ParsedImportAssignment } from '@/components/import-review/types'

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

function toAssignmentType(type: ExtractedAssignment['type']) {
  if (type === 'test' || type === 'quiz' || type === 'project' || type === 'homework') {
    return type
  }
  return 'homework'
}

function toReviewType(type: ExtractedAssignment['type']): ImportReviewType {
  if (type === 'test' || type === 'quiz' || type === 'project' || type === 'homework') {
    return type
  }
  return 'homework'
}

function normalizeParsedItems(payload: ReviewPayload, children: Child[]): ParsedImportAssignment[] {
  const defaultChild = children.find((child) => child.id === payload.child_id) ?? children[0]
  const childName = defaultChild?.name ?? ''
  const childId = defaultChild?.id ?? ''
  const baseAssignments = payload.assignments ?? []
  const studyTasks = payload.study_tasks ?? []

  const normalizedAssignments: ParsedImportAssignment[] = baseAssignments.map((item, index) => ({
    id: `assignment-${index}-${item.title}`,
    title: item.title,
    child_id: childId,
    child_name: childName,
    subject: item.subject,
    due_date: item.due_date ?? '',
    type: toAssignmentType(item.type),
    review_type: toReviewType(item.type),
    confidence: item.confidence ? CONFIDENCE_TO_SCORE[item.confidence] : undefined,
    notes: item.notes,
    source_doc_id: payload.document_id ?? null,
  }))

  const normalizedStudyTasks: ParsedImportAssignment[] = studyTasks.map((item, index) => ({
    id: `study-${index}-${item.title}`,
    title: item.title,
    child_id: childId,
    child_name: childName,
    subject: item.subject,
    due_date: item.due_date ?? '',
    type: toAssignmentType(item.type),
    review_type: 'study',
    confidence: item.confidence ? CONFIDENCE_TO_SCORE[item.confidence] : undefined,
    notes: item.notes,
    is_study_task: true,
    for_assignment: item.for_assignment,
    source_doc_id: payload.document_id ?? null,
  }))

  return [
    ...normalizedAssignments,
    ...normalizedStudyTasks,
  ]
}

function ImportReviewContent() {
  const router = useRouter()
  const [children, setChildren] = useState<Child[]>([])
  const [items, setItems] = useState<ParsedImportAssignment[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedReadyIds, setExpandedReadyIds] = useState<Set<string>>(new Set())
  const [bulkSubject, setBulkSubject] = useState('')
  const [bulkChild, setBulkChild] = useState('')
  const [loadingChildren, setLoadingChildren] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dataError, setDataError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadChildrenAndData() {
      try {
        const rawData = sessionStorage.getItem(IMPORT_REVIEW_STORAGE_KEY)
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
          const parsed = JSON.parse(rawData) as ReviewPayload
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
  }, [])

  const selectedCount = selectedIds.size
  const needsReviewItems = useMemo(
    () => items.filter((item) => item.confidence == null || item.confidence < 0.75),
    [items]
  )
  const readyItems = useMemo(
    () => items.filter((item) => item.confidence != null && item.confidence >= 0.75),
    [items]
  )
  const readyIds = useMemo(
    () => readyItems.map((item) => item.id),
    [readyItems]
  )
  const allSelected = items.length > 0 && selectedCount === items.length

  function updateItem<K extends keyof ParsedImportAssignment>(id: string, field: K, value: ParsedImportAssignment[K]) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item

        if (field === 'child_id') {
          const child = children.find((entry) => entry.id === value)
          return {
            ...item,
            child_id: value as string,
            child_name: child?.name ?? '',
          }
        }

        if (field === 'review_type') {
          const reviewType = value as ImportReviewType
          return {
            ...item,
            review_type: reviewType,
            is_study_task: reviewType === 'study',
            type: (reviewType === 'study' ? 'homework' : reviewType),
          }
        }

        return { ...item, [field]: value }
      })
    )
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleExpanded(id: string) {
    setExpandedReadyIds((prev) => {
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

  function approveReady() {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      readyIds.forEach((id) => next.add(id))
      return next
    })
    toast.success(`Approved ${readyIds.length} ready item${readyIds.length === 1 ? '' : 's'}.`)
  }

  function deleteSelected() {
    if (selectedIds.size === 0) return
    setItems((prev) => prev.filter((item) => !selectedIds.has(item.id)))
    setSelectedIds(new Set())
    setExpandedReadyIds((prev) => {
      const next = new Set(prev)
      selectedIds.forEach((id) => next.delete(id))
      return next
    })
    toast.success('Selected assignments removed from review.')
  }

  function applySubjectToSelected() {
    if (!bulkSubject || selectedIds.size === 0) return
    setItems((prev) => prev.map((item) => (selectedIds.has(item.id) ? { ...item, subject: bulkSubject } : item)))
    toast.success(`Applied ${bulkSubject} to selected assignments.`)
  }

  function applyChildToSelected() {
    if (!bulkChild || selectedIds.size === 0) return
    const child = children.find((entry) => entry.id === bulkChild)
    setItems((prev) => prev.map((item) => (
      selectedIds.has(item.id)
        ? { ...item, child_id: bulkChild, child_name: child?.name ?? '' }
        : item
    )))
    toast.success(`Applied ${child?.name ?? 'child'} to selected assignments.`)
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

    const invalidItem = selectedItems.find((item) => (
      !item.title.trim() ||
      !item.child_id ||
      !item.subject.trim() ||
      !item.due_date
    ))

    if (invalidItem) {
      const missingFields = [
        !invalidItem.title.trim() ? 'title' : null,
        !invalidItem.child_id ? 'child' : null,
        !invalidItem.subject.trim() ? 'subject' : null,
        !invalidItem.due_date ? 'due date' : null,
      ].filter(Boolean).join(', ')

      toast.error(`"${invalidItem.title || 'Untitled assignment'}" is missing: ${missingFields}.`)
      return
    }

    setSaving(true)

    try {
      const payload = selectedItems.map((item) => {
        return {
          child_id: item.child_id,
          title: item.title.trim(),
          subject: item.subject.trim(),
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
      sessionStorage.removeItem(IMPORT_REVIEW_STORAGE_KEY)
      router.push('/')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save assignments.')
      setSaving(false)
    }
  }

  function handleCancel() {
    sessionStorage.removeItem(IMPORT_REVIEW_STORAGE_KEY)
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
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-500">Needs review</p>
              <p className="mt-2 text-3xl font-black text-slate-800">{needsReviewItems.length}</p>
            </div>
            <div className="rounded-3xl border border-emerald-100 bg-white/85 px-4 py-3 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-500">Ready to save</p>
              <p className="mt-2 text-3xl font-black text-slate-800">{readyItems.length}</p>
            </div>
          </div>
        </div>
      </div>

      <ImportReviewToolbar
        selectedCount={selectedCount}
        allSelected={allSelected}
        readyCount={readyItems.length}
        childOptions={children}
        bulkSubject={bulkSubject}
        bulkChild={bulkChild}
        saving={saving}
        onToggleAll={toggleAll}
        onApproveAll={approveAll}
        onApproveReady={approveReady}
        onDeleteSelected={deleteSelected}
        onBulkSubjectChange={setBulkSubject}
        onBulkSubjectApply={applySubjectToSelected}
        onBulkChildChange={setBulkChild}
        onBulkChildApply={applyChildToSelected}
        onConfirmSave={handleConfirmSave}
        onCancel={handleCancel}
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
          <>
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-amber-100 p-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800">Needs Review</h2>
                  <p className="text-sm font-medium text-slate-500">
                    Medium and low confidence items stay open so you can move quickly through the ones that need attention.
                  </p>
                </div>
              </div>

              {needsReviewItems.length === 0 ? (
                <div className="rounded-[1.75rem] border border-dashed border-emerald-200 bg-emerald-50/80 p-6 text-center shadow-sm">
                  <p className="text-sm font-black text-emerald-700">No items need review right now.</p>
                  <p className="mt-1 text-sm font-medium text-emerald-600">Everything parsed with high confidence.</p>
                </div>
              ) : (
                needsReviewItems.map((item) => (
                  <ImportReviewRow
                    key={item.id}
                    item={item}
                    childOptions={children}
                    selected={selectedIds.has(item.id)}
                    expanded
                    warning
                    onToggleSelected={toggleSelected}
                    onToggleExpanded={toggleExpanded}
                    onChange={updateItem}
                  />
                ))
              )}
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-100 p-2 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800">Ready to Save</h2>
                  <p className="text-sm font-medium text-slate-500">
                    High-confidence items stay compact by default so you can approve them faster.
                  </p>
                </div>
              </div>

              {readyItems.length === 0 ? (
                <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center shadow-sm">
                  <p className="text-sm font-black text-slate-700">No ready items yet.</p>
                  <p className="mt-1 text-sm font-medium text-slate-500">High-confidence items will appear here in a lighter review mode.</p>
                </div>
              ) : (
                readyItems.map((item) => (
                  <ImportReviewRow
                    key={item.id}
                    item={item}
                    childOptions={children}
                    selected={selectedIds.has(item.id)}
                    expanded={expandedReadyIds.has(item.id)}
                    compact
                    onToggleSelected={toggleSelected}
                    onToggleExpanded={toggleExpanded}
                    onChange={updateItem}
                  />
                ))
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

export default function ImportReviewPage() {
  return <ImportReviewContent />
}
