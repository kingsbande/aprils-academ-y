import { FormEvent, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/logo.png'

export function Login() {
  const { signIn, session, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && session) {
    return <Navigate to="/admin" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error: signInError } = await signIn(email, password)

    setSubmitting(false)

    if (signInError) {
      setError('Invalid email or password.')
      return
    }

    navigate('/admin')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#0b2440] to-[#06202e] px-4">
      <div className="w-full max-w-sm">
        
        {/* Card container with anchor positioning */}
        <div className="relative mt-14 rounded-2xl bg-white/5 p-8 pt-16 shadow-lg border border-white/10 text-center">
          
          {/* Perfectly centered floating circular logo badge */}
          <div className="absolute -top-14 left-1/2 -translate-x-1/2 h-28 w-28 rounded-full bg-white p-2 border-2 border-white/20 shadow-xl flex items-center justify-center">
            <img 
              src={logo} 
              alt="Weise Beginning Logo" 
              className="h-full w-full object-contain rounded-full" 
            />
          </div>

          <h1 className="text-2xl font-semibold text-white">April's Academy</h1>
          <p className="mt-1 text-sm text-slate-200">Sign in to continue.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left">
            <div>
              <label className="block text-sm font-medium text-slate-200">Email/Username</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
                placeholder="admin@school.mw"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}