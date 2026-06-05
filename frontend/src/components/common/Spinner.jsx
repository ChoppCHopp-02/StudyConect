// src/components/common/Spinner.jsx
// Loading spinner component

/**
 * @param {string} size   - 'sm' | 'md' | 'lg' (default: 'md')
 * @param {string} color  - CSS color (default: var(--primary-light))
 * @param {string} label  - Text hiển thị bên cạnh (optional)
 */
export default function Spinner({ size = 'md', color = 'var(--primary-light)', label }) {
  const sizes = { sm: 16, md: 28, lg: 44 };
  const px = sizes[size] || sizes.md;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
      }}
    >
      <div
        style={{
          width: px,
          height: px,
          borderRadius: '50%',
          border: `${Math.max(2, px * 0.12)}px solid rgba(108, 99, 255, 0.2)`,
          borderTopColor: color,
          animation: 'spin 0.7s linear infinite',
          flexShrink: 0,
        }}
      />
      {label && (
        <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500 }}>
          {label}
        </span>
      )}

      {/* Keyframe inline — chỉ inject 1 lần vì CSS được dedup bởi browser */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
