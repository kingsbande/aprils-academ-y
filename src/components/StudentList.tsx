import { Fragment, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ClassRoom, Student } from '../types'
import { SearchBar } from './SearchBar'
import { EditStudentForm } from './EditStudentForm'

export interface StudentListHandle {
  refresh: () => void
}

interface StudentRow {
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
  created_at: string
  classes: { name: string } | null
}

export function StudentList({ refreshKey }: { refreshKey: number }) {
  const [classes, setClasses] = useState<ClassRoom[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [dateJoinedFilter, setDateJoinedFilter] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('classes')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        if (data) setClasses(data as ClassRoom[])
      })
  }, [])

  function fetchStudents() {
    setLoading(true)
    // Sequential fetch pattern: fetch students, then resolve class name
    // via the joined relation rather than relying on ambiguous nested
    // join shapes from Supabase.
    supabase
      .from('students')
      .select(
        'id, admission_number, full_name, date_of_birth, age, gender, parent_name, parent_phone, parent_occupation, health_notes, former_school, pickup_person, location, address, academic_year, date_joined, government_code, photo_url, created_at, classes ( name )',
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
              created_at: row.created_at,
            })),
          )
        }
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchStudents()
  }, [refreshKey])

  async function handleDelete(id: string, name: string) {
    const confirmed = window.confirm(`Delete ${name}'s record? This cannot be undone.`)
    if (!confirmed) return

    setDeletingId(id)
    const { error } = await supabase.from('students').delete().eq('id', id)
    setDeletingId(null)

    if (error) {
      window.alert(`Could not delete student: ${error.message}`)
      return
    }

    fetchStudents()
  }

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchesClass =
        selectedClassId === 'all' || classes.find((c) => c.id === selectedClassId)?.name === s.class_name
      const q = search.trim().toLowerCase()
      const matchesSearch =
        q === '' || s.full_name.toLowerCase().includes(q) || s.admission_number.toLowerCase().includes(q)
      const matchesDate = dateJoinedFilter === '' || s.date_joined >= dateJoinedFilter
      return matchesClass && matchesSearch && matchesDate
    })
  }, [students, selectedClassId, search, classes, dateJoinedFilter])

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
          <input
            type="date"
            value={dateJoinedFilter}
            onChange={(e) => setDateJoinedFilter(e.target.value)}
            title="Show students who joined on or after this date"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
          {dateJoinedFilter && (
            <button
              onClick={() => setDateJoinedFilter('')}
              className="text-xs font-medium text-gray-500 underline hover:text-gray-900"
            >
              Clear date
            </button>
          )}
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
                <th className="py-2 pr-4">Photo</th>
                <th className="py-2 pr-4">Adm No.</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Class</th>
                <th className="py-2 pr-4">Age</th>
                <th className="py-2 pr-4">Gender</th>
                <th className="py-2 pr-4">Parent</th>
                <th className="py-2 pr-4">Parent Phone</th>
                <th className="py-2 pr-4">Year</th>
                <th className="py-2 pr-4">Joined</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <Fragment key={s.id}>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 pr-4">
                      {s.photo_url ? (
                        <img src={s.photo_url} alt={s.full_name} className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-400">
                          {s.full_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-4">{s.admission_number}</td>
                    <td className="py-2 pr-4">{s.full_name}</td>
                    <td className="py-2 pr-4">{s.class_name}</td>
                    <td className="py-2 pr-4">{s.age ?? '-'}</td>
                    <td className="py-2 pr-4 capitalize">{s.gender}</td>
                    <td className="py-2 pr-4">{s.parent_name}</td>
                    <td className="py-2 pr-4">{s.parent_phone}</td>
                    <td className="py-2 pr-4">{s.academic_year}</td>
                    <td className="py-2 pr-4">{s.date_joined}</td>
                    <td className="py-2 pr-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setExpandedId(expandedId === s.id ? null : s.id)
                            setEditingId(null)
                          }}
                          className="text-xs font-medium text-gray-500 underline hover:text-gray-900"
                        >
                          {expandedId === s.id ? 'Hide' : 'Details'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(editingId === s.id ? null : s.id)
                            setExpandedId(null)
                          }}
                          className="text-xs font-medium text-blue-600 underline hover:text-blue-800"
                        >
                          {editingId === s.id ? 'Cancel' : 'Edit'}
                        </button>
                        <button
                          onClick={() => handleDelete(s.id, s.full_name)}
                          disabled={deletingId === s.id}
                          className="text-xs font-medium text-red-600 underline hover:text-red-800 disabled:opacity-50"
                        >
                          {deletingId === s.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editingId === s.id && (
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <td colSpan={11} className="px-4 py-3">
                        <EditStudentForm
                          student={s}
                          classes={classes}
                          onCancel={() => setEditingId(null)}
                          onSaved={() => {
                            setEditingId(null)
                            fetchStudents()
                          }}
                        />
                      </td>
                    </tr>
                  )}
                  {expandedId === s.id && (
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <td colSpan={11} className="px-4 py-3">
                        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-xs text-gray-700 sm:grid-cols-3">
                          <div>
                            <dt className="font-medium text-gray-500">Government Code</dt>
                            <dd>{s.government_code || '—'}</dd>
                          </div>
                          <div>
                            <dt className="font-medium text-gray-500">Former School</dt>
                            <dd>{s.former_school || '—'}</dd>
                          </div>
                          <div>
                            <dt className="font-medium text-gray-500">Parent Occupation</dt>
                            <dd>{s.parent_occupation || '—'}</dd>
                          </div>
                          <div>
                            <dt className="font-medium text-gray-500">Authorized Pickup</dt>
                            <dd>{s.pickup_person || '—'}</dd>
                          </div>
                          <div>
                            <dt className="font-medium text-gray-500">Location</dt>
                            <dd>{s.location || '—'}</dd>
                          </div>
                          <div className="sm:col-span-2">
                            <dt className="font-medium text-gray-500">Address</dt>
                            <dd>{s.address || '—'}</dd>
                          </div>
                          <div className="sm:col-span-3">
                            <dt className="font-medium text-gray-500">Sickness / Disease / Allergies</dt>
                            <dd>{s.health_notes || '—'}</dd>
                          </div>
                        </dl>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
