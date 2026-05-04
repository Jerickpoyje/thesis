import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../assets/css/cms-style.css'
import { toAppRoute } from '../utils/navigation'

const FADE_DURATION_MS = 500

const sidebarLinks = [
  { label: 'Analytics Dashboard', href: 'admin.html' },
  { label: 'Content Management', href: 'cms.html' },
  { label: 'Home page Edit', href: 'home.html?edit=true' },
  { label: 'About page Edit', href: 'about.html?edit=true' },
  { label: 'Return to Admin', href: 'admin.html' },
]

function SidebarSection({ title, links, onNavigate, currentPage }) {
  return (
    <>
      <h4>{title}</h4>
      <ul>
        {links.map((link) => (
          <li key={link.label}>
            {link.page ? (
              <a
                href="#"
                className={currentPage === link.page ? 'active' : undefined}
                onClick={(e) => {
                  e.preventDefault()
                  onNavigate(link.page)
                }}
              >
                <span>{link.label}</span>
              </a>
            ) : (
              <a
                href={link.href}
                className={link.isActive ? 'active' : undefined}
                onClick={(event) => onNavigate(event, link.href)}
              >
                <span>{link.label}</span>
              </a>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}

export default function CMSPage() {
  const navigate = useNavigate()
  const [isFadingOut, setIsFadingOut] = useState(false)
  const timeoutRef = useRef(null)
  const [currentPage, setCurrentPage] = useState('home')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pageContent, setPageContent] = useState({})
  const [editingContent, setEditingContent] = useState({})

  // Load content from Supabase
  useEffect(() => {
    const loadContent = async () => {
      setLoading(true)
      try {
        const response = await fetch(`http://localhost:8000/cms/page/${currentPage}`)
        const data = await response.json()
        // Backend returns { content: { section: { key: value } } }
        const content = data.content || {}
        setPageContent(content)
        setEditingContent(content)
      } catch (error) {
        console.error('Error loading content:', error)
        setPageContent({})
        setEditingContent({})
      } finally {
        setLoading(false)
      }
    }
    loadContent()
  }, [currentPage])

  const handleSaveContent = async () => {
    setSaving(true)
    try {
      const response = await fetch(`http://localhost:8000/cms/page/${currentPage}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingContent),
      })
      if (response.ok) {
        setPageContent({ ...editingContent })
        alert('✓ Content saved successfully!')
      } else {
        alert('❌ Failed to save content')
      }
    } catch (error) {
      console.error('Error saving content:', error)
      alert('❌ Error saving content')
    } finally {
      setSaving(false)
    }
  }

  const handlePageNavigation = (page) => {
    setCurrentPage(page)
  }

  const handleSidebarNavigation = (event, href) => {
    if (typeof event === 'string') return
    
    const targetRoute = toAppRoute(href)
    if (!targetRoute) {
      event.preventDefault()
      return
    }

    event.preventDefault()
    setIsFadingOut(true)

    timeoutRef.current = window.setTimeout(() => {
      navigate(targetRoute)
    }, FADE_DURATION_MS)
  }

  // Helper to handle nested content updates
  const updateContent = (section, field, value) => {
    setEditingContent((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }))
  }

  return (
    <div className={`cms-page-body${isFadingOut ? ' fade-out' : ''}`}>
      <div className="sidebar">
        <div className="logo-container">
          <span className="logo-icon">🌱</span>
          <span className="logo-text">Coffee Prediction Analysis</span>
        </div>

        <nav className="sidebar-nav" aria-label="Sidebar navigation">
          <SidebarSection 
            title="Navigation" 
            links={sidebarLinks} 
            onNavigate={(arg1, arg2) => {
              if (typeof arg1 === 'string') {
                handlePageNavigation(arg1)
              } else {
                handleSidebarNavigation(arg1, arg2)
              }
            }}
            currentPage={currentPage}
          />
        </nav>
      </div>

      <div className="main-content">
        <div className="top-nav">
          <div className="welcome-message">
            {currentPage === 'home' ? 'Home Page' : currentPage === 'about' ? 'About Page' : 'Content Management'} - Content Editor
          </div>
          <div className="top-nav-right">
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

        <div className="cms-container">
          {loading ? (
            <div className="empty-state">
              <p>Loading content...</p>
            </div>
          ) : currentPage === 'home' ? (
            <div className="content-editor">
              <div className="cms-header">
                <h1>Home Page Content</h1>
                <button
                  className="btn-primary"
                  onClick={handleSaveContent}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : '💾 Save Changes'}
                </button>
              </div>

              <div className="editor-section">
                <h2>Hero Section</h2>
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={editingContent.hero?.title || ''}
                    onChange={(e) => updateContent('hero', 'title', e.target.value)}
                    placeholder="Hero title"
                  />
                </div>
                <div className="form-group">
                  <label>Subtitle</label>
                  <textarea
                    value={editingContent.hero?.subtitle || ''}
                    onChange={(e) => updateContent('hero', 'subtitle', e.target.value)}
                    placeholder="Hero subtitle"
                    rows="3"
                  />
                </div>
              </div>

              <div className="editor-section">
                <h2>About Section</h2>
                <div className="form-group">
                  <label>Section Title</label>
                  <input
                    type="text"
                    value={editingContent.about?.title || ''}
                    onChange={(e) => updateContent('about', 'title', e.target.value)}
                    placeholder="About title"
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={editingContent.about?.text || ''}
                    onChange={(e) => updateContent('about', 'text', e.target.value)}
                    placeholder="About description"
                    rows="4"
                  />
                </div>
              </div>

              <div className="editor-section">
                <h2>Meeting Section</h2>
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={editingContent.meeting?.title || ''}
                    onChange={(e) => updateContent('meeting', 'title', e.target.value)}
                    placeholder="Meeting section title"
                  />
                </div>
                <div className="form-group">
                  <label>Subtitle</label>
                  <textarea
                    value={editingContent.meeting?.subtitle || ''}
                    onChange={(e) => updateContent('meeting', 'subtitle', e.target.value)}
                    placeholder="Meeting section subtitle"
                    rows="3"
                  />
                </div>
              </div>
            </div>
          ) : currentPage === 'about' ? (
            <div className="content-editor">
              <div className="cms-header">
                <h1>About Page Content</h1>
                <button
                  className="btn-primary"
                  onClick={handleSaveContent}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : '💾 Save Changes'}
                </button>
              </div>

              <div className="editor-section">
                <h2>Main Content</h2>
                <div className="form-group">
                  <label>Page Title</label>
                  <input
                    type="text"
                    value={editingContent.main?.title || ''}
                    onChange={(e) => updateContent('main', 'title', e.target.value)}
                    placeholder="About page title"
                  />
                </div>
                <div className="form-group">
                  <label>Page Description</label>
                  <textarea
                    value={editingContent.main?.description || ''}
                    onChange={(e) => updateContent('main', 'description', e.target.value)}
                    placeholder="About page description"
                    rows="6"
                  />
                </div>
              </div>

              <div className="editor-section">
                <h2>Mission</h2>
                <div className="form-group">
                  <label>Mission Text</label>
                  <textarea
                    value={editingContent.mission?.text || ''}
                    onChange={(e) => updateContent('mission', 'text', e.target.value)}
                    placeholder="Mission statement"
                    rows="4"
                  />
                </div>
              </div>

              <div className="editor-section">
                <h2>Vision</h2>
                <div className="form-group">
                  <label>Vision Text</label>
                  <textarea
                    value={editingContent.vision?.text || ''}
                    onChange={(e) => updateContent('vision', 'text', e.target.value)}
                    placeholder="Vision statement"
                    rows="4"
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
