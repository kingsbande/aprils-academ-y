import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ClassRoom, Student } from '../types'
import { SearchBar } from './SearchBar'

export interface StudentListHandle {
  refresh: () => void
}

interface StudentRow {
  id: string
  admission_number: string
  full_name: string
  date_of_birth: string
  gender: 'male' | 'female'
  parent_name: string
  parent_phone: string
  created_at: string
  classes: { name: string } | null
}

export function StudentList({ refreshKey }: { refreshKey: number }) {
  const [classes, setClasses] = useState<ClassRoom[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('classes')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        if (data) setClasses(data as ClassRoom[])
      })
  }, [])

  useEffect(() => {
    setLoading(true)
    // Sequential fetch pattern: fetch students, then resolve class name
    // via the joined relation rather than relying on ambiguous nested
    // join shapes from Supabase.
    supabase
      .from('students')
      .select(
        'id, admission_number, full_name, date_of_birth, gender, parent_name, parent_phone, created_at, classes ( name )',
      )
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          const rows = data as unknown as StudentRow[]
          setStudents(
            rows.map((row) => ({
              id: row.id,
              admission_number: row.admission_number,
              full_name: row.full_name,
              date_of_birth: row.date_of_birth,
              gender: row.gender,
              class_id: '',
              class_name: row.classes?.name ?? 'Unassigned',
              parent_name: row.parent_name,
              parent_phone: row.parent_phone,
              created_at: row.created_at,
            })),
          )
        }
        setLoading(false)
      })
  }, [refreshKey])

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchesClass =
        selectedClassId === 'all' || classes.find((c) => c.id === selectedClassId)?.name === s.class_name
      const q = search.trim().toLowerCase()
      const matchesSearch =
        q === '' || s.full_name.toLowerCase().includes(q) || s.admission_number.toLowerCase().includes(q)
      return matchesClass && matchesSearch
    })
  }, [students, selectedClassId, search, classes])

  return (
    <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Students</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchBar value={search} onChange={setSearch} />
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          >
            <option value="all">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading students...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500">No students found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="py-2 pr-4">Adm No.</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Class</th>
                <th className="py-2 pr-4">Gender</th>
                <th className="py-2 pr-4">Parent</th>
                <th className="py-2 pr-4">Parent Phone</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-gray-100">
                  <td className="py-2 pr-4">{s.admission_number}</td>
                  <td className="py-2 pr-4">{s.full_name}</td>
                  <td className="py-2 pr-4">{s.class_name}</td>
                  <td className="py-2 pr-4 capitalize">{s.gender}</td>
                  <td className="py-2 pr-4">{s.parent_name}</td>
                  <td className="py-2 pr-4">{s.parent_phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
