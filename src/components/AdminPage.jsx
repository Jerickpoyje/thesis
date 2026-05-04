import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import '../assets/css/admin-style.css'
import { toAppRoute } from '../utils/navigation'
import CoffeePrediction from './CoffeePrediction'

const FADE_DURATION_MS = 500
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const ADMIN_VIEWS = {
  DASHBOARD: 'dashboard',
  PREDICTIVE_MAP: 'predictive-map',
}

const quickLinks = [
  { label: 'Predictive Map', href: 'admin.html?view=map' },
  { label: 'Analytics Dashboard', href: 'admin.html' },
  { label: 'User Requests', href: 'users.html' },
  { label: 'Generate Reports', href: 'reports.html' },
]

const dataTableLinks = [
  { label: 'System Logs', href: 'logs.html' },
]

const settingsLinks = [{ label: 'Return to Home', href: 'home.html?admin=true' }]

function SidebarSection({ title, links, onNavigate, activeHref }) {
  return (
    <>
      <h4>{title}</h4>
      <ul>
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              className={activeHref === link.href ? 'active' : undefined}
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

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('en-PH', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminPage({ initialView = ADMIN_VIEWS.DASHBOARD }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isFadingOut, setIsFadingOut] = useState(false)
  
  // Check for ?view=map query parameter
  const queryParams = new URLSearchParams(location.search)
  const viewParam = queryParams.get('view')
  const initialViewFromParam = viewParam === 'map' ? ADMIN_VIEWS.PREDICTIVE_MAP : initialView
  
  const [activeView,  setActiveView]  = useState(initialViewFromParam)
  const timeoutRef = useRef(null)

  const [dashLoading, setDashLoading] = useState(true)
  const [dashError,   setDashError]   = useState(null)
  const [dashData,    setDashData]    = useState({
    total_runs: 0, total_production: 0, high_confidence: 0, recent_logs: [],
  })

  async function fetchDashboard() {
    setDashLoading(true)
    setDashError(null)
    try {
      const res = await fetch(`${API_BASE}/dashboard`)
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      setDashData(await res.json())
    } catch (e) {
      setDashError(e.message)
    } finally {
      setDashLoading(false)
    }
  }

  useEffect(() => { fetchDashboard() }, [])
  useEffect(() => { if (activeView === ADMIN_VIEWS.DASHBOARD) fetchDashboard() }, [activeView])
  useEffect(() => { setActiveView(initialView) }, [initialView])
  useEffect(() => {
    // Update view based on query parameter
    const queryParams = new URLSearchParams(location.search)
    const viewParam = queryParams.get('view')
    if (viewParam === 'map') {
      setActiveView(ADMIN_VIEWS.PREDICTIVE_MAP)
    }
  }, [location.search])
  useEffect(() => { return () => { if (timeoutRef.current) window.clearTimeout(timeoutRef.current) } }, [])

  const handleSidebarNavigation = (event, href) => {
    const normalizedHref = href?.trim().toLowerCase()
    // Handle admin.html with optional query parameters
    if (normalizedHref.startsWith('admin.html')) { 
      event.preventDefault()
      if (normalizedHref.includes('view=map')) {
        setActiveView(ADMIN_VIEWS.PREDICTIVE_MAP)
      } else {
        setActiveView(ADMIN_VIEWS.DASHBOARD)
      }
      return 
    }
    if (normalizedHref === 'index.html') { event.preventDefault(); setActiveView(ADMIN_VIEWS.PREDICTIVE_MAP); return }
    
    // Extract query parameter if present
    const queryMatch = href?.match(/\?(.+)$/)
    const queryParam = queryMatch ? '?' + queryMatch[1] : ''
    const hrefWithoutQuery = href?.replace(/\?.*$/, '')
    
    const targetRoute = toAppRoute(hrefWithoutQuery)
    if (!targetRoute) { event.preventDefault(); return }
    event.preventDefault()
    setIsFadingOut(true)
    timeoutRef.current = window.setTimeout(() => navigate(targetRoute + queryParam), FADE_DURATION_MS)
  }

  const activeQuickLinkHref = activeView === ADMIN_VIEWS.PREDICTIVE_MAP ? 'Index.html' : 'admin.html'

  // Real ensemble R² based on actual model metrics
  const modelAcc = Math.round(((0.7477 + 0.9288 + 0.8965) * 0.30 + (0.9837 + 0.9756 + 0.9725) * 0.70) / 3 * 100)

  return (
    <div className={`admin-dashboard-body${isFadingOut ? ' fade-out' : ''}`}>
      <div className="sidebar">
        <div className="logo-container">
          <span className="logo-icon">🌱</span>
          <span className="logo-text">Coffee Prediction Analysis</span>
        </div>
        <nav className="sidebar-nav" aria-label="Sidebar navigation">
          <SidebarSection title="Quick Links" links={quickLinks} onNavigate={handleSidebarNavigation} activeHref={activeQuickLinkHref} />
          <SidebarSection title="Data Tables" links={dataTableLinks} onNavigate={handleSidebarNavigation} />
          <SidebarSection title="Settings" links={settingsLinks} onNavigate={handleSidebarNavigation} />
        </nav>
      </div>

      <div className="main-content">
        <div className="top-nav">
          <div className="welcome-message">Welcome back, Admin!</div>
          <div className="top-nav-right">
            <div className="search-bar"><input type="text" placeholder="Search..." /></div>
            <div className="top-nav-icons">
              <span className="icon" aria-hidden="true">🔔</span>
              <span className="icon" aria-hidden="true">✉</span>
            </div>
            <div className="user-profile">
              <div className="avatar">AD</div>
              <span>Administrator</span>
            </div>
          </div>
        </div>

        {activeView === ADMIN_VIEWS.PREDICTIVE_MAP ? (
          <CoffeePrediction />
        ) : (
          <div className="dashboard-grid">

            {/* Alert banner */}
            <div className="card grid-item-span-3 alert-message">
              {dashData.total_runs > 0
                ? `Amadeo Coffee Prediction System is live — ${dashData.total_runs} prediction${dashData.total_runs > 1 ? 's' : ''} recorded.`
                : 'Amadeo Coffee Prediction System is live. Run your first prediction to see data here!'}
            </div>

            {/* Total Production */}
            <div className="card metric-summary-card">
              <div className="icon-wrapper">☕</div>
              <div className="details">
                <h3>{dashLoading ? '...' : `${dashData.total_production.toFixed(2)} MT`}</h3>
                <p>Total Predicted Production</p>
              </div>
            </div>

            {/* Total Runs */}
            <div className="card metric-summary-card">
              <div className="icon-wrapper">▤</div>
              <div className="details">
                <h3>{dashLoading ? '...' : dashData.total_runs}</h3>
                <p>Total Prediction Runs</p>
              </div>
            </div>

            {/* High Confidence */}
            <div className="card metric-summary-card">
              <div className="icon-wrapper">★</div>
              <div className="details">
                <h3>{dashLoading ? '...' : dashData.high_confidence}</h3>
                <p>High Confidence Predictions</p>
              </div>
            </div>

            {/* Chart */}
            <div className="card grid-item-span-2">
              <div className="card-header">
                <h2 className="card-title">Weekly Prediction Trends</h2>
              </div>
              <div className="chart-placeholder">
                [Chart Visualization — Coming Soon]
                <br />
                <small>Will show prediction history over time</small>
              </div>
            </div>

            {/* Model Performance */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Model Performance Overview</h2>
              </div>
              <div className="project-status-item">
                <p>Ensemble R² Score <span>{modelAcc}%</span></p>
                <div className="progress-bar-container">
                  <div className="progress-bar" style={{ width: `${modelAcc}%` }} />
                </div>
              </div>
              <div className="project-status-item">
                <p>Model 1 — Original Data <span>86%</span></p>
                <div className="progress-bar-container">
                  <div className="progress-bar" style={{ width: '86%', backgroundColor: '#f7b731' }} />
                </div>
              </div>
              <div className="project-status-item">
                <p>Model 2 — Augmented Data <span>98%</span></p>
                <div className="progress-bar-container">
                  <div className="progress-bar" style={{ width: '98%', backgroundColor: '#2ecc71' }} />
                </div>
              </div>
            </div>

            {/* Recent Prediction Log */}
            <div className="card grid-item-span-3">
              <div className="card-header">
                <h2 className="card-title">Recent Prediction Log</h2>
                <button onClick={fetchDashboard}
                  style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px', border: '1px solid #ccc', cursor: 'pointer', background: '#fff' }}>
                  ↻ Refresh
                </button>
              </div>

              {dashError && (
                <p style={{ color: '#b53030', fontSize: '0.8rem', padding: '8px' }}>
                  ⚠ Cannot load data — make sure FastAPI is running on port 8000.
                </p>
              )}

              {dashLoading ? (
                <p style={{ color: '#888', fontSize: '0.8rem', padding: '8px' }}>Loading...</p>
              ) : dashData.recent_logs.length === 0 ? (
                <p style={{ color: '#888', fontSize: '0.8rem', padding: '8px' }}>
                  No predictions yet. Run a prediction to see logs here!
                </p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date Run</th>
                      <th>Barangay</th>
                      <th>Temp (°C)</th>
                      <th>Rainfall (mm)</th>
                      <th>Humidity (%)</th>
                      <th>Production (MT)</th>
                      <th>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashData.recent_logs.map((row, i) => (
                      <tr key={i}>
                        <td>{formatDate(row.created_at)}</td>
                        <td>{row.barangay_name}</td>
                        <td>{row.temperature_c}</td>
                        <td>{row.annual_rainfall_mm}</td>
                        <td>{row.humidity_pct}</td>
                        <td>{row.m2_total_mt?.toFixed(3)}</td>
                        <td className={
                          row.confidence === 'High'   ? 'status-high' :
                          row.confidence === 'Medium' ? 'status-medium' : 'status-low'
                        }>
                          {row.confidence}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}