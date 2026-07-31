import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { StudentRegistrationForm } from '../components/StudentRegistrationForm'
import { StudentList } from '../components/StudentList'
import { supabase } from '../lib/supabaseClient'

interface DashboardStats {
  totalStudents: number
  maleStudents: number
  femaleStudents: number
}

export function AdminDashboard() {
  const { profile, signOut } = useAuth()
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeView, setActiveView] = useState<'overview' | 'register' | 'students'>('overview')
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    maleStudents: 0,
    femaleStudents: 0,
  })

  useEffect(() => {
    supabase
      .from('students')
      .select('id, gender')
      .then(({ data, error }) => {
        if (!error && data) {
          const male = data.filter((student) => student.gender === 'male').length
          const female = data.filter((student) => student.gender === 'female').length

          setStats({
            totalStudents: data.length,
            maleStudents: male,
            femaleStudents: female,
          })
        }
      })
  }, [refreshKey])

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Admin Portal</p>
            <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            {profile && <span className="text-sm text-slate-600">{profile.full_name}</span>}
            <button
              onClick={signOut}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:px-8">
        <aside className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:w-72">
          <div className="mb-6">
            <p className="text-sm font-semibold text-slate-900">School Admin</p>
            <p className="text-sm text-slate-500">{profile?.school_name ?? 'Student management'}</p>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setActiveView('overview')}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                activeView === 'overview' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>Overview</span>
              <span className="text-xs">●</span>
            </button>
            <button
              onClick={() => setActiveView('register')}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                activeView === 'register' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>New Registration</span>
              <span className="text-xs">＋</span>
            </button>
            <button
              onClick={() => setActiveView('students')}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                activeView === 'students' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>Student Records</span>
              <span className="text-xs">▣</span>
            </button>
          </nav>
        </aside>

        <section className="flex-1 space-y-6">
          {activeView === 'overview' && (
            <>
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-600 to-slate-900 p-6 text-white shadow-sm">
                <p className="text-sm uppercase tracking-[0.2em] text-blue-100">Welcome back</p>
                <h2 className="mt-2 text-2xl font-semibold">{profile?.full_name ?? 'Admin'}</h2>
                <p className="mt-2 max-w-xl text-sm text-blue-50">
                  Manage registrations, review student records, and keep your school data up to date in one place.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">Total Students</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.totalStudents}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">Male Students</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.maleStudents}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">Female Students</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.femaleStudents}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Quick actions</h3>
                    <p className="text-sm text-slate-500">Jump straight into registration or review the student list.</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setActiveView('register')}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
                    >
                      Register student
                    </button>
                    <button
                      onClick={() => setActiveView('students')}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      View records
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeView === 'register' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <StudentRegistrationForm onRegistered={() => setRefreshKey((k) => k + 1)} />
            </div>
          )}

          {activeView === 'students' && <StudentList refreshKey={refreshKey} />}
        </section>
      </main>
    </div>
  )
}
