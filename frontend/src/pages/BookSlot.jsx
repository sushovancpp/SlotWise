import React, { useState, useEffect, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { api } from '../services/api'
import { PageWrapper, PageHeader, SectionLabel } from '../components/layout'
import { Button, Alert, Badge, Spinner, EmptyState } from '../components/ui'

function SlotCard({ slot, onBook, booking }) {
  const [hovered, setHovered] = useState(false)
  const start = parseISO(slot.start_time)
  const end = parseISO(slot.end_time)
  const isBooking = booking === slot.id

  return (
    <div style={{
      background: 'var(--white)',
      border: `1.5px solid ${hovered ? 'var(--blue)' : 'var(--border)'}`,
      borderRadius: 'var(--r-lg)',
      padding: '16px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '16px', flexWrap: 'wrap',
      cursor: 'default',
      boxShadow: hovered ? 'var(--elev-2)' : 'var(--elev-1)',
      transition: 'all var(--dur) var(--ease)',
    }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: 1, minWidth: 0 }}>
        {/* Date badge */}
        <div style={{
          width: 52, flexShrink: 0, textAlign: 'center',
          background: hovered ? 'var(--blue)' : 'var(--blue-light)',
          borderRadius: 'var(--r-md)',
          padding: '8px 6px',
          transition: 'background var(--dur) var(--ease)',
        }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: hovered ? 'rgba(255,255,255,0.7)' : 'var(--blue)', lineHeight: 1 }}>{format(start, 'MMM')}</div>
          <div style={{ fontSize: '1.625rem', fontWeight: 700, color: hovered ? '#fff' : 'var(--blue)', lineHeight: 1.1 }}>{format(start, 'd')}</div>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: hovered ? 'rgba(255,255,255,0.7)' : 'var(--text-3)' }}>{format(start, 'EEE')}</div>
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-1)', marginBottom: '3px' }}>
            {format(start, 'h:mm a')}
            <span style={{ color: 'var(--text-3)', fontWeight: 400 }}> – </span>
            {format(end, 'h:mm a')}
          </div>
          <div style={{ fontSize: '0.8375rem', color: 'var(--text-2)', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {slot.provider_name} · {slot.service_name}
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge status="available" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', background: 'var(--bg)', padding: '2px 8px', borderRadius: 'var(--r-pill)', border: '1px solid var(--border)' }}>
              {slot.duration_mins} min
            </span>
          </div>
        </div>
      </div>

      <Button variant="filled" size="sm" loading={isBooking} onClick={() => onBook(slot)} style={{ flexShrink: 0 }}>
        Book
      </Button>
    </div>
  )
}

export default function BookSlot() {
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(null)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [aiQuery, setAiQuery] = useState('')
  const [aiSearching, setAiSearching] = useState(false)
  const [aiExplanation, setAiExplanation] = useState('')
  const [isFiltered, setIsFiltered] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)

  const loadSlots = useCallback(async () => {
    setLoading(true)
    try { setSlots(await api.listSlots()); setIsFiltered(false); setAiExplanation('') }
    catch { setError('Failed to load available slots.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadSlots() }, [loadSlots])

  const handleAiSearch = async (e) => {
    e.preventDefault(); if (!aiQuery.trim()) return
    setAiSearching(true); setError('')
    try {
      const result = await api.searchSlots(aiQuery)
      setSlots(result.slots); setAiExplanation(result.explanation); setIsFiltered(true)
    } catch { setError('AI search unavailable.'); loadSlots() }
    finally { setAiSearching(false) }
  }

  const handleBook = async (slot) => {
    setBooking(slot.id); setError(''); setSuccess('')
    try {
      await api.createBooking({ slot_id: slot.id })
      setSuccess(`Booking confirmed! Your appointment on ${format(parseISO(slot.start_time), "MMM d 'at' h:mm a")} is pending provider confirmation.`)
      loadSlots()
    } catch (err) { setError(err.message || 'Booking failed. Try again.') }
    finally { setBooking(null) }
  }

  return (
    <PageWrapper>
      <PageHeader title="Book a slot" subtitle="Browse available appointments or use AI to find the perfect time." />

      {/* AI Search */}
      <div style={{
        marginBottom: '24px',
        background: 'var(--white)',
        border: `1.5px solid ${searchFocused ? 'var(--blue)' : 'var(--border)'}`,
        borderRadius: 'var(--r-xl)',
        boxShadow: searchFocused ? '0 0 0 3px rgba(26,115,232,0.1), var(--elev-2)' : 'var(--elev-1)',
        transition: 'border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'var(--blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="#1a73e8" strokeWidth="1.5" /><path d="M11 11l3 3" stroke="#1a73e8" strokeWidth="1.5" strokeLinecap="round" /><path d="M5 7h4M7 5v4" stroke="#1a73e8" strokeWidth="1.2" strokeLinecap="round" /></svg>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-1)' }}>AI-powered search</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>Describe when you want — "Thursday afternoon" or "next Monday morning"</div>
          </div>
        </div>
        <form onSubmit={handleAiSearch} style={{ display: 'flex', gap: '0', padding: '12px 16px' }}>
          <input
            value={aiQuery}
            onChange={e => setAiQuery(e.target.value)}
            placeholder="Describe your preferred time..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={{
              flex: 1, padding: '10px 14px', fontSize: '0.9375rem',
              border: '1px solid var(--border)', borderRadius: 'var(--r-md) 0 0 var(--r-md)',
              outline: 'none', background: 'var(--bg)', color: 'var(--text-1)',
              borderRight: 'none',
            }}
          />
          <Button type="submit" variant="filled" size="md" loading={aiSearching} style={{ borderRadius: '0 var(--r-md) var(--r-md) 0', flexShrink: 0 }}>
            Search
          </Button>
          {isFiltered && (
            <Button type="button" variant="neutral" size="md" onClick={loadSlots} style={{ marginLeft: '8px', flexShrink: 0 }}>
              Clear
            </Button>
          )}
        </form>
        {aiExplanation && (
          <div style={{ padding: '0 20px 14px', fontSize: '0.8125rem', color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#1a73e8" strokeWidth="1.2" /><path d="M7 5v3M7 9.5v.5" stroke="#1a73e8" strokeWidth="1.2" strokeLinecap="round" /></svg>
            {aiExplanation}
          </div>
        )}
      </div>

      {success && <Alert type="success" style={{ marginBottom: '16px' }}>{success}</Alert>}
      {error && <Alert type="error" style={{ marginBottom: '16px' }}>{error}</Alert>}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px', gap: '16px' }}>
          <Spinner size={36} />
          <span style={{ fontSize: '0.875rem', color: 'var(--text-3)' }}>Loading available slots...</span>
        </div>
      ) : slots.length === 0 ? (
        <EmptyState icon="🗓" title={isFiltered ? 'No matching slots' : 'No slots available'} subtitle={isFiltered ? 'Try a different description, or clear to see all slots.' : 'No providers have added availability yet. Check back later.'} action={isFiltered ? <Button variant="tonal" onClick={loadSlots}>View all slots</Button> : null} />
      ) : (
        <div className="fade-in">
          <SectionLabel count={slots.length}>{isFiltered ? 'Matched slots' : 'Available slots'}</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {slots.map(s => <SlotCard key={s.id} slot={s} onBook={handleBook} booking={booking} />)}
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
