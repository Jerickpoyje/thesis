import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import '../assets/css/home-style.css'
import { toAppRoute } from '../utils/navigation'
import { ADMIN_AUTH_CHANGED_EVENT, isAdminAuthenticated } from '../utils/auth'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

import robustaImg from '../assets/images/robusta.jpg'
import libericaImg from '../assets/images/liberica.jpg'
import excelsaImg from '../assets/images/excelsa.jpg'

const FADE_DURATION_MS = 500

const varietyCards = [
  {
    key: 'robusta',
    image: robustaImg,
    imageAlt: 'Robusta coffee variety',
    title: 'Robusta (Coffea canephora)',
    tagline: 'The resilient backbone of commercial coffee.',
    description:
      'Robusta is the second most popular coffee globally, primarily grown for its superior hardiness and high caffeine content. It thrives in warmer climates and is a vital commercial variety for Cavite farmers. Its flavor profile is typically strong, earthy, and bittersweet, often used in blends or instant coffee to add body and kick.',
    features: [
      'Elevation(Meters Above the Sea Level): 600-1200',
      'Temperature: 13-26°C',
      'Sunshine Requirements: 50%',
      'Wind Requirements: Slight',
      'Relative Humidity(%): 75-85',
      'Rainfall(mm): 200',
      'Soil(pH): 5.6-6.5',
      'Soil Depth(m): 1.5',
      'Organic Matter(OM): Rich in OM'
    ],
  },
  {
    key: 'liberica',
    image: libericaImg,
    imageAlt: 'Liberica coffee variety',
    title: 'Liberica (Kapeng Barako)',
    tagline: 'The national pride with a smoky, intense character.',
    description:
      "In the Philippines, Liberica is known as Kapeng Barako due to its strong, bold flavor. It is distinct for its very large, asymmetrical beans and unique smoky, sometimes fruity or floral aroma. Though it accounts for a small percentage of global coffee, it holds immense cultural significance in Cavite and the CALABARZON region.",
    features: [
      'Elevation(Meters Above the Sea Level): 600-1000',
      'Temperature:10-30°C',
      'Sunshine Requirements: 50%',
      'Wind Requirements: Slight',
      'Relative Humidity(%): 70-90',
      'Rainfall(mm): 150',
      'Soil(pH): 5.6-6.5',
      'Soil Depth(m): 1.5',
      'Organic Matter(OM): Rich in OM'
    ],
  },
  {
    key: 'excelsa',
    image: excelsaImg,
    imageAlt: 'Excelsa coffee variety',
    title: 'Excelsa (Coffea liberica)',
    tagline: 'The complex, tart note that adds depth to blends.',
    description:
      'Excelsa is often classified as a variety of Liberica but has a unique and complex flavor profile. It provides tart, dark, and lingering notes with hints of fruitiness. It is often used in blends to add body and depth, and it grows well at medium altitudes.',
    features: [
      'Elevation(Meters Above the Sea Level): 600-1000',
      'Temperature:10-30°C',
      'Sunshine Requirements: 50%',
      'Wind Requirements: Slight',
      'Relative Humidity(%): 70-90',
      'Rainfall(mm): 150',
      'Soil(pH): 5.6-6.5',
      'Soil Depth(m): 1.5',
      'Organic Matter(OM): Rich in OM'
    ],
  },
]

const navLinks = [
  { label: 'Home',         href: 'home.html' },
  { label: 'About',        href: 'about.html', isActive: true },
  { label: 'Contact',      href: '#' },
  { label: '⚡ Predictor', href: 'Index.html' },
]

