import { Routes, Route, Navigate } from 'react-router-dom'
import PrivateRoute from './auth/PrivateRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Generator from './pages/Generator'
import Templates from './pages/Templates'
import Library from './pages/Library'
import History from './pages/History'

export default function App() {
  return (
    <Routes>
      {/* public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* protected — wrapped by the app shell (sidebar + topbar) */}
      <Route
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/generate" element={<Generator />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/library" element={<Library />} />
        <Route path="/history" element={<History />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
