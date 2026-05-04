import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ADMIN_AUTH_CHANGED_EVENT, isAdminAuthenticated, setAdminAuthenticated } from '../utils/auth'

const EDIT_MODE_KEY = 'adminUiEditMode'
const UI_OVERRIDES_KEY = 'adminUiOverrides'

function getSiblingIndex(element) {
  if (!element.parentElement) {
    return 1
  }

  const { tagName } = element
  const siblings = Array.from(element.parentElement.children).filter((child) => child.tagName === tagName)
  return siblings.indexOf(element) + 1
}

function getElementSelector(element) {
  // PRIORITY 1: Use element ID if it exists
  if (element.id && element.id.trim()) {
    console.log('[SELECTOR] Using ID:', element.id)
    return `#${element.id}`
  }

  // PRIORITY 2: Build CSS path using classes (more stable in React)
  const segments = []
  let current = element
  let depth = 0

  while (current && current !== document.body && depth < 10) {
    const tagName = current.tagName.toLowerCase()
    let selector = tagName

    // Include all non-admin classes
    if (current.className && typeof current.className === 'string') {
      const classes = current.className
        .split(' ')
        .filter(c => c.trim() && !c.includes('admin-ui') && !c.includes('outline'))
        .slice(0, 3) // Limit to 3 most relevant classes
      
      if (classes.length > 0) {
        selector += '.' + classes.join('.')
      }
    }

    // FALLBACK: Use nth-of-type only if no classes found
    if (!current.className || current.className === '' || !selector.includes('.')) {
      try {
        const index = getSiblingIndex(current)
        selector += `:nth-of-type(${index})`
      } catch (e) {
        console.warn('[SELECTOR] getSiblingIndex failed:', e)
      }
    }

    segments.unshift(selector)
    current = current.parentElement
    depth++
  }

  const fullSelector = `body > ${segments.join(' > ')}`
  console.log('[SELECTOR] Generated selector:', fullSelector)
  return fullSelector
}

function createFallbackSelector(element) {
  try {
    // Try to create a selector using IDs and classes if available
    if (element.id) {
      return `#${element.id}`
    }
    
    if (element.className) {
      const classes = String(element.className).split(' ').filter(c => c.trim() && !c.includes('admin-ui'))
      if (classes.length > 0) {
        return `${element.tagName.toLowerCase()}.${classes.join('.')}`
      }
    }
  } catch (e) {
    console.error('Fallback selector error:', e)
  }
  return null
}

function isSelectableElement(element) {
  if (!(element instanceof Element)) {
    return false
  }

  if (['HTML', 'BODY', 'SCRIPT', 'STYLE', 'NOSCRIPT'].includes(element.tagName)) {
    return false
  }

  if (element.closest('[data-admin-ui-editor]')) {
    return false
  }

  return true
}

function findSelectableElement(start) {
  let current = start

  while (current && current !== document.body) {
    if (isSelectableElement(current)) {
      return current
    }
    current = current.parentElement
  }

  return null
}

function loadOverrides() {
  try {
    const raw = window.localStorage.getItem(UI_OVERRIDES_KEY)
    console.log('[DEBUG] loadOverrides - raw data:', raw ? 'exists' : 'empty')
    if (!raw) {
      return {}
    }
    const parsed = JSON.parse(raw)
    console.log('[DEBUG] loadOverrides - parsed overrides:', Object.keys(parsed).length, 'items')
    return typeof parsed === 'object' && parsed ? parsed : {}
  } catch (err) {
    console.error('[ERROR] loadOverrides failed:', err)
    return {}
  }
}

function saveOverrides(overrides) {
  try {
    console.log('[STORAGE] Attempting to save', Object.keys(overrides).length, 'overrides...')
    const json = JSON.stringify(overrides)
    console.log('[STORAGE] JSON size:', json.length, 'bytes')
    
    window.localStorage.setItem(UI_OVERRIDES_KEY, json)
    
    console.log('[STORAGE] ✓ Save succeeded')
    return true
  } catch (err) {
    console.error('[STORAGE] ✗ Save FAILED:', err.message)
    throw err // Re-throw so caller can handle
  }
}

