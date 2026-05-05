import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import '../assets/css/styles.css'
import '../assets/css/home-style.css'
import '../assets/css/stylesss.css'
import '../assets/css/cms-editor.css'
import { toAppRoute } from '../utils/navigation'
import CmsEditableRegion from './cms/CmsEditableRegion'
import CmsEditToolbar from './cms/CmsEditToolbar'
import CmsEditorModal from './cms/CmsEditorModal'
import { useCmsPageEditor } from './cms/useCmsPageEditor'
import { HOME_CMS_DEFAULTS, HOME_CMS_SCHEMAS } from './cms/cmsConfig'

const FADE_DURATION_MS = 300
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const meetingTopicOptions = [
  'Crop planning',
  'Soil and nutrient management',
  'Pest and disease concerns',
  'Coffee variety selection',
  'Post-harvest handling',
  'Others',
]

function renderMedia(media, className, style, isEditMode) {
  if (!media) return null

  if (!media.src) {
    if (!isEditMode) return null
    return (
      <div className={className} style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '180px',
        padding: '20px',
        border: '1px dashed rgba(255,255,255,0.35)',
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
      }}>
        Upload an image or video in the CMS editor.
      </div>
    )
  }

  if (media.type === 'video') {
    return (
      <video className={className} controls src={media.src} poster={media.poster || undefined} style={style}>
        {media.alt || 'Video content'}
      </video>
    )
  }

  return <img src={media.src} alt={media.alt || ''} className={className} style={style} />
}

