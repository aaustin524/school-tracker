import type { AssignmentType } from '@/types'

export type ImportReviewType = 'test' | 'quiz' | 'project' | 'homework' | 'study'
export const IMPORT_REVIEW_STORAGE_KEY = 'import-review-payload'

export interface ParsedImportAssignment {
  id: string
  title: string
  child_id: string
  child_name: string
  subject: string
  due_date: string
  type: AssignmentType
  review_type?: ImportReviewType
  confidence?: number
  notes?: string
  is_study_task?: boolean
  for_assignment?: string
  source_doc_id?: string | null
}
