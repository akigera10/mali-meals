import AdminNav from '../components/AdminNav'
import PaymentsClient from './PaymentsClient'

export const revalidate = 0

export default function PaymentsPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--surface-base)' }}>
      <AdminNav />
      <PaymentsClient />
    </div>
  )
}
