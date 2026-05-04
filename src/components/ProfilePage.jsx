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
  { label: 'System Logs', href: 'logs.html' },
]

const settingsLinks = [
  { label: 'Account Settings', href: 'profile.html', isActive: true },
  { label: 'Return to Home', href: 'home.html' },
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

export default function ProfilePage() {
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

  const handleSubmit = (event) => {
    event.preventDefault()
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
          <div className="welcome-message">Manage Administrator Profile and Security</div>
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

        <div className="dashboard-grid profile-grid">
          <div className="card grid-item-span-2">
            <div className="card-header">
              <h2 className="card-title">Profile Information</h2>
            </div>

            <form className="soil-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="fullName">Full Name</label>
                <input type="text" id="fullName" defaultValue="Administrator" required />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input type="email" id="email" defaultValue="admin@nexus-coffee.ph" required />
              </div>

              <div className="form-group">
                <label htmlFor="role">System Role</label>
                <input type="text" id="role" defaultValue="System Administrator" disabled />
              </div>

              <button type="submit" className="submit-btn">
                Update Profile
              </button>
            </form>
          </div>

          <div className="card grid-item-span-2">
            <div className="card-header">
              <h2 className="card-title">Change Password</h2>
            </div>

            <form className="soil-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="currentPass">Current Password</label>
                <input type="password" id="currentPass" required />
              </div>

              <div className="form-group">
                <label htmlFor="newPass">New Password</label>
                <input type="password" id="newPass" required />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPass">Confirm New Password</label>
                <input type="password" id="confirmPass" required />
              </div>

              <button type="submit" className="submit-btn" style={{ backgroundColor: '#e74c3c' }}>
                Change Password
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
