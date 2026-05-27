import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './layouts/AppLayout'
import AuthLayout from './layouts/AuthLayout'
import Dashboard from './pages/Dashboard'
import Finance from './pages/Finance'
import Guardian from './pages/Guardian'
import Habits from './pages/Habits'
import Health from './pages/Health'
import Journal from './pages/Journal'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Prayer from './pages/Prayer'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Signup from './pages/Signup'
import Sleep from './pages/Sleep'

export default function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/health" element={<Health />} />
          <Route path="/sleep" element={<Sleep />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/prayer" element={<Prayer />} />
          <Route path="/guardian" element={<Guardian />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="/" element={<Landing />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