export default function HomePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const timeoutRef = useRef(null)
  const [isFadingOut, setIsFadingOut] = useState(false)
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

  const {
    content,
    isEditMode,
    isSaving,
    saveMessage,
    saveError,
    selectedSection,
    draftSection,
    setDraftSection,
    openSectionEditor,
    closeSectionEditor,
    saveSectionDraft,
  } = useCmsPageEditor({
    pageKey: 'home',
    defaults: HOME_CMS_DEFAULTS,
    sectionSchemas: HOME_CMS_SCHEMAS,
  })

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    }
  }, [])

  const navigateWithFade = (event, href) => {
    if (isEditMode) {
      event.preventDefault()
      return
    }

    const targetRoute = toAppRoute(href)
    if (!targetRoute) {
      event.preventDefault()
      return
    }

    event.preventDefault()
    setIsFadingOut(true)
    timeoutRef.current = window.setTimeout(() => navigate(targetRoute), FADE_DURATION_MS)
  }

  const handleMeetingFieldChange = (event) => {
    const { target: { name, value } } = event
    setMeetingRequest((previous) => ({ ...previous, [name]: value }))
  }

  const handleMeetingRequestSubmit = async (event) => {
    event.preventDefault()

    if (isEditMode) {
      setMeetingRequestMessage('Edit mode is active. Save changes from the CMS modal instead of submitting the form.')
      return
    }

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
          fullName: '',
          contactNumber: '',
          email: '',
          preferredDate: '',
          preferredTime: '',
          topic: 'Crop planning',
          topicOther: '',
          details: '',
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

  const navigationStyle = content.navigation.style || {}
  const homeVarieties = [
    { key: 'varietyRobusta', className: 'robusta' },
    { key: 'varietyLiberica', className: 'liberica' },
    { key: 'varietyExcelsa', className: 'excelsa' },
  ]

  const endEditMode = () => {
    closeSectionEditor()
    navigate(location.pathname, { replace: true })
  }

  const cancelEditing = () => {
    closeSectionEditor()
  }

  const backToAdmin = () => {
    closeSectionEditor()
    navigate('/admin')
  }

  return (
    <div className={`coffee-homepage-body${isFadingOut ? ' fade-out' : ''}`} style={{}}>
      {isEditMode ? (
        <>
          <CmsEditToolbar
            onEndEditMode={endEditMode}
            onCancelEditing={cancelEditing}
            onBackToAdmin={backToAdmin}
            canCancelEditing={Boolean(selectedSection)}
          />
          <div style={{
            position: 'sticky',
            top: '84px',
            zIndex: 12000,
            padding: '12px 18px',
            background: 'rgba(10, 61, 98, 0.96)',
            color: '#f0fff5',
            borderBottom: '1px solid rgba(255,255,255,0.12)',
            fontSize: '0.95rem',
          }}>
            Edit mode is active. Click any section to open the CMS modal.
          </div>
        </>
      ) : null}

      <CmsEditableRegion as="nav" isEditMode={isEditMode} onEdit={() => openSectionEditor('navigation')} className="top-nav" style={navigationStyle.container}>
        <div className="logo-container">
          <span className="logo-icon">🌱</span>
          <span className="logo-text">Amadeo Coffee</span>
        </div>

        <div className="nav-links" aria-label="Main navigation">
          {content.navigation.links.map((link) => {
            const isActive = Boolean(link.isActive)
            return (
              <a
                key={link.label}
                href={link.href}
                className={isActive ? 'active' : undefined}
                style={isActive ? navigationStyle.activeLink : navigationStyle.link}
                onClick={(event) => navigateWithFade(event, link.href)}
              >
                {link.label}
              </a>
            )
          })}
        </div>
      </CmsEditableRegion>

      <div className="homepage-layout">
        <CmsEditableRegion
          as="section"
          isEditMode={isEditMode}
          onEdit={() => openSectionEditor('hero')}
          className="hero-section"
          style={content.hero.style.section}
        >
          <div className="hero-content" style={content.hero.style.content}>
            <p className="hero-kicker" style={content.hero.style.kicker}>{content.hero.kicker}</p>
            <h1 className="hero-title" style={content.hero.style.title}>{content.hero.title}</h1>
            <p className="hero-subtitle" style={content.hero.style.subtitle}>{content.hero.subtitle}</p>
          </div>
          <div className="hero-image-placeholder" style={content.hero.style.media}>
            {renderMedia(content.hero.media, 'hero-image-placeholder', content.hero.style.media, isEditMode)}
          </div>
        </CmsEditableRegion>

        <CmsEditableRegion
          as="section"
          isEditMode={isEditMode}
          onEdit={() => openSectionEditor('about')}
          className="about-section"
          style={content.about.style.section}
        >
          <h2 className="section-title" style={content.about.style.title}>{content.about.title}</h2>
          <div className="about-content-grid" style={content.about.style.content}>
            <div className="about-content">
              <div className="about-text" style={content.about.style.text}>
                {content.about.text.split('\n\n').map((para, index) => (
                  <p key={index}>{para}</p>
                ))}
              </div>
            </div>
            <div className="about-image-placeholder" style={content.about.style.media}>
              {renderMedia(content.about.media, '', content.about.style.media, isEditMode)}
            </div>
          </div>
        </CmsEditableRegion>

        <section className="variety-section" style={content.varieties.style.section}>
          <CmsEditableRegion
            as="h2"
            isEditMode={isEditMode}
            onEdit={() => openSectionEditor('varieties')}
            className="section-title"
            style={content.varieties.style.title}
          >
            {content.varieties.title}
          </CmsEditableRegion>
          <div className="variety-grid" style={content.varieties.style.grid}>
            {homeVarieties.map((variety) => {
              const varietyContent = content[variety.key]
              return (
                <CmsEditableRegion
                  as="article"
                  key={variety.key}
                  isEditMode={isEditMode}
                  onEdit={() => openSectionEditor(variety.key)}
                  className="variety-card card"
                  style={varietyContent.style.card}
                >
                  <div className={`variety-image-placeholder ${variety.className}`} style={varietyContent.style.media}>
                    {renderMedia(varietyContent.media, `variety-image-placeholder ${variety.className}`, varietyContent.style.media, isEditMode)}
                  </div>
                  <div className="variety-info">
                    <h3 style={varietyContent.style.title}>{varietyContent.title}</h3>
                  </div>
                </CmsEditableRegion>
              )
            })}
          </div>
        </section>

        <CmsEditableRegion
          as="section"
          isEditMode={isEditMode}
          onEdit={() => openSectionEditor('meeting')}
          className="meeting-request-card home-meeting-request-card"
          style={content.meeting.style.section}
        >
          <h1 className="panel-heading meeting-panel-heading" style={content.meeting.style.title}>{content.meeting.title}</h1>
          <p className="meeting-request-subtitle" style={content.meeting.style.subtitle}>{content.meeting.subtitle}</p>

          <form
            onSubmit={handleMeetingRequestSubmit}
            className="meeting-request-form-panel"
            style={isEditMode ? { pointerEvents: 'none', opacity: 0.72 } : undefined}
          >
            <div className="meeting-form-row">
              <div className="input-group meeting-form-col">
                <label htmlFor="home-meeting-fullName" className="meeting-form-label">Full Name</label>
                <input id="home-meeting-fullName" name="fullName"
                  className="styled-input meeting-form-input"
                  value={meetingRequest.fullName} onChange={handleMeetingFieldChange} required disabled={isEditMode} />
              </div>
              <div className="input-group meeting-form-col">
                <label htmlFor="home-meeting-contactNumber" className="meeting-form-label">Contact Number</label>
                <input id="home-meeting-contactNumber" name="contactNumber"
                  className="styled-input meeting-form-input"
                  value={meetingRequest.contactNumber} onChange={handleMeetingFieldChange} required disabled={isEditMode} />
              </div>
            </div>

            <div className="meeting-form-row">
              <div className="input-group meeting-form-col">
                <label htmlFor="home-meeting-email" className="meeting-form-label">Email Address</label>
                <input id="home-meeting-email" name="email" type="email"
                  className="styled-input meeting-form-input"
                  value={meetingRequest.email} onChange={handleMeetingFieldChange} required disabled={isEditMode} />
              </div>
              <div className="input-group meeting-form-col">
                <label htmlFor="home-meeting-topic" className="meeting-form-label">Meeting Topic</label>
                <select id="home-meeting-topic" name="topic"
                  className="styled-input meeting-form-input"
                  value={meetingRequest.topic} onChange={handleMeetingFieldChange} required disabled={isEditMode}>
                  {meetingTopicOptions.map((topicOption) => (
                    <option key={topicOption} value={topicOption}>{topicOption}</option>
                  ))}
                </select>
                {meetingRequest.topic === 'Others' && (
                  <input id="home-meeting-topic-other" name="topicOther"
                    className="styled-input meeting-form-input"
                    value={meetingRequest.topicOther} onChange={handleMeetingFieldChange}
                    placeholder="Please specify your meeting topic"
                    required style={{ marginTop: '8px' }} disabled={isEditMode} />
                )}
              </div>
            </div>

            <div className="meeting-form-row">
              <div className="input-group meeting-form-col">
                <label htmlFor="home-meeting-date" className="meeting-form-label">Preferred Date</label>
                <input id="home-meeting-date" name="preferredDate" type="date"
                  className="styled-input meeting-form-input"
                  value={meetingRequest.preferredDate} onChange={handleMeetingFieldChange} required disabled={isEditMode} />
              </div>
              <div className="input-group meeting-form-col">
                <label htmlFor="home-meeting-time" className="meeting-form-label">Preferred Time</label>
                <input id="home-meeting-time" name="preferredTime" type="time"
                  className="styled-input meeting-form-input"
                  value={meetingRequest.preferredTime} onChange={handleMeetingFieldChange} required disabled={isEditMode} />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="home-meeting-details" className="meeting-form-label">Additional Details</label>
              <textarea id="home-meeting-details" name="details"
                className="styled-input meeting-form-input meeting-form-textarea"
                value={meetingRequest.details} onChange={handleMeetingFieldChange}
                placeholder="Share the concern or agenda you want to discuss." rows={4} disabled={isEditMode} />
            </div>

            <div className="btn-row meeting-form-actions">
              <button type="submit" className="run-analysis-btn meeting-form-submit" style={content.meeting.style.button} disabled={isEditMode}>
                {content.meeting.buttonLabel}
              </button>
            </div>

            {meetingRequestMessage && (
              <p className="meeting-form-success-message">{meetingRequestMessage}</p>
            )}
          </form>
        </CmsEditableRegion>
      </div>

      <footer className="main-footer" style={content.footer.style.footer}>
        <p style={content.footer.style.text}>{content.footer.text}</p>
      </footer>

      {isEditMode && saveMessage ? (
        <div style={{ position: 'fixed', right: '18px', bottom: '18px', zIndex: 12001, padding: '12px 14px', borderRadius: '14px', background: '#0f1724', color: '#d7ffe8', boxShadow: '0 18px 45px rgba(0,0,0,0.32)' }}>
          {saveMessage}
        </div>
      ) : null}
      {isEditMode && saveError ? (
        <div style={{ position: 'fixed', left: '18px', bottom: '18px', zIndex: 12001, padding: '12px 14px', borderRadius: '14px', background: '#3d1111', color: '#ffd4d4', boxShadow: '0 18px 45px rgba(0,0,0,0.32)' }}>
          {saveError}
        </div>
      ) : null}

      <CmsEditorModal
        section={selectedSection}
        draftValue={draftSection}
        onChange={setDraftSection}
        onClose={closeSectionEditor}
        onSave={saveSectionDraft}
        pageKey="home"
        isSaving={isSaving}
        saveError={saveError}
      />
    </div>
  )
}
