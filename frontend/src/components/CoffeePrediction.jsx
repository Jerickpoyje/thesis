import { useState, useEffect, useRef } from 'react'
import '../assets/css/coffee-prediction.css'
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

function makeProjection(w, h, pad = 30) {
  const dataW = bbox.maxX - bbox.minX
  const dataH = bbox.maxY - bbox.minY
  const scale  = Math.min((w - pad * 2) / dataW, (h - pad * 2) / dataH)
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

// ── Zoomable SVG Map ─────────────────────────────────────────
function AmadeoMap({ suits, hovered, setHovered, setTip }) {
  const wrapRef = useRef(null)
  const svgRef  = useRef(null)
  const [size, setSize] = useState({ w: 500, h: 420 })
  const [zoom, setZoom] = useState(1)
  const [pan,  setPan]  = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const lastPos  = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!wrapRef.current) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width
      setSize({ w, h: Math.max(340, w * 0.65) })
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
    <div className="cp-map-wrap" ref={wrapRef}>
      <div className="cp-zoom-controls">
        <button className="cp-zoom-btn" onClick={() => setZoom(z => Math.min(z + 0.3, 4))}>+</button>
        <button className="cp-zoom-btn" onClick={() => setZoom(z => Math.max(z - 0.3, 0.5))}>−</button>
        <button className="cp-zoom-btn cp-zoom-reset" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}>⌂</button>
      </div>
      <svg ref={svgRef} width={size.w} height={size.h} className="cp-svg"
        style={{ cursor: 'grab', display: 'block' }}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove}
        onMouseUp={onMouseUp} onMouseLeave={onMouseUp} onWheel={onWheel}>
        <rect width={size.w} height={size.h} fill="#dde8f0" />
        <g transform={transform}>
          {amadeoGeoJSON.features.map((feature, i) => {
            const name  = feature.properties.ADM4_EN
            const score = suits[name] ?? 0.5
            const s     = getSuitability(score)
            return (
              <path key={i} d={featureToPath(feature, project)}
                fill={s.fill} stroke="#fff" strokeWidth={1 / zoom}
                opacity={hovered === name ? 1 : 0.85}
                style={{ cursor: 'pointer', transition: 'opacity 0.12s' }}
                onMouseEnter={e => { setHovered(name); setTip({ show: true, x: e.clientX, y: e.clientY }) }}
                onMouseMove={e => setTip({ show: true, x: e.clientX, y: e.clientY })}
                onMouseLeave={() => { setHovered(null); setTip({ show: false, x: 0, y: 0 }) }}
              />
            )
          })}
        </g>
      </svg>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────
