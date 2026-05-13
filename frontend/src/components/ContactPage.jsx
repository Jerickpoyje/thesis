import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import '../assets/css/styles.css'
import '../assets/css/home-style.css'
import '../assets/css/cms-editor.css'
import { getCanonicalPrimaryNavHref, isPrimaryNavLinkActive, isSameAppRoute, toAppRoute } from '../utils/navigation'
import CmsEditableRegion from './cms/CmsEditableRegion'
import CmsEditToolbar from './cms/CmsEditToolbar'
import CmsEditorModal from './cms/CmsEditorModal'
import { useCmsPageEditor } from './cms/useCmsPageEditor'
import { CONTACT_CMS_DEFAULTS, CONTACT_CMS_SCHEMAS } from './cms/cmsConfig'

const FADE_DURATION_MS = 500

function ContactPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const timeoutRef = useRef(null)
  const [isFadingOut, setIsFadingOut] = useState(false)

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
    pageKey: 'contact',
    defaults: CONTACT_CMS_DEFAULTS,
    sectionSchemas: CONTACT_CMS_SCHEMAS,
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

    if (isSameAppRoute(location, targetRoute)) {
      event.preventDefault()
      return
    }

    event.preventDefault()
    setIsFadingOut(true)
    timeoutRef.current = window.setTimeout(() => navigate(targetRoute), FADE_DURATION_MS)
  }

  const navigationStyle = content.navigation.style || {}

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
    <div className={`coffee-homepage-body contact-page-body${isFadingOut ? ' fade-out' : ''}`} style={{}}>
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
            const href = getCanonicalPrimaryNavHref(link)
            const isActive = isPrimaryNavLinkActive(location, link)
            return (
              <a
                key={link.label}
                href={href}
                className={isActive ? 'active' : undefined}
                style={isActive ? navigationStyle.activeLink : navigationStyle.link}
                onClick={(event) => navigateWithFade(event, href)}
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
          onEdit={() => openSectionEditor('header')}
          className="page-hero-header"
          style={content.header.style.section}
        >
          <h1 className="page-title" style={content.header.style.title}>{content.header.title}</h1>
        </CmsEditableRegion>

        <CmsEditableRegion
          as="section"
          isEditMode={isEditMode}
          onEdit={() => openSectionEditor('contact')}
          className="contact-section"
          style={content.contact.style.section}
        >
          <div className="contact-info">
            <div className="contact-item" style={content.contact.style.item}>
              <span className="contact-label" style={content.contact.style.label}>Facebook: </span>
              <a href={content.contact.facebook} target="_blank" rel="noopener noreferrer" style={content.contact.style.value}>
                {content.contact.facebook}
              </a>
            </div>
            <div className="contact-item" style={content.contact.style.item}>
              <span className="contact-label" style={content.contact.style.label}>Email: </span>
              <a href={`mailto:${content.contact.email}`} style={content.contact.style.value}>
                {content.contact.email}
              </a>
            </div>
            <div className="contact-item" style={content.contact.style.item}>
              <span className="contact-label" style={content.contact.style.label}>Contact Number: </span>
              <a href={`tel:${content.contact.phone}`} style={content.contact.style.value}>
                {content.contact.phone}
              </a>
            </div>
          </div>
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
        pageKey="contact"
        isSaving={isSaving}
        saveError={saveError}
      />
    </div>
  )
}

export default ContactPage