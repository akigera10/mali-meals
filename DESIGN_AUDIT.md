# Mali's Meals Design Audit

## Purpose

This file records the reference thinking behind the Mali's Meals design direction. It is not a file to copy directly into components. Use `DESIGN.md` as the active source of truth.

## References Added

The project now has local reference design files:

- `uber/DESIGN.md`
- `wise/DESIGN.md`

These were added with:

```powershell
npx.cmd getdesign@latest add uber
npx.cmd getdesign@latest add wise
```

They are reference material only. Do not replace the root `DESIGN.md` with either file.

## Uber: What Applies

Uber is useful because Mali's Meals has an operations problem, not just a food-menu problem.

Borrow:

- Action clarity: the primary action should be obvious in every viewport.
- Status certainty: customers and admins should know what stage an order is in.
- Simple hierarchy: headline, task, action.
- Mobile task flow: one-thumb actions, direct navigation, no squeezed desktop layouts.
- Compact operational rows: especially for admin orders, kitchen, payments, and deliveries.

Avoid:

- Black-and-white brand takeover.
- Transportation coldness.
- Making everything a pill.
- Overly neutral typography that removes food warmth.
- Dark promo bands that feel unrelated to a home kitchen.

## Wise: What Applies

Wise is useful because Mali's Meals has a trust/payment/next-step problem.

Borrow:

- Plain language around money and next steps.
- Green as a confident trust signal.
- Strong payment/status surfaces.
- Rounded, friendly action controls.
- Clear post-submit reassurance.

Avoid:

- Wise lime green.
- Huge fintech display type.
- Currency-converter visual metaphors.
- Making payment feel like the core product. Food is still the core product.
- Over-rounding every component to 24px.

## Mali's Meals Synthesis

The best combined direction:

- Uber gives the app its operational spine.
- Wise gives the app trust around payment and confirmation.
- Mali's Meals gives the app warmth, food, and weekly kitchen rhythm.

This means:

- Customer surfaces should feel warm and food-led.
- Admin surfaces should feel quick and operational.
- Green should mean trust/status, not brand decoration.
- Gold should mean ordering/action/food warmth.
- Typography should make dish names feel desirable and order information feel reliable.

## What To Build Next

The current app still has generic AI-code UX in places. The next design work should happen in focused passes:

1. Customer menu card redesign
   - Better food hierarchy.
   - Better add controls.
   - Less generic card structure.
   - Clear sold-out and family/freezer/spicy/allergen treatment.

2. Cart and checkout redesign
   - More confidence before submitting.
   - Clearer delivery fee and total logic.
   - More polished input grouping.
   - Stronger "review order" moment.

3. Checkout success validation
   - Real screenshot after a test order when approved.
   - Verify copy, spacing, and payment expectation.

4. Admin order detail polish
   - Make email-to-phone flow feel like a real operations app.
   - Bring customer contact, payment, confirm, and dispatch actions into a clearer hierarchy.

5. Font exploration
   - Test one serif/sans pair against the current Instrument Serif/Inter pair.
   - Do not change fonts globally without screenshots across customer and admin.

## Decision

Do not copy a brand. Translate the job each brand is doing:

- Uber: move someone through a task.
- Wise: make money movement understandable and trusted.
- Mali's Meals: make weekly food ordering feel personal, reliable, and worth repeating.