export default function CoffeePrediction() {
  const [inputs, setInputs] = useState({
    temperature: '22', humidity: '75', rainfall: '500',
    area_ha: 1.0, barangay: 'Pangil', year: 2025,
  })
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [clampNote, setClampNote] = useState('')
  const [hovered, setHovered] = useState(null)
  const [tip,     setTip]     = useState({ show: false, x: 0, y: 0 })

  const climateFields = [
    { key: 'temperature', label: 'Temperature', unit: '°C', min: 15, max: 35, step: 1, ideal: '18–24°C', placeholder: 'Enter temperature' },
    { key: 'humidity', label: 'Humidity', unit: '%', min: 30, max: 100, step: 1, ideal: '65–85%', placeholder: 'Enter humidity' },
    { key: 'rainfall', label: 'Annual Rainfall', unit: 'mm', min: 50, max: 2000, step: 10, ideal: '150–300 mm', placeholder: 'Enter annual rainfall' },
  ]

  function handleClimateChange(key, rawValue, min, max) {
    const nextDigits = rawValue.replace(/[^0-9]/g, '')
    if (!nextDigits) return
    const nextValue = Math.min(max, Math.max(min, Number(nextDigits)))
    set(key, String(nextValue))
  }

  function handleClimateKeyDown(event) {
    if (['e', 'E', '+', '-', '.'].includes(event.key)) {
      event.preventDefault()
    }
  }

  const climateInputs = {
    temperature: Number(inputs.temperature),
    humidity: Number(inputs.humidity),
    rainfall: Number(inputs.rainfall),
  }

  const suits = Object.fromEntries(
    amadeoGeoJSON.features.map((f, i) => {
      const base = computeScore(climateInputs.temperature, climateInputs.humidity, climateInputs.rainfall)
      const v = ((i * 7 + 3) % 11) / 100 - 0.05
      return [f.properties.ADM4_EN, Math.min(1, Math.max(0, base + v))]
    })
  )

  const baseScore = computeScore(climateInputs.temperature, climateInputs.humidity, climateInputs.rainfall)
  const baseSuit  = getSuitability(baseScore)
  const suitCount = Object.values(suits).filter(s => s >= 0.5).length

  async function handlePredict() {
    setLoading(true)
    setError(null)
    // Client-side validation to match backend schema and avoid 422
    const validationErrors = []
    if (climateInputs.temperature < 15 || climateInputs.temperature > 35) validationErrors.push('Temperature must be between 15 and 35°C')
    if (climateInputs.humidity < 30 || climateInputs.humidity > 100) validationErrors.push('Humidity must be between 30% and 100%')
    if (climateInputs.rainfall < 50 || climateInputs.rainfall > 2000) validationErrors.push('Annual Rainfall must be between 50 and 2000 mm')
    if (inputs.year < 2020 || inputs.year > 2035) validationErrors.push('Year must be between 2020 and 2035')
    if (validationErrors.length > 0) {
      setError(validationErrors.join('; '))
      setLoading(false)
      return
    }

    // Auto-clamp farm area to backend maximum to avoid 422s from accidental large input
    if (inputs.area_ha > 500) {
      setClampNote('Farm area exceeded 500 ha — clamped to 500 ha')
      setInputs(prev => ({ ...prev, area_ha: 500 }))
      // clear note after a short time
      window.setTimeout(() => setClampNote(''), 5000)
    }
    try {
      const payload = {
        ...inputs,
        ...climateInputs,
      }
      const res = await fetch(`${API_BASE}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        let bodyText = await res.text()
        try { bodyText = JSON.stringify(JSON.parse(bodyText), null, 2) } catch (e) {}
        throw new Error(`Server error ${res.status}: ${bodyText}`)
      }
      setResult(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function set(key, value) {
    setInputs(prev => ({ ...prev, [key]: value }))
  }

  const confidenceColor = result?.confidence === 'High' ? '#2d6e18' : result?.confidence === 'Medium' ? '#8a5c08' : '#8a1f1f'

  return (
    <div className="cp-wrapper">

      {/* Floating tooltip */}
      {tip.show && hovered && (
        <div className="cp-tooltip-fixed" style={{ left: tip.x + 14, top: tip.y - 60 }}>
          <strong>{hovered}</strong>
          <span style={{ color: getSuitability(suits[hovered] ?? 0.5).color }}>
            {getSuitability(suits[hovered] ?? 0.5).label}
          </span>
          <small>Score: {Math.round((suits[hovered] ?? 0.5) * 100)}/100</small>
        </div>
      )}

      {/* Header */}
      <div className="cp-header">
        <div className="cp-header-left">
          <span className="cp-header-icon">☕</span>
          <div>
            <h1 className="cp-title">Coffee Production Predictor</h1>
            <p className="cp-subtitle">Amadeo, Cavite · SVR Regression Model · Admin Panel</p>
          </div>
        </div>
        <span className="cp-live-badge">● Live</span>
      </div>

      <div className="cp-layout">

        {/* ── Sidebar ── */}
        <aside className="cp-sidebar">

          {/* Climate inputs */}
          <div className="cp-card">
            <p className="cp-card-label">Climate Parameters</p>
            {climateFields.map(({ key, label, unit, min, max, step, ideal, placeholder }) => (
              <div key={key} className="cp-climate-field">
                <div className="cp-climate-head">
                  <span className="cp-field-label">{label}</span>
                  <span className="cp-climate-ideal">Ideal: {ideal}</span>
                </div>
                <div className="cp-climate-row">
                  <input
                    type="number"
                    min={min}
                    max={max}
                    step={step}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder={placeholder}
                    value={inputs[key]}
                    onChange={e => handleClimateChange(key, e.target.value, min, max)}
                    onKeyDown={handleClimateKeyDown}
                    className="cp-input cp-climate-input"
                    aria-label={label}
                  />
                  <span className="cp-climate-unit">{unit}</span>
                </div>
                <div className="cp-climate-foot">
                  <span>{min}{unit}</span>
                  <span>{max}{unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Farm details */}
          <div className="cp-card">
            <p className="cp-card-label">Farm Details</p>
            <div className="cp-field">
              <label className="cp-field-label">Barangay</label>
              <select className="cp-select" value={inputs.barangay}
                onChange={e => set('barangay', e.target.value)}>
                {BARANGAYS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="cp-field">
              <label className="cp-field-label">Farm Area (hectares)</label>
              <input type="number" className="cp-input"
                min={0.1} max={500} step={0.1} value={inputs.area_ha}
                onChange={e => set('area_ha', +e.target.value)} />
            </div>
            <div className="cp-field">
              <label className="cp-field-label">Prediction Year</label>
              <input type="number" className="cp-input"
                min={2020} max={2035} step={1} value={inputs.year}
                onChange={e => set('year', +e.target.value)} />
            </div>
          </div>

          {/* Predict button */}
          <button className="cp-predict-btn" onClick={handlePredict} disabled={loading}>
            {loading ? 'Predicting…' : '⚡ Run Prediction'}
          </button>
          {clampNote && (
            <div className="cp-clamp-note" style={{ color: '#6b7d92', marginTop: 8, fontWeight: 600 }}>
              {clampNote}
            </div>
          )}
          {error && (
            <div className="cp-error">
              ⚠ {error}
            </div>
          )}

          {/* Live suitability */}
          <div className="cp-card">
            <p className="cp-card-label">Live Suitability</p>
            <div className="cp-suit-pill"
              style={{ background: baseSuit.fill + '22', color: baseSuit.color, border: `1.5px solid ${baseSuit.fill}` }}>
              {baseSuit.label}
            </div>
            <div className="cp-mini-grid">
              <div className="cp-mini-cell">
                <span className="cp-mini-label">Suitable Barangays</span>
                <span className="cp-mini-val">{suitCount}<small>/{amadeoGeoJSON.features.length}</small></span>
              </div>
              <div className="cp-mini-cell">
                <span className="cp-mini-label">Avg Score</span>
                <span className="cp-mini-val">{Math.round(baseScore * 100)}<small>/100</small></span>
              </div>
            </div>
          </div>

          {/* Combined Prediction Results */}
          {result && (
            <div className="cp-card">
              <p className="cp-card-label">Prediction Results</p>

              {/* Confidence badge */}
              <div className="cp-result-meta">
                <span className="cp-conf-badge" style={{ background: confidenceColor + '22', color: confidenceColor, border: `1px solid ${confidenceColor}` }}>
                  {result.confidence} Suitable
                </span>
                <span className="cp-barangay-tag">{result.barangay} · {result.year}</span>
              </div>

              {/* Total production — big number */}
              <div className="cp-result-total">
                <span className="cp-result-total-num">{result.breakdown.total.toFixed(3)}</span>
                <span className="cp-result-total-unit">metric tons</span>
              </div>

              {/* Per coffee type breakdown */}
              <div className="cp-breakdown">
                {[
                  { key: 'robusta',  label: 'Robusta',  color: '#3a7010' },
                  { key: 'liberica', label: 'Liberica', color: '#8a5c08' },
                  { key: 'excelsa',  label: 'Excelsa',  color: '#1a5c9e' },
                ].map(({ key, label, color }) => (
                  <div key={key} className="cp-bd-row">
                    <span className="cp-bd-label" style={{ color }}>{label}</span>
                    <span className="cp-bd-val">{result.breakdown[key].toFixed(4)} MT</span>
                  </div>
                ))}
              </div>


            </div>
          )}
        </aside>

        {/* ── Map Panel ── */}
        <main className="cp-map-panel">
          <div className="cp-map-top">
            <p className="cp-card-label" style={{ margin: 0 }}>
              Barangay Suitability Map — Amadeo, Cavite
            </p>
            <div className="cp-legend">
              {[
                { l: 'Highly Suitable',     f: '#4a9e2f' },
                { l: 'Moderately Suitable', f: '#e09a1a' },
                { l: 'Marginal',            f: '#9e9b93' },
                { l: 'Not Suitable',        f: '#d44444' },
              ].map(({ l, f }) => (
                <div key={l} className="cp-leg-item">
                  <span className="cp-leg-dot" style={{ background: f }} />{l}
                </div>
              ))}
            </div>
          </div>

          <AmadeoMap suits={suits} hovered={hovered} setHovered={setHovered} setTip={setTip} />

          {/* Barangay table */}
          <div className="cp-table-wrap">
            <p className="cp-table-title">All Barangays — Ranked by Suitability</p>
            <div className="cp-table-scroll">
              <table className="cp-table">
                <thead>
                  <tr><th>#</th><th>Barangay</th><th>Score</th><th>Suitability</th></tr>
                </thead>
                <tbody>
                  {Object.entries(suits).sort((a, b) => b[1] - a[1]).map(([name, score], i) => {
                    const s = getSuitability(score)
                    return (
                      <tr key={name} className={hovered === name ? 'cp-row-hov' : ''}>
                        <td className="cp-td-rank">{i + 1}</td>
                        <td>{name}</td>
                        <td>{Math.round(score * 100)}</td>
                        <td>
                          <span className="cp-tb-badge" style={{
                            background: s.fill + '22', color: s.color, border: `1px solid ${s.fill}`,
                          }}>{s.label}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="cp-info-box">
            <strong>About Amadeo Coffee</strong>
            Amadeo, Cavite is the Coffee Capital of the Philippines. Its highland elevation (300–700 m ASL)
            supports Robusta, Liberica, and Excelsa varieties. Adjust the climate parameters and
            farm details to generate a production prediction for any barangay.
          </div>
        </main>
      </div>
    </div>
  )
}