'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { getSupabase } from '@/lib/supabase'
import { ReviewExtracted } from '@/components/ReviewExtracted'
import type { Child } from '@/types'
import { useState, useEffect } from 'react'

function ReviewContent() {
  const searchParams = useSearchParams()
  const [children, setChildren] = useState<Child[]>([])

  useEffect(() => {
    getSupabase().from('children').select('*').order('name').then(({ data }) => {
      setChildren(data ?? [])
    })
  }, [])

  const rawData = searchParams.get('data')
  if (!rawData) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">No data found. Please upload a document first.</p>
        <a href="/upload" className="mt-3 inline-block text-sm text-blue-600 underline">
          Upload a document
        </a>
      </div>
    )
  }

  let parsed: { assignments: ReturnType<typeof JSON.parse>; study_tasks: ReturnType<typeof JSON.parse>; child_id: string; document_id: string }
  try {
    parsed = JSON.parse(decodeURIComponent(rawData))
  } catch {
    return (
      <div className="text-center py-10">
        <p className="text-red-600">Failed to parse review data.</p>
        <a href="/upload" className="mt-3 inline-block text-sm text-blue-600 underline">
          Try again
        </a>
      </div>
    )
  }

  return (
    <ReviewExtracted
      assignments={parsed.assignments ?? []}
      studyTasks={parsed.study_tasks ?? []}
      childId={parsed.child_id}
      documentId={parsed.document_id}
      childOptions={children}
    />
  )
}

export default function ReviewPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <a href="/upload" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to upload
        </a>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">Review Extracted Assignments</h1>
        <p className="mt-1 text-sm text-gray-600">
          Review and edit the assignments AI found. Uncheck any you want to skip, then save.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <Suspense fallback={<div className="py-8 text-center text-sm text-gray-500">Loading...</div>}>
          <ReviewContent />
        </Suspense>
      </div>
    </div>
  )
}
