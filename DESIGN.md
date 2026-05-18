# Mali's Meals Design Context

## Direction

Mali's Meals is moving away from the old gold, brown, cream visual system.

The new direction is **Fresh Green Kitchen**:

- Wise-inspired trust and payment clarity.
- Uber-inspired operational clarity.
- Mali's own food warmth through dish content, rhythm, and display typography.

Do not copy Wise or Uber. Use what they are good at:

- Wise: green trust, payment clarity, next-step reassurance, sage canvas with white cards.
- Uber: clear actions, status hierarchy, mobile task flow, compact admin operations.

## Non-Negotiable Visual Shift

Remove gold and brown as brand primitives.

Do not use:

- Gold
- Caramel
- Tan
- Brown
- Espresso
- Bronze
- Beige as the dominant brand mood

The app should read green/sage/white/forest, not gold/cream/brown.

## CSS Tokens

Rename the old gold tokens before implementation. Do not keep green values under gold names.

### Final Token Set

```css
:root {
  /* Surfaces */
  --surface-base: #EEF3EC;
  --surface-raised: #FFFFFF;
  --surface-sunken: #D4E8CF;

  /* Text */
  --text-primary: #102015;
  --text-secondary: #3A4F3E;
  --text-tertiary: #6B7D6E;

  /* Brand green */
  --brand-green: #72C472;
  --brand-green-hover: #52A852;
  --brand-green-soft: #D4EDD4;

  /* Semantic */
  --accent-forest: #1F6B3A;
  --accent-terracotta: #B5533C;

  /* Borders */
  --border: rgba(16, 32, 21, 0.10);
  --border-strong: rgba(16, 32, 21, 0.22);

  /* Typography aliases */
  --font-display: var(--font-instrument-serif);
  --font-ui: var(--font-manrope);
}
```

### Token Rename Map

- `--brand-gold` -> `--brand-green`
- `--brand-gold-dark` -> `--brand-green-hover`
- `--brand-gold-soft` -> `--brand-green-soft`

Search and replace these across the app during the foundation implementation pass.

## Color Roles

- `--surface-base`: sage page canvas. It must look intentionally green, not almost-white.
- `--surface-raised`: white cards, forms, panels.
- `--surface-sunken`: inactive states, quiet badges, selected neutral regions.
- `--brand-green`: customer primary actions such as Add, Continue, Place order.
- `--brand-green-hover`: hover/pressed/focus emphasis for customer primary actions.
- `--brand-green-soft`: selected customer context, light success surfaces, mobile nav active background.
- `--accent-forest`: paid, ready, confirmed-safe, admin primary action, success.
- `--accent-terracotta`: allergies, errors, cancel/destructive action.

Rules:

- Fresh green is for action.
- Forest green is for trust/status.
- Terracotta is for risk.
- Sage is for surfaces and inactive states.
- Do not use green for every chip and label.

## Typography

Use Instrument Serif for display. Use Manrope for UI.

### Font Imports

In `app/layout.tsx`:

- Import `Instrument_Serif`.
- Assign it to `--font-instrument-serif`.
- Add Manrope as `--font-manrope`.
- Remove Inter.

### Font Aliases

- `--font-display: var(--font-instrument-serif)`
- `--font-ui: var(--font-manrope)`

### Font Roles

Use `--font-display` for:

- Wordmark
- Dish names
- Section headings on customer pages
- Prices and totals on customer pages
- Order references
- Receipt/success hero reference

Use `--font-ui` for:

- Body copy
- Labels
- Buttons
- Inputs
- Tabs
- Badges
- Admin navigation
- Admin rows
- Admin forms
- Quantity counters

Do not switch to Manrope-only. The app needs display personality for food. Instrument Serif should carry the food/display moments while Manrope carries product UI.

## Component Specs

All component styling must use inline `style={{}}` with CSS variables. No Tailwind classes. No new UI library.

### Primary Customer Button

Use for Add, Continue, Checkout, Place order.

```css
background: var(--brand-green);
color: #102015;
border: none;
border-radius: 8px;
padding: 10px 20px;
min-height: 44px;
font-family: var(--font-ui), sans-serif;
font-size: 14px;
font-weight: 600;
line-height: 1;
cursor: pointer;
```

