import { FormEvent, useEffect, useState } from 'react'
import { jsPDF } from 'jspdf'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { ClassRoom, NewStudentInput } from '../types'

function defaultAcademicYear() {
  return String(new Date().getFullYear())
}

function defaultDateJoined() {
  return new Date().toISOString().slice(0, 10)
}

const emptyForm: NewStudentInput = {
  full_name: '',
  date_of_birth: '',
  age: '',
  gender: 'male',
  class_id: '',
  parent_name: '',
  parent_phone: '',
  parent_occupation: '',
  health_notes: '',
  former_school: '',
  pickup_person: '',
  location: '',
  address: '',
  academic_year: defaultAcademicYear(),
  date_joined: defaultDateJoined(),
}

interface StudentRegistrationFormProps {
  onRegistered: () => void
}

export function StudentRegistrationForm({ onRegistered }: StudentRegistrationFormProps) {
  const { profile } = useAuth()
  const [classes, setClasses] = useState<ClassRoom[]>([])
  const [form, setForm] = useState<NewStudentInput>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<{ studentName: string; admissionNumber: string } | null>(
    null,
  )

  useEffect(() => {
    supabase
      .from('classes')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        if (data) setClasses(data as ClassRoom[])
      })
  }, [])

  function updateField<K extends keyof NewStudentInput>(key: K, value: NewStudentInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function generateAdmissionNumber() {
    const year = new Date().getFullYear()
    const random = Math.floor(1000 + Math.random() * 9000)
    return `${year}-${random}`
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    if (!profile) {
      setSubmitting(false)
      setError('Could not determine your school. Please sign in again.')
      return
    }

    const admission_number = generateAdmissionNumber()

    const { data: inserted, error: insertError } = await supabase
      .from('students')
      .insert({
        ...form,
        admission_number,
        age: form.age === '' ? null : form.age,
        school_id: profile.school_id,
      })
      .select('id, admission_number, full_name')
      .single()

    if (insertError || !inserted) {
      setSubmitting(false)
      setError(insertError?.message ?? 'Could not register student.')
      return
    }

    const className = classes.find((c) => c.id === form.class_id)?.name ?? ''

    // Fire-and-forget notification call: registration has already
    // succeeded, so a notify failure shouldn't block the admin.
    supabase.functions
      .invoke('notify-registration', {
        body: {
          student_id: inserted.id,
          full_name: inserted.full_name,
          admission_number: inserted.admission_number,
          class_name: className,
          parent_name: form.parent_name,
          parent_phone: form.parent_phone,
        },
      })
      .catch((err) => console.error('Notification call failed:', err))

    setSubmitting(false)
    setConfirmation({ studentName: inserted.full_name, admissionNumber: inserted.admission_number })
    setForm({ ...emptyForm, academic_year: defaultAcademicYear(), date_joined: defaultDateJoined() })
    onRegistered()
  }

  function downloadConfirmationPdf() {
    if (!confirmation) return

    const schoolName = profile?.school_name ?? 'the school'
    const doc = new jsPDF()

    doc.setFontSize(16)
    doc.text('Registration Confirmation', 20, 25)

    doc.setFontSize(12)
    const message = `Thank you for joining ${schoolName}, ${confirmation.studentName} has been registered successfully.`
    const wrapped = doc.splitTextToSize(message, 170)
    doc.text(wrapped, 20, 45)

    doc.setFontSize(10)
    doc.text(`Admission Number: ${confirmation.admissionNumber}`, 20, 70)
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 78)

    doc.save(`${confirmation.studentName.replace(/\s+/g, '_')}_registration_confirmation.pdf`)
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900">Register a Student</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Full Name</label>
          <input
            required
            value={form.full_name}
            onChange={(e) => updateField('full_name', e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
          <input
            type="date"
            required
            value={form.date_of_birth}
            onChange={(e) => updateField('date_of_birth', e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Age</label>
          <input
            type="number"
            min={0}
            max={25}
            value={form.age}
            onChange={(e) => updateField('age', e.target.value === '' ? '' : Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Gender</label>
          <select
            value={form.gender}
            onChange={(e) => updateField('gender', e.target.value as 'male' | 'female')}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Class</label>
          <select
            required
            value={form.class_id}
            onChange={(e) => updateField('class_id', e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          >
            <option value="" disabled>
              Select a class
            </option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Academic Year</label>
          <input
            required
            value={form.academic_year}
            onChange={(e) => updateField('academic_year', e.target.value)}
            placeholder="2026"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Date Joined</label>
          <input
            type="date"
            required
            value={form.date_joined}
            onChange={(e) => updateField('date_joined', e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Former School</label>
          <input
            value={form.former_school}
            onChange={(e) => updateField('former_school', e.target.value)}
            placeholder="Leave blank if none"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Parent/Guardian Name</label>
          <input
            required
            value={form.parent_name}
            onChange={(e) => updateField('parent_name', e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Parent/Guardian Phone</label>
          <input
            required
            type="tel"
            placeholder="+265..."
            value={form.parent_phone}
            onChange={(e) => updateField('parent_phone', e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Parent/Guardian Occupation</label>
          <input
            value={form.parent_occupation}
            onChange={(e) => updateField('parent_occupation', e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Authorized Pickup Person</label>
          <input
            value={form.pickup_person}
            onChange={(e) => updateField('pickup_person', e.target.value)}
            placeholder="If different from parent/guardian"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Location (Village/Township)</label>
          <input
            value={form.location}
            onChange={(e) => updateField('location', e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Full Address</label>
          <textarea
            value={form.address}
            onChange={(e) => updateField('address', e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Sickness / Disease / Allergies
          </label>
          <textarea
            value={form.health_notes}
            onChange={(e) => updateField('health_notes', e.target.value)}
            rows={2}
            placeholder="Leave blank if none"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {submitting ? 'Registering...' : 'Register Student'}
      </button>
      </form>

      {confirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900">Registration Successful</h3>
            <p className="mt-3 text-sm text-gray-700">
              Thank you for joining {profile?.school_name ?? 'the school'},{' '}
              <span className="font-medium">{confirmation.studentName}</span> has been registered
              successfully.
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={downloadConfirmationPdf}
                className="rounded-lg bg-gray-900 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Download as PDF
              </button>
              <button
                onClick={() => setConfirmation(null)}
                className="rounded-lg border border-gray-300 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
