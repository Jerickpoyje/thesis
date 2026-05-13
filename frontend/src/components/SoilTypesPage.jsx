import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import '../assets/css/admin-style.css'
import { isSameAppRoute, toAppRoute } from '../utils/navigation'
import SidebarSection from './SidebarSection'

const FADE_DURATION_MS = 500

const quickLinks = [
  { label: 'Predictive Map', href: 'Index.html' },
  { label: 'Analytics Dashboard', href: 'admin.html' },
  { label: 'User Requests', href: 'users.html' },
  { label: 'Generate Reports', href: 'reports.html' },
]

const dataTableLinks = [
  { label: 'Prediction Visualizations', href: 'visualizations.html' },
  { label: 'Data Generate', href: 'data-generate.html' },
]

const settingsLinks = [
  { label: 'Account Settings', href: 'profile.html' },
]

const soilRegistry = [
  {
    id: 'S001',
    name: 'Clay Loam',
    moisture: 'High',
    phRange: '5.5 - 6.5',
    modelWeight: '0.45',
    modelWeightClass: 'status-high',
  },
  {
    id: 'S002',
    name: 'Sandy Loam',
    moisture: 'Low',
    phRange: '6.0 - 7.0',
    modelWeight: '0.25',
    modelWeightClass: 'status-medium',
  },
  {
    id: 'S003',
    name: 'Volcanic Ash',
    moisture: 'Medium',
    phRange: '5.0 - 6.0',
    modelWeight: '0.50',
    modelWeightClass: 'status-high',
  },
]

export default function SoilTypesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isFadingOut, setIsFadingOut] = useState(false)
  const timeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleSidebarNavigation = (event, href) => {
    const targetRoute = toAppRoute(href)
    if (!targetRoute) {
      event.preventDefault()
      return
    }

    if (isSameAppRoute(location, targetRoute)) {
      event.preventDefault()
      return
    }

    event.preventDefault()
    setIsFadingOut(true)

    timeoutRef.current = window.setTimeout(() => {
      navigate(targetRoute)
    }, FADE_DURATION_MS)
  }

  return (
    <div className={`admin-dashboard-body${isFadingOut ? ' fade-out' : ''}`}>
      <div className="sidebar">
        <div className="logo-container">
          <span className="logo-icon">🌱</span>
          <span className="logo-text">Coffee Prediction Analysis</span>
        </div>

        <nav className="sidebar-nav" aria-label="Sidebar navigation">
          <SidebarSection title="Quick Links" links={quickLinks} onNavigate={handleSidebarNavigation} />
          <SidebarSection title="Data Tables" links={dataTableLinks} onNavigate={handleSidebarNavigation} />
          <SidebarSection title="Settings" links={settingsLinks} onNavigate={handleSidebarNavigation} />
        </nav>
      </div>

      <div className="main-content">
        <div className="top-nav">
          <div className="welcome-message">Manage Soil Type Parameters</div>
        </div>

        <div className="dashboard-grid soil-grid-layout">
          <div className="card soil-table-card">
            <div className="card-header">
              <h2 className="card-title">Cavite Upland Soil Registry</h2>
              <button className="add-button" type="button">
                Add New Soil Type
              </button>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Key Parameter (Moisture)</th>
                  <th>Optimal pH Range</th>
                  <th>Model Weight</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {soilRegistry.map((soil) => (
                  <tr key={soil.id}>
                    <td>{soil.id}</td>
                    <td>{soil.name}</td>
                    <td>{soil.moisture}</td>
                    <td>{soil.phRange}</td>
                    <td className={soil.modelWeightClass}>{soil.modelWeight}</td>
                    <td>
                      <span className="edit-icon" title="Edit" aria-label="Edit">
                        ✎
                      </span>{' '}
                      <span className="delete-icon" title="Delete" aria-label="Delete">
                        🗑
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Soil Parameter Definition</h2>
            </div>
            <p style={{ fontSize: '0.9em' }}>
              Define the quantitative properties that influence the predictive model output for each
              soil type.
            </p>
            <div className="chart-placeholder" style={{ height: '120px' }}>
              [Soil Property Visualization/Form]
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
