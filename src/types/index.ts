export type UserRole = 'admin'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
}

export interface ClassRoom {
  id: string
  name: string // e.g. "Standard 1", "Form 2"
}

export interface Student {
  id: string
  admission_number: string
  full_name: string
  date_of_birth: string
  gender: 'male' | 'female'
  class_id: string
  class_name?: string // joined in for display
  parent_name: string
  parent_phone: string
  created_at: string
}

export interface NewStudentInput {
  full_name: string
  date_of_birth: string
  gender: 'male' | 'female'
  class_id: string
  parent_name: string
  parent_phone: string
}
