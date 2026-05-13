import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ADMIN_AUTH_CHANGED_EVENT, isAdminAuthenticated } from '../../utils/auth'
import { deepClone, fetchCmsDocument, getCmsEditMode, normalizeCmsDocument, saveCmsDocument } from '../../utils/cms'

export function useCmsPageEditor({ pageKey, defaults, sectionSchemas }) {
  const navigate = useNavigate()
  const location = useLocation()

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => isAdminAuthenticated())
  const [content, setContent] = useState(() => deepClone(defaults))
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  const [selectedSectionKey, setSelectedSectionKey] = useState(null)
  const [draftSection, setDraftSection] = useState(null)

  useEffect(() => {
    const syncAuth = () => setIsAdminLoggedIn(isAdminAuthenticated())
    window.addEventListener(ADMIN_AUTH_CHANGED_EVENT, syncAuth)
    window.addEventListener('focus', syncAuth)

    return () => {
      window.removeEventListener(ADMIN_AUTH_CHANGED_EVENT, syncAuth)
      window.removeEventListener('focus', syncAuth)
    }
  }, [])

  const isEditMode = isAdminLoggedIn && getCmsEditMode(location.search)

  useEffect(() => {
    if (!isEditMode) {
      setSelectedSectionKey(null)
      setDraftSection(null)
    }
  }, [isEditMode])

  useEffect(() => {
    if (getCmsEditMode(location.search) && !isAdminLoggedIn) {
      navigate(location.pathname, { replace: true })
      return
    }

    let isMounted = true

    async function loadDocument() {
      setIsLoading(true)
      try {
        const remoteContent = await fetchCmsDocument(pageKey)
        if (!isMounted) return
        setContent(normalizeCmsDocument(defaults, remoteContent))
      } catch (error) {
        if (!isMounted) return
        setContent(deepClone(defaults))
        setSaveError(error.message)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadDocument()

    return () => {
      isMounted = false
    }
  }, [pageKey, defaults, navigate, location.pathname, location.search, isAdminLoggedIn])

  const openSectionEditor = (sectionKey) => {
    if (!isEditMode) return

    setSelectedSectionKey(sectionKey)
    setDraftSection(deepClone(content[sectionKey] ?? {}))
    setSaveMessage('')
    setSaveError('')
  }

  const closeSectionEditor = () => {
    setSelectedSectionKey(null)
    setDraftSection(null)
  }

  const saveSectionDraft = async () => {
    if (!selectedSectionKey) return

    const nextContent = {
      ...content,
      [selectedSectionKey]: draftSection,
    }

    setIsSaving(true)
    setSaveMessage('')
    setSaveError('')

    try {
      await saveCmsDocument(pageKey, nextContent)
      setContent(nextContent)
      setSaveMessage(`Saved ${sectionSchemas?.[selectedSectionKey]?.title || selectedSectionKey}.`)
      closeSectionEditor()
    } catch (error) {
      setSaveError(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const updateDraftSection = (updater) => {
    setDraftSection((previousValue) => {
      const nextValue = typeof updater === 'function' ? updater(previousValue) : updater
      return nextValue
    })
  }

  const editableProps = (sectionKey, extraProps = {}) => {
    if (!isEditMode) {
      return extraProps
    }

    return {
      ...extraProps,
      'data-cms-editable': sectionKey,
      title: extraProps.title || 'Click to edit this section',
      onClickCapture: (event) => {
        event.preventDefault()
        event.stopPropagation()
        openSectionEditor(sectionKey)
      },
      onKeyDown: (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          event.stopPropagation()
          openSectionEditor(sectionKey)
        }
      },
      role: extraProps.role || 'button',
      tabIndex: extraProps.tabIndex ?? 0,
    }
  }

  const selectedSection = selectedSectionKey
    ? {
        key: selectedSectionKey,
        schema: sectionSchemas?.[selectedSectionKey] || { title: selectedSectionKey },
        value: draftSection,
      }
    : null

  return {
    content,
    setContent,
    isLoading,
    isSaving,
    isEditMode,
    saveMessage,
    saveError,
    selectedSection,
    draftSection,
    setDraftSection: updateDraftSection,
    openSectionEditor,
    closeSectionEditor,
    saveSectionDraft,
    editableProps,
  }
}
