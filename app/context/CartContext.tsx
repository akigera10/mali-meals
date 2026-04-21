'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

export type CartEntry = {
  id: string
  name: string
  variant: 'vegetarian' | 'meat' | 'addon'
  unitPrice: number
  quantity: number
}

type CartContextValue = {
  cart: CartEntry[]
  adjust: (entry: Omit<CartEntry, 'quantity'>, delta: number) => void
  getQty: (key: string) => number
  clearCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartEntry[]>([])

  function getQty(key: string): number {
    return cart.find(e => e.id === key)?.quantity ?? 0
  }

  function adjust(entry: Omit<CartEntry, 'quantity'>, delta: number) {
    setCart(prev => {
      const existing = prev.find(e => e.id === entry.id)
      if (!existing) {
        if (delta <= 0) return prev
        return [...prev, { ...entry, quantity: 1 }]
      }
      const next = existing.quantity + delta
      if (next <= 0) return prev.filter(e => e.id !== entry.id)
      return prev.map(e => e.id === entry.id ? { ...e, quantity: next } : e)
    })
  }

  function clearCart() {
    setCart([])
  }

  return (
    <CartContext.Provider value={{ cart, adjust, getQty, clearCart }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
