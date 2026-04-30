# Mali's Meals — Master Handoff (April 2026)

## Project identity

| | |
|---|---|
| Local path | `C:\Users\user\OneDrive\Documents\mali-meals` |
| Live URL | https://www.malismeals.com |
| GitHub | https://github.com/akigera10/mali-meals |
| Supabase project ID | ouolrgndrqsbjkopsdso |
| Supabase region | eu-west-2 (London) |
| Local dev | `npm run dev` → http://localhost:3000 (or next available port) |
| Deploy | `git push` to main → Vercel auto-deploys in ~60 seconds |

---

## Stack (non-negotiable)

- **Framework:** Next.js 14 App Router
- **Language:** TypeScript
- **Styling:** Inline `style={}` props using CSS custom properties — NO Tailwind classes in components ever
- **Database:** Supabase (`@supabase/supabase-js` v2)
- **Email:** Resend (`resend` package) — domain verified, sending from orders@malismeals.com
- **Deployment:** Vercel

---

## Critical config notes

- `typescript.ignoreBuildErrors: true` is set in `next.config.mjs` — never remove this
- `"strict": false` in `tsconfig.json`
- RLS is fully enabled on all tables — see Security section for policy details
- `revalidate = 0` on admin pages — forces fresh data on every load
- Admin auth uses Supabase Auth — not cookie-based password gate
- All admin Supabase operations use `createAdminClient()` with service role key
- All public Supabase operations use `createServerClient()` with anon key

---

## Design system (non-negotiable)

**Fonts** — loaded via `next/font/google` in `app/layout.tsx`:
- `--font-fraunces` — display text, dish names, prices, headings, order refs
- `--font-inter` — body copy, buttons, labels, inputs, everything else

**CSS custom properties** (defined in `app/globals.css`):

```
--surface-base: #FBF7F0       page background
--surface-raised: #FFFFFF     cards, inputs
--surface-sunken: #F3EDE1     badges, inactive states
--text-primary: #1F1B16       headings, dish names
--text-secondary: #5C554A     body copy, descriptions
--text-tertiary: #8B8375      labels, hints, muted text
--brand-gold: #C8872E         primary buttons, accents
--brand-gold-dark: #A26B1E    hover states
--brand-gold-soft: #F5E3C0    selected state backgrounds
--accent-forest: #3F5A3C      delivered/paid status badge
--accent-terracotta: #B5533C  allergen badges, errors, urgent states
--border: rgba(31,27,22,0.10)
--border-strong: rgba(31,27,22,0.22)
```

**Rules:**
- No shadows anywhere
- 8px border radius on cards and inputs
- Customer pages: max-width 600px centered
- Admin pages: max-width 960px centered
- All styling inline `style={}` — never Tailwind classes in components

---

## File structure

