import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { api } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { PageWrapper, PageHeader, SectionLabel } from '../components/layout'
import { Button, Alert, Badge, Spinner, EmptyState } from '../components/ui'

function StatCard({ label, value, accent, bg, icon }) {
  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '20px 24px', boxShadow: 'var(--elev-1)', display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ width: 48, height: 48, borderRadius: '12px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.375rem', flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: '1.875rem', fontWeight: 700, color: accent, lineHeight: 1, letterSpacing: '-0.03em' }}>{value}</div>
        <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '3px' }}>{label}</div>
      </div>
    </div>
  )
}

function BookingRow({ booking, onTransition, updating }) {
  const [hovered, setHovered] = useState(false)
  const slot = booking.slot
  if (!slot) return null
  const start = parseISO(slot.start_time)
  const isPending = booking.status === 'pending'

  return (
    <div style={{
      background: 'var(--white)',
      border: `1px solid ${isPending && hovered ? 'var(--blue)' : 'var(--border)'}`,
      borderLeft: isPending ? '3px solid var(--amber)' : '3px solid var(--border)',
      borderRadius: 'var(--r-lg)',
      padding: '14px 18px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
      boxShadow: hovered ? 'var(--elev-2)' : 'var(--elev-1)',
      transition: 'all var(--dur) var(--ease)',
    }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
        <div style={{ width: 44, textAlign: 'center', background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: '6px 4px', flexShrink: 0 }}>
          <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', lineHeight: 1 }}>{format(start, 'MMM')}</div>
          <div style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.1 }}>{format(start, 'd')}</div>
          <div style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-3)' }}>{format(start, 'EEE')}</div>
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '2px' }}>{booking.client_name}</div>
          <div style={{ fontSize: '0.8375rem', color: 'var(--text-2)', marginBottom: '7px' }}>{format(start, 'h:mm a')} – {format(parseISO(slot.end_time), 'h:mm a')}</div>
          <Badge status={booking.status} />
        </div>
      </div>

      {onTransition && booking.status !== 'cancelled' && (
        <div style={{ display: 'flex', gap: '8px' }}>
          {booking.status === 'pending' && <Button variant="success" size="sm" loading={updating} onClick={() => onTransition(booking.id, 'confirmed')}>Confirm</Button>}
          <Button variant="danger" size="sm" loading={updating} onClick={() => onTransition(booking.id, 'cancelled')}>Cancel</Button>
        </div>
      )}
    </div>
  )
}

export default function ProviderDashboard() {
  const user = useAuthStore(s => s.user)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { setBookings(await api.providerBookings()) }
    catch { setError('Failed to load.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleTransition = async (bookingId, newStatus) => {
    setUpdating(bookingId); setError(''); setSuccess('')
    try { await api.updateStatus(bookingId, newStatus); setSuccess(`Booking ${newStatus}.`); load() }
    catch (err) { setError(err.message || 'Update failed.') }
    finally { setUpdating(null) }
  }

  const pending = bookings.filter(b => b.status === 'pending')
  const confirmed = bookings.filter(b => b.status === 'confirmed')
  const cancelled = bookings.filter(b => b.status === 'cancelled')

  return (
    <PageWrapper maxWidth="1000px">
      <PageHeader
        title={`Good day, ${user?.name?.split(' ')[0]}`}
        subtitle="Here's an overview of your appointments."
        action={<Link to="/manage-slots"><Button variant="filled">+ Add availability</Button></Link>}
      />

      {error && <Alert type="error" style={{ marginBottom: '16px' }}>{error}</Alert>}
      {success && <Alert type="success" style={{ marginBottom: '16px' }}>{success}</Alert>}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '32px' }}>
        <StatCard label="Pending" value={pending.length}   accent="#7c5200" bg="var(--amber-light)" icon="⏳" />
        <StatCard label="Confirmed" value={confirmed.length} accent="var(--green)"  bg="var(--green-light)" icon="✅" />
        <StatCard label="Cancelled" value={cancelled.length} accent="var(--red)"    bg="var(--red-light)"   icon="✕" />
        <StatCard label="Total" value={bookings.length}    accent="var(--blue)"   bg="var(--blue-light)"  icon="📋" />
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px', gap: '16px' }}><Spinner size={36} /><span style={{ fontSize: '0.875rem', color: 'var(--text-3)' }}>Loading bookings...</span></div>
      ) : bookings.length === 0 ? (
        <EmptyState icon="📋" title="No bookings yet" subtitle="Add availability slots so clients can start booking with you." action={<Link to="/manage-slots"><Button variant="tonal">Add your first slot</Button></Link>} />
      ) : (
        <>
          {pending.length > 0 && (
            <section style={{ marginBottom: '28px' }}>
              <SectionLabel count={pending.length}>Awaiting confirmation</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pending.map(b => <BookingRow key={b.id} booking={b} onTransition={handleTransition} updating={updating === b.id} />)}
              </div>
            </section>
          )}
          {confirmed.length > 0 && (
            <section style={{ marginBottom: '28px' }}>
              <SectionLabel count={confirmed.length}>Confirmed</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {confirmed.map(b => <BookingRow key={b.id} booking={b} onTransition={handleTransition} updating={updating === b.id} />)}
              </div>
            </section>
          )}
          {cancelled.length > 0 && (
            <section style={{ opacity: 0.65 }}>
              <SectionLabel count={cancelled.length}>Cancelled</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {cancelled.map(b => <BookingRow key={b.id} booking={b} />)}
              </div>
            </section>
          )}
        </>
      )}
    </PageWrapper>
  )
}
