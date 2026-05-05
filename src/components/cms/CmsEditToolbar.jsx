export default function CmsEditToolbar({
  onEndEditMode,
  onCancelEditing,
  onBackToAdmin,
  canCancelEditing = false,
}) {
  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 22000,
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 14px',
        borderRadius: '999px',
        background: 'rgba(9, 18, 30, 0.92)',
        border: '1px solid rgba(141, 218, 178, 0.22)',
        boxShadow: '0 18px 44px rgba(0, 0, 0, 0.32)',
        backdropFilter: 'blur(14px)',
      }}
    >
      <span style={{ color: '#d7ffe8', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Edit mode
      </span>
      <button type="button" className="cms-inline-button cms-secondary-button" onClick={onEndEditMode}>
        End Edit Mode
      </button>
      <button type="button" className="cms-inline-button cms-danger-button" onClick={onCancelEditing} disabled={!canCancelEditing}>
        Stop Editing
      </button>
      <button type="button" className="cms-inline-button cms-primary-button" onClick={onBackToAdmin}>
        Back to Admin Page
      </button>
    </div>
  )
}