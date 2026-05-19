'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [moreOpen, setMoreOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    setCollapsed(localStorage.getItem('adminSidebarCollapsed') === 'true')
  }, [])

  function toggleCollapsed() {
    setCollapsed(value => {
      const next = !value
      localStorage.setItem('adminSidebarCollapsed', String(next))
      return next
    })
  }

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
        [data-admin-desktop-nav], [data-admin-desktop-nav] ~ * { transition: width 200ms ease, margin-left 200ms ease; }
        [data-admin-nav-link]:hover { color: var(--text-secondary) !important; background: var(--surface-sunken) !important; }
        [data-admin-nav-link][data-active="true"]:hover { color: var(--text-primary) !important; background: var(--brand-green-soft) !important; }
        [data-admin-page-shell], [data-orders-shell], [data-order-detail-shell] {
          font-size: 15px;
          font-family: var(--font-ui), sans-serif;
          color: var(--text-primary);
        }
        [data-admin-mobile-nav] { display: none; }
        [data-admin-mobile-more] { display: none; }
        @media (min-width: 769px) {
          [data-admin-desktop-nav] {
            float: left;
          }
          [data-admin-desktop-nav] ~ * {
            margin-left: 200px !important;
            width: auto;
            flex: 1;
            min-width: 0;
            box-sizing: border-box;
          }
          [data-admin-desktop-nav][data-collapsed="true"] ~ * {
            margin-left: 56px !important;
          }
          [data-admin-desktop-nav] ~ [data-orders-shell],
          [data-admin-desktop-nav] ~ [data-order-detail-shell],
          [data-admin-desktop-nav] ~ [data-admin-page-shell] {
            margin-left: calc(200px + max(0px, (100vw - 200px - 1212px) / 2)) !important;
          }
          [data-admin-desktop-nav][data-collapsed="true"] ~ [data-orders-shell],
          [data-admin-desktop-nav][data-collapsed="true"] ~ [data-order-detail-shell],
          [data-admin-desktop-nav][data-collapsed="true"] ~ [data-admin-page-shell] {
            margin-left: calc(56px + max(0px, (100vw - 56px - 1212px) / 2)) !important;
          }
          [data-admin-desktop-nav] ~ [data-admin-settings-shell] {
            margin-left: calc(200px + max(0px, (100vw - 200px - 832px) / 2)) !important;
          }
          [data-admin-desktop-nav][data-collapsed="true"] ~ [data-admin-settings-shell] {
            margin-left: calc(56px + max(0px, (100vw - 56px - 832px) / 2)) !important;
          }
        }
        @media (max-width: 768px) {
          [data-admin-desktop-nav] { display: none !important; }
          [data-admin-mobile-nav] { display: block; }
          [data-admin-mobile-more][data-open="true"] { display: block; }
          [data-admin-page-shell] { padding-left: 14px !important; padding-right: 14px !important; }
          [data-admin-page-tabs] { padding-left: 14px !important; padding-right: 14px !important; }
          body { padding-bottom: 82px; }
        }
      ` }} />

      <nav data-admin-desktop-nav data-collapsed={collapsed ? 'true' : 'false'} style={{
        width: collapsed ? '56px' : '200px',
        minWidth: collapsed ? '56px' : '200px',
        background: 'var(--surface-raised)',
        borderRight: '1px solid var(--border)',
        flexDirection: 'column',
        padding: '24px 0',
        position: 'sticky',
        top: 0,
        height: '100vh',
        boxSizing: 'border-box',
        transition: 'width 200ms ease',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            padding: collapsed ? '0 0 32px 0' : '0 16px 32px 20px',
          }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 16,
              fontWeight: 400,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              opacity: collapsed ? 0 : 1,
              pointerEvents: collapsed ? 'none' : 'auto',
              transition: 'opacity 150ms ease',
              width: collapsed ? 0 : 'auto',
              overflow: 'hidden',
            }}>
              Mali&apos;s Meals
            </span>
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                background: 'var(--surface-sunken)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                color: 'var(--text-tertiary)',
                flexShrink: 0,
                fontFamily: 'var(--font-ui), sans-serif',
                lineHeight: 1,
                padding: 0,
              }}
            >
              {collapsed ? '›' : '‹'}
            </button>
          </div>
          {dailyLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              data-admin-nav-link
              data-active={isActive(link.href) ? 'true' : 'false'}
              style={{
                display: 'flex',
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: isActive(link.href) ? (collapsed ? '9px 0' : '9px 20px 9px 17px') : (collapsed ? '9px 0' : '9px 20px'),
                fontFamily: 'var(--font-ui), sans-serif',
                fontSize: isActive(link.href) ? 15 : 14,
                fontWeight: isActive(link.href) ? 600 : 400,
                color: isActive(link.href) ? 'var(--text-primary)' : 'var(--text-tertiary)',
                textDecoration: 'none',
                background: isActive(link.href) ? 'var(--brand-green-soft)' : 'none',
                borderLeft: isActive(link.href) ? '3px solid var(--accent-forest)' : 'none',
                boxSizing: 'border-box',
                minHeight: 38,
                alignItems: 'center',
              }}
            >
              <span style={{
                opacity: collapsed ? 0 : 1,
                pointerEvents: collapsed ? 'none' : 'auto',
                transition: 'opacity 150ms ease',
                position: collapsed ? 'absolute' : 'static',
              }}>
                {link.label}
              </span>
              {collapsed && (
                <span style={{
                  color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-ui), sans-serif',
                  fontSize: 12,
                  fontWeight: isActive(link.href) ? 600 : 400,
                  textTransform: 'uppercase',
                }}>
                  {link.label.slice(0, 1)}
                </span>
              )}
            </Link>
          ))}
          <div style={{ flex: 1 }} />
          {configLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              data-admin-nav-link
              data-active={isActive(link.href) ? 'true' : 'false'}
              style={{
                display: 'flex',
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: isActive(link.href) ? (collapsed ? '9px 0' : '9px 20px 9px 17px') : (collapsed ? '9px 0' : '9px 20px'),
                fontFamily: 'var(--font-ui), sans-serif',
                fontSize: isActive(link.href) ? 15 : 14,
                fontWeight: isActive(link.href) ? 600 : 400,
                color: isActive(link.href) ? 'var(--text-primary)' : 'var(--text-tertiary)',
                textDecoration: 'none',
                background: isActive(link.href) ? 'var(--brand-green-soft)' : 'none',
                borderLeft: isActive(link.href) ? '3px solid var(--accent-forest)' : 'none',
                boxSizing: 'border-box',
                minHeight: 38,
                alignItems: 'center',
              }}
            >
              <span style={{
                opacity: collapsed ? 0 : 1,
                pointerEvents: collapsed ? 'none' : 'auto',
                transition: 'opacity 150ms ease',
                position: collapsed ? 'absolute' : 'static',
              }}>
                {link.label}
              </span>
              {collapsed && (
                <span style={{
                  color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-ui), sans-serif',
                  fontSize: 12,
                  fontWeight: isActive(link.href) ? 600 : 400,
                  textTransform: 'uppercase',
                }}>
                  {link.label.slice(0, 1)}
                </span>
              )}
            </Link>
          ))}
          <button
            onClick={handleSignOut}
            style={{
              padding: '20px 20px 0 20px',
              fontFamily: 'var(--font-ui), sans-serif',
              fontSize: 13,
              fontWeight: 400,
              color: 'var(--text-secondary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'block',
              whiteSpace: 'nowrap',
              opacity: collapsed ? 0 : 1,
              pointerEvents: collapsed ? 'none' : 'auto',
              transition: 'opacity 150ms ease',
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
