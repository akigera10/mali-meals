import AdminNav from '../components/AdminNav'
import KitchenClient from './KitchenClient'

export const revalidate = 0

export default function KitchenPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--surface-base)' }}>
      <AdminNav />
      <KitchenClient />
    </div>
  )
}
