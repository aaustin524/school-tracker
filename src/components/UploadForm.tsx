'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Child } from '@/types'
import { getSupabase } from '@/lib/supabase'
import { getMondayOfCurrentWeek } from '@/lib/helpers'
import { Upload, Loader2 } from 'lucide-react'

interface UploadFormProps {
  childOptions: Child[]
}

type UploadState = 'idle' | 'uploading' | 'parsing' | 'error'

export function UploadForm({ childOptions }: UploadFormProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [selectedChild, setSelectedChild] = useState(childOptions[0]?.id ?? '')
  const [weekOf, setWeekOf] = useState(getMondayOfCurrentWeek())
  const [state, setState] = useState<UploadState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [file, setFile] = useState<File | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !selectedChild) return

    setState('uploading')
    setErrorMsg('')

    // 1. Upload PDF to Supabase Storage
    const filePath = `${selectedChild}/${Date.now()}-${file.name}`
    const { error: uploadError } = await getSupabase().storage
      .from('teacher-docs')
      .upload(filePath, file, { contentType: 'application/pdf', upsert: false })

    if (uploadError) {
      setState('error')
      setErrorMsg(`Upload failed: ${uploadError.message}`)
      return
    }

    // 2. Save document record
    const docRes = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        child_id: selectedChild,
        filename: file.name,
        storage_url: filePath,
      }),
    })
    const docData = docRes.ok ? await docRes.json() : { id: null }

    // 3. Parse with AI
    setState('parsing')
    const parseRes = await fetch('/api/parse-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storage_url: filePath,
        child_id: selectedChild,
        document_id: docData.id,
        week_of: weekOf,
      }),
    })

    const rawText = await parseRes.text()
    let parseBody: { error?: string; message?: string; assignments?: unknown[]; study_tasks?: unknown[] }
    try {
      parseBody = JSON.parse(rawText)
    } catch {
      setState('error')
      setErrorMsg(`Server returned unexpected response: ${rawText.slice(0, 200)}`)
      return
    }

    if (!parseRes.ok) {
      if (parseBody.error === 'image_scan') {
        setState('error')
        setErrorMsg(parseBody.message ?? 'Image scan PDF')
        return
      }
      setState('error')
      setErrorMsg(parseBody.error ?? 'Parsing failed')
      return
    }

    const parsed = parseBody

    // 4. Navigate to review page with results in query params
    const reviewData = encodeURIComponent(
      JSON.stringify({
        assignments: parsed.assignments ?? [],
        study_tasks: parsed.study_tasks ?? [],
        child_id: selectedChild,
        document_id: docData.id,
      })
    )
    router.push(`/upload/review?data=${reviewData}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Which child?
        </label>
        <select
          value={selectedChild}
          onChange={(e) => setSelectedChild(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {childOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.grade})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Week of (Monday)
        </label>
        <input
          type="date"
          value={weekOf}
          onChange={(e) => setWeekOf(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Used to resolve dates like &quot;Friday&quot; in the document
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Teacher document (PDF)
        </label>
        <div
          onClick={() => fileRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors"
        >
          <Upload className="mb-2 h-8 w-8 text-gray-400" />
          {file ? (
            <div>
              <p className="text-sm font-medium text-gray-700">{file.name}</p>
              <p className="text-xs text-gray-500">
                {(file.size / 1024).toFixed(0)} KB
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-gray-600">Click to select a PDF</p>
              <p className="text-xs text-gray-500">Max 5 MB</p>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {errorMsg && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={!file || !selectedChild || state !== 'idle'}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {state === 'uploading' && <Loader2 className="h-4 w-4 animate-spin" />}
        {state === 'parsing' && <Loader2 className="h-4 w-4 animate-spin" />}
        {state === 'uploading' && 'Uploading...'}
        {state === 'parsing' && 'Extracting assignments with AI...'}
        {state === 'idle' && 'Upload & Extract Assignments'}
        {state === 'error' && 'Try Again'}
      </button>

      {state === 'parsing' && (
        <p className="text-center text-xs text-gray-500">
          This usually takes 5–10 seconds...
        </p>
      )}
    </form>
  )
}
