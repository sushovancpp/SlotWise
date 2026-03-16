import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

/* ── Navbar ─────────────────────────────────────────────── */
export function Navbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/login'); setUserMenuOpen(false) }
  const isActive = (p) => location.pathname === p

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 200,
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(20px) saturate(180%)',
      borderBottom: '1px solid var(--border)',
      boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
    }}>
      <div style={{
        maxWidth: '1280px', margin: '0 auto',
        padding: '0 24px',
        height: '64px',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        gap: '32px',
      }}>

        {/* Logo — left */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="7" fill="#1a73e8" />
            <path d="M8 14h12M14 8v12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="14" cy="14" r="3" fill="white" />
          </svg>
          <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
            Slot<span style={{ color: 'var(--blue)' }}>Wise</span>
          </span>
        </Link>

        {/* Nav links — center */}
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          {user?.role === 'client' && (
            <>
              <NavPill to="/book" active={isActive('/book')}>Book a slot</NavPill>
              <NavPill to="/my-bookings" active={isActive('/my-bookings')}>My bookings</NavPill>
            </>
          )}
          {user?.role === 'provider' && (
            <>
              <NavPill to="/dashboard" active={isActive('/dashboard')}>Dashboard</NavPill>
              <NavPill to="/manage-slots" active={isActive('/manage-slots')}>Manage slots</NavPill>
            </>
          )}
          {!user && (
            <>
              <NavPill to="/" active={isActive('/')}>Home</NavPill>
            </>
          )}
        </nav>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
          {user ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setUserMenuOpen(o => !o)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '6px 12px 6px 6px',
                  borderRadius: 'var(--r-pill)',
                  border: '1px solid var(--border)',
                  background: userMenuOpen ? 'var(--bg)' : 'var(--surface)',
                  cursor: 'pointer',
                  transition: 'background var(--dur) var(--ease)',
                  fontFamily: 'var(--font)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={e => !userMenuOpen && (e.currentTarget.style.background = 'var(--surface)')}
              >
                {/* Avatar */}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: `hsl(${(user.name?.charCodeAt(0) || 65) * 5 % 360}, 65%, 50%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.875rem', fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>
                  {user.name?.[0]?.toUpperCase()}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.2, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', textTransform: 'capitalize', lineHeight: 1.2 }}>{user.role}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, color: 'var(--text-3)', transform: userMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform var(--dur) var(--ease)' }}>
                  <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Dropdown */}
              {userMenuOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  minWidth: '200px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-lg)',
                  boxShadow: 'var(--elev-4)',
                  padding: '8px',
                  animation: 'slideDown var(--dur) var(--ease)',
                  zIndex: 300,
                }}>
                  <div style={{ padding: '8px 12px 12px', borderBottom: '1px solid var(--border)', marginBottom: '8px' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-1)' }}>{user.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>{user.email}</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '8px 12px', borderRadius: 'var(--r-sm)',
                      fontSize: '0.875rem', color: 'var(--red)', fontWeight: 500,
                      cursor: 'pointer', background: 'none', border: 'none',
                      fontFamily: 'var(--font)', transition: 'background var(--dur) var(--ease)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--red-light)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M11 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" style={{
                padding: '8px 16px', borderRadius: 'var(--r-pill)',
                fontSize: '0.875rem', fontWeight: 500, color: 'var(--blue)',
                border: '1px solid var(--border-2)',
                transition: 'background var(--dur) var(--ease)',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--blue-light)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Sign in
              </Link>
              <Link to="/register" style={{
                padding: '8px 20px', borderRadius: 'var(--r-pill)',
                fontSize: '0.875rem', fontWeight: 600,
                background: 'var(--blue)', color: '#fff',
                boxShadow: 'var(--elev-1)',
                transition: 'background var(--dur) var(--ease), box-shadow var(--dur) var(--ease)',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--blue-hover)'; e.currentTarget.style.boxShadow = 'var(--elev-2)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--blue)'; e.currentTarget.style.boxShadow = 'var(--elev-1)' }}
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Dismiss menu on outside click */}
      {userMenuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setUserMenuOpen(false)} />
      )}
    </header>
  )
}

function NavPill({ to, active, children }) {
  const [hovered, setHovered] = useState(false)
  return (
    <Link to={to} style={{
      padding: '7px 16px', borderRadius: 'var(--r-pill)',
      fontSize: '0.875rem', fontWeight: active ? 600 : 500,
      color: active ? 'var(--blue)' : hovered ? 'var(--text-1)' : 'var(--text-2)',
      background: active ? 'var(--blue-light)' : hovered ? 'var(--bg)' : 'transparent',
      transition: 'all var(--dur) var(--ease)',
      whiteSpace: 'nowrap',
    }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </Link>
  )
}

/* ── PageWrapper ─────────────────────────────────────────── */
export function PageWrapper({ children, maxWidth = '960px' }) {
  return (
    <div style={{ maxWidth, margin: '0 auto', padding: '36px 24px 60px' }}>
      {children}
    </div>
  )
}

/* ── PageHeader ──────────────────────────────────────────── */
export function PageHeader({ title, subtitle, action, breadcrumb }) {
  return (
    <div style={{ marginBottom: '28px' }}>
      {breadcrumb && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '0.8125rem', color: 'var(--text-3)' }}>
          {breadcrumb}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-1)', marginBottom: subtitle ? '6px' : 0 }}>{title}</h1>
          {subtitle && <p style={{ fontSize: '0.9375rem', color: 'var(--text-2)', lineHeight: 1.5 }}>{subtitle}</p>}
        </div>
        {action && <div style={{ flexShrink: 0 }}>{action}</div>}
      </div>
    </div>
  )
}

/* ── SectionLabel ────────────────────────────────────────── */
export function SectionLabel({ children, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{children}</span>
      {count !== undefined && (
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--blue)', background: 'var(--blue-light)', padding: '2px 7px', borderRadius: 'var(--r-pill)' }}>{count}</span>
      )}
    </div>
  )
}
