'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Admin user must be created manually in the Supabase dashboard:
// Authentication → Users → Invite user (or Add user)
// Use the email and password you want Mali to log in with.

export default function AdminLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [resetMessage, setResetMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetCooldownUntil, setResetCooldownUntil] = useState(0)

  async function handleSubmit() {
    if (!email || !password) return
    setLoading(true)
    setError('')
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError('Invalid email or password.')
      setLoading(false)
    } else {
      router.push('/admin')
    }
  }

  async function handleForgotPassword() {
    setResetMessage('')
    const trimmedEmail = email.trim().toLowerCase()
    const now = Date.now()
    if (!trimmedEmail) {
      setResetMessage('Enter your email address first.')
      return
    }
    if (now < resetCooldownUntil) {
      setResetMessage('If this email has admin access, a reset link has been sent.')
      return
    }

    setResetLoading(true)
    setResetCooldownUntil(now + 60000)
    if (trimmedEmail === 'orders@malismeals.com') {
      await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/admin/reset-password`,
      })
    }
    setResetLoading(false)
    setResetMessage('If this email has admin access, a reset link has been sent.')
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--surface-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-inter)',
    }}>
      <div style={{
        backgroundColor: 'var(--surface-raised)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '40px',
        width: '100%',
        maxWidth: '360px',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-fraunces)',
          fontSize: '24px',
          color: 'var(--text-primary)',
          marginBottom: '8px',
        }}>
          Mali&apos;s Meals
        </h1>
        <p style={{
          fontSize: '14px',
          color: 'var(--text-secondary)',
          marginBottom: '28px',
        }}>
          Admin access
        </p>

        <label style={{
          display: 'block',
          fontSize: '13px',
          color: 'var(--text-tertiary)',
          marginBottom: '6px',
        }}>
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoComplete="email"
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid var(--border-strong)',
            backgroundColor: 'var(--surface-raised)',
            fontSize: '15px',
            color: 'var(--text-primary)',
            outline: 'none',
            boxSizing: 'border-box',
            marginBottom: '16px',
          }}
        />

        <label style={{
          display: 'block',
          fontSize: '13px',
          color: 'var(--text-tertiary)',
          marginBottom: '6px',
        }}>
          Password
        </label>
        {/* Wrapper positions the eye toggle inside the input */}
        <div style={{ position: 'relative' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            autoComplete="current-password"
            style={{
              width: '100%',
              padding: '10px 40px 10px 12px',
              borderRadius: '8px',
              border: error ? '1px solid #B5533C' : '1px solid var(--border-strong)',
              backgroundColor: 'var(--surface-raised)',
              fontSize: '15px',
              color: 'var(--text-primary)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              padding: '0',
              cursor: 'pointer',
              color: 'var(--text-tertiary)',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              /* Eye-off SVG — password is visible, click to hide */
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              /* Eye SVG — password is hidden, click to show */
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>

        {error && (
          <p style={{ fontSize: '13px', color: '#B5533C', marginTop: '6px' }}>
            {error}
          </p>
        )}

        {/* Forgot password */}
        <div style={{ marginTop: '8px' }}>
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={resetLoading}
            style={{
              background: 'none',
              border: 'none',
              padding: '0',
              fontSize: '13px',
              color: 'var(--text-tertiary)',
              cursor: resetLoading ? 'default' : 'pointer',
              textDecoration: 'none',
            }}
          >
            {resetLoading ? 'Sending reset link...' : 'Forgot password?'}
          </button>
          {resetMessage && (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {resetMessage}
            </p>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !email || !password}
          style={{
            marginTop: '20px',
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: loading || !email || !password ? 'var(--surface-sunken)' : 'var(--brand-gold)',
            color: loading || !email || !password ? 'var(--text-tertiary)' : '#fff',
            fontSize: '15px',
            fontFamily: 'var(--font-inter)',
            cursor: loading || !email || !password ? 'default' : 'pointer',
          }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </div>
    </div>
  )
}