function applyOverrideToElement(element, item) {
  console.log('[APPLY] Starting override application to element:', element.tagName)
  
  try {
    // Apply text content
    if (item.textEnabled && typeof item.text === 'string' && item.text.trim()) {
      console.log('[APPLY TEXT] Setting text:', item.text.substring(0, 50))
      element.textContent = item.text
      console.log('[APPLY TEXT OK] Verified:', element.textContent.substring(0, 50))
    }

    // Apply each style property individually
    if (item.style && typeof item.style === 'object') {
      Object.entries(item.style).forEach(([cssName, cssValue]) => {
        if (cssValue && typeof cssValue === 'string' && cssValue.trim()) {
          const jsName = cssName === 'background-color' ? 'backgroundColor' : cssName
          console.log(`[APPLY STYLE] Setting ${jsName} = ${cssValue}`)
          element.style[jsName] = cssValue
          const verified = element.style[jsName]
          console.log(`[APPLY STYLE OK] Verified ${jsName} = ${verified}`)
        }
      })
    }

    // Apply attributes (src, poster for images/videos)
    if (item.attrs && typeof item.attrs === 'object') {
      Object.entries(item.attrs).forEach(([attrName, attrValue]) => {
        if (attrValue && typeof attrValue === 'string' && attrValue.trim()) {
          console.log(`[APPLY ATTR] Setting ${attrName}`)
          element.setAttribute(attrName, attrValue)
          console.log(`[APPLY ATTR OK] Verified ${attrName}`)
        }
      })
    }

    console.log('[APPLY] Override application complete')
  } catch (err) {
    console.error('[APPLY ERROR] Failed to apply override:', err)
  }
}

function findElementBySelector(selector, fallbackAttrs, elementInfo) {
  console.log(`[SELECTOR FIND] Looking for: ${selector}`)

  // Strategy 1: Direct querySelector (fastest, most reliable if selector is valid)
  try {
    const element = document.querySelector(selector)
    if (element) {
      console.log(`[SELECTOR FIND] ✓ Strategy 1: Direct querySelector SUCCESS`)
      return element
    }
  } catch (e) {
    console.warn(`[SELECTOR FIND] Strategy 1 failed - invalid selector syntax:`, e.message)
  }

  // Strategy 2: Match by last-part of selector (tag + classes only)
  try {
    const parts = selector.split(' > ')
    if (parts.length > 0) {
      const lastPart = parts[parts.length - 1]
      const tagMatch = lastPart.match(/^([a-z0-9]+)/)
      const classMatches = lastPart.match(/\.([a-z0-9_-]+)/gi)
      
      if (tagMatch) {
        const tagName = tagMatch[1]
        const classes = classMatches ? classMatches.map(c => c.slice(1)) : []
        
        console.log(`[SELECTOR FIND] Strategy 2: Matching tag="${tagName}", classes=[${classes.join(',')}]`)
        const candidates = document.querySelectorAll(tagName)
        
        for (let elem of candidates) {
          if (classes.length === 0) {
            // No classes specified, match first element with this tag
            console.log(`[SELECTOR FIND] ✓ Strategy 2: Found by tag only`)
            return elem
          }
          
          // All required classes must be present
          if (classes.every(cls => elem.classList.contains(cls))) {
            console.log(`[SELECTOR FIND] ✓ Strategy 2: Found by tag+classes`)
            return elem
          }
        }
      }
    }
  } catch (e) {
    console.error(`[SELECTOR FIND] Strategy 2 failed:`, e.message)
  }

  // Strategy 3: Match media element (img/video) by src or poster
  if (fallbackAttrs?.src || elementInfo?.src) {
    try {
      const srcToMatch = fallbackAttrs?.src || elementInfo?.src
      console.log(`[SELECTOR FIND] Strategy 3: Matching media by src`)
      
      const mediaElement = Array.from(document.querySelectorAll('img, video')).find(
        el => {
          const elSrc = el.getAttribute('src')
          const elPoster = el.getAttribute('poster')
          return elSrc === srcToMatch || elPoster === srcToMatch
        }
      )
      
      if (mediaElement) {
        console.log(`[SELECTOR FIND] ✓ Strategy 3: Found by media src/poster`)
        return mediaElement
      }
    } catch (e) {
      console.error(`[SELECTOR FIND] Strategy 3 failed:`, e.message)
    }
  }

  // Strategy 4: Match by element tag + text content snippet
  try {
    const searchText = elementInfo?.textContent || fallbackAttrs?.textContent
    if (searchText && searchText.trim().length > 3) {
      const tagName = elementInfo?.tagName || 'div'
      console.log(`[SELECTOR FIND] Strategy 4: Matching ${tagName} by text="${searchText.substring(0, 30)}"`)
      
      const candidates = document.querySelectorAll(tagName)
      for (let elem of candidates) {
        const elemText = elem.textContent?.trim() || ''
        if (elemText === searchText.trim()) {
          console.log(`[SELECTOR FIND] ✓ Strategy 4: Found by tag+exact text`)
          return elem
        }
      }
      
      // Try partial match if exact match fails
      for (let elem of candidates) {
        const elemText = elem.textContent?.trim() || ''
        if (elemText.includes(searchText.trim())) {
          console.log(`[SELECTOR FIND] ✓ Strategy 4: Found by tag+partial text`)
          return elem
        }
      }
    }
  } catch (e) {
    console.error(`[SELECTOR FIND] Strategy 4 failed:`, e.message)
  }

  // Strategy 5: Reconstruct path from element info
  try {
    if (elementInfo?.tagName) {
      console.log(`[SELECTOR FIND] Strategy 5: Last resort - matching any ${elementInfo.tagName}`)
      const candidates = document.querySelectorAll(elementInfo.tagName)
      if (candidates.length > 0) {
        console.log(`[SELECTOR FIND] ⚠ Strategy 5: Returning first ${elementInfo.tagName} (may be wrong element)`)
        return candidates[0]
      }
    }
  } catch (e) {
    console.error(`[SELECTOR FIND] Strategy 5 failed:`, e.message)
  }

  console.error(`[SELECTOR FIND] ✗ ALL STRATEGIES FAILED - Could not find element`)
  return null
}

