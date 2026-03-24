export type AssignmentType = 'homework' | 'test' | 'project' | 'quiz' | 'reading' | 'other'

export interface Child {
  id: string
  name: string
  grade: string
  theme: string
  teacher?: string
  notes?: string
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
  score?: number | null
  source_doc_id?: string
  is_study_task: boolean
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

export interface StudyMaterial {
  id: string
  child_id: string
  title: string
  filename: string
  storage_url: string
  file_type: string
  file_size?: number
  subject: string
  uploaded_at: string
}

export interface ExtractedAssignment {
  title: string
  type: AssignmentType
  subject: string
  due_date: string | null
  notes?: string
  confidence: 'high' | 'medium' | 'low'
  for_assignment?: string // study tasks only — the test/project this prepares for
}
