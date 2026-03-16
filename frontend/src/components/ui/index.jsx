import React, { useState, useRef } from 'react'

/* ── Ripple effect (Material) ─────────────────────────────── */
function useRipple() {
  const [ripples, setRipples] = useState([])
  const addRipple = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = Date.now()
    setRipples(r => [...r, { x, y, id }])
    setTimeout(() => setRipples(r => r.filter(rp => rp.id !== id)), 600)
  }
  return [ripples, addRipple]
}

/* ── Button ────────────────────────────────────────────────── */
export function Button({ children, variant = 'filled', size = 'md', loading, icon, className = '', style = {}, ...props }) {
  const [ripples, addRipple] = useRipple()
  const [pressed, setPressed] = useState(false)

  const sizes = {
    sm: { h: '32px', px: '12px', font: '0.8125rem', gap: '6px', iconSize: 14 },
    md: { h: '40px', px: '20px', font: '0.875rem',  gap: '8px', iconSize: 16 },
    lg: { h: '48px', px: '28px', font: '0.9375rem', gap: '8px', iconSize: 18 },
  }
  const s = sizes[size] || sizes.md

  const variants = {
    filled: {
      background: 'var(--blue)',
      color: '#fff',
      border: 'none',
      shadow: 'var(--elev-1)',
      hoverBg: 'var(--blue-hover)',
      hoverShadow: 'var(--elev-2)',
    },
    tonal: {
      background: 'var(--blue-light)',
      color: 'var(--blue)',
      border: 'none',
      shadow: 'none',
      hoverBg: 'var(--blue-tonal)',
      hoverShadow: 'var(--elev-1)',
    },
    outlined: {
      background: 'var(--surface)',
      color: 'var(--blue)',
      border: '1px solid var(--border-2)',
      shadow: 'none',
      hoverBg: 'var(--blue-light)',
      hoverShadow: 'var(--elev-1)',
    },
    text: {
      background: 'transparent',
      color: 'var(--blue)',
      border: 'none',
      shadow: 'none',
      hoverBg: 'var(--blue-light)',
      hoverShadow: 'none',
    },
    neutral: {
      background: 'var(--surface)',
      color: 'var(--text-2)',
      border: '1px solid var(--border)',
      shadow: 'var(--elev-1)',
      hoverBg: 'var(--bg)',
      hoverShadow: 'var(--elev-2)',
    },
    danger: {
      background: 'var(--red)',
      color: '#fff',
      border: 'none',
      shadow: 'none',
      hoverBg: '#b71c1c',
      hoverShadow: 'var(--elev-1)',
    },
    success: {
      background: 'var(--green)',
      color: '#fff',
      border: 'none',
      shadow: 'none',
      hoverBg: '#155d2e',
      hoverShadow: 'var(--elev-1)',
    },
  }

  const v = variants[variant] || variants.filled
  const [hovered, setHovered] = useState(false)
  const disabled = loading || props.disabled

  return (
    <button
      style={{
        position: 'relative', overflow: 'hidden',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: s.gap, height: s.h, padding: `0 ${s.px}`,
        fontSize: s.font, fontWeight: 500, letterSpacing: '0.01em',
        borderRadius: 'var(--r-pill)',
        background: hovered && !disabled ? v.hoverBg : v.background,
        color: v.color,
        border: v.border || 'none',
        boxShadow: hovered && !disabled ? v.hoverShadow : v.shadow,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'background var(--dur) var(--ease), box-shadow var(--dur) var(--ease), transform 80ms var(--ease)',
        transform: pressed && !disabled ? 'scale(0.97)' : 'scale(1)',
        fontFamily: 'var(--font)',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        ...style,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false) }}
      onMouseDown={(e) => { setPressed(true); addRipple(e); props.onMouseDown?.(e) }}
      onMouseUp={() => setPressed(false)}
      disabled={disabled}
      className={className}
      {...props}
    >
      {/* Ripples */}
      {ripples.map(r => (
        <span key={r.id} style={{
          position: 'absolute', left: r.x, top: r.y,
          width: '4px', height: '4px', borderRadius: '50%',
          background: variant === 'filled' || variant === 'danger' || variant === 'success'
            ? 'rgba(255,255,255,0.4)'
            : 'rgba(26,115,232,0.2)',
          transform: 'scale(0)', transformOrigin: 'center',
          animation: 'ripple 600ms var(--ease-out) forwards',
          pointerEvents: 'none',
        }} />
      ))}

      {loading ? <Spinner size={parseInt(s.iconSize)} color="currentColor" /> : icon}
      {children}
    </button>
  )
}

