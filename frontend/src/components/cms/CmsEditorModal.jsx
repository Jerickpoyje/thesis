import { useRef, useState } from 'react'
import { deepClone } from '../../utils/cms'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function getValueAtPath(source, path) {
  return path.split('.').reduce((currentValue, key) => {
    if (currentValue == null) return undefined
    return currentValue[key]
  }, source)
}

function setValueAtPath(source, path, nextValue) {
  const nextSource = deepClone(source || {})
  const keys = path.split('.')
  let current = nextSource

  for (let index = 0; index < keys.length - 1; index += 1) {
    const key = keys[index]
    if (current[key] == null || typeof current[key] !== 'object') {
      current[key] = {}
    }
    current = current[key]
  }

  current[keys[keys.length - 1]] = nextValue
  return nextSource
}

function StyleEditor({ label, value, onChange }) {
  const styleObject = value && typeof value === 'object' ? value : {}
  const entries = Object.entries(styleObject)

  const updateEntry = (entryIndex, fieldName, fieldValue) => {
    const nextEntries = entries.map(([entryKey, entryValue], currentIndex) => {
      if (currentIndex !== entryIndex) return [entryKey, entryValue]
      if (fieldName === 'key') {
        return [fieldValue, entryValue]
      }
      return [entryKey, fieldValue]
    })

    onChange(Object.fromEntries(nextEntries.filter(([entryKey]) => entryKey.trim())))
  }

  const addEntry = () => {
    const nextKey = `customProperty_${entries.length + 1}`
    onChange({ ...styleObject, [nextKey]: '' })
  }

  const removeEntry = (entryIndex) => {
    const nextEntries = entries.filter((_, currentIndex) => currentIndex !== entryIndex)
    onChange(Object.fromEntries(nextEntries))
  }

  return (
    <section className="cms-style-editor">
      <div className="cms-style-editor-header">
        <h4>{label}</h4>
        <button type="button" className="cms-inline-button" onClick={addEntry}>
          Add Style Property
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="cms-empty-state">No style properties yet. Add one to begin customizing this section.</p>
      ) : null}

      <div className="cms-style-editor-list">
        {entries.map(([entryKey, entryValue], entryIndex) => (
          <div key={`${entryKey}-${entryIndex}`} className="cms-style-row">
            <input
              type="text"
              value={entryKey}
              onChange={(event) => updateEntry(entryIndex, 'key', event.target.value)}
              placeholder="CSS property"
            />
            <input
              type="text"
              value={entryValue}
              onChange={(event) => updateEntry(entryIndex, 'value', event.target.value)}
              placeholder="Value"
            />
            <button type="button" className="cms-inline-button cms-danger-button" onClick={() => removeEntry(entryIndex)}>
              Remove
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

function LinkListEditor({ label, value, onChange }) {
  const links = Array.isArray(value) ? value : []

  const updateLink = (linkIndex, fieldName, fieldValue) => {
    const nextLinks = links.map((link, currentIndex) => {
      if (currentIndex !== linkIndex) return link
      return {
        ...link,
        [fieldName]: fieldValue,
      }
    })
    onChange(nextLinks)
  }

  const addLink = () => {
    onChange([...links, { label: 'New Link', href: '#' }])
  }

  const removeLink = (linkIndex) => {
    onChange(links.filter((_, currentIndex) => currentIndex !== linkIndex))
  }

  return (
    <section className="cms-style-editor">
      <div className="cms-style-editor-header">
        <h4>{label}</h4>
        <button type="button" className="cms-inline-button" onClick={addLink}>
          Add Link
        </button>
      </div>

      <div className="cms-style-editor-list">
        {links.map((link, linkIndex) => (
          <div key={`${link.label}-${linkIndex}`} className="cms-link-row">
            <input
              type="text"
              value={link.label || ''}
              onChange={(event) => updateLink(linkIndex, 'label', event.target.value)}
              placeholder="Label"
            />
            <input
              type="text"
              value={link.href || ''}
              onChange={(event) => updateLink(linkIndex, 'href', event.target.value)}
              placeholder="Href"
            />
            <button type="button" className="cms-inline-button cms-danger-button" onClick={() => removeLink(linkIndex)}>
              Remove
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

function renderField(field, value, onChange, uploadContext) {
  const fieldValue = getValueAtPath(value, field.path)

  if (field.type === 'link-list') {
    return (
      <LinkListEditor
        key={field.path}
        label={field.label}
        value={fieldValue}
        onChange={(nextValue) => onChange(setValueAtPath(value, field.path, nextValue))}
      />
    )
  }

  if (field.type === 'select') {
    const options = Array.isArray(field.options) ? field.options : []
    return (
      <label key={field.path} className="cms-field">
        <span>{field.label}</span>
        <select
          value={fieldValue || options[0] || ''}
          onChange={(event) => onChange(setValueAtPath(value, field.path, event.target.value))}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    )
  }

  if (field.type === 'textarea') {
    return (
      <label key={field.path} className="cms-field">
        <span>{field.label}</span>
        <textarea
          rows={field.rows || 4}
          value={fieldValue || ''}
          onChange={(event) => onChange(setValueAtPath(value, field.path, event.target.value))}
          placeholder={field.placeholder || ''}
        />
      </label>
    )
  }

  if (field.path === 'media.src') {
    return (
      <MediaSourceEditor
        key={field.path}
        label={field.label}
        mediaValue={value}
        srcValue={fieldValue}
        onChange={onChange}
        uploadContext={uploadContext}
      />
    )
  }

  return (
    <label key={field.path} className="cms-field">
      <span>{field.label}</span>
      <input
        type={field.type || 'text'}
        value={fieldValue || ''}
        onChange={(event) => onChange(setValueAtPath(value, field.path, event.target.value))}
        placeholder={field.placeholder || ''}
      />
    </label>
  )
}

function MediaSourceEditor({ label, mediaValue, srcValue, onChange, uploadContext }) {
  const fileInputRef = useRef(null)
  const [uploadState, setUploadState] = useState({ status: 'idle', message: '' })
  const accept = 'image/*,video/*'

  const updateMediaValue = (nextMedia) => {
    onChange(setValueAtPath(mediaValue, 'media', nextMedia))
  }

  const uploadFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const inferredType = file.type.startsWith('video/') ? 'video' : 'image'
    const formData = new FormData()
    formData.append('file', file)
    formData.append('page', uploadContext.pageKey)
    formData.append('section', uploadContext.sectionKey)

    setUploadState({ status: 'uploading', message: 'Uploading to storage...' })

    try {
      const response = await fetch(`${API_BASE}/cms/media/upload`, {
        method: 'POST',
        body: formData,
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.detail || payload.message || 'Upload failed')
      }

      updateMediaValue({
        ...getValueAtPath(mediaValue, 'media'),
        type: inferredType,
        src: payload.publicUrl,
      })
      setUploadState({ status: 'success', message: 'Uploaded and linked to the public URL.' })
    } catch (error) {
      setUploadState({ status: 'error', message: error.message })
    }
  }

  return (
    <div className="cms-field cms-media-upload">
      <span>{label}</span>
      <div className="cms-media-upload-actions">
        <input ref={fileInputRef} type="file" accept={accept} onChange={uploadFile} style={{ display: 'none' }} />
        <button type="button" className="cms-inline-button" onClick={() => fileInputRef.current?.click()}>
          Upload Image or Video
        </button>
        <span className="cms-media-upload-note">
          File uploads are stored in Supabase Storage and the returned public URL is saved here.
        </span>
      </div>
      <input
        type="text"
        value={srcValue || ''}
        onChange={(event) => onChange(setValueAtPath(mediaValue, 'media.src', event.target.value))}
        placeholder="Public media URL"
      />
      {uploadState.message ? (
        <p className={`cms-media-upload-status cms-media-upload-status-${uploadState.status}`}>{uploadState.message}</p>
      ) : null}
    </div>
  )
}

export default function CmsEditorModal({
  section,
  draftValue,
  onChange,
  onClose,
  onSave,
  pageKey,
  isSaving = false,
  saveError = '',
}) {
  if (!section) return null

  const schema = section.schema || {}
  const uploadContext = { pageKey, sectionKey: section.key }

  return (
    <div className="cms-editor-backdrop" role="dialog" aria-modal="true" aria-label={`Edit ${schema.title || section.key}`} onClick={onClose}>
      <section className="cms-editor-modal" onClick={(event) => event.stopPropagation()}>
        <header className="cms-editor-modal-header">
          <div>
            <p className="cms-editor-kicker">CMS Editor</p>
            <h2>{schema.title || section.key}</h2>
            {schema.description ? <p className="cms-editor-description">{schema.description}</p> : null}
          </div>
          <button type="button" className="cms-modal-close" onClick={onClose} aria-label="Close editor">
            ×
          </button>
        </header>

        <div className="cms-editor-modal-body">
          {(schema.fields || []).map((field) => renderField(field, draftValue, onChange, uploadContext))}

          {(schema.styleGroups || []).map((styleGroup) => (
            <StyleEditor
              key={styleGroup.path}
              label={styleGroup.label}
              value={getValueAtPath(draftValue, styleGroup.path)}
              onChange={(nextStyle) => onChange(setValueAtPath(draftValue, styleGroup.path, nextStyle))}
            />
          ))}
        </div>

        {saveError ? <p className="cms-editor-error">{saveError}</p> : null}

        <footer className="cms-editor-modal-footer">
          <button type="button" className="cms-inline-button cms-secondary-button" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="button" className="cms-inline-button cms-primary-button" onClick={onSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </footer>
      </section>
    </div>
  )
}