function applyOverrides(pathname) {
  try {
    const overrides = loadOverrides()
    const relevantOverrides = Object.entries(overrides).filter(
      ([_, item]) => item && item.pathname === pathname
    )
    
    console.log(`\n[APPLY OVERRIDES] ========== PAGE LOAD ==========`)
    console.log(`[APPLY OVERRIDES] Pathname: ${pathname}`)
    console.log(`[APPLY OVERRIDES] Total overrides in storage: ${Object.keys(overrides).length}`)
    console.log(`[APPLY OVERRIDES] Relevant to this page: ${relevantOverrides.length}`)
    console.log(`[APPLY OVERRIDES] Storage keys:`, Object.keys(overrides))

    relevantOverrides.forEach(([key, item]) => {
      try {
        console.log(`\n[APPLY OVERRIDES] Processing: "${key}"`)
        console.log(`[APPLY OVERRIDES] Selector: ${item.selector}`)
        
        if (!item.selector) {
          console.error(`[APPLY OVERRIDES] ✗ No selector in item`)
          return
        }

        const element = findElementBySelector(item.selector, item.attrs, item.elementInfo)

        if (element) {
          console.log(`[APPLY OVERRIDES] ✓ Element found!`)
          console.log(`[APPLY OVERRIDES] Element tag: ${element.tagName}`)
          console.log(`[APPLY OVERRIDES] Applying override...`)
          applyOverrideToElement(element, item)
          console.log(`[APPLY OVERRIDES] ✓ Override applied`)
        } else {
          console.error(`[APPLY OVERRIDES] ✗ Element NOT found for selector: ${item.selector}`)
        }
      } catch (err) {
        console.error(`[APPLY OVERRIDES] Error processing "${key}":`, err)
      }
    })
    
    if (relevantOverrides.length === 0) {
      console.log(`[APPLY OVERRIDES] No overrides to apply for pathname: ${pathname}`)
    }
    console.log(`[APPLY OVERRIDES] ========== DONE ==========\n`)
  } catch (err) {
    console.error(`[APPLY OVERRIDES] Fatal error:`, err)
  }
}

function loadEditMode() {
  return window.localStorage.getItem(EDIT_MODE_KEY) === 'true'
}

function isEditableRoute(pathname) {
  const editablePrefixes = [
    '/home',
    '/about',
    '/predictive-map',
    '/admin',
    '/cms',
    '/models',
    '/users',
    '/reports',
    '/soil-types',
    '/geo-data',
    '/logs',
    '/profile',
  ]
  return editablePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function isTextEditable(element) {
  if (!(element instanceof Element)) {
    return false
  }

  if (['INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'IMG', 'VIDEO', 'SOURCE'].includes(element.tagName)) {
    return false
  }

  return element.childElementCount === 0 && Boolean(element.textContent && element.textContent.trim())
}

function getMediaAttributes(element) {
  if (!(element instanceof Element)) {
    return { src: '', poster: '' }
  }

  if (element.tagName === 'IMG') {
    return {
      src: element.getAttribute('src') || '',
      poster: '',
    }
  }

  if (element.tagName === 'VIDEO') {
    return {
      src: element.getAttribute('src') || '',
      poster: element.getAttribute('poster') || '',
    }
  }

  return { src: '', poster: '' }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Unable to read file'))
      }
    }
    reader.onerror = () => reject(new Error('Unable to read file'))
    reader.readAsDataURL(file)
  })
}

