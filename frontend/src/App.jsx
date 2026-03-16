import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { Navbar } from './components/layout'

import Login from './pages/Login'
import Register from './pages/Register'
import BookSlot from './pages/BookSlot'
import MyBookings from './pages/MyBookings'
import ProviderDashboard from './pages/ProviderDashboard'
import ManageSlots from './pages/ManageSlots'
import Home from './pages/Home'

function ProtectedRoute({ children, role }) {
  const { token, user } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (role && user?.role !== role) {
    return <Navigate to={user?.role === 'provider' ? '/dashboard' : '/book'} replace />
  }
  return children
}

function GuestRoute({ children }) {
  const { token, user } = useAuthStore()
  if (token) return <Navigate to={user?.role === 'provider' ? '/dashboard' : '/book'} replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/login" element={
          <GuestRoute><Login /></GuestRoute>
        } />
        <Route path="/register" element={
          <GuestRoute><Register /></GuestRoute>
        } />

        {/* Client routes */}
        <Route path="/book" element={
          <ProtectedRoute role="client"><BookSlot /></ProtectedRoute>
        } />
        <Route path="/my-bookings" element={
          <ProtectedRoute role="client"><MyBookings /></ProtectedRoute>
        } />

        {/* Provider routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute role="provider"><ProviderDashboard /></ProtectedRoute>
        } />
        <Route path="/manage-slots" element={
          <ProtectedRoute role="provider"><ManageSlots /></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
