import { createServerClient } from '@/lib/supabase'
import MenuClient from './components/MenuClient'

export const revalidate = 60

export default async function HomePage() {
  const supabase = createServerClient()

  const [{ data: menuItems }, { data: addons }] = await Promise.all([
    supabase
      .from('menu_items')
      .select('id, name, description, category, base_price, meat_upgrade_price, meat_upgrade_type, is_sold_out, is_spicy, is_freezer_friendly, allergens')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('protein_addons')
      .select('id, name, price, is_sold_out')
      .eq('is_active', true)
      .order('sort_order'),
  ])

  return <MenuClient menuItems={menuItems ?? []} addons={addons ?? []} />
}
