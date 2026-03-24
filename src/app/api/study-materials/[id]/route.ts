import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabase()

  // Get the record first so we can remove the storage file
  const { data: material } = await supabase
    .from('study_materials')
    .select('storage_url')
    .eq('id', params.id)
    .single()

  if (material?.storage_url) {
    await supabase.storage.from('study-materials').remove([material.storage_url])
  }

  const { error } = await supabase
    .from('study_materials')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
