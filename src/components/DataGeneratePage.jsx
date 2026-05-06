import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import '../assets/css/admin-style.css'
import { isSameAppRoute, toAppRoute } from '../utils/navigation'
import SidebarSection from './SidebarSection'

const FADE_DURATION_MS = 500

const commodityOptions = [
  'Coffee - Robusta',
  'Coffee - Excelsa',
  'Coffee - Liberica',
  'Coffee - Mixed',
]

const barangayOptions = [
  'Banaybanay',
  'Bucal',
  'Dagatan',
  'Halang',
  'Loma',
  'Maitim I',
  'Maymangga',
  'Minantok K',
  'Pangil',
  'Barangay I',
  'Barangay II',
  'Barangay III',
  'Barangay IV',
  'Barangay V',
  'Barangay VI',
  'Barangay VII',
  'Barangay VIII',
  'Barangay IX',
  'Barangay X',
  'Barangay XI',
  'Barangay XII',
  'Salaban',
  'Talon',
  'Tamacan',
  'Buho',
  'Minantok S',
]

const defaultTableData = [
  {
    id: 1,
    commodity: 'Coffee - Robusta',
    barangay: 'Banaybanay',
    areaPlanted: 50,
    areaHarvested: 45,
    production: 225,
    notes: '',
  },
  {
    id: 2,
    commodity: 'Coffee - Excelsa',
    barangay: 'Bucal',
    areaPlanted: 30,
    areaHarvested: 28,
    production: 140,
    notes: '',
  },
]

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

const settingsLinks = [{ label: 'Return to Home', href: 'home.html?admin=true' }]

