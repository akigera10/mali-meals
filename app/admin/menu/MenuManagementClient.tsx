/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import AdminNav from '../components/AdminNav'

type MenuItem = {
  id: string
  name: string
  description: string | null
  category: string
  base_price: number
  meat_upgrade_price: number | null
  meat_upgrade_type: string | null
  is_active: boolean
  is_sold_out: boolean
  sort_order: number
  allergens: string[]
  is_freezer_friendly: boolean
  is_spicy: boolean
  is_family_friendly: boolean
  available_weekend: boolean
  available_midweek: boolean
}

type Addon = {
  id: string
  name: string
  price: number
  is_active: boolean
  is_sold_out: boolean
  sort_order: number
}

type Special = {
  id: string
  name: string
  description: string
  price: number
  is_active: boolean
  is_sold_out: boolean
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const ALLERGEN_OPTIONS = [
  { key: 'dairy', label: 'D' },
  { key: 'nuts', label: 'N' },
  { key: 'soy', label: 'S' },
  { key: 'coconut', label: 'C' },
]

const MEAT_OPTIONS = [
  { value: null as string | null, label: 'None' },
  { value: 'beef' as string | null, label: 'Beef' },
  { value: 'chicken' as string | null, label: 'Chicken' },
  { value: 'both' as string | null, label: 'Both' },
]

const FLAG_OPTIONS = [
  { key: 'is_freezer_friendly', emoji: '❄', title: 'Freezer-friendly' },
  { key: 'is_spicy', emoji: '🌶', title: 'Spicy' },
  { key: 'is_family_friendly', emoji: '👨‍👩‍👧', title: 'Family-friendly' },
]

function saveButtonStyle(saveState: SaveState): React.CSSProperties {
  return {
    padding: '8px 20px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor:
      saveState === 'saving' ? 'var(--surface-sunken)' :
      saveState === 'error'  ? 'var(--accent-terracotta)' :
      'var(--brand-gold)',
    color: saveState === 'saving' ? 'var(--text-tertiary)' : '#fff',
    fontSize: '14px',
    fontFamily: 'var(--font-inter)',
    cursor: saveState === 'saving' ? 'default' : 'pointer',
    whiteSpace: 'nowrap',
  }
}

function saveButtonLabel(saveState: SaveState) {
  if (saveState === 'saving') return 'Saving…'
  if (saveState === 'saved')  return 'Saved ✓'
  if (saveState === 'error')  return 'Error — try again'
  return 'Save'
}

function DishCard({
  dish,
  saveState,
  onUpdate,
  onToggleAllergen,
  onSave,
}: {
  dish: MenuItem
  saveState: SaveState
  onUpdate: (changes: Partial<MenuItem>) => void
  onToggleAllergen: (allergen: string) => void
  onSave: () => void
}) {
  return (
    <div style={{
      backgroundColor: 'var(--surface-raised)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '20px',
    }}>

      {/* Name */}
      <input
        type="text"
        value={dish.name}
        onChange={e => onUpdate({ name: e.target.value })}
        placeholder="Dish name"
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: '8px',
          border: '1px solid var(--border-strong)',
          backgroundColor: 'var(--surface-raised)',
          fontFamily: 'var(--font-fraunces)',
          fontSize: '17px',
          color: 'var(--text-primary)',
          outline: 'none',
          boxSizing: 'border-box',
          marginBottom: '10px',
        }}
      />

      {/* Description */}
      <textarea
        value={dish.description || ''}
        onChange={e => onUpdate({ description: e.target.value })}
        placeholder="Description"
        rows={3}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: '8px',
          border: '1px solid var(--border-strong)',
          backgroundColor: 'var(--surface-raised)',
          fontFamily: 'var(--font-inter)',
          fontSize: '14px',
          color: 'var(--text-secondary)',
          outline: 'none',
          resize: 'vertical',
          boxSizing: 'border-box',
          marginBottom: '16px',
          lineHeight: '1.5',
        }}
      />

      {/* Meat option */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>Meat option</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {MEAT_OPTIONS.map(option => {
            const isSelected = dish.meat_upgrade_type === option.value
            return (
              <button
                key={option.label}
                onClick={() => onUpdate({ meat_upgrade_type: option.value })}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: isSelected ? '1.5px solid var(--brand-gold)' : '1px solid var(--border-strong)',
                  backgroundColor: isSelected ? 'var(--brand-gold-soft)' : 'var(--surface-raised)',
                  color: isSelected ? 'var(--brand-gold-dark)' : 'var(--text-secondary)',
                  fontSize: '13px',
                  fontFamily: 'var(--font-inter)',
                  cursor: 'pointer',
                  fontWeight: isSelected ? '500' : '400',
                }}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Allergens + Flags */}
      <div style={{ display: 'flex', gap: '28px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>Allergens</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {ALLERGEN_OPTIONS.map(a => {
              const isActive = dish.allergens.includes(a.key)
              return (
                <button
                  key={a.key}
                  onClick={() => onToggleAllergen(a.key)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: isActive ? 'var(--accent-terracotta)' : 'var(--surface-sunken)',
                    color: isActive ? '#fff' : 'var(--text-tertiary)',
                    fontSize: '12px',
                    fontFamily: 'var(--font-inter)',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  {a.label}
                </button>
              )
            })}
          </div>
          <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
            D = Dairy · N = Nuts · S = Soy · C = Coconut
          </div>
        </div>

        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>Flags</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {FLAG_OPTIONS.map(flag => {
              const isActive = dish[flag.key as keyof MenuItem] as boolean
              return (
                <button
                  key={flag.key}
                  onClick={() => onUpdate({ [flag.key]: !isActive } as Partial<MenuItem>)}
                  title={flag.title}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: isActive ? 'var(--brand-gold)' : 'var(--surface-sunken)',
                    fontSize: '15px',
                    cursor: 'pointer',
                    lineHeight: '1',
                  }}
                >
                  {flag.emoji}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom row: show on menu + sold out + save */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '16px',
        borderTop: '1px solid var(--border)',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={dish.is_active}
              onChange={e => onUpdate({ is_active: e.target.checked })}
              style={{ cursor: 'pointer', width: '15px', height: '15px' }}
            />
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Show on menu</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={dish.is_sold_out}
              onChange={e => onUpdate({ is_sold_out: e.target.checked })}
              style={{ cursor: 'pointer', width: '15px', height: '15px' }}
            />
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Sold out</span>
          </label>
        </div>

        <button
          onClick={onSave}
          disabled={saveState === 'saving'}
          style={saveButtonStyle(saveState)}
        >
          {saveButtonLabel(saveState)}
        </button>
      </div>
    </div>
  )
}

function AddonRow({
  addon,
  saveState,
  isLast,
  onUpdate,
  onSave,
}: {
  addon: Addon
  saveState: SaveState
  isLast: boolean
  onUpdate: (changes: Partial<Addon>) => void
  onSave: () => void
}) {
  return (
    <div style={{
      padding: '14px 20px',
      borderBottom: isLast ? 'none' : '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      flexWrap: 'wrap',
    }}>
      <input
        type="text"
        value={addon.name}
        onChange={e => onUpdate({ name: e.target.value })}
        style={{
          flex: '1 1 180px',
          padding: '7px 10px',
          borderRadius: '6px',
          border: '1px solid var(--border-strong)',
          backgroundColor: 'var(--surface-raised)',
          fontFamily: 'var(--font-inter)',
          fontSize: '14px',
          color: 'var(--text-primary)',
          outline: 'none',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Ksh</span>
        <input
          type="number"
          value={addon.price}
          onChange={e => onUpdate({ price: Number(e.target.value) })}
          style={{
            width: '72px',
            padding: '7px 10px',
            borderRadius: '6px',
            border: '1px solid var(--border-strong)',
            backgroundColor: 'var(--surface-raised)',
            fontFamily: 'var(--font-inter)',
            fontSize: '14px',
            color: 'var(--text-primary)',
            outline: 'none',
            textAlign: 'right',
          }}
        />
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
        <input
          type="checkbox"
          checked={addon.is_active}
          onChange={e => onUpdate({ is_active: e.target.checked })}
          style={{ cursor: 'pointer' }}
        />
        Active
      </label>

      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
        <input
          type="checkbox"
          checked={addon.is_sold_out}
          onChange={e => onUpdate({ is_sold_out: e.target.checked })}
          style={{ cursor: 'pointer' }}
        />
        Sold out
      </label>

      <button
        onClick={onSave}
        disabled={saveState === 'saving'}
        style={{
          ...saveButtonStyle(saveState),
          padding: '7px 16px',
          fontSize: '13px',
          borderRadius: '6px',
        }}
      >
        {saveState === 'saving' ? 'Saving…' :
         saveState === 'saved'  ? 'Saved ✓' :
         saveState === 'error'  ? 'Error' :
         'Save'}
      </button>
    </div>
  )
}

function SpecialCard({
  special,
  saveState,
  onUpdate,
  onSave,
}: {
  special: Special
  saveState: SaveState
  onUpdate: (changes: Partial<Special>) => void
  onSave: () => void
}) {
  return (
    <div style={{
      backgroundColor: 'var(--surface-raised)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '20px',
    }}>
      <input
        type="text"
        value={special.name}
        onChange={e => onUpdate({ name: e.target.value })}
        placeholder="Special name"
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: '8px',
          border: '1px solid var(--border-strong)',
          backgroundColor: 'var(--surface-raised)',
          fontFamily: 'var(--font-fraunces)',
          fontSize: '17px',
          color: 'var(--text-primary)',
          outline: 'none',
          boxSizing: 'border-box',
          marginBottom: '10px',
        }}
      />

      <textarea
        value={special.description}
        onChange={e => onUpdate({ description: e.target.value })}
        placeholder="Description"
        rows={3}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: '8px',
          border: '1px solid var(--border-strong)',
          backgroundColor: 'var(--surface-raised)',
          fontFamily: 'var(--font-inter)',
          fontSize: '14px',
          color: 'var(--text-secondary)',
          outline: 'none',
          resize: 'vertical',
          boxSizing: 'border-box',
          marginBottom: '14px',
          lineHeight: '1.5',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', flexShrink: 0 }}>Price (Ksh)</span>
        <input
          type="number"
          value={special.price}
          onChange={e => onUpdate({ price: Number(e.target.value) })}
          style={{
            width: '110px',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid var(--border-strong)',
            backgroundColor: 'var(--surface-raised)',
            fontFamily: 'var(--font-fraunces)',
            fontSize: '15px',
            color: 'var(--text-primary)',
            outline: 'none',
            textAlign: 'right',
          }}
        />
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        paddingTop: '16px',
        borderTop: '1px solid var(--border)',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={special.is_active}
              onChange={e => onUpdate({ is_active: e.target.checked })}
              style={{ cursor: 'pointer', width: '15px', height: '15px' }}
            />
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Show on menu</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={special.is_sold_out}
              onChange={e => onUpdate({ is_sold_out: e.target.checked })}
              style={{ cursor: 'pointer', width: '15px', height: '15px' }}
            />
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Sold out</span>
          </label>
        </div>
        <button
          onClick={onSave}
          disabled={saveState === 'saving'}
          style={saveButtonStyle(saveState)}
        >
          {saveButtonLabel(saveState)}
        </button>
      </div>
    </div>
  )
}

function CategoryLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--font-fraunces)',
      fontSize: '16px',
      color: 'var(--text-primary)',
      marginBottom: '16px',
      paddingBottom: '10px',
      borderBottom: '1px solid var(--border)',
    }}>
      {children}
    </div>
  )
}

