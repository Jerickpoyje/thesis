export const ADMIN_AUTH_KEY = 'isAdminAuthenticated'
export const ADMIN_AUTH_TOKEN_KEY = 'adminAuthToken'
export const ADMIN_AUTH_EMAIL_KEY = 'adminAuthEmail'
export const ADMIN_AUTH_CHANGED_EVENT = 'admin-auth-changed'

function readTokenPayload(token) {
  if (!token) return null

  try {
    const payloadPart = token.split('.')[1]
    if (!payloadPart) return null
    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const payloadJson = window.atob(padded)
    return JSON.parse(payloadJson)
  } catch {
    return null
  }
}

function isTokenExpired(token) {
  const payload = readTokenPayload(token)
  if (!payload || typeof payload.exp !== 'number') return true
  return Date.now() >= payload.exp * 1000
}

export function isAdminAuthenticated() {
  const token = window.localStorage.getItem(ADMIN_AUTH_TOKEN_KEY)
  return Boolean(token && !isTokenExpired(token))
}

export function getAdminAuthToken() {
  const token = window.localStorage.getItem(ADMIN_AUTH_TOKEN_KEY)
  if (!token || isTokenExpired(token)) return ''
  return token
}

export function getAdminAuthEmail() {
  return window.localStorage.getItem(ADMIN_AUTH_EMAIL_KEY) || ''
}

export function setAdminAuthenticated(isAuthenticated, token = '', email = '') {
  if (isAuthenticated) {
    if (token) window.localStorage.setItem(ADMIN_AUTH_TOKEN_KEY, token)
    if (email) window.localStorage.setItem(ADMIN_AUTH_EMAIL_KEY, email)
    window.localStorage.setItem(ADMIN_AUTH_KEY, 'true')
  } else {
    window.localStorage.removeItem(ADMIN_AUTH_KEY)
    window.localStorage.removeItem(ADMIN_AUTH_TOKEN_KEY)
    window.localStorage.removeItem(ADMIN_AUTH_EMAIL_KEY)
    window.sessionStorage.removeItem(ADMIN_AUTH_KEY)
  }

  window.dispatchEvent(new Event(ADMIN_AUTH_CHANGED_EVENT))
}
