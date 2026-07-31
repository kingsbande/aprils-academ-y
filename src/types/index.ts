export type UserRole = 'admin'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  school_id: string
  school_name: string
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
  age: number | null
  gender: 'male' | 'female'
  class_id: string
  class_name?: string // joined in for display
  parent_name: string
  parent_phone: string
  parent_occupation: string | null
  health_notes: string | null
  former_school: string | null
  pickup_person: string | null
  location: string | null
  address: string | null
  academic_year: string
  date_joined: string
  created_at: string
}

export interface NewStudentInput {
  full_name: string
  date_of_birth: string
  age: number | ''
  gender: 'male' | 'female'
  class_id: string
  parent_name: string
  parent_phone: string
  parent_occupation: string
  health_notes: string
  former_school: string
  pickup_person: string
  location: string
  address: string
  academic_year: string
  date_joined: string
}
