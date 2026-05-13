import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import '../assets/css/admin-style.css'
import { isSameAppRoute, toAppRoute } from '../utils/navigation'
import { getAdminAuthToken, setAdminAuthenticated } from '../utils/auth'
import CoffeePrediction from './CoffeePrediction'
import Chart from 'chart.js/auto'

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
  { label: 'Prediction Visualizations', href: 'visualizations.html' },
  { label: 'Data Generate', href: 'data-generate.html' },
]

const settingsLinks = [
  { label: 'Account Settings', href: 'profile.html' },
]

function SidebarSection({ title, links, onNavigate, activeHref }) {
  const location = useLocation()

  return (
    <>
      <h4>{title}</h4>
      <ul>
        {links.map((link) => {
          const isActiveHref = activeHref === link.href
          const targetRoute = toAppRoute(link.href)
          const isActiveRoute = targetRoute && isSameAppRoute(location, targetRoute)
          const isActive = isActiveHref || isActiveRoute

          return (
            <li key={link.label} className={isActive ? 'active' : undefined}>
              <a
                href={link.href}
                className={isActive ? 'active' : undefined}
                onClick={(event) => onNavigate(event, link.href)}
              >
                <span>{link.label}</span>
              </a>
            </li>
          )
        })}
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

function getWeekStartISO(dateValue) {
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return null

  const normalized = new Date(date)
  normalized.setHours(0, 0, 0, 0)
  const day = normalized.getDay()
  const offsetToMonday = day === 0 ? -6 : 1 - day
  normalized.setDate(normalized.getDate() + offsetToMonday)
  return normalized.toISOString().slice(0, 10)
}

function formatWeekLabel(weekStartISO) {
  if (!weekStartISO) return 'Unknown week'
  const start = new Date(`${weekStartISO}T00:00:00`)
  if (Number.isNaN(start.getTime())) return weekStartISO

  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const startPart = start.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
  const endPart = end.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
  return `${startPart} - ${endPart}`
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
  const [currentPage, setCurrentPage] = useState(1)
  const [logsPerPage] = useState(10)
  const [trendMode, setTrendMode] = useState('overview')
  const chartCanvasRef = useRef(null)
  const weeklyChartRef = useRef(null)

  const fetchDashboard = useCallback(async (background = false) => {
    if (!background) setDashLoading(true)
    setDashError(null)
    try {
      const res = await fetch(`${API_BASE}/dashboard`)
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const newData = await res.json()
      setDashData(newData)
      if (!background) setCurrentPage(1) // Reset to first page when new data is loaded
    } catch (e) {
      setDashError(e.message)
    } finally {
      if (!background) setDashLoading(false)
    }
  }, [])

  const weeklyTrendData = useMemo(() => {
    const weekBucketMap = new Map()
    const logs = Array.isArray(dashData.recent_logs) ? dashData.recent_logs : []

    logs.forEach((log) => {
      const weekStartISO = getWeekStartISO(log.created_at)
      if (!weekStartISO) return

      if (!weekBucketMap.has(weekStartISO)) {
        weekBucketMap.set(weekStartISO, {
          weekStartISO,
          totalProduction: 0,
          robusta: 0,
          liberica: 0,
          excelsa: 0,
          runCount: 0,
        })
      }

      const bucket = weekBucketMap.get(weekStartISO)
      bucket.totalProduction += Number(log.m2_total_mt ?? 0)
      bucket.robusta += Number(log.m2_robusta_mt ?? 0)
      bucket.liberica += Number(log.m2_liberica_mt ?? 0)
      bucket.excelsa += Number(log.m2_excelsa_mt ?? 0)
      bucket.runCount += 1
    })

    const weeklyBuckets = Array.from(weekBucketMap.values()).sort((left, right) => left.weekStartISO.localeCompare(right.weekStartISO))

    return {
      labels: weeklyBuckets.map((bucket) => formatWeekLabel(bucket.weekStartISO)),
      totalProduction: weeklyBuckets.map((bucket) => Number(bucket.totalProduction.toFixed(3))),
      robusta: weeklyBuckets.map((bucket) => Number(bucket.robusta.toFixed(3))),
      liberica: weeklyBuckets.map((bucket) => Number(bucket.liberica.toFixed(3))),
      excelsa: weeklyBuckets.map((bucket) => Number(bucket.excelsa.toFixed(3))),
      runCount: weeklyBuckets.map((bucket) => bucket.runCount),
      averagePerRun: weeklyBuckets.map((bucket) => Number(((bucket.runCount > 0 ? bucket.totalProduction / bucket.runCount : 0)).toFixed(3))),
      robustaAveragePerRun: weeklyBuckets.map((bucket) => Number(((bucket.runCount > 0 ? bucket.robusta / bucket.runCount : 0)).toFixed(3))),
      libericaAveragePerRun: weeklyBuckets.map((bucket) => Number(((bucket.runCount > 0 ? bucket.liberica / bucket.runCount : 0)).toFixed(3))),
      excelsaAveragePerRun: weeklyBuckets.map((bucket) => Number(((bucket.runCount > 0 ? bucket.excelsa / bucket.runCount : 0)).toFixed(3))),
    }
  }, [dashData.recent_logs])

  // Pagination logic
  const indexOfLastLog = currentPage * logsPerPage
  const indexOfFirstLog = indexOfLastLog - logsPerPage
  const currentLogs = dashData.recent_logs.slice(indexOfFirstLog, indexOfLastLog)
  const totalPages = Math.ceil(dashData.recent_logs.length / logsPerPage)

  const paginate = (pageNumber) => setCurrentPage(pageNumber)
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages))
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1))

  useEffect(() => { fetchDashboard(false) }, [fetchDashboard])
  useEffect(() => { if (activeView === ADMIN_VIEWS.DASHBOARD) fetchDashboard(false) }, [activeView, fetchDashboard])
  useEffect(() => {
    if (activeView !== ADMIN_VIEWS.DASHBOARD) return

    const intervalId = window.setInterval(() => {
      fetchDashboard(true)
    }, 15000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [activeView, fetchDashboard])
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search)
    const viewParam = queryParams.get('view')
    const resolvedView = viewParam === 'map' ? ADMIN_VIEWS.PREDICTIVE_MAP : initialView
    setActiveView(resolvedView)
  }, [location.search, initialView])
  useEffect(() => { setIsFadingOut(false) }, [location.pathname, location.search])
  useEffect(() => {
    if (activeView !== ADMIN_VIEWS.DASHBOARD) {
      if (weeklyChartRef.current) {
        weeklyChartRef.current.destroy()
        weeklyChartRef.current = null
      }
      return
    }

    if (!chartCanvasRef.current || weeklyTrendData.labels.length === 0) {
      if (weeklyChartRef.current) {
        weeklyChartRef.current.destroy()
        weeklyChartRef.current = null
      }
      return
    }

    if (weeklyChartRef.current) {
      weeklyChartRef.current.destroy()
      weeklyChartRef.current = null
    }

    const isCoffeeTypeMode = trendMode === 'coffee-types'
    const isAverageMode = trendMode === 'average-per-run'
    const datasets = isAverageMode
      ? [
          {
            label: 'Total Avg / Run (MT)',
            data: weeklyTrendData.averagePerRun,
            borderColor: '#3f5b74',
            backgroundColor: 'rgba(63, 91, 116, 0.1)',
            pointBackgroundColor: '#3f5b74',
            pointBorderColor: '#fff',
            pointRadius: 4,
            borderWidth: 2.8,
            tension: 0.34,
            fill: false,
            yAxisID: 'yProduction',
          },
          {
            label: 'Robusta Avg / Run (MT)',
            data: weeklyTrendData.robustaAveragePerRun,
            borderColor: '#6B7D92',
            backgroundColor: 'rgba(107, 125, 146, 0.08)',
            pointBackgroundColor: '#6B7D92',
            pointBorderColor: '#fff',
            pointRadius: 3.5,
            borderWidth: 2.2,
            tension: 0.32,
            fill: false,
            yAxisID: 'yProduction',
          },
          {
            label: 'Liberica Avg / Run (MT)',
            data: weeklyTrendData.libericaAveragePerRun,
            borderColor: '#A8C5D9',
            backgroundColor: 'rgba(168, 197, 217, 0.08)',
            pointBackgroundColor: '#A8C5D9',
            pointBorderColor: '#fff',
            pointRadius: 3.5,
            borderWidth: 2.2,
            tension: 0.32,
            fill: false,
            yAxisID: 'yProduction',
          },
          {
            label: 'Excelsa Avg / Run (MT)',
            data: weeklyTrendData.excelsaAveragePerRun,
            borderColor: '#f7b731',
            backgroundColor: 'rgba(247, 183, 49, 0.08)',
            pointBackgroundColor: '#f7b731',
            pointBorderColor: '#fff',
            pointRadius: 3.5,
            borderWidth: 2.2,
            tension: 0.32,
            fill: false,
            yAxisID: 'yProduction',
          },
        ]
      : isCoffeeTypeMode
      ? [
          {
            label: 'Robusta (MT)',
            data: weeklyTrendData.robusta,
            borderColor: '#6B7D92',
            backgroundColor: 'rgba(107, 125, 146, 0.08)',
            pointBackgroundColor: '#6B7D92',
            pointBorderColor: '#fff',
            pointRadius: 4,
            borderWidth: 2.5,
            tension: 0.32,
            fill: false,
            yAxisID: 'yProduction',
          },
          {
            label: 'Liberica (MT)',
            data: weeklyTrendData.liberica,
            borderColor: '#A8C5D9',
            backgroundColor: 'rgba(168, 197, 217, 0.08)',
            pointBackgroundColor: '#A8C5D9',
            pointBorderColor: '#fff',
            pointRadius: 4,
            borderWidth: 2.5,
            tension: 0.32,
            fill: false,
            yAxisID: 'yProduction',
          },
          {
            label: 'Excelsa (MT)',
            data: weeklyTrendData.excelsa,
            borderColor: '#f7b731',
            backgroundColor: 'rgba(247, 183, 49, 0.08)',
            pointBackgroundColor: '#f7b731',
            pointBorderColor: '#fff',
            pointRadius: 4,
            borderWidth: 2.5,
            tension: 0.32,
            fill: false,
            yAxisID: 'yProduction',
          },
        ]
      : [
          {
            label: 'Total Production (MT)',
            data: weeklyTrendData.totalProduction,
            borderColor: '#6B7D92',
            backgroundColor: 'rgba(107, 125, 146, 0.16)',
            pointBackgroundColor: '#6B7D92',
            pointBorderColor: '#fff',
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 3,
            tension: 0.35,
            fill: true,
            yAxisID: 'yProduction',
          },
          {
            label: 'Prediction Runs',
            data: weeklyTrendData.runCount,
            borderColor: '#A8C5D9',
            backgroundColor: 'rgba(168, 197, 217, 0.08)',
            pointBackgroundColor: '#A8C5D9',
            pointBorderColor: '#fff',
            pointRadius: 3,
            borderWidth: 2,
            tension: 0.28,
            fill: false,
            yAxisID: 'yRuns',
          },
        ]

    weeklyChartRef.current = new Chart(chartCanvasRef.current, {
      type: 'line',
      data: {
        labels: weeklyTrendData.labels,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 450 },
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#34465a',
              usePointStyle: true,
              padding: 16,
              font: {
                family: 'Roboto, sans-serif',
                weight: 600,
              },
            },
          },
          tooltip: {
            backgroundColor: 'rgba(31, 44, 60, 0.96)',
            titleColor: '#f4f7fb',
            bodyColor: '#dbe7f2',
            borderColor: 'rgba(168, 197, 217, 0.35)',
            borderWidth: 1,
            padding: 12,
          },
        },
        scales: {
          x: {
            ticks: {
              color: '#5e6e82',
              font: { family: 'Roboto, sans-serif' },
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
            },
          },
          yProduction: {
            beginAtZero: true,
            position: 'left',
            title: {
              display: true,
              text: 'Production (MT)',
              color: '#4f6177',
            },
            ticks: {
              color: '#5e6e82',
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.06)',
            },
          },
          ...((isCoffeeTypeMode || isAverageMode)
            ? {}
            : {
                yRuns: {
                  beginAtZero: true,
                  position: 'right',
                  title: {
                    display: true,
                    text: 'Prediction Runs',
                    color: '#7a8ca3',
                  },
                  ticks: {
                    color: '#7a8ca3',
                    precision: 0,
                  },
                  grid: {
                    drawOnChartArea: false,
                  },
                },
              }),
        },
      },
    })

    return () => {
      if (weeklyChartRef.current) {
        weeklyChartRef.current.destroy()
        weeklyChartRef.current = null
      }
    }
  }, [activeView, trendMode, weeklyTrendData])
  useEffect(() => { return () => { if (timeoutRef.current) window.clearTimeout(timeoutRef.current) } }, [])

  const handleSidebarNavigation = (event, href) => {
    const normalizedHref = href?.trim().toLowerCase()

    // Keep dashboard <-> predictive map transitions consistent with other sidebar animations.
    if (normalizedHref === 'index.html' || normalizedHref.startsWith('admin.html')) {
      event.preventDefault()
      const nextView = normalizedHref === 'index.html' || normalizedHref.includes('view=map')
        ? ADMIN_VIEWS.PREDICTIVE_MAP
        : ADMIN_VIEWS.DASHBOARD
      const targetRoute = nextView === ADMIN_VIEWS.PREDICTIVE_MAP ? '/admin?view=map' : '/admin'

      if (isSameAppRoute(location, targetRoute) && activeView === nextView) return

      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
      setIsFadingOut(true)
      timeoutRef.current = window.setTimeout(() => {
        setActiveView(nextView)
        navigate(targetRoute)
      }, FADE_DURATION_MS)
      return
    }

    // Extract query parameter if present
    const queryMatch = href?.match(/\?(.+)$/)
    const queryParam = queryMatch ? '?' + queryMatch[1] : ''
    const hrefWithoutQuery = href?.replace(/\?.*$/, '')
    
    const targetRoute = toAppRoute(hrefWithoutQuery)
    if (!targetRoute) { event.preventDefault(); return }
    if (isSameAppRoute(location, `${targetRoute}${queryParam}`)) { event.preventDefault(); return }
    event.preventDefault()
    setIsFadingOut(true)
    timeoutRef.current = window.setTimeout(() => navigate(targetRoute + queryParam), FADE_DURATION_MS)
  }

  const handleLogout = () => {
    setAdminAuthenticated(false)
    navigate('/login', { replace: true })
  }

  const activeQuickLinkHref = activeView === ADMIN_VIEWS.PREDICTIVE_MAP ? 'admin.html?view=map' : 'admin.html'

  // Real ensemble R² based on actual model metrics
  const modelAcc = Math.round(((0.7477 + 0.9288 + 0.8965) * 0.30 + (0.9837 + 0.9756 + 0.9725) * 0.70) / 3 * 100)
  const highConfidenceRate = dashData.total_runs > 0 ? Math.round((dashData.high_confidence / dashData.total_runs) * 100) : 0
  const avgProductionPerRun = dashData.total_runs > 0 ? dashData.total_production / dashData.total_runs : 0

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
            <div className="user-profile">
              <div className="avatar">AD</div>
              <span>Administrator</span>
            </div>
            <button type="button" className="admin-logout-btn" onClick={handleLogout}>
              Logout
            </button>
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

            <div className="card grid-item-span-3">
              <div className="card-header">
                <h2 className="card-title">EDITOR CONTROLS</h2>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => navigate('/home?edit=true')}
                  style={{ padding: '10px 18px', borderRadius: '999px', border: 'none', background: '#A8C5D9', color: '#21303f', fontWeight: 700, cursor: 'pointer' }}
                >
                  EDIT HOME PAGE
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/about?edit=true')}
                  style={{ padding: '10px 18px', borderRadius: '999px', border: 'none', background: '#6B7D92', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                  EDIT ABOUT PAGE
                </button>
              </div>
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
                <div>
                  <h2 className="card-title">Weekly Prediction Trends</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#6b7d92', fontWeight: 600 }}>
                    {trendMode === 'overview'
                      ? 'Totals plus run count by week'
                      : trendMode === 'coffee-types'
                        ? 'Weekly totals split by coffee type'
                        : 'Normalized by weekly run count'}
                  </p>
                </div>
                <div className="weekly-trends-toggle" role="tablist" aria-label="Weekly trend chart mode">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={trendMode === 'overview'}
                    className={trendMode === 'overview' ? 'active' : ''}
                    onClick={() => setTrendMode('overview')}
                  >
                    Overview
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={trendMode === 'coffee-types'}
                    className={trendMode === 'coffee-types' ? 'active' : ''}
                    onClick={() => setTrendMode('coffee-types')}
                  >
                    Coffee Types
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={trendMode === 'average-per-run'}
                    className={trendMode === 'average-per-run' ? 'active' : ''}
                    onClick={() => setTrendMode('average-per-run')}
                  >
                    Avg / Run
                  </button>
                </div>
              </div>
              {weeklyTrendData.labels.length === 0 ? (
                <div className="chart-placeholder">
                  {dashLoading
                    ? 'Loading weekly trends...'
                    : 'No prediction data yet. Run predictions to populate weekly trends.'}
                </div>
              ) : (
                <div className="weekly-trends-wrap">
                  <canvas ref={chartCanvasRef} className="weekly-trends-canvas" aria-label="Weekly prediction trends chart" />
                </div>
              )}
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
                <p>High Confidence Predictions <span>{dashLoading ? '...' : `${highConfidenceRate}%`}</span></p>
                <div className="progress-bar-container">
                  <div className="progress-bar" style={{ width: `${highConfidenceRate}%`, backgroundColor: '#2ecc71' }} />
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
                <>
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
                      {currentLogs.map((row, i) => (
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

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '16px',
                      padding: '12px',
                      borderTop: '1px solid #e8ecf0'
                    }}>
                      <button
                        onClick={prevPage}
                        disabled={currentPage === 1}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid #d4dce4',
                          background: currentPage === 1 ? '#f5f7f9' : '#fff',
                          color: currentPage === 1 ? '#ccc' : '#34465a',
                          borderRadius: '4px',
                          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                          fontSize: '0.875rem'
                        }}
                      >
                        Previous
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                        <button
                          key={number}
                          onClick={() => paginate(number)}
                          style={{
                            padding: '6px 12px',
                            border: '1px solid #d4dce4',
                            background: currentPage === number ? '#2d6e18' : '#fff',
                            color: currentPage === number ? '#fff' : '#34465a',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: currentPage === number ? '600' : '400'
                          }}
                        >
                          {number}
                        </button>
                      ))}

                      <button
                        onClick={nextPage}
                        disabled={currentPage === totalPages}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid #d4dce4',
                          background: currentPage === totalPages ? '#f5f7f9' : '#fff',
                          color: currentPage === totalPages ? '#ccc' : '#34465a',
                          borderRadius: '4px',
                          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                          fontSize: '0.875rem'
                        }}
                      >
                        Next
                      </button>
                    </div>
                  )}

                  {/* Page info */}
                  <div style={{
                    textAlign: 'center',
                    marginTop: '8px',
                    fontSize: '0.75rem',
                    color: '#7a8b9a'
                  }}>
                    Showing {indexOfFirstLog + 1}-{Math.min(indexOfLastLog, dashData.recent_logs.length)} of {dashData.recent_logs.length} predictions
                  </div>
                </>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}