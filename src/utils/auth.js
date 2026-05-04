export const ADMIN_AUTH_KEY = 'isAdminAuthenticated'
export const ADMIN_AUTH_CHANGED_EVENT = 'admin-auth-changed'

export function isAdminAuthenticated() {
  return window.localStorage.getItem(ADMIN_AUTH_KEY) === 'true'
}

export function setAdminAuthenticated(isAuthenticated) {
  if (isAuthenticated) {
    window.localStorage.setItem(ADMIN_AUTH_KEY, 'true')
  } else {
    window.localStorage.removeItem(ADMIN_AUTH_KEY)
    window.sessionStorage.removeItem(ADMIN_AUTH_KEY)
  }

  window.dispatchEvent(new Event(ADMIN_AUTH_CHANGED_EVENT))
}
