'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [moreOpen, setMoreOpen] = useState(false)

  const dailyLinks = [
    { href: '/admin', label: 'Orders' },
    { href: '/admin/kitchen', label: 'Kitchen' },
    { href: '/admin/payments', label: 'Payments' },
    { href: '/admin/deliveries', label: 'Deliveries' },
  ]

  const configLinks = [
    { href: '/admin/reports', label: 'Reports' },
    { href: '/admin/menu', label: 'Menu' },
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
        [data-admin-desktop-nav] { display: flex; }
        [data-admin-mobile-nav] { display: none; }
        [data-admin-mobile-more] { display: none; }
        @media (min-width: 769px) {
          [data-admin-desktop-nav] {
            float: left;
          }
          [data-admin-desktop-nav] ~ * {
            margin-left: 200px !important;
          }
        }
        @media (max-width: 768px) {
          [data-admin-desktop-nav] { display: none !important; }
          [data-admin-mobile-nav] { display: block; }
          [data-admin-mobile-more][data-open="true"] { display: block; }
          body { padding-bottom: 82px; }
        }
      ` }} />

      <nav data-admin-desktop-nav style={{
        width: '200px',
        minWidth: '200px',
        background: 'var(--surface-raised)',
        borderRight: '1px solid var(--border)',
        flexDirection: 'column',
        padding: '24px 0',
        position: 'sticky',
        top: 0,
        height: '100vh',
        boxSizing: 'border-box',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
        }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 400,
            color: 'var(--text-primary)',
            padding: '0 20px 32px 20px',
          }}>
            Mali&apos;s Meals
          </span>
          {dailyLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: 'block',
                padding: isActive(link.href) ? '9px 20px 9px 18px' : '9px 20px',
                fontFamily: 'var(--font-ui), sans-serif',
                fontSize: 14,
                fontWeight: isActive(link.href) ? 600 : 400,
                color: isActive(link.href) ? 'var(--accent-forest)' : 'var(--text-secondary)',
                textDecoration: 'none',
                borderRadius: 0,
                background: isActive(link.href) ? 'var(--brand-green-soft)' : 'transparent',
                borderLeft: isActive(link.href) ? '2px solid var(--accent-forest)' : '2px solid transparent',
              }}
            >
              {link.label}
            </Link>
          ))}
          <div style={{ flex: 1 }} />
          {configLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: 'block',
                padding: isActive(link.href) ? '9px 20px 9px 18px' : '9px 20px',
                fontFamily: 'var(--font-ui), sans-serif',
                fontSize: 14,
                fontWeight: isActive(link.href) ? 600 : 400,
                color: isActive(link.href) ? 'var(--accent-forest)' : 'var(--text-secondary)',
                textDecoration: 'none',
                borderRadius: 0,
                background: isActive(link.href) ? 'var(--brand-green-soft)' : 'transparent',
                borderLeft: isActive(link.href) ? '2px solid var(--accent-forest)' : '2px solid transparent',
              }}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={handleSignOut}
            style={{
              padding: '20px 20px 0 20px',
              fontFamily: 'var(--font-ui), sans-serif',
              fontSize: 13,
              color: 'var(--text-tertiary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
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
              color: isActive(link.href) ? 'var(--accent-forest)' : 'var(--text-primary)',
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
                color: isActive(link.href) ? 'var(--accent-forest)' : 'var(--text-secondary)',
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
              color: moreOpen || moreIsActive ? 'var(--accent-forest)' : 'var(--text-secondary)',
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
