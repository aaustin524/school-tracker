import type { AssignmentType } from '@/types'

export interface ParsedImportAssignment {
  id: string
  title: string
  child_name: string
  subject: string
  due_date: string
  type: AssignmentType
  confidence?: number
  notes?: string
  is_study_task?: boolean
  for_assignment?: string
  source_doc_id?: string | null
}
