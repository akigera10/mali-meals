# Mali's Meals Product Context

register: product

## Product Purpose

Mali's Meals is a single-merchant food ordering and admin operations app for a Nairobi meal delivery business. Customers place orders from the public menu, while Mali uses the admin area to review new orders, confirm them, coordinate payment, prepare dispatch, and keep order records reliable.

## Users

- Customers ordering home-cooked meals from a phone or desktop.
- Mali, the operator, reviewing and managing orders while working across email, phone calls, WhatsApp/iMessage, kitchen prep, and dispatch coordination.
- Codex and future maintainers improving the app while preserving the business rules in `HANDOFF.md`.

## Strategic Principles

- The admin area should feel like a calm operations tool, not a marketing page.
- Mobile admin flows must be phone-first for order review, because new order emails can open directly on Mali's phone.
- The most important admin path is: receive order email, open order detail, review customer/delivery/items, confirm, request/record payment, and dispatch.
- Preserve trust by keeping order data, payment state, and customer communication clear.
- Avoid changing business workflow unless explicitly requested.

## Brand And Tone

Warm, practical, food-led, and understated. The product should feel like a polished small-business operating system: clear, personal, and reliable.

## Anti-References

- Do not make the admin feel like a generic SaaS landing page.
- Do not squeeze desktop tables into a phone viewport.
- Do not hide critical order actions on mobile.
- Do not use decorative visual effects that slow down order handling.
