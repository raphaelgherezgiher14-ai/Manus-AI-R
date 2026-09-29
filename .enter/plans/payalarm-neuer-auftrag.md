# Payalarm Neuer Auftrag – Umsetzungsplan

## Grundprinzip
Nur ergänzen/anpassen, nichts neu aufbauen. Landing/Hero/Portals/Pricing/FAQ/Impressum/Signup-Inhalte bleiben, außer explizit vermerkt. Additive Backend-Änderungen (neue Spalten/Tabellen mit RLS), keine bestehende Tabelle überschreiben.

## Reihenfolge & Status
1. **Design-Tokens** – `src/index.css` + `tailwind.config.ts` (Light/Dark, Button-/Formular-Tokens) ✅
2. **Backend-Migration** – customers.note, find_invoice_link-RPC, verify_admin_invite-RPC + Standard-Code, subscription_payments-Tabelle ✅
3. **`/rechnung-finden`** – Seite + Route, Magic-Link-Weiterleitung ✅
4. **Auth** – Split-Layout 45/55, Demo-Box entfernt, Admin-Einladungscode, Willkommensbildschirm ✅
5. **Business-Dashboard** – „Guten Morgen, [Name]", 4 KPI (echte DB-Werte), 65/35-Spalten, 12-Wochen-Chart ✅
6. **Kunden-Seite** – Tabs Alle/Aktiv/Überfällig, Notizfeld, „Rechnung erstellen" + Detail ✅
7. **Meine Rechnungen** – Tabs Offen/Bezahlt, „Erinnerung senden"/„Stornieren" ✅
8. **Unternehmensprofil** – Firmendaten/Steuer + Abo/Upgrade ✅
9. **Admin-Konsole** – KPI+Δ, ECharts (Bar MRR 12M + Donut Tarifverteilung), KI-Analyst (Gemini 3.6 Flash, backend function), Seiten (Unternehmen/Fristenkalender/Rechnungs-Verwaltung/Zahlungen/Einstellungen), CSV-Exporte, Danger Zone ✅
10. **Landing-Ticker** (CSS-Marquee) + „Rechnung finden"-Button ✅
11. **Mobile Bottom-Tabbar** <768px (Business + Admin) ✅
12. **`common.sepa`-Label** vereinheitlicht („SEPA (GiroCode)") + alle i18n-Keys EN/DE + check/scan grün ✅

## Qualität
- tsc --noEmit ✅, eslint ✅, vite build ✅, i18n check+scan ✅ (842 Keys, 0 missing)
- Screenshots Desktop+Mobil verifiziert (Login, Signup, /rechnung-finden, Landing + Ticker)
- Backend-Funktionen deployed: admin-ai-analyst, stripe-webhook (plan payments), create-checkout-session (metadata)
- ECharts + @microsoft/fetch-event-source installiert
