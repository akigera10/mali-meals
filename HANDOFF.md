# Mali's Meals — Master Handoff (May 2026)

## Project identity

| | |
|---|---|
| Local path | `C:\Users\user\OneDrive\Documents\mali-meals` |
| Live URL | https://www.malismeals.com |
| GitHub | https://github.com/akigera10/mali-meals |
| Supabase project ID | ouolrgndrqsbjkopsdso |
| Supabase region | eu-west-2 (London) |
| Local dev | `npm run dev` → http://localhost:3000 (or next available port shown in terminal) |
| Deploy | `git push` to main → Vercel auto-deploys in ~60 seconds |
| Windows terminal startup | `Remove-Item -Recurse -Force .next; npm run dev` |

---

## Stack (non-negotiable)

- **Framework:** Next.js 14 App Router
- **Language:** TypeScript
- **Styling:** Inline `style={}` props using CSS custom properties — NO Tailwind classes in components ever
- **Database:** Supabase (`@supabase/supabase-js` v2)
- **Email:** Resend (`resend` package) for order/dispatch emails; Supabase Auth email uses Resend SMTP
- **Deployment:** Vercel

---

## Critical config notes

- `typescript.ignoreBuildErrors: true` is set in `next.config.mjs` — never remove this
- `"strict": false` in `tsconfig.json`
- RLS is fully enabled on all tables — see Security section for policy details
- `revalidate = 0` on admin pages — forces fresh data on every load
- Admin auth uses Supabase Auth — not cookie-based password gate
- Admin password reset uses Supabase Auth recovery links, delivered through Resend SMTP
- All admin Supabase operations use `createAdminClient()` with service role key
- All public Supabase operations use `createServerClient()` with anon key

---

## Current status - end of May 19, 2026 work session

Latest completed app-work commit before this handoff update:

`232efa2 admin-layout: remove-max-width-constraint, full-width-content`

GitHub `main` and Vercel Production were verified up to date after the
admin layout width commit. Latest verified Production deployment:

`https://mali-meals-9wzfp2c1s-akigera10-9005s-projects.vercel.app`

### Completed in the Fresh Green Kitchen rollout

- Phase 0 docs/design direction: completed in `DESIGN.md`.
- Phase 1 foundation: `globals.css` tokens, `layout.tsx` fonts, and green token rename completed.
- Phase 2 customer menu component pass: completed. Dish card dividers removed, prices use dark text, delivery info card is white/raised, chips use full words, protein add-ons are compact rows.
- Phase 3 checkout visual polish: completed. Stepper removed, back navigation simplified, form state persists through menu/checkout navigation, review and success screens polished, reassurance copy added above Place order.
- Phase 4 admin UI pass: completed. Admin active navigation and primary operational actions lean forest, rows are denser, and admin screens read more like an operations tool.
- Admin Part 1 structural pass: completed. Desktop admin now uses a left sidebar with daily operations and configuration groups, mobile bottom nav remains unchanged, login primary button is forest/white, order detail actions have primary/secondary/danger hierarchy, reports hierarchy is stronger, and the sidebar can collapse with state persisted in `localStorage`.
- Admin layout width refinement: completed. Orders, order detail, reports, menu, kitchen, payments, and deliveries use a wider operational content area. Settings remains narrower and centered for readable form work. The menu admin dish cards now stretch as full-width editing panels.
- Phase 5 email restyle: completed. Confirmation, dispatch, and admin notification emails use green/sage/forest direct hex values instead of old gold/cream styling.
- iOS Safari checkout input zoom fix: completed with 16px input sizing in checkout and globals.
- Local/mobile verification: customer menu, cart bar, checkout step 1, review step, and success screen were tested with mobile Playwright screenshots.
- Admin desktop verification: Orders, Menu, Reports, and Settings were screenshot on desktop with expanded and collapsed sidebar states. Screenshots are local-only under `output/playwright/admin-layout-2026-05-19` and are intentionally not committed.

### Key learnings from this session

- `npm run build` rewrites `.next`. If a dev server is still running, localhost can serve stale `_next/static` asset paths and CSS may disappear. Fix by stopping the stale server, removing `.next`, restarting dev, and hard-refreshing the printed port.
- Do not trust a localhost page that appears as plain black/blue browser-default text. That means CSS assets are stale or missing, not that the design tokens vanished. Stop the dev server, remove `.next`, restart dev, and hard refresh.
- Always trust the port printed by Next. Port 3000 may be occupied; this project often runs on 3001 during local work.
- Vercel deployment is not instant at push time. After `git push origin main`, verify the latest Production deployment reaches `Ready` before assuming the live site has the change.
- Email changes only appear in newly sent emails after the new Vercel deployment finishes. An email sent before the deployment completes can still look old.
- Checkout form state now lives in `CartContext` with cart state, so customer details persist when navigating back to menu and returning to checkout.
- Browser/mobile QA is important for this app. Mobile screenshots caught the real cart, zone, delivery option, review, and success-screen states.
- Admin QA should check both expanded and collapsed sidebar states. The desktop sidebar width changes from 200px to 56px, and the content positioning uses CSS calculations so the operational surface remains centered in the remaining viewport.

---

## Design system (non-negotiable)

**Fonts** — loaded via `next/font/google` in `app/layout.tsx`:
- `--font-instrument-serif` / `--font-display` — display text, dish names, prices, headings, order refs
- `--font-manrope` / `--font-ui` — body copy, buttons, labels, inputs, admin UI

**CSS custom properties** (defined in `app/globals.css`):

```
--surface-base: #EEF3EC       sage page background
--surface-raised: #FFFFFF     cards, inputs
--surface-sunken: #D4E8CF     badges, inactive states
--text-primary: #102015       headings, dish names
--text-secondary: #3A4F3E     body copy, descriptions
--text-tertiary: #6B7D6E      labels, hints, muted text
--brand-green: #72C472        primary customer actions
--brand-green-hover: #52A852  hover/focus states
--brand-green-soft: #D4EDD4   selected state backgrounds
--accent-forest: #1F6B3A      delivered/paid/admin primary status
--accent-terracotta: #B5533C  allergen badges, errors, urgent states
--border: rgba(16,32,21,0.10)
--border-strong: rgba(16,32,21,0.22)
```

