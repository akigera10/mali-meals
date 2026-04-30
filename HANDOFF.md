# Mali's Meals — Master Handoff (April 2026)

## Project identity

| | |
|---|---|
| Local path | `C:\Users\user\OneDrive\Documents\mali-meals` |
| Live URL | https://mali-meals.vercel.app |
| GitHub | https://github.com/akigera10/mali-meals |
| Supabase project ID | ouolrgndrqsbjkopsdso |
| Supabase region | eu-west-2 (London) |
| Local dev | `npm run dev` → http://localhost:3000 (or 3001 if 3000 is in use) |
| Deploy | `git push` to main → Vercel auto-deploys in ~60 seconds |

---

## Stack (non-negotiable)

- **Framework:** Next.js 14 App Router
- **Language:** TypeScript
- **Styling:** Inline `style={}` props using CSS custom properties — NO Tailwind classes in components ever
- **Database:** Supabase (`@supabase/supabase-js` v2)
- **Email:** Resend (`resend` package) — not yet configured for production
- **Deployment:** Vercel

---

## Critical config notes

- `typescript.ignoreBuildErrors: true` is set in `next.config.mjs` — never remove this
- `"strict": false` in `tsconfig.json`
- RLS is partially enabled on some tables — policies added during development
- `revalidate = 0` on admin pages — forces fresh data on every load

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
│   │   │   └── page.tsx          ← Deliveries tab (zone-grouped view)
│   │   ├── kitchen/
│   │   │   └── page.tsx          ← Kitchen tab (redesigned)
│   │   ├── login/
│   │   │   └── page.tsx          ← Password gate
│   │   ├── menu/
│   │   │   └── page.tsx          ← Menu management
│   │   ├── orders/
│   │   │   └── [id]/
│   │   │       └── page.tsx      ← Individual order detail page
│   │   ├── payments/
│   │   │   └── page.tsx          ← Payments reconciliation page
│   │   ├── components/
│   │   │   └── AdminNav.tsx      ← Shared nav: Orders|Menu|Kitchen|Deliveries|Payments
│   │   ├── OrdersClient.tsx      ← Orders list (read-only badges, clickable refs)
│   │   └── page.tsx              ← Orders page with status cards
│   ├── api/
│   │   ├── admin-login/
│   │   │   └── route.ts          ← Sets admin_session cookie
│   │   └── send-confirmation/
│   │       └── route.ts          ← Resend email (fire and forget)
│   ├── checkout/
│   │   ├── CheckoutClient.tsx    ← Two-step checkout UI
│   │   └── page.tsx
│   ├── components/
│   │   └── MenuClient.tsx        ← Customer menu + cart
│   ├── context/
│   │   └── CartContext.tsx       ← Cart state + form state
│   ├── globals.css               ← All CSS custom properties
│   ├── layout.tsx                ← Root layout, fonts, CartProvider
│   └── page.tsx                  ← Home: fetches menu from Supabase
├── lib/
│   └── supabase.ts               ← supabase (browser) + createServerClient()
├── middleware.ts                  ← Protects /admin/* with admin_session cookie
├── .env.local                    ← Gitignored — local keys
├── next.config.mjs               ← typescript.ignoreBuildErrors: true
└── tsconfig.json                 ← strict: false
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

**`protein_addons`**
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| price | integer | KES |
| is_active | boolean | |
| is_sold_out | boolean | |
| sort_order | integer | |

**`specials`** ← added April 2026
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
| order_ref | text | MAL-1000, MAL-1001… |
| customer_name | text | |
| customer_phone | text | |
| customer_email | text | |
| delivery_address | text | formatted string |
| address_building | text | |
| address_street | text | |
| address_apartment | text | |
| address_landmark | text | nullable |
| delivery_zone | integer | 1–4 |
| delivery_day | text | 'sunday' or 'monday' |
| delivery_window | text | 'by_5pm', 'free_5_10pm', or slot value |
| delivery_slot | text | '12_2pm' etc, Monday only |
| subtotal | integer | food total only |
| delivery_fee | integer | |
| total_amount | integer | subtotal + delivery_fee |
| payment_status | text | 'unpaid' or 'paid' |
| order_status | text | 'new', 'confirmed', 'dispatched', 'delivered', 'cancelled' |
| mpesa_code | text | M-Pesa confirmation code — captured at delivery |
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
| variant | text | 'vegetarian' or 'meat' ONLY — no meat_type column |
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

**`order_specials`** ← added April 2026
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_id | uuid FK → orders | |
| special_id | uuid FK → specials | |
| quantity | integer | |
| unit_price | integer | price snapshot |
| created_at | timestamptz | |

---

## Business rules

| Rule | Value |
|---|---|
| Order cutoff | Friday 2pm |
| Delivery days | Sunday or Monday |
| Free delivery | Orders above Ksh 5,000 get Sunday 5–10pm free |
| Zone 1 | Ksh 300 — Lavington, Kilimani, Kileleshwa, Hurlingham |
| Zone 2 | Ksh 350 — Riverside, Westlands, Parklands, Peponi |
| Zone 3 | Ksh 450 — Lower Kabete, Loresho, Kitisuru, Nyari, Pangani, Ngara, Muthaiga |
| Zone 4 | Ksh 500 — Karen, Roselyn, Runda, Gigiri, Garden Estate, Langata Road |
| Delivery week | Friday 2pm to following Friday 2pm |
| Order ref | MAL-1000, MAL-1001… used as identifier |
| Payment model | Pay on delivery — M-Pesa code captured when marking delivered |

---

## Order status workflow

```
NEW → CONFIRMED → DISPATCHED → DELIVERED (+ payment captured)
                             → CANCELLED (any stage except delivered)
```

- **NEW** — order just placed, Mali hasn't reviewed it
- **CONFIRMED** — Mali has reviewed, added to cooking plan
- **DISPATCHED** — rider has left with the order
- **DELIVERED** — customer received it. M-Pesa code required to complete this step. Sets payment_status to 'paid' and saves paid_at and mpesa_code.

Payment is always collected on delivery. The M-Pesa confirmation code from the rider's phone is entered when marking delivered.

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
Top nav bar: **Orders | Menu | Kitchen | Deliveries | Payments**
No logout button yet — to add.

### Orders page `/admin`
- Four status cards at top: New, Confirmed, Dispatched, Delivered — clickable to filter list
- Clean order list — each row shows ref (gold, clickable), customer, phone, delivery day/zone, total, payment badge, status badge
- No expand/collapse — all detail on individual order page
- "X new orders" indicator in brand-gold when unreviewed orders exist

### Order detail page `/admin/orders/[id]`
- Full order breakdown: customer, delivery, items split into MAINS / SALADS / CHEF'S SPECIAL / PROTEIN ADD-ONS
- Admin notes textarea — saves on blur
- Workflow buttons conditional on status:
  - New → 'Confirm order'
  - Confirmed → 'Mark dispatched'
  - Dispatched → 'Mark delivered' (requires M-Pesa code — mandatory field)
  - Delivered → no further actions
  - Cancel button on new/confirmed/dispatched

### Menu page `/admin/menu`
- 4 mains + 4 salads each with editable name, description, meat option, allergen toggles, flag toggles, sold out toggle, save button
- Chef's special card — name, description, price, active toggle, sold out toggle
- Protein add-ons section

### Kitchen tab `/admin/kitchen`
- Week selector (Friday 2pm to Friday 2pm)
- Sunday/Monday/All filter
- Summary bar: orders, revenue, unpaid count
- Cooking summary: dishes grouped by name with variant breakdown and portion counts
- Chef's special section
- Protein add-ons section
- Popularity ranking
- **NOTE: Kitchen tab has been redesigned in latest session — see known issues**

### Deliveries tab `/admin/deliveries`
- Sunday/Monday toggle
- Week selector
- Orders grouped by zone with zone heading, order count, total Ksh
- Each order shows ref (clickable), customer, address, slot, total, status badges
- Print button for delivery manifest

### Payments page `/admin/payments`
- Week selector
- Summary: total paid, total revenue, total unpaid
- Table: date paid, order ref, customer, phone, zone, food total, delivery fee, total, M-Pesa code
- Week totals: food subtotal, delivery total, combined total
- Print button

---

## What is built and working

| Feature | Status |
|---|---|
| Customer menu page — dishes, badges, cart | ✅ Working |
| Chef's special on customer menu | ✅ Working |
| Two-step checkout — form, validation, review | ✅ Working |
| Order submission to Supabase | ✅ Working |
| Order items split into MAINS/SALADS/CHEF'S SPECIAL/PROTEIN ADD-ONS | ✅ Working |
| Email confirmation via Resend | ✅ Code done — not configured for production |
| Admin login — password gate, 7-day cookie | ✅ Working |
| Admin orders list with status cards | ✅ Working |
| Order detail page with workflow buttons | ✅ Working |
| M-Pesa code capture at delivery (mandatory) | ✅ Working |
| Admin menu management | ✅ Working |
| Kitchen tab | ✅ Built — needs redesign (see below) |
| Deliveries tab — zone grouped view | ✅ Working |
| Payments reconciliation page | ✅ Working |

---

## Known issues and next steps

### Known Issue 1 — Kitchen tab needs redesign (PRIORITY)
The current Kitchen tab is too flat and unintuitive. Full redesign spec below.
Not yet built.

### Known Issue 2 — No logout button
Admin has no way to log out. Will be resolved when Supabase Auth is implemented
(see Security section below).

### Known Issue 3 — Resend email (RESOLVED)
Domain malismeals.com verified on Resend. Both confirmation and dispatch emails
send from orders@malismeals.com to real customer emails. Reply-to is
orders@malismeals.com which routes to Zoho Mail inbox.

### Known Issue 4 — RLS partially configured
Before public launch — audit all tables and add proper read/write policies.
See Security section below.

### Known Issue 5 — No customer tab
Discussed but not yet built. Spec below. No new tables needed — all data
exists in orders table.

### Known Issue 6 — Payment flow does not reflect real business model
Current flow: NEW → CONFIRMED → DISPATCHED → DELIVERED (M-Pesa captured
at delivery). Real flow: payment is collected BEFORE dispatch — Godrick
messages customer with bill, customer pays via M-Pesa to personal number,
then rider dispatches. Flow rework specced for future phase.


---

## Builds in progress / next to build

Filled dots (●) in brand-gold for ordered portions, empty (○) for context up to 5. If more than 5, just show the number.
MAINS and SALADS as separate sections with totals.
Chef's special and protein add-ons below.

**Section 3 — Unconfirmed orders**
Compact list of NEW status orders. 'Confirm' button inline — clicking confirms without navigating away. Hidden when count is 0. Heading in accent-terracotta when orders need attention.

Print button — prints cooking summary only as a prep sheet.

### 2. Packing slips ✅ BUILT
Built and working. One slip per order. Accessible from:
- Deliveries tab — "Print packing slips" button for all orders on selected day
- Order detail page — "Print slip" button for individual orders
- Page at /admin/packing-slips — batch mode (?day=sunday&week=) or single (?order=id)

Print layout uses client-side JS measurement to bin slips by height and pack
into A4 pages. Black and white safe — payment status uses weight and borders
not color.

### 3. Customer tab `/admin/customers`
Not yet built. Purpose: Mali needs to see who her repeat customers are,
their order history, and their preferences.

**What it should show:**
- List of all unique customers (by phone number or email)
- Each customer: name, phone, email, total orders, total spent, last order
  date, delivery zone, common allergens
- Clicking a customer shows their full order history
- Useful for: identifying loyal customers, understanding preferences,
  following up on unpaid orders

**Database:** No new tables needed — all data exists in orders table.
Query distinct customers and aggregate.

### 4. Logout button
Resolved when Supabase Auth is implemented — signOut() replaces the
cookie clear. Do not build as a standalone feature.

### 5. Email notification to Mali on new order
When a customer places an order, send Mali an email at orders@malismeals.com
with the order summary. Uses existing Resend setup. Third email template
alongside customer confirmation and dispatch notification.
Not yet built.

### 6. Supabase Auth — replace cookie auth (DO THIS FIRST)
Replace the current password cookie system with proper Supabase Auth.

What to do:
- Create a Supabase Auth user for Mali in the Supabase dashboard
  (Authentication → Users → Add user). Use orders@malismeals.com as
  the email.
- Update /admin/login/page.tsx to use Supabase Auth signInWithPassword()
- Update middleware.ts to check Supabase session instead of admin_session
  cookie. Use @supabase/ssr — already in the stack.
- Remove /api/admin-login/route.ts — no longer needed
- Add logout button to AdminNav that calls Supabase signOut() and redirects
  to /admin/login
- Remove ADMIN_PASSWORD from all env files and Vercel once migration
  is confirmed working

### 7. RLS full audit (CRITICAL — before public launch)
Currently RLS is partially configured. Audit all tables in Supabase:
- menu_items, specials, protein_addons — public read only, no write
- orders, order_items, order_specials, order_item_addons — public insert
  only (customers placing orders), no read, no update, no delete from
  anon key
- Admin read/write must go through service role key server-side only
- Never expose service role key to the browser

### 8. Rate limiting on admin login (HIGH — before public launch)
After Supabase Auth is implemented, Supabase handles brute force protection
natively — no additional work needed.
If reverting to cookie auth for any reason: use upstash/ratelimit —
5 failed attempts, 15 minute lockout.

### 9. Server-side validation on order submission (HIGH — before public launch)
Checkout validation currently exists only in CheckoutClient.tsx (browser).
Mirror all validation server-side in the order submission API route:
- Required fields: name, phone, email, address, zone, delivery_day
- Zone must be integer 1-4
- delivery_day must be 'sunday' or 'monday'
- Items must exist in database and be active, not sold out
- Quantities must be positive integers
- Prices must match database values — never trust client-submitted prices

### 10. Rate limiting on order submission (after public launch)
Protects against fake order floods. Use upstash/ratelimit with free
Upstash Redis instance. Limit: 10 order submissions per IP per hour.

### 11. Domain connection — www.malismeals.com to Vercel (DO THIS NEXT)
Domain purchased at Zoho Domains. Add in Vercel dashboard → Settings →
Domains, then add the DNS records Vercel provides into Zoho Domains DNS
panel. Both www.malismeals.com and malismeals.com should point to Vercel.

### 12. M-Pesa STK Push — IntaSend integration (FUTURE PHASE)
Replace the current manual payment collection with automated STK Push.
When Mali clicks "Request payment" on an order, the app sends an M-Pesa
payment prompt directly to the customer's phone. Customer enters PIN,
payment confirmed automatically, order status updates to paid.

Prerequisites before building:
- Mali needs a registered M-Pesa till number or paybill (business account)
- Create IntaSend account at payment.intasend.com
- For testing: sandbox account at sandbox.intasend.com — no real money,
  reversals within 48hrs, test number 254708374149

What to build:
- New API route: /api/request-payment — triggers IntaSend STK Push using
  order's customer_phone and total_amount
- "Request payment" button on order detail page — visible on confirmed orders
  with payment_status 'unpaid'
- Webhook endpoint: /api/intasend-webhook — receives payment confirmation
  from IntaSend, updates order payment_status to 'paid' and paid_at timestamp
- New order status step: payment_requested — sits between confirmed and
  dispatched in the workflow

Environment variables to add:
INTASEND_PUBLISHABLE_KEY=
INTASEND_SECRET_KEY=

Dependencies:
- intasend-node package
- ngrok for local webhook testing

---

## Real-world context (important for understanding the business)

The developer placed a real order with Mali's Meals through their existing Google Form system to understand the actual customer and delivery experience. Key observations:

- **Payment is on delivery** — customers do not pay in advance. They pay the rider when food arrives via M-Pesa.
- **The Google Form is the current ordering system** — this web app is replacing it
- **Mali uses WhatsApp heavily** — for communicating with customers and riders
- **Rider assignment** — Mali has riders who cover specific zones. However the system does not need to track rider assignment for now — that's a future phase. The Deliveries tab grouped by zone is sufficient for now.
- **The weekly menu** — Mali finalises her menu each week, shares it as a WhatsApp poster and Google Form. The admin menu management page replaces the need to update Supabase manually.

---

## Environment variables

### Vercel (already set)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
RESEND_API_KEY
ADMIN_PASSWORD
MALI_PHONE
```

### Local `.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=https://ouolrgndrqsbjkopsdso.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Supabase dashboard>
RESEND_API_KEY=<from resend.com>
ADMIN_PASSWORD=<your chosen password>
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
1. All styling must use inline style={} with CSS custom properties — no Tailwind
   classes in components ever
2. Check existing files like app/components/MenuClient.tsx for the styling pattern
3. Do not remove typescript.ignoreBuildErrors: true from next.config.mjs
4. The variant column on order_items is strictly 'vegetarian' or 'meat' — there
   is NO meat_type column
5. Chef's special items use the specials table and order_specials table — never
   menu_items or order_items
6. Cart items with special: prefix are chef's specials — always display in their
   own section
7. Payment is collected before dispatch in the real business — M-Pesa code capture
   at delivery is the current app model but does not reflect reality. Do not
   change the payment flow without explicit instruction.
8. Order status values are: 'new', 'confirmed', 'dispatched', 'delivered',
   'cancelled' — never use 'pending' or 'out_for_delivery'
9. Email sender is orders@malismeals.com — never revert to onboarding@resend.dev
10. Never hardcode email addresses or phone numbers — always use environment
    variables
11. Supabase Auth is being implemented to replace the cookie auth system —
    do not add new logic that depends on the admin_session cookie