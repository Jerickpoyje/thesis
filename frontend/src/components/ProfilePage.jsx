import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import '../assets/css/admin-style.css'
import { getAdminAuthToken, getAdminAuthEmail } from '../utils/auth'
import { isSameAppRoute, toAppRoute } from '../utils/navigation'
import SidebarSection from './SidebarSection'

const FADE_DURATION_MS = 500
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const quickLinks = [
  { label: 'Predictive Map', href: 'admin.html?view=map' },
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

function ProfilePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [fullName, setFullName] = useState('Administrator')
  const [email, setEmail] = useState(getAdminAuthEmail() || 'admin@nexus-coffee.ph')
  const [role, setRole] = useState('System Administrator')
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const timeoutRef = useRef(null)

  useEffect(() => {
    const loadProfile = async () => {
      const token = getAdminAuthToken()
      if (!token) return

      try {
        const res = await fetch(`${API_BASE}/admin/account/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!res.ok) {
          return
        }

        const data = await res.json()
        const profile = data.profile || {}
        setFullName(profile.full_name || '')
        setEmail(profile.email || getAdminAuthEmail())
        setRole(profile.role || 'System Administrator')
      } catch {
        // Ignore — profile page still renders with defaults
      }
    }

    loadProfile()

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

  const handleProfileSubmit = async (event) => {
    event.preventDefault()
    setProfileError('')
    setProfileSuccess('')

    if (!fullName.trim()) {
      setProfileError('Full name is required.')
      return
    }

    const token = getAdminAuthToken()
    if (!token) {
      setProfileError('Your session has expired. Please sign in again.')
      return
    }

    try {
      const res = await fetch(`${API_BASE}/admin/account/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ full_name: fullName.trim() }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || 'Unable to update profile.')
      }

      setProfileSuccess('Profile updated successfully.')
    } catch (error) {
      setProfileError(error.message || 'Unable to update profile.')
    }
  }

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (!currentPass || !newPass || !confirmPass) {
      setPasswordError('Please fill in all password fields.')
      return
    }

    if (newPass !== confirmPass) {
      setPasswordError('New passwords do not match.')
      return
    }

    if (newPass.length < 8) {
      setPasswordError('Password must be at least 8 characters.')
      return
    }

    const token = getAdminAuthToken()
    if (!token) {
      setPasswordError('Your session has expired. Please sign in again.')
      return
    }

    try {
      const res = await fetch(`${API_BASE}/admin/account/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: currentPass,
          newPassword: newPass,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || 'Unable to change password.')
      }

      setPasswordSuccess('Password updated successfully.')
      setCurrentPass('')
      setNewPass('')
      setConfirmPass('')
    } catch (error) {
      setPasswordError(error.message || 'Unable to change password.')
    }
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

            <form className="soil-form" onSubmit={handleProfileSubmit}>
              <div className="form-group">
                <label htmlFor="fullName">Full Name</label>
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input type="email" id="email" value={email} disabled />
              </div>

              <div className="form-group">
                <label htmlFor="role">System Role</label>
                <input type="text" id="role" value={role} disabled />
              </div>

              {profileError && <p className="form-error">{profileError}</p>}
              {profileSuccess && <p className="form-success">{profileSuccess}</p>}

              <button type="submit" className="submit-btn">
                Update Profile
              </button>
            </form>
          </div>

          <div className="card grid-item-span-2">
            <div className="card-header">
              <h2 className="card-title">Change Password</h2>
            </div>

            <form className="soil-form" onSubmit={handlePasswordSubmit}>
              <div className="form-group">
                <label htmlFor="currentPass">Current Password</label>
                <input
                  type="password"
                  id="currentPass"
                  value={currentPass}
                  onChange={(event) => setCurrentPass(event.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="newPass">New Password</label>
                <input
                  type="password"
                  id="newPass"
                  value={newPass}
                  onChange={(event) => setNewPass(event.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPass">Confirm New Password</label>
                <input
                  type="password"
                  id="confirmPass"
                  value={confirmPass}
                  onChange={(event) => setConfirmPass(event.target.value)}
                  required
                />
              </div>

              {passwordError && <p className="form-error">{passwordError}</p>}
              {passwordSuccess && <p className="form-success">{passwordSuccess}</p>}

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

export default ProfilePage
