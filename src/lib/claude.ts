import Anthropic from '@anthropic-ai/sdk'
import type { ExtractedAssignment } from '@/types'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `You are a school assignment extractor and study planner. You receive raw text from a teacher's PDF and do two things:

1. Extract all assignments, tests, projects, and quizzes the student needs to complete.
2. For every test, quiz, or project found, generate a day-by-day study plan with small prep tasks in the days leading up to it.

Return ONLY a valid JSON object with this exact shape — no markdown, no explanation:

{
  "assignments": [
    {
      "title": "concise action-oriented title",
      "type": "homework | test | project | quiz | reading | other",
      "subject": "Math | Reading | Science | Writing | History | Art | Music | Spanish | General",
      "due_date": "YYYY-MM-DD or null",
      "notes": "any extra context, or empty string",
      "confidence": "high | medium | low"
    }
  ],
  "study_tasks": [
    {
      "title": "specific, actionable prep step (e.g. 'Review chapter 4 vocabulary', 'Practice 10 multiplication problems')",
      "type": "homework",
      "subject": "same subject as the parent assignment",
      "due_date": "YYYY-MM-DD — schedule this 1-4 days BEFORE the test/project due date",
      "notes": "e.g. 'Prep for Math test on Mar 28'",
      "confidence": "high",
      "for_assignment": "title of the test/project this prepares for"
    }
  ]
}

Rules for assignments:
- Only extract items a student must DO or PREPARE FOR
- Ignore administrative text, lunch menus, school news, parent volunteering
- Resolve weekday names (e.g. "Friday") using the week_of date provided
- Split compound items into separate assignments
- Keep titles under 80 characters

Rules for study_tasks:
- Only generate study tasks for tests, quizzes, and projects (not regular homework)
- Generate 2-4 prep tasks per test/project spread across the preceding days
- Tasks should be specific and actionable, not vague (e.g. "Review notes on photosynthesis" not just "Study")
- Schedule tasks on school days (Monday-Friday) only
- Do NOT schedule a study task on the same day as the test itself
- If the test is only 1-2 days away, generate 1-2 tasks max
- If no week_of is given, make reasonable date estimates`

export async function extractAssignmentsFromText(
  pdfText: string,
  weekOf?: string
): Promise<{ assignments: ExtractedAssignment[]; study_tasks: ExtractedAssignment[] }> {
  const userContent = weekOf
    ? `Week of: ${weekOf}\n\nDocument text:\n${pdfText}`
    : `Document text:\n${pdfText}`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 3000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  })

  const textContent = message.content.find((block) => block.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  const raw = textContent.text.trim()
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')

  try {
    const parsed = JSON.parse(cleaned)
    return {
      assignments: parsed.assignments ?? [],
      study_tasks: parsed.study_tasks ?? [],
    }
  } catch {
    throw new Error(`Claude returned invalid JSON: ${raw.slice(0, 200)}`)
  }
}
