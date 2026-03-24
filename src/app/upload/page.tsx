export const dynamic = 'force-dynamic'

import { UploadForm } from '@/components/UploadForm'
import { createServerSupabase } from '@/lib/supabase-server'
import type { Child } from '@/types'

async function getChildren(): Promise<Child[]> {
  const supabase = createServerSupabase()
  const { data } = await supabase.from('children').select('*').order('name')
  return data ?? []
}

export default async function UploadPage() {
  const children = await getChildren()

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <a href="/" className="text-sm text-gray-500 hover:text-gray-700">
          ← Dashboard
        </a>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">Upload Teacher Document</h1>
        <p className="mt-1 text-sm text-gray-600">
          Upload a PDF and AI will automatically extract this week&apos;s assignments.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <UploadForm childOptions={children} />
      </div>
    </div>
  )
}
