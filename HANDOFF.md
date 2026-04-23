# Mali's Meals — Project Handoff

You are continuing development of Mali's Meals, a Next.js web app replacing a Google Form + WhatsApp meal ordering flow for a home-cooked meal-prep business in Nairobi. Read this entire document before touching any file.

---

## 1. Project identity

| | |
|---|---|
| Local path | `C:\Users\user\OneDrive\Documents\mali-meals` |
| Live URL | https://mali-meals.vercel.app |
| GitHub | https://github.com/akigera10/mali-meals |
| Supabase project ID | ouolrgndrqsbjkopsdso |
| Supabase region | eu-west-2 (London) |
| Supabase dashboard | https://supabase.com/dashboard/project/ouolrgndrqsbjkopsdso |
| Local dev | `npm run dev` → http://localhost:3000 |

---

## 2. Stack (non-negotiable, do not deviate)

- **Framework:** Next.js 14 with App Router
- **Language:** TypeScript
- **Styling:** Inline `style={}` props using CSS custom properties — NOT Tailwind classes in components. Tailwind tokens exist in `tailwind.config.ts` but are only used as a config layer. This is intentional to avoid JIT purging issues.
- **Database:** Supabase (`@supabase/supabase-js` v2)
- **Email:** Resend (`resend` package) — **must be installed: `npm install resend`**
- **Deployment:** Vercel (auto-deploys on every push to `main`)

---

## 3. File and folder structure

```
C:\Users\user\OneDrive\Documents\mali-meals\
├── app/
│   ├── api/
│   │   └── send-confirmation/
│   │       └── route.ts          ← POST handler: sends order confirmation email via Resend
│   ├── checkout/
│   │   ├── CheckoutClient.tsx    ← Full two-step checkout UI (client component)
│   │   └── page.tsx              ← Server component shell that renders CheckoutClient
│   ├── components/
│   │   └── MenuClient.tsx        ← Full menu page UI + cart interactions (client component)
│   ├── context/
│   │   └── CartContext.tsx       ← CartProvider + useCart hook — shared cart + form state
│   ├── fonts/                    ← Geist font files (unused scaffold remnant, harmless)
│   ├── favicon.ico
│   ├── globals.css               ← ALL CSS custom properties. Body bg + color. No component styles here.
│   ├── layout.tsx                ← Root layout: loads fonts, wraps app in CartProvider
│   └── page.tsx                  ← Server component: fetches menu_items + protein_addons from Supabase
├── lib/
│   └── supabase.ts               ← Exports: `supabase` (lazy browser client) + `createServerClient()` (server)
├── .env.local                    ← Gitignored. Local Supabase keys.
├── .eslintrc.json
├── .gitignore
├── HANDOFF.md                    ← This file
├── next-env.d.ts
├── next.config.mjs
├── package.json                  ← next@14.2.35, @supabase/supabase-js@^2 (resend needs to be added)
├── postcss.config.mjs
├── tailwind.config.ts            ← Font families + CSS vars as Tailwind tokens (not used in components)
└── tsconfig.json                 ← Path alias: @/* → ./*
```

---

## 4. Design system (non-negotiable, never override)

### Fonts

Loaded via `next/font/google` in `app/layout.tsx`, applied as CSS variables on `<html>`:

- `--font-fraunces` → Fraunces (serif) — display text, dish names, prices, section headings, quantity numbers, all totals, order reference
- `--font-inter` → Inter (sans-serif) — body copy, buttons, labels, descriptions, badges, inputs, form fields

**Rule:** Never use a font without referencing one of these two CSS variables.

### CSS custom properties (`app/globals.css`)

```css
--surface-base: #FBF7F0;         /* page background */
--surface-raised: #FFFFFF;       /* card / input background */
--surface-sunken: #F3EDE1;       /* badges, recessed areas */
--text-primary: #1F1B16;         /* headings, dish names, prices */
--text-secondary: #5C554A;       /* body copy, descriptions */
--text-tertiary: #8B8375;        /* labels, hints, muted text */
--brand-gold: #C8872E;           /* primary buttons, veg prices, accents */
--brand-gold-dark: #A26B1E;      /* button hover, selected card prices */
--brand-gold-soft: #F5E3C0;      /* gold tint backgrounds, selected radio cards */
--accent-forest: #3F5A3C;        /* available but unused so far */
--accent-terracotta: #B5533C;    /* allergen badges, error text/borders */
--border: rgba(31,27,22,0.10);   /* default card/divider borders */
--border-strong: rgba(31,27,22,0.22); /* input borders, sticky cart border */
```