Hover/pressed:

```css
background: var(--brand-green-hover);
```

### Primary Admin Button

Use for Confirm order, Mark paid, Dispatch.

```css
background: var(--accent-forest);
color: #FFFFFF;
border: none;
border-radius: 8px;
padding: 10px 20px;
min-height: 44px;
font-family: var(--font-ui), sans-serif;
font-size: 14px;
font-weight: 600;
line-height: 1;
cursor: pointer;
```

### Secondary Button

Use for Back, Print, Edit, Review secondary actions.

```css
background: var(--surface-raised);
color: var(--text-primary);
border: 1px solid var(--border-strong);
border-radius: 8px;
padding: 10px 20px;
min-height: 44px;
font-family: var(--font-ui), sans-serif;
font-size: 14px;
font-weight: 500;
line-height: 1;
cursor: pointer;
```

### Quiet Button

Use for filters, tabs, low-priority navigation, More actions.

```css
background: var(--surface-sunken);
color: var(--text-secondary);
border: 1px solid var(--border);
border-radius: 8px;
padding: 9px 14px;
min-height: 40px;
font-family: var(--font-ui), sans-serif;
font-size: 13px;
font-weight: 500;
line-height: 1;
cursor: pointer;
```

### Danger Button

Use for Cancel order and destructive actions.

```css
background: transparent;
color: var(--accent-terracotta);
border: 1px solid var(--accent-terracotta);
border-radius: 8px;
padding: 10px 20px;
min-height: 44px;
font-family: var(--font-ui), sans-serif;
font-size: 14px;
font-weight: 500;
line-height: 1;
cursor: pointer;
```

Only use filled terracotta for final destructive confirmation.

### Inputs

```css
background: var(--surface-raised);
color: var(--text-primary);
border: 1px solid var(--border-strong);
border-radius: 8px;
padding: 12px 14px;
min-height: 44px;
font-family: var(--font-ui), sans-serif;
font-size: 14px;
font-weight: 400;
line-height: 1.5;
```

Focus:

```css
outline: 2px solid var(--brand-green);
outline-offset: 2px;
border-color: var(--brand-green-hover);
```

### Focus Ring

Every interactive control must have a visible focus state.

Default:

```css
outline: 2px solid var(--brand-green);
outline-offset: 2px;
```

Do not remove browser focus visibility unless replacing it with an equal or stronger custom state.

## Customer Components

### Customer Menu Header

Purpose: answer the first-viewport questions.

Must show:

- Ordering state
- Order deadline
- Delivery date
- Short explanation of what happens after ordering

Ordering status chip:

- Background: `--surface-sunken`
- Border: `1px solid var(--border)`
- Text: `--text-secondary`
- Dot: `--accent-forest` when open

Deadline/delivery info card:

- Background: `--surface-raised`
- Border: `1px solid var(--border-strong)`
- Radius: 8px
- No side stripe
- No shadow
- Labels: `--text-tertiary`, uppercase, `--font-ui`, 11px, 600
- Values: `--font-display`, `--text-primary`
- Deadline/delivery info card background is `--surface-raised`. Never apply `--brand-green-soft` tint.

### Customer Menu Card

Purpose: sell the dish clearly.

```css
background: var(--surface-raised);
border: 1px solid var(--border);
border-radius: 8px;
padding: 20px;
```

Rules:

- Dish name uses `--font-display`.
- Description uses `--font-ui`.
- Price uses `--font-display` and `--text-primary`. Never use `--brand-green`, `--brand-green-soft`, `--brand-green-hover`, `--accent-forest`, or any green token for prices.
- Add button uses primary customer button spec.
- Allergen chips use a terracotta outline: transparent background, `--accent-terracotta` text, `1px solid var(--accent-terracotta)`, and full words such as Soy, Dairy, Nuts, or Coconut. No single letters, abbreviations, or icons.
- Feature chips use `--surface-sunken`, `--text-secondary`, `1px solid var(--border)`, and full words such as Freezer or Family. No icons or abbreviations.
- Spicy is a mild warning and uses the allergen terracotta treatment.
- Do not use `<hr>`, `borderTop`, or `borderBottom` as section or option-row dividers inside dish cards. Use margin spacing between option rows instead.
- Sold-out dims the relevant option and disables Add.

