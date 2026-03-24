export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { extractTextFromBuffer } from '@/lib/pdf-extract'
import { extractAssignmentsFromText } from '@/lib/claude'

export async function POST(req: NextRequest) {
  const { storage_url, child_id, document_id, week_of } = await req.json()

  if (!storage_url || !child_id) {
    return NextResponse.json({ error: 'storage_url and child_id are required' }, { status: 400 })
  }

  const supabase = createServerSupabase()

  // Download PDF from Supabase Storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('teacher-docs')
    .download(storage_url)

  if (downloadError) {
    return NextResponse.json({ error: `Download failed: ${downloadError.message}` }, { status: 500 })
  }

  const buffer = Buffer.from(await fileData.arrayBuffer())

  // Extract text with pdf-parse
  let text: string
  try {
    text = await extractTextFromBuffer(buffer)
  } catch (err) {
    return NextResponse.json({ error: `PDF parsing failed: ${err}` }, { status: 500 })
  }

  // Check for image-scanned PDFs
  if (text.length < 50) {
    return NextResponse.json(
      {
        error: 'image_scan',
        message: 'This PDF appears to be an image scan and cannot be read automatically. Please add assignments manually.',
      },
      { status: 422 }
    )
  }

  // Extract assignments with Claude
  let result: Awaited<ReturnType<typeof extractAssignmentsFromText>>
  try {
    result = await extractAssignmentsFromText(text, week_of)
  } catch (err) {
    return NextResponse.json({ error: `AI extraction failed: ${err}` }, { status: 500 })
  }

  // Mark document as processed
  if (document_id) {
    await supabase
      .from('documents')
      .update({ processed: true })
      .eq('id', document_id)
  }

  return NextResponse.json(result)
}