```
mali-meals/
├── app/
│   ├── admin/
│   │   ├── deliveries/
│   │   │   └── page.tsx               ← Deliveries tab (zone-grouped view)
│   │   ├── kitchen/
│   │   │   └── page.tsx               ← Kitchen tab
│   │   ├── login/
│   │   │   └── page.tsx               ← Supabase Auth login form
│   │   ├── menu/
│   │   │   └── page.tsx               ← Menu management
│   │   ├── orders/
│   │   │   └── [id]/
│   │   │       └── page.tsx           ← Individual order detail page
│   │   ├── payments/
│   │   │   └── page.tsx               ← Payments reconciliation page
│   │   ├── packing-slips/
│   │   │   ├── page.tsx               ← Server component, data fetching
│   │   │   └── PackingSlipsClient.tsx ← Client component, print layout
│   │   ├── settings/
│   │   │   └── page.tsx               ← Admin settings page (to be built)
│   │   ├── components/
│   │   │   └── AdminNav.tsx           ← Shared nav: Orders|Menu|Kitchen|Deliveries|Payments|Settings
│   │   ├── OrdersClient.tsx           ← Orders list (read-only badges, clickable refs)
│   │   └── page.tsx                   ← Orders page with status cards
│   ├── api/
│   │   ├── generate-order-ref/
│   │   │   └── route.ts               ← Server-side order ref generation using createAdminClient()
│   │   ├── send-confirmation/
│   │   │   └── route.ts               ← Resend confirmation email (fire and forget)
│   │   └── send-dispatch/
│   │       └── route.ts               ← Resend dispatch notification email
│   ├── checkout/
│   │   ├── CheckoutClient.tsx         ← Two-step checkout UI
│   │   └── page.tsx
│   ├── components/
│   │   └── MenuClient.tsx             ← Customer menu + cart
│   ├── context/
│   │   └── CartContext.tsx            ← Cart state + form state
│   ├── globals.css                    ← All CSS custom properties
│   ├── layout.tsx                     ← Root layout, fonts, CartProvider
│   └── page.tsx                       ← Home: fetches menu from Supabase
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
| name | text | changes weekly |
| description | text | changes weekly |
| category | text | 'mains' or 'salads' |
| base_price | integer | 995 mains, 580 salads — never changes |
| meat_upgrade_price | integer | always 300, null if no meat |
| meat_upgrade_type | text | 'beef', 'chicken', 'both', or null |
| is_active | boolean | false = hidden |
| is_sold_out | boolean | |
| sort_order | integer | 1–4 per category |
| allergens | text[] | ['dairy','nuts','soy','coconut'] |
| is_freezer_friendly | boolean | |
| is_spicy | boolean | |
| is_family_friendly | boolean | |
| available_weekend | boolean | shows on weekend cycle menu — default true — to be added |
| available_midweek | boolean | shows on midweek cycle menu — default true — to be added |

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
| is_active | boolean | false = hidden from menu |
| is_sold_out | boolean | |
| created_at | timestamptz | |

**`orders`**
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_ref | text | MAL-1000, MAL-1001… generated server-side |
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
| delivery_date | date | specific delivery date e.g. 2026-05-04 — to be added |
| cycle_type | text | 'weekend' or 'midweek' — to be added |
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
| quantity | integer | |
| variant | text | 'vegetarian' or 'meat' ONLY |
| meat_type | text | 'beef', 'chicken', or null — already exists in DB |
| unit_price | integer | |
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
| quantity | integer | |
| unit_price | integer | price snapshot |
| created_at | timestamptz | |

**`settings`** ← to be created
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| active_cycle | text | 'weekend' or 'midweek' |
| weekend_cutoff | timestamptz | Friday 2pm EAT e.g. 2026-05-08 14:00:00+03 |
| midweek_cutoff | timestamptz | Tuesday 5pm EAT e.g. 2026-05-12 17:00:00+03 |
| next_sunday_date | date | upcoming Sunday delivery |
| next_monday_date | date | upcoming Monday delivery |
| next_wednesday_date | date | upcoming Wednesday delivery, nullable |
| whatsapp_group_link | text | customer WhatsApp group URL |
| updated_at | timestamptz | |

One row only. Mali updates weekly from admin settings page.

---

## Business rules

### Delivery cycles

**Cycle 1 — Weekend**
- Menu goes out: Wednesday
- Orders open: Wednesday
- Orders close: Friday 2pm EAT
- Delivery days: Sunday and Monday

**Cycle 2 — Midweek (piloting from 6 May 2026)**
- Menu goes out: Monday
- Orders open: Monday
- Orders close: Tuesday 5pm EAT
- Delivery day: Wednesday

Both cycles may share the same menu or have different menus — controlled per dish via available_weekend and available_midweek toggles in admin menu management. Only one cycle is open for ordering at any time.

### Delivery zones and fees

| Zone | Fee | Areas |
|---|---|---|
| Zone 1 | Ksh 300 | Lavington, Kilimani, Kileleshwa, Hurlingham |
| Zone 2 | Ksh 350 | Riverside, Westlands, Parklands, Peponi |
| Zone 3 | Ksh 450 | Lower Kabete, Loresho, Kitisuru, Nyari, Pangani, Ngara, Muthaiga |
| Zone 4 | Ksh 500 | Karen, Roselyn, Runda, Gigiri, Garden Estate, Langata Road |

Free delivery: orders above Ksh 5,000 get Sunday 5–10pm free.

### Payment model

Payment is collected BEFORE dispatch. Mali confirms order, sends payment request to customer. Customer pays via M-Pesa. Rider dispatches after payment confirmed. M-Pesa code captured when marking order as paid.

### Order ref

MAL-1000, MAL-1001... generated server-side via /api/generate-order-ref using createAdminClient(). Never generated client-side or via anon key.

---

## Order status workflow

```
NEW → CONFIRMED → DISPATCHED → DELIVERED
                → CANCELLED (any stage except delivered)