**Rules:**
- Fresh Green Kitchen direction: no gold/brown brand primitives; use green/sage/forest roles from `DESIGN.md`
- No shadows anywhere
- 8px border radius on cards and inputs
- Customer pages: max-width 600px centered
- Admin pages: desktop sidebar plus centered operational content. Orders/order detail/reports/menu/kitchen/payments/deliveries target about 1100px of usable inner content. Settings targets about 720px usable inner content. Several wrappers use a larger `maxWidth` to include the required 56px side padding.
- All styling inline `style={}` — never Tailwind classes in components
- NEVER store styles in variables, state, or computed functions — always static object literals directly on JSX elements

---

## File structure

```
mali-meals/
├── app/
│   ├── admin/
│   │   ├── deliveries/
│   │   │   └── page.tsx               ← Deliveries tab (delivery date filtered)
│   │   ├── kitchen/
│   │   │   └── page.tsx               ← Kitchen tab (delivery date filtered)
│   │   ├── login/
│   │   │   └── page.tsx               ← Supabase Auth login form
│   │   ├── menu/
│   │   │   └── page.tsx               ← Menu management (tabbed: Weekend|Midweek|Protein Add-ons)
│   │   ├── orders/
│   │   │   └── [id]/
│   │   │       └── page.tsx           ← Individual order detail page
│   │   ├── payments/
│   │   │   └── page.tsx               ← Payments reconciliation page
│   │   ├── packing-slips/
│   │   │   ├── page.tsx               ← Server component, data fetching
│   │   │   └── PackingSlipsClient.tsx ← Client component, print layout
│   │   ├── reports/
│   │   │   └── page.tsx               ← Business intelligence page
│   │   ├── settings/
│   │   │   └── page.tsx               ← Active cycle, cutoffs, delivery dates
│   │   ├── components/
│   │   │   └── AdminNav.tsx           ← Shared nav: Orders|Menu|Kitchen|Deliveries|Payments|Reports|Settings
│   │   ├── OrdersClient.tsx           ← Orders delivery-date queue, search, tabs, grouped rows
│   │   └── page.tsx                   ← Orders page server load for default delivery date
│   ├── api/
│   │   ├── admin/
│   │   │   ├── deliveries-data/       ← Admin deliveries data API route
│   │   │   ├── delivery-dates/        ← Admin-auth dates from orders + settings delivery dates
│   │   │   ├── orders-by-date/        ← Admin-auth full order rows filtered by delivery_date
│   │   │   ├── payments-data/         ← Payments filtered by delivery_date
│   │   │   └── update-order/          ← Updates order status/payment
│   │   ├── generate-order-ref/
│   │   │   └── route.ts               ← Server-side order ref generation (MAX-based, not created_at)
│   │   ├── send-confirmation/
│   │   │   └── route.ts               ← Resend customer order received email with payment instruction
│   │   ├── send-admin-order-notification/
│   │   │   └── route.ts               ← Resend admin new order notification to Mali
│   │   └── send-dispatch/
│   │       └── route.ts               ← Resend dispatch notification email
│   ├── checkout/
│   │   ├── CheckoutClient.tsx         ← Two-step checkout UI
│   │   └── page.tsx
│   ├── components/
│   │   └── MenuClient.tsx             ← Customer menu + cart (cycle-aware)
│   ├── context/
│   │   └── CartContext.tsx            ← Cart state + form state
│   ├── globals.css                    ← All CSS custom properties
│   ├── layout.tsx                     ← Root layout, fonts, CartProvider
│   └── page.tsx                       ← Home: cycle-aware menu, cutoff check
├── lib/
│   └── supabase.ts                    ← supabase (browser) + createServerClient() + createAdminClient()
├── middleware.ts                       ← Protects /admin/* with Supabase Auth session check
├── .env.local                         ← Gitignored — local keys
├── next.config.mjs                    ← typescript.ignoreBuildErrors: true
└── tsconfig.json                      ← strict: false
```

---

## Database schema

### Tables

**`menu_items`**
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | changes weekly — WARNING: overwritten each week, no history preserved |
| description | text | changes weekly — WARNING: overwritten each week, no history preserved |
| category | text | 'mains' or 'salads' |
| base_price | integer | 995 mains, 580 salads — never changes |
| meat_upgrade_price | integer | always 300, null if no meat |
| meat_upgrade_type | text | 'beef', 'chicken', 'both', or null |
| is_active | boolean | false = hidden from customer menu this week |
| is_sold_out | boolean | temporarily unavailable |
| sort_order | integer | 1–4 per category |
| allergens | text[] | ['dairy','nuts','soy','coconut'] |
| is_freezer_friendly | boolean | |
| is_spicy | boolean | |
| is_family_friendly | boolean | |
| available_weekend | boolean | true = shows on weekend cycle menu |
| available_midweek | boolean | true = shows on midweek cycle menu |

**IMPORTANT — menu_items is not a historical record.** Mali overwrites dish names and
descriptions each week. The dish slots persist but the content changes. This means
querying menu_items for historical data (e.g. what was on the menu 3 weeks ago) is
impossible. The only way to preserve what was served historically is through the
dish_name snapshot on order_items, which is now implemented for new orders.

**`protein_addons`**
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| price | integer | KES |
| is_active | boolean | |
| is_sold_out | boolean | |
| sort_order | integer | |

**`specials`**
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | changes weekly |
| description | text | |
| price | integer | variable — 500 for soup, 700 for dessert etc |
| is_active | boolean | false = hidden from menu — MUST check this before displaying |
| is_sold_out | boolean | |
| created_at | timestamptz | |

