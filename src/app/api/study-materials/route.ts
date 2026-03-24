import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const childId = searchParams.get('child_id')
  const supabase = createServerSupabase()

  let query = supabase
    .from('study_materials')
    .select('*')
    .order('uploaded_at', { ascending: false })

  if (childId) query = query.eq('child_id', childId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const supabase = createServerSupabase()

  const { data, error } = await supabase
    .from('study_materials')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
