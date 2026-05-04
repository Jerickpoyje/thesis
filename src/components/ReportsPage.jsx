import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../assets/css/admin-style.css'
import { toAppRoute } from '../utils/navigation'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const FADE_DURATION_MS = 500
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const quickLinks = [
  { label: 'Predictive Map', href: 'admin.html?view=map' },
  { label: 'Analytics Dashboard', href: 'admin.html' },
  { label: 'Content Management', href: 'cms.html' },
  { label: 'User Requests', href: 'users.html' },
  { label: 'Generate Reports', href: 'reports.html', isActive: true },
]

const dataTableLinks = [
  { label: 'System Logs', href: 'logs.html' },
]

const settingsLinks = [
  { label: 'Account Settings', href: 'profile.html' },
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

export default function ReportsPage() {
  const navigate = useNavigate()
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [predictionLogs, setPredictionLogs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedFormat, setSelectedFormat] = useState('pdf')
  const timeoutRef = useRef(null)

  // Fetch prediction logs from database
  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`${API_BASE}/dashboard`)
        if (response.ok) {
          const data = await response.json()
          setPredictionLogs(data.recent_logs || [])
        }
      } catch (error) {
        console.error('Error fetching prediction logs:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLogs()
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
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

  // Export to CSV
  const exportToCSV = () => {
    if (!predictionLogs.length) {
      alert('No data to export')
      return
    }

    const headers = [
      'Date',
      'Barangay',
      'Temperature (°C)',
      'Humidity (%)',
      'Rainfall (mm)',
      'Area (ha)',
      'Robusta (MT)',
      'Liberica (MT)',
      'Excelsa (MT)',
      'Total (MT)',
      'Suitability',
      'Confidence',
    ]

    const rows = predictionLogs.map((log) => [
      new Date(log.created_at).toLocaleString('en-PH'),
      log.barangay_name || '-',
      log.temperature_c || '-',
      log.humidity_pct || '-',
      log.annual_rainfall_mm || '-',
      log.area_ha || '-',
      log.m2_robusta_mt || '-',
      log.m2_liberica_mt || '-',
      log.m2_excelsa_mt || '-',
      log.m2_total_mt || '-',
      log.suitability_label || '-',
      log.confidence || '-',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prediction-logs-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  // Export to Excel
  const exportToExcel = () => {
    if (!predictionLogs.length) {
      alert('No data to export')
      return
    }

    const data = predictionLogs.map((log) => ({
      Date: new Date(log.created_at).toLocaleString('en-PH'),
      Barangay: log.barangay_name || '-',
      'Temp (°C)': log.temperature_c || '-',
      'Humidity (%)': log.humidity_pct || '-',
      'Rainfall (mm)': log.annual_rainfall_mm || '-',
      'Area (ha)': log.area_ha || '-',
      'Robusta (MT)': log.m2_robusta_mt || '-',
      'Liberica (MT)': log.m2_liberica_mt || '-',
      'Excelsa (MT)': log.m2_excelsa_mt || '-',
      'Total (MT)': log.m2_total_mt || '-',
      Suitability: log.suitability_label || '-',
      Confidence: log.confidence || '-',
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Prediction Logs')

    // Add styling
    ws['!cols'] = [
      { wch: 20 }, // Date
      { wch: 15 }, // Barangay
      { wch: 10 }, // Temp
      { wch: 10 }, // Humidity
      { wch: 12 }, // Rainfall
      { wch: 10 }, // Area
      { wch: 12 }, // Robusta
      { wch: 12 }, // Liberica
      { wch: 12 }, // Excelsa
      { wch: 10 }, // Total
      { wch: 15 }, // Suitability
      { wch: 12 }, // Confidence
    ]

    XLSX.writeFile(wb, `prediction-logs-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // Export to PDF
  const exportToPDF = () => {
    if (!predictionLogs.length) {
      alert('No data to export')
      return
    }

    const doc = new jsPDF('l', 'mm', 'a4') // landscape orientation
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    let yPosition = 15

    // Title
    doc.setFontSize(16)
    doc.text('Coffee Prediction Logs Report', pageWidth / 2, yPosition, { align: 'center' })

    // Date
    doc.setFontSize(10)
    yPosition += 10
    doc.text(`Generated: ${new Date().toLocaleString('en-PH')}`, 14, yPosition)
    doc.text(`Total Records: ${predictionLogs.length}`, pageWidth - 50, yPosition)

    // Table
    yPosition += 15
    const headers = [
      'Date',
      'Barangay',
      'Temp',
      'Humidity',
      'Rainfall',
      'Area',
      'Robusta',
      'Liberica',
      'Excelsa',
      'Total',
      'Suitability',
      'Confidence',
    ]
    const rows = predictionLogs.map((log) => [
      new Date(log.created_at).toLocaleDateString('en-PH'),
      (log.barangay_name || '-').substring(0, 10),
      log.temperature_c || '-',
      log.humidity_pct || '-',
      log.annual_rainfall_mm || '-',
      log.area_ha || '-',
      (log.m2_robusta_mt || '-').toString().substring(0, 5),
      (log.m2_liberica_mt || '-').toString().substring(0, 5),
      (log.m2_excelsa_mt || '-').toString().substring(0, 5),
      (log.m2_total_mt || '-').toString().substring(0, 5),
      log.suitability_label || '-',
      log.confidence || '-',
    ])

    doc.autoTable({
      head: [headers],
      body: rows,
      startY: yPosition,
      margin: { top: 10, right: 10, bottom: 10, left: 10 },
      headStyles: { fillColor: [10, 61, 98], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { textColor: [0, 0, 0] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
      },
      didDrawPage: (data) => {
        // Footer
        const pageCount = doc.internal.pages.length - 1
        doc.setFontSize(8)
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        )
      },
    })

    doc.save(`prediction-logs-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const handleExport = () => {
    switch (selectedFormat) {
      case 'csv':
        exportToCSV()
        break
      case 'excel':
        exportToExcel()
        break
      case 'pdf':
        exportToPDF()
        break
      default:
        break
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
          <div className="welcome-message">Report Generation Tool</div>
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
          <div style={{ padding: '40px 40px 20px' }}>
            <h2 style={{ color: 'var(--nexus-text-light)', marginBottom: '30px', fontSize: '1.5em', fontWeight: 700 }}>
              📊 Report Generation Tool
            </h2>

            {/* Export Format Selection */}
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ color: 'var(--nexus-text-light)', marginBottom: '20px', fontSize: '1.1em' }}>
                Select Export Format
              </h3>

              <div className="export-options-container">
                {/* PDF Option */}
                <div
                  className={`export-option-card ${selectedFormat === 'pdf' ? 'selected' : ''}`}
                  onClick={() => setSelectedFormat('pdf')}
                  style={{
                    background: selectedFormat === 'pdf' 
                      ? 'linear-gradient(135deg, #A8C5D9 0%, #8FACBE 100%)'
                      : 'linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)',
                    borderColor: selectedFormat === 'pdf' ? '#A8C5D9' : '#e8e8e8'
                  }}
                >
                  <div className="export-option-content">
                    <div className="export-icon" style={{ color: selectedFormat === 'pdf' ? 'white' : '#A8C5D9' }}>
                      📄
                    </div>
                    <p className="export-label" style={{ color: selectedFormat === 'pdf' ? 'white' : '#6B7D92' }}>
                      PDF Report
                    </p>
                    <p className="export-desc" style={{ color: selectedFormat === 'pdf' ? 'rgba(255, 255, 255, 0.9)' : '#999' }}>
                      A4 Landscape
                    </p>
                  </div>
                </div>

                {/* Excel Option */}
                <div
                  className={`export-option-card ${selectedFormat === 'excel' ? 'selected' : ''}`}
                  onClick={() => setSelectedFormat('excel')}
                  style={{
                    background: selectedFormat === 'excel' 
                      ? 'linear-gradient(135deg, #A8C5D9 0%, #8FACBE 100%)'
                      : 'linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)',
                    borderColor: selectedFormat === 'excel' ? '#A8C5D9' : '#e8e8e8'
                  }}
                >
                  <div className="export-option-content">
                    <div className="export-icon" style={{ color: selectedFormat === 'excel' ? 'white' : '#A8C5D9' }}>
                      📊
                    </div>
                    <p className="export-label" style={{ color: selectedFormat === 'excel' ? 'white' : '#6B7D92' }}>
                      Excel File
                    </p>
                    <p className="export-desc" style={{ color: selectedFormat === 'excel' ? 'rgba(255, 255, 255, 0.9)' : '#999' }}>
                      .xlsx Format
                    </p>
                  </div>
                </div>

                {/* CSV Option */}
                <div
                  className={`export-option-card ${selectedFormat === 'csv' ? 'selected' : ''}`}
                  onClick={() => setSelectedFormat('csv')}
                  style={{
                    background: selectedFormat === 'csv' 
                      ? 'linear-gradient(135deg, #A8C5D9 0%, #8FACBE 100%)'
                      : 'linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)',
                    borderColor: selectedFormat === 'csv' ? '#A8C5D9' : '#e8e8e8'
                  }}
                >
                  <div className="export-option-content">
                    <div className="export-icon" style={{ color: selectedFormat === 'csv' ? 'white' : '#A8C5D9' }}>
                      📋
                    </div>
                    <p className="export-label" style={{ color: selectedFormat === 'csv' ? 'white' : '#6B7D92' }}>
                      CSV Data
                    </p>
                    <p className="export-desc" style={{ color: selectedFormat === 'csv' ? 'rgba(255, 255, 255, 0.9)' : '#999' }}>
                      .csv Format
                    </p>
                  </div>
                </div>
              </div>

              {/* Download Button */}
              <button
                onClick={handleExport}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  marginTop: '30px',
                  background: isLoading 
                    ? '#ccc'
                    : 'linear-gradient(135deg, #A8C5D9 0%, #8FACBE 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '1.1em',
                  fontWeight: 700,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 6px 20px rgba(168, 197, 217, 0.3)',
                  transition: 'all 0.3s',
                  transform: isLoading ? 'scale(1)' : 'scale(1)',
                }}
                onMouseEnter={(e) => !isLoading && (e.target.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => !isLoading && (e.target.style.transform = 'translateY(0)')}
              >
                {isLoading ? '⏳ Loading...' : '⬇️ Download Report'}
              </button>

              {/* Info Box */}
              <div className="report-info-box">
                📊 <strong>Total Records Available:</strong> {predictionLogs.length} prediction logs ready to export
              </div>
            </div>

            {/* Recent Logs Preview */}
            <div style={{ marginTop: '40px' }}>
              <h3 style={{ color: 'var(--nexus-text-light)', marginBottom: '20px', fontSize: '1.1em' }}>
                📝 Preview: Recent Prediction Logs
              </h3>

              {isLoading ? (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: '#999',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px'
                }}>
                  ⏳ Loading prediction logs...
                </div>
              ) : predictionLogs.length > 0 ? (
                <div style={{
                  overflowX: 'auto',
                  backgroundColor: 'var(--nexus-card-background)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
                }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Barangay</th>
                        <th>Temp (°C)</th>
                        <th>Humidity (%)</th>
                        <th>Rainfall (mm)</th>
                        <th>Total (MT)</th>
                        <th>Suitability</th>
                        <th>Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {predictionLogs.map((log, idx) => (
                        <tr key={idx}>
                          <td>{new Date(log.created_at).toLocaleString('en-PH')}</td>
                          <td>{log.barangay_name || '-'}</td>
                          <td>{log.temperature_c || '-'}</td>
                          <td>{log.humidity_pct || '-'}</td>
                          <td>{log.annual_rainfall_mm || '-'}</td>
                          <td><strong>{log.m2_total_mt || '-'}</strong></td>
                          <td>{log.suitability_label || '-'}</td>
                          <td className={log.confidence === 'High' ? 'status-high' : 'status-medium'}>
                            {log.confidence || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  border: '2px dashed rgba(255, 255, 255, 0.2)'
                }}>
                  <p style={{ fontSize: '3em', margin: '0 0 10px 0' }}>📭</p>
                  <p style={{ color: '#999', fontSize: '1.1em', margin: 0 }}>No prediction logs available</p>
                  <p style={{ color: '#666', fontSize: '0.9em', margin: '10px 0 0 0' }}>Admin predictions will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
