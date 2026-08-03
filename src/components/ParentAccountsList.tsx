import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ParentAccount } from '../types'
import { SearchBar } from './SearchBar'
import { CreateParentAccountModal } from './CreateParentAccountModal'

export function ParentAccountsList() {
  const [accounts, setAccounts] = useState<ParentAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState<{ username: string; password: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  function fetchAccounts() {
    setLoading(true)
    supabase
      .from('parent_accounts')
      .select('id, school_id, full_name, username, phone, is_active, must_change_password, created_at')
      .order('created_at', { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (!fetchError && data) setAccounts(data as ParentAccount[])
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  const filtered = accounts.filter((a) => {
    const q = search.trim().toLowerCase()
    if (q === '') return true
    return (
      a.full_name.toLowerCase().includes(q) ||
      a.username.toLowerCase().includes(q) ||
      (a.phone ?? '').toLowerCase().includes(q)
    )
  })

  async function handleResetPassword(account: ParentAccount) {
    setError(null)
    setBusyId(account.id)

    const { data, error: invokeError } = await supabase.functions.invoke('reset-parent-password', {
      body: { parent_account_id: account.id },
    })

    setBusyId(null)

    if (invokeError || !data || data.error) {
      setError(data?.error ?? invokeError?.message ?? 'Could not reset password.')
      return
    }

    setNewPassword({ username: account.username, password: data.temporary_password })
    fetchAccounts()
  }

  async function handleToggleStatus(account: ParentAccount) {
    setError(null)
    setBusyId(account.id)

    const { data, error: invokeError } = await supabase.functions.invoke(
      'toggle-parent-account-status',
      {
        body: { parent_account_id: account.id, activate: !account.is_active },
      },
    )

    setBusyId(null)

    if (invokeError || !data || data.error) {
      setError(data?.error ?? invokeError?.message ?? 'Could not update account status.')
      return
    }

    fetchAccounts()
  }

  async function handleDelete(account: ParentAccount) {
    const confirmed = window.confirm(
      `Permanently delete the login for ${account.full_name} (${account.username})? This cannot be undone.`,
    )
    if (!confirmed) return

    setError(null)
    setBusyId(account.id)

    const { data, error: invokeError } = await supabase.functions.invoke('delete-parent-account', {
      body: { parent_account_id: account.id },
    })

    setBusyId(null)

    if (invokeError || !data || data.error) {
      setError(data?.error ?? invokeError?.message ?? 'Could not delete account.')
      return
    }

    fetchAccounts()
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Parent Accounts</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name, username, or phone..." />
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Create Parent Account
          </button>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500">Loading parent accounts...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500">No parent accounts found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Username</th>
                <th className="py-2 pr-4">Phone</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-gray-100">
                  <td className="py-2 pr-4">{a.full_name}</td>
                  <td className="py-2 pr-4">{a.username}</td>
                  <td className="py-2 pr-4">{a.phone ?? '-'}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={
                        a.is_active
                          ? 'rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700'
                          : 'rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500'
                      }
                    >
                      {a.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => handleResetPassword(a)}
                        disabled={busyId === a.id}
                        className="text-xs font-medium text-blue-600 underline hover:text-blue-800 disabled:opacity-50"
                      >
                        Reset Password
                      </button>
                      <button
                        onClick={() => handleToggleStatus(a)}
                        disabled={busyId === a.id}
                        className="text-xs font-medium text-amber-600 underline hover:text-amber-800 disabled:opacity-50"
                      >
                        {a.is_active ? 'Deactivate' : 'Reactivate'}
                      </button>
                      <button
                        onClick={() => handleDelete(a)}
                        disabled={busyId === a.id}
                        className="text-xs font-medium text-red-600 underline hover:text-red-800 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <CreateParentAccountModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => fetchAccounts()}
        />
      )}

      {newPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900">Password Reset</h3>
            <p className="mt-2 text-sm text-gray-600">
              Share this new temporary password with {newPassword.username} directly.
            </p>
            <div className="mt-4 rounded-lg bg-gray-50 p-4 text-sm">
              <p>
                <span className="font-medium text-gray-700">Temporary Password:</span>{' '}
                {newPassword.password}
              </p>
            </div>
            <button
              onClick={() => setNewPassword(null)}
              className="mt-6 w-full rounded-lg bg-gray-900 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
