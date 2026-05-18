'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [moreOpen, setMoreOpen] = useState(false)

  const links = [
    { href: '/admin', label: 'Orders' },
    { href: '/admin/menu', label: 'Menu' },
    { href: '/admin/kitchen', label: 'Kitchen' },
    { href: '/admin/deliveries', label: 'Deliveries' },
    { href: '/admin/payments', label: 'Payments' },
    { href: '/admin/reports', label: 'Reports' },
    { href: '/admin/settings', label: 'Settings' },
  ]

  const mobileLinks = [
    { href: '/admin', label: 'Orders' },
    { href: '/admin/kitchen', label: 'Kitchen' },
    { href: '/admin/deliveries', label: 'Deliveries' },
    { href: '/admin/payments', label: 'Payments' },
  ]

  const moreLinks = [
    { href: '/admin/menu', label: 'Menu' },
    { href: '/admin/reports', label: 'Reports' },
    { href: '/admin/settings', label: 'Settings' },
  ]

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin' || pathname.startsWith('/admin/orders')
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const moreIsActive = moreLinks.some(link => isActive(link.href))

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        [data-admin-mobile-nav] { display: none; }
        [data-admin-mobile-more] { display: none; }
        @media (max-width: 720px) {
          [data-admin-desktop-nav] { display: none !important; }
          [data-admin-mobile-nav] { display: block; }
          [data-admin-mobile-more][data-open="true"] { display: block; }
          body { padding-bottom: 82px; }
        }
      ` }} />

      <nav data-admin-desktop-nav style={{
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
            fontFamily: 'var(--font-instrument-serif)',
            fontSize: '16px',
            color: 'var(--text-primary)',
            marginRight: '32px',
            flexShrink: 0,
          }}>
            Mali&apos;s Meals
          </span>
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                padding: '0 16px',
                height: '52px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '14px',
                fontFamily: 'var(--font-ui)',
                color: isActive(link.href) ? 'var(--brand-green)' : 'var(--text-secondary)',
                borderBottom: isActive(link.href) ? '2px solid var(--brand-green)' : '2px solid transparent',
                textDecoration: 'none',
                fontWeight: isActive(link.href) ? '500' : '400',
              }}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={handleSignOut}
            style={{
              marginLeft: 'auto',
              padding: '0 8px',
              height: '52px',
              display: 'flex',
              alignItems: 'center',
              fontSize: '13px',
              fontFamily: 'var(--font-ui)',
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

      <div
        data-admin-mobile-more
        data-open={moreOpen ? 'true' : 'false'}
        style={{
          position: 'fixed',
          left: '12px',
          right: '12px',
          bottom: '74px',
          zIndex: 40,
          backgroundColor: 'var(--surface-raised)',
          border: '1px solid var(--border-strong)',
          borderRadius: '8px',
          padding: '8px',
        }}
      >
        {moreLinks.map(link => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setMoreOpen(false)}
            style={{
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              padding: '0 12px',
              borderRadius: '6px',
              fontSize: '15px',
              fontFamily: 'var(--font-ui)',
              color: isActive(link.href) ? 'var(--brand-green)' : 'var(--text-primary)',
              backgroundColor: isActive(link.href) ? 'var(--brand-green-soft)' : 'transparent',
              textDecoration: 'none',
              fontWeight: isActive(link.href) ? '600' : '500',
            }}
          >
            {link.label}
          </Link>
        ))}
        <button
          onClick={handleSignOut}
          style={{
            minHeight: '44px',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            borderRadius: '6px',
            fontSize: '15px',
            fontFamily: 'var(--font-ui)',
            color: 'var(--accent-terracotta)',
            backgroundColor: 'transparent',
            border: 'none',
            textAlign: 'left',
            cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </div>

      <nav data-admin-mobile-nav style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        backgroundColor: 'var(--surface-raised)',
        borderTop: '1px solid var(--border-strong)',
        padding: '6px 8px calc(6px + env(safe-area-inset-bottom))',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
          {mobileLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMoreOpen(false)}
              style={{
                minHeight: '50px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'var(--font-ui)',
                color: isActive(link.href) ? 'var(--brand-green)' : 'var(--text-secondary)',
                backgroundColor: isActive(link.href) ? 'var(--brand-green-soft)' : 'transparent',
                textDecoration: 'none',
                fontWeight: isActive(link.href) ? '700' : '500',
              }}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={() => setMoreOpen(open => !open)}
            aria-expanded={moreOpen}
            style={{
              minHeight: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              fontSize: '12px',
              fontFamily: 'var(--font-ui)',
              color: moreOpen || moreIsActive ? 'var(--brand-green)' : 'var(--text-secondary)',
              backgroundColor: moreOpen || moreIsActive ? 'var(--brand-green-soft)' : 'transparent',
              border: 'none',
              fontWeight: moreOpen || moreIsActive ? '700' : '500',
              cursor: 'pointer',
            }}
          >
            More
          </button>
        </div>
      </nav>
    </>
  )
}
