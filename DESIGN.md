# Mali's Meals Design Context

## Visual System

- Use the existing CSS custom properties in `app/globals.css`.
- Page background: `--surface-base`.
- Cards and controls: `--surface-raised`.
- Muted badges and inactive states: `--surface-sunken`.
- Primary action/accent: `--brand-gold`.
- Success/paid state: `--accent-forest`.
- Destructive/error state: `--accent-terracotta`.

## Typography

- `--font-fraunces` is reserved for display text, order references, dish names, prices, and major headings.
- `--font-inter` is used for body copy, buttons, inputs, labels, and operational UI.
- Product surfaces should keep type compact and scannable.

## Component Rules

- All component styling uses inline `style={{}}` props and CSS custom properties.
- Do not use Tailwind classes in components.
- Do not store styles in variables, state, or computed style functions for new work.
- Use 8px radius for cards and inputs.
- No shadows.
- No visible currency prefix in displayed text.
- Use "with protein", not "with meat".

## Mobile Admin Direction

- Treat mobile admin as an order operations app.
- Use touch targets of at least 44px.
- Prefer bottom navigation for primary mobile admin destinations.
- Prioritize order status, payment status, customer contact, delivery timing, and total amount.
- Keep desktop admin familiar while giving phone layouts their own structure.