```

- **NEW** — order just placed, Mali hasn't reviewed it
- **CONFIRMED** — Mali has reviewed, added to cooking plan
- **DISPATCHED** — rider has left. Payment must be confirmed first.
- **DELIVERED** — customer received it
- **CANCELLED** — can be cancelled at new/confirmed/dispatched

---

## Delivery date model

### Core principle

Every order is anchored to a specific delivery_date (a real calendar date e.g. 2026-05-04). Not an abstract week window. All admin filtering is by delivery date.

### Why this matters

- Mali opens the admin on Wednesday morning — she sees orders for the next upcoming delivery date by default
- Old orders are hidden unless she explicitly looks for them
- Wednesday deliveries are just another delivery date — no special handling needed
- The week window concept (Fri 2pm → Fri 2pm) has been retired

### Admin filtering model

Orders page, Kitchen tab, Deliveries tab, and Payments page all filter by delivery_date. Default view shows next upcoming delivery date. Date selector shows upcoming delivery dates. All orders and date range available for history.

### Pending schema changes

```sql
ALTER TABLE orders ADD COLUMN delivery_date date;
ALTER TABLE orders ADD COLUMN cycle_type text
  CHECK (cycle_type IN ('weekend', 'midweek')) DEFAULT 'weekend';
ALTER TABLE menu_items ADD COLUMN available_weekend boolean DEFAULT true;
ALTER TABLE menu_items ADD COLUMN available_midweek boolean DEFAULT true;

CREATE TABLE settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  active_cycle text CHECK (active_cycle IN ('weekend', 'midweek')),
  weekend_cutoff timestamptz,
  midweek_cutoff timestamptz,
  next_sunday_date date,
  next_monday_date date,
  next_wednesday_date date,
  whatsapp_group_link text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read settings"