function normalizeHexColor(value, fallback = '#000000') {
  if (!value || typeof value !== 'string') {
    return fallback
  }

  const color = value.trim()

  if (/^#[0-9a-fA-F]{6}$/.test(color)) {
    return color.toUpperCase()
  }

  if (/^#[0-9a-fA-F]{3}$/.test(color)) {
    const r = color[1]
    const g = color[2]
    const b = color[3]
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase()
  }

  const rgbMatch = color.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (rgbMatch) {
    const r = Number(rgbMatch[1]).toString(16).padStart(2, '0')
    const g = Number(rgbMatch[2]).toString(16).padStart(2, '0')
    const b = Number(rgbMatch[3]).toString(16).padStart(2, '0')
    return `#${r}${g}${b}`.toUpperCase()
  }

  return fallback
}

export default function AdminUiEditor() {
  const location = useLocation()
  const navigate = useNavigate()
  const selectedElementRef = useRef(null)
  
  const [isEditMode, setIsEditMode] = useState(() => loadEditMode())
  const [selectedSelector, setSelectedSelector] = useState('')
  const [selectedTagName, setSelectedTagName] = useState('')
  const [textValue, setTextValue] = useState('')
  const [textEnabled, setTextEnabled] = useState(false)
  const [textCapable, setTextCapable] = useState(false)
  const [textColor, setTextColor] = useState('')
  const [backgroundColor, setBackgroundColor] = useState('')
  const [fontSize, setFontSize] = useState('')
  const [fontWeight, setFontWeight] = useState('')
  const [borderRadius, setBorderRadius] = useState('')
  const [mediaSrc, setMediaSrc] = useState('')
  const [mediaPoster, setMediaPoster] = useState('')
  const [isMediaElement, setIsMediaElement] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [authChanged, setAuthChanged] = useState(0) // Trigger re-render on auth change
  const [forceRender, setForceRender] = useState(0) // Extra trigger for debugging

  const canEditOnRoute = useMemo(() => isEditableRoute(location.pathname), [location.pathname])
  const isAdminUser = isAdminAuthenticated() // Call directly instead of memo to always check latest state
  const selectedKey = selectedSelector ? `${location.pathname}::${selectedSelector}` : ''

  // Very important - respond to auth changes
  useEffect(() => {
    console.log('[MOUNT] AdminUiEditor mounted, initial isAdminUser:', isAdminUser)
    
    const handleAuthChange = () => {
      console.log('[AUTH CHANGE] Admin auth changed, forcing re-render')
      setAuthChanged(prev => prev + 1)
      setForceRender(prev => prev + 1)
    }

    // Listen for auth changes
    window.addEventListener(ADMIN_AUTH_CHANGED_EVENT, handleAuthChange)
    
    // Also check periodically as fallback
    const checkInterval = setInterval(() => {
      const currentAuth = isAdminAuthenticated()
      if (currentAuth !== isAdminUser) {
        console.log('[PERIODIC CHECK] Auth status changed from', isAdminUser, 'to', currentAuth)
        setForceRender(prev => prev + 1)
      }
    }, 1000)

    return () => {
      window.removeEventListener(ADMIN_AUTH_CHANGED_EVENT, handleAuthChange)
      clearInterval(checkInterval)
    }
  }, [isAdminUser])

  useEffect(() => {
    console.log('[DEBUG AdminUiEditor] Pathname:', location.pathname)
    console.log('[DEBUG AdminUiEditor] canEditOnRoute:', canEditOnRoute)
    console.log('[DEBUG AdminUiEditor] isAdminUser:', isAdminUser)
    console.log('[DEBUG AdminUiEditor] authChanged:', authChanged)
    console.log('[DEBUG AdminUiEditor] forceRender:', forceRender)
    console.log('[DEBUG AdminUiEditor] localStorage admin key:', window.localStorage.getItem('isAdminAuthenticated'))
  }, [location.pathname, canEditOnRoute, isAdminUser, authChanged, forceRender])

  const clearSelectionOutline = () => {
    window.document.querySelectorAll('[data-admin-ui-selected]').forEach((el) => {
      el.removeAttribute('data-admin-ui-selected')
      el.style.removeProperty('outline')
      el.style.removeProperty('outline-offset')
    })
  }

  useEffect(() => {
    if (!canEditOnRoute) {
      return
    }

    window.requestAnimationFrame(() => {
      applyOverrides(location.pathname)
    })

    const observer = new MutationObserver(() => {
      applyOverrides(location.pathname)
    })

    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
    }
  }, [canEditOnRoute, location.pathname])

  useEffect(() => {
    if (!canEditOnRoute || !isAdminUser || !isEditMode) {
      return
    }

    const handleClick = (event) => {
      const { target } = event
      if (!(target instanceof Element)) {
        return
      }

      if (target.closest('[data-admin-ui-editor]')) {
        return
      }

      const selectableElement = findSelectableElement(target)
      if (!selectableElement) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      const selector = getElementSelector(selectableElement)
      const tagName = selectableElement.tagName.toLowerCase()
      console.log('[DEBUG] Element selected - selector:', selector, 'tagName:', tagName)
      
      selectedElementRef.current = selectableElement
      
      const overrides = loadOverrides()
      const existing = overrides[`${location.pathname}::${selector}`] || {}
      console.log('[DEBUG] Existing override found:', Object.keys(existing).length > 0 ? 'yes' : 'no')
      
      const computedStyle = window.getComputedStyle(selectableElement)
      const canEditText = isTextEditable(selectableElement)
      const mediaAttrs = getMediaAttributes(selectableElement)
      const mediaTag = tagName === 'img' || tagName === 'video'

      clearSelectionOutline()

      selectableElement.setAttribute('data-admin-ui-selected', 'true')
      selectableElement.style.outline = '2px dashed #38C172'
      selectableElement.style.outlineOffset = '2px'

      setSelectedSelector(selector)
      setSelectedTagName(tagName)
      setTextCapable(canEditText)
      setTextEnabled(Boolean(existing.textEnabled) || canEditText)
      setTextValue(typeof existing.text === 'string' ? existing.text : canEditText ? selectableElement.textContent.trim() : '')
      setTextColor(existing.style?.color ?? computedStyle.color)
      setBackgroundColor(existing.style?.['background-color'] ?? computedStyle.backgroundColor)
      setFontSize(existing.style?.['font-size'] ?? computedStyle.fontSize)
      setFontWeight(existing.style?.['font-weight'] ?? computedStyle.fontWeight)
      setBorderRadius(existing.style?.['border-radius'] ?? computedStyle.borderRadius)
      setIsMediaElement(mediaTag)
      setMediaSrc(existing.attrs?.src ?? mediaAttrs.src)
      setMediaPoster(existing.attrs?.poster ?? mediaAttrs.poster)
    }

    document.addEventListener('click', handleClick, true)

    return () => {
      document.removeEventListener('click', handleClick, true)
    }
  }, [canEditOnRoute, isAdminUser, isEditMode, location.pathname])

  useEffect(() => {
    selectedElementRef.current = null
    setSelectedSelector('')
    setSelectedTagName('')
    setIsMediaElement(false)
    setTextValue('')
    clearSelectionOutline()
  }, [location.pathname])

  useEffect(() => {
    if (!isEditMode) {
      return
    }

    const handleEscape = (event) => {
      if (event.key !== 'Escape') {
        return
      }

      selectedElementRef.current = null
      setIsEditMode(false)
      window.localStorage.setItem(EDIT_MODE_KEY, 'false')
      setSelectedSelector('')
      setSelectedTagName('')
      setIsMediaElement(false)
      clearSelectionOutline()
    }

    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isEditMode])

  const toggleEditMode = (event) => {
    event.preventDefault()
    event.stopPropagation()

    setIsEditMode((previous) => {
      const next = !previous
      window.localStorage.setItem(EDIT_MODE_KEY, String(next))

      if (!next) {
        selectedElementRef.current = null
        setSelectedSelector('')
        setSelectedTagName('')
        setIsMediaElement(false)
        clearSelectionOutline()
      }

      return next
    })
  }

  const saveSelectedOverride = () => {
    console.clear()
    console.log('%c[SAVE] ========== SAVE INITIATED ==========', 'color: yellow; font-size: 14px; font-weight: bold;')
    
    setSaveMessage('💾 Saving...')

    try {
      // VALIDATION
      if (!selectedSelector) {
        const msg = '❌ FAILED: No element selected. Click an element first.'
        console.error('[SAVE]', msg)
        setSaveMessage(msg)
        return
      }

      if (!selectedElementRef.current) {
        const msg = '❌ FAILED: Element reference lost. Click element again.'
        console.error('[SAVE]', msg)
        setSaveMessage(msg)
        return
      }

      const element = selectedElementRef.current
      
      if (!document.body.contains(element)) {
        const msg = '❌ FAILED: Element was removed from page.'
        console.error('[SAVE]', msg)
        setSaveMessage(msg)
        selectedElementRef.current = null
        return
      }

      console.log('[SAVE] ✓ All validations passed')
      console.log('[SAVE] Pathname:', location.pathname)
      console.log('[SAVE] Element:', element.tagName, element.className || '(no class)')
      console.log('[SAVE] Selector will be:', selectedSelector)
      console.log('')

      // CHECK: Are we actually changing anything?
      const hasTextChange = textEnabled && textValue?.trim()
      const hasColorChange = textColor?.trim()
      const hasBgChange = backgroundColor?.trim()
      const hasSizeChange = fontSize?.trim()
      const hasWeightChange = fontWeight?.trim()
      const hasRadiusChange = borderRadius?.trim()
      const hasMediaChange = isMediaElement && (mediaSrc?.trim() || mediaPoster?.trim())

      if (!hasTextChange && !hasColorChange && !hasBgChange && !hasSizeChange && !hasWeightChange && !hasRadiusChange && !hasMediaChange) {
        const msg = '⚠ No changes detected. Edit a value before saving.'
        console.warn('[SAVE]', msg)
        setSaveMessage(msg)
        return
      }

      console.log('[SAVE] Changes detected:')
      if (hasTextChange) console.log('  • Text will change to:', textValue.substring(0, 50))
      if (hasColorChange) console.log('  • Color:', textColor)
      if (hasBgChange) console.log('  • Background:', backgroundColor)
      if (hasSizeChange) console.log('  • Size:', fontSize)
      if (hasWeightChange) console.log('  • Weight:', fontWeight)
      if (hasRadiusChange) console.log('  • Radius:', borderRadius)
      if (hasMediaChange) console.log('  • Media change detected')
      console.log('')

      // COLLECT VALUES
      const dataToSave = {
        pathname: location.pathname,
        selector: selectedSelector,
        timestamp: Date.now(),
        textEnabled,
        text: textEnabled ? (textValue || '') : '',
        style: {
          color: textColor || '',
          'background-color': backgroundColor || '',
          'font-size': fontSize ? (String(fontSize).includes('px') ? fontSize : `${fontSize}px`) : '',
          'font-weight': fontWeight || '',
          'border-radius': borderRadius || '',
        },
        attrs: isMediaElement ? { 
          src: mediaSrc || '', 
          poster: mediaPoster || '' 
        } : {},
        elementInfo: {
          tagName: element.tagName.toLowerCase(),
          className: element.className || '',
          textContent: element.textContent?.substring(0, 100) || '',
        },
      }

      console.log('[SAVE] Data structure to save:', dataToSave)

      // LOAD & UPDATE
      const overrides = loadOverrides()
      const key = `${location.pathname}::${selectedSelector}`
      
      console.log('[SAVE] Storage key:', key)
      console.log('[SAVE] Total overrides before save:', Object.keys(overrides).length)

      overrides[key] = dataToSave

      // SAVE TO STORAGE
      console.log('[SAVE] SAVING TO localStorage...')
      saveOverrides(overrides)
      console.log('[SAVE] ✓ Saved to localStorage')
      console.log('')

      // VERIFY THE SAVE
      console.log('[SAVE] VERIFYING save...')
      const readBack = loadOverrides()
      const savedData = readBack[key]

      if (!savedData) {
        throw new Error('Verification failed: Key not found after save')
      }

      console.log('[SAVE] ✓ Verification passed - found in storage')
      console.log('[SAVE] Saved data:', savedData)
      console.log('')

      // Apply visual feedback
      element.style.outline = '3px solid #38C172'
      element.style.outlineOffset = '2px'

      const msg = '✓ Saved! Changes will apply when you reload the page.'
      console.log(
        '%c[SAVE SUCCESS] ' + msg,
        'color: #38C172; font-size: 14px; font-weight: bold;'
      )
      
      setSaveMessage(msg)
      setTimeout(() => setSaveMessage(''), 6000)

    } catch (err) {
      console.error('')
      const errorMsg = `❌ Save failed: ${err.message}`
      console.error(
        '%c[SAVE FAILED] ' + errorMsg,
        'color: #ff6b6b; font-size: 14px; font-weight: bold;'
      )
      console.error('Full error:', err)
      
      setSaveMessage(errorMsg)
      setTimeout(() => setSaveMessage(''), 5000)
    }
  }

  const clearSelectedOverride = () => {
    if (!selectedKey) {
      return
    }

    const overrides = loadOverrides()
    delete overrides[selectedKey]
    saveOverrides(overrides)
    window.location.reload()
  }

  const resetCurrentPageEdits = () => {
    const overrides = loadOverrides()
    const nextOverrides = {}

    Object.entries(overrides).forEach(([key, value]) => {
      if (!value || value.pathname !== location.pathname) {
        nextOverrides[key] = value
      }
    })

    saveOverrides(nextOverrides)
    window.location.reload()
  }

  const handleMediaUpload = async (event, target = 'src') => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (target === 'src' && selectedTagName === 'img' && !file.type.startsWith('image/')) {
      setUploadMessage('Please choose an image file.')
      event.target.value = ''
      return
    }

    setUploadMessage('Uploading...')

    try {
      const dataUrl = await fileToDataUrl(file)

      if (target === 'poster') {
        setMediaPoster(dataUrl)
      } else {
        setMediaSrc(dataUrl)
      }

      setUploadMessage('Upload ready. Click Save Element to apply.')
    } catch {
      setUploadMessage('Upload failed. Try another file.')
    } finally {
      event.target.value = ''
    }
  }

  const normalizeFontSize = (value) => {
    if (!value) return ''
    const trimmed = String(value).trim()
    if (trimmed === '' || trimmed === '0') return ''
    if (/^\d+$/.test(trimmed)) return `${trimmed}px`
    return trimmed
  }

  const handleLogout = (event) => {
    event.preventDefault()
    event.stopPropagation()

    selectedElementRef.current = null
    setAdminAuthenticated(false)
    window.localStorage.removeItem('userRole')
    window.localStorage.setItem(EDIT_MODE_KEY, 'false')
    setIsEditMode(false)
    setSelectedSelector('')
    setSelectedTagName('')
    setIsMediaElement(false)
    clearSelectionOutline()

    navigate('/login', { replace: true })

    window.setTimeout(() => {
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }, 0)
  }

  if (!canEditOnRoute || !isAdminUser) {
    console.warn('[ADMIN EDITOR] Not rendering - canEditOnRoute:', canEditOnRoute, 'isAdminUser:', isAdminUser)
    return null
  }

  console.log('[ADMIN EDITOR] Rendering admin UI editor')

  return (
    <div
      data-admin-ui-editor
      onClickCapture={(event) => {
        event.stopPropagation()
      }}
      style={{
        position: 'fixed',
        right: '16px',
        bottom: '16px',
        zIndex: 3000,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: '340px',
        padding: '10px',
        borderRadius: '12px',
        background: 'rgba(0, 0, 0, 0.88)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
      }}
    >
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          type="button"
          onMouseDown={toggleEditMode}
          style={{
            background: isEditMode ? '#38C172' : '#2A2F3D',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.22)',
            borderRadius: '8px',
            padding: '8px 10px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          {isEditMode ? 'Edit Mode: ON' : 'Edit Mode: OFF'}
        </button>

        <button
          type="button"
          onClick={resetCurrentPageEdits}
          style={{
            background: '#0A3D62',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.22)',
            borderRadius: '8px',
            padding: '8px 10px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Reset Page
        </button>

        <button
          type="button"
          onMouseDown={handleLogout}
          style={{
            background: '#8b1f1f',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.22)',
            borderRadius: '8px',
            padding: '8px 10px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Logout
        </button>
      </div>

      <div style={{ color: '#d6e8f7', fontSize: '12px' }}>
        {isEditMode
          ? 'Click any element to edit text, style, color, image, or video.'
          : 'Turn on Edit Mode to select UI elements.'}
      </div>

      {isEditMode && selectedSelector ? (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '8px' }}>
          <div style={{ color: '#fff', fontSize: '12px', marginBottom: '6px' }}>Selected: {selectedTagName}</div>

          <div style={{ display: 'grid', gap: '6px' }}>
            {textCapable ? (
              <label style={{ color: '#fff', fontSize: '12px' }}>
                Text
                <textarea
                  value={textValue}
                  onChange={(event) => setTextValue(event.target.value)}
                  rows={2}
                  style={{ width: '100%', marginTop: '4px' }}
                />
              </label>
            ) : null}

            {textCapable ? (
              <label style={{ color: '#fff', fontSize: '12px' }}>
                <input
                  type="checkbox"
                  checked={textEnabled}
                  onChange={(event) => setTextEnabled(event.target.checked)}
                  style={{ marginRight: '6px' }}
                />
                Apply text override
              </label>
            ) : null}

            <div style={{ display: 'flex', gap: '10px' }}>
              <label style={{ color: '#fff', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Text:</span>
                <input
                  type="color"
                  value={normalizeHexColor(textColor, '#000000')}
                  onChange={(event) => setTextColor(event.target.value)}
                  title="Pick text color"
                  style={{ width: '24px', height: '18px', border: '1px solid #999', borderRadius: '4px', padding: 0, cursor: 'pointer', background: 'transparent' }}
                />
              </label>
              <label style={{ color: '#fff', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Background:</span>
                <input
                  type="color"
                  value={normalizeHexColor(backgroundColor, '#FFFFFF')}
                  onChange={(event) => setBackgroundColor(event.target.value)}
                  title="Pick background color"
                  style={{ width: '24px', height: '18px', border: '1px solid #999', borderRadius: '4px', padding: 0, cursor: 'pointer', background: 'transparent' }}
                />
              </label>
            </div>

            <label style={{ color: '#fff', fontSize: '12px' }}>
              Font Size (e.g. 18px)
              <input value={fontSize} onChange={(event) => setFontSize(event.target.value)} style={{ width: '100%', marginTop: '4px' }} />
            </label>

            <label style={{ color: '#fff', fontSize: '12px' }}>
              Font Weight (e.g. 700)
              <input value={fontWeight} onChange={(event) => setFontWeight(event.target.value)} style={{ width: '100%', marginTop: '4px' }} />
            </label>

            <label style={{ color: '#fff', fontSize: '12px' }}>
              Border Radius (e.g. 12px)
              <input value={borderRadius} onChange={(event) => setBorderRadius(event.target.value)} style={{ width: '100%', marginTop: '4px' }} />
            </label>

            {isMediaElement ? (
              <>
                <label style={{ color: '#fff', fontSize: '12px' }}>
                  Media Source URL
                  <input value={mediaSrc} onChange={(event) => setMediaSrc(event.target.value)} style={{ width: '100%', marginTop: '4px' }} />
                </label>

                {selectedTagName === 'img' ? (
                  <label style={{ color: '#fff', fontSize: '12px' }}>
                    Upload Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => handleMediaUpload(event, 'src')}
                      style={{ width: '100%', marginTop: '4px' }}
                    />
                  </label>
                ) : null}

                {selectedTagName === 'video' ? (
                  <>
                    <label style={{ color: '#fff', fontSize: '12px' }}>
                      Upload Video File
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(event) => handleMediaUpload(event, 'src')}
                        style={{ width: '100%', marginTop: '4px' }}
                      />
                    </label>

                    <label style={{ color: '#fff', fontSize: '12px' }}>
                      Video Poster URL
                      <input value={mediaPoster} onChange={(event) => setMediaPoster(event.target.value)} style={{ width: '100%', marginTop: '4px' }} />
                    </label>

                    <label style={{ color: '#fff', fontSize: '12px' }}>
                      Upload Poster Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => handleMediaUpload(event, 'poster')}
                        style={{ width: '100%', marginTop: '4px' }}
                      />
                    </label>
                  </>
                ) : null}

                {uploadMessage ? <div style={{ color: '#9ed2ff', fontSize: '11px' }}>{uploadMessage}</div> : null}
              </>
            ) : null}
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={saveSelectedOverride}
              style={{
                background: '#38C172',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.22)',
                borderRadius: '8px',
                padding: '8px 10px',
                cursor: 'pointer',
                fontWeight: 600,
                flex: 1,
              }}
            >
              Save Element
            </button>

            <button
              type="button"
              onClick={() => {
                selectedElementRef.current = null
                clearSelectionOutline()
                setSelectedSelector('')
                setSelectedTagName('')
                setIsMediaElement(false)
                setSaveMessage('')
              }}
              style={{
                background: '#0A3D62',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.22)',
                borderRadius: '8px',
                padding: '8px 10px',
                cursor: 'pointer',
                fontWeight: 600,
                flex: 1,
              }}
            >
              Select Another
            </button>

            <button
              type="button"
              onClick={clearSelectedOverride}
              style={{
                background: '#2A2F3D',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.22)',
                borderRadius: '8px',
                padding: '8px 10px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Clear
            </button>
          </div>

          {saveMessage ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '10px' }}>
              <div style={{ color: saveMessage.startsWith('✓') ? '#38C172' : '#ff9999', fontSize: '12px', fontWeight: 600, flex: 1 }}>
                {saveMessage}
              </div>
              {saveMessage.startsWith('✓') && (
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  style={{
                    background: '#38C172',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Refresh Now
                </button>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

    </div>
  )
}
