import { createServerClient } from '@/lib/supabase'
import MenuClient from './components/MenuClient'

export const revalidate = 0

export default async function HomePage() {
  console.log('>>> HomePage called — env URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  const supabase = createServerClient()

  const [menuResult, addonsResult] = await Promise.all([
    supabase
      .from('menu_items')
      .select('id, name, description, category, base_price, meat_upgrade_price, meat_upgrade_type, is_sold_out, is_spicy, is_freezer_friendly, allergens, is_family_friendly')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('protein_addons')
      .select('id, name, price, is_sold_out')
      .eq('is_active', true)
      .order('sort_order'),
  ])

  console.log('[menu_items] data:', menuResult.data, '| error:', menuResult.error)
  console.log('[protein_addons] data:', addonsResult.data, '| error:', addonsResult.error)

  return <MenuClient menuItems={menuResult.data ?? []} addons={addonsResult.data ?? []} />
}
