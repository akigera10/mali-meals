/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import AdminNav from '../../components/AdminNav'
import OrderDetailClient from './OrderDetailClient'

export const revalidate = 0

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { id } = params

  const [{ data: order }, { data: items }, { data: specials }] = await Promise.all([
    supabase.from('orders').select('*').eq('id', id).single(),
    (supabase.from('order_items') as any)
      .select('id, quantity, variant, unit_price, menu_items(name, category, meat_upgrade_type), order_item_addons(quantity, unit_price, protein_addons(name))')
      .eq('order_id', id),
    (supabase.from('order_specials') as any)
      .select('id, quantity, unit_price, specials(name)')
      .eq('order_id', id),
  ])

  if (!order) notFound()

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--surface-base)' }}>
      <AdminNav />
      <OrderDetailClient
        initialOrder={order}
        items={items || []}
        specials={specials || []}
      />
    </div>
  )
}