### Other design rules

- No shadows anywhere
- 8px border radius on cards and inputs
- Generous whitespace: section gap 52px, card gap 12px
- Mobile-first single column, `max-width: 600px` centered
- Vegetarian prices: `--brand-gold`; meat prices: `--text-primary`
- Sold-out items: `opacity: 0.5`, "SOLD OUT" badge, price still visible, no add controls
- Error states: `border-color: #B5533C`, small error message below field in `#B5533C`
- All styling is inline `style={}` — no Tailwind classes inside component files

### Badge system (dish cards)

- Allergen badges: single letter pills — `D` (dairy), `N` (nuts), `S` (soy), `C` (coconut) — background `#B5533C`, white text
- Property badges: `❄` (freezer-friendly), `🌶` (mild spice) — background `#C8872E`, white text
- Tapping a badge toggles a tooltip line below the badge row with the full label
- "Great for families" — italic line in `--text-tertiary`, 13px Inter, no badge

---

## 5. Environment variables

### On Vercel (already set)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
RESEND_API_KEY
```

### Locally (`.env.local` in project root — gitignored)
```
NEXT_PUBLIC_SUPABASE_URL=https://ouolrgndrqsbjkopsdso.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Supabase dashboard → Settings → API → anon/public key>
RESEND_API_KEY=<from resend.com dashboard>
```

---

## 6. Database schema (Supabase, schema: public)

### Sequence
```sql
order_ref_seq   -- starts at 1000, generates MAL-1000, MAL-1001, etc.
```

### Table: `menu_items`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| name | text NOT NULL | |
| description | text | Full dish description |
| category | text NOT NULL | CHECK: 'mains' or 'salads' |
| base_price | integer NOT NULL | KES, vegetarian price |
| meat_upgrade_price | integer | Extra cost on top of base_price. NULL = no meat option |
| meat_upgrade_type | text | CHECK: 'beef', 'chicken', or 'both'. NULL if no meat option |
| is_active | boolean NOT NULL | default true. false = hidden from menu entirely |
| is_sold_out | boolean NOT NULL | default false |
| sort_order | integer NOT NULL | default 0 |
| allergens | text[] NOT NULL | default '{}'. Values: 'dairy', 'nuts', 'soy', 'coconut' |
| is_freezer_friendly | boolean NOT NULL | default false |
| is_spicy | boolean NOT NULL | default false |
| is_family_friendly | boolean NOT NULL | default false |
| created_at | timestamptz NOT NULL | default now() |

**Pricing rule:** `meat_upgrade_price` is the extra cost, not the full price. Full meat price = `base_price + meat_upgrade_price`. Always display the full price.

### Table: `protein_addons`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text NOT NULL | |
| price | integer NOT NULL | KES, full price |
| is_active | boolean NOT NULL | default true |
| is_sold_out | boolean NOT NULL | default false |
| sort_order | integer NOT NULL | default 0 |
| created_at | timestamptz NOT NULL | default now() |

### Table: `orders`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_ref | text NOT NULL UNIQUE | default 'MAL-' \|\| nextval('order_ref_seq') |
| customer_name | text NOT NULL | Full name (first + last concatenated) |
| customer_phone | text NOT NULL | |
| customer_email | text NOT NULL | default '' — **run migration below if not yet added** |
| delivery_address | text NOT NULL | Formatted multi-line string built from address fields |
| address_building | text | Building/estate name — **run migration below if not yet added** |
| address_street | text | Street address — **run migration below if not yet added** |
| address_apartment | text | Apartment/house number — **run migration below if not yet added** |
| address_landmark | text | Optional landmark — **run migration below if not yet added** |
| delivery_zone | integer NOT NULL | CHECK: 1–4 |
| delivery_day | text NOT NULL | CHECK: 'sunday' or 'monday' |
| delivery_window | text | 'by_5pm', 'free_5_10pm', or a slot value for Monday — **run migration below if not yet added** |
| delivery_slot | text | '12_2pm', '2_4pm', '4_6pm', '6_8pm' — only set when delivery_day='monday' — **run migration below if not yet added** |
| subtotal | integer NOT NULL | KES |
| delivery_fee | integer NOT NULL | KES |
| total_amount | integer NOT NULL | subtotal + delivery_fee |
| payment_status | text NOT NULL | default 'unpaid'. CHECK: 'unpaid' or 'paid' |
| order_status | text NOT NULL | default 'pending'. CHECK: 'pending', 'confirmed', 'out_for_delivery', 'delivered' |
| notes | text | nullable |
| created_at | timestamptz NOT NULL | default now() |
| updated_at | timestamptz NOT NULL | default now(), auto-updated by trigger |

### Table: `order_items`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_id | uuid NOT NULL | FK → orders(id) ON DELETE CASCADE |
| menu_item_id | uuid NOT NULL | FK → menu_items(id) |
| quantity | integer NOT NULL | CHECK > 0 |
| variant | text NOT NULL | CHECK: 'vegetarian' or 'meat' |
| unit_price | integer NOT NULL | KES, price snapshot at order time |
| created_at | timestamptz NOT NULL | default now() |

### Table: `order_item_addons`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_item_id | uuid NOT NULL | FK → order_items(id) ON DELETE CASCADE |
| addon_id | uuid NOT NULL | FK → protein_addons(id) |
| quantity | integer NOT NULL | default 1, CHECK > 0 |
| unit_price | integer NOT NULL | KES, price snapshot |
| created_at | timestamptz NOT NULL | default now() |

### Trigger
`orders_updated_at` — BEFORE UPDATE on orders, calls `set_updated_at()` → sets `new.updated_at = now()`.

### ⚠️ SQL migrations — run these in Supabase SQL Editor if not yet applied

Verify each column exists in the Table Editor first. Use `IF NOT EXISTS` to make all statements idempotent.

```sql
-- orders: new columns added during Phase 7/8 development
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email   text NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_building  text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_street    text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_apartment text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_landmark  text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_window   text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_slot     text;