**`orders`**
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_ref | text | MAL-1000, MAL-1001… generated server-side via MAX query |
| customer_name | text | |
| customer_phone | text | |
| customer_email | text | |
| delivery_address | text | formatted string |
| address_building | text | |
| address_street | text | |
| address_apartment | text | |
| address_landmark | text | nullable |
| delivery_zone | integer | 1–4 |
| delivery_day | text | 'sunday', 'monday', or 'wednesday' |
| delivery_date | date | specific delivery date e.g. 2026-05-11 — populated at checkout |
| cycle_type | text | 'weekend' or 'midweek' — populated at checkout |
| delivery_window | text | 'by_5pm', 'free_5_10pm', or slot value |
| delivery_slot | text | '12_2pm' etc, Monday only |
| subtotal | integer | food total only |
| delivery_fee | integer | |
| total_amount | integer | subtotal + delivery_fee |
| payment_status | text | 'unpaid' or 'paid' |
| order_status | text | 'new', 'confirmed', 'dispatched', 'delivered', 'cancelled' |
| mpesa_code | text | M-Pesa confirmation code |
| paid_at | timestamptz | timestamp when payment confirmed |
| notes | text | nullable |
| created_at | timestamptz | |
| updated_at | timestamptz | auto-updated by trigger |

**`order_items`**
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_id | uuid FK → orders | |
| menu_item_id | uuid FK → menu_items | |
| dish_name | text | SNAPSHOT — populated at checkout with the dish name at time of ordering. Historical/dev orders from before the fix may be null and fall back to menu_items.name. |
| quantity | integer | |
| variant | text | 'vegetarian' or 'meat' ONLY |
| meat_type | text | 'beef', 'chicken', or null — already exists in DB |
| unit_price | integer | price snapshot at time of ordering |
| created_at | timestamptz | |

**`order_item_addons`**
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_item_id | uuid FK → order_items | |
| addon_id | uuid FK → protein_addons | |
| quantity | integer | |
| unit_price | integer | |
| created_at | timestamptz | |

**`order_specials`**
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_id | uuid FK → orders | |
| special_id | uuid FK → specials | |
| special_name | text | SNAPSHOT — populated at checkout with the special name at time of ordering. Historical/dev orders from before the fix may be null and fall back to specials.name. |
| quantity | integer | |
| unit_price | integer | price snapshot |
| created_at | timestamptz | |

**`settings`** ← single row table, Mali updates weekly
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| active_cycle | text | 'weekend' or 'midweek' |
| weekend_cutoff | timestamptz | Friday 2pm EAT e.g. 2026-05-09 14:00:00+03 |
| midweek_cutoff | timestamptz | Tuesday 2pm EAT e.g. 2026-05-13 14:00:00+03 |
| next_sunday_date | date | upcoming Sunday delivery |
| next_monday_date | date | upcoming Monday delivery |
| next_wednesday_date | date | upcoming Wednesday delivery, nullable |
| whatsapp_group_link | text | https://chat.whatsapp.com/H9LnTAtoJ0w9uJAeNmQ0i7?mode=gi_t |
| updated_at | timestamptz | |

---

## Business rules

### Delivery cycles

**Cycle 1 — Weekend**
- Menu goes out: Wednesday
- Orders open: Wednesday
- Orders close: Friday 2pm EAT
- Delivery days: Sunday and Monday
- Menu format: 4 mains, 4 salads, optional chef's special

**Cycle 2 — Midweek (piloting from 6 May 2026)**
- Menu goes out: Monday
- Orders open: Monday
- Orders close: Tuesday 2pm EAT
- Delivery day: Wednesday
- Menu format: variable — currently 2 mains, 3 salads, no chef's special
- Menus are COMPLETELY DIFFERENT from weekend — different dishes entirely

Both cycles managed through available_weekend and available_midweek flags on menu_items.
Only one cycle is open for ordering at any time — controlled by active_cycle in settings.

### Delivery zones and fees

| Zone | Fee | Areas |
|---|---|---|
| Zone 1 | 300 | Lavington, Kilimani, Kileleshwa, Hurlingham |
| Zone 2 | 350 | Riverside, Westlands, Parklands, Peponi |
| Zone 3 | 450 | Lower Kabete, Loresho, Kitisuru, Nyari, Pangani, Ngara, Muthaiga |
| Zone 4 | 500 | Karen, Roselyn, Runda, Gigiri, Garden Estate, Langata Road |

Free delivery: orders above 5,000 get Sunday 5–10pm free.
No currency prefix anywhere in displayed text — numbers only. Never "Ksh" prefix.

### Payment model

Payment is collected BEFORE dispatch. After Mali confirms an order she contacts the
customer directly (currently WhatsApp/iMessage) to request payment. Customer sends
money via M-Pesa to Godrick's personal number 0708470580 (from MALI_PHONE env var).
Mali marks order as paid and dispatches. M-Pesa code captured when marking as paid.

Customer order received email payment instruction:
"To pay for your order, send [total] to 0708470580 (Godrick Mali Luta) via M-Pesa."

New order notification email is sent to orders@malismeals.com after checkout.
It uses the same visual system as the customer email, includes customer,
delivery, item, total, notes, and payment status details, and links Mali to
the admin order detail page to review/confirm the order. The email is sent from
`Mali's Meals <orders@malismeals.com>` to `orders@malismeals.com` with `replyTo`
set to the customer email, so replying from the notification should address the
customer.

The order reference MAL-XXXX is for customer service inquiries ONLY — not a payment
reference. Do not tell customers to use it as a payment note.

### Order ref

MAL-1000, MAL-1001... Generated server-side via /api/generate-order-ref.
Uses MAX query across all order_refs to find highest number and increments by 1.
NEVER uses created_at ordering — that caused duplicate ref bugs previously.

### Cutoffs

Both weekend and midweek cutoffs are at 2pm EAT (Africa/Nairobi, UTC+3).
- Weekend: Friday 2pm
- Midweek: Tuesday 2pm

All cutoff calculations MUST use Africa/Nairobi timezone. Never UTC or server timezone.

