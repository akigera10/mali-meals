import { createServerClient } from '@/lib/supabase'
import OrdersClient from './OrdersClient'

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

  return <OrdersClient initialOrders={orders} />
}