import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json()
  const supabase = createServerSupabase()

  // If marking complete, set completed_at
  if (body.completed === true && !body.completed_at) {
    body.completed_at = new Date().toISOString()
  }
  if (body.completed === false) {
    body.completed_at = null
  }

  const { data, error } = await supabase
    .from('assignments')
    .update(body)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabase()

  const { error } = await supabase
    .from('assignments')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