---

## Order status workflow

```
NEW → CONFIRMED → DISPATCHED → DELIVERED
                → CANCELLED (any stage except delivered)
```

- **NEW** — order placed, Mali hasn't reviewed
- **CONFIRMED** — Mali reviewed, added to cooking plan
- **DISPATCHED** — rider left. Payment should be confirmed before dispatching.
- **DELIVERED** — customer received food
- **CANCELLED** — available at new/confirmed/dispatched

NOTE: Payment flow rework pending (item 15). Real flow should be:
NEW → CONFIRMED → PAYMENT REQUESTED → PAID → DISPATCHED → DELIVERED

---

## Delivery date model

Every order is anchored to a specific delivery_date (real calendar date).
All admin filtering is by delivery_date — not abstract week windows.
Default view shows next upcoming delivery date. Old orders hidden by default.

---

## Order cutoff — customer side

Customer menu reads settings table server-side on every page load.
Compares current Nairobi time against active cycle's cutoff timestamp.

- Before cutoff AND settings exist → show menu for active cycle
- After cutoff OR no settings → show ordering closed message

Closed message:
"Orders are currently closed. Weekend orders open Wednesday and close Friday at 2pm.
Next delivery: Sunday [date] and Monday [date].
Join our WhatsApp group → [whatsapp_group_link from settings]"

---

## Menu availability model

- active_cycle = 'weekend' → show dishes where available_weekend = true AND is_active = true
- active_cycle = 'midweek' → show dishes where available_midweek = true AND is_active = true

Weekend and midweek menus use COMPLETELY DIFFERENT dish records.
Weekend dishes: available_weekend = true, available_midweek = false
Midweek dishes: available_midweek = true, available_weekend = false

Admin menu management is tabbed: Weekend Menu | Midweek Menu | Protein Add-ons
Each tab shows only dishes for that cycle.
is_active = whether dish shows on customer menu this week
is_sold_out = temporarily unavailable

---

## Admin settings page — /admin/settings

Mali updates this every week:
- Active cycle toggle: Weekend / Midweek
- Weekend cutoff: date + time (default Friday 2pm EAT)
- Midweek cutoff: date + time (default Tuesday 2pm EAT)
- Next Sunday delivery date
- Next Monday delivery date
- Next Wednesday delivery date
- WhatsApp group link

Active cycle indicator on menu page must dynamically check cutoff:
- Before cutoff: "● [cycle] menu is live · customers are ordering now" in --accent-forest
- After cutoff: "● Ordering closed · cutoff passed" in --text-tertiary

---

## Cart item ID format

- `${dishId}:vegetarian` — veg dish
- `${dishId}:meat` — meat dish (single meat type)
- `${dishId}:meat:beef` — beef (for 'both' dishes)
- `${dishId}:meat:chicken` — chicken (for 'both' dishes)
- `addon:${addonId}` — protein add-on
- `special:${specialId}` — chef's special

---

## Admin area — what is built

### Navigation

Top nav bar: **Orders | Menu | Kitchen | Deliveries | Payments | Reports | Settings**

Reports page is built as a first business intelligence pass. See the pending
roadmap for future refinements.

### Orders page `/admin`

- Primary organization is delivery_date. Mali works one delivery batch at a time.
- Default delivery date comes from settings: active midweek uses next_wednesday_date; active weekend uses next_sunday_date. Fallback is nearest upcoming order delivery_date, then most recent past date.
- Delivery date pills show a maximum of 5 dates: up to 2 recent past dates, selected/current date, and up to 2 upcoming dates. `Older orders ›` reveals an inline date picker for older dates.
- First render is server-side for the default date. Selecting another date fetches client-side from `/api/admin/orders-by-date`.
- `/api/admin/orders-by-date` returns the full selected-date order set by default for Orders, including delivered and cancelled rows. Kitchen calls the same route with `scope=kitchen`, which limits results to operational prep statuses: 'new', 'confirmed', and 'dispatched'.
- `/api/admin/delivery-dates` returns distinct order delivery_dates plus settings next_sunday_date, next_monday_date, and next_wednesday_date. Both `/api/admin/delivery-dates` and `/api/admin/orders-by-date` require a valid admin session before using createAdminClient().
- Search is client-side within the already loaded selected-date orders. It filters customer_name, customer_phone, and order_ref, case-insensitive, and combines with the active tab.
- Tabs: All, New, Confirmed, Paid, Out for delivery, Delivered if present, Cancelled if present. Counts are for the selected delivery date.
- All tab groups orders into Ready to go, Needs payment, New orders, and Completed. Individual tabs show flat rows.
- Order rows are compact, full-row clickable links to `/admin/orders/[id]`, with ref, customer, phone, delivery date/zone/window, total, timestamp, and one compound status badge.
- Badge labels are UI-only display labels derived from existing database values. Do not add database statuses:
  - New = order_status 'new'
  - Confirmed · Unpaid = order_status 'confirmed' and payment_status 'unpaid'
  - Paid · Ready = order_status 'confirmed' and payment_status 'paid'
  - Out for delivery = order_status 'dispatched'
  - Delivered · Paid/Unpaid = order_status 'delivered' plus payment_status
  - Cancelled = order_status 'cancelled'
- Do not use `Ready`, `Awaiting payment`, `Needs review`, or `Open` as database statuses. If used in UI, they must be derived labels only and should be documented clearly.

### Order detail page `/admin/orders/[id]`

- Full order breakdown: customer, delivery, items in MAINS / SALADS / CHEF'S SPECIAL / PROTEIN ADD-ONS
- Meat type displays correctly: With chicken / With beef / Vegetarian
- Delivery day displays correctly for Wednesday orders
- Admin notes textarea — saves on blur
- Print slip button
- Mark paid button — captures M-Pesa code
- Confirm, Dispatch, Deliver, Cancel workflow buttons
- Mobile responsive for email Review order flow: action buttons stack into large tap targets, customer/delivery cards stack, customer phone/email are tappable, and item/totals rows avoid horizontal overflow