export default function MenuManagementClient({
  initialMenuItems,
  initialAddons,
  initialSpecials,
  activeCycle,
}: {
  initialMenuItems: MenuItem[]
  initialAddons: Addon[]
  initialSpecials: Special[]
  activeCycle: string | null
}) {
  const [dishes, setDishes] = useState<MenuItem[]>(initialMenuItems)
  const [addons, setAddons] = useState<Addon[]>(initialAddons)
  const [specials, setSpecials] = useState<Special[]>(initialSpecials)
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({})

  function updateDish(id: string, changes: Partial<MenuItem>) {
    setDishes(prev => prev.map(d => d.id === id ? { ...d, ...changes } : d))
  }

  function toggleAllergen(id: string, allergen: string) {
    const dish = dishes.find(d => d.id === id)!
    const next = dish.allergens.includes(allergen)
      ? dish.allergens.filter(a => a !== allergen)
      : [...dish.allergens, allergen]
    updateDish(id, { allergens: next })
  }

  function updateAddon(id: string, changes: Partial<Addon>) {
    setAddons(prev => prev.map(a => a.id === id ? { ...a, ...changes } : a))
  }

  function updateSpecial(id: string, changes: Partial<Special>) {
    setSpecials(prev => prev.map(s => s.id === id ? { ...s, ...changes } : s))
  }

  function setSave(id: string, state: SaveState) {
    setSaveStates(s => ({ ...s, [id]: state }))
  }

  async function saveDish(id: string) {
    setSave(id, 'saving')
    const dish = dishes.find(d => d.id === id)!
    const { error } = await (supabase.from('menu_items') as any).update({
      name: dish.name,
      description: dish.description,
      meat_upgrade_type: dish.meat_upgrade_type,
      meat_upgrade_price: dish.meat_upgrade_type ? 300 : null,
      allergens: dish.allergens,
      is_freezer_friendly: dish.is_freezer_friendly,
      is_spicy: dish.is_spicy,
      is_family_friendly: dish.is_family_friendly,
      is_active: dish.is_active,
      is_sold_out: dish.is_sold_out,
      available_weekend: dish.available_weekend,
      available_midweek: dish.available_midweek,
    }).eq('id', id)

    if (error) {
      setSave(id, 'error')
    } else {
      setSave(id, 'saved')
      setTimeout(() => setSave(id, 'idle'), 2000)
    }
  }

  async function addSpecial() {
    const { data, error } = await (supabase.from('specials') as any).insert({
      name: '', description: '', price: 0, is_active: false, is_sold_out: false,
    }).select().single()
    if (!error && data) {
      setSpecials(prev => [...prev, data as Special])
    }
  }

  async function saveSpecial(id: string) {
    setSave(id, 'saving')
    const special = specials.find(s => s.id === id)!
    const { error } = await (supabase.from('specials') as any).update({
      name: special.name,
      description: special.description,
      price: special.price,
      is_active: special.is_active,
      is_sold_out: special.is_sold_out,
    }).eq('id', id)

    if (error) {
      setSave(id, 'error')
    } else {
      setSave(id, 'saved')
      setTimeout(() => setSave(id, 'idle'), 2000)
    }
  }

  async function saveAddon(id: string) {
    setSave(id, 'saving')
    const addon = addons.find(a => a.id === id)!
    const { error } = await (supabase.from('protein_addons') as any).update({
      name: addon.name,
      price: addon.price,
      is_active: addon.is_active,
      is_sold_out: addon.is_sold_out,
    }).eq('id', id)

    if (error) {
      setSave(id, 'error')
    } else {
      setSave(id, 'saved')
      setTimeout(() => setSave(id, 'idle'), 2000)
    }
  }

  const weekendMains = dishes
    .filter(d => d.available_weekend && d.category === 'mains')
    .sort((a, b) => a.sort_order - b.sort_order)

  const weekendSalads = dishes
    .filter(d => d.available_weekend && d.category === 'salads')
    .sort((a, b) => a.sort_order - b.sort_order)

  const midweekMains = dishes
    .filter(d => d.available_midweek && d.category === 'mains')
    .sort((a, b) => a.sort_order - b.sort_order)

  const midweekSalads = dishes
    .filter(d => d.available_midweek && d.category === 'salads')
    .sort((a, b) => a.sort_order - b.sort_order)

  function renderDishList(list: MenuItem[]) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {list.map(dish => (
          <DishCard
            key={dish.id}
            dish={dish}
            saveState={saveStates[dish.id] || 'idle'}
            onUpdate={changes => updateDish(dish.id, changes)}
            onToggleAllergen={allergen => toggleAllergen(dish.id, allergen)}
            onSave={() => saveDish(dish.id)}
          />
        ))}
      </div>
    )
  }

  const [activeTab, setActiveTab] = useState<'weekend' | 'midweek' | 'addons'>('weekend')

  function renderSpecials() {
    if (specials.length === 0) {
      return (
        <div>
          <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
            No special yet.
          </p>
          <button
            onClick={addSpecial}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: '1px solid var(--border-strong)',
              backgroundColor: 'var(--surface-raised)',
              color: 'var(--text-secondary)',
              fontSize: '14px',
              fontFamily: 'var(--font-inter)',
              cursor: 'pointer',
            }}
          >
            + Add special
          </button>
        </div>
      )
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {specials.map(special => (
          <SpecialCard
            key={special.id}
            special={special}
            saveState={saveStates[special.id] || 'idle'}
            onUpdate={changes => updateSpecial(special.id, changes)}
            onSave={() => saveSpecial(special.id)}
          />
        ))}
      </div>
    )
  }

  const TABS = [
    { key: 'weekend', label: 'Weekend Menu',    dot: activeCycle === 'weekend' },
    { key: 'midweek', label: 'Midweek Menu',    dot: activeCycle === 'midweek' },
    { key: 'addons',  label: 'Protein Add-ons', dot: false },
  ] as const

  const cycleStatusText = activeCycle === 'weekend'
    ? '● Weekend menu is live · customers are ordering now'
    : activeCycle === 'midweek'
    ? '● Midweek menu is live · customers are ordering now'
    : '● No active cycle set · go to Settings to activate ordering'

  const cycleStatusColor = activeCycle ? 'var(--accent-forest)' : 'var(--accent-terracotta)'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--surface-base)', fontFamily: 'var(--font-inter)' }}>
      <AdminNav />

      {/* Page header */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 20px 28px' }}>
        <h1 style={{
          fontFamily: 'var(--font-fraunces)',
          fontSize: '28px',
          color: 'var(--text-primary)',
          marginBottom: '8px',
        }}>
          Menu
        </h1>
        <p style={{ fontSize: '13px', color: cycleStatusColor, margin: '0 0 4px', fontWeight: '500' }}>
          {cycleStatusText}
        </p>
        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', margin: 0 }}>
          Each dish saves independently.
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 20px', display: 'flex', gap: '0' }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '12px 20px',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--brand-gold)' : '2px solid transparent',
                  backgroundColor: 'transparent',
                  fontFamily: 'var(--font-inter)',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  cursor: 'pointer',
                  marginBottom: '-1px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {tab.label}
                {tab.dot && (
                  <span style={{ fontSize: '8px', color: 'var(--accent-forest)', lineHeight: '1' }}>●</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 20px 56px' }}>

        {/* Weekend Menu tab */}
        {activeTab === 'weekend' && (
          <div>
            <div style={{ marginBottom: '40px' }}>
              <CategoryLabel>Mains · 995 · with meat 1,295</CategoryLabel>
              {renderDishList(weekendMains)}
            </div>
            <div style={{ marginBottom: '40px' }}>
              <CategoryLabel>Salads · 580 · with meat 880</CategoryLabel>
              {renderDishList(weekendSalads)}
            </div>
            <div>
              <CategoryLabel>Chef&apos;s Special · Shows on menu when active</CategoryLabel>
              {renderSpecials()}
            </div>
          </div>
        )}

        {/* Midweek Menu tab */}
        {activeTab === 'midweek' && (
          <div>
            <div style={{ marginBottom: '40px' }}>
              <CategoryLabel>Mains · 995 · with meat 1,295</CategoryLabel>
              {renderDishList(midweekMains)}
            </div>
            <div style={{ marginBottom: '40px' }}>
              <CategoryLabel>Salads · 580 · with meat 880</CategoryLabel>
              {renderDishList(midweekSalads)}
            </div>
            <div>
              <CategoryLabel>Chef&apos;s Special · Shows on menu when active</CategoryLabel>
              {renderSpecials()}
            </div>
          </div>
        )}

        {/* Protein Add-ons tab */}
        {activeTab === 'addons' && (
          <div>
            <div style={{
              backgroundColor: 'var(--surface-raised)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}>
              {addons.map((addon, i) => (
                <AddonRow
                  key={addon.id}
                  addon={addon}
                  saveState={saveStates[addon.id] || 'idle'}
                  isLast={i === addons.length - 1}
                  onUpdate={changes => updateAddon(addon.id, changes)}
                  onSave={() => saveAddon(addon.id)}
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