ON settings FOR SELECT USING (true);
```

---

## Order cutoff — customer side

When a customer visits the menu page the app checks current time against the active cycle's cutoff timestamp.

- Current time < cutoff → show menu, ordering open
- Current time > cutoff → show ordering closed message, hide menu

All cutoff calculations must use Africa/Nairobi timezone (EAT, UTC+3). Never use server timezone or UTC directly for cutoff comparisons.

Closed message shown to customer:

```
Orders are currently closed.
Weekend orders open Wednesday and close Friday at 2pm.
Next delivery: Sunday [date] and Monday [date].
Join our WhatsApp group to get notified when orders open → [link]
```

WhatsApp group link stored in settings table.

---

## Menu availability model

Each menu item has two availability flags — one per cycle. Allows same menu for both cycles or completely different menus per cycle.

- active_cycle = 'weekend' → show dishes where available_weekend = true
- active_cycle = 'midweek' → show dishes where available_midweek = true

In admin menu management each dish has two extra toggles: Available for weekend delivery and Available for midweek delivery. Same menu for both cycles means both toggles ON for every dish.

---

## Admin settings page — /admin/settings (to be built)

Mali updates weekly:
- Active cycle toggle: Weekend / Midweek
- Weekend cutoff: date and time picker (defaults Friday 2pm EAT)
- Midweek cutoff: date and time picker (defaults Tuesday 5pm EAT)
- Next Sunday delivery date
- Next Monday delivery date
- Next Wednesday delivery date (shown only when midweek active)
- WhatsApp group link

Mali's weekly workflow:
1. Wednesday morning — switch to Weekend, set Friday 2pm cutoff, set next Sunday and Monday delivery dates
2. Friday after 2pm — ordering closes automatically
3. Monday morning — switch to Midweek, set Tuesday 5pm cutoff, set next Wednesday delivery date
4. Tuesday after 5pm — ordering closes automatically

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

Top nav bar: **Orders | Menu | Kitchen | Deliveries | Payments | Settings**

Settings page not yet built — see builds in progress item 13.

### Orders page `/admin`

- Four status cards at top: New, Confirmed, Dispatched, Delivered — clickable to filter list
- Clean order list — ref (gold, clickable), customer, phone, delivery day/zone, total, payment badge, status badge
- X new orders indicator in brand-gold when unreviewed orders exist

### Order detail page `/admin/orders/[id]`

- Full order breakdown: customer, delivery, items in MAINS / SALADS / CHEF'S SPECIAL / PROTEIN ADD-ONS
- Meat type displays correctly: With chicken / With beef / Vegetarian
- Admin notes textarea — saves on blur
- Print slip button — links to /admin/packing-slips?order=[id]
- Workflow buttons conditional on status:
  - New → Confirm order
  - Confirmed → Mark dispatched
  - Dispatched → Mark delivered
  - Delivered → no further actions
  - Cancel button on new/confirmed/dispatched

### Menu page `/admin/menu`

- 4 mains + 4 salads — editable name, description, meat option, allergen toggles, flag toggles, sold out toggle, save button
- Chef's special card — name, description, price, active toggle, sold out toggle
- Protein add-ons section
- Available weekend / available midweek toggles per dish — to be added

### Kitchen tab `/admin/kitchen`

- Week selector — to be replaced with delivery date selector
- Sunday/Monday/All filter — Wednesday to be added
- Cooking summary with meat type breakdown per dish
- Chef's special section
- Protein add-ons section

### Deliveries tab `/admin/deliveries`

- Sunday/Monday toggle — Wednesday to be added
- Week selector — to be replaced with delivery date selector
- Orders grouped by zone with zone heading, order count, total Ksh
- Each order shows ref (clickable), customer, address, slot, total, status badges
- Print packing slips button
- Print delivery manifest button

### Payments page `/admin/payments`

- Week selector — to be replaced with delivery date selector
- Summary: total paid, total revenue, total unpaid
- Table: date paid, order ref, customer, phone, zone, food total, delivery fee, total, M-Pesa code
- Week totals: food subtotal, delivery total, combined total
- Print button

### Packing slips `/admin/packing-slips`

- Batch mode: ?day=sunday&week= — all orders for that day
- Single mode: ?order=[id] — one order
- Client-side JS measurement bins slips by height and packs into A4 pages
- Black and white safe — payment status uses weight and borders not color
- Meat type displays correctly on slips

---

## What is built and working

| Feature | Status |
|---|---|
| Customer menu page — dishes, badges, cart | ✅ Working |
| Chef's special on customer menu | ✅ Working |
| Two-step checkout — form, validation, review | ✅ Working |
| Order submission to Supabase | ✅ Working |
| Order ref generated server-side via /api/generate-order-ref | ✅ Working |
| Order items split into MAINS/SALADS/CHEF'S SPECIAL/PROTEIN ADD-ONS | ✅ Working |
| Meat type (beef/chicken) displayed throughout admin | ✅ Working |
| Order confirmation email — orders@malismeals.com | ✅ Working |
| Dispatch notification email — orders@malismeals.com | ✅ Working |
| Reply-to — orders@malismeals.com routes to Zoho Mail inbox | ✅ Working |
| Domain — www.malismeals.com live on Vercel | ✅ Working |
| Admin login — Supabase Auth email/password | ✅ Working |
| Admin sign out button | ✅ Working |
| Forgot password on login page | ✅ Working |
| Show/hide password toggle on login page | ✅ Working |
| Admin orders list with status cards | ✅ Working |
| Order detail page with workflow buttons | ✅ Working |
| Admin menu management | ✅ Working |
| Kitchen tab | ✅ Working — delivery date filter pending |
| Deliveries tab — zone grouped view | ✅ Working — delivery date filter pending |
| Payments reconciliation page | ✅ Working — delivery date filter pending |
| Packing slips — batch and single print | ✅ Working |
| RLS — all tables fully configured | ✅ Complete |
| Admin client — service role key for all admin operations | ✅ Complete |

---

## Security

### Completed

- Supabase Auth — email/password login, session management, sign out
- RLS full audit — all 7 tables configured with correct policies
- Admin client — createAdminClient() uses service role key server-side
- Public client — createServerClient() uses anon key, insert-only on order tables
- Order ref generation — server-side only, never via anon key

### RLS policies in place

```
menu_items        — public SELECT only
specials          — public SELECT only
protein_addons    — public SELECT only
orders            — public INSERT only
order_items       — public INSERT only
order_item_addons — public INSERT only
order_specials    — public INSERT only
settings          — public SELECT only (to be added when table is created)
```

### Must complete before public launch

**Server-side validation on order submission**

Checkout validation currently exists only in CheckoutClient.tsx (browser). Mirror all validation server-side in the order submission API route:
- Required fields: name, phone, email, address, zone, delivery_day
- Zone must be integer 1-4
- delivery_day must be 'sunday', 'monday', or 'wednesday'
- Items must exist in database and be active, not sold out
- Quantities must be positive integers
- Prices must match database values — never trust client-submitted prices

**Rate limiting on order submission**

Use upstash/ratelimit with free Upstash Redis instance. Limit: 10 order submissions per IP per hour.

---

## Known issues

### Issue 1 — Delivery date model not yet built (PRIORITY)

All admin pages still use abstract week window (Fri 2pm → Fri 2pm). Must be replaced with delivery_date based filtering. See builds in progress item 13.

### Issue 2 — Wednesday delivery not yet built

Midweek cycle piloting from 6 May 2026. Depends on item 13. See builds in progress item 14.

### Issue 3 — Payment flow mismatch

Current app captures M-Pesa at delivery. Real business collects before dispatch. Rework specced in item 15.

### Issue 4 — Menu availability toggles not yet built

available_weekend and available_midweek columns need to be added to menu_items and wired into menu management page and customer menu. Part of item 13.

### Issue 5 — Settings page not yet built

Admin has no way to manage active cycle, cutoffs, or delivery dates. Part of item 13.

### Issue 6 — Orders page shows all orders with no date filter

Mali cannot easily see just this week's orders. Fixed by item 13.

---

## Builds in progress / next to build

### 1. Kitchen tab redesign (PRIORITY)

**Section 1 — Week snapshot**

Two side-by-side cards for Sunday and Monday (Wednesday when midweek active). Each shows: date, total orders, total revenue, count of unconfirmed orders (in brand-gold). Clicking a card filters the cooking summary below.

**Section 2 — Cooking summary**

Grouped by dish with variants indented:

```
MAINS — 12 portions total
━━━━━━━━━━━━━━━━━━━━━━━━
Pad kra pow rice bowl
  Vegetarian     ●●●○○  3
  With chicken   ●●○○○  2
  With beef      ●○○○○  1
                 ───────
                 Total  6
