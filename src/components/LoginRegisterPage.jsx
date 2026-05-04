import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import '../assets/css/styles.css'
import '../assets/css/home-style.css'
import '../assets/css/login-register-page.css'
import { ADMIN_AUTH_CHANGED_EVENT, isAdminAuthenticated, setAdminAuthenticated } from '../utils/auth'

import bg1 from '../assets/images/bg-1.png'
import bg2 from '../assets/images/bg-2.png'
import bg3 from '../assets/images/bg-3.png'

const ADMIN_ACCOUNT = {
  email: 'admin@amadeocoffee.ph',
  password: 'Admin@123',
}

function SocialLinks() {
  return (
    <div className="social-container">
      <a href="#" className="social" aria-label="Facebook">
        <span className="social-icon">f</span>
      </a>
      <a href="#" className="social" aria-label="Google">
        <span className="social-icon">G+</span>
      </a>
      <a href="#" className="social" aria-label="LinkedIn">
        <span className="social-icon">in</span>
      </a>
    </div>
  )
}

export default function LoginRegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => isAdminAuthenticated())
  const [loginError, setLoginError] = useState('')
  const [isTermsOpen, setIsTermsOpen] = useState(false)

  useEffect(() => {
    const syncAuth = () => {
      setIsAdminLoggedIn(isAdminAuthenticated())
    }

    window.addEventListener(ADMIN_AUTH_CHANGED_EVENT, syncAuth)
    window.addEventListener('focus', syncAuth)

    return () => {
      window.removeEventListener(ADMIN_AUTH_CHANGED_EVENT, syncAuth)
      window.removeEventListener('focus', syncAuth)
    }
  }, [])

  const handleLoginSubmit = (event) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const email = (formData.get('email') || '').toString().trim().toLowerCase()
    const password = (formData.get('password') || '').toString()

    if (email === ADMIN_ACCOUNT.email.toLowerCase() && password === ADMIN_ACCOUNT.password) {
      setAdminAuthenticated(true)
      setIsAdminLoggedIn(true)
      setLoginError('')
      const searchParams = new URLSearchParams(location.search)
      const redirectTarget = searchParams.get('redirect')
      const safeRedirect = redirectTarget && redirectTarget.startsWith('/') ? redirectTarget : '/admin'
      navigate(safeRedirect, { replace: true })
      return
    }

    setLoginError('Invalid username or password.')
  }

  return (
    <div className="coffee-homepage-body login-page-focused">
      <div id="slideshow-background">
        <img src={bg1} alt="Coffee slideshow image 1" className="slideshow-image" />
        <img src={bg2} alt="Coffee slideshow image 2" className="slideshow-image" />
        <img src={bg3} alt="Coffee slideshow image 3" className="slideshow-image" />
      </div>

      <div className="login-page-header">
        <div className="logo-container">
          <span className="logo-icon">🌱</span>
          <span className="logo-text">Amadeo Coffee</span>
        </div>
      </div>

      <div className="login-page-wrapper">
        <div className="container login-only" id="container">
          <div className="form-container sign-in-container">
            <form onSubmit={handleLoginSubmit}>
              <h1>Sign in</h1>
              <SocialLinks />
              <span>or use your account</span>
              <input type="email" placeholder="Email" name="email" required />
              <input type="password" placeholder="Password" name="password" required />
              <div className="admin-account-hint">
                Demo: admin@amadeocoffee.ph / Admin@123
              </div>
              {loginError ? <p className="login-error">{loginError}</p> : null}
              <a href="#">Forgot your password?</a>
              <button type="submit">Login</button>
            </form>
          </div>
        </div>

        {isTermsOpen ? (
          <div className="terms-modal-backdrop" role="dialog" aria-modal="true" aria-label="Terms and Conditions" onClick={() => setIsTermsOpen(false)}>
            <section className="terms-modal" onClick={(event) => event.stopPropagation()}>
              <div className="terms-modal-header">
                <h2>Terms and Conditions</h2>
                <button type="button" className="terms-close-button" aria-label="Close Terms and Conditions" onClick={() => setIsTermsOpen(false)}>
                  ×
                </button>
              </div>
              <ul>
                <li>Use accurate and up-to-date farm information when creating accounts or submitting data.</li>
                <li>Forecasts are decision-support insights and should be combined with local field validation.</li>
                <li>User credentials must be kept confidential and should not be shared with unauthorized users.</li>
                <li>Platform misuse, false data submission, or unauthorized access attempts are prohibited.</li>
                <li>By using this platform, you agree to responsible, lawful, and ethical usage.</li>
              </ul>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  )
}
