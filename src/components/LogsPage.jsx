import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../assets/css/admin-style.css'
import { toAppRoute } from '../utils/navigation'

const FADE_DURATION_MS = 500

const quickLinks = [
  { label: 'Predictive Map', href: 'Index.html' },
  { label: 'Analytics Dashboard', href: 'admin.html' },
  { label: 'Content Management', href: 'cms.html' },
  { label: 'User Requests', href: 'users.html' },
  { label: 'Generate Reports', href: 'reports.html' },
]

const dataTableLinks = [
  { label: 'System Logs', href: 'logs.html', isActive: true },
]

const settingsLinks = [
  { label: 'Account Settings', href: 'profile.html' },
  { label: 'Return to Home', href: 'Index.html' },
]

const predictionRunLogs = [
  {
    dateTime: '2025-10-15 11:45',
    user: 'Admin',
    modelVersion: 'v3.1',
    area: 'Tagaytay',
    result: '61,000',
    status: 'Success',
    statusClass: 'status-high',
  },
  {
    dateTime: '2025-10-14 10:30',
    user: 'Analyst 1',
    modelVersion: 'v3.1',
    area: 'Alfonso',
    result: '88,200',
    status: 'Success',
    statusClass: 'status-high',
  },
  {
    dateTime: '2025-10-13 15:45',
    user: 'Analyst 1',
    modelVersion: 'v3.0',
    area: 'Indang',
    result: '32,100',
    status: 'Success (Old Model)',
    statusClass: 'status-medium',
  },
  {
    dateTime: '2025-10-13 11:00',
    user: 'System',
    modelVersion: 'v3.1',
    area: 'Global Check',
    result: 'N/A',
    status: 'Error: API Timeout',
    statusClass: 'status-low',
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

export default function LogsPage() {
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
          <div className="welcome-message">Model Prediction History and System Logs</div>
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

        <div className="dashboard-grid logs-grid">
          <div className="card grid-item-span-3">
            <div className="card-header">
              <h2 className="card-title">Prediction Run Log</h2>
              <div className="top-nav-icons" style={{ color: 'var(--nexus-text-dark)' }}>
                <span className="icon" aria-label="Filter" title="Filter">
                  ⚲
                </span>
                <span className="icon" aria-label="Download" title="Download">
                  ⬇
                </span>
              </div>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Date/Time</th>
                  <th>User</th>
                  <th>Model Version</th>
                  <th>Area</th>
                  <th>Result (kg)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {predictionRunLogs.map((log) => (
                  <tr key={`${log.dateTime}-${log.user}-${log.area}`}>
                    <td>{log.dateTime}</td>
                    <td>{log.user}</td>
                    <td>{log.modelVersion}</td>
                    <td>{log.area}</td>
                    <td>{log.result}</td>
                    <td className={log.statusClass}>{log.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
