# Payalarm — Accounts Receivable Payment Automation SaaS

## Context

Build and publish **Payalarm**, a premium AR payment-automation SaaS ("Work smarter not harder.") for small businesses. The repo is a blank React + Vite + Tailwind + shadcn/ui + i18n template (currently en/zh-CN). This plan turns it into a complete bilingual (EN/DE), dark+light, mobile-responsive product with a cinematic landing page, role-based auth, three connected portals (Business, Customer, Admin), a real database with demo data, Stripe checkout for plans, and a real-email reminder/dunning engine.

User decisions: customer invoice payments = **simulated secure payment form**; reminders/dunning = **real email delivery** (with simulated fallback if no email key); plan checkout = **Stripe when connected, simulated fallback**.

Backend is Enter Cloud (currently not enabled). i18n infra already exists; task is to swap zh-CN → de. Stripe is not connected.

## Key design decisions

- **Design system** (in `src/index.css` + `tailwind.config.ts`): deep navy `#0B172A` sidebars, soft cool gray `#F5F7FA` backgrounds, white cards, emerald `#10B981` primary actions, royal blue `#3B82F6` admin accents, Inter font, flat colors, **no gradients, no emojis** (lucide-react icons only). Dark mode via `next-themes` with matching CSS vars.
- **Auth**: email/password signup+login (auto-confirm). Role stored on `profiles` (`business` | `customer` | `admin`). Signup has a Business / Customer selector; customer signup links to an existing `customers` row by email. Admin + demo users seeded.
- **Real email**: `run-reminder-cycle` backend function sends reminder/dunning emails via Resend REST API using a `RESEND_API_KEY` secret (collected via `supabase_add_secret`). If the secret is absent, delivery is recorded as `simulated` with a visible badge — the engine still runs.
- **Stripe**: `stripe_enable` (auto-deploys `create-checkout-session`) + `stripe_create_products_and_prices` for Professional €39/mo and Business €79/mo. Pricing buttons call checkout via `window.open(data.url)`; `/success` records a subscription + updates the company plan; if Stripe is not connected, upgrade is simulated.
- **i18n**: `i18n.config.json` languages = `[en, de]`, fallback `en`; delete `zh-CN.json`, add `de.json` (mirror key set, German values). All UI strings via `t()`; run `check-i18n.mjs` + `scan-i18n.mjs`.

## Database schema (all tables via migrations, RLS enabled + scoped, admin checks in policies, `profiles` created by signup trigger)

Helper security-definer functions: `is_admin()`, `get_my_company_id()`, `is_company_member(company_id)`, `get_my_customer_id()`.

- `profiles`: id, email, full_name, role, company_id, language
- `companies`: name, industry, address, vat_id, currency, plan (`trial|professional|business`), trial_ends_at, stripe_customer_id, status
- `customers`: company_id, name, contact_name, email, phone, address, tax_id, language, status
- `projects`: company_id, customer_id, name, description, status, total_value, deposit_percent, deposit_due_days, start_date, end_date, currency
- `project_phases`: project_id, name, description, percent_of_total, status, planned_start, planned_end
- `quotes` + `quote_items`: company_id, customer_id, project_id, number, status (`draft|sent|accepted|declined|expired`), issue_date, valid_until, total, currency; items (description, quantity, unit_price, amount)
- `invoices` + `invoice_items`: type (`deposit|progress|final`), status (`draft|sent|paid|overdue|canceled`), issue_date, due_date, total, amount_paid, currency
- `payments`: invoice_id, amount, method (`card|sepa|bank_transfer`), status, paid_at, reference
- `reminder_configs`: company_id, name, enabled, days_before_due, frequency_days, max_reminders, subject/body per language (`*_en`/`*_de`)
- `reminders`: invoice_id, sequence, scheduled_date, status (`scheduled|sent|skipped|failed`), channel
- `dunning_rules`: company_id, name, level, trigger_days_overdue, action, subject/body per language
- `dunning_events`: invoice_id, rule_id, level, action_taken, created_at
- `messages`: company_id, customer_id, project_id, sender_id, sender_role, content
- `documents`: company_id, customer_id, project_id, name, kind, url
- `payment_methods`, `integrations`: config jsonb
- `subscriptions`: company_id, plan, status (`trialing|active|canceled|past_due`), trial_start/end, period_start/end, stripe_session_id
- `roles`: name, is_system, permissions jsonb, description
- `settings`: company_id (nullable), key, value jsonb
- `audit_logs`: company_id, actor_id, actor_role, action, entity, entity_id, details jsonb
- `notifications`: user_id, title_en/title_de, body_en/body_de, type, read