```

Filled dots (●) in brand-gold for ordered portions, empty (○) for context up to 5. If more than 5, just show the number. MAINS and SALADS as separate sections with totals. Chef's special and protein add-ons below.

**Section 3 — Unconfirmed orders**

Compact list of NEW status orders. Confirm button inline — clicking confirms without navigating away. Hidden when count is 0. Heading in accent-terracotta when orders need attention.

Print button — prints cooking summary only as a prep sheet.

### 2. Packing slips ✅ BUILT

Built and working. One slip per order. Accessible from:
- Deliveries tab — Print packing slips button for all orders on selected day
- Order detail page — Print slip button for individual orders
- Page at /admin/packing-slips — batch mode (?day=sunday&week=) or single (?order=id)

Print layout uses client-side JS measurement to bin slips by height and pack into A4 pages. Black and white safe — payment status uses weight and borders not color.

### 3. Customer tab `/admin/customers`

Not yet built. No new tables needed — all data exists in orders table.

What it should show:
- List of all unique customers (by phone number or email)
- Each customer: name, phone, email, total orders, total spent, last order date, delivery zone, common allergens
- Clicking a customer shows their full order history
- Useful for identifying loyal customers, understanding preferences, following up on unpaid orders

### 4. Logout button ✅ RESOLVED

Built as part of Supabase Auth — Sign out button in AdminNav.

### 5. Email notification to Mali on new order

When a customer places an order, send Mali an email at orders@malismeals.com with the order summary. Third email template alongside customer confirmation and dispatch notification. Not yet built.

### 6. Supabase Auth ✅ COMPLETE

Email/password login, session management, sign out, forgot password, show/hide password toggle. Admin user: orders@malismeals.com.

### 7. RLS full audit ✅ COMPLETE

All 7 tables configured. See Security section for full policy list.

### 8. Rate limiting on admin login ✅ NOT NEEDED

Supabase Auth handles brute force protection natively.

### 9. Server-side validation on order submission

Checkout validation exists only in browser. Must be mirrored server-side before public launch. See Security section for full spec.

### 10. Rate limiting on order submission

After public launch. Use upstash/ratelimit, 10 orders per IP per hour.

### 11. Domain connection ✅ COMPLETE

www.malismeals.com and malismeals.com both live on Vercel. DNS managed via Zoho Domains.

### 12. M-Pesa STK Push — IntaSend integration (FUTURE PHASE)

Replace manual payment collection with automated STK Push. When Mali clicks Request payment on an order, the app sends an M-Pesa payment prompt directly to the customer's phone. Customer enters PIN, payment confirmed automatically, order status updates to paid.

Prerequisites before building:
- Mali needs a registered M-Pesa till number or paybill (business account)
- Create IntaSend account at payment.intasend.com
- For testing: sandbox account at sandbox.intasend.com — no real money, reversals within 48hrs, test number 254708374149

What to build:
- New API route: /api/request-payment — triggers IntaSend STK Push using order's customer_phone and total_amount
- Request payment button on order detail page — visible on confirmed orders with payment_status unpaid
- Webhook endpoint: /api/intasend-webhook — receives payment confirmation from IntaSend, updates order payment_status to paid and paid_at timestamp
- New order status step: payment_requested — sits between confirmed and dispatched in the workflow

Environment variables to add:

```
INTASEND_PUBLISHABLE_KEY=
INTASEND_SECRET_KEY=
```

Dependencies: intasend-node package, ngrok for local webhook testing

### 13. Delivery date model — replace week windows (DO THIS NEXT)

Retire the abstract week window (Fri 2pm → Fri 2pm) and replace with explicit delivery dates throughout the admin.

Schema changes to run in Supabase SQL Editor:

```sql
ALTER TABLE orders ADD COLUMN delivery_date date;
ALTER TABLE orders ADD COLUMN cycle_type text
  CHECK (cycle_type IN ('weekend', 'midweek')) DEFAULT 'weekend';