### Menu page `/admin/menu` — TABBED

Three tabs: Weekend Menu | Midweek Menu | Protein Add-ons

Active cycle indicator at top checks the active cycle cutoff.

Each dish card: name, description, meat option, allergens + legend, flags, is_active, is_sold_out, save button.
Allergen legend: D = Dairy · N = Nuts · S = Soy · C = Coconut
Category headings: "Mains · 995 · with protein 1,295" and "Salads · 580 · with protein 880"

Former card styling disappearance bug is fixed by the server/client split. Preserve that architecture.

### Kitchen tab `/admin/kitchen`

- Delivery date selector
- Cooking summary with meat type breakdown per dish
- Chef's special section
- Protein add-ons section
- Uses `/api/admin/orders-by-date?scope=kitchen` so delivered/cancelled orders do not inflate cooking prep counts.

### Deliveries tab `/admin/deliveries`

- Delivery date selector
- Orders grouped by zone — ALL orders regardless of payment status
- Payment status badge on each order
- Print packing slips button
- Print delivery manifest button

### Payments page `/admin/payments`

- Delivery date selector
- Paid orders table: M-Pesa codes, paid_at, totals
- Outstanding payments section: unpaid orders for selected date

### Packing slips `/admin/packing-slips`

- Batch and single mode
- No prices — logistics document only
- COLLECT PAYMENT or PAID status label (no amount)
- B&W safe
- Wednesday displays correctly

### Settings page `/admin/settings`

Built and working. See settings section above.

---

## What is built and working

| Feature | Status |
|---|---|
| Customer menu — cycle-aware, cutoff-aware | ✅ Working |
| Customer menu — ordering closed message with WhatsApp link | ✅ Working |
| Chef's special — respects is_active flag | ✅ Working |
| Family friendly / spicy badges on customer menu | ✅ Working |
| Fresh Green Kitchen design system | ✅ Working |
| Customer menu visual pass | ✅ Working |
| Sticky cart bar polish | ✅ Working |
| Two-step checkout — form, validation, review | ✅ Working |
| Checkout form state persistence across menu/checkout navigation | ✅ Working |
| Checkout visual polish — stepper removed, plain back nav, review reassurance | ✅ Working |
| Success screen — plain wordmark and plain Back to menu link | ✅ Working |
| iOS Safari input zoom prevention | ✅ Working |
| Order submission — delivery_date and cycle_type stamped | ✅ Working |
| Wednesday delivery option in checkout | ✅ Working |
| Order ref — server-side MAX-based generation | ✅ Working |
| Customer order received email — payment instruction, no wrong reference note | ✅ Working |
| Admin new order email to Mali — review link and full order summary | ✅ Working |
| Dispatch notification email | ✅ Working |
| Transactional emails — Fresh Green Kitchen colors | ✅ Working |
| Email sender — orders@malismeals.com | ✅ Working |
| Supabase Auth reset email — no-reply@malismeals.com via Resend SMTP | ✅ Working |
| Domain — www.malismeals.com live | ✅ Working |
| Admin login — Supabase Auth, sign out, password reset flow | ✅ Working |
| Admin orders list with delivery date filter | ✅ Working |
| Order detail — meat type, Wednesday display, Mark paid | ✅ Working |
| Mobile order ops — `/admin`, order detail, AdminNav | ✅ Working |
| Admin menu — tabbed Weekend/Midweek/Protein Add-ons | ✅ Working |
| Admin menu — allergen legend | ✅ Working |
| Admin menu — active cycle indicator | ✅ Working |
| Admin menu — card styling | ✅ Working |
| Kitchen tab — delivery date filter | ✅ Working |
| Deliveries tab — all orders regardless of payment | ✅ Working |
| Payments page — paid + outstanding sections | ✅ Working |
| Packing slips — batch and single, no prices, B&W safe | ✅ Working |
| Settings page — active cycle, cutoffs, delivery dates | ✅ Working |
| Reports page — first business intelligence pass | ✅ Working |
| RLS — all tables fully configured | ✅ Complete |
| Admin client — service role key | ✅ Complete |
| Meat type (beef/chicken) throughout admin | ✅ Working |

---

## Historical known issues — fixed on PR #1

### FIXED — Menu page styling disappeared (architectural bug)

All card styling on app/admin/menu/page.tsx disappears whenever the user
switches tabs, refreshes the page, or saves a dish. This has persisted
through multiple fix attempts because the root cause is architectural —
styles are being stored in state or variables instead of as static inline
object literals directly on JSX elements.

**Root cause:** The menu page mixes server and client rendering incorrectly.
Server re-renders on save or data fetch reset client-side styles.

**Correct fix — split the page:**
- page.tsx: server component ONLY — fetch all data, pass as props
- MenuClient.tsx: client component ('use client') — ALL rendering and interaction

In MenuClient.tsx:
- Every style must be a static inline style={{}} object literal on the JSX element
- No variables (const cardStyle = {...} is WRONG)
- No useState for styles
- No computed styles
- No CSS modules or className
- Tab switching via useState only — never triggers server re-fetch
- Save actions update local state immediately after Supabase confirms

Fixed by splitting `/admin/menu/page.tsx` into server-only data loading and
`/admin/menu/MenuClient.tsx` for all rendering, tab state, and save actions.

### FIXED — dish_name and special_name snapshots

Every week Mali overwrites menu_items.name with new dish names. Every historical
order that references a menu_item_id now shows the CURRENT dish name, not what
was actually ordered. This gets worse every week.

Example of the bug:
- Week 1: Customer orders "Pad kra pow rice bowl" (menu_item_id = abc123)
- Week 3: Mali updates that slot to "Spinach and mushroom lasagna"
- Now the week 1 order detail shows "Spinach and mushroom lasagna" — WRONG

This affects: order detail page, kitchen tab cooking summary, packing slips,
and any future analytics — all show wrong dish names for historical orders.

