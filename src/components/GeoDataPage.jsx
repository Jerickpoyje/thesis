import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../assets/css/admin-style.css'
import { toAppRoute } from '../utils/navigation'

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
  { label: 'Return to Home', href: 'home.html' },
]

const amadeoBarangays = [
  {
    barangay: 'Banaybanay',
    elevation: 560,
    rainfall: 2010,
    status: 'Verified (v2.1)',
    statusClass: 'status-high',
    lastUpdate: '2025-09-12',
  },
  {
    barangay: 'Dagatan',
    elevation: 545,
    rainfall: 1985,
    status: 'Verified (v2.1)',
    statusClass: 'status-high',
    lastUpdate: '2025-09-12',
  },
  {
    barangay: 'Halang',
    elevation: 552,
    rainfall: 1998,
    status: 'Verified (v2.1)',
    statusClass: 'status-high',
    lastUpdate: '2025-09-12',
  },
]

function SidebarSection({ title, links, onNavigate }) {
  return (
    <>
      <h4>{title}</h4>
      <ul>
        {links.map((link) => (
          <li key={link.label} className={link.isActive ? 'active' : undefined}>
            <a
              href={link.href}
              className={link.isActive ? 'active' : undefined}
              onClick={(event) => onNavigate(event, link.href)}
            >
              <span>{link.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </>
  )
}

export default function GeoDataPage() {
  const navigate = useNavigate()
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
          <div className="welcome-message">Municipality Geographical Data Management</div>
          <div className="top-nav-right">
            <div className="search-bar">
              <input type="text" placeholder="Search..." />
            </div>
            <div className="top-nav-icons">
              <span className="icon" aria-hidden="true">
                🔔
              </span>
              <span className="icon" aria-hidden="true">
                ✉
              </span>
            </div>
            <div className="user-profile">
              <div className="avatar">AD</div>
              <span>Administrator</span>
            </div>
          </div>
        </div>

        <div className="dashboard-grid model-grid">
          <div className="card grid-item-span-3">
            <div className="card-header">
              <h2 className="card-title">Barangays in Amadeo</h2>
              <button className="add-button" style={{ backgroundColor: '#f7b731' }} type="button">
                Upload GeoJSON
              </button>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Barangay</th>
                  <th>Default Elevation (m)</th>
                  <th>Default Rainfall (mm)</th>
                  <th>Map Data Status</th>
                  <th>Last Update</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {amadeoBarangays.map((row) => (
                  <tr key={row.barangay}>
                    <td>{row.barangay}</td>
                    <td>{row.elevation}</td>
                    <td>{row.rainfall}</td>
                    <td className={row.statusClass}>{row.status}</td>
                    <td>{row.lastUpdate}</td>
                    <td>
                      <span className="edit-icon" aria-label="Map view" title="Map view">
                        🗺
                      </span>{' '}
                      <span className="edit-icon" aria-label="Edit" title="Edit">
                        ✎
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card grid-item-span-3">
            <div className="card-header">
              <h2 className="card-title">GeoJSON Map Viewer</h2>
            </div>
            <div className="chart-placeholder" style={{ height: '200px' }}>
              [Interactive Map Preview for Amadeo Barangays]
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