export default function DataGeneratePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isFadingOut, setIsFadingOut] = useState(false)
  const timeoutRef = useRef(null)
  const [tableData, setTableData] = useState(defaultTableData)
  const [nextId, setNextId] = useState(3)

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

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleCellChange = (id, field, value) => {
    setTableData((prevData) =>
      prevData.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: field === 'areaPlanted' || field === 'areaHarvested' || field === 'production' ? parseFloat(value) || 0 : value,
            }
          : row
      )
    )
  }

  const handleAddRow = () => {
    const newRow = {
      id: nextId,
      commodity: 'Coffee - Robusta',
      barangay: 'Banaybanay',
      areaPlanted: 0,
      areaHarvested: 0,
      production: 0,
      notes: '',
    }
    setTableData([...tableData, newRow])
    setNextId(nextId + 1)
  }

  const handleDeleteRow = (id) => {
    if (tableData.length === 1) {
      alert('You must keep at least one row in the table.')
      return
    }
    setTableData(tableData.filter((row) => row.id !== id))
  }

  const handleExportCSV = () => {
    const headers = ['Commodity', 'Barangay', 'Area Planted (ha)', 'Area Harvested (ha)', 'Production (MT)', 'Notes']
    const rows = tableData.map((row) => [
      row.commodity,
      row.barangay,
      row.areaPlanted,
      row.areaHarvested,
      row.production,
      row.notes,
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `coffee-data-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExportExcel = () => {
    // Simple Excel export using CSV format (can be opened in Excel)
    const headers = ['Commodity', 'Barangay', 'Area Planted (ha)', 'Area Harvested (ha)', 'Production (MT)', 'Notes']
    const rows = tableData.map((row) => [
      row.commodity,
      row.barangay,
      row.areaPlanted,
      row.areaHarvested,
      row.production,
      row.notes,
    ])

    let content = headers.join('\t') + '\n'
    rows.forEach((row) => {
      content += row.join('\t') + '\n'
    })

    const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `coffee-data-${new Date().toISOString().split('T')[0]}.xlsx`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className={`admin-dashboard-body${isFadingOut ? ' fade-out' : ''}`}>
      <div className="sidebar">
        <div className="logo-container">
          <span className="logo-icon">🌱</span>
          <span className="logo-text">Data Generation & Consolidation</span>
        </div>
        <nav className="sidebar-nav" aria-label="Sidebar navigation">
          <SidebarSection title="Quick Links" links={quickLinks} onNavigate={handleSidebarNavigation} />
          <SidebarSection title="Data Tables" links={dataTableLinks} onNavigate={handleSidebarNavigation} />
          <SidebarSection title="Settings" links={settingsLinks} onNavigate={handleSidebarNavigation} />
        </nav>
      </div>

      <div className="main-content">
        <div className="top-nav">
          <div className="welcome-message">Agricultural Data Consolidation Tool</div>
          <div className="top-nav-right">
            <div className="model-visualization-badge">DATA ENTRY</div>
            <div className="user-profile">
              <div className="avatar">AD</div>
              <span>Administrator</span>
            </div>
          </div>
        </div>

        <div className="dashboard-grid logs-grid">
          <div className="card grid-item-span-3">
            <div className="card-header">
              <h2 className="card-title">Coffee Production Data Entry</h2>
              <p style={{ fontSize: '0.85rem', color: '#7a8b9a', marginTop: '4px' }}>
                Consolidated agricultural data for reporting and analysis
              </p>
            </div>

            {/* Toolbar */}
            <div
              style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '16px',
                flexWrap: 'wrap',
                padding: '0 16px',
              }}
            >
              <button
                type="button"
                onClick={handleAddRow}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #2d6e18',
                  background: '#2d6e18',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                + Add Row
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #6B7D92',
                  background: '#fff',
                  color: '#6B7D92',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                📥 Export CSV
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #6B7D92',
                  background: '#fff',
                  color: '#6B7D92',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                📊 Export Excel
              </button>
              <button
                type="button"
                onClick={handlePrint}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #6B7D92',
                  background: '#fff',
                  color: '#6B7D92',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                🖨️ Print
              </button>
            </div>

            {/* Table */}
            <div
              style={{
                overflowX: 'auto',
                padding: '0 16px 16px 16px',
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.875rem',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#f5f7f9', borderBottom: '2px solid #d4dce4' }}>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'left',
                        fontWeight: 700,
                        color: '#34465a',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Commodity
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'left',
                        fontWeight: 700,
                        color: '#34465a',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Barangay
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        fontWeight: 700,
                        color: '#34465a',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Area Planted (ha)
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        fontWeight: 700,
                        color: '#34465a',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Area Harvested (ha)
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        fontWeight: 700,
                        color: '#34465a',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Production (MT)
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'left',
                        fontWeight: 700,
                        color: '#34465a',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Notes
                    </th>
                    <th
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        fontWeight: 700,
                        color: '#34465a',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, index) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #e8ecf0' }}>
                      <td style={{ padding: '12px' }}>
                        <select
                          value={row.commodity}
                          onChange={(e) => handleCellChange(row.id, 'commodity', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            border: '1px solid #d4dce4',
                            fontSize: '0.875rem',
                            fontFamily: 'inherit',
                          }}
                        >
                          {commodityOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <select
                          value={row.barangay}
                          onChange={(e) => handleCellChange(row.id, 'barangay', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            border: '1px solid #d4dce4',
                            fontSize: '0.875rem',
                            fontFamily: 'inherit',
                          }}
                        >
                          {barangayOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <input
                          type="number"
                          value={row.areaPlanted}
                          onChange={(e) => handleCellChange(row.id, 'areaPlanted', e.target.value)}
                          style={{
                            width: '90%',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            border: '1px solid #d4dce4',
                            fontSize: '0.875rem',
                            textAlign: 'center',
                          }}
                        />
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <input
                          type="number"
                          value={row.areaHarvested}
                          onChange={(e) => handleCellChange(row.id, 'areaHarvested', e.target.value)}
                          style={{
                            width: '90%',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            border: '1px solid #d4dce4',
                            fontSize: '0.875rem',
                            textAlign: 'center',
                          }}
                        />
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <input
                          type="number"
                          value={row.production}
                          onChange={(e) => handleCellChange(row.id, 'production', e.target.value)}
                          style={{
                            width: '90%',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            border: '1px solid #d4dce4',
                            fontSize: '0.875rem',
                            textAlign: 'center',
                          }}
                        />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <input
                          type="text"
                          value={row.notes}
                          onChange={(e) => handleCellChange(row.id, 'notes', e.target.value)}
                          placeholder="Optional notes"
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            border: '1px solid #d4dce4',
                            fontSize: '0.875rem',
                          }}
                        />
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(row.id)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '4px',
                            border: '1px solid #e85c5c',
                            background: '#fff',
                            color: '#e85c5c',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Stats */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                padding: '16px',
                borderTop: '1px solid #e8ecf0',
                backgroundColor: '#f9fafb',
              }}
            >
              <div>
                <p style={{ fontSize: '0.75rem', color: '#7a8b9a', marginBottom: '4px' }}>Total Rows</p>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#34465a' }}>{tableData.length}</h3>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#7a8b9a', marginBottom: '4px' }}>Total Area Planted (ha)</p>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#34465a' }}>
                  {tableData.reduce((sum, row) => sum + row.areaPlanted, 0).toFixed(1)}
                </h3>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#7a8b9a', marginBottom: '4px' }}>Total Area Harvested (ha)</p>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#34465a' }}>
                  {tableData.reduce((sum, row) => sum + row.areaHarvested, 0).toFixed(1)}
                </h3>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#7a8b9a', marginBottom: '4px' }}>Total Production (MT)</p>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#34465a' }}>
                  {tableData.reduce((sum, row) => sum + row.production, 0).toFixed(1)}
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
