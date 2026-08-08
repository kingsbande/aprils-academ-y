import { ChangeEvent, FormEvent, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { uploadStudentPhoto } from '../lib/cloudinary'
import { fetchClasses } from '../lib/queries'
import { generateRegistrationConfirmationPdf } from '../lib/pdf'
import { useAuth } from '../context/AuthContext'
import { NewStudentInput } from '../types'

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
  government_code: '',
  photo_url: null,
}

interface StudentRegistrationFormProps {
  // Optional — the form invalidates the shared ['students'] query
  // itself, so this fires even if Registration and Records live in
  // separate sections/routes with no shared parent state.
  onRegistered?: () => void
}

export function StudentRegistrationForm({ onRegistered }: StudentRegistrationFormProps = {}) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: fetchClasses })
  const [form, setForm] = useState<NewStudentInput>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<{ studentName: string; admissionNumber: string } | null>(
    null,
  )
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [stepError, setStepError] = useState<string | null>(null)

  function validateStepAt(index: number): string | null {
    switch (index) {
      case 0: {
        if (!form.full_name?.trim()) return 'Please enter the student full name.'
        if (!form.date_of_birth) return 'Please enter the student date of birth.'
        if (!form.class_id) return 'Please select a class.'
        if (!form.academic_year?.trim()) return 'Please enter the academic year.'
        if (!form.date_joined) return 'Please enter the date joined.'
        return null
      }
      case 1: {
        if (!form.parent_name?.trim()) return 'Please enter the parent/guardian name.'
        if (!form.parent_phone?.trim()) return 'Please enter the parent/guardian phone.'
        return null
      }
      case 2: {
        // optional fields; no required validation here
        return null
      }
      case 3: {
        if (!form.address?.trim()) return 'Please enter the full address.'
        return null
      }
      default:
        return null
    }
  }

  function validateAll() {
    for (let i = 0; i < TABS.length; i++) {
      const msg = validateStepAt(i)
      if (msg) return { stepIndex: i, message: msg }
    }
    return null
  }

  // Navigation guard removed during development — allow free tab clicks
  const [step, setStep] = useState(0)

  const TABS = [
    { id: 'student', title: 'Student' },
    { id: 'parents', title: 'Parent / Pickup' },
    { id: 'school', title: 'School' },
    { id: 'health', title: 'Health & Address' },
  ]

  function updateField<K extends keyof NewStudentInput>(key: K, value: NewStudentInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setPhotoFile(file)
    setPhotoPreview(file ? URL.createObjectURL(file) : null)
  }

  function generateAdmissionNumber() {
    const year = new Date().getFullYear()
    const random = Math.floor(1000 + Math.random() * 9000)
    return `${year}-${random}`
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setStepError(null)

    const all = validateAll()
    if (all) {
      setStep(all.stepIndex)
      setStepError(all.message)
      return
    }

    setSubmitting(true)

    if (!profile) {
      setSubmitting(false)
      setError('Could not determine your school. Please sign in again.')
      return
    }

    let photo_url: string | null = null
    if (photoFile) {
      setUploadingPhoto(true)
      try {
        photo_url = await uploadStudentPhoto(photoFile)
      } catch (uploadErr) {
        setUploadingPhoto(false)
        setSubmitting(false)
        setError(uploadErr instanceof Error ? uploadErr.message : 'Photo upload failed.')
        return
      }
      setUploadingPhoto(false)
    }

    const admission_number = generateAdmissionNumber()

    const { data: inserted, error: insertError } = await supabase
      .from('students')
      .insert({
        ...form,
        admission_number,
        age: form.age === '' ? null : form.age,
        school_id: profile.school_id,
        photo_url,
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
    setPhotoFile(null)
    setPhotoPreview(null)
    queryClient.invalidateQueries({ queryKey: ['students'] })
    onRegistered?.()
  }

  async function downloadConfirmationPdf() {
    if (!confirmation) return

    await generateRegistrationConfirmationPdf({
      schoolName: profile?.school_name ?? 'the school',
      logoUrl: profile?.school_logo_url ?? null,
      studentName: confirmation.studentName,
      admissionNumber: confirmation.admissionNumber,
      registrationDate: new Date().toLocaleDateString(),
      termsAndConditions: profile?.school_registration_terms ?? null,
    })
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Register a Student</h2>

        <div className="flex gap-2 border-b pb-3">
          {TABS.map((t, i) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setStep(i)
                setStepError(null)
              }}
              className={`px-3 py-1 text-sm font-medium ${i === step ? 'border-b-2 border-rose-600 text-rose-600' : 'text-gray-600 hover:text-gray-900'}`}
            >
              {t.title}
            </button>
          ))}
        </div>

        {/* Step content */}
        {step === 0 && (
          <div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Student Photo</label>
              <div className="mt-1 flex items-center gap-4">
                {photoPreview && (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="h-16 w-16 rounded-full object-cover border border-gray-200"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="block text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-gray-800"
                />
              </div>
              {uploadingPhoto && <p className="mt-1 text-xs text-gray-500">Uploading photo...</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
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
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <label className="block text-sm font-medium text-gray-700">Government Code</label>
              <input
                value={form.government_code}
                onChange={(e) => updateField('government_code', e.target.value)}
                placeholder="Optional"
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
        )}

        {step === 3 && (
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
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-end gap-3">
            {stepError && <p className="text-sm text-red-600">{stepError}</p>}
            {step > 0 && (
              <button
                type="button"
                onClick={() => {
                  setStep((s) => Math.max(s - 1, 0))
                  setStepError(null)
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
            )}

            {step < TABS.length - 1 ? (
              <button
                type="button"
                onClick={() => {
                  const msg = validateStepAt(step)
                  if (msg) {
                    setStepError(msg)
                    return
                  }
                  setStep((s) => Math.min(s + 1, TABS.length - 1))
                  setStepError(null)
                }}
                disabled={uploadingPhoto || submitting}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-50"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting || uploadingPhoto}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {submitting ? 'Registering...' : 'Register Student'}
              </button>
            )}
        </div>
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
