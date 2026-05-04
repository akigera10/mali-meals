/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from '@/lib/supabase'
import AdminNav from '../components/AdminNav'
import SettingsClient from './SettingsClient'

export const revalidate = 0

export default async function SettingsPage() {
  const db = createAdminClient()
  const { data } = await (db.from('settings') as any).select('*').maybeSingle()

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--surface-base)' }}>
      <AdminNav />
      <SettingsClient initialSettings={data} />
    </div>
  )
}
