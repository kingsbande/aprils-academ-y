import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { StudentRegistrationForm } from '../components/StudentRegistrationForm'
import { StudentList } from '../components/StudentList'

export function AdminDashboard() {
  const { profile, signOut } = useAuth()
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-500">Student Registration</p>
          </div>
          <div className="flex items-center gap-4">
            {profile && <span className="text-sm text-gray-600">{profile.full_name}</span>}
            <button
              onClick={signOut}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <StudentRegistrationForm onRegistered={() => setRefreshKey((k) => k + 1)} />
        <StudentList refreshKey={refreshKey} />
      </main>
    </div>
  )
}
