import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import '../assets/css/stylesss.css'
import '../assets/css/main.css'
import '../assets/css/user-predictor.css'
import { isSameAppRoute, toAppRoute } from '../utils/navigation'
import { ADMIN_AUTH_CHANGED_EVENT, isAdminAuthenticated } from '../utils/auth'
import amadeoGeoJSON from './amadeo.json'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const BARANGAYS = [
  'Banaybanay', 'Bucal', 'Dagatan', 'Halang', 'Loma', 'Maitim I',
  'Maymangga', 'Minantok K', 'Pangil', 'Barangay I', 'Barangay II',
  'Barangay III', 'Barangay IV', 'Barangay V', 'Barangay VI', 'Barangay VII',
  'Barangay VIII', 'Barangay IX', 'Barangay X', 'Barangay XI', 'Barangay XII',
  'Salaban', 'Talon', 'Tamacan', 'Buho', 'Minantok S',
]

// ── Suitability helpers ──────────────────────────────────────
function computeScore(temp, hum, rain) {
  const t = temp >= 18 && temp <= 24 ? 1 : temp >= 15 ? 0.6 : 0.3
  const h = hum  >= 65 && hum  <= 85 ? 1 : hum  >= 55 ? 0.7 : 0.4
  const r = rain >= 150 && rain <= 300 ? 1 : rain >= 100 ? 0.6 : 0.3
  return t * 0.4 + h * 0.3 + r * 0.3
}

function getSuitability(score) {
  if (score >= 0.75) return { label: 'Highly Suitable',     fill: '#4a9e2f', color: '#2d6e18' }
  if (score >= 0.50) return { label: 'Moderately Suitable', fill: '#e09a1a', color: '#8a5c08' }
  if (score >= 0.30) return { label: 'Marginal',            fill: '#9e9b93', color: '#5a5854' }
  return               { label: 'Not Suitable',             fill: '#d44444', color: '#8a1f1f' }
}

// ── GeoJSON projection ───────────────────────────────────────
function getBBox() {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  amadeoGeoJSON.features.forEach(f => {
    const rings = f.geometry.type === 'Polygon'
      ? f.geometry.coordinates : f.geometry.coordinates.flat()
    rings.forEach(ring => ring.forEach(([x, y]) => {
      if (x < minX) minX = x; if (x > maxX) maxX = x
      if (y < minY) minY = y; if (y > maxY) maxY = y
    }))
  })
  return { minX, minY, maxX, maxY }
}

const bbox = getBBox()

function makeProjection(w, h, pad = 24) {
  const dataW = bbox.maxX - bbox.minX
  const dataH = bbox.maxY - bbox.minY
  const scale  = Math.min((w - pad*2) / dataW, (h - pad*2) / dataH)
  const offsetX = (w - dataW * scale) / 2
  const offsetY = (h - dataH * scale) / 2
  return ([lng, lat]) => [
    offsetX + (lng - bbox.minX) * scale,
    h - offsetY - (lat - bbox.minY) * scale,
  ]
}

function featureToPath(feature, project) {
  const { type, coordinates } = feature.geometry
  const rings = type === 'Polygon' ? coordinates : coordinates.flat()
  return rings.map(ring =>
    ring.map((pt, i) => {
      const [x, y] = project(pt)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    }).join(' ') + ' Z'
  ).join(' ')
}

