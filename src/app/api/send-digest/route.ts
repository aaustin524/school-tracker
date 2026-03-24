import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServerSupabase } from '@/lib/supabase-server'
import { format, addDays, startOfWeek } from 'date-fns'
import type { Assignment, Child } from '@/types'

const CHILD_EMOJI: Record<string, string> = { coral: '⭐', sky: '✨' }

function getWeekStart(offset = 0) {
  const base = addDays(new Date(), offset * 7)
  return startOfWeek(base, { weekStartsOn: 1 })
}

function buildWeekSection(child: Child, assignments: Assignment[], weekStart: Date, label: string) {
  const monday = format(weekStart, 'yyyy-MM-dd')
  const friday = format(addDays(weekStart, 4), 'yyyy-MM-dd')
  const items = assignments
    .filter((a) => !a.completed && a.due_date >= monday && a.due_date <= friday)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))

  if (items.length === 0) return ''

  const emoji = CHILD_EMOJI[child.theme] ?? '📚'
  const rows = items.map((a) => {
    const day = format(new Date(a.due_date + 'T12:00:00'), 'EEE MMM d')
    const type = a.is_study_task ? 'Study' : a.type
    return `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:13px;white-space:nowrap;">${day}</td><td style="padding:4px 0;font-size:13px;">${a.title}</td><td style="padding:4px 0 4px 12px;font-size:12px;color:#9ca3af;white-space:nowrap;">${a.subject} · ${type}</td></tr>`
  }).join('')

  return `
    <h3 style="margin:24px 0 6px;font-size:15px;font-weight:800;color:#1e293b;">${emoji} ${child.name.split(' ')[0]} — ${label}</h3>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
  `
}

export async function GET(req: NextRequest) {
  // Allow cron (checked via secret) or manual trigger
  const secret = req.nextUrl.searchParams.get('secret')
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const email = process.env.DIGEST_EMAIL
  if (!email) return NextResponse.json({ error: 'DIGEST_EMAIL not set' }, { status: 500 })

  const resend = new Resend(process.env.RESEND_API_KEY)
  const supabase = createServerSupabase()

  const [childrenRes, assignmentsRes] = await Promise.all([
    supabase.from('children').select('*').order('name'),
    supabase.from('assignments').select('*').eq('completed', false),
  ])

  const children: Child[] = childrenRes.data ?? []
  const assignments: Assignment[] = assignmentsRes.data ?? []

  const thisWeek = getWeekStart(0)
  const nextWeek = getWeekStart(1)
  const weekLabel = format(thisWeek, 'MMMM d')

  let sections = ''
  for (const child of children) {
    const childAssignments = assignments.filter((a) => a.child_id === child.id)
    sections += buildWeekSection(child, childAssignments, thisWeek, 'This Week')
    sections += buildWeekSection(child, childAssignments, nextWeek, 'Next Week')
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f8fafc;color:#1e293b;">
      <div style="background:white;border-radius:16px;padding:28px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <h1 style="margin:0 0 4px;font-size:22px;font-weight:900;color:#4f46e5;">📚 School Tracker</h1>
        <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">Weekly digest — week of ${weekLabel}</p>
        <hr style="border:none;border-top:2px solid #f1f5f9;margin-bottom:8px;" />
        ${sections || '<p style="color:#9ca3af;font-size:14px;">🎉 Nothing due this week or next — enjoy the break!</p>'}
        <hr style="border:none;border-top:2px solid #f1f5f9;margin-top:24px;" />
        <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">Sent by School Tracker every Sunday morning.</p>
      </div>
    </body>
    </html>
  `

  const { error } = await resend.emails.send({
    from: 'School Tracker <onboarding@resend.dev>',
    to: email,
    subject: `📚 School Tracker — Week of ${weekLabel}`,
    html,
  })

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ ok: true, sent_to: email })
}
