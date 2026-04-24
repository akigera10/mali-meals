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
- RLS is partially enabled on some tables — see known issues section
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
--accent-forest: #3F5A3C      paid status badge
--accent-terracotta: #B5533C  allergen badges, errors
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
│   │   ├── kitchen/
│   │   │   └── page.tsx          ← Kitchen tab (working)
│   │   ├── login/
│   │   │   └── page.tsx          ← Password gate
│   │   ├── menu/
│   │   │   └── page.tsx          ← Menu management
│   │   ├── components/
│   │   │   └── AdminNav.tsx      ← Shared nav: Orders | Menu | Kitchen
│   │   ├── OrdersClient.tsx      ← Interactive orders list
│   │   └── page.tsx              ← Orders page (server component)
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
| subtotal | integer | |
| delivery_fee | integer | |
| total_amount | integer | |
| payment_status | text | 'unpaid' or 'paid' |
| order_status | text | 'pending', 'confirmed', 'out_for_delivery', 'delivered' |
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
| Order ref | MAL-1000, MAL-1001… used as M-Pesa payment reference |

---

## Cart item ID format

- `${dishId}:vegetarian` — veg dish
- `${dishId}:meat` — meat dish (single meat type)
- `${dishId}:meat:beef` — beef (for 'both' dishes)
- `${dishId}:meat:chicken` — chicken (for 'both' dishes)
- `addon:${addonId}` — protein add-on
- `special:${specialId}` — chef's special ← added April 2026

---

## What is built and working

| Feature | Status |
|---|---|
| Customer menu page — dishes, badges, cart, add-ons | ✅ Working |
| Chef's special section on customer menu | ✅ Working |
| Two-step checkout — form, validation, review | ✅ Working |
| Order submission to Supabase | ✅ Working |
| Chef's special ordering — saves to order_specials | ✅ Working |
| Email confirmation via Resend | ✅ Code done — not configured for production |
| Admin login — password gate, 7-day cookie | ✅ Working |
| Admin orders list — payment toggle, status dropdown | ✅ Working |
| Expandable order rows — shows items and delivery details | ✅ Working |
| Admin menu management at /admin/menu | ✅ Working |
| Chef's special card on admin menu page | ✅ Working |
| Admin Kitchen tab — orders, revenue, unpaid count | ✅ Working |
| Kitchen cooking summary — dish counts by variant | ✅ Working |
| Kitchen popularity ranking | ✅ Working |
| Kitchen Sunday/Monday filter | ✅ Working |
| Kitchen week navigation (prev/next week) | ✅ Working |

---

## Known issues to fix

### Issue 1 — Chef's special grouped as protein add-on in display (PRIORITY)
**Symptom:** On order confirmation, checkout review, and admin order expandable rows — the chef's special appears under "Protein add-ons" instead of its own "Chef's Special" section.

**Root cause:** Display logic groups items by checking for `addon:` prefix but has no distinct check for `special:` prefix — so specials fall through to add-ons.

**Fix:** Audit every place cart items or order items are displayed. Chef's special cart items have IDs prefixed with `special:`. Add a distinct Chef's Special section in:
- Checkout review screen (step 2)
- Order confirmation screen
- Admin order expandable rows
- Kitchen cooking summary

### Issue 2 — Resend email not configured for production
**Current state:** Sends from `onboarding@resend.dev` to hardcoded test email.
**Do not fix until Mali commits to purchasing a domain.**
When ready — three TODOs in `app/api/send-confirmation/route.ts`:
- `from:` — swap to verified sending domain
- `to:` — swap to actual customer_email from request body
- `replyTo:` — set to Mali's contact email

### Issue 3 — RLS partially configured
Some tables have RLS enabled with policies added during development. Before public launch, audit all tables and ensure consistent read/write policies for the anon key.

---

## What to build next (priority order)

### 1. Delivery notes — print/save for selected delivery day
Print-friendly page showing one card per order for the selected day (Sunday or Monday). Each card shows:
- Order ref, customer name, phone
- Full address (building, street, apartment, landmark)
- Zone and delivery slot
- Itemised order contents — dishes with variant, chef's special, protein add-ons
- Total amount
- Payment status (PAID or UNPAID — unpaid highlighted in red)
- Customer notes

Accessible from the Kitchen tab as a "Print delivery notes" button.
Uses browser print — Mali can save as PDF from the print dialog.
No PDF library needed. Print styles should hide nav and admin UI, showing only the order cards.

### 2. Fix chef's special display everywhere
See Issue 1 above. One focused pass across all display locations.

### 3. Kitchen delivery list
Each order shown with full address, delivery zone, slot, and complete order contents inline. Mali uses this for packing and route planning without needing to print.

### 4. RLS audit
Before public launch — audit all tables and add proper read/write policies for anon and service keys.

### 5. Resend email configuration
Only when Mali commits to purchasing a domain. Swap from test sending domain to verified domain, update to: field to use actual customer email. Estimated 30 minutes once domain is verified.

---

## Environment variables

### Vercel (already set)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
RESEND_API_KEY
ADMIN_PASSWORD
```

### Local `.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=https://ouolrgndrqsbjkopsdso.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Supabase dashboard>
RESEND_API_KEY=<from resend.com>
ADMIN_PASSWORD=<your chosen password>
```

---

## How to start a new session

### Claude Code (recommended for building)
```bash
cd C:\Users\user\OneDrive\Documents\mali-meals
claude
```
Say: "Read the HANDOFF.md file in this project. Then I want to work on [specific issue]."

### New chat window (for planning and prompts)
Paste this entire document and say what you want to work on.

### Key rules to remind any AI before it touches code
1. All styling must use inline `style={}` with CSS custom properties — no Tailwind classes in components
2. Check existing files like `app/components/MenuClient.tsx` to see the styling pattern before writing anything
3. Do not remove `typescript.ignoreBuildErrors: true` from next.config.mjs
4. The variant column on order_items is strictly 'vegetarian' or 'meat' — there is no meat_type column
5. Chef's special items use the `specials` table and `order_specials` table — never `menu_items` or `order_items`
6. Cart items with `special:` prefix are chef's specials — always display in their own section, never under protein add-ons