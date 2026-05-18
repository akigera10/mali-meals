/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerClient } from '@/lib/supabase'
import MenuClient from './components/MenuClient'

export const revalidate = 0

export default async function HomePage() {
  const supabase = createServerClient()

  const [menuResult, addonsResult, specialsResult, settingsResult] = await Promise.all([
    supabase
      .from('menu_items')
      .select('id, name, description, category, base_price, meat_upgrade_price, meat_upgrade_type, is_sold_out, is_spicy, is_freezer_friendly, allergens, is_family_friendly, available_weekend, available_midweek')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('protein_addons')
      .select('id, name, price, is_sold_out')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('specials')
      .select('id, name, description, price, is_active, is_sold_out')
      .eq('is_active', true)
      .eq('is_sold_out', false)
      .order('created_at'),
    (supabase.from('settings') as any)
      .select('active_cycle, weekend_cutoff, midweek_cutoff, next_sunday_date, next_monday_date, next_wednesday_date, whatsapp_group_link')
      .maybeSingle(),
  ])

  const settings = settingsResult.data
  const activeCycle: string = settings?.active_cycle ?? 'weekend'
  const nextSundayDate: string | null = settings?.next_sunday_date ?? null
  const nextMondayDate: string | null = settings?.next_monday_date ?? null
  const nextWednesdayDate: string | null = settings?.next_wednesday_date ?? null
  const whatsappLink: string | null = settings?.whatsapp_group_link ?? null

  // Check if past cutoff for the active cycle
  const now = new Date()
  const cutoffStr: string | null = activeCycle === 'midweek' ? settings?.midweek_cutoff : settings?.weekend_cutoff
  const isClosed = cutoffStr ? now > new Date(cutoffStr) : false

  // Filter menu items by active cycle availability
  const allItems = (menuResult.data ?? []) as any[]
  const filteredItems = allItems.filter((item: any) =>
    activeCycle === 'midweek' ? item.available_midweek !== false : item.available_weekend !== false
  )

  if (isClosed) {
    const cycleLabel = activeCycle === 'midweek' ? 'midweek' : 'weekend'
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '80px 20px', textAlign: 'center', fontFamily: 'var(--font-ui), sans-serif' }}>
        <h1 style={{
          fontFamily: 'var(--font-instrument-serif), serif',
          fontSize: 'clamp(36px, 8vw, 52px)',
          fontWeight: 400,
          color: 'var(--text-primary)',
          margin: '0 0 20px',
          lineHeight: 1.1,
        }}>
          Mali&apos;s Meals
        </h1>
        <p style={{ fontSize: 17, color: 'var(--text-primary)', margin: '0 0 10px', fontWeight: 500 }}>
          Orders for this {cycleLabel} are now closed.
        </p>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 36px', lineHeight: 1.6 }}>
          Join our WhatsApp group to hear about the next menu and be first to order.
        </p>
        {whatsappLink && (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              padding: '14px 32px',
              borderRadius: '8px',
              backgroundColor: '#25D366',
              color: '#fff',
              fontFamily: 'var(--font-ui), sans-serif',
              fontSize: 15,
              fontWeight: 600,
              textDecoration: 'none',
              letterSpacing: '0.01em',
            }}
          >
            Join WhatsApp group →
          </a>
        )}
      </div>
    )
  }

  return (
    <MenuClient
      menuItems={filteredItems}
      addons={addonsResult.data ?? []}
      specials={specialsResult.data ?? []}
      activeCycle={activeCycle}
      nextSundayDate={nextSundayDate}
      nextMondayDate={nextMondayDate}
      nextWednesdayDate={nextWednesdayDate}
    />
  )
}
