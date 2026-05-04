import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import '../assets/css/styles.css'
import '../assets/css/home-style.css'
import '../assets/css/stylesss.css'
import { toAppRoute } from '../utils/navigation'
import { ADMIN_AUTH_CHANGED_EVENT, isAdminAuthenticated } from '../utils/auth'

import homePicture from '../assets/images/Homepage-Picture.png'
import aboutPicture from '../assets/images/About-Picture.png'
import robustaImg from '../assets/images/robusta.jpg'
import libericaImg from '../assets/images/liberica.jpg'
import excelsaImg from '../assets/images/excelsa.jpg'

const FADE_DURATION_MS = 300
const PREDICTIVE_MAP_PATH = 'Index.html'
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const navLinks = [
  { label: 'Home',         href: 'home.html',  isActive: true },
  { label: 'About',        href: 'about.html' },
  { label: 'Contact',      href: '#' },
  { label: '⚡ Predictor', href: 'Index.html' },
]

const focusVarieties = [
  { key: 'robusta',  label: 'Robusta',           image: robustaImg,  alt: 'Robusta variety' },
  { key: 'liberica', label: 'Liberica (Barako)',  image: libericaImg, alt: 'Liberica variety' },
  { key: 'excelsa',  label: 'Excelsa',            image: excelsaImg,  alt: 'Excelsa variety' },
]

const meetingTopicOptions = [
  'Crop planning',
  'Soil and nutrient management',
  'Pest and disease concerns',
  'Coffee variety selection',
  'Post-harvest handling',
  'Others',
]

