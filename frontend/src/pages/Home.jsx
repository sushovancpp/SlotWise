import React from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Button } from '../components/ui'

const features = [
  { icon: '🔒', color: '#1a73e8', bg: '#e8f0fe', title: 'Zero double-bookings', desc: 'Slots are atomically locked the moment they are claimed. Concurrency is handled at the database level.' },
  { icon: '🤖', color: '#1e8e3e', bg: '#e6f4ea', title: 'AI-powered search',    desc: 'Describe when you need an appointment in plain English. Our AI finds matching slots instantly.' },
  { icon: '📋', color: '#f9ab00', bg: '#fef7e0', title: 'Full audit trail',      desc: 'Every state change is logged immutably. Know exactly what happened, when, and by whom.' },
  { icon: '⚡', color: '#9c27b0', bg: '#f3e5f5', title: 'State-machine rules',   desc: 'Pending → Confirmed → Cancelled. Invalid transitions are rejected at the domain layer.' },
]

export default function Home() {
  const { user } = useAuthStore()

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', background: 'var(--white)' }}>

      {/* ── Hero ── */}
      <section style={{
        padding: 'clamp(60px,10vw,120px) 24px clamp(48px,8vw,96px)',
        textAlign: 'center',
        background: 'linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)',
        borderBottom: '1px solid var(--border)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background decoration */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(26,115,232,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(156,39,176,0.03) 0%, transparent 50%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: '720px', margin: '0 auto', position: 'relative' }}>
          {/* Product badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '5px 14px', borderRadius: 'var(--r-pill)',
            background: 'var(--blue-light)', border: '1px solid var(--blue-tonal)',
            marginBottom: '24px',
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="#1a73e8" strokeWidth="1.5" /><path d="M4 6l1.5 1.5L8 4" stroke="#1a73e8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--blue)', letterSpacing: '0.02em' }}>
              Appointment Scheduling Platform
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(2.5rem, 6vw, 4rem)',
            fontWeight: 700, letterSpacing: '-0.04em',
            color: 'var(--text-1)', lineHeight: 1.1,
            marginBottom: '20px',
          }}>
            Smarter scheduling
            <br />
            <span style={{ color: 'var(--blue)' }}>for everyone.</span>
          </h1>

          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.25rem)',
            color: 'var(--text-2)', lineHeight: 1.7,
            maxWidth: '520px', margin: '0 auto 36px',
          }}>
            Providers set their availability. Clients book in seconds.
            Powered by enforced rules, a full audit trail, and AI search.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {user ? (
              <Link to={user.role === 'provider' ? '/dashboard' : '/book'}>
                <Button variant="filled" size="lg">
                  Go to {user.role === 'provider' ? 'Dashboard' : 'Book a Slot'}
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/register"><Button variant="filled" size="lg">Get started — it's free</Button></Link>
                <Link to="/login"><Button variant="outlined" size="lg">Sign in</Button></Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: 'clamp(48px,6vw,80px) 24px', background: 'var(--white)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-1)', marginBottom: '10px' }}>
              Built on correctness
            </h2>
            <p style={{ fontSize: '1rem', color: 'var(--text-2)' }}>
              Small, well-structured systems score higher than large feature-rich ones.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {features.map(f => (
              <div key={f.title} style={{
                padding: '28px 24px',
                background: 'var(--white)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-xl)',
                boxShadow: 'var(--elev-1)',
                transition: 'box-shadow var(--dur) var(--ease), transform var(--dur) var(--ease)',
              }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--elev-3)'; e.currentTarget.style.transform = 'translateY(-3px)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--elev-1)'; e.currentTarget.style.transform = 'none' }}
              >
                <div style={{ width: 48, height: 48, borderRadius: '14px', background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '16px' }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px', letterSpacing: '-0.01em' }}>{f.title}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA strip ── */}
      <section style={{ padding: 'clamp(40px,6vw,64px) 24px', background: 'var(--bg)' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.25rem,2.5vw,1.75rem)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '12px' }}>Ready to get started?</h2>
          <p style={{ color: 'var(--text-2)', marginBottom: '24px', fontSize: '0.9375rem' }}>Create your account in under a minute. No credit card required.</p>
          {!user && <Link to="/register"><Button variant="filled" size="lg">Create free account</Button></Link>}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: 'var(--white)', borderTop: '1px solid var(--border)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', maxWidth: '1280px', margin: '0 auto' }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-1)' }}>Slot<span style={{ color: 'var(--blue)' }}>Wise</span></span>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>Flask · React · SQLite · Claude AI</span>
      </footer>
    </div>
  )
}
