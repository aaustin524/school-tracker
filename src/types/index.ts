export type AssignmentType = 'homework' | 'test' | 'project' | 'quiz' | 'reading' | 'other'

export interface Child {
  id: string
  name: string
  grade: string
  theme: string
  teacher?: string
  created_at: string
}

export interface Assignment {
  id: string
  child_id: string
  title: string
  type: AssignmentType
  subject: string
  due_date: string // ISO date string "YYYY-MM-DD"
  completed: boolean
  completed_at?: string
  notes?: string
  source_doc_id?: string
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  child_id: string
  filename: string
  storage_url: string
  uploaded_at: string
  processed: boolean
}

export interface ExtractedAssignment {
  title: string
  type: AssignmentType
  subject: string
  due_date: string | null
  notes?: string
  confidence: 'high' | 'medium' | 'low'
}
