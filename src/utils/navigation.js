const routeMap = {
  'home.html': '/home',
  'about.html': '/about',
  'index.html': '/predictive-map',
  'login_register.html': '/login',
  'admin.html': '/admin',
  'models.html': '/models',
  'users.html': '/users',
  'reports.html': '/reports',
  'soil-types.html': '/soil-types',
  'geo-data.html': '/geo-data',
  'logs.html': '/logs',
  'profile.html': '/profile',
  // Component file mappings
  'homepage.jsx': '/home',
  'aboutpage.jsx': '/about',
  'indexpage.jsx': '/predictive-map',
  'loginregisterpage.jsx': '/login',
  'adminpage.jsx': '/admin',
  
  'modelspage.jsx': '/models',
  'userspage.jsx': '/users',
  'reportspage.jsx': '/reports',
  'soiltypespage.jsx': '/soil-types',
  'geodatapage.jsx': '/geo-data',
  'logspage.jsx': '/logs',
  'profilepage.jsx': '/profile',
}

export function toAppRoute(href) {
  if (!href || href === '#') {
    return null
  }

  // Separate query string from the path
  const [basePath, queryString] = href.split('?')
  
  const normalized = basePath.trim().replace(/^\/+/, '').replace(/^\.\//, '').toLowerCase()
  let route = null
  
  if (routeMap[normalized]) {
    route = routeMap[normalized]
  } else if (normalized.endsWith('.html')) {
    const name = normalized.replace('.html', '')
    route = `/${name}`
  } else if (normalized.endsWith('.jsx')) {
    const name = normalized.replace('.jsx', '')
    route = `/${name}`
  }

  // Reattach query string if it existed
  if (route && queryString) {
    return `${route}?${queryString}`
  }
  
  return route
}
