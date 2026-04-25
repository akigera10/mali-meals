import AdminNav from '../components/AdminNav'
import DeliveriesClient from './DeliveriesClient'

export const revalidate = 0

export default function DeliveriesPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--surface-base)' }}>
      <AdminNav />
      <DeliveriesClient />
    </div>
  )
}
