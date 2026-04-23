import { createServerClient } from '@/lib/supabase'
import MenuManagementClient from './MenuManagementClient'

export const revalidate = 0

export default async function AdminMenuPage() {
  const supabase = createServerClient()

  const [
    { data: menuItems, error: menuError },
    { data: addons, error: addonError },
    { data: specials, error: specialError },
  ] = await Promise.all([
    supabase.from('menu_items').select('*').order('category').order('sort_order'),
    supabase.from('protein_addons').select('*').order('sort_order'),
    supabase.from('specials').select('*').order('created_at'),
  ])

  if (menuError || addonError || specialError) {
    return (
      <div style={{ padding: '40px', fontFamily: 'var(--font-inter)', color: '#B5533C' }}>
        Error loading menu: {menuError?.message || addonError?.message || specialError?.message}
      </div>
    )
  }

  return (
    <MenuManagementClient
      initialMenuItems={menuItems || []}
      initialAddons={addons || []}
      initialSpecials={specials || []}
    />
  )
}