**Seed data** (via insert tool, after migrations): admin/business/customer demo users; demo company **Nordlicht GmbH** (trial active); 4 customers (mixed names/languages); 4 projects in different states (one with overdue final invoice to demo dunning); accepted quotes; deposit paid / progress sent / overdue invoices; a few payments; reminder config + 3-level dunning rules; messages; documents; audit log entries.

## Backend functions

1. `run-reminder-cycle` (`supabase/functions/run-reminder-cycle/index.ts`): CORS + OPTIONS preflight; for the calling company (or admin/all): evaluates due invoices against `reminder_configs`, inserts `reminders`, escalates `dunning_rules` → `dunning_events`, flips invoices to `overdue`, sends real emails via Resend (`RESEND_API_KEY`) in the customer's language (else `simulated`), writes audit logs + notifications. Deploy via `supabase_deploy_edge_function`.
2. `create-checkout-session` — auto-deployed by `stripe_enable`, do not write.

## Files to create / modify (critical paths)

- Modify: `src/index.css`, `tailwind.config.ts`, `index.html` (Inter font, title/meta), `i18n.config.json`, `src/router.tsx`
- Delete: `public/locales/zh-CN.json`; Add: `public/locales/de.json`, rewrite `public/locales/en.json` (full key set)
- New shared: `src/components/theme-provider.tsx`, `src/components/theme-toggle.tsx`, `src/components/shared/` (data-table, status-badge, page-header, stat-card, empty-state, kpi-card, search-input, confirm-dialog), `src/lib/format.ts` (EUR/date by locale), `src/lib/status.ts` (status→badge maps), `src/lib/api.ts` (query helpers), `src/hooks/use-auth.tsx` (AuthProvider: `onAuthStateChange` first, then session restore; user+profile+role+company; guards)
- Layouts: `src/components/layouts/landing-layout.tsx`, `app-layout.tsx` (navy sidebar), `portal-layout.tsx`, `admin-layout.tsx` (blue-accent navy sidebar)
- Landing: `src/components/landing/` — navbar, `particles-background.tsx` (canvas emerald particles), hero, stats-ticker (animated counters), workflow ("Get Paid From Deposit to Final Payment" stepped product panel), portal-selector, features, testimonials, pricing (Stripe/simulated), faq, footer
- Pages: `src/pages/Index.tsx` (landing), `login.tsx`, `signup.tsx`, `success.tsx`, `cancel.tsx`
- Business portal `src/pages/app/`: dashboard, customers (+detail/form), quotes (+new/detail), projects (+detail), invoices (+detail), payments, reminders-dunning, cashflow, messages, documents, settings
- Customer portal `src/pages/portal/`: dashboard, quotes, projects, invoices (+ simulated secure payment dialog, print), payments, documents, messages
- Admin portal `src/pages/admin/`: dashboard, users, roles, companies, customers, projects, quotes, invoices, subscriptions-billing, payment-methods, integrations, settings, analytics, audit-logs
- Backend: `supabase/functions/run-reminder-cycle/index.ts`

## Implementation checklist

**Foundations**
- [ ] Enable Enter Cloud (`supabase_enable`); configure email auth with auto-confirm (`supabase_configure_auth`).
- [ ] Connect Stripe (`stripe_enable`) and create products/prices (Professional €39/mo, Business €79/mo) via `stripe_create_products_and_prices`; if declined, keep simulated upgrade path.
- [ ] Collect `RESEND_API_KEY` via `supabase_add_secret` (reminder emails); absence → simulated delivery.
- [ ] Apply fintech design tokens (emerald/navy/royal-blue, light+dark) in `src/index.css` + `tailwind.config.ts` (Inter).
- [ ] Update `index.html`: Inter font link, "Payalarm" title/description/meta.
- [ ] i18n: set languages `[en, de]` in `i18n.config.json`, delete `zh-CN.json`, author `en.json` + `de.json`; run check-i18n + scan-i18n (last shell command).
- [ ] Theme provider (next-themes, persisted) + toggle in all layouts.

**Database**
- [ ] Migration: RLS helper functions (`is_admin`, `get_my_company_id`, `is_company_member`, `get_my_customer_id`).
- [ ] Migrations: core tables (profiles + signup trigger, companies, customers, projects, project_phases) with scoped RLS policies.
- [ ] Migrations: quotes/quote_items, invoices/invoice_items, payments with scoped RLS (company, admin, linked customer).
- [ ] Migrations: reminder_configs, reminders, dunning_rules, dunning_events with scoped RLS.
- [ ] Migrations: messages, documents, payment_methods, integrations, subscriptions, roles, settings, audit_logs, notifications with scoped RLS.
- [ ] Verify RLS applied on every new table via schema-check tool; fix gaps same turn.
- [ ] Seed demo users (admin/business/customer), Nordlicht GmbH, customers, projects+phases, quotes, invoices (incl. overdue), payments, reminder config, dunning rules, messages, documents, audit logs, trial subscription.

