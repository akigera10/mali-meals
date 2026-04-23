'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      router.push('/admin')
    } else {
      setError('Incorrect password')
      setLoading(false)
    }
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
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '8px',
            border: error ? '1px solid #B5533C' : '1px solid var(--border-strong)',
            backgroundColor: 'var(--surface-raised)',
            fontSize: '15px',
            color: 'var(--text-primary)',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {error && (
          <p style={{ fontSize: '13px', color: '#B5533C', marginTop: '6px' }}>
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !password}
          style={{
            marginTop: '20px',
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: loading || !password ? 'var(--surface-sunken)' : 'var(--brand-gold)',
            color: loading || !password ? 'var(--text-tertiary)' : '#fff',
            fontSize: '15px',
            fontFamily: 'var(--font-inter)',
            cursor: loading || !password ? 'default' : 'pointer',
          }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </div>
    </div>
  )
}