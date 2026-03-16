import React, { useState, useEffect, useCallback } from 'react'
import { format, parseISO, addMinutes } from 'date-fns'
import { api } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { PageWrapper, PageHeader, SectionLabel } from '../components/layout'
import { Button, Card, Alert, Spinner, EmptyState, Badge } from '../components/ui'

export default function ManageSlots() {
  const user = useAuthStore(s => s.user)
  const provider = user?.provider || null
  const durationMins = provider?.slot_duration_mins || 30

  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')

  const computedEnd = (() => {
    if (!startDate || !startTime) return ''
    try { return format(addMinutes(new Date(`${startDate}T${startTime}:00`), durationMins), 'h:mm a') }
    catch { return '' }
  })()

  const load = useCallback(async () => {
    setLoading(true)
    try { setSlots(await api.mySlots()) }
    catch { setError('Failed to load slots.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e) => {
    e.preventDefault(); setError(''); setSuccess('')
    if (!startDate || !startTime) { setError('Please select a date and time.'); return }
    setCreating(true)
    try {
      const start = new Date(`${startDate}T${startTime}:00`)
      await api.createSlot({ start_time: start.toISOString(), end_time: addMinutes(start, durationMins).toISOString() })
      setSuccess('Slot added successfully.'); setStartDate(''); setStartTime(''); load()
    } catch (err) { setError(err.message || 'Failed to create slot.') }
    finally { setCreating(false) }
  }

  const today = format(new Date(), 'yyyy-MM-dd')
  const future = slots.filter(s => new Date(s.start_time) > new Date())
  const past = slots.filter(s => new Date(s.start_time) <= new Date())

  const inputStyle = {
    padding: '10px 14px', border: '1.5px solid var(--border)',
    borderRadius: 'var(--r-md)', background: 'var(--surface-2)',
    color: 'var(--text-1)', fontSize: '0.9375rem', outline: 'none', width: '100%',
    transition: 'border-color var(--dur) var(--ease), background var(--dur) var(--ease)',
    fontFamily: 'var(--font)', colorScheme: 'light',
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Manage slots"
        subtitle={`${provider?.service_name || 'Your service'} · ${durationMins}-minute sessions`}
      />

      {/* Create form */}
      <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--r-xl)', padding: '28px', boxShadow: 'var(--elev-1)', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '20px', color: 'var(--text-1)' }}>Add new availability</h2>
        <form onSubmit={handleCreate}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            {/* Date */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-2)' }}>Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} min={today} required style={inputStyle}
                onFocus={e => { e.target.style.borderColor = 'var(--blue)'; e.target.style.background = 'var(--white)'; e.target.style.boxShadow = '0 0 0 3px rgba(26,115,232,0.1)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--surface-2)'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            {/* Time */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-2)' }}>Start time</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required style={inputStyle}
                onFocus={e => { e.target.style.borderColor = 'var(--blue)'; e.target.style.background = 'var(--white)'; e.target.style.boxShadow = '0 0 0 3px rgba(26,115,232,0.1)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--surface-2)'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            {/* Auto end */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-2)' }}>End time <span style={{ color: 'var(--text-4)', fontWeight: 400 }}>(automatic)</span></label>
              <div style={{ ...inputStyle, background: 'var(--bg)', color: computedEnd ? 'var(--text-1)' : 'var(--text-4)', cursor: 'default', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {computedEnd ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="#1a73e8" strokeWidth="1.2" /><path d="M7 4v3l2 1.5" stroke="#1a73e8" strokeWidth="1.2" strokeLinecap="round" /></svg>
                    {computedEnd}
                  </>
                ) : `+${durationMins} min from start`}
              </div>
            </div>
          </div>

          {error && <Alert type="error" style={{ marginBottom: '16px' }}>{error}</Alert>}
          {success && <Alert type="success" style={{ marginBottom: '16px' }}>{success}</Alert>}

          <Button type="submit" variant="filled" loading={creating}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            Add slot
          </Button>
        </form>
      </div>

      {/* Slots list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px', gap: '16px' }}>
          <Spinner size={32} /><span style={{ fontSize: '0.875rem', color: 'var(--text-3)' }}>Loading slots...</span>
        </div>
      ) : slots.length === 0 ? (
        <EmptyState icon="🕐" title="No slots yet" subtitle="Use the form above to add your first availability slot." />
      ) : (
        <>
          {future.length > 0 && (
            <section style={{ marginBottom: '24px' }}>
              <SectionLabel count={future.length}>Upcoming</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {future.map(s => <SlotRow key={s.id} slot={s} />)}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section style={{ opacity: 0.6 }}>
              <SectionLabel>Past</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {past.slice(0, 5).map(s => <SlotRow key={s.id} slot={s} />)}
              </div>
            </section>
          )}
        </>
      )}
    </PageWrapper>
  )
}

function SlotRow({ slot }) {
  const start = parseISO(slot.start_time)
  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', boxShadow: 'var(--elev-1)' }}>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-1)' }}>{format(start, 'EEE, MMM d')}</span>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>{format(start, 'h:mm a')} – {format(parseISO(slot.end_time), 'h:mm a')}</span>
      </div>
      <Badge status={slot.is_available ? 'available' : 'pending'} />
    </div>
  )
}