Do not use random colored square badges. Prefer readable chips.

### Protein Add-ons

Purpose: keep lower-hierarchy add-ons compact and easy to scan.

Outer container:

- Background: `--surface-raised`
- Border: `1px solid var(--border)`
- Radius: 8px
- Overflow: hidden

Rows:

- Each add-on is one row inside the container.
- Row layout uses `display: flex`, `align-items: center`, `gap: 12px`.
- Row padding is `12px 16px`.
- Minimum row height is 48px.
- Use `border-bottom: 1px solid var(--border)` between rows only.
- The final row has no `border-bottom`.
- Name sits left in `--font-ui`, 14px, 500, `--text-primary`.
- Price sits middle-right or right-aligned before the Add button, uses `--font-display`, 15px, 400, `--text-primary`, with `margin-left: auto` where needed.
- Add button uses the primary customer button spec with compact padding: `8px 14px`.

### Cart Bar

Purpose: keep checkout reachable.

Style:

- Background: `--text-primary`
- Text: `#FFFFFF`
- Primary checkout action can use `--brand-green`
- Fixed/sticky on mobile where appropriate
- Must not hide content behind it

### Checkout Panel

Purpose: confidence before submitting.

Style:

- Background: `--surface-raised`
- Border: `1px solid var(--border)`
- Radius: 8px
- Sections grouped by customer, delivery, order summary, payment note
- Totals prominent
- Payment copy plain and specific

Do not use a stepper or progress indicator for the two-step checkout. The page headings `Your details` and `Review your order` carry the progress context.

Back navigation:

- Plain text `← Back`
- Color: `--text-tertiary`
- Font: `--font-ui`, 13px, 400
- No underline
- Background: none
- Border: none
- Padding: 0
- Display: inline-flex, aligned center
- Hover changes color only to `--text-secondary`
- On step 1, Back navigates to the menu page.
- On step 2, Back returns to step 1 and preserves cart and form state.

Checkout step headings:

- Font: `--font-display`
- Size: 28px
- Weight: 400
- Color: `--text-primary`
- Margin-bottom: 24px

### Success Screen

Purpose: reassurance and next steps.

Order reference card:

- Background: `--brand-green-soft` or `--surface-raised` after screenshot review
- Border: `1px solid var(--brand-green-hover)`
- Radius: 8px
- Order ref uses `--font-display`

Next-step card:

- Background: `--surface-raised`
- Border: `1px solid var(--border)`
- Radius: 8px
- Step numbers can use `--surface-sunken` with `--text-secondary`

## Admin Components

Admin must be more Uber than Wise: compact, clear, operational.

### AdminNav

Desktop:

- Background: `--surface-raised`
- Active link: `--accent-forest`
- Active underline: `2px solid var(--accent-forest)`
- Text uses `--font-ui`
- Wordmark can use `--font-display`

Mobile bottom nav:

- Background: `--surface-raised`
- Border top: `1px solid var(--border)`
- Active item background: `--brand-green-soft`
- Active item text/icon: `--accent-forest`

### Admin Order Row

Use rows, not large decorative customer cards, when scanning many orders.

```css
background: var(--surface-raised);
border-bottom: 1px solid var(--border);
border-radius: 0;
padding: 12px 16px;
min-height: 56px;
display: flex;
align-items: center;
```

Rules:

- First row can have `border-top: 1px solid var(--border)`.
- Whole row should be clickable where appropriate.
- Order ref can use `--font-display`.
- Customer/status/date/zone use `--font-ui`.
- No shadows.
- No side stripes.
- No nested cards.

### Admin Detail Action Area

Primary action:

- Confirm / Mark paid / Dispatch use primary admin button.

Secondary actions:

- Print / Back / Email use secondary button.

Danger:

- Cancel uses danger button.

Mobile:

- 44px minimum touch targets.
- Avoid cramped side-by-side action rows if labels wrap.

## Badges

Default badge:

