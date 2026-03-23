'use client'

export function PrintButton({
  label = 'Imprimer / PDF',
  className = '',
}: {
  label?: string
  className?: string
}) {
  return (
    <button
      onClick={() => window.print()}
      className={`no-print ${className}`}
      style={{
        padding: '10px 20px',
        background: '#f1f5f9',
        color: '#334155',
        border: '1.5px solid #e2e8f0',
        borderRadius: 8,
        fontWeight: 600,
        fontSize: 13,
        cursor: 'pointer',
        fontFamily: 'var(--font-body)',
        transition: 'all .15s',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
      aria-label={label}
    >
      🖨️ {label}
    </button>
  )
}
