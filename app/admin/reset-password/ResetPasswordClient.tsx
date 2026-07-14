'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState('Checking reset link...')
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let mounted = true

    async function prepareRecoverySession() {
      const authError = searchParams.get('error')
      const authErrorCode = searchParams.get('error_code')
      if (authError || authErrorCode) {
        if (mounted) {
          setError('This reset link is invalid or has expired. Request a new link from the login page.')
          setStatus('')
          setReady(false)
        }
        return
      }

      const code = searchParams.get('code')
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError && mounted) {
          setError('This reset link is invalid or has expired. Request a new link from the login page.')
          setStatus('')
          setReady(false)
          return
        }
      }

      if (typeof window !== 'undefined' && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.slice(1))
        const tokenHash = hashParams.get('token_hash')
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const recoveryType = hashParams.get('type')

        if (tokenHash && recoveryType === 'recovery') {
          const { error: verificationError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          })
          window.history.replaceState(null, '', window.location.pathname)
          if (verificationError && mounted) {
            setError('This reset link is invalid or has expired. Request a new link from the login page.')
            setStatus('')
            setReady(false)
            return
          }
        } else if (accessToken && refreshToken && recoveryType === 'recovery') {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          window.history.replaceState(null, '', window.location.pathname)
          if (sessionError && mounted) {
            setError('This reset link is invalid or has expired. Request a new link from the login page.')
            setStatus('')
            setReady(false)
            return
          }
        }
      }

      const { data } = await supabase.auth.getSession()
      if (mounted) {
        if (data.session) {
          setReady(true)
          setStatus('Choose a new admin password.')
        } else {
          setError('This reset link is invalid or has expired. Request a new link from the login page.')
          setStatus('')
          setReady(false)
        }
      }
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && mounted) {
        setReady(true)
        setStatus('Choose a new admin password.')
        setError('')
      }
    })

    prepareRecoverySession()

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [searchParams])

  async function handleSave() {
    setError('')
    if (password.length < 8) {
      setError('Use at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSaving(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSaving(false)

    if (updateError) {
      setError('Could not update the password. Request a fresh reset link and try again.')
      return
    }

    setSaved(true)
    setStatus('Password updated. Redirecting to admin...')
    setTimeout(() => router.push('/admin'), 1200)
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--surface-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-ui)',
      padding: '24px',
    }}>
      <div style={{
        backgroundColor: 'var(--surface-raised)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '40px',
        width: '100%',
        maxWidth: '400px',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-instrument-serif)',
          fontSize: '24px',
          color: 'var(--text-primary)',
          margin: '0 0 8px',
        }}>
          Reset admin password
        </h1>
        <p style={{
          fontSize: '14px',
          color: 'var(--text-secondary)',
          margin: '0 0 28px',
          lineHeight: 1.5,
        }}>
          {status || 'Use the latest reset email to continue.'}
        </p>

        {error && (
          <p style={{
            fontSize: '13px',
            color: 'var(--accent-terracotta)',
            backgroundColor: 'rgba(181, 83, 60, 0.08)',
            border: '1px solid rgba(181, 83, 60, 0.22)',
            borderRadius: '8px',
            padding: '10px 12px',
            margin: '0 0 18px',
            lineHeight: 1.4,
          }}>
            {error}
          </p>
        )}

        {ready && !saved && (
          <>
            <label style={{
              display: 'block',
              fontSize: '13px',
              color: 'var(--text-tertiary)',
              marginBottom: '6px',
            }}>
              New password
            </label>
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-strong)',
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
                  padding: 0,
                  cursor: 'pointer',
                  color: 'var(--text-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
            </div>

            <label style={{
              display: 'block',
              fontSize: '13px',
              color: 'var(--text-tertiary)',
              marginBottom: '6px',
            }}>
              Confirm new password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              autoComplete="new-password"
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
                marginBottom: '20px',
              }}
            />

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !password || !confirmPassword}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: saving || !password || !confirmPassword ? 'var(--surface-sunken)' : 'var(--brand-green)',
                color: saving || !password || !confirmPassword ? 'var(--text-tertiary)' : '#fff',
                fontSize: '15px',
                fontFamily: 'var(--font-ui)',
                cursor: saving || !password || !confirmPassword ? 'default' : 'pointer',
              }}
            >
              {saving ? 'Saving...' : 'Save password'}
            </button>
          </>
        )}

        {saved && (
          <p style={{
            fontSize: '13px',
            color: 'var(--accent-forest)',
            backgroundColor: 'rgba(31, 107, 58, 0.08)',
            border: '1px solid rgba(31, 107, 58, 0.22)',
            borderRadius: '8px',
            padding: '10px 12px',
            margin: 0,
            lineHeight: 1.4,
          }}>
            Password updated successfully.
          </p>
        )}

        {!ready && (
          <Link href="/admin/login" style={{
            display: 'inline-block',
            marginTop: '4px',
            fontSize: '13px',
            color: 'var(--brand-green-hover)',
            textDecoration: 'none',
          }}>
            Back to admin login
          </Link>
        )}
      </div>
    </div>
  )
}
