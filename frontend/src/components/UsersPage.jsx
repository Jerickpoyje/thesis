import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import '../assets/css/admin-style.css'
import { isSameAppRoute, toAppRoute } from '../utils/navigation'
import SidebarSection from './SidebarSection'

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
  { label: 'Account Settings', href: 'profile.html' },
]

const MEETING_REQUESTS_KEY = 'fitsMeetingRequests'
const REQUESTS_PER_PAGE = 10
const STATUS_ORDER = {
  pending: 0,
  approved: 1,
  completed: 2,
  rejected: 3,
}

function normalizeStatus(status) {
  return String(status || 'pending').trim().toLowerCase() || 'pending'
}

function formatStatusLabel(status) {
  const normalized = normalizeStatus(status)
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function getStatusClass(status) {
  const normalized = normalizeStatus(status)
  return `status-badge ${normalized}`
}

function formatDisplayDate(value) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRequestType(request) {
  const topic = request?.topic?.trim() || '-'
  const topicOther = request?.topicOther?.trim()

  if (!topicOther) {
    return topic
  }

  if (topic.toLowerCase() === 'others') {
    return topicOther
  }

  return `${topic} - ${topicOther}`
}

function createDraft(request) {
  return {
    fullName: request?.fullName || '',
    contactNumber: request?.contactNumber || '',
    email: request?.email || '',
    preferredDate: request?.preferredDate || '',
    preferredTime: request?.preferredTime || '',
    topic: request?.topic || '',
    topicOther: request?.topicOther || '',
    details: request?.details || '',
  }
}

export default function UsersPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [meetingRequests, setMeetingRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [modalMode, setModalMode] = useState('view')
  const [editDraft, setEditDraft] = useState(createDraft(null))
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' })
  const [currentPage, setCurrentPage] = useState(1)
  const timeoutRef = useRef(null)

  const loadMeetingRequests = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/meeting-requests`)
      if (response.ok) {
        const data = await response.json()
        const converted = (data.requests || []).map(r => ({
          id: r.id,
          fullName: r.full_name ?? r.fullName ?? '',
          contactNumber: r.contact_number ?? r.contactNumber ?? '',
          email: r.email ?? '',
          preferredDate: r.preferred_date ?? r.preferredDate ?? '',
          preferredTime: r.preferred_time ?? r.preferredTime ?? '',
          topic: r.topic ?? '',
          topicOther: r.topic_other ?? r.topicOther ?? '',
          details: r.details ?? '',
          createdAt: r.created_at ?? r.createdAt ?? '',
          status: normalizeStatus(r.status),
        }))
        setMeetingRequests(converted)
      } else {
        const rawRequests = window.localStorage.getItem(MEETING_REQUESTS_KEY)
        if (rawRequests) {
          try {
            const parsed = JSON.parse(rawRequests)
            const fallbackRequests = Array.isArray(parsed)
              ? parsed.map((request) => ({
                  ...request,
                  status: normalizeStatus(request.status),
                }))
              : []
            setMeetingRequests(fallbackRequests)
          } catch {
            setMeetingRequests([])
          }
        }
      }
    } catch (error) {
      console.error('Failed to load meeting requests:', error)
      const rawRequests = window.localStorage.getItem(MEETING_REQUESTS_KEY)
      if (rawRequests) {
        try {
          const parsed = JSON.parse(rawRequests)
          const fallbackRequests = Array.isArray(parsed)
            ? parsed.map((request) => ({
                ...request,
                status: normalizeStatus(request.status),
              }))
            : []
          setMeetingRequests(fallbackRequests)
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

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, sortConfig.key, sortConfig.direction])

  useEffect(() => {
    if (selectedRequest) {
      setEditDraft(createDraft(selectedRequest))
    } else {
      setEditDraft(createDraft(null))
    }
  }, [selectedRequest, modalMode])

  const filteredMeetingRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    const filtered = meetingRequests.filter((request) => {
      const requestStatus = normalizeStatus(request.status)
      const requestType = formatRequestType(request)

      const matchesStatus = statusFilter === 'all' || requestStatus === statusFilter
      const matchesQuery = !query || [
        request.id,
        request.fullName,
        request.contactNumber,
        request.email,
        requestType,
        requestStatus,
        formatDisplayDate(request.createdAt),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))

      return matchesStatus && matchesQuery
    })

    const sorted = [...filtered].sort((left, right) => {
      const directionMultiplier = sortConfig.direction === 'asc' ? 1 : -1

      const leftValue = (() => {
        switch (sortConfig.key) {
          case 'fullName':
            return String(left.fullName || '')
          case 'email':
            return String(left.email || '')
          case 'contactNumber':
            return String(left.contactNumber || '')
          case 'requestType':
            return formatRequestType(left)
          case 'status':
            return STATUS_ORDER[normalizeStatus(left.status)] ?? 99
          case 'createdAt':
          default:
            return new Date(left.createdAt || 0).getTime() || 0
        }
      })()

      const rightValue = (() => {
        switch (sortConfig.key) {
          case 'fullName':
            return String(right.fullName || '')
          case 'email':
            return String(right.email || '')
          case 'contactNumber':
            return String(right.contactNumber || '')
          case 'requestType':
            return formatRequestType(right)
          case 'status':
            return STATUS_ORDER[normalizeStatus(right.status)] ?? 99
          case 'createdAt':
          default:
            return new Date(right.createdAt || 0).getTime() || 0
        }
      })()

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return (leftValue - rightValue) * directionMultiplier
      }

      return String(leftValue).localeCompare(String(rightValue), 'en', {
        numeric: true,
        sensitivity: 'base',
      }) * directionMultiplier
    })

    return sorted
  }, [meetingRequests, searchQuery, statusFilter, sortConfig])

  const totalPages = Math.max(1, Math.ceil(filteredMeetingRequests.length / REQUESTS_PER_PAGE))
  const paginatedRequests = filteredMeetingRequests.slice(
    (currentPage - 1) * REQUESTS_PER_PAGE,
    currentPage * REQUESTS_PER_PAGE,
  )

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const openRequestModal = (request, mode = 'view') => {
    setSelectedRequest(request)
    setModalMode(mode)
    setEditDraft(createDraft(request))
  }

  const closeRequestModal = () => {
    setSelectedRequest(null)
    setModalMode('view')
    setEditDraft(createDraft(null))
  }

  const applyRequestPatch = (requestId, patch) => {
    setMeetingRequests((previous) => (
      previous.map((request) => (
        request.id === requestId
          ? { ...request, ...patch, status: patch.status ? normalizeStatus(patch.status) : request.status }
          : request
      ))
    ))
  }

  const handleDraftChange = (event) => {
    const { name, value } = event.target
    setEditDraft((previous) => ({ ...previous, [name]: value }))
  }

  const handleSortChange = (key) => {
    setSortConfig((previous) => ({
      key,
      direction: previous.key === key && previous.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const handleStatusChange = async (request, newStatus) => {
    const requestId = request?.id
    if (!requestId) {
      alert('Error: Could not find meeting request ID')
      return
    }

    setStatusUpdating(true)
    try {
      const response = await fetch(`${API_BASE}/meeting-request/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          notes: '',
        }),
      })

      const result = await response.json().catch(() => ({}))

      if (response.ok && result.status === 'success') {
        applyRequestPatch(requestId, { status: newStatus })
        if (selectedRequest?.id === requestId) {
          setSelectedRequest((previous) => previous ? { ...previous, status: normalizeStatus(newStatus) } : previous)
        }
        await loadMeetingRequests()
        if (selectedRequest?.id === requestId) {
          closeRequestModal()
        }
      } else {
        const errorMsg = result.message || 'Failed to update meeting request'
        alert(`Error: ${errorMsg}`)
        console.error('Update error:', result)
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert(`Error updating meeting request: ${error.message}`)
    } finally {
      setStatusUpdating(false)
    }
  }

  const handleEditSubmit = async (event) => {
    event.preventDefault()

    if (!selectedRequest?.id) {
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
          ...editDraft,
        }),
      })

      const result = await response.json().catch(() => ({}))

      if (response.ok && result.status === 'success') {
        applyRequestPatch(selectedRequest.id, editDraft)
        await loadMeetingRequests()
        closeRequestModal()
      } else {
        const errorMsg = result.message || 'Failed to update meeting request'
        alert(`Error: ${errorMsg}`)
        console.error('Edit error:', result)
      }
    } catch (error) {
      console.error('Error updating meeting request:', error)
      alert(`Error updating meeting request: ${error.message}`)
    } finally {
      setStatusUpdating(false)
    }
  }

  const handleDeleteRequest = async (request) => {
    const requestId = request?.id
    if (!requestId) {
      alert('Error: Could not find meeting request ID')
      return
    }

    const confirmed = window.confirm('Delete this request? This action cannot be undone.')
    if (!confirmed) return

    setStatusUpdating(true)
    try {
      const response = await fetch(`${API_BASE}/meeting-request/${requestId}`, {
        method: 'DELETE',
      })

      const result = await response.json().catch(() => ({}))

      if (response.ok && result.status === 'success') {
        setMeetingRequests((previous) => previous.filter((item) => item.id !== requestId))
        if (selectedRequest?.id === requestId) {
          closeRequestModal()
        }
        await loadMeetingRequests()
      } else {
        const errorMsg = result.message || 'Failed to delete meeting request'
        alert(`Error: ${errorMsg}`)
        console.error('Delete error:', result)
      }
    } catch (error) {
      console.error('Error deleting meeting request:', error)
      alert(`Error deleting meeting request: ${error.message}`)
    } finally {
      setStatusUpdating(false)
    }
  }

  const handleSidebarNavigation = (event, href) => {
    const queryMatch = href?.match(/\?(.+)$/)
    const queryParam = queryMatch ? '?' + queryMatch[1] : ''
    const hrefWithoutQuery = href?.replace(/\?.*$/, '')
    
    const targetRoute = toAppRoute(hrefWithoutQuery)
    if (!targetRoute) {
      event.preventDefault()
      return
    }

    if (isSameAppRoute(location, `${targetRoute}${queryParam}`)) {
      event.preventDefault()
      return
    }

    event.preventDefault()
    setIsFadingOut(true)

    timeoutRef.current = window.setTimeout(() => {
      navigate(targetRoute + queryParam)
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
          <div className="welcome-message">User Request Management</div>
          <div className="top-nav-right">
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <div className="user-profile">
              <div className="avatar">AD</div>
              <span>Administrator</span>
            </div>
          </div>
        </div>

        <div className="request-page-shell">
          <div className="request-page-header">
            <div>
              <h2>Meeting Request Inbox</h2>
              <p>Track, review, and update requests from one table.</p>
            </div>
            <div className="request-summary">
              <div className="request-summary-card">
                <span>Total</span>
                <strong>{meetingRequests.length}</strong>
              </div>
              <div className="request-summary-card">
                <span>Visible</span>
                <strong>{filteredMeetingRequests.length}</strong>
              </div>
            </div>
          </div>

          <div className="request-toolbar">
            <div className="request-toolbar-group">
              <label htmlFor="request-status-filter">Status filter</label>
              <select
                id="request-status-filter"
                className="request-control-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="request-toolbar-group">
              <label htmlFor="request-sort-field">Sort by</label>
              <div className="request-sort-row">
                <select
                  id="request-sort-field"
                  className="request-control-select"
                  value={sortConfig.key}
                  onChange={(event) => {
                    const nextKey = event.target.value
                    setSortConfig((previous) => (
                      previous.key === nextKey
                        ? previous
                        : { key: nextKey, direction: 'asc' }
                    ))
                  }}
                >
                  <option value="createdAt">Date requested</option>
                  <option value="fullName">Full name</option>
                  <option value="email">Email</option>
                  <option value="contactNumber">Contact number</option>
                  <option value="requestType">Request type</option>
                  <option value="status">Status</option>
                </select>
                <button
                  type="button"
                  className="request-sort-direction-btn"
                  onClick={() => setSortConfig((previous) => ({
                    ...previous,
                    direction: previous.direction === 'asc' ? 'desc' : 'asc',
                  }))}
                >
                  {sortConfig.direction === 'asc' ? 'Ascending' : 'Descending'}
                </button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="request-empty-state request-empty-state--loading">
              <p>Loading meeting requests...</p>
            </div>
          ) : filteredMeetingRequests.length > 0 ? (
            <div className="request-table-card">
              <div className="request-table-wrap">
                <table className="data-table request-data-table">
                  <thead>
                    <tr>
                      <th>
                        <button type="button" className="table-sort-trigger" onClick={() => handleSortChange('fullName')}>
                          Full Name
                          {sortConfig.key === 'fullName' ? <span>{sortConfig.direction === 'asc' ? ' ▲' : ' ▼'}</span> : null}
                        </button>
                      </th>
                      <th>
                        <button type="button" className="table-sort-trigger" onClick={() => handleSortChange('email')}>
                          Email
                          {sortConfig.key === 'email' ? <span>{sortConfig.direction === 'asc' ? ' ▲' : ' ▼'}</span> : null}
                        </button>
                      </th>
                      <th>
                        <button type="button" className="table-sort-trigger" onClick={() => handleSortChange('contactNumber')}>
                          Contact Number
                          {sortConfig.key === 'contactNumber' ? <span>{sortConfig.direction === 'asc' ? ' ▲' : ' ▼'}</span> : null}
                        </button>
                      </th>
                      <th>
                        <button type="button" className="table-sort-trigger" onClick={() => handleSortChange('requestType')}>
                          Request Type
                          {sortConfig.key === 'requestType' ? <span>{sortConfig.direction === 'asc' ? ' ▲' : ' ▼'}</span> : null}
                        </button>
                      </th>
                      <th>
                        <button type="button" className="table-sort-trigger" onClick={() => handleSortChange('createdAt')}>
                          Date Requested
                          {sortConfig.key === 'createdAt' ? <span>{sortConfig.direction === 'asc' ? ' ▲' : ' ▼'}</span> : null}
                        </button>
                      </th>
                      <th>
                        <button type="button" className="table-sort-trigger" onClick={() => handleSortChange('status')}>
                          Status
                          {sortConfig.key === 'status' ? <span>{sortConfig.direction === 'asc' ? ' ▲' : ' ▼'}</span> : null}
                        </button>
                      </th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRequests.map((request) => {
                      const requestStatus = normalizeStatus(request.status)
                      return (
                        <tr key={request.id}>
                          <td>{request.fullName || '-'}</td>
                          <td>{request.email || '-'}</td>
                          <td>{request.contactNumber || '-'}</td>
                          <td>{formatRequestType(request)}</td>
                          <td>{formatDisplayDate(request.createdAt)}</td>
                          <td>
                            <span className={getStatusClass(requestStatus)}>{formatStatusLabel(requestStatus)}</span>
                          </td>
                          <td>
                            <div className="request-action-group">
                              <button
                                type="button"
                                className="request-action-btn request-action-btn--view"
                                onClick={() => openRequestModal(request, 'view')}
                                disabled={statusUpdating}
                              >
                                View
                              </button>
                              <button
                                type="button"
                                className="request-action-btn request-action-btn--edit"
                                onClick={() => openRequestModal(request, 'edit')}
                                disabled={statusUpdating}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="request-action-btn request-action-btn--delete"
                                onClick={() => handleDeleteRequest(request)}
                                disabled={statusUpdating}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="request-pagination">
                <button
                  type="button"
                  className="request-pagination-btn"
                  onClick={() => setCurrentPage((previous) => Math.max(1, previous - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  className="request-pagination-btn"
                  onClick={() => setCurrentPage((previous) => Math.min(totalPages, previous + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          ) : (
            <div className="request-empty-state">
              <p>No meeting requests match your filters.</p>
              <button type="button" className="request-empty-reset" onClick={() => {
                setSearchQuery('')
                setStatusFilter('all')
                setSortConfig({ key: 'createdAt', direction: 'desc' })
              }}>
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>

      {selectedRequest && modalMode === 'view' && (
        <div className="modal-overlay" onClick={closeRequestModal}>
          <div className="modal-content meeting-request-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Request Details</h2>
              <button className="modal-close" onClick={closeRequestModal}>✕</button>
            </div>

            <div className="modal-body">
              <div className="detail-row">
                <label>Full Name:</label>
                <span>{selectedRequest.fullName || '-'}</span>
              </div>
              <div className="detail-row">
                <label>Contact Number:</label>
                <span>{selectedRequest.contactNumber || '-'}</span>
              </div>
              <div className="detail-row">
                <label>Email:</label>
                <span>{selectedRequest.email || '-'}</span>
              </div>
              <div className="detail-row">
                <label>Request Type:</label>
                <span>{formatRequestType(selectedRequest)}</span>
              </div>
              <div className="detail-row">
                <label>Preferred Date:</label>
                <span>{selectedRequest.preferredDate || '-'}</span>
              </div>
              <div className="detail-row">
                <label>Preferred Time:</label>
                <span>{selectedRequest.preferredTime || '-'}</span>
              </div>
              <div className="detail-row">
                <label>Status:</label>
                <span className={getStatusClass(selectedRequest.status)}>{formatStatusLabel(selectedRequest.status)}</span>
              </div>
              <div className="detail-row">
                <label>Submitted:</label>
                <span>{formatDisplayDate(selectedRequest.createdAt)}</span>
              </div>
              <div className="detail-row detail-row--stacked">
                <label>Additional Details:</label>
                <span className="details-text">{selectedRequest.details || '-'}</span>
              </div>
            </div>

            <div className="modal-footer">
              <button className="modal-btn close-btn" onClick={closeRequestModal} disabled={statusUpdating}>
                Close
              </button>
              <button className="request-action-btn request-action-btn--approve" onClick={() => handleStatusChange(selectedRequest, 'approved')} disabled={statusUpdating}>
                Approve
              </button>
              <button className="request-action-btn request-action-btn--reject" onClick={() => handleStatusChange(selectedRequest, 'rejected')} disabled={statusUpdating}>
                Reject
              </button>
              <button className="request-action-btn request-action-btn--completed" onClick={() => handleStatusChange(selectedRequest, 'completed')} disabled={statusUpdating}>
                Completed
              </button>
              <button className="request-action-btn request-action-btn--view" onClick={() => openRequestModal(selectedRequest, 'edit')} disabled={statusUpdating}>
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedRequest && modalMode === 'edit' && (
        <div className="modal-overlay" onClick={closeRequestModal}>
          <div className="modal-content meeting-request-modal meeting-request-modal--edit" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Request</h2>
              <button className="modal-close" onClick={closeRequestModal}>✕</button>
            </div>

            <form id="meeting-request-edit-form" className="modal-body meeting-edit-form" onSubmit={handleEditSubmit}>
              <div className="meeting-edit-summary">
                <span className={getStatusClass(selectedRequest.status)}>{formatStatusLabel(selectedRequest.status)}</span>
              </div>
              <div className="meeting-edit-grid">
                <label className="meeting-edit-field">
                  <span>Full Name</span>
                  <input name="fullName" type="text" value={editDraft.fullName} onChange={handleDraftChange} required />
                </label>
                <label className="meeting-edit-field">
                  <span>Contact Number</span>
                  <input name="contactNumber" type="text" value={editDraft.contactNumber} onChange={handleDraftChange} required />
                </label>
                <label className="meeting-edit-field">
                  <span>Email</span>
                  <input name="email" type="email" value={editDraft.email} onChange={handleDraftChange} required />
                </label>
                <label className="meeting-edit-field">
                  <span>Preferred Date</span>
                  <input name="preferredDate" type="text" value={editDraft.preferredDate} onChange={handleDraftChange} />
                </label>
                <label className="meeting-edit-field">
                  <span>Preferred Time</span>
                  <input name="preferredTime" type="text" value={editDraft.preferredTime} onChange={handleDraftChange} />
                </label>
                <label className="meeting-edit-field">
                  <span>Request Type</span>
                  <input name="topic" type="text" value={editDraft.topic} onChange={handleDraftChange} required />
                </label>
                <label className="meeting-edit-field meeting-edit-field--full">
                  <span>Other Topic Details</span>
                  <input name="topicOther" type="text" value={editDraft.topicOther} onChange={handleDraftChange} />
                </label>
                <label className="meeting-edit-field meeting-edit-field--full">
                  <span>Additional Details</span>
                  <textarea name="details" rows="5" value={editDraft.details} onChange={handleDraftChange} />
                </label>
              </div>
            </form>

            <div className="modal-footer">
              <button className="modal-btn close-btn" type="button" onClick={closeRequestModal} disabled={statusUpdating}>
                Cancel
              </button>
              <button className="request-action-btn request-action-btn--edit" type="submit" form="meeting-request-edit-form" disabled={statusUpdating}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