**Fix required — urgent before more menus are updated:**

Step 1 — Add columns:
```sql
ALTER TABLE order_items ADD COLUMN dish_name text;
ALTER TABLE order_specials ADD COLUMN special_name text;
```

Step 2 — In CheckoutClient.tsx, populate dish_name when inserting order_items
with the dish name from the cart at time of ordering.

Step 3 — In CheckoutClient.tsx, populate special_name when inserting order_specials.

Step 4 — Update all display pages to use order_items.dish_name when available,
falling back to menu_items.name for pre-fix orders:
- Order detail page
- Kitchen tab
- Packing slips
- Reports page (when built)

After this fix, historical order data becomes permanently accurate regardless
of future menu changes.

### FIXED — Active cycle indicator inaccurate after cutoff

"Midweek menu is live · customers are ordering now" shows even after Tuesday 2pm
when ordering is closed. Must compare current Africa/Nairobi time against cutoff.

Fixed. Customer menu reads settings server-side and displays the correct ordering
state against the active cycle cutoff.

### FIXED — Ksh prefix still on customer menu

"Ksh 995", "Ksh 1,295" still appearing in MenuClient.tsx and possibly other files.
Do a complete codebase search for "Ksh" in displayed text and remove all instances.
Leave "Price (Ksh)" admin input labels intact.

Fixed on customer-facing surfaces. No currency prefix is used in displayed customer
prices; admin field labels may still say Price (Ksh).

### FIXED — "With meat" copy incorrect

"Mains · 995 · with meat 1,295" should be "Mains · 995 · with protein 1,295"
"Salads · 580 · with meat 880" should be "Salads · 580 · with protein 880"
"With meat" appears elsewhere — audit and replace with "with protein" throughout.

Fixed. Customer-facing category and add-on copy now uses protein language.

### FIXED — Customer menu subtitle hardcoded

"Home-cooked meals, delivered Sunday evenings in Nairobi" is hardcoded.
Change to: "Home-cooked meals, delivered in Nairobi"

Fixed as part of the customer menu header pass. The header now uses active cycle
delivery information and broader Nairobi delivery copy.

### OPEN — Server-side validation missing on order submission

All checkout validation is browser-only (CheckoutClient.tsx). A malicious user
can bypass the browser entirely and POST directly to Supabase with garbage data.

Required before public launch:
- Required fields: name, phone, email, address, zone, delivery_day
- Zone must be integer 1-4
- delivery_day must be 'sunday', 'monday', or 'wednesday'
- Items must exist in DB and be active, not sold out
- Quantities must be positive integers
- Prices must match database values — never trust client-submitted prices
- delivery_date must match a real upcoming date from settings

### OPEN — Rate limiting on order submission

No protection against fake order floods. After public launch: upstash/ratelimit,
10 orders per IP per hour.

---

## Data integrity — critical context

### The menu overwrite problem

Mali operates with a rotating weekly menu. Every week she overwrites dish names
and descriptions on existing menu_items rows. The dish slots persist permanently
but their content is replaced each week.

**What this means for data:**
- menu_items is NOT a historical record of dishes served
- It only reflects the CURRENT week's menu
- Querying menu_items for historical analysis is unreliable after any menu update
- The dish_name snapshot is the source of truth for historical dish names

**What IS reliably stored in the database:**
- orders — complete record: delivery_date, cycle_type, zone, amounts, status
- order_items — quantity, variant, meat_type, unit_price (price IS snapshotted)
  dish_name is snapshotted for new orders; old dev rows may be null
- order_item_addons — protein addon quantities and prices — reliable
- order_specials — quantities, prices, and special_name snapshots for new orders are reliable; old dev rows may be null

**With dish_name snapshot implemented:**
All historical analysis becomes fully reliable. You can query what was sold,
when, in what quantity, at what price — from order_items forever.

### What the data can answer with snapshots

**Dish performance:**
- Best selling mains by volume — all time and by date range
- Best selling salads by volume
- Which dishes get the most protein upgrades
- Vegetarian vs meat split per dish
- Dish performance by cycle (weekend vs midweek)

**Revenue analysis:**
- Revenue by delivery_date — week on week trend
- Revenue by month — monthly totals and growth
- Revenue by cycle_type — weekend vs midweek comparison
- Revenue by delivery_zone — which zones are most valuable
- Average order value over time — is it growing
- Delivery fee vs food revenue split
- Best performing week in any given month
- This month vs last month comparison

**Customer analysis:**
- Total unique customers by phone number
- Repeat customer rate — customers with 2+ orders as % of total
- Top customers by order count and by total spend
- Customer zone distribution — where do most customers live
- Average order frequency — how often does a customer reorder
- New vs returning customers per month

**Operational:**
- Protein add-on popularity and revenue contribution
- Chef's special sales performance
- Order timing — what time of day do most orders come in
- Payment timing — how quickly do customers pay after ordering
- Cancellation rate

---

## Security

### Completed

- Supabase Auth — email/password login, session management, sign out
- RLS — all 7 tables with correct policies
- Admin client — createAdminClient() server-side only
- Public client — createServerClient() anon key, insert-only on order tables
- Order ref — server-side only, MAX-based

### RLS policies

```
menu_items        — public SELECT only
specials          — public SELECT only
protein_addons    — public SELECT only
orders            — public INSERT only
order_items       — public INSERT only
order_item_addons — public INSERT only
order_specials    — public INSERT only
settings          — public SELECT only
```

---

## Builds in progress / next to build

Current priority order as of May 18, 2026. Do not assume older issue labels in this file are still open without verifying current `main`.

### 1. Server-side checkout submission and validation

Highest remaining launch-safety item. Checkout currently validates in the browser and inserts directly into Supabase from `CheckoutClient.tsx` using the public client. Move order creation into a server API route.

