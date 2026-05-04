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
  { label: 'System Logs', href: 'logs.html' },
]

const settingsLinks = [
  { label: 'Account Settings', href: 'profile.html' },
  { label: 'Return to Home', href: 'home.html' },
]

const modelVersions = [
  {
    version: 'v3.1 (Current)',
    algorithm: 'SVM + Hyper-param',
    accuracy: '92.1%',
    accuracyClass: 'status-high',
    trainedOn: '2025-10-01',
    deploymentStatus: 'Active (Live)',
    deploymentStyle: { color: 'var(--nexus-medium-green)', fontWeight: 600 },
    actions: ['view', 'revert'],
  },
  {
    version: 'v3.0',
    algorithm: 'SVM',
    accuracy: '89.5%',
    accuracyClass: 'status-medium',
    trainedOn: '2024-12-15',
    deploymentStatus: 'Archived',
    deploymentStyle: { color: '#e74c3c' },
    actions: ['view', 'deploy'],
  },
  {
    version: 'v2.5',
    algorithm: 'Random Forest',
    accuracy: '85.3%',
    accuracyClass: 'status-low',
    trainedOn: '2024-06-20',
    deploymentStatus: 'Archived',
    deploymentStyle: { color: '#e74c3c' },
    actions: ['view'],
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

function ActionIcon({ type }) {
  if (type === 'view') {
    return (
      <span className="edit-icon" title="View" aria-label="View">
        👁
      </span>
    )
  }

  if (type === 'revert') {
    return (
      <span className="delete-icon" title="Revert" aria-label="Revert">
        ↶
      </span>
    )
  }

  return (
    <span className="delete-icon" title="Deploy" aria-label="Deploy">
      ⬆
    </span>
  )
}

export default function ModelsPage() {
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
          <div className="welcome-message">Model Management and Deployment</div>
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
              <h2 className="card-title">Model Version History</h2>
              <button className="add-button" style={{ backgroundColor: '#f7b731' }} type="button">
                Retrain Model
              </button>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Algorithm</th>
                  <th>Accuracy (R2)</th>
                  <th>Trained On</th>
                  <th>Deployment Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {modelVersions.map((version) => (
                  <tr key={version.version}>
                    <td>{version.version}</td>
                    <td>{version.algorithm}</td>
                    <td className={version.accuracyClass}>{version.accuracy}</td>
                    <td>{version.trainedOn}</td>
                    <td style={version.deploymentStyle}>{version.deploymentStatus}</td>
                    <td>
                      {version.actions.map((action) => (
                        <ActionIcon key={action} type={action} />
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card grid-item-span-1">
            <div className="card-header">
              <h2 className="card-title">Current Model Health (v3.1)</h2>
            </div>
            <div className="project-status-item">
              <p>
                Data Freshness <span>98 days ago</span>
              </p>
            </div>
            <div className="project-status-item">
              <p>
                Prediction Latency <span style={{ color: 'var(--nexus-medium-green)' }}>~350 ms</span>
              </p>
            </div>
            <div className="project-status-item">
              <p>
                Required Inputs <span>5 / 5</span>
              </p>
            </div>
            <button className="submit-btn" style={{ width: '100%', marginTop: '15px' }} type="button">
              View Training Parameters
            </button>
          </div>

          <div className="card grid-item-span-2">
            <div className="card-header">
              <h2 className="card-title">Training Data Summary</h2>
            </div>
            <p>
              Total records: <strong>1,200</strong> yield observations across 8 municipalities.
            </p>
            <p>Last full training set upload: September 2025.</p>
            <div className="chart-placeholder" style={{ height: '100px' }}>
              [Data Distribution Chart]
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
