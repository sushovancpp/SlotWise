import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { Button, Input, Alert, Chip } from '../components/ui'

export default function Register() {
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'client', service_name: '', slot_duration_mins: 30 })
  const [errors, setErrors] = useState({})
  const [globalError, setGlobalError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (f) => (e) => { setForm(p => ({ ...p, [f]: e.target.value })); setErrors(er => ({ ...er, [f]: '' })) }

  const handleSubmit = async (e) => {
    e.preventDefault(); setGlobalError(''); setErrors({}); setLoading(true)
    try {
      const payload = { ...form, ...(form.role === 'provider' ? { slot_duration_mins: Number(form.slot_duration_mins) } : {}) }
      const data = await api.register(payload)
      setAuth(data.token, data.user)
      navigate(data.user.role === 'provider' ? '/dashboard' : '/book')
    } catch (err) {
      if (err.data?.errors) setErrors(err.data.errors)
      else setGlobalError(err.message || 'Registration failed.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div className="fade-up" style={{ width: '100%', maxWidth: '500px' }}>

        {/* Card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--elev-2)', padding: '40px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="7" fill="#1a73e8" /><path d="M8 14h12M14 8v12" stroke="white" strokeWidth="2.5" strokeLinecap="round" /><circle cx="14" cy="14" r="3" fill="white" /></svg>
              <span style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Slot<span style={{ color: 'var(--blue)' }}>Wise</span></span>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: '6px' }}>Create your account</h1>
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>Get started for free — no credit card required</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {globalError && <Alert type="error">{globalError}</Alert>}

            {/* Role selection */}
            <div>
              <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-2)', marginBottom: '8px' }}>I want to</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { val: 'client', label: 'Book appointments', icon: '🗓', sub: 'Find & book slots' },
                  { val: 'provider', label: 'Offer services', icon: '🏥', sub: 'Create availability' },
                ].map(r => (
                  <button key={r.val} type="button" onClick={() => setForm(f => ({ ...f, role: r.val }))}
                    style={{
                      padding: '14px 12px', borderRadius: 'var(--r-md)',
                      border: `2px solid ${form.role === r.val ? 'var(--blue)' : 'var(--border)'}`,
                      background: form.role === r.val ? 'var(--blue-light)' : 'var(--surface-2)',
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'all var(--dur) var(--ease)',
                      fontFamily: 'var(--font)',
                    }}>
                    <div style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{r.icon}</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: form.role === r.val ? 'var(--blue)' : 'var(--text-1)' }}>{r.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{r.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <Input label="Full name" placeholder="Jane Doe" value={form.name} onChange={set('name')} error={errors.name} required autoFocus />
            <Input label="Email address" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} error={errors.email} required />
            <Input label="Password" type="password" placeholder="At least 6 characters" value={form.password} onChange={set('password')} error={errors.password} required />

            {form.role === 'provider' && (
              <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Service details</p>
                <Input label="Service name" placeholder="e.g. General Consultation, Haircut" value={form.service_name} onChange={set('service_name')} error={errors.service_name} required />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-2)' }}>Session duration</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[15, 30, 45, 60].map(m => (
                      <Chip key={m} label={`${m} min`} selected={Number(form.slot_duration_mins) === m} onClick={() => setForm(f => ({ ...f, slot_duration_mins: m }))} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <Button type="submit" variant="filled" size="lg" loading={loading} style={{ width: '100%', marginTop: '4px', borderRadius: 'var(--r-md)' }}>
              Create account
            </Button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.875rem', color: 'var(--text-2)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--blue)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