```css
border-radius: 4px;
padding: 3px 8px;
font-family: var(--font-ui), sans-serif;
font-size: 11px;
font-weight: 600;
line-height: 1.4;
letter-spacing: 0.04em;
```

Status mapping:

- New: `--surface-sunken`, `--text-secondary`, optional `1px solid var(--border)`.
- Confirmed unpaid: `--surface-sunken`, `--text-secondary`.
- Paid ready: `--brand-green-soft`, `--accent-forest`, `1px solid var(--accent-forest)`.
- Out for delivery: `--brand-green-soft`, `--accent-forest`, `1px solid var(--brand-green-hover)`.
- Delivered paid: `--brand-green-soft`, `--accent-forest`.
- Delivered unpaid: terracotta tint with `--accent-terracotta`.
- Cancelled: `--surface-sunken`, `--text-tertiary`, opacity 0.75.
- Allergy/error: terracotta treatment.

Food feature chips:

- Freezer/family/non-risk: `--surface-sunken`, `--text-secondary`.
- Spicy: terracotta or muted warm risk treatment.
- Allergens: terracotta treatment.

## Emails

Email HTML cannot use CSS variables.

When email templates are updated, use direct hex values:

- Page/background: `#EEF3EC`
- Card: `#FFFFFF`
- Primary green: `#72C472`
- Green hover is not needed in email
- Soft green: `#D4EDD4`
- Forest: `#1F6B3A`
- Text primary: `#102015`
- Text secondary: `#3A4F3E`
- Text tertiary: `#6B7D6E`
- Terracotta: `#B5533C`

Emails should align with the success screen, but remain simple enough for email clients.

## Print Surfaces

Packing slips and print views should remain print-safe.

- Prefer black text on white.
- Use green only if it prints legibly.
- Do not rely on background color for essential information.

## Rollout Plan

### Phase 0: Design Document

- Finalize `DESIGN.md`.
- Keep `wise/DESIGN.md` and `uber/DESIGN.md` as references.
- Do not implement UI until this document is clear.

### Phase 1: Foundation

Files:

- `app/globals.css`
- `app/layout.tsx`

Work:

- Rename gold tokens to green tokens.
- Update root color values.
- Add Manrope.
- Keep Instrument Serif.
- Use `--font-ui` for UI/body text.
- Replace old token names across components.

Expected result:

- The app should immediately stop looking gold/brown without deep component redesign.

### Phase 2: Customer Ordering

Files:

- `app/components/MenuClient.tsx`
- `app/checkout/CheckoutClient.tsx`

Work:

- Apply green button system.
- Improve menu chips.
- Update deadline/delivery info card.
- Update checkout panels and success screen.
- Screenshot desktop and mobile.

### Phase 3: Admin Operations

Files:

- `app/admin/components/AdminNav.tsx`
- `app/admin/OrdersClient.tsx`
- `app/admin/orders/[id]/page.tsx`
- Other admin pages as needed.

Work:

- Apply font-ui to admin.
- Use forest for admin primary actions.
- Flatten order rows where dense scanning matters.
- Keep mobile bottom nav clear.
- Screenshot desktop and mobile.

### Phase 4: Emails

Files:

- `app/api/send-confirmation/route.ts`
- `app/api/send-admin-order-notification/route.ts`
- `app/api/send-dispatch/route.ts`

Work:

- Replace old gold hex values.
- Use direct green/sage hex values.
- Test with a real dev order only when approved.

## Implementation Rules

- Inline styles only.
- CSS variables only.
- No Tailwind classes in components.
- No new UI library.
- Do not store style objects in variables, state, or computed style functions for new work.
- No shadows.
- No side stripes.
- No gradients.
- No glass effects.
- No database schema changes as part of design work.
- No payment logic changes as part of design work.
- No order status changes as part of design work.
- Verify with browser screenshots after every visible phase.

## Anti-Patterns

Do not:

- Bring back gold/brown.
- Copy Wise lime.
- Copy Uber black-and-white.
- Make the customer side cold.
- Make the admin side decorative.
- Use fake marketplace elements: ratings, promos, sponsored items, fake countdowns.
- Make every component a pill.
- Hide focus states.
- Replace specific component specs with vague mood words.
