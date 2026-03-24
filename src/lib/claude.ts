import Anthropic from '@anthropic-ai/sdk'
import type { ExtractedAssignment } from '@/types'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `You are a school assignment extractor. You receive raw text from a teacher's PDF (weekly newsletter, homework sheet, or syllabus) and extract actionable assignments, tests, and projects for students.

Return ONLY a valid JSON object. Do not include markdown, explanation, or commentary.

JSON shape:
{
  "assignments": [
    {
      "title": "string — concise, action-oriented title (e.g. 'Chapter 5 math worksheet', 'Study for multiplication quiz')",
      "type": "homework | test | project | quiz | reading | other",
      "subject": "Math | Reading | Science | Writing | History | Art | Music | Spanish | General",
      "due_date": "YYYY-MM-DD or null if not determinable",
      "notes": "string — any additional context or instructions, empty string if none",
      "confidence": "high | medium | low"
    }
  ]
}

Rules:
- Only extract items a student must DO or PREPARE FOR
- Ignore administrative text, lunch menus, school news, parent volunteering requests
- If a date references a weekday (e.g. "Friday"), resolve it relative to the week_of date provided
- If no week_of is provided, use the current year for date resolution
- For month/day dates like "3/28", use the year from week_of or current year
- Confidence scoring: high = explicit due date + clear task, medium = date or task is inferred, low = very ambiguous
- Prefer splitting compound items ("read chapter 3 AND complete worksheet") into separate assignments
- Keep titles under 80 characters
- Subject inference: use keywords in the text, default to General if unclear`

export async function extractAssignmentsFromText(
  pdfText: string,
  weekOf?: string
): Promise<{ assignments: ExtractedAssignment[] }> {
  const userContent = weekOf
    ? `Week of: ${weekOf}\n\nDocument text:\n${pdfText}`
    : `Document text:\n${pdfText}`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  })

  const textContent = message.content.find((block) => block.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  // Clean up markdown code fences if Claude wraps the JSON
  const raw = textContent.text.trim()
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')

  try {
    const parsed = JSON.parse(cleaned)
    return parsed
  } catch {
    throw new Error(`Claude returned invalid JSON: ${raw.slice(0, 200)}`)
  }
}
