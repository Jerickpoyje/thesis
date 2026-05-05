import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../assets/css/admin-style.css'
import { toAppRoute } from '../utils/navigation'

const FADE_DURATION_MS = 500
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const quickLinks = [
  { label: 'Predictive Map', href: 'admin.html?view=map' },
  { label: 'Analytics Dashboard', href: 'admin.html' },
  { label: 'User Requests', href: 'users.html', isActive: true },
  { label: 'Generate Reports', href: 'reports.html' },
]

const dataTableLinks = [
  { label: 'Prediction Visualizations', href: 'visualizations.html' },
  { label: 'Data Generate', href: 'data-generate.html' },
]

const settingsLinks = [
  { label: 'Return to Home', href: 'home.html' }
]

const MEETING_REQUESTS_KEY = 'fitsMeetingRequests'

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

export default function UsersPage() {
  const navigate = useNavigate()
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [meetingRequests, setMeetingRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const timeoutRef = useRef(null)

  const loadMeetingRequests = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/meeting-requests`)
      if (response.ok) {
        const data = await response.json()
        // Convert snake_case to camelCase
        const converted = (data.requests || []).map(r => ({
          id: r.id,
          fullName: r.full_name,
          contactNumber: r.contact_number,
          email: r.email,
          preferredDate: r.preferred_date,
          preferredTime: r.preferred_time,
          topic: r.topic,
          topicOther: r.topic_other,
          details: r.details,
          createdAt: r.created_at,
          status: r.status || 'pending',
        }))
        setMeetingRequests(converted)
      } else {
        // Fallback to localStorage if API fails
        const rawRequests = window.localStorage.getItem(MEETING_REQUESTS_KEY)
        if (rawRequests) {
          try {
            const parsed = JSON.parse(rawRequests)
            setMeetingRequests(Array.isArray(parsed) ? parsed : [])
          } catch {
            setMeetingRequests([])
          }
        }
      }
    } catch (error) {
      console.error('Failed to load meeting requests:', error)
      // Fallback to localStorage
      const rawRequests = window.localStorage.getItem(MEETING_REQUESTS_KEY)
      if (rawRequests) {
        try {
          const parsed = JSON.parse(rawRequests)
          setMeetingRequests(Array.isArray(parsed) ? parsed : [])
        } catch {
          setMeetingRequests([])
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    loadMeetingRequests()

    const handleStorageSync = (event) => {
      if (!event.key || event.key === MEETING_REQUESTS_KEY) {
        loadMeetingRequests()
      }
    }

    window.addEventListener('storage', handleStorageSync)
    window.addEventListener('focus', loadMeetingRequests)

    return () => {
      window.removeEventListener('storage', handleStorageSync)
      window.removeEventListener('focus', loadMeetingRequests)
    }
  }, [])

  const handleSidebarNavigation = (event, href) => {
    // Extract query parameter if present
    const queryMatch = href?.match(/\?(.+)$/)
    const queryParam = queryMatch ? '?' + queryMatch[1] : ''
    const hrefWithoutQuery = href?.replace(/\?.*$/, '')
    
    const targetRoute = toAppRoute(hrefWithoutQuery)
    if (!targetRoute) {
      event.preventDefault()
      return
    }

    event.preventDefault()
    setIsFadingOut(true)

    timeoutRef.current = window.setTimeout(() => {
      navigate(targetRoute + queryParam)
    }, FADE_DURATION_MS)
  }

  const updateMeetingStatus = async (newStatus) => {
    if (!selectedRequest || !selectedRequest.id) {
      alert('Error: Could not find meeting request ID')
      return
    }

    setStatusUpdating(true)
    try {
      const response = await fetch(`${API_BASE}/meeting-request/${selectedRequest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          notes: ''
        })
      })

      const result = await response.json()

      if (response.ok && result.status === 'success') {
        alert(`✓ Meeting request marked as ${newStatus}`)
        
        // Close modal
        setSelectedRequest(null)
        
        // Wait for reload to complete before finishing
        await loadMeetingRequests()
      } else {
        const errorMsg = result.message || 'Failed to update meeting request'
        alert(`⚠ Error: ${errorMsg}`)
        console.error('Update error:', result)
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert(`⚠ Error updating meeting request: ${error.message}`)
    } finally {
      setStatusUpdating(false)
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
          <div className="welcome-message">Homepage Meeting Requests</div>
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

        <div style={{ flex: 1, overflow: 'auto', backgroundColor: 'var(--nexus-background-dark)' }}>
          <div style={{ padding: '30px 40px' }}>
            <h2 style={{ color: 'var(--nexus-text-light)', marginBottom: '30px', fontSize: '1.5em', fontWeight: 700 }}>
              📋 Meeting Request Inbox
            </h2>

            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
                <p style={{ fontSize: '1.1em' }}>⏳ Loading meeting requests...</p>
              </div>
            ) : meetingRequests.length > 0 ? (
              <div className="meeting-requests-container">
                {meetingRequests.map((request) => (
                  <div key={request.id || request.email} className="meeting-card">
                    <div className="meeting-card-header">
                      <h3 className="meeting-card-name">
                        {request.fullName || 'Unknown'}
                      </h3>
                      <span className="meeting-status-badge">
                        ⏱️ {request.status || 'Pending'}
                      </span>
                    </div>

                    <div className="meeting-card-info">
                      <div className="meeting-info-item">
                        <span>📞</span>
                        <strong>Contact:</strong>
                        <span>{request.contactNumber || '-'}</span>
                      </div>
                      <div className="meeting-info-item">
                        <span>✉️</span>
                        <strong>Email:</strong>
                        <span style={{ fontSize: '0.85em' }}>{request.email || '-'}</span>
                      </div>
                      <div className="meeting-info-item">
                        <span>🎯</span>
                        <strong>Topic:</strong>
                        <span>{request.topic || '-'}</span>
                      </div>
                      <div className="meeting-info-item">
                        <span>📅</span>
                        <strong>Preferred:</strong>
                        <span>{request.preferredDate || '-'} {request.preferredTime ? `@ ${request.preferredTime}` : ''}</span>
                      </div>
                    </div>

                    <div className="meeting-card-footer">
                      <button 
                        className="meeting-card-btn meeting-view-btn"
                        onClick={() => setSelectedRequest(request)}
                      >
                        👁️ View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                border: '2px dashed rgba(255, 255, 255, 0.2)'
              }}>
                <p style={{ fontSize: '3em', margin: '0 0 10px 0' }}>📭</p>
                <p style={{ color: '#999', fontSize: '1.1em', margin: 0 }}>No meeting requests yet</p>
                <p style={{ color: '#666', fontSize: '0.9em', margin: '10px 0 0 0' }}>Public users will submit meeting requests here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Meeting Request Details Modal */}
      {selectedRequest && (
        <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Meeting Request Details</h2>
              <button 
                className="modal-close"
                onClick={() => setSelectedRequest(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-row">
                <label>Full Name:</label>
                <span>{selectedRequest.fullName}</span>
              </div>
              <div className="detail-row">
                <label>Contact Number:</label>
                <span>{selectedRequest.contactNumber}</span>
              </div>
              <div className="detail-row">
                <label>Email:</label>
                <span>{selectedRequest.email}</span>
              </div>
              <div className="detail-row">
                <label>Preferred Date:</label>
                <span>{selectedRequest.preferredDate}</span>
              </div>
              <div className="detail-row">
                <label>Preferred Time:</label>
                <span>{selectedRequest.preferredTime}</span>
              </div>
              <div className="detail-row">
                <label>Topic:</label>
                <span>{selectedRequest.topic}</span>
              </div>
              {selectedRequest.topicOther && (
                <div className="detail-row">
                  <label>Other Topic Details:</label>
                  <span>{selectedRequest.topicOther}</span>
                </div>
              )}
              <div className="detail-row">
                <label>Additional Details:</label>
                <span className="details-text">{selectedRequest.details}</span>
              </div>
              <div className="detail-row">
                <label>Status:</label>
                <span className="status-badge">{selectedRequest.status}</span>
              </div>
              <div className="detail-row">
                <label>Submitted:</label>
                <span>{selectedRequest.createdAt ? new Date(selectedRequest.createdAt).toLocaleString('en-PH') : '-'}</span>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="modal-btn close-btn"
                onClick={() => setSelectedRequest(null)}
                disabled={statusUpdating}
              >
                Close
              </button>

              <button
                style={{
                  background: 'linear-gradient(135deg, #A8C5D9 0%, #8FACBE 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  cursor: statusUpdating ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  opacity: statusUpdating ? 0.6 : 1,
                }}
                onClick={() => updateMeetingStatus('approved')}
                disabled={statusUpdating}
                title="Approve this meeting request"
              >
                ✅ Approve
              </button>

              <button
                style={{
                  background: '#e8a5a5',
                  color: 'white',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  cursor: statusUpdating ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  opacity: statusUpdating ? 0.6 : 1,
                }}
                onClick={() => updateMeetingStatus('rejected')}
                disabled={statusUpdating}
                title="Reject this meeting request"
              >
                ❌ Reject
              </button>

              <button
                style={{
                  background: '#a8d9a8',
                  color: 'white',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  cursor: statusUpdating ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  opacity: statusUpdating ? 0.6 : 1,
                }}
                onClick={() => updateMeetingStatus('completed')}
                disabled={statusUpdating}
                title="Mark meeting as completed"
              >
                ✔️ Completed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
