import { Suspense } from 'react'
import ResetPasswordClient from './ResetPasswordClient'

export default function AdminResetPasswordPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--surface-base)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-ui)',
        color: 'var(--text-secondary)',
      }}>
        Loading reset page...
      </div>
    }>
      <ResetPasswordClient />
    </Suspense>
  )
}
