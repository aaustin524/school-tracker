'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import type { StudyMaterial } from '@/types'
import { getSupabase } from '@/lib/supabase'
import { SUBJECTS, getSubjectColor, cn } from '@/lib/helpers'
import { Upload, Download, Trash2, X, FileText, File, Loader2, BookOpen } from 'lucide-react'

const ACCEPTED = '.pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg'

function fileIcon(fileType: string) {
  if (fileType === 'pdf') return <FileText className="h-6 w-6 text-red-400" />
  if (fileType === 'docx' || fileType === 'doc') return <FileText className="h-6 w-6 text-blue-400" />
  if (fileType === 'pptx' || fileType === 'ppt') return <FileText className="h-6 w-6 text-orange-400" />
  if (['png', 'jpg', 'jpeg'].includes(fileType)) return <File className="h-6 w-6 text-green-400" />
  return <File className="h-6 w-6 text-gray-400" />
}

function fileTypeBadge(fileType: string) {
  const upper = fileType.toUpperCase()
  const colors: Record<string, string> = {
    pdf: 'bg-red-100 text-red-700',
    doc: 'bg-blue-100 text-blue-700', docx: 'bg-blue-100 text-blue-700',
    ppt: 'bg-orange-100 text-orange-700', pptx: 'bg-orange-100 text-orange-700',
    png: 'bg-green-100 text-green-700', jpg: 'bg-green-100 text-green-700', jpeg: 'bg-green-100 text-green-700',
  }
  return (
    <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-black', colors[fileType] ?? 'bg-gray-100 text-gray-600')}>
      {upper}
    </span>
  )
}

function formatSize(bytes?: number) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getPublicUrl(storagePath: string) {
  const { data } = getSupabase().storage.from('study-materials').getPublicUrl(storagePath)
  return data.publicUrl
}

// ── Upload dialog ────────────────────────────────────────────────
function UploadDialog({ childId, onUploaded, onClose }: {
  childId: string
  onUploaded: () => void
  onClose: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('General')
  const [uploading, setUploading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !title) return
    setUploading(true)

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'file'
    const storagePath = `${childId}/${Date.now()}-${file.name}`

    const { error: uploadError } = await getSupabase()
      .storage.from('study-materials')
      .upload(storagePath, file, { upsert: false })

    if (uploadError) {
      toast.error(`Upload failed: ${uploadError.message}`)
      setUploading(false)
      return
    }

    const res = await fetch('/api/study-materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        child_id: childId,
        title,
        filename: file.name,
        storage_url: storagePath,
        file_type: ext,
        file_size: file.size,
        subject,
      }),
    })

    if (!res.ok) {
      toast.error('Failed to save material record')
      setUploading(false)
      return
    }

    toast.success('Study material uploaded!')
    onUploaded()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-black text-gray-800">📎 Add Study Material</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 5 Study Guide"
              required
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">File</label>
            <div
              onClick={() => fileRef.current?.click()}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-6 text-center transition-colors',
                file ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300 hover:border-indigo-300 hover:bg-indigo-50'
              )}
            >
              <Upload className="mb-2 h-7 w-7 text-gray-400" />
              {file ? (
                <div>
                  <p className="text-sm font-bold text-indigo-700">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-gray-600">Click to choose a file</p>
                  <p className="text-xs text-gray-400 mt-0.5">PDF, Word, PowerPoint, or image</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !file || !title}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-sm font-black text-white shadow hover:shadow-md disabled:opacity-50 transition-all"
            >
              {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</> : <><Upload className="h-4 w-4" /> Upload</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main section ─────────────────────────────────────────────────
export function StudyMaterials({ childId, materials, onRefresh }: {
  childId: string
  materials: StudyMaterial[]
  onRefresh: () => void
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeletingId(id)
    await fetch(`/api/study-materials/${id}`, { method: 'DELETE' })
    toast.success('Material removed')
    onRefresh()
    setDeletingId(null)
  }

  function handleDownload(material: StudyMaterial) {
    const url = getPublicUrl(material.storage_url)
    const a = document.createElement('a')
    a.href = url
    a.download = material.filename
    a.target = '_blank'
    a.click()
  }

  return (
    <div className="rounded-3xl bg-white/70 border-2 border-white shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-indigo-500" />
          <h2 className="text-sm font-black uppercase tracking-wider text-indigo-600">
            Study Materials
          </h2>
          {materials.length > 0 && (
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-black text-indigo-600">
              {materials.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-3 py-1.5 text-xs font-black text-white shadow hover:shadow-md hover:scale-105 transition-all"
        >
          <Upload className="h-3.5 w-3.5" /> Add File
        </button>
      </div>

      {/* List */}
      {materials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
          <span className="text-4xl">📂</span>
          <p className="text-sm font-black text-gray-400">No study materials yet</p>
          <p className="text-xs text-gray-300">Upload PDFs, Word docs, or images</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {materials.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/60 transition-colors group">
              {/* File type icon */}
              <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                {fileIcon(m.file_type)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-black text-gray-800 leading-snug">{m.title}</span>
                  {fileTypeBadge(m.file_type)}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', getSubjectColor(m.subject))}>
                    {m.subject}
                  </span>
                  {m.file_size && (
                    <span className="text-xs text-gray-400">{formatSize(m.file_size)}</span>
                  )}
                  <span className="text-xs text-gray-300 truncate hidden sm:block">{m.filename}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleDownload(m)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors"
                  title="Download"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(m.id)}
                  disabled={deletingId === m.id}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-400 hover:bg-red-200 transition-colors disabled:opacity-50"
                  title="Delete"
                >
                  {deletingId === m.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5" />
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {dialogOpen && (
        <UploadDialog
          childId={childId}
          onUploaded={onRefresh}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  )
}