const aboutArticles = [
  {
    key: 'brewing-hope',
    kicker: 'Rappler | MovePH',
    title: 'Brewing hope: How Amadeo farmers cope amid the struggling coffee industry',
    summary:
      'A feature on how Amadeo coffee farmers are adapting to climate-related disruptions, aging coffee trees, and unstable farm incomes while rebuilding through cooperative support and local initiatives.',
    sourceUrl: 'https://www.rappler.com/moveph/brewing-hope-how-amadeo-farmers-cope-amid-the-struggling-coffee-industry/',
  },
  {
    key: 'rise-from-ashes',
    kicker: 'Rappler | Business',
    title: 'WATCH: Cavite coffee farmers struggle to rise from the ashes',
    summary:
      'A video report on Amadeo farmers after the Taal ashfall, including the long recovery timeline for damaged coffee trees and support needed from government and local partners.',
    sourceUrl: 'https://www.rappler.com/business/250602-video-cavite-coffee-farmers-struggle-rise-from-ashes/',
  },
  {
    key: 'lost-and-damaged',
    kicker: 'Rappler | Philippine News',
    title: 'Lost and damaged: Taal Volcano steals livelihoods',
    summary:
      'This report includes accounts from Amadeo, where coffee growers faced severe livelihood losses after the eruption and expected a multi-year period before full farm recovery.',
    sourceUrl: 'https://www.rappler.com/philippines/249624-lost-damaged-taal-volcano-eruption-january-2020-steals-livelihoods/',
  },
  {
    key: 'ashfall-calabarzon',
    kicker: 'Rappler | Philippine News',
    title: 'LOOK: Ashfall from Taal Volcano spreads to Calabarzon, Metro Manila',
    summary:
      'A photo report documenting ashfall across Calabarzon, including Cavite, which contextualizes the environmental event that affected coffee communities in the area.',
    sourceUrl: 'https://www.rappler.com/philippines/249112-photos-ashfall-taal-volcano-january-2020/',
  },
]

