import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        Checking your access...
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        You do not have access to this page.
      </div>
    )
  }

  return <>{children}</>
}
