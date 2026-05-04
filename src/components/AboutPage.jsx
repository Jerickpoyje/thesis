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
      navigate('/about', { replace: true })
    }
  }, [navigate, location.search, isAdminLoggedIn])


  const navigateWithFade = (event, href) => {
    const targetRoute = toAppRoute(href)
    if (!targetRoute) { event.preventDefault(); return }
    event.preventDefault()
    setIsFadingOut(true)
    timeoutRef.current = window.setTimeout(() => navigate(targetRoute), FADE_DURATION_MS)
  }


  return (
    <div className={`coffee-homepage-body about-page-body${isFadingOut ? ' fade-out' : ''}`} style={{}}>
      {/* Edit mode toolbar removed */}

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
          <h1 className="page-title">
            The Heart of Amadeo Cavite's Coffee: Our Upland Varieties
          </h1>
          <p className="page-subtitle">
            Exploring the unique characteristics of Robusta, Liberica, and Excelsa, the foundation of the region's rich coffee heritage.
          </p>
        </div>

        <div className="variety-grid">
          {varietyCards.map((variety) => {
            return (
            <article key={variety.key} className="variety-card card variety-card-full-info">
              <div className={`variety-image-placeholder ${variety.key}`}>
                <img src={variety.image} alt={variety.imageAlt} className={`variety-image-placeholder ${variety.key}`} />
              </div>
              <div className="variety-info">
                <>
                  <h3 className="variety-title">{variety.title}</h3>
                  <p className="variety-tagline">{variety.tagline}</p>
                  <p className="variety-description">{variety.description}</p>
                </>
                <ul className="variety-features">
                  {variety.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </div>
            </article>
            )
          })}
        </div>

        <section className="mission-vision-section" style={{ marginTop: '32px', padding: '24px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <h2 style={{ marginBottom: '12px', color: '#6B7D92' }}>Our Mission</h2>
              <p style={{ lineHeight: '1.6', color: '#555' }}>To cultivate and promote sustainable coffee farming practices in Amadeo Cavite, preserving traditional cultivation methods while embracing modern agricultural innovations.</p>
            </div>
            <div>
              <h2 style={{ marginBottom: '12px', color: '#6B7D92' }}>Our Vision</h2>
              <p style={{ lineHeight: '1.6', color: '#555' }}>To position Amadeo Cavite as a premier coffee region known for exceptional quality, sustainability, and heritage-driven agricultural excellence.</p>
            </div>
          </div>
        </section>

        <section className="about-articles-section" aria-labelledby="about-articles-heading">
          <h2 id="about-articles-heading" className="about-articles-heading">
            More Articles About Amadeo Coffee
          </h2>
          <div className="about-articles-list">
            {aboutArticles.map((article) => {
              return (
              <article key={article.key} className="about-article-card card">
                <>
                  <p className="about-article-kicker">{article.kicker}</p>
                  <h3 className="about-article-title">{article.title}</h3>
                  <p className="about-article-text">{article.summary}</p>
                  <p className="about-article-source">
                    Source:{' '}
                    <a href={article.sourceUrl} target="_blank" rel="noreferrer">
                      View full article
                    </a>
                  </p>
                </>
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