Requirements:
- Required fields: first name, last name, phone, email, building, street, apartment/house, zone, delivery option
- Zone must be integer 1-4
- delivery_day must be 'sunday', 'monday', or 'wednesday'
- delivery window/slot must match the active cycle rules
- Items must exist in the database, be active, and not sold out
- Quantities must be positive integers
- Prices must be recalculated server-side from database values; never trust submitted client prices
- delivery_date and cycle_type must come from current settings, not from client trust
- Generate/order ref flow must remain MAX-based and server-side
- Keep dish_name and special_name snapshots populated at order time
- Keep confirmation/admin notification emails working after the API route succeeds

### 2. Order status / communication layer

Goal: customer never wonders what happened after placing an order.

Potential next work:
- Add an admin action/email for "Order confirmed" once Mali reviews a new order
- Keep dispatch email as the rider-left communication
- Consider a simple customer order status page later, using order_ref plus a private lookup token rather than exposing raw UUIDs
- Clarify success-screen and email copy around "received" vs "confirmed" vs "dispatched"

Do not invent new database statuses casually. Current database values remain:
`new`, `confirmed`, `dispatched`, `delivered`, `cancelled`.

### 3. Customer journey polish - next pass

The first visual rollout is complete, but there is room to push the customer journey from good to excellent.

Candidate work:
- Homepage/menu header: make ordering deadline, delivery date, and what-happens-next even clearer
- Cart clarity: keep add-ons grouped and totals obvious on mobile
- Checkout copy: warmer labels and helper text without changing logic
- Success screen: continue aligning with email language and post-order expectations
- Mobile polish: verify on narrow viewports after every visible change
- Food/brand imagery: only if it supports real food inspection and the boutique food-business feel

### 4. Admin ops pipeline refinement

Phase 4 admin visual polish is complete. The next admin work is workflow depth, not decoration.

Operational model:
- Orders = review/control tower
- Kitchen = what to cook
- Payments = who owes
- Deliveries = what leaves
- Reports = business insight

Potential work:
- Refine Kitchen cooking-summary density and print prep sheet
- Add inline confirm actions for new orders where useful
- Keep rows compact and operational; avoid decorative customer cards
- Review Reports page against real Mali questions after more orders exist

### 5. Customer tab `/admin/customers`

Not built. Query distinct customers from orders:
- Name, phone, email, total orders, total spent, last order date, zone
- Click customer -> full order history
- Use phone as the practical dedupe key unless a better customer identity model is added

### 6. Payment flow rework

Future operational improvement. Real flow should become:

```text
NEW -> CONFIRMED -> PAYMENT REQUESTED -> PAID -> DISPATCHED -> DELIVERED
```

Possible changes:
- Add `payment_requested` order status or a separate payment-request timestamp/state
- Capture M-Pesa code when marking paid, not delivered
- Prevent dispatch unless paid, unless Mali explicitly overrides
- Pair with STK Push if/when IntaSend is adopted

### 7. Rate limiting on order submission

After moving checkout to a server route, add rate limiting before broad public traffic.
Suggested guard: about 10 orders per IP per hour, using Upstash or similar.

### 8. M-Pesa STK Push - IntaSend future phase

Prerequisite: Mali needs an M-Pesa till/paybill setup suitable for business payments, not only a personal number.

What to build later:
- `/api/request-payment` - STK Push to customer phone
- Request payment button on confirmed unpaid orders
- `/api/intasend-webhook` - confirms payment and updates order payment state
- New payment-request state between confirmed and paid

Environment variables to add later:

```text
INTASEND_PUBLISHABLE_KEY=
INTASEND_SECRET_KEY=
```

### 9. Menu history archive - future phase

Since dish_name snapshots are live, past menus can be reconstructed from order_items grouped by delivery_date. No new tables required for a first read-only archive.

---
## Real-world context

The developer placed a real order via Google Form to understand the
actual customer and delivery experience.

Key observations:
- Payment is BEFORE dispatch — Godrick messages each customer on
  WhatsApp/iMessage with the bill and his personal number 0708470580.
  Customer pays, then rider dispatches.
- No confirmation existed before this app — customer had no paper trail.
  A dispute occurred over what was ordered (chicken that may not have
  been selected). This is why order confirmation email is critical.
- Google Form is the current system — this app replaces it.
- Mali uses WhatsApp heavily for customer and rider communication.
- Riders cover specific zones — assignment not tracked in system.
- Mali is piloting Wednesday delivery from 6 May 2026.
- Wednesday menu is completely different from weekend menu.
- Weekend: 4 mains, 4 salads, optional chef's special.
- Midweek: variable — currently 2 mains, 3 salads, no chef's special.

---

## Admin password reset flow

Admin password reset uses Supabase Auth, not a custom password table and not
the deprecated `ADMIN_PASSWORD` environment variable.

- `/admin/login` has two modes: sign in and reset request.
- Reset request mode shows only email + `Send reset link`; it does not show a password field.
- Reset emails are requested through Supabase Auth with redirect to `/admin/reset-password`.
- `/admin/reset-password` consumes Supabase recovery tokens and calls `supabase.auth.updateUser({ password })`.
- Supabase Auth SMTP is configured to send through Resend.
- Auth reset sender is `Mali's Meals <no-reply@malismeals.com>`.
- Admin recipient/login email is `orders@malismeals.com`.
- Do not build a custom app-sent Resend password reset unless Supabase Auth SMTP becomes impossible; Supabase should own recovery tokens.

Important distinction:
- Order and dispatch emails are sent by app API routes through the Resend package.
- Password reset emails are sent by Supabase Auth through Resend SMTP.

---

## Environment variables