-- menu_items: badge/property columns (may already exist)
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS allergens          text[]   NOT NULL DEFAULT '{}';
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_freezer_friendly boolean NOT NULL DEFAULT false;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_spicy            boolean NOT NULL DEFAULT false;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_family_friendly  boolean NOT NULL DEFAULT false;
```

---

## 7. Seeded menu data

### Mains — base_price: 995, meat_upgrade_price: 300

| sort_order | name | meat_upgrade_type | allergens | freezer | spicy | family |
|---|---|---|---|---|---|---|
| 1 | Pesto lasagna | beef | dairy, nuts | ✓ | | ✓ |
| 2 | Pie with onion gravy | chicken | dairy | ✓ | | ✓ |
| 3 | Schnitzel with fennel and orange slaw | chicken | coconut | ✓ | | ✓ |
| 4 | Quiche (Spanakopita-inspired) | chicken | dairy | ✓ | | ✓ |

### Salads — base_price: 580, meat_upgrade_price: 300

| sort_order | name | meat_upgrade_type | allergens | freezer | spicy | family |
|---|---|---|---|---|---|---|
| 1 | Tex-Mex-inspired crispy gnocchi | chicken | dairy | | | ✓ |
| 2 | Tostada | chicken | — | | ✓ | |
| 3 | Korean tofu salad | beef | soy | | ✓ | |
| 4 | Muhammara bowl | both | — | | | |

### Protein add-ons

| sort_order | name | price |
|---|---|---|
| 1 | Grilled chicken breast strips 200g | 275 |
| 2 | Seared beef fillet 150g | 350 |
| 3 | Grilled halloumi 100g | 250 |
| 4 | Feta 100g | 250 |
| 5 | Crispy tofu 200g | 180 |

---

## 8. Business rules

| Rule | Value |
|---|---|
| Order cutoff | Friday 2 pm for that week's delivery |
| Delivery days | Sunday or Monday |
| Free delivery threshold | Orders above Ksh 5,000 qualify for the Sunday 5–10pm free window |
| Zone 1 delivery fee | Ksh 300 — Lavington, Kilimani, Kileleshwa, Hurlingham |
| Zone 2 delivery fee | Ksh 350 — Riverside, Westlands, Parklands, Peponi |
| Zone 3 delivery fee | Ksh 450 — Lower Kabete, Loresho, Kitisuru, Nyari, Pangani, Ngara, Muthaiga |
| Zone 4 delivery fee | Ksh 500 — Karen, Roselyn, Runda, Gigiri, Garden Estate, Langata Road |
| Order ref format | MAL-1000, MAL-1001… (used as M-Pesa payment reference) |
| Admin password | Stored as `ADMIN_PASSWORD` env var, never in database |

---

## 9. Cart and context architecture

Cart state lives in `app/context/CartContext.tsx` as a React Context, wrapped around the app in `app/layout.tsx` via `<CartProvider>`. Cart and form state persist across client-side navigation but reset on full page refresh. This is intentional.

### `CartEntry` type

```ts
type CartEntry = {
  id: string
  name: string
  variant: 'vegetarian' | 'meat' | 'addon'
  meatType?: 'beef' | 'chicken' | 'both' | null  // set on all meat entries
  unitPrice: number
  quantity: number
}
```

### `SavedForm` type (persists checkout form values across menu ↔ checkout navigation)

```ts
type SavedForm = {
  firstName: string
  lastName: string
  phone: string
  email: string
  addrBuilding: string
  addrStreet: string
  addrApartment: string
  addrLandmark: string
  zone: string           // '1' | '2' | '3' | '4'
  deliveryDay: string    // 'sunday_5pm' | 'sunday_free' | 'monday'
  deliverySlot: string   // '12_2pm' | '2_4pm' | '4_6pm' | '6_8pm' — only used when deliveryDay='monday'
  notes: string
}
```

### Cart key formats

- `${dishId}:vegetarian` — vegetarian version of a dish
- `${dishId}:meat` — meat version (beef-only or chicken-only dishes)
- `${dishId}:meat:beef` — beef selection (only for `meat_upgrade_type = 'both'` dishes)
- `${dishId}:meat:chicken` — chicken selection (only for `meat_upgrade_type = 'both'` dishes)
- `addon:${addonId}` — protein add-on

### Muhammara bowl special case

`meat_upgrade_type = 'both'`. Tapping "Add" shows an inline `[Beef] [Chicken]` selector. Cart entry name becomes `"Muhammara bowl with beef"` or `"Muhammara bowl with chicken"`, variant `'meat'`, meatType `'beef'` or `'chicken'`.

---

## 10. Checkout flow (two-step)

**Step 1 — Details form:**

1. First name / Last name (side by side, collapses to single column on mobile)
2. Email address
3. Phone number (validates Kenyan `07...`/`01...` or international `+...` format)
4. Building/estate name, Street address, Apartment/house number, Landmark (optional)
5. Delivery zone — 4 radio cards (Zone 1–4). Cards show zone number + neighbourhoods only. No price on zone cards.
6. Delivery option — 3 radio cards:
   - **Sunday — by 5pm** (always shown) — shows zone delivery fee
   - **Sunday — 5–10pm** with "Free" badge (only shown when subtotal ≥ Ksh 5,000) — shows "Free"
   - **Monday** (always shown) — shows zone delivery fee. When selected, expands to show 4 time-slot pills: 12–2pm / 2–4pm / 4–6pm / 6–8pm. A slot must be selected to continue.
   - When no zone is selected, fee column shows "Select a zone first" in muted italic.
7. Order notes (optional)
8. "Continue to review →" button (validates all fields including Monday slot)

**Step 2 — Review:**

- Full order summary: dish name, variant label, qty × price, line total
- Add-ons section (if any)
- Subtotal / delivery / total
- Delivery details summary with "Edit" button (returns to step 1)
- "Place order" button → writes to Supabase, fires email, shows success screen

**Delivery data mapping (form → DB):**

```
form.deliveryDay = 'sunday_5pm'  → DB: delivery_day='sunday', delivery_window='by_5pm',      delivery_slot=null
form.deliveryDay = 'sunday_free' → DB: delivery_day='sunday', delivery_window='free_5_10pm', delivery_slot=null
form.deliveryDay = 'monday'      → DB: delivery_day='monday', delivery_window=<slot_value>,  delivery_slot=<slot_value>
```

**Variant label display (review screen + email):**

- Uses `entry.meatType` directly (`'beef'` → "with beef", `'chicken'` → "with chicken")
- Falls back to regex on `entry.name` for older cart entries lacking `meatType`

---

## 11. What is built and working

| Phase | Description | Status |
|---|---|---|
| 1 | Scaffold: Next.js 14, TypeScript, Tailwind, design system | ✅ Done |
| 2 | GitHub + Vercel deployment pipeline | ✅ Done |
| 3 | Supabase client utility (`lib/supabase.ts`) | ✅ Done |
| 4 | Database schema + menu seed data | ✅ Done |
| 5 | Public menu page: dish cards, badges, add-ons, sticky cart | ✅ Done |
| 6 | Checkout flow: two-step form, validation, review screen | ✅ Done |
| 7 | Order submission: Supabase insert, MAL-XXXX ref, success screen | ✅ Code done — **DB migrations may be blocking, see §12** |
| 8 | Email confirmation: Resend API route, HTML email template | ✅ Code done — **`npm install resend` + RESEND_API_KEY needed, see §12** |
| 9 | Admin order view: list orders, filter by status/date, mark paid | 🔲 Not started |
| 10 | Admin order actions: update status, manual notes | 🔲 Not started |
| 11 | Admin auth: password-based login using ADMIN_PASSWORD env var | 🔲 Not started |
| 12 | Production hardening: RLS policies, rate limiting, error handling | 🔲 Not started |

---

## 12. ⚠️ Known issues — fix these first

### Issue 1 — Order placement failing (BLOCKING)

**Symptom:** Clicking "Place order" shows "Something went wrong placing your order. Please try again."

**Root cause:** The `orders` table is missing columns that `CheckoutClient.tsx` tries to insert. The code is correct; the database is missing the columns.

**Fix:** Run the SQL migrations in §6 above. Every `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statement. After running, test by placing a test order. Open DevTools → Console to see detailed Supabase error output if it still fails (error logging is now in place).

