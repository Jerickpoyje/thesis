import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import '../assets/css/login-register-page.css'
import { ADMIN_AUTH_CHANGED_EVENT, isAdminAuthenticated, setAdminAuthenticated } from '../utils/auth'

const ADMIN_ACCOUNT = {
  email: 'admin@amadeocoffee.ph',
  password: 'Admin@123',
}

export default function LoginRegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loginError, setLoginError] = useState('')
  const [isTermsOpen, setIsTermsOpen] = useState(false)

  useEffect(() => {
    const syncAuth = () => {
      if (!isAdminAuthenticated()) return
      const searchParams = new URLSearchParams(location.search)
      const redirectTarget = searchParams.get('redirect')
      const safeRedirect = redirectTarget && redirectTarget.startsWith('/') ? redirectTarget : '/admin'
      navigate(safeRedirect, { replace: true })
    }

    syncAuth()
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
    <div className="auth-page-root">
      <div className="auth-page-bg" aria-hidden="true" />
      <header className="auth-page-header">
        <div className="auth-brand">
          <span className="auth-brand-icon">🌱</span>
          <span className="auth-brand-text">Amadeo Coffee</span>
        </div>
      </header>

      <main className="auth-page-main">
        <section className="auth-info-card" aria-label="Platform information">
          <p className="auth-info-eyebrow">Admin Portal</p>
          <h1>Coffee Production Analytics</h1>
          <p>
            Secure access for prediction monitoring, reports, and content management.
            Sign in with your administrator credentials.
          </p>
          <ul>
            <li>Live dashboard insights and trend monitoring</li>
            <li>Prediction logs, reports, and export tools</li>
            <li>CMS editing controls for homepage and about page</li>
          </ul>
        </section>

        <section className="auth-login-card" aria-label="Login form">
          <form onSubmit={handleLoginSubmit}>
            <h2>Sign In</h2>
            <p className="auth-subtitle">Use your administrator account to continue.</p>

            <label htmlFor="email">Email</label>
            <input id="email" type="email" placeholder="admin@amadeocoffee.ph" name="email" required autoComplete="username" />

            <label htmlFor="password">Password</label>
            <input id="password" type="password" placeholder="Enter password" name="password" required autoComplete="current-password" />

            <div className="admin-account-hint">
              Demo account: admin@amadeocoffee.ph / Admin@123
            </div>

            {loginError ? <p className="login-error">{loginError}</p> : null}

            <button type="submit">Login to Admin</button>

            <button
              type="button"
              className="terms-text-button"
              onClick={() => setIsTermsOpen(true)}
            >
              View Terms and Conditions
            </button>
          </form>
        </section>
      </main>

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
  )
}
