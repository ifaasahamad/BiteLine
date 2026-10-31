# BiteLine UI foundation

Phase 1 establishes the global shell, navigation, and landing page. Existing APIs,
route paths, authentication, cart state, and operational workflows stay in place.

## Visual language

- Forest green `#173f31`: branding, headings, and primary actions.
- Warm ivory `#faf8f2`: page background; white: cards and form surfaces.
- Sage `#eaf0e9`: active navigation and supporting surfaces.
- Amber `#dfad54`: small decorative accents; darker amber for visible focus rings.
- System sans-serif for UI, with a restrained Georgia italic accent on the landing page.
- Spacing tokens: 4, 8, 12, 16, 24, 32, and 48px. Radii: 8, 16, and 28px.

Tokens and shared control styles live in `src/index.css`. Reusable classes include
`container`, `button button-primary`, `button button-secondary`, `card`,
`message message-error`, `message message-success`, `loading-state`, and `empty-state`.
`PageHeader` supports a heading element through its `as` prop; `StatusBadge` supports
all existing order statuses with text as well as color. Later page phases can adopt
these without changing business logic. Existing admin/staff styles remain scoped.

## Responsive and accessible behavior

Mobile is the default layout. Content uses fluid widths and capped containers.
The landing layout expands to columns from 768px; navigation switches to a labeled,
in-flow mobile menu below 901px. Escape closes the menu and restores toggle focus;
link selection closes it. Controls have a minimum 44px target, visible focus states,
and reduced-motion support. The navigation includes a skip link to the content.

The food artwork is decorative CSS. The preparation stages explain the workflow;
they are explicitly labeled as an explanation, not a live customer order.

## Remaining phases

Dedicated layouts for authentication, customer dashboard, menu cards, cart, order
confirmation/history, followed by staff/admin visual alignment and browser testing
at 320, 768, 1024, and 1440px. Do not replace real data with decorative sample orders.