### Issue 2 — Resend package not installed (BLOCKING for email)

**Symptom:** `app/api/send-confirmation/route.ts` imports from `'resend'` but the package is not in `package.json`.

**Fix:**
```bash
npm install resend
```
Then add `RESEND_API_KEY` to both `.env.local` and Vercel dashboard environment variables.

**Note:** Email is fire-and-forget after the order insert, so email failure does not break order placement. But until `resend` is installed, the build will fail.

### Issue 3 — Sending domain not configured in Resend

**Current state:** `app/api/send-confirmation/route.ts` sends from `onboarding@resend.dev` (Resend's test address) to a hardcoded test email. Three TODO comments mark the fields to update before launch:
- `from:` — swap to verified sending domain
- `to:` — swap to `customer_email` from the request body
- `replyTo:` — confirm Mali's final contact email

---

## 13. Phase 9 spec — Admin order view (next thing to build)

Build a password-protected admin page at `/admin`:

1. **Auth:** Simple password gate using `ADMIN_PASSWORD` env var. No accounts, no sessions — just a password field that the admin enters each visit (or use a cookie for the session).
2. **Order list:** Table showing all orders, most recent first. Columns: order ref, customer name, phone, zone, delivery day/slot, total, payment status, order status, created at.
3. **Filters:** By delivery day (Sunday/Monday), by payment status (unpaid/paid), by order status.
4. **Actions:** Toggle `payment_status` between unpaid/paid. Update `order_status` via dropdown.
5. **Styling:** Same design system — no new tokens.

---

## 14. How to run locally

```bash
# 1. Clone
git clone https://github.com/akigera10/mali-meals.git
cd mali-meals

# 2. Install dependencies (including resend if not yet done)
npm install
npm install resend

# 3. Create .env.local (see §5 for variable names and values)

# 4. Start dev server
npm run dev
# → http://localhost:3000
```

To deploy: `git push` to `main` — Vercel auto-deploys in ~60 seconds.

---

## 15. Architecture notes and traps to avoid

- **RLS is OFF on all tables** — Supabase shows "UNRESTRICTED" badges. Intentional until Phase 12.
- **Cart resets on page refresh** — React Context only, no localStorage. Intentional.
- **`app/fonts/` contains unused Geist files** — scaffold remnant, harmless, leave them.
- **`revalidate = 0` on the home page** — forces fresh Supabase fetch on every request. Intentional while the menu is being iterated.
- **`console.log` statements in `app/page.tsx`** — debug logging left in from development. Safe to remove before launch.
- **`deliver_window` vs `delivery_slot`:** `delivery_window` stores the canonical DB value (`by_5pm`, `free_5_10pm`, or the slot value for Monday). `delivery_slot` stores the raw slot for Monday only (`12_2pm` etc.) and is null for Sunday options. Both are set on every order.
- **`meatType` on CartEntry** — added to support precise variant labels without regex. All `adjust()` calls in `MenuClient.tsx` now pass `meatType`. The `variantLabel()` function in both `CheckoutClient.tsx` and `route.ts` use `meatType` first and fall back to regex on the name string.
- **SavedForm field names changed** — `day`/`deliveryWindow` were renamed to `deliveryDay`/`deliverySlot` in `CartContext.tsx`. If you see TypeScript errors referencing the old names, the context and checkout client are now in sync on the new names.
