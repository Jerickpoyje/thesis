import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Chart from 'chart.js/auto'
import '../assets/css/admin-style.css'
import { toAppRoute } from '../utils/navigation'

const FADE_DURATION_MS = 500
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const quickLinks = [
  { label: 'Predictive Map', href: 'admin.html?view=map' },
  { label: 'Analytics Dashboard', href: 'admin.html' },
  { label: 'User Requests', href: 'users.html' },
  { label: 'Generate Reports', href: 'reports.html' },
]

const dataTableLinks = [
  { label: 'Prediction Visualizations', href: 'visualizations.html', isActive: true },
  { label: 'Data Generate', href: 'data-generate.html' },
]

const settingsLinks = [
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

export default function VisualizationsPage() {
  const navigate = useNavigate()
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [overTimeData, setOverTimeData] = useState(null)
  const [locationData, setLocationData] = useState(null)
  const timeoutRef = useRef(null)
  const overTimeCanvasRef = useRef(null)
  const locationCanvasRef = useRef(null)
  const chartRefs = useRef({
    overTime: null,
    location: null,
  })

  // Cleanup charts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
      Object.values(chartRefs.current).forEach((chart) => {
        if (chart) chart.destroy()
      })
    }
  }, [])

  // Fetch visualization data from all three endpoints
  useEffect(() => {
    const fetchVisualizations = async () => {
      setLoading(true)
      setError('')
      try {
        const [overTimeRes, locationRes] = await Promise.all([
          fetch(`${API_BASE}/predictions/over-time`),
          fetch(`${API_BASE}/predictions/by-location`),
        ])

        if (!overTimeRes.ok || !locationRes.ok) {
          throw new Error('Failed to load one or more visualizations')
        }

        const overTime = await overTimeRes.json()
        const location = await locationRes.json()

        setOverTimeData(overTime)
        setLocationData(location)
      } catch (e) {
        setError(e.message || 'Unable to load visualizations')
      } finally {
        setLoading(false)
      }
    }

    fetchVisualizations()
  }, [])

  // Create/Update charts
  useEffect(() => {
    // Destroy existing charts
    Object.values(chartRefs.current).forEach((chart) => {
      if (chart) chart.destroy()
    })
    chartRefs.current = { overTime: null, category: null, location: null }

    // Predictions Over Time Chart
    if (overTimeCanvasRef.current && overTimeData?.data?.length > 0) {
      chartRefs.current.overTime = new Chart(overTimeCanvasRef.current, {
        type: 'line',
        data: {
          labels: overTimeData.data.map((d) => d.date),
          datasets: [
            {
              label: 'Predictions per Day',
              data: overTimeData.data.map((d) => d.count),
              borderColor: '#2d6e18',
              backgroundColor: 'rgba(45, 110, 24, 0.1)',
              borderWidth: 3,
              tension: 0.4,
              pointRadius: 5,
              pointBackgroundColor: '#2d6e18',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#34465a', font: { size: 12 } } },
          },
          scales: {
            x: {
              title: { display: true, text: 'Date', color: '#4f6177' },
              ticks: { color: '#5e6e82' },
              grid: { color: 'rgba(0,0,0,0.06)' },
            },
            y: {
              title: { display: true, text: 'Number of Predictions', color: '#4f6177' },
              ticks: { color: '#5e6e82' },
              grid: { color: 'rgba(0,0,0,0.06)' },
              beginAtZero: true,
            },
          },
        },
      })
    }

    // Predictions by Barangay Chart
    if (locationCanvasRef.current && locationData?.data?.length > 0) {
      // Limit to top 12 barangays for readability
      const topLocations = locationData.data.slice(0, 12)
      chartRefs.current.location = new Chart(locationCanvasRef.current, {
        type: 'bar',
        data: {
          labels: topLocations.map((d) => d.location),
          datasets: [
            {
              label: 'Prediction Count',
              data: topLocations.map((d) => d.count),
              backgroundColor: 'rgba(107, 125, 146, 0.72)',
              borderColor: '#6B7D92',
              borderWidth: 2,
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#34465a', font: { size: 12 } } },
          },
          scales: {
            x: {
              ticks: { color: '#5e6e82' },
              grid: { color: 'rgba(0,0,0,0.06)' },
              beginAtZero: true,
            },
            y: {
              ticks: { color: '#5e6e82' },
              grid: { color: 'rgba(0,0,0,0.06)' },
            },
          },
        },
      })
    }
  }, [overTimeData, locationData])

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
          <div className="welcome-message">System Prediction Insights</div>
          <div className="top-nav-right">
            <div className="top-nav-icons">
              <span className="icon" aria-hidden="true">
                🔔
              </span>
              <span className="icon" aria-hidden="true">
                ✉
              </span>
            </div>
            <div className="model-visualization-badge">PREDICTION DATA</div>
            <div className="user-profile">
              <div className="avatar">AD</div>
              <span>Administrator</span>
            </div>
          </div>
        </div>

        <div className="dashboard-grid logs-grid visualizations-grid">
          <div className="card grid-item-span-3 visualization-summary-card">
            <div className="card-header">
              <h2 className="card-title">Prediction Activity Summary</h2>
            </div>
            {loading ? <p className="visualization-empty">Loading prediction visualizations...</p> : null}
            {error ? <p className="visualization-empty">Unable to load visualizations: {error}</p> : null}
            {!loading && !error && overTimeData && locationData ? (
              <div className="visualization-meta-grid">
                <div className="visualization-meta-item">
                  <p>Total Predictions</p>
                  <h3>{overTimeData.total}</h3>
                </div>
                <div className="visualization-meta-item">
                  <p>Active Barangays</p>
                  <h3>{locationData.data.length}</h3>
                </div>
              </div>
            ) : null}
          </div>

          <div className="card grid-item-span-3">
            <div className="card-header">
              <h2 className="card-title">Predictions Over Time</h2>
            </div>
            <div className="visualization-chart-wrap">
              <canvas ref={overTimeCanvasRef} className="weekly-trends-canvas" aria-label="Predictions over time chart" />
            </div>
          </div>

          <div className="card grid-item-span-3">
            <div className="card-header">
              <h2 className="card-title">Predictions by Barangay</h2>
            </div>
            <div className="visualization-chart-wrap large">
              <canvas ref={locationCanvasRef} className="weekly-trends-canvas" aria-label="Predictions by barangay location" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