ALTER TABLE menu_items ADD COLUMN available_weekend boolean DEFAULT true;
ALTER TABLE menu_items ADD COLUMN available_midweek boolean DEFAULT true;

CREATE TABLE settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  active_cycle text CHECK (active_cycle IN ('weekend', 'midweek')),
  weekend_cutoff timestamptz,
  midweek_cutoff timestamptz,
  next_sunday_date date,
  next_monday_date date,
  next_wednesday_date date,
  whatsapp_group_link text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read settings"
ON settings FOR SELECT USING (true);
```

After running schema changes, populate delivery_date on existing orders:

```sql
UPDATE orders SET
  delivery_date = CASE
    WHEN delivery_day = 'sunday'
      THEN DATE(created_at AT TIME ZONE 'Africa/Nairobi') +
           ((7 - EXTRACT(DOW FROM created_at AT TIME ZONE 'Africa/Nairobi')::int) % 7)
    WHEN delivery_day = 'monday'
      THEN DATE(created_at AT TIME ZONE 'Africa/Nairobi') +
           ((8 - EXTRACT(DOW FROM created_at AT TIME ZONE 'Africa/Nairobi')::int) % 7)
    ELSE DATE(created_at AT TIME ZONE 'Africa/Nairobi')
  END,
  cycle_type = 'weekend'