export default function HomePage() {
  const navigate = useNavigate()
  const location = useLocation()
  
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => isAdminAuthenticated())
  const [pageContent, setPageContent] = useState({
    hero: {
      title: 'Predicting the Future of Amadeo\'s Coffee',
      subtitle: 'Harnessing GIS and predictive modeling to provide Amadeo\'s upland coffee farmers with accurate, data-driven yield forecasts.'
    },
    about: {
      title: 'Why Predictive Coffee Analytics?',
      text: 'Amadeo, Cavite is the heartland of the province\'s coffee industry. Our tool uses environmental factors like elevation, rainfall, and soil type to create Amadeo-focused predictions, moving beyond traditional methods to help ensure optimal planting and harvesting strategies for local coffee farms.\n\nThis empowers Amadeo farmers to adapt to changing climate conditions, maximize their yield potential, and secure a sustainable future for the revered Kapeng Barako.'
    },
    varieties: {
      robusta: 'Robusta',
      liberica: 'Liberica (Barako)',
      excelsa: 'Excelsa'
    },
    meeting: {
      title: 'Request a Meeting in FITS Center, Amadeo',
      subtitle: 'Fill out this form to request a consultation schedule with the FITS Center team.'
    }
  })
  const [meetingRequest, setMeetingRequest] = useState({
    fullName: '',
    contactNumber: '',
    email: '',
    preferredDate: '',
    preferredTime: '',
    topic: 'Crop planning',
    topicOther: '',
    details: '',
  })
  const [meetingRequestMessage, setMeetingRequestMessage] = useState('')
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const timeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    }
  }, [])

  useEffect(() => {
    const syncAuth = () => setIsAdminLoggedIn(isAdminAuthenticated())
    window.addEventListener(ADMIN_AUTH_CHANGED_EVENT, syncAuth)
    window.addEventListener('focus', syncAuth)
    return () => {
      window.removeEventListener(ADMIN_AUTH_CHANGED_EVENT, syncAuth)
      window.removeEventListener('focus', syncAuth)
    }
  }, [])

  // CRITICAL: User pages must NEVER show edit mode for regular users
  // But admins CAN edit these pages - only strip ?edit=true if NOT admin
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.has('edit') && !isAdminLoggedIn) {
      navigate('/home', { replace: true })
    }
  }, [navigate, location.search, isAdminLoggedIn])



  // Load CMS content from backend on page mount
  useEffect(() => {
    const loadCMSContent = async () => {
      try {
        const response = await fetch(`${API_BASE}/cms/page/home`)
        if (response.ok) {
          const data = await response.json()
          console.log('Loaded CMS content from backend:', data)
          
          // Backend returns {content: {section: {key: value}}}
          const cmsData = data.content || {}
          
          // Update state with loaded data
          if (cmsData.hero) {
            setPageContent(prev => ({ ...prev, hero: cmsData.hero }))
          }
          if (cmsData.about) {
            setPageContent(prev => ({ ...prev, about: cmsData.about }))
          }
          if (cmsData.varieties) {
            setPageContent(prev => ({ ...prev, varieties: cmsData.varieties }))
          }
          if (cmsData.meeting) {
            setPageContent(prev => ({ ...prev, meeting: cmsData.meeting }))
          }
        }
      } catch (error) {
        console.log('Note: No saved CMS content yet, using defaults:', error.message)
      }
    }
    
    loadCMSContent()
  }, [])

  const navigateWithFade = (event, href) => {
    const targetRoute = toAppRoute(href)
    if (!targetRoute) { event.preventDefault(); return }
    event.preventDefault()
    setIsFadingOut(true)
    // If in edit mode, append ?edit=true to preserve edit state when navigating to other pages
    const finalRoute = shouldShowEditUI ? `${targetRoute}?edit=true` : targetRoute
    timeoutRef.current = window.setTimeout(() => navigate(finalRoute), FADE_DURATION_MS)
  }

  const handleSaveChanges = async () => {
  setIsSaving(true)
  try {
    const response = await fetch(`${API_BASE}/cms/page/home`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pageContent),
    })
    if (response.ok) {
      alert('✓ Changes saved successfully!')
      navigate('/cms', { replace: true })  // ← go back to CMS, not home
    } else {
      alert('❌ Failed to save changes')
    }
  } catch (error) {
    console.error('Error saving:', error)
    alert('❌ Error saving changes')
  } finally {
    setIsSaving(false)
  }
}

  const handleMeetingFieldChange = (event) => {
    const { target: { name, value } } = event
    setMeetingRequest(previous => ({ ...previous, [name]: value }))
  }

  const handleMeetingRequestSubmit = async (event) => {
    event.preventDefault()
    const finalTopic = meetingRequest.topic === 'Others'
      ? meetingRequest.topicOther.trim()
      : meetingRequest.topic
    if (!finalTopic) return

    try {
      const response = await fetch(`${API_BASE}/meeting-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: meetingRequest.fullName,
          contactNumber: meetingRequest.contactNumber,
          email: meetingRequest.email,
          preferredDate: meetingRequest.preferredDate,
          preferredTime: meetingRequest.preferredTime,
          topic: finalTopic,
          topicOther: meetingRequest.topicOther,
          details: meetingRequest.details,
        }),
      })

      if (response.ok) {
        setMeetingRequest({
          fullName: '', contactNumber: '', email: '',
          preferredDate: '', preferredTime: '',
          topic: 'Crop planning', topicOther: '', details: '',
        })
        setMeetingRequestMessage('✓ Meeting request submitted successfully! We will contact you soon.')
      } else {
        setMeetingRequestMessage('⚠ Failed to submit meeting request. Please try again.')
      }
    } catch (error) {
      console.error('Meeting request error:', error)
      setMeetingRequestMessage('⚠ Error submitting request. Please check your connection.')
    }
  }

  // Compute whether to show edit UI in real-time
  const shouldShowEditUI = isAdminLoggedIn && new URLSearchParams(location.search).get('edit') === 'true'

  return (
    <div className={`coffee-homepage-body${isFadingOut ? ' fade-out' : ''}`} style={(isAdminLoggedIn && new URLSearchParams(location.search).get('edit') === 'true') ? { paddingTop: '80px' } : {}}>
      {/* Compute edit mode in real-time: only show if BOTH admin is logged in AND URL has ?edit=true */}
      {isAdminLoggedIn && new URLSearchParams(location.search).get('edit') === 'true' && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 999,
          backgroundColor: '#1e8449',
          color: 'white',
          padding: '16px 24px',
          textAlign: 'center',
          fontSize: '16px',
          fontWeight: 'bold',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '16px',
          borderBottom: '3px solid #155a34',
        }}>
          ✏️ EDIT MODE - Editing Home Page
          <button
            onClick={handleSaveChanges}
            disabled={isSaving}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
              transition: 'all 0.2s ease',
            }}
          >
            {isSaving ? '💾 Saving...' : '💾 Save Changes'}
          </button>
          <button
            onClick={() => navigate('/cms', { replace: true })}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
              transition: 'all 0.2s ease',
            }}
          >
            ❌ Cancel
          </button>
        </div>
      )}

      {/* ── Navbar ── */}
      <div className="top-nav">
        <div className="logo-container">
          <span className="logo-icon">🌱</span>
          <span className="logo-text">Amadeo Coffee</span>
        </div>

        <nav className="nav-links" aria-label="Main navigation">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={link.isActive ? 'active' : undefined}
              onClick={(event) => {
                if (shouldShowEditUI && link.href === 'about.html') {
                 event.preventDefault()
                navigate('/about?edit=true')
                 return
                 }
                navigateWithFade(event, link.href)
                  }}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>

      <div className="homepage-layout">
        {/* ── Hero ── */}
        <section className="hero-section">
          <div className="hero-content">
            <p className="hero-kicker">GIS-Powered Coffee Forecasting</p>
            {shouldShowEditUI ? (
              <input
                type="text"
                value={pageContent.hero.title}
                onChange={(e) => setPageContent(prev => ({ ...prev, hero: { ...prev.hero, title: e.target.value } }))}
                className="hero-title"
                style={{ width: '100%', padding: '8px', fontSize: '2.5em', fontWeight: 'bold' }}
              />
            ) : (
              <h1 className="hero-title">{pageContent.hero.title}</h1>
            )}
            {shouldShowEditUI ? (
              <textarea
                value={pageContent.hero.subtitle}
                onChange={(e) => setPageContent(prev => ({ ...prev, hero: { ...prev.hero, subtitle: e.target.value } }))}
                className="hero-subtitle"
                style={{ width: '100%', padding: '8px', minHeight: '60px', fontSize: '1.1em' }}
              />
            ) : (
              <p className="hero-subtitle">
                {pageContent.hero.subtitle}
              </p>
            )}
          </div>
          <div className="hero-image-placeholder">
            <img src={homePicture} alt="Hero section" className="hero-image-placeholder" />
          </div>
        </section>

        {/* ── About ── */}
        <section className="about-section">
          {shouldShowEditUI ? (
            <input
              type="text"
              value={pageContent.about.title}
              onChange={(e) => setPageContent(prev => ({ ...prev, about: { ...prev.about, title: e.target.value } }))}
              className="section-title"
              style={{ width: '100%', padding: '8px', fontSize: '1.8em', fontWeight: 'bold' }}
            />
          ) : (
            <h2 className="section-title">{pageContent.about.title}</h2>
          )}
          <div className="about-content-grid">
            <div className="about-content">
              <div className="about-text">
                {shouldShowEditUI ? (
                  <textarea
                    value={pageContent.about.text}
                    onChange={(e) => setPageContent(prev => ({ ...prev, about: { ...prev.about, text: e.target.value } }))}
                    style={{ width: '100%', padding: '8px', minHeight: '150px', fontSize: '1em' }}
                  />
                ) : (
                  pageContent.about.text.split('\n\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))
                )}
              </div>
            </div>
            <div className="about-image-placeholder">
              <img src={aboutPicture} alt="About section" />
            </div>
          </div>
        </section>

        {/* ── Varieties ── */}
        <section className="variety-section">
          <h2 className="section-title">Focus Varieties</h2>
          <div className="variety-grid">
            {focusVarieties.map((variety) => (
              <article key={variety.key} className="variety-card card">
                <div className={`variety-image-placeholder ${variety.key}`}>
                  <img src={variety.image} alt={variety.alt} className={`variety-image-placeholder ${variety.key}`} />
                </div>
                <div className="variety-info">
                  {shouldShowEditUI ? (
                    <input
                      type="text"
                      value={pageContent.varieties[variety.key]}
                      onChange={(e) => setPageContent(prev => ({ ...prev, varieties: { ...prev.varieties, [variety.key]: e.target.value } }))}
                      style={{ width: '100%', padding: '8px', fontSize: '1.2em', fontWeight: 'bold' }}
                    />
                  ) : (
                    <h3>{pageContent.varieties[variety.key]}</h3>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── Meeting request form ── */}
        <section className="meeting-request-card home-meeting-request-card">
          {shouldShowEditUI ? (
            <input
              type="text"
              value={pageContent.meeting.title}
              onChange={(e) => setPageContent(prev => ({ ...prev, meeting: { ...prev.meeting, title: e.target.value } }))}
              className="panel-heading meeting-panel-heading"
              style={{ width: '100%', padding: '8px', fontSize: '1.8em', fontWeight: 'bold' }}
            />
          ) : (
            <h1 className="panel-heading meeting-panel-heading">{pageContent.meeting.title}</h1>
          )}
          {shouldShowEditUI ? (
            <textarea
              value={pageContent.meeting.subtitle}
              onChange={(e) => setPageContent(prev => ({ ...prev, meeting: { ...prev.meeting, subtitle: e.target.value } }))}
              className="meeting-request-subtitle"
              style={{ width: '100%', padding: '8px', minHeight: '60px', fontSize: '1em' }}
            />
          ) : (
            <p className="meeting-request-subtitle">
              {pageContent.meeting.subtitle}
            </p>
          )}

          <form onSubmit={handleMeetingRequestSubmit} className="meeting-request-form-panel">
            <div className="meeting-form-row">
              <div className="input-group meeting-form-col">
                <label htmlFor="home-meeting-fullName" className="meeting-form-label">Full Name</label>
                <input id="home-meeting-fullName" name="fullName"
                  className="styled-input meeting-form-input"
                  value={meetingRequest.fullName} onChange={handleMeetingFieldChange} required />
              </div>
              <div className="input-group meeting-form-col">
                <label htmlFor="home-meeting-contactNumber" className="meeting-form-label">Contact Number</label>
                <input id="home-meeting-contactNumber" name="contactNumber"
                  className="styled-input meeting-form-input"
                  value={meetingRequest.contactNumber} onChange={handleMeetingFieldChange} required />
              </div>
            </div>

            <div className="meeting-form-row">
              <div className="input-group meeting-form-col">
                <label htmlFor="home-meeting-email" className="meeting-form-label">Email Address</label>
                <input id="home-meeting-email" name="email" type="email"
                  className="styled-input meeting-form-input"
                  value={meetingRequest.email} onChange={handleMeetingFieldChange} required />
              </div>
              <div className="input-group meeting-form-col">
                <label htmlFor="home-meeting-topic" className="meeting-form-label">Meeting Topic</label>
                <select id="home-meeting-topic" name="topic"
                  className="styled-input meeting-form-input"
                  value={meetingRequest.topic} onChange={handleMeetingFieldChange} required>
                  {meetingTopicOptions.map((topicOption) => (
                    <option key={topicOption} value={topicOption}>{topicOption}</option>
                  ))}
                </select>
                {meetingRequest.topic === 'Others' && (
                  <input id="home-meeting-topic-other" name="topicOther"
                    className="styled-input meeting-form-input"
                    value={meetingRequest.topicOther} onChange={handleMeetingFieldChange}
                    placeholder="Please specify your meeting topic"
                    required style={{ marginTop: '8px' }} />
                )}
              </div>
            </div>

            <div className="meeting-form-row">
              <div className="input-group meeting-form-col">
                <label htmlFor="home-meeting-date" className="meeting-form-label">Preferred Date</label>
                <input id="home-meeting-date" name="preferredDate" type="date"
                  className="styled-input meeting-form-input"
                  value={meetingRequest.preferredDate} onChange={handleMeetingFieldChange} required />
              </div>
              <div className="input-group meeting-form-col">
                <label htmlFor="home-meeting-time" className="meeting-form-label">Preferred Time</label>
                <input id="home-meeting-time" name="preferredTime" type="time"
                  className="styled-input meeting-form-input"
                  value={meetingRequest.preferredTime} onChange={handleMeetingFieldChange} required />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="home-meeting-details" className="meeting-form-label">Additional Details</label>
              <textarea id="home-meeting-details" name="details"
                className="styled-input meeting-form-input meeting-form-textarea"
                value={meetingRequest.details} onChange={handleMeetingFieldChange}
                placeholder="Share the concern or agenda you want to discuss." rows={4} />
            </div>

            <div className="btn-row meeting-form-actions">
              <button type="submit" className="run-analysis-btn meeting-form-submit">
                Submit Meeting Request
              </button>
            </div>

            {meetingRequestMessage && (
              <p className="meeting-form-success-message">{meetingRequestMessage}</p>
            )}
          </form>
        </section>
      </div>


      <footer className="main-footer">
        <p>&copy; 2025 Cavite Upland Coffee Analytics. All rights reserved.</p>
      </footer>
    </div>
  )
}