export default function AboutPage() {
  const navigate = useNavigate()
  const location = useLocation()
  
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => isAdminAuthenticated())
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const timeoutRef = useRef(null)
  const [cmsContent, setCmsContent] = useState({
    main: {
      title: 'The Heart of Amadeo Cavite\'s Coffee: Our Upland Varieties',
      description: 'Exploring the unique characteristics of Robusta, Liberica, and Excelsa, the foundation of the region\'s rich coffee heritage.'
    },
    mission: {
      text: ''
    },
    vision: {
      text: ''
    },
    varieties: {},
    articles: {}
  })

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
      navigate('/about', { replace: true })
    }
  }, [navigate, location.search, isAdminLoggedIn])

  // Load CMS content from backend on page mount
  useEffect(() => {
    const loadCMSContent = async () => {
      try {
        const response = await fetch(`${API_BASE}/cms/page/about`)
        if (response.ok) {
          const data = await response.json()
          console.log('Loaded About CMS content from backend:', data)
          
          // Backend returns {content: {section: {key: value}}}
          const cmsData = data.content || {}
          
          // Update state with loaded data
          setCmsContent(prev => ({
            main: cmsData.main || prev.main,
            mission: cmsData.mission || prev.mission,
            vision: cmsData.vision || prev.vision
          }))
        }
      } catch (error) {
        console.log('Note: No saved CMS content for about page yet, using defaults:', error.message)
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
      const response = await fetch(`${API_BASE}/cms/page/about`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cmsContent),
      })
      if (response.ok) {
        alert('✓ Changes saved successfully!')
        navigate('/cms', { replace: true })
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

  // Compute whether to show edit UI in real-time
  const shouldShowEditUI = isAdminLoggedIn && new URLSearchParams(location.search).get('edit') === 'true'

  return (
    <div className={`coffee-homepage-body about-page-body${isFadingOut ? ' fade-out' : ''}`} style={(isAdminLoggedIn && new URLSearchParams(location.search).get('edit') === 'true') ? { paddingTop: '80px' } : {}}>
      {/* Edit mode toolbar - only show if BOTH admin is logged in AND URL has ?edit=true */}
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
          ✏️ EDIT MODE - Editing About Page
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
              onClick={(event) => {
                if (shouldShowEditUI && link.href === 'home.html') {
                  event.preventDefault()
                  navigate('/home?edit=true')
                  return
                }
                navigateWithFade(event, link.href)
              }}
              className={link.isActive ? 'active' : undefined}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>

      <div className="homepage-layout">
        <div className="page-hero-header">
          {shouldShowEditUI ? (
            <input
              type="text"
              value={cmsContent.main?.title || ''}
              onChange={(e) => setCmsContent(prev => ({ ...prev, main: { ...prev.main, title: e.target.value } }))}
              className="page-title"
              style={{ width: '100%', padding: '12px', fontSize: '2.5em', fontWeight: 'bold', color: '#42dc94', marginBottom: '16px' }}
            />
          ) : (
            <h1 className="page-title">
              {cmsContent.main?.title || 'The Heart of Amadeo Cavite\'s Coffee: Our Upland Varieties'}
            </h1>
          )}
          {shouldShowEditUI ? (
            <textarea
              value={cmsContent.main?.description || ''}
              onChange={(e) => setCmsContent(prev => ({ ...prev, main: { ...prev.main, description: e.target.value } }))}
              className="page-subtitle"
              style={{ width: '100%', padding: '12px', minHeight: '80px', fontSize: '1em', marginBottom: '16px' }}
            />
          ) : (
            <p className="page-subtitle">
              {cmsContent.main?.description || 'Exploring the unique characteristics of Robusta, Liberica, and Excelsa, the foundation of the region\'s rich coffee heritage.'}
            </p>
          )}
        </div>

        <div className="variety-grid">
          {varietyCards.map((variety) => {
            const editData = cmsContent.varieties?.[variety.key] || {
              title: variety.title,
              tagline: variety.tagline,
              description: variety.description,
              features: variety.features
            }
            
            return (
            <article key={variety.key} className="variety-card card variety-card-full-info">
              <div className={`variety-image-placeholder ${variety.key}`}>
                <img src={variety.image} alt={variety.imageAlt} className={`variety-image-placeholder ${variety.key}`} />
              </div>
              <div className="variety-info">
                {shouldShowEditUI ? (
                  <>
                    <input
                      type="text"
                      value={editData.title || variety.title}
                      onChange={(e) => setCmsContent(prev => ({
                        ...prev,
                        varieties: { ...prev.varieties, [variety.key]: { ...editData, title: e.target.value } }
                      }))}
                      style={{ width: '100%', padding: '6px', fontSize: '1.1em', fontWeight: 'bold', marginBottom: '8px' }}
                    />
                    <input
                      type="text"
                      value={editData.tagline || variety.tagline}
                      onChange={(e) => setCmsContent(prev => ({
                        ...prev,
                        varieties: { ...prev.varieties, [variety.key]: { ...editData, tagline: e.target.value } }
                      }))}
                      style={{ width: '100%', padding: '6px', fontSize: '0.9em', marginBottom: '8px' }}
                    />
                    <textarea
                      value={editData.description || variety.description}
                      onChange={(e) => setCmsContent(prev => ({
                        ...prev,
                        varieties: { ...prev.varieties, [variety.key]: { ...editData, description: e.target.value } }
                      }))}
                      style={{ width: '100%', padding: '6px', minHeight: '80px', fontSize: '0.85em', marginBottom: '8px' }}
                    />
                  </>
                ) : (
                  <>
                    <h3 className="variety-title">{editData.title || variety.title}</h3>
                    <p className="variety-tagline">{editData.tagline || variety.tagline}</p>
                    <p className="variety-description">{editData.description || variety.description}</p>
                  </>
                )}
                <ul className="variety-features">
                  {(editData.features || variety.features).map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </div>
            </article>
            )
          })}
        </div>

        {(cmsContent.mission?.text || cmsContent.vision?.text || shouldShowEditUI) && (
          <section className="mission-vision-section" style={{ marginTop: '32px', padding: '24px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {(cmsContent.mission?.text || shouldShowEditUI) && (
                <div>
                  <h2 style={{ marginBottom: '12px', color: '#6B7D92' }}>Our Mission</h2>
                  {shouldShowEditUI ? (
                    <textarea
                      value={cmsContent.mission?.text || ''}
                      onChange={(e) => setCmsContent(prev => ({ ...prev, mission: { ...prev.mission, text: e.target.value } }))}
                      style={{ width: '100%', padding: '8px', minHeight: '100px', fontSize: '1em' }}
                      placeholder="Enter mission statement..."
                    />
                  ) : (
                    <p style={{ lineHeight: '1.6', color: '#555' }}>{cmsContent.mission?.text}</p>
                  )}
                </div>
              )}
              {(cmsContent.vision?.text || shouldShowEditUI) && (
                <div>
                  <h2 style={{ marginBottom: '12px', color: '#6B7D92' }}>Our Vision</h2>
                  {shouldShowEditUI ? (
                    <textarea
                      value={cmsContent.vision?.text || ''}
                      onChange={(e) => setCmsContent(prev => ({ ...prev, vision: { ...prev.vision, text: e.target.value } }))}
                      style={{ width: '100%', padding: '8px', minHeight: '100px', fontSize: '1em' }}
                      placeholder="Enter vision statement..."
                    />
                  ) : (
                    <p style={{ lineHeight: '1.6', color: '#555' }}>{cmsContent.vision?.text}</p>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        <section className="about-articles-section" aria-labelledby="about-articles-heading">
          <h2 id="about-articles-heading" className="about-articles-heading">
            More Articles About Amadeo Coffee
          </h2>
          <div className="about-articles-list">
            {aboutArticles.map((article) => {
              const editData = cmsContent.articles?.[article.key] || {
                kicker: article.kicker,
                title: article.title,
                summary: article.summary,
                sourceUrl: article.sourceUrl
              }
              
              return (
              <article key={article.key} className="about-article-card card">
                {shouldShowEditUI ? (
                  <>
                    <input
                      type="text"
                      value={editData.kicker || article.kicker}
                      onChange={(e) => setCmsContent(prev => ({
                        ...prev,
                        articles: { ...prev.articles, [article.key]: { ...editData, kicker: e.target.value } }
                      }))}
                      style={{ width: '100%', padding: '6px', fontSize: '0.85em', marginBottom: '8px', color: '#666' }}
                    />
                    <input
                      type="text"
                      value={editData.title || article.title}
                      onChange={(e) => setCmsContent(prev => ({
                        ...prev,
                        articles: { ...prev.articles, [article.key]: { ...editData, title: e.target.value } }
                      }))}
                      style={{ width: '100%', padding: '6px', fontSize: '1.1em', fontWeight: 'bold', marginBottom: '8px' }}
                    />
                    <textarea
                      value={editData.summary || article.summary}
                      onChange={(e) => setCmsContent(prev => ({
                        ...prev,
                        articles: { ...prev.articles, [article.key]: { ...editData, summary: e.target.value } }
                      }))}
                      style={{ width: '100%', padding: '6px', minHeight: '70px', fontSize: '0.9em', marginBottom: '8px' }}
                    />
                    <input
                      type="url"
                      value={editData.sourceUrl || article.sourceUrl}
                      onChange={(e) => setCmsContent(prev => ({
                        ...prev,
                        articles: { ...prev.articles, [article.key]: { ...editData, sourceUrl: e.target.value } }
                      }))}
                      style={{ width: '100%', padding: '6px', fontSize: '0.85em' }}
                      placeholder="Article URL..."
                    />
                  </>
                ) : (
                  <>
                    <p className="about-article-kicker">{editData.kicker || article.kicker}</p>
                    <h3 className="about-article-title">{editData.title || article.title}</h3>
                    <p className="about-article-text">{editData.summary || article.summary}</p>
                    <p className="about-article-source">
                      Source:{' '}
                      <a href={editData.sourceUrl || article.sourceUrl} target="_blank" rel="noreferrer">
                        View full article
                      </a>
                    </p>
                  </>
                )}
              </article>
              )
            })}
          </div>
        </section>
      </div>

      <footer className="main-footer">
        <p>&copy; 2025 Cavite Upland Coffee Analytics. All rights reserved.</p>
      </footer>
    </div>
  )
}