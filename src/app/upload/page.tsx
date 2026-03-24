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
      <div className="mb-6 text-center">
        <div className="text-5xl mb-3">📄</div>
        <h1 className="text-3xl font-black text-indigo-800">Upload Teacher Document</h1>
        <p className="mt-2 text-sm font-medium text-gray-500">
          Upload a PDF and AI will automatically extract this week&apos;s assignments.
        </p>
      </div>

      <div className="rounded-3xl border-2 border-white bg-white/80 backdrop-blur-sm p-6 shadow-lg">
        <UploadForm childOptions={children} />
      </div>
    </div>
  )
}
