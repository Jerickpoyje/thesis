const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function deepClone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value))
}

export function deepMerge(baseValue, overrideValue) {
  if (overrideValue == null) return deepClone(baseValue)
  if (Array.isArray(baseValue) || Array.isArray(overrideValue)) {
    return deepClone(overrideValue)
  }

  if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
    const merged = { ...deepClone(baseValue) }
    for (const [key, nestedValue] of Object.entries(overrideValue)) {
      merged[key] = key in merged ? deepMerge(merged[key], nestedValue) : deepClone(nestedValue)
    }
    return merged
  }

  return deepClone(overrideValue)
}

export function parseCmsValue(value) {
  if (value == null) return null
  if (typeof value !== 'string') return value

  const trimmed = value.trim()
  if (!trimmed) return ''

  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

export function normalizeCmsDocument(defaultDocument, remoteContent) {
  const normalized = {}
  const remoteSections = remoteContent && typeof remoteContent === 'object' ? remoteContent : {}

  for (const [sectionKey, defaultValue] of Object.entries(defaultDocument)) {
    const remoteSection = remoteSections[sectionKey]
    const rawValue = isPlainObject(remoteSection) && 'data' in remoteSection ? remoteSection.data : remoteSection
    const parsedValue = parseCmsValue(rawValue)

    if (isPlainObject(defaultValue) && isPlainObject(parsedValue)) {
      normalized[sectionKey] = deepMerge(defaultValue, parsedValue)
    } else if (parsedValue != null) {
      normalized[sectionKey] = deepClone(parsedValue)
    } else {
      normalized[sectionKey] = deepClone(defaultValue)
    }
  }

  for (const [sectionKey, remoteSection] of Object.entries(remoteSections)) {
    if (sectionKey in normalized) continue
    const rawValue = isPlainObject(remoteSection) && 'data' in remoteSection ? remoteSection.data : remoteSection
    normalized[sectionKey] = parseCmsValue(rawValue)
  }

  return normalized
}

export function serializeCmsDocument(document) {
  const payload = {}
  for (const [sectionKey, sectionValue] of Object.entries(document)) {
    payload[sectionKey] = {
      data: JSON.stringify(sectionValue),
    }
  }
  return payload
}

export async function fetchCmsDocument(pageKey) {
  const response = await fetch(`${API_BASE}/cms/page/${pageKey}`)
  if (!response.ok) {
    throw new Error(`Failed to load CMS content (${response.status})`)
  }

  const data = await response.json()
  return data.content || {}
}

export async function saveCmsDocument(pageKey, document) {
  const response = await fetch(`${API_BASE}/cms/page/${pageKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(serializeCmsDocument(document)),
  })

  if (!response.ok) {
    throw new Error(`Failed to save CMS content (${response.status})`)
  }

  return response.json()
}

export function getCmsEditMode(locationSearch) {
  return new URLSearchParams(locationSearch).get('edit') === 'true'
}
