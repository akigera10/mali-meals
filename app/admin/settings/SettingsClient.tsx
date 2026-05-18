'use client'
import { useState } from 'react'

type Settings = {
  id?: string
  active_cycle?: string | null
  weekend_cutoff?: string | null
  midweek_cutoff?: string | null
  next_sunday_date?: string | null
  next_monday_date?: string | null
  next_wednesday_date?: string | null
  whatsapp_group_link?: string | null
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

// Convert UTC ISO timestamp to EAT local string for datetime-local input
function isoToEatLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const eatMs = d.getTime() + 3 * 60 * 60 * 1000
  return new Date(eatMs).toISOString().slice(0, 16)
}

// Convert datetime-local string (treated as EAT, UTC+3) to UTC ISO
function eatLocalToIso(local: string): string | null {
  if (!local) return null
  return new Date(local + ':00+03:00').toISOString()
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid var(--border-strong)',
  backgroundColor: 'var(--surface-raised)',
  fontFamily: 'var(--font-ui)',
  fontSize: '14px',
  color: 'var(--text-primary)',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--text-secondary)',
  display: 'block',
  marginBottom: '6px',
}

function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={labelStyle}>{label}</label>
      {hint && (
        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '0 0 6px', fontStyle: 'italic' }}>
          {hint}
        </p>
      )}
      {children}
    </div>
  )
}

export default function SettingsClient({ initialSettings }: { initialSettings: Settings | null }) {
  const [activeCycle, setActiveCycle] = useState<string>(initialSettings?.active_cycle ?? 'weekend')
  const [weekendCutoff, setWeekendCutoff] = useState(isoToEatLocal(initialSettings?.weekend_cutoff))
  const [midweekCutoff, setMidweekCutoff] = useState(isoToEatLocal(initialSettings?.midweek_cutoff))
  const [nextSundayDate, setNextSundayDate] = useState(initialSettings?.next_sunday_date ?? '')
  const [nextMondayDate, setNextMondayDate] = useState(initialSettings?.next_monday_date ?? '')
  const [nextWednesdayDate, setNextWednesdayDate] = useState(initialSettings?.next_wednesday_date ?? '')
  const [whatsappLink, setWhatsappLink] = useState(
    initialSettings?.whatsapp_group_link ?? 'https://chat.whatsapp.com/H9LnTAtoJ0w9uJAeNmQ0i7?mode=gi_t'
  )
  const [saveState, setSaveState] = useState<SaveState>('idle')

  async function handleSave() {
    setSaveState('saving')
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        active_cycle: activeCycle,
        weekend_cutoff: eatLocalToIso(weekendCutoff),
        midweek_cutoff: eatLocalToIso(midweekCutoff),
        next_sunday_date: nextSundayDate || null,
        next_monday_date: nextMondayDate || null,
        next_wednesday_date: nextWednesdayDate || null,
        whatsapp_group_link: whatsappLink || null,
      }),
    })
    if (res.ok) {
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2500)
    } else {
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 3000)
    }
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 20px', fontFamily: 'var(--font-ui)' }}>
      <h1 style={{ fontFamily: 'var(--font-instrument-serif)', fontSize: '28px', color: 'var(--text-primary)', marginBottom: '4px' }}>
        Settings
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginBottom: '40px' }}>
        Configure the active cycle, order cutoffs, and delivery dates.
      </p>

      {/* Active cycle */}
      <FieldGroup label="Active cycle" hint="Determines which menu items are shown and which cutoff applies.">
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['weekend', 'midweek'] as const).map(cycle => {
            const active = activeCycle === cycle
            return (
              <button
                key={cycle}
                onClick={() => setActiveCycle(cycle)}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: `1.5px solid ${active ? 'var(--brand-green)' : 'var(--border-strong)'}`,
                  backgroundColor: active ? 'var(--brand-green-soft)' : 'var(--surface-raised)',
                  color: active ? 'var(--brand-green-hover)' : 'var(--text-secondary)',
                  fontSize: '14px',
                  fontFamily: 'var(--font-ui)',
                  fontWeight: active ? '600' : '400',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {cycle}
              </button>
            )
          })}
        </div>
      </FieldGroup>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border)', margin: '28px 0' }} />

      {/* Weekend cycle settings */}
      <h2 style={{ fontFamily: 'var(--font-instrument-serif)', fontSize: '18px', color: 'var(--text-primary)', margin: '0 0 20px' }}>
        Weekend cycle
      </h2>

      <FieldGroup label="Order cutoff (EAT, UTC+3)" hint="Typically Friday 2:00pm. After this time, menu shows as closed.">
        <input
          type="datetime-local"
          value={weekendCutoff}
          onChange={e => setWeekendCutoff(e.target.value)}
          style={inputStyle}
        />
      </FieldGroup>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <div>
          <label style={labelStyle}>Sunday delivery date</label>
          <input
            type="date"
            value={nextSundayDate}
            onChange={e => setNextSundayDate(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Monday delivery date</label>
          <input
            type="date"
            value={nextMondayDate}
            onChange={e => setNextMondayDate(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border)', margin: '28px 0' }} />

      {/* Midweek cycle settings */}
      <h2 style={{ fontFamily: 'var(--font-instrument-serif)', fontSize: '18px', color: 'var(--text-primary)', margin: '0 0 20px' }}>
        Midweek cycle
      </h2>

      <FieldGroup label="Order cutoff (EAT, UTC+3)" hint="Typically Tuesday 2:00pm.">
        <input
          type="datetime-local"
          value={midweekCutoff}
          onChange={e => setMidweekCutoff(e.target.value)}
          style={inputStyle}
        />
      </FieldGroup>

      <FieldGroup label="Wednesday delivery date">
        <input
          type="date"
          value={nextWednesdayDate}
          onChange={e => setNextWednesdayDate(e.target.value)}
          style={{ ...inputStyle, width: 'calc(50% - 8px)' }}
        />
      </FieldGroup>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border)', margin: '28px 0' }} />

      {/* WhatsApp */}
      <FieldGroup label="WhatsApp group link" hint="Shown to customers when orders are closed.">
        <input
          type="url"
          value={whatsappLink}
          onChange={e => setWhatsappLink(e.target.value)}
          placeholder="https://chat.whatsapp.com/..."
          style={inputStyle}
        />
      </FieldGroup>

      {/* Save button */}
      <div style={{ marginTop: '32px' }}>
        <button
          onClick={handleSave}
          disabled={saveState === 'saving'}
          style={{
            padding: '12px 32px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor:
              saveState === 'error' ? 'var(--accent-terracotta)' :
              saveState === 'saved' ? 'var(--accent-forest)' :
              saveState === 'saving' ? 'var(--surface-sunken)' :
              'var(--brand-green)',
            color: saveState === 'saving' ? 'var(--text-tertiary)' : '#fff',
            fontSize: '15px',
            fontFamily: 'var(--font-ui)',
            fontWeight: '500',
            cursor: saveState === 'saving' ? 'default' : 'pointer',
          }}
        >
          {saveState === 'saving' ? 'Saving…' :
           saveState === 'saved'  ? 'Saved ✓' :
           saveState === 'error'  ? 'Error — try again' :
           'Save settings'}
        </button>
      </div>
    </div>
  )
}