**Backend functions**
- [ ] Write + deploy `run-reminder-cycle` (CORS, reminders, dunning escalation, email via Resend w/ simulated fallback, audit + notifications).
- [ ] `/success` + `/cancel` pages: on success insert subscription row and update company plan.

**App infrastructure**
- [ ] `use-auth` context + signup/login/signout with profile+role loading.
- [ ] Expand `src/router.tsx`: `/`, `/login`, `/signup`, `/success`, `/cancel`, `/app/*` (business guard), `/portal/*` (customer guard), `/admin/*` (admin guard), role-aware redirects.
- [ ] Shared UI kit (data-table, status-badge, page-header, stat-card, empty-state, kpi-card) + `lib/format.ts` EUR/date formatting.

**Landing page**
- [ ] Navbar (logo, anchors, language switcher, theme toggle, Sign in / Start free trial).
- [ ] Hero: headline + tagline, canvas particles, CTA buttons, animated stats ticker, product dashboard mock.
- [ ] "Get Paid From Deposit to Final Payment" workflow section with stepped, animated product panel.
- [ ] Portal selector (Business / Customer / Admin) + features grid + testimonials.
- [ ] Pricing (3 cards, trial/€39/€79, Stripe checkout or simulated) + FAQ accordion.
- [ ] Footer (links, language, theme).
- [ ] Login / Signup pages (role selector) — validation + errors bilingual.

**Business portal (/app)** — every screen working, bilingual, mobile-responsive
- [ ] Navy-sidebar layout; Dashboard: receivables KPIs, cash-flow chart (recharts), aging, recent activity.
- [ ] Customers: table + create/edit + detail (projects, quote & invoice history).
- [ ] Quotes: create wizard (customer, line items, deposit %, valid until) → send; accept/decline reflected; accepted quote auto-creates deposit invoice.
- [ ] Projects: create with phases (percent split); progress invoice per completed phase; final invoice; deposit invoice from quote.
- [ ] Invoices: list/filter by type+status, detail, mark sent, record manual payments.
- [ ] Payments page; Cash flow + receivable aging (30/60/90+).
- [ ] Reminders & Dunning: rule config, escalation levels, "Run automation cycle" button → backend function; sent-reminder & dunning timeline.
- [ ] Messages (project threads), Documents list.
- [ ] Settings: company profile, plan/trial + upgrade, members, payment methods, integrations, notification preferences.

**Customer portal (/portal)**
- [ ] Layout + Dashboard: my projects, due invoices, notifications.
- [ ] Quotes: view + accept/decline; Projects: phase progress.
- [ ] Invoices: view, print/download, **simulated secure payment form** → records payment, marks invoice paid, stops reminders, notifies business.
- [ ] Payment history, Documents, Messages (reply to business).

**Admin portal (/admin)**
- [ ] Blue-accent navy layout + Dashboard: platform KPIs, MRR, active companies.
- [ ] Users & roles/permissions CRUD; Companies (plan, suspend); oversight tables (customers, projects, quotes, invoices, payments).
- [ ] Subscriptions & billing; payment methods; integrations; system settings; analytics charts; audit logs.

**Quality**
- [ ] Full DE/EN parity pass (nav, buttons, forms, dashboards, invoices, portal, notifications, validation, settings).
- [ ] Responsive pass: verify `/` and one dashboard route at `mobile_390` and `desktop_1280`.

## Verification checklist

- [ ] `pnpm lint` and `pnpm exec tsc --noEmit` pass; `pnpm run build` succeeds.
- [ ] `node /workspace/.agents/skills/enter_i18n/assets/scripts/check-i18n.mjs` prints "i18n check passed."; `scan-i18n.mjs` writes `reports/i18n/summary.json`.
- [ ] Schema check confirms RLS enabled with scoped policies on every created table.
- [ ] Auth: signup as business creates company; customer signup links by email; seeded admin/business/customer logins reach the correct portal; guards redirect unauthenticated/wrong-role users.
- [ ] Landing: particles animate, stats ticker counts, workflow panel steps, pricing buttons open Stripe checkout (or simulated upgrade when disconnected).
- [ ] Business flow: create customer → create+send quote → customer accepts → deposit invoice auto-issued → run automation cycle → reminder/dunning events appear and invoice flips to `overdue` → simulated payment marks it `paid`.
- [ ] Portal flow: customer sees shared quote/invoices, pays via simulated form, payment appears in business Payments + audit log.
- [ ] Admin: users/roles, companies, subscriptions, analytics, audit logs render and update.
- [ ] Language switch re-renders DE/EN instantly and persists across reloads (cookie); no keys shown raw.
- [ ] Theme switch persists; no white-on-white / black-on-black states in either mode.
- [ ] Screenshots: landing + business dashboard at `mobile_390` and `desktop_1280` (light + dark).