WHERE delivery_date IS NULL;
```

What to build:
- Admin settings page /admin/settings — active cycle toggle, cutoff date/time pickers, next delivery dates, WhatsApp link
- Orders page — filter by delivery_date, default to next upcoming delivery date, hide old orders by default
- Kitchen tab — filter by delivery_date, add Wednesday card alongside Sunday and Monday
- Deliveries tab — filter by delivery_date, add Wednesday option
- Payments page — filter by delivery_date
- Customer checkout — set delivery_date and cycle_type on order submission
- Customer menu page — read settings table server-side, filter dishes by active cycle, show ordering closed message when cutoff has passed using Africa/Nairobi timezone
- Admin menu management — add available_weekend and available_midweek toggles per dish

### 14. Wednesday delivery — midweek cycle (after item 13)

Depends on delivery date model being in place first.

What to build:
- Wednesday delivery option in customer checkout
- Kitchen tab Wednesday card
- Deliveries tab Wednesday option
- Order cutoff logic for Tuesday 5pm EAT

### 15. Payment flow rework (after item 13)

Update order workflow to reflect real business model:

```
NEW → CONFIRMED → PAYMENT REQUESTED → PAID → DISPATCHED → DELIVERED
```

- Add payment_requested to valid order_status values
- M-Pesa code captured when marking as paid not delivered
- Dispatch button only available after payment confirmed
- Pairs with M-Pesa STK Push (item 12) for full automation

---

## Real-world context

The developer placed a real order with Mali's Meals via Google Form to understand the actual customer and delivery experience.

Key observations:
- Payment is collected BEFORE dispatch — Godrick messages each customer on WhatsApp/iMessage with the bill and his personal M-Pesa number. Customer pays, then rider dispatches.
- No order confirmation is sent by the current system — customer has no paper trail. This caused a dispute over what was ordered.
- The Google Form is the current ordering system — this web app replaces it.
- Mali uses WhatsApp heavily for customer and rider communication.
- Riders cover specific zones — assignment not tracked in system yet, future phase.
- Mali is piloting Wednesday delivery from 6 May 2026 with a potentially different menu to the weekend cycle.

---

## Environment variables

### Vercel (already set)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
ADMIN_PASSWORD
MALI_PHONE
```

### Local `.env.local`

```
NEXT_PUBLIC_SUPABASE_URL=https://ouolrgndrqsbjkopsdso.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Supabase dashboard>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard — never commit this>
RESEND_API_KEY=<from resend.com>
ADMIN_PASSWORD=<deprecated — remove after Supabase Auth confirmed in production>
MALI_PHONE=+254708470580
```

---

## How to start a new session

### Claude Code (for building)

```bash
cd C:\Users\user\OneDrive\Documents\mali-meals
claude
```

Say: "Read the HANDOFF.md file in this project. Then I want to work on [specific feature]."

### New chat window (for planning and prompts)

Paste this entire document and say what you want to work on.

### Key rules to remind any AI before touching code

1. All styling must use inline `style={}` with CSS custom properties — no Tailwind classes in components ever
2. Check existing files like `app/components/MenuClient.tsx` for the styling pattern
3. Do not remove `typescript.ignoreBuildErrors: true` from `next.config.mjs`
4. The variant column on order_items is 'vegetarian' or 'meat' ONLY. meat_type is a separate column — 'beef', 'chicken', or null. Always display both together when showing order items.
5. Chef's special items use the specials table and order_specials table — never menu_items or order_items
6. Cart items with `special:` prefix are chef's specials — always display in their own section
7. Payment is collected BEFORE dispatch in the real business. Do not change the payment flow without explicit instruction.
8. Order status values: 'new', 'confirmed', 'dispatched', 'delivered', 'cancelled' — never use 'pending' or 'out_for_delivery'
9. Email sender is orders@malismeals.com — never revert to onboarding@resend.dev
10. Never hardcode email addresses or phone numbers — always use environment variables
11. Admin operations must use `createAdminClient()` from `lib/supabase.ts` — never use `createServerClient()` or the browser client for admin data operations
12. Public operations (customer menu, checkout) must use `createServerClient()` with anon key — never `createAdminClient()`
13. Order ref generation is server-side only via `/api/generate-order-ref` — never generate client-side or query orders table from browser
14. All time and cutoff calculations must use Africa/Nairobi timezone (EAT, UTC+3) — never server timezone or raw UTC
15. delivery_day valid values: 'sunday', 'monday', 'wednesday'
16. cycle_type valid values: 'weekend', 'midweek'
17. The settings table controls active cycle and cutoffs — read it server-side on the customer menu page to determine what to show