// ── Suitability Map Component ─────────────────────────────────
function SuitabilityMap({ suits }) {
  const wrapRef = useRef(null)
  const svgRef  = useRef(null)
  const [size, setSize]     = useState({ w: 400, h: 320 })
  const [hovered, setHovered] = useState(null)
  const [tip, setTip]       = useState({ x: 0, y: 0, show: false })
  const [zoom, setZoom]     = useState(1)
  const [pan, setPan]       = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const lastPos  = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!wrapRef.current) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width
      setSize({ w, h: Math.max(260, w * 0.75) })
    })
    ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [])

  const project   = makeProjection(size.w, size.h)
  const cx        = size.w / 2
  const cy        = size.h / 2
  const transform = `translate(${cx + pan.x},${cy + pan.y}) scale(${zoom}) translate(${-cx},${-cy})`

  const onMouseDown = e => { dragging.current = true; lastPos.current = { x: e.clientX, y: e.clientY } }
  const onMouseMove = e => {
    if (!dragging.current) return
    setPan(p => ({ x: p.x + e.clientX - lastPos.current.x, y: p.y + e.clientY - lastPos.current.y }))
    lastPos.current = { x: e.clientX, y: e.clientY }
  }
  const onMouseUp  = () => { dragging.current = false }
  const onWheel    = e => { e.preventDefault(); setZoom(z => Math.min(Math.max(z + (e.deltaY > 0 ? -0.15 : 0.15), 0.5), 4)) }

  return (
    <div className="up-map-wrap" ref={wrapRef}>
      {/* Zoom controls */}
      <div className="up-zoom-controls">
        <button className="up-zoom-btn" onClick={() => setZoom(z => Math.min(z + 0.3, 4))}>+</button>
        <button className="up-zoom-btn" onClick={() => setZoom(z => Math.max(z - 0.3, 0.5))}>−</button>
        <button className="up-zoom-btn" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}>⌂</button>
      </div>

      {/* Tooltip */}
      {tip.show && hovered && (
        <div className="up-map-tip" style={{ left: tip.x + 12, top: tip.y - 55 }}>
          <strong>{hovered}</strong>
          <span style={{ color: getSuitability(suits[hovered] ?? 0.5).color }}>
            {getSuitability(suits[hovered] ?? 0.5).label}
          </span>
          <small>Score: {Math.round((suits[hovered] ?? 0.5) * 100)}/100</small>
        </div>
      )}

      <svg ref={svgRef} width={size.w} height={size.h}
        style={{ display: 'block', cursor: 'grab' }}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove}
        onMouseUp={onMouseUp} onMouseLeave={onMouseUp} onWheel={onWheel}>
        <rect width={size.w} height={size.h} fill="#1a3a1a" rx="10" />
        <g transform={transform}>
          {amadeoGeoJSON.features.map((feature, i) => {
            const name  = feature.properties.ADM4_EN
            const score = suits[name] ?? 0.5
            const s     = getSuitability(score)
            return (
              <path key={i} d={featureToPath(feature, project)}
                fill={s.fill} stroke="rgba(255,255,255,0.3)" strokeWidth={1 / zoom}
                opacity={hovered === name ? 1 : 0.8}
                style={{ cursor: 'pointer', transition: 'opacity 0.12s' }}
                onMouseEnter={e => { setHovered(name); setTip({ x: e.clientX, y: e.clientY, show: true }) }}
                onMouseMove={e => setTip({ x: e.clientX, y: e.clientY, show: true })}
                onMouseLeave={() => { setHovered(null); setTip(p => ({ ...p, show: false })) }}
              />
            )
          })}
        </g>
      </svg>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────
