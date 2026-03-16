const BASE = '/api'

function getToken() {
  return localStorage.getItem('slotwise_token')
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data.error || data.message || `HTTP ${res.status}`
    const err = new Error(msg)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export const api = {
  // Auth
  register: (payload) => request('POST', '/auth/register', payload),
  login: (payload) => request('POST', '/auth/login', payload),
  me: () => request('GET', '/auth/me'),

  // Providers
  listProviders: () => request('GET', '/providers/'),

  // Slots
  listSlots: (providerId) =>
    request('GET', `/slots/${providerId ? `?provider_id=${providerId}` : ''}`),
  searchSlots: (query, providerId) =>
    request('POST', '/slots/search', { query, provider_id: providerId }),
  createSlot: (payload) => request('POST', '/slots/', payload),
  mySlots: () => request('GET', '/slots/mine'),

  // Bookings
  createBooking: (payload) => request('POST', '/bookings/', payload),
  myBookings: () => request('GET', '/bookings/mine'),
  providerBookings: () => request('GET', '/bookings/provider'),
  updateStatus: (id, status, reason) =>
    request('PATCH', `/bookings/${id}/status`, { status, reason }),
  bookingAudit: (id) => request('GET', `/bookings/${id}/audit`),
}
