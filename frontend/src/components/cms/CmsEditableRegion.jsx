export default function CmsEditableRegion({
  as: Component = 'div',
  isEditMode,
  onEdit,
  className = '',
  style,
  title,
  children,
  ...rest
}) {
  const editableClassName = isEditMode ? `${className} cms-editable-surface`.trim() : className

  if (!isEditMode) {
    return (
      <Component className={editableClassName || undefined} style={style} title={title} {...rest}>
        {children}
      </Component>
    )
  }

  return (
    <Component
      className={editableClassName || undefined}
      style={style}
      title={title || 'Click to edit this section'}
      data-cms-editable="true"
      tabIndex={0}
      role="button"
      onClickCapture={(event) => {
        event.preventDefault()
        event.stopPropagation()
        if (onEdit) onEdit()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          event.stopPropagation()
          if (onEdit) onEdit()
        }
      }}
      {...rest}
    >
      {children}
    </Component>
  )
}
