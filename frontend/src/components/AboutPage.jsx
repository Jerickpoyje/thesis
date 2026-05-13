import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import '../assets/css/home-style.css'
import '../assets/css/cms-editor.css'
import { getCanonicalPrimaryNavHref, isPrimaryNavLinkActive, isSameAppRoute, toAppRoute } from '../utils/navigation'
import CmsEditableRegion from './cms/CmsEditableRegion'
import CmsEditToolbar from './cms/CmsEditToolbar'
import CmsEditorModal from './cms/CmsEditorModal'
import { useCmsPageEditor } from './cms/useCmsPageEditor'
import { ABOUT_CMS_DEFAULTS, ABOUT_CMS_SCHEMAS } from './cms/cmsConfig'

const FADE_DURATION_MS = 500

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

export default function AboutPage() {
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
    pageKey: 'about',
    defaults: ABOUT_CMS_DEFAULTS,
    sectionSchemas: ABOUT_CMS_SCHEMAS,
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

  const navStyle = content.navigation.style || {}
  const aboutVarieties = [
    { key: 'varietyRobusta', className: 'robusta' },
    { key: 'varietyLiberica', className: 'liberica' },
    { key: 'varietyExcelsa', className: 'excelsa' },
  ]

  const aboutArticles = [
    { key: 'articleBrewingHope' },
    { key: 'articleRiseFromAshes' },
    { key: 'articleLostAndDamaged' },
    { key: 'articleAshfallCalabarzon' },
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
    <div className={`coffee-homepage-body about-page-body${isFadingOut ? ' fade-out' : ''}`} style={{}}>
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

      <CmsEditableRegion as="nav" isEditMode={isEditMode} onEdit={() => openSectionEditor('navigation')} className="top-nav" style={navStyle.container}>
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
                style={isActive ? navStyle.activeLink : navStyle.link}
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
          onEdit={() => openSectionEditor('intro')}
          className="page-hero-header"
          style={content.intro.style.section}
        >
          <h1 className="page-title" style={content.intro.style.title}>{content.intro.title}</h1>
          <p className="page-subtitle" style={content.intro.style.subtitle}>{content.intro.subtitle}</p>
        </CmsEditableRegion>

        <div className="variety-grid" style={content.varietyRobusta.style.section}>
          {aboutVarieties.map((variety) => {
            const varietyContent = content[variety.key]
            return (
              <CmsEditableRegion
                as="article"
                key={variety.key}
                isEditMode={isEditMode}
                onEdit={() => openSectionEditor(variety.key)}
                className="variety-card card variety-card-full-info"
                style={varietyContent.style.card}
              >
                <div className={`variety-image-placeholder ${variety.className}`} style={varietyContent.style.media}>
                  {renderMedia(varietyContent.media, `variety-image-placeholder ${variety.className}`, varietyContent.style.media, isEditMode)}
                </div>
                <div className="variety-info">
                  <h3 className="variety-title" style={varietyContent.style.title}>{varietyContent.title}</h3>
                  <p className="variety-tagline" style={varietyContent.style.tagline}>{varietyContent.tagline}</p>
                  <p className="variety-description" style={varietyContent.style.description}>{varietyContent.description}</p>
                  <ul className="variety-features" style={varietyContent.style.features}>
                    {varietyContent.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </div>
              </CmsEditableRegion>
            )
          })}
        </div>

        <section className="about-articles-section" style={content.articlesHeading.style.section}>
          <CmsEditableRegion
            as="h2"
            isEditMode={isEditMode}
            onEdit={() => openSectionEditor('articlesHeading')}
            id="about-articles-heading"
            className="about-articles-heading"
            style={content.articlesHeading.style.title}
          >
            {content.articlesHeading.title}
          </CmsEditableRegion>
          <div className="about-articles-list">
            {aboutArticles.map((article) => {
              const articleContent = content[article.key]
              return (
                <CmsEditableRegion
                  as="article"
                  key={article.key}
                  isEditMode={isEditMode}
                  onEdit={() => openSectionEditor(article.key)}
                  className="about-article-card card"
                  style={articleContent.style.card}
                >
                  <p className="about-article-kicker" style={articleContent.style.kicker}>{articleContent.kicker}</p>
                  <h3 className="about-article-title" style={articleContent.style.title}>{articleContent.title}</h3>
                  <p className="about-article-text" style={articleContent.style.summary}>{articleContent.summary}</p>
                  <p className="about-article-source" style={articleContent.style.source}>
                    Source:{' '}
                    <a href={articleContent.sourceUrl} target="_blank" rel="noreferrer">
                      View full article
                    </a>
                  </p>
                </CmsEditableRegion>
              )
            })}
          </div>
        </section>
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
        pageKey="about"
        isSaving={isSaving}
        saveError={saveError}
      />
    </div>
  )
}
