import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ParentAuthProvider } from './context/ParentAuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ParentProtectedRoute } from './components/parent/ParentProtectedRoute'
import { Login } from './pages/Login'
import { AdminDashboard } from './pages/AdminDashboard'
import { ParentAccounts } from './pages/ParentAccounts'
import { Grades } from './pages/Grades'
import { ForceChangePassword } from './pages/parent/ForceChangePassword'
import { ParentDashboard } from './pages/parent/ParentDashboard'

function ParentLayout() {
  return (
    <ParentAuthProvider>
      <Outlet />
    </ParentAuthProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/parent/login" element={<Login />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/parent-accounts"
            element={
              <ProtectedRoute>
                <ParentAccounts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/grades"
            element={
              <ProtectedRoute>
                <Grades />
              </ProtectedRoute>
            }
          />

          <Route element={<ParentLayout />}>
            <Route path="/parent/change-password" element={<ForceChangePassword />} />
            <Route
              path="/parent"
              element={
                <ParentProtectedRoute>
                  <ParentDashboard />
                </ParentProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
