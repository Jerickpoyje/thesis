import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AboutPage from './components/AboutPage'
import AdminPage from './components/AdminPage'
import ContactPage from './components/ContactPage.jsx'
import DataGeneratePage from './components/DataGeneratePage'
import GeoDataPage from './components/GeoDataPage'
import HomePage from './components/HomePage'
import IndexPage from './components/IndexPage'
import LoginRegisterPage from './components/LoginRegisterPage'
import ModelsPage from './components/ModelsPage'
import ProfilePage from './components/ProfilePage'
import ReportsPage from './components/ReportsPage'
import SoilTypesPage from './components/SoilTypesPage'
import UsersPage from './components/UsersPage'
import VisualizationsPage from './components/VisualizationsPage'
import { isAdminAuthenticated } from './utils/auth'

function AdminProtectedRoute({ children }) {
  const location = useLocation()

  if (!isAdminAuthenticated()) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}`)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }

  return children
}

export default function App() {
  const location = useLocation()
  
  const isAdminPage = location.pathname.startsWith('/admin') || 
                      location.pathname.startsWith('/data-generate') ||
                      location.pathname.startsWith('/users') ||
                      location.pathname.startsWith('/reports') ||
                      location.pathname.startsWith('/models') ||
                      location.pathname.startsWith('/visualizations') ||
                      location.pathname.startsWith('/profile') ||
                      location.pathname.startsWith('/soil-types') ||
                      location.pathname.startsWith('/geo-data')

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />

        <Route path="/home" element={<HomePage />} />
        <Route path="/home.html" element={<Navigate to="/home" replace />} />

        <Route path="/about" element={<AboutPage />} />
        <Route path="/about.html" element={<Navigate to="/about" replace />} />

        <Route path="/contact" element={<ContactPage />} />
        <Route path="/contact.html" element={<Navigate to="/contact" replace />} />

        <Route path="/predictive-map" element={<IndexPage />} />
        <Route path="/index.html" element={<Navigate to="/predictive-map" replace />} />

        <Route path="/login" element={<LoginRegisterPage />} />
        <Route path="/login_register.html" element={<Navigate to="/login" replace />} />

        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <AdminPage />
            </AdminProtectedRoute>
          }
        />
        <Route path="/admin.html" element={<Navigate to="/admin" replace />} />

      <Route
        path="/data-generate"
        element={
          <AdminProtectedRoute>
            <DataGeneratePage />
          </AdminProtectedRoute>
        }
      />
      <Route path="/data-generate.html" element={<Navigate to="/data-generate" replace />} />

      <Route
        path="/models"
        element={
          <AdminProtectedRoute>
            <ModelsPage />
          </AdminProtectedRoute>
        }
      />
      <Route path="/models.html" element={<Navigate to="/models" replace />} />

      <Route
        path="/users"
        element={
          <AdminProtectedRoute>
            <UsersPage />
          </AdminProtectedRoute>
        }
      />
      <Route path="/users.html" element={<Navigate to="/users" replace />} />

      <Route
        path="/reports"
        element={
          <AdminProtectedRoute>
            <ReportsPage />
          </AdminProtectedRoute>
        }
      />
      <Route path="/reports.html" element={<Navigate to="/reports" replace />} />

      <Route
        path="/soil-types"
        element={
          <AdminProtectedRoute>
            <SoilTypesPage />
          </AdminProtectedRoute>
        }
      />
      <Route path="/soil-types.html" element={<Navigate to="/soil-types" replace />} />

      <Route
        path="/geo-data"
        element={
          <AdminProtectedRoute>
            <GeoDataPage />
          </AdminProtectedRoute>
        }
      />
      <Route path="/geo-data.html" element={<Navigate to="/geo-data" replace />} />

      <Route
        path="/visualizations"
        element={
          <AdminProtectedRoute>
            <VisualizationsPage />
          </AdminProtectedRoute>
        }
      />
      <Route path="/visualizations.html" element={<Navigate to="/visualizations" replace />} />
      <Route path="/logs" element={<Navigate to="/visualizations" replace />} />
      <Route path="/logs.html" element={<Navigate to="/visualizations" replace />} />

      <Route
        path="/profile"
        element={
          <AdminProtectedRoute>
            <ProfilePage />
          </AdminProtectedRoute>
        }
      />
      <Route path="/profile.html" element={<Navigate to="/profile" replace />} />

      <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </>
  )
}
