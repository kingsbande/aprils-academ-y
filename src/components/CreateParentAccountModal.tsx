import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

interface StudentOption {
  id: string
  full_name: string
  admission_number: string
  parent_name: string
  parent_account_id: string | null
  class_name: string
}

interface CreateParentAccountModalProps {
  onClose: () => void
  onCreated: () => void
}

export function CreateParentAccountModal({ onClose, onCreated }: CreateParentAccountModalProps) {
  const [search, setSearch] = useState('')
  const [students, setStudents] = useState<StudentOption[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingId, setCreatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [credentials, setCredentials] = useState<{
    studentName: string
    username: string
    temporaryPassword: string
  } | null>(null)

  useEffect(() => {
    supabase
      .from('students')
      .select('id, full_name, admission_number, parent_name, parent_account_id, classes ( name )')
      .order('full_name')
      .then(({ data, error: fetchError }) => {
        if (!fetchError && data) {
          const rows = data as unknown as Array<{
            id: string
            full_name: string
            admission_number: string
            parent_name: string
            parent_account_id: string | null
            classes: { name: string } | null
          }>
          setStudents(
            rows.map((r) => ({
              id: r.id,
              full_name: r.full_name,
              admission_number: r.admission_number,
              parent_name: r.parent_name,
              parent_account_id: r.parent_account_id,
              class_name: r.classes?.name ?? 'Unassigned',
            })),
          )
        }
        setLoading(false)
      })
  }, [])

  const filtered = students.filter((s) => {
    const q = search.trim().toLowerCase()
    if (q === '') return true
    return (
      s.full_name.toLowerCase().includes(q) ||
      s.parent_name.toLowerCase().includes(q) ||
      s.admission_number.toLowerCase().includes(q)
    )
  })

  async function handleCreate(studentId: string, studentName: string) {
    setError(null)
    setCreatingId(studentId)

    const { data, error: invokeError } = await supabase.functions.invoke('create-parent-account', {
      body: { student_id: studentId },
    })

    setCreatingId(null)

    if (invokeError || !data || data.error) {
      setError(data?.error ?? invokeError?.message ?? 'Could not create parent account.')
      return
    }

    setCredentials({
      studentName,
      username: data.username,
      temporaryPassword: data.temporary_password,
    })
    onCreated()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
        {credentials ? (
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900">Parent Account Created</h3>
            <p className="mt-2 text-sm text-gray-600">
              For {credentials.studentName}'s parent. Share these credentials directly with them —
              they'll be asked to change the password on first login.
            </p>
            <div className="mt-4 space-y-2 rounded-lg bg-gray-50 p-4 text-left text-sm">
              <p>
                <span className="font-medium text-gray-700">Username:</span> {credentials.username}
              </p>
              <p>
                <span className="font-medium text-gray-700">Temporary Password:</span>{' '}
                {credentials.temporaryPassword}
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-6 w-full rounded-lg bg-gray-900 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Select a Student</h3>
              <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-900">
                Close
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Search by student name, parent name, or admission number.
            </p>

            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
            />

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            <div className="mt-3 max-h-80 overflow-y-auto rounded-lg border border-gray-100">
              {loading ? (
                <p className="p-4 text-sm text-gray-500">Loading students...</p>
              ) : filtered.length === 0 ? (
                <p className="p-4 text-sm text-gray-500">No students found.</p>
              ) : (
                filtered.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between border-b border-gray-100 px-4 py-3 last:border-b-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{s.full_name}</p>
                      <p className="text-xs text-gray-500">
                        {s.class_name} · Parent: {s.parent_name} · Adm No: {s.admission_number}
                      </p>
                    </div>
                    {s.parent_account_id ? (
                      <span className="text-xs text-gray-400">Already has an account</span>
                    ) : (
                      <button
                        onClick={() => handleCreate(s.id, s.full_name)}
                        disabled={creatingId === s.id}
                        className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                      >
                        {creatingId === s.id ? 'Creating...' : 'Create Account'}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