export default function IndexPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => isAdminAuthenticated())

  const [inputs, setInputs] = useState({
    temperature: 22, humidity: 75, rainfall: 200,
    area_ha: 1.0, barangay: 'Pangil', year: new Date().getFullYear(),
  })
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    const sync = () => setIsAdminLoggedIn(isAdminAuthenticated())
    window.addEventListener(ADMIN_AUTH_CHANGED_EVENT, sync)
    window.addEventListener('focus', sync)
    return () => {
      window.removeEventListener(ADMIN_AUTH_CHANGED_EVENT, sync)
      window.removeEventListener('focus', sync)
    }
  }, [])

  // CRITICAL: User pages must NEVER show edit mode for regular users
  // But admins CAN edit these pages - only strip ?edit=true if NOT admin
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.has('edit') && !isAdminLoggedIn) {
      navigate('/predictive-map', { replace: true })
    }
  }, [navigate, location.search, isAdminLoggedIn])



  const handleNavClick = (event, href) => {
    const targetRoute = toAppRoute(href)
    if (!targetRoute) { event.preventDefault(); return }
    if (isSameAppRoute(location, targetRoute)) { event.preventDefault(); return }
    event.preventDefault()
    navigate(targetRoute)
  }

  function set(key, value) {
    setInputs(prev => ({ ...prev, [key]: value }))
    setResult(null)
  }

  async function handlePredict() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/predict-public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      setResult(await res.json())
    } catch (e) {
      setError('Unable to reach prediction server. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  // Per-barangay suitability scores
  const suits = Object.fromEntries(
    amadeoGeoJSON.features.map((f, i) => {
      const base = computeScore(inputs.temperature, inputs.humidity, inputs.rainfall)
      const v = ((i * 7 + 3) % 11) / 100 - 0.05
      return [f.properties.ADM4_EN, Math.min(1, Math.max(0, base + v))]
    })
  )

  const score     = computeScore(inputs.temperature, inputs.humidity, inputs.rainfall)
  const suit      = getSuitability(score)
  const confColor = result?.confidence === 'High' ? '#4a9e2f'
    : result?.confidence === 'Medium' ? '#e09a1a' : '#d44444'

  return (
    <div className="up-page">

      {/* ── Navbar ── */}
      <div className="up-nav">
        <div className="up-nav-logo">
          <span>🌿</span>
          <span>Amadeo Coffee</span>
        </div>
        <nav className="up-nav-links">
          <a href="home.html"  onClick={e => handleNavClick(e, 'home.html')}>Home</a>
          <a href="about.html" onClick={e => handleNavClick(e, 'about.html')}>About</a>
          <a href="#"          onClick={e => e.preventDefault()}>Contact</a>
          <a href="Index.html" className="up-nav-active" onClick={e => handleNavClick(e, 'Index.html')}>Predictor</a>
        </nav>
      </div>

      {/* ── Hero ── */}
      <div className="up-hero">
        <div className="up-hero-text">
          <span className="up-hero-badge">☕ Coffee Yield Predictor</span>
          <h1 className="up-hero-title">Predict Coffee Production in Amadeo</h1>
          <p className="up-hero-sub">
            Enter your farm's climate conditions to get an estimated coffee production forecast
            for Robusta, Liberica, and Excelsa varieties.
          </p>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="up-content">

        {/* ── Left: inputs ── */}
        <div className="up-left-col">

          {/* Climate inputs */}
          <div className="up-card">
            <h2 className="up-card-title">🌡 Climate Parameters</h2>
            {[
              { key: 'temperature', label: 'Temperature',    unit: '°C',  min: 15,  max: 35,   step: 1,  ideal: '18–24°C' },
              { key: 'humidity',    label: 'Humidity',       unit: '%',   min: 30,  max: 100,  step: 1,  ideal: '65–85%' },
              { key: 'rainfall',    label: 'Annual Rainfall',unit: ' mm', min: 50,  max: 2000, step: 10, ideal: '150–300 mm' },
            ].map(({ key, label, unit, min, max, step, ideal }) => (
              <div key={key} className="up-slider-group">
                <div className="up-slider-top">
                  <span className="up-slider-label">{label}</span>
                  <span className="up-slider-val">{inputs[key]}{unit}</span>
                </div>
                <input type="range" min={min} max={max} step={step}
                  value={inputs[key]} onChange={e => set(key, +e.target.value)}
                  className="up-slider" />
                <div className="up-slider-foot">
                  <span>{min}{unit}</span>
                  <span className="up-ideal">Ideal: {ideal}</span>
                  <span>{max}{unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Farm details */}
          <div className="up-card">
            <h2 className="up-card-title">🌿 Farm Details</h2>
            <div className="up-field">
              <label className="up-field-label">Barangay</label>
              <select className="up-select" value={inputs.barangay}
                onChange={e => set('barangay', e.target.value)}>
                {BARANGAYS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="up-field-row">
              <div className="up-field">
                <label className="up-field-label">Farm Area (hectares)</label>
                <input type="number" className="up-input"
                  min={0.1} max={500} step={0.1} value={inputs.area_ha}
                  onChange={e => set('area_ha', +e.target.value)} />
              </div>
              <div className="up-field">
                <label className="up-field-label">Prediction Year</label>
                <input type="number" className="up-input"
                  min={2020} max={2035} step={1} value={inputs.year}
                  onChange={e => set('year', +e.target.value)} />
              </div>
            </div>

            <button className="up-predict-btn" onClick={handlePredict} disabled={loading}>
              {loading ? '⏳ Predicting...' : '⚡ Get Prediction'}
            </button>

            {error && <p className="up-error">⚠ {error}</p>}

            <p className="up-disclaimer">
              * This prediction is for informational purposes only. Results are not saved.
              For official consultation, please contact the FITS Center.
            </p>
          </div>

          {/* Result card */}
          {result && (
            <div className="up-card up-result-card-inline">
              <h2 className="up-card-title">📊 Prediction Results</h2>
              <div className="up-result-meta">
                <span className="up-conf-pill" style={{ color: confColor, background: confColor + '18', border: `1px solid ${confColor}` }}>
                  {result.confidence} Confidence
                </span>
                <span className="up-result-loc">{result.barangay} · {result.year}</span>
              </div>
              <div className="up-result-total">
                <span className="up-result-num">{result.breakdown.total.toFixed(3)}</span>
                <span className="up-result-unit">metric tons</span>
              </div>
              <p className="up-result-subtitle">Estimated total coffee production</p>
              <div className="up-breakdown">
                {[
                  { key: 'robusta',  label: 'Robusta',  color: '#4a9e2f' },
                  { key: 'liberica', label: 'Liberica', color: '#e09a1a' },
                  { key: 'excelsa',  label: 'Excelsa',  color: '#4a7abf' },
                ].map(({ key, label, color }) => {
                  const pct = result.breakdown.total > 0
                    ? (result.breakdown[key] / result.breakdown.total) * 100 : 0
                  return (
                    <div key={key} className="up-bar-row">
                      <span className="up-bar-label" style={{ color }}>{label}</span>
                      <div className="up-bar-track">
                        <div className="up-bar-fill" style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <span className="up-bar-val">{result.breakdown[key].toFixed(3)} MT</span>
                    </div>
                  )
                })}
              </div>
              <div className="up-result-note">
                <strong>What this means:</strong> Your farm in <strong>{result.barangay}</strong> is
                estimated to produce approximately <strong>{result.breakdown.total.toFixed(3)} metric
                tons</strong> of coffee in <strong>{result.year}</strong>.
                For professional guidance, visit the FITS Center in Amadeo.
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Map ── */}
        <div className="up-right-col">
          <div className="up-card up-map-card">
            <h2 className="up-card-title">🗺 Barangay Suitability Map</h2>
            <p className="up-map-subtitle">
              Map colors update live as you adjust the climate sliders.
              Hover over a barangay to see its suitability score.
            </p>

            {/* Legend */}
            <div className="up-map-legend">
              {[
                { l: 'Highly Suitable',     f: '#4a9e2f' },
                { l: 'Moderately Suitable', f: '#e09a1a' },
                { l: 'Marginal',            f: '#9e9b93' },
                { l: 'Not Suitable',        f: '#d44444' },
              ].map(({ l, f }) => (
                <div key={l} className="up-leg-item">
                  <span className="up-leg-dot" style={{ background: f }} />{l}
                </div>
              ))}
            </div>

            {/* Map */}
            <SuitabilityMap suits={suits} />

            {/* Overall suitability */}
            <div className="up-suit-row" style={{ marginTop: '12px' }}>
              <span className="up-suit-label">Overall Climate Suitability</span>
              <span className="up-suit-pill" style={{ color: suit.color, background: suit.fill + '22', border: `1px solid ${suit.fill}` }}>
                {suit.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="up-footer">
        <p>© 2026 Cavite Upland Coffee Analytics · Amadeo, Cavite</p>
      </footer>
    </div>
  )
}