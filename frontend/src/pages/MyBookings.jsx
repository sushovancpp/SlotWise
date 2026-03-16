import React, { useState, useEffect, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { api } from '../services/api'
import { PageWrapper, PageHeader, SectionLabel } from '../components/layout'
import { Button, Alert, Badge, Spinner, EmptyState, Card } from '../components/ui'
import { Link } from 'react-router-dom'

function AuditModal({ bookingId, onClose }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    api.bookingAudit(bookingId).then(setLogs).catch(() => setLogs([])).finally(() => setLoading(false))
  }, [bookingId])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(32,31,30,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div style={{ width: '100%', maxWidth: '480px', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--elev-4)', overflow: 'hidden', animation: 'fadeUp var(--dur) var(--ease)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '2px' }}>Audit trail</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>Full history of booking #{bookingId}</p>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', color: 'var(--text-2)' }}>✕</button>
        </div>

        <div style={{ padding: '20px 24px', maxHeight: '60vh', overflow: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}><Spinner /></div>
          ) : logs.length === 0 ? (
            <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', textAlign: 'center' }}>No logs found.</p>
          ) : (
            logs.map((log, i) => (
              <div key={log.id} style={{ display: 'flex', gap: '14px', paddingBottom: i < logs.length - 1 ? '20px' : 0, position: 'relative' }}>
                {i < logs.length - 1 && <div style={{ position: 'absolute', left: '10px', top: '24px', bottom: 0, width: '1.5px', background: 'var(--border)' }} />}
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: '1px',
                  background: log.new_status === 'cancelled' ? 'var(--red)' : log.new_status === 'confirmed' ? 'var(--green)' : 'var(--amber)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
                }}>
                  <span style={{ fontSize: '10px', color: '#fff', fontWeight: 700 }}>{log.new_status === 'confirmed' ? '✓' : log.new_status === 'cancelled' ? '✕' : '•'}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                    <Badge status={log.new_status} />
                    {log.old_status && <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>← {log.old_status}</span>}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{log.actor_name} · {format(parseISO(log.changed_at), 'MMM d, h:mm a')}</div>
                  {log.reason && <div style={{ fontSize: '0.8rem', color: 'var(--text-2)', fontStyle: 'italic', marginTop: '3px' }}>"{log.reason}"</div>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function BookingRow({ booking, onCancel, onAudit, cancelling }) {
  const [hovered, setHovered] = useState(false)
  const slot = booking.slot
  if (!slot) return null
  const start = parseISO(slot.start_time)
  const isCancelled = booking.status === 'cancelled'

  return (
    <div style={{
      background: 'var(--white)', border: `1px solid ${hovered && !isCancelled ? 'var(--blue-tonal)' : 'var(--border)'}`,
      borderRadius: 'var(--r-lg)', padding: '16px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
      boxShadow: hovered && !isCancelled ? 'var(--elev-2)' : 'var(--elev-1)',
      opacity: isCancelled ? 0.65 : 1,
      transition: 'all var(--dur) var(--ease)',
    }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
        {/* Date */}
        <div style={{ width: 48, textAlign: 'center', background: isCancelled ? 'var(--bg)' : 'var(--blue-light)', borderRadius: 'var(--r-md)', padding: '7px 4px', flexShrink: 0 }}>
          <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: isCancelled ? 'var(--text-3)' : 'var(--blue)', lineHeight: 1 }}>{format(start, 'MMM')}</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: isCancelled ? 'var(--text-2)' : 'var(--blue)', lineHeight: 1.1 }}>{format(start, 'd')}</div>
          <div style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-3)' }}>{format(start, 'EEE')}</div>
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '3px' }}>{format(start, 'h:mm a')} · {slot.service_name}</div>
          <div style={{ fontSize: '0.8375rem', color: 'var(--text-2)', marginBottom: '7px' }}>with {slot.provider_name}</div>
          <Badge status={booking.status} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <Button variant="neutral" size="sm" onClick={onAudit}>View audit</Button>
        {!isCancelled && onCancel && <Button variant="danger" size="sm" loading={cancelling} onClick={() => onCancel(booking)}>Cancel</Button>}
      </div>
    </div>
  )
}

export default function MyBookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [auditId, setAuditId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setBookings(await api.myBookings()) }
    catch { setError('Failed to load bookings.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCancel = async (booking) => {
    const reason = window.prompt('Reason for cancellation (optional):')
    if (reason === null) return
    setCancelling(booking.id); setError(''); setSuccess('')
    try { await api.updateStatus(booking.id, 'cancelled', reason); setSuccess('Booking cancelled successfully.'); load() }
    catch (err) { setError(err.message || 'Cancellation failed.') }
    finally { setCancelling(null) }
  }

  const active = bookings.filter(b => b.status !== 'cancelled')
  const past = bookings.filter(b => b.status === 'cancelled')

  return (
    <PageWrapper>
      <PageHeader title="My bookings" subtitle={active.length > 0 ? `${active.length} upcoming appointment${active.length !== 1 ? 's' : ''}` : 'No upcoming appointments'} />

      {error && <Alert type="error" style={{ marginBottom: '16px' }}>{error}</Alert>}
      {success && <Alert type="success" style={{ marginBottom: '16px' }}>{success}</Alert>}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px', gap: '16px' }}><Spinner size={36} /><span style={{ fontSize: '0.875rem', color: 'var(--text-3)' }}>Loading bookings...</span></div>
      ) : bookings.length === 0 ? (
        <EmptyState icon="📅" title="No bookings yet" subtitle="Head over to the booking page to schedule your first appointment." action={<Link to="/book"><Button variant="filled">Book a slot</Button></Link>} />
      ) : (
        <>
          {active.length > 0 && (
            <section style={{ marginBottom: '32px' }}>
              <SectionLabel count={active.length}>Upcoming</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {active.map(b => <BookingRow key={b.id} booking={b} onCancel={handleCancel} onAudit={() => setAuditId(b.id)} cancelling={cancelling === b.id} />)}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <SectionLabel count={past.length}>Cancelled</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {past.map(b => <BookingRow key={b.id} booking={b} onAudit={() => setAuditId(b.id)} />)}
              </div>
            </section>
          )}
        </>
      )}
      {auditId && <AuditModal bookingId={auditId} onClose={() => setAuditId(null)} />}
    </PageWrapper>
  )
}
