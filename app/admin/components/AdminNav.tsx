'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()

  const links = [
    { href: '/admin', label: 'Orders' },
    { href: '/admin/menu', label: 'Menu' },
    { href: '/admin/kitchen', label: 'Kitchen' },
    { href: '/admin/deliveries', label: 'Deliveries' },
    { href: '/admin/payments', label: 'Payments' },
    { href: '/admin/reports', label: 'Reports' },
    { href: '/admin/settings', label: 'Settings' },
  ]

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  return (
    <nav style={{
      borderBottom: '1px solid var(--border)',
      backgroundColor: 'var(--surface-raised)',
      padding: '0 20px',
    }}>
      <div style={{
        maxWidth: '960px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        height: '52px',
      }}>
        <span style={{
          fontFamily: 'var(--font-fraunces)',
          fontSize: '16px',
          color: 'var(--text-primary)',
          marginRight: '32px',
          flexShrink: 0,
        }}>
          Mali&apos;s Meals
        </span>
        {links.map(link => {
          const isActive = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                padding: '0 16px',
                height: '52px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '14px',
                fontFamily: 'var(--font-inter)',
                color: isActive ? 'var(--brand-gold)' : 'var(--text-secondary)',
                borderBottom: isActive ? '2px solid var(--brand-gold)' : '2px solid transparent',
                textDecoration: 'none',
                fontWeight: isActive ? '500' : '400',
              }}
            >
              {link.label}
            </Link>
          )
        })}
        <button
          onClick={handleSignOut}
          style={{
            marginLeft: 'auto',
            padding: '0 8px',
            height: '52px',
            display: 'flex',
            alignItems: 'center',
            fontSize: '13px',
            fontFamily: 'var(--font-inter)',
            color: 'var(--text-tertiary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
