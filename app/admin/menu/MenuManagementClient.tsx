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
  index,
  saveState,
  onUpdate,
  onToggleAllergen,
  onSave,
}: {
  dish: MenuItem
  index: number
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
      <div style={{
        fontSize: '11px',
        fontFamily: 'var(--font-inter)',
        color: 'var(--text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        marginBottom: '12px',
      }}>
        #{index + 1}
      </div>

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

      {/* Bottom row: sold out + save */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '16px',
        borderTop: '1px solid var(--border)',
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={dish.is_sold_out}
            onChange={e => onUpdate({ is_sold_out: e.target.checked })}
            style={{ cursor: 'pointer', width: '15px', height: '15px' }}
          />
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Sold out</span>
        </label>

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

export default function MenuManagementClient({
  initialMenuItems,
  initialAddons,
  initialSpecials,
}: {
  initialMenuItems: MenuItem[]
  initialAddons: Addon[]
  initialSpecials: Special[]
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
      is_sold_out: dish.is_sold_out,
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

  const mains = dishes
    .filter(d => d.category === 'mains')
    .sort((a, b) => a.sort_order - b.sort_order)

  const salads = dishes
    .filter(d => d.category === 'salads')
    .sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--surface-base)', fontFamily: 'var(--font-inter)' }}>
      <AdminNav />

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 20px' }}>
        <h1 style={{
          fontFamily: 'var(--font-fraunces)',
          fontSize: '28px',
          color: 'var(--text-primary)',
          marginBottom: '4px',
        }}>
          Menu
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginBottom: '40px' }}>
          Update dish details for this week. Each dish saves independently.
        </p>

        {/* Mains */}
        <section style={{ marginBottom: '52px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '20px' }}>
            <h2 style={{
              fontFamily: 'var(--font-fraunces)',
              fontSize: '20px',
              color: 'var(--text-primary)',
              margin: 0,
            }}>
              Mains
            </h2>
            <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
              Ksh 995 · with meat Ksh 1,295
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {mains.map((dish, i) => (
              <DishCard
                key={dish.id}
                dish={dish}
                index={i}
                saveState={saveStates[dish.id] || 'idle'}
                onUpdate={changes => updateDish(dish.id, changes)}
                onToggleAllergen={allergen => toggleAllergen(dish.id, allergen)}
                onSave={() => saveDish(dish.id)}
              />
            ))}
          </div>
        </section>

        {/* Salads */}
        <section style={{ marginBottom: '52px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '20px' }}>
            <h2 style={{
              fontFamily: 'var(--font-fraunces)',
              fontSize: '20px',
              color: 'var(--text-primary)',
              margin: 0,
            }}>
              Salads
            </h2>
            <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
              Ksh 580 · with meat Ksh 880
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {salads.map((dish, i) => (
              <DishCard
                key={dish.id}
                dish={dish}
                index={i}
                saveState={saveStates[dish.id] || 'idle'}
                onUpdate={changes => updateDish(dish.id, changes)}
                onToggleAllergen={allergen => toggleAllergen(dish.id, allergen)}
                onSave={() => saveDish(dish.id)}
              />
            ))}
          </div>
        </section>

        {/* Protein add-ons */}
        <section style={{ marginBottom: '52px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{
              fontFamily: 'var(--font-fraunces)',
              fontSize: '20px',
              color: 'var(--text-primary)',
              margin: 0,
            }}>
              Protein add-ons
            </h2>
          </div>
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
        </section>

        {/* Chef's special */}
        <section>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '20px' }}>
            <h2 style={{
              fontFamily: 'var(--font-fraunces)',
              fontSize: '20px',
              color: 'var(--text-primary)',
              margin: 0,
            }}>
              Chef&apos;s special
            </h2>
            <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
              Shows on menu when active
            </span>
          </div>
          {specials.length === 0 ? (
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
          ) : (
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
          )}
        </section>
      </div>
    </div>
  )
}
