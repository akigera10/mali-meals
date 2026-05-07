import { createAdminClient } from '@/lib/supabase'
import MenuClient from './MenuClient'

export const revalidate = 0

export default async function AdminMenuPage() {
  const supabase = createAdminClient()

  const [
    { data: menuItems, error: menuError },
    { data: addons, error: addonError },
    { data: specials, error: specialError },
    { data: settings },
  ] = await Promise.all([
    supabase.from('menu_items').select('*').order('category').order('sort_order'),
    supabase.from('protein_addons').select('*').order('sort_order'),
    supabase.from('specials').select('*').order('created_at'),
    supabase.from('settings').select('active_cycle, weekend_cutoff, midweek_cutoff').maybeSingle(),
  ])

  if (menuError || addonError || specialError) {
    return (
      <div style={{ padding: '40px', fontFamily: 'var(--font-inter)', color: '#B5533C' }}>
        Error loading menu: {menuError?.message || addonError?.message || specialError?.message}
      </div>
    )
  }

  return (
    <MenuClient
      initialMenuItems={menuItems || []}
      initialAddons={addons || []}
      initialSpecials={specials || []}
      settings={(settings as { active_cycle?: string | null; weekend_cutoff?: string | null; midweek_cutoff?: string | null } | null) ?? null}
    />
  )
}