/* ── Input / TextField ─────────────────────────────────────── */
export function Input({ label, error, hint, prefix, suffix, ...props }) {
  const [focused, setFocused] = useState(false)
  const hasValue = props.value?.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {label && (
        <label style={{
          fontSize: '0.8125rem', fontWeight: 500,
          color: error ? 'var(--red)' : focused ? 'var(--blue)' : 'var(--text-2)',
          transition: 'color var(--dur) var(--ease)',
          lineHeight: 1,
        }}>
          {label}
        </label>
      )}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: focused ? 'var(--surface)' : 'var(--surface-2)',
        border: `1.5px solid ${error ? 'var(--red)' : focused ? 'var(--blue)' : 'var(--border)'}`,
        borderRadius: 'var(--r-md)',
        transition: 'border-color var(--dur) var(--ease), background var(--dur) var(--ease), box-shadow var(--dur) var(--ease)',
        boxShadow: focused ? '0 0 0 3px rgba(26,115,232,0.12)' : 'none',
        overflow: 'hidden',
      }}>
        {prefix && <span style={{ padding: '0 0 0 14px', color: 'var(--text-3)', fontSize: '0.9rem', flexShrink: 0 }}>{prefix}</span>}
        <input
          style={{
            flex: 1, padding: '10px 14px',
            fontSize: '0.9375rem', color: 'var(--text-1)',
            background: 'transparent', border: 'none', outline: 'none',
            lineHeight: 1.5,
          }}
          onFocus={e => { setFocused(true); props.onFocus?.(e) }}
          onBlur={e => { setFocused(false); props.onBlur?.(e) }}
          {...props}
        />
        {suffix && <span style={{ padding: '0 14px 0 0', color: 'var(--text-3)', fontSize: '0.9rem', flexShrink: 0 }}>{suffix}</span>}
      </div>
      {(error || hint) && (
        <span style={{ fontSize: '0.75rem', color: error ? 'var(--red)' : 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '4px', paddingLeft: '2px' }}>
          {error ? '⚠ ' + error : hint}
        </span>
      )}
    </div>
  )
}

/* ── Card ──────────────────────────────────────────────────── */
export function Card({ children, elevated, interactive, className = '', style = {}, ...props }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: `1px solid ${hovered && interactive ? 'var(--border-2)' : 'var(--border)'}`,
        borderRadius: 'var(--r-lg)',
        padding: '20px 24px',
        boxShadow: hovered && interactive ? 'var(--elev-3)' : elevated ? 'var(--elev-2)' : 'var(--elev-1)',
        transition: 'box-shadow var(--dur) var(--ease), border-color var(--dur) var(--ease), transform var(--dur) var(--ease)',
        transform: hovered && interactive ? 'translateY(-2px)' : 'none',
        cursor: interactive ? 'pointer' : 'default',
        ...style,
      }}
      onMouseEnter={() => interactive && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={className}
      {...props}
    >
      {children}
    </div>
  )
}

/* ── Badge ─────────────────────────────────────────────────── */
const BADGE_STYLES = {
  pending:   { bg: 'var(--amber-light)', color: '#7c5200', border: '#f9ab0030' },
  confirmed: { bg: 'var(--green-light)', color: 'var(--green)', border: '#1e8e3e30' },
  cancelled: { bg: 'var(--red-light)',   color: 'var(--red)',   border: '#d9302530' },
  available: { bg: 'var(--blue-light)',  color: 'var(--blue)',  border: '#1a73e830' },
  default:   { bg: 'var(--bg-2)',        color: 'var(--text-2)', border: 'var(--border)' },
}
export function Badge({ status }) {
  const s = BADGE_STYLES[status] || BADGE_STYLES.default
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 10px',
      borderRadius: 'var(--r-pill)',
      fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.04em',
      textTransform: 'capitalize',
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      {status}
    </span>
  )
}

/* ── Spinner ───────────────────────────────────────────────── */
export function Spinner({ size = 20, color = 'var(--blue)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ animation: 'spin 0.75s linear infinite', flexShrink: 0 }}>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2.5" strokeOpacity="0.15" />
      <path d="M12 3 a9 9 0 0 1 9 9" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

/* ── Alert ─────────────────────────────────────────────────── */
export function Alert({ type = 'error', children, style = {} }) {
  const configs = {
    error:   { bg: 'var(--red-light)',   border: '#d9302520', color: 'var(--red)',   icon: '⚠️' },
    success: { bg: 'var(--green-light)', border: '#1e8e3e20', color: 'var(--green)', icon: '✓' },
    info:    { bg: 'var(--blue-light)',  border: '#1a73e820', color: 'var(--blue)',  icon: 'ℹ' },
  }
  const c = configs[type] || configs.error
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '10px',
      padding: '12px 16px', borderRadius: 'var(--r-md)',
      background: c.bg, border: `1px solid ${c.border}`,
      color: c.color, fontSize: '0.875rem', lineHeight: 1.5,
      animation: 'slideDown var(--dur) var(--ease)',
      ...style,
    }}>
      <span style={{ flexShrink: 0, fontWeight: 700 }}>{c.icon}</span>
      <span>{children}</span>
    </div>
  )
}

/* ── EmptyState ────────────────────────────────────────────── */
export function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '64px 32px' }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
        background: 'var(--blue-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.875rem',
      }}>
        {icon || '📭'}
      </div>
      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: '8px' }}>{title}</h3>
      {subtitle && <p style={{ fontSize: '0.9rem', color: 'var(--text-2)', maxWidth: '320px', margin: '0 auto 20px', lineHeight: 1.6 }}>{subtitle}</p>}
      {action}
    </div>
  )
}

/* ── Chip ──────────────────────────────────────────────────── */
export function Chip({ label, selected, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '6px 14px', borderRadius: 'var(--r-pill)',
        fontSize: '0.8125rem', fontWeight: 500,
        border: `1px solid ${selected ? 'var(--blue)' : 'var(--border-2)'}`,
        background: selected ? 'var(--blue-light)' : 'var(--surface)',
        color: selected ? 'var(--blue)' : 'var(--text-2)',
        cursor: 'pointer',
        transition: 'all var(--dur) var(--ease)',
        fontFamily: 'var(--font)',
      }}
    >
      {icon && <span>{icon}</span>}
      {label}
    </button>
  )
}

/* ── Divider ───────────────────────────────────────────────── */
export function Divider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
      {label && <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 500 }}>{label}</span>}
      <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
    </div>
  )
}
