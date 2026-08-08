import { supabase } from './supabaseClient'
import { ClassRoom, ParentAccount, Student } from '../types'

export const PAGE_SIZE = 20

// PostgREST's `.or()` filter string uses commas and parentheses as its
// own syntax delimiters, so raw user input can break the query if it
// contains them. Strip rather than error — the search still works,
// just ignores those characters.
function sanitizeForOrFilter(term: string): string {
  return term.replace(/[,()]/g, '').trim()
}

// ------------------------------------------------------------
// Classes — shared across Registration form, Edit form, Student
// list, and the parent-account student picker. One react-query
// cache entry (key: ['classes']) serves all of them instead of
// each component fetching its own copy.
// ------------------------------------------------------------
export async function fetchClasses(): Promise<ClassRoom[]> {
  const { data, error } = await supabase.from('classes').select('id, name').order('name')
  if (error) throw error
  return (data ?? []) as ClassRoom[]
}

// ------------------------------------------------------------
// Students — paginated + filtered entirely server-side. Only the
// current page's rows ever cross the network; the total row count
// comes back on the same request (Supabase's `count: 'exact'`
// option), not from a separate full-table fetch.
// ------------------------------------------------------------
interface StudentJoinRow {
  id: string
  admission_number: string
  full_name: string
  date_of_birth: string
  age: number | null
  gender: 'male' | 'female'
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
  government_code: string | null
  photo_url: string | null
  parent_account_id: string | null
  created_at: string
  classes: { name: string } | null
}

function mapStudentRow(row: StudentJoinRow): Student {
  return {
    id: row.id,
    admission_number: row.admission_number,
    full_name: row.full_name,
    date_of_birth: row.date_of_birth,
    age: row.age,
    gender: row.gender,
    class_id: '',
    class_name: row.classes?.name ?? 'Unassigned',
    parent_name: row.parent_name,
    parent_phone: row.parent_phone,
    parent_occupation: row.parent_occupation,
    health_notes: row.health_notes,
    former_school: row.former_school,
    pickup_person: row.pickup_person,
    location: row.location,
    address: row.address,
    academic_year: row.academic_year,
    date_joined: row.date_joined,
    government_code: row.government_code,
    photo_url: row.photo_url,
    parent_account_id: row.parent_account_id,
    created_at: row.created_at,
  }
}

const STUDENT_COLUMNS =
  'id, admission_number, full_name, date_of_birth, age, gender, parent_name, parent_phone, parent_occupation, health_notes, former_school, pickup_person, location, address, academic_year, date_joined, government_code, photo_url, parent_account_id, created_at, classes ( name )'

export interface StudentsPageParams {
  page: number // 0-indexed
  search: string
  classId: string // 'all' or a specific class id
  dateJoinedFrom: string // '' or 'YYYY-MM-DD'
}

export interface StudentsPageResult {
  students: Student[]
  total: number
}

export async function fetchStudentsPage({
  page,
  search,
  classId,
  dateJoinedFrom,
}: StudentsPageParams): Promise<StudentsPageResult> {
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('students')
    .select(STUDENT_COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  const term = sanitizeForOrFilter(search)
  if (term !== '') {
    query = query.or(`full_name.ilike.%${term}%,admission_number.ilike.%${term}%`)
  }
  if (classId !== 'all') {
    query = query.eq('class_id', classId)
  }
  if (dateJoinedFrom !== '') {
    query = query.gte('date_joined', dateJoinedFrom)
  }

  const { data, error, count } = await query
  if (error) throw error

  return {
    students: (data as unknown as StudentJoinRow[]).map(mapStudentRow),
    total: count ?? 0,
  }
}

// Used by the parent-account creation modal's student picker — a
// lighter, unpaginated search capped at a sane limit, since that UI
// just needs "find the one student" rather than a full browse.
export interface StudentPickerRow {
  id: string
  full_name: string
  admission_number: string
  parent_name: string
  parent_account_id: string | null
  class_name: string
}

export async function searchStudentsForPicker(search: string): Promise<StudentPickerRow[]> {
  let query = supabase
    .from('students')
    .select('id, full_name, admission_number, parent_name, parent_account_id, classes ( name )')
    .order('full_name')
    .limit(20)

  const term = sanitizeForOrFilter(search)
  if (term !== '') {
    query = query.or(
      `full_name.ilike.%${term}%,parent_name.ilike.%${term}%,admission_number.ilike.%${term}%`,
    )
  }

  const { data, error } = await query
  if (error) throw error

  const rows = data as unknown as Array<{
    id: string
    full_name: string
    admission_number: string
    parent_name: string
    parent_account_id: string | null
    classes: { name: string } | null
  }>

  return rows.map((r) => ({
    id: r.id,
    full_name: r.full_name,
    admission_number: r.admission_number,
    parent_name: r.parent_name,
    parent_account_id: r.parent_account_id,
    class_name: r.classes?.name ?? 'Unassigned',
  }))
}

// ------------------------------------------------------------
// Parent accounts — same paginated pattern as students.
// ------------------------------------------------------------
export interface ParentAccountsPageParams {
  page: number
  search: string
}

export interface ParentAccountsPageResult {
  accounts: ParentAccount[]
  total: number
}

export async function fetchParentAccountsPage({
  page,
  search,
}: ParentAccountsPageParams): Promise<ParentAccountsPageResult> {
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('parent_accounts')
    .select('id, school_id, full_name, username, phone, is_active, must_change_password, created_at', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range(from, to)

  const term = sanitizeForOrFilter(search)
  if (term !== '') {
    query = query.or(`full_name.ilike.%${term}%,username.ilike.%${term}%,phone.ilike.%${term}%`)
  }

  const { data, error, count } = await query
  if (error) throw error

  return { accounts: (data ?? []) as ParentAccount[], total: count ?? 0 }
}

// ------------------------------------------------------------
// Count-only queries — for stats/overview widgets. `head: true`
// tells PostgREST to return just the count, no row bodies at all.
// ------------------------------------------------------------
export async function fetchStudentCount(): Promise<number> {
  const { count, error } = await supabase.from('students').select('*', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

export async function fetchParentAccountCount(): Promise<number> {
  const { count, error } = await supabase
    .from('parent_accounts')
    .select('*', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}
