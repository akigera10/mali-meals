import { createServerClient } from '@/lib/supabase'
import OrdersClient from './OrdersClient'
import AdminNav from './components/AdminNav'

export const revalidate = 0

export default async function AdminPage() {
  const supabase = createServerClient()
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div style={{ padding: '40px', fontFamily: 'var(--font-inter)', color: '#B5533C' }}>
        Error loading orders: {error.message}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--surface-base)' }}>
      <AdminNav />
      <OrdersClient initialOrders={orders} />
    </div>
  )
}