### Vercel (already set)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY      ← server-side only, never expose to browser
RESEND_API_KEY
ADMIN_PASSWORD                 ← deprecated; Supabase Auth now controls admin login/password reset
MALI_PHONE                     ← +254708470580
WHATSAPP_GROUP_LINK            ← https://chat.whatsapp.com/H9LnTAtoJ0w9uJAeNmQ0i7?mode=gi_t
```

### Local `.env.local`

```
NEXT_PUBLIC_SUPABASE_URL=https://ouolrgndrqsbjkopsdso.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Supabase dashboard>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard — never commit>
RESEND_API_KEY=<from resend.com>
ADMIN_PASSWORD=<deprecated; no longer used by admin login>
MALI_PHONE=+254708470580
WHATSAPP_GROUP_LINK=https://chat.whatsapp.com/H9LnTAtoJ0w9uJAeNmQ0i7?mode=gi_t
```

---

## How to start a new session

### Windows terminal startup

```powershell
Remove-Item -Recurse -Force .next
npm.cmd run dev
```

Use the exact localhost port printed by Next. Do not assume 3000; if 3000 is
occupied, the app may run on 3001 or another nearby port.

If styling disappears or "Cannot find module" error appears:
stop the stale dev server, remove `.next`, restart with `npm.cmd run dev`, then
hard refresh the browser.

Dev/cache note: `npm run build` rewrites `.next`. If a dev server is still
running while `.next` is rewritten, the browser can request stale CSS asset
paths such as `/_next/static/css/app/layout.css` and receive a 404. The page
then renders as plain black text on white because `app/globals.css` did not
load and CSS variables like `--surface-base` resolve to nothing. Stop the dev
server, remove `.next`, restart `npm run dev`, use the port printed in the
terminal, and hard refresh.

### Playwright browser verification

Playwright is used for real browser QA on this project. It should be used when code changes affect user-visible flows, auth, admin interactions, styling, or Supabase redirects.

Check whether Playwright is installed before reinstalling:

```powershell
npm.cmd list @playwright/test
```

If missing, install it:

```powershell
npm.cmd install --save-dev @playwright/test
npx.cmd playwright install chromium
```

Use Playwright for:

Admin login and password reset flow
Supabase Auth redirects and protected /admin redirects
Admin menu tab switching
Save actions on admin pages
Customer menu visibility, especially specials and sold-out/active states
Styling/rendering checks
Hard refresh/cache checks after dev-server issues

On Windows/Codex, Playwright or Next.js build may need escalation because Chromium or Next workers can fail with:

spawn EPERM

Treat spawn EPERM as a local sandbox/permission issue, not automatically as an app bug.

Always test against the currently running localhost port printed by npm run dev. Do not assume 3000, 3001, or 3002 without checking.

If styling disappears and pages render like plain black text on white, suspect a stale .next or dev-server CSS asset issue. Stop the dev server, remove .next, restart dev, then hard refresh:

```powershell
Ctrl+C
Remove-Item -Recurse -Force .next
npm.cmd run dev
```

### Claude Code

```bash
cd C:\Users\user\OneDrive\Documents\mali-meals
claude
```

### Codex (for complex multi-file architectural tasks)

Connect to GitHub repo akigera10/mali-meals. Read HANDOFF.md first.
Codex creates a branch, opens a PR. Review before merging.
Best used for: menu page architectural fixes, checkout validation, reports refinements.

---

## Key rules — every AI must read before touching code

1. All styling must use inline `style={}` with CSS custom properties — no Tailwind ever
2. CRITICAL: NEVER store styles in variables, state, or computed functions. Static object literals on JSX elements ONLY. Example of WRONG: `const cardStyle = {...}` then `<div style={cardStyle}>`. Example of RIGHT: `<div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)' }}>`.
3. Do not remove `typescript.ignoreBuildErrors: true` from `next.config.mjs`
4. variant on order_items is 'vegetarian' or 'meat' ONLY. meat_type is a separate column — 'beef', 'chicken', or null. Always display both together.
5. Chef's special uses specials table and order_specials table — never menu_items or order_items
6. Cart items with `special:` prefix are chef's specials — always in their own section
7. Payment is BEFORE dispatch in the real business — do not change payment flow without explicit instruction
8. Order status values: 'new', 'confirmed', 'dispatched', 'delivered', 'cancelled' — never 'pending' or 'out_for_delivery'
9. Order/dispatch email sender is orders@malismeals.com; Supabase Auth reset sender is no-reply@malismeals.com. Never revert either to onboarding@resend.dev
10. Never hardcode email addresses, phone numbers, or URLs — always environment variables
11. Admin operations must use `createAdminClient()` — never createServerClient() or browser client for admin data
12. Public operations (customer menu, checkout) must use `createServerClient()` with anon key — never createAdminClient()
13. Order ref generation is server-side only via `/api/generate-order-ref` — MAX-based, never created_at
14. All time and cutoff calculations must use Africa/Nairobi timezone (EAT, UTC+3) — never server timezone or UTC
15. delivery_day valid values: 'sunday', 'monday', 'wednesday'
16. cycle_type valid values: 'weekend', 'midweek'
17. settings table controls active cycle and cutoffs — read server-side on customer menu page
18. dish_name on order_items and special_name on order_specials are implemented — populate at checkout and use snapshot values for historical displays
19. menu_items.name is NOT a reliable historical record — it changes weekly. Never use it for historical order analysis once dish_name snapshot is live
20. No currency prefix in displayed text anywhere — numbers only, never "Ksh"
21. "With meat" is incorrect — use "with protein" in all category headings and displayed text
22. The menu page styling bug was fixed with the server/client component split. Preserve that architecture.
23. The order ref generator uses MAX across all order_refs — never sort by created_at as that caused duplicate ref bugs
24. specials must check is_active = true before displaying on customer menu — do not show inactive specials
25. No `<hr>`, `borderTop`, or `borderBottom` dividers as section separators in customer UI — use margin spacing only. Row borders are allowed only where the pattern explicitly requires list rows, such as protein add-ons.
26. Prices always use `--text-primary` — never use green tokens such as `--brand-green`, `--brand-green-soft`, `--brand-green-hover`, or `--accent-forest` for prices.
27. Allergen and feature chips must spell out full words — no abbreviations, single-letter chips, or icon-only chips. Allergen and spicy chips use terracotta outline; non-risk feature chips use `--surface-sunken` and `--text-secondary`.
