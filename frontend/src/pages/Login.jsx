import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { Button, Input, Alert } from '../components/ui'

export default function Login() {
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const data = await api.login(form)
      setAuth(data.token, data.user)
      navigate(data.user.role === 'provider' ? '/dashboard' : '/book')
    } catch (err) { setError(err.message || 'Incorrect email or password.') }
    finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      display: 'flex', background: 'var(--bg)',
    }}>
      {/* Left panel — branding */}
      <div style={{
        flex: '0 0 420px', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px 56px',
        background: 'linear-gradient(160deg, #e8f0fe 0%, #f3f0ff 100%)',
        borderRight: '1px solid var(--border)',
      }}
        className="hide-on-mobile"
      >
        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px' }}>
            <svg width="32" height="32" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="7" fill="#1a73e8" /><path d="M8 14h12M14 8v12" stroke="white" strokeWidth="2.5" strokeLinecap="round" /><circle cx="14" cy="14" r="3" fill="white" /></svg>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Slot<span style={{ color: 'var(--blue)' }}>Wise</span></span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '12px', color: 'var(--text-1)' }}>
            Smart scheduling,<br />simply done.
          </h2>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text-2)', lineHeight: 1.7 }}>
            Book appointments with zero friction. Providers manage availability, clients book in seconds.
          </p>
        </div>

        {/* Testimonial card */}
        {['No double-bookings', 'AI-powered search', 'Full audit trail'].map((f, i) => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 5.5l2.5 2.5L9 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-2)' }}>{f}</span>
          </div>
        ))}
      </div>

      {/* Right panel — form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div className="fade-up" style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '6px' }}>Sign in</h1>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9375rem' }}>Welcome back to SlotWise</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && <Alert type="error">{error}</Alert>}
            <Input label="Email address" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required autoFocus />
            <Input label="Password" type="password" placeholder="Enter your password" value={form.password} onChange={set('password')} required />
            <Button type="submit" variant="filled" size="lg" loading={loading} style={{ width: '100%', marginTop: '4px', borderRadius: 'var(--r-md)' }}>
              Sign in
            </Button>
          </form>

          <div style={{ marginTop: '20px', padding: '16px', background: 'var(--bg)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Demo credentials</p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-2)', fontFamily: 'monospace', marginBottom: '3px' }}>dr.smith@example.com / password123</p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-2)', fontFamily: 'monospace' }}>client@example.com / password123</p>
          </div>

          <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-2)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--blue)', fontWeight: 600 }}>Create one</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
