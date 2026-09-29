# Button-Funktionsfähigkeit – Payalarm

## Kontext

Der Nutzer hat gefordert: **„Die Buttons müssen funktionieren, bevor du mir sagst, dass die App fertig ist."** Ich habe daraufhin alle Buttons und Interaktionen im Projekt systematisch geprüft (Landing, Auth, Business-Bereich, Admin-Konsole, Backend-Funktionen). Die überwiegende Mehrheit ist korrekt verdrahtet. Es gibt jedoch **acht konkrete Stellen**, an denen Buttons nicht, nur teilweise oder irreführend funktionieren. Diese werden behoben und anschließend verifiziert.

Grundsatz: Nur die betroffenen Stellen ändern, nichts neu aufbauen, keine bestehenden Daten überschreiben. Für den Download-Button gilt die empfohlene Variante (echte Druck-/PDF-Ansicht), da der Nutzer keine andere Präferenz genannt hat.

---

## Befunde und Lösung

### 1. Willkommensbildschirm wird übersprungen (Auth-Flow)
**Problem:** `/signup` ist in `RedirectIfAuthed` gewrappt. Sobald `signUp()` das Profil geladen hat, rendert `RedirectIfAuthed` sofort `<Navigate to={homeForRole(...)}>` (→ `/app` bzw. `/admin`). Das danach aufgerufene `navigate("/welcome")` verliert das Rennen — der Willkommensschirm erscheint unzuverlässig.

**Lösung:**
- `src/hooks/use-auth.tsx`: in `signUp()` nach Erfolg `sessionStorage.setItem("payalarm:justSignedUp", "1")` setzen.
- `src/components/shared/route-guards.tsx`: `RedirectIfAuthed` prüft das Flag und leitet bei gesetztem Flag nach `/welcome` statt `homeForRole`.
- `src/pages/welcome.tsx`: Flag beim Mount entfernen (`sessionStorage.removeItem`).
- `src/pages/signup.tsx`: das eigene `navigate("/welcome")` entfernen (übernimmt jetzt der Guard), `useNavigate`-Import bereinigen.

### 2. KI-Analyst ohne Server-Autorisierung
**Problem:** `supabase/functions/admin-ai-analyst/index.ts` liest mit Service-Role **alle** Plattformdaten (companies, invoices, payments, profiles) und prüft den Aufrufer **nicht**. `src/pages/admin/ai-analyst.tsx` sendet den Anon-Key. Damit kann jeder die Funktion aufrufen — Autorisierung darf nie nur clientseitig (Route-Guard) erfolgen.

**Lösung:**
- `src/pages/admin/ai-analyst.tsx`: statt `SUPABASE_PUBLISHABLE_KEY` das Session-Token senden (`supabase.auth.getSession()` → `session.access_token`); bei fehlender Session Fehler anzeigen.
- `supabase/functions/admin-ai-analyst/index.ts`: Muster aus `send-document`/`run-reminder-cycle` übernehmen — `createClient(url, serviceKey, { global: { headers: { Authorization: authHeader } } })`, `auth.getUser()`, `profiles.role === "admin"` prüfen; sonst `401`/`403` mit i18n-fähigem Fehlercode.
- Funktion neu deployen.

### 3. Landing-Pricing: Checkout ohne companyId/plan
**Problem:** `src/components/landing/pricing-section.tsx` ruft `create-checkout-session` **ohne** `companyId`/`plan` auf. Folge: Der Webhook legt keine `subscription_payments`-Zeile an (Admin → „Zahlungen" bleibt leer) und der Tarif wird nach erfolgreichem Checkout nicht aktualisiert.

**Lösung:** Aufruf wie in `src/pages/app/settings.tsx` erweitern (`companyId: company?.id`, `plan`). Für nicht angemeldete Nutzer weiterhin zu `/signup` leiten; Fallback-Verhalten beibehalten.

### 4. „Herunterladen" tut nicht, was es verspricht
**Problem:** `src/pages/app/invoice-detail.tsx` (Zeile ~257) und `src/pages/app/documents.tsx` (Zeile ~103) rufen nur `window.print()` auf. Bei Dokumenten wird zudem nie eine `url` gespeichert → ein echter Download ist unmöglich.

**Lösung:**
- `invoice-detail.tsx`: „Drucken" behält `window.print()`; „Herunterladen" ruft eine dedizierte, druckoptimierte Ansicht auf (eigene Route `/app/invoices/:id/print` mit Print-CSS, `window.print()` nach Mount) — oder der Button wird entfernt. Empfehlung: dedizierte Druck-/PDF-Ansicht.
- `documents.tsx`: im Anlege-Dialog ein optionales Feld **Datei-URL** ergänzen (`documents.url`); „Herunterladen"/„Öffnen" öffnet die URL in neuem Tab (`window.open(url)`). Ohne URL Button deaktiviert mit Hinweis-Tooltip.

### 5. Anker-Buttons auf der Landing scrollen nicht zuverlässig
**Problem:** `landing-hero.tsx:100` nutzt `<Link to="#workflow">`, `beta-section.tsx:26` `<Link to="/#pricing">`. React-Router-Links mit reinem Hash scrollen nicht garantiert (kein Scroll-Handler) → wirkt wie ein toter Button. Navbar/Footer nutzen bereits erfolgreich `<a href="#…">`.

**Lösung:** Beide Stellen auf `<a href="#workflow">` / `<a href="#pricing">` umstellen (bzw. Klick-Handler mit `document.getElementById(...)?.scrollIntoView({behavior:"smooth"})`), damit das Scrollen zuverlässig ist. Anker-IDs existieren bereits (`#workflow`, `#pricing`).

### 6. Plattform-Settings: Upsert kann Duplikate erzeugen
**Problem:** `settings` hat `UNIQUE (company_id, key)`. Bei `company_id IS NULL` greift das in Postgres nicht (NULLs sind distinct) → `src/pages/admin/settings.tsx` kann für Plattform-Keys Duplikate anlegen; `verify_admin_invite` liest mit `limit 1`.

**Lösung:** Migration mit partiellem Unique-Index `create unique index if not exists settings_platform_key_idx on public.settings(key) where company_id is null;` (additiv, keine Datenänderung) und `upsert()` in `admin/settings.tsx` auf „erst nach key+is null suchen, dann update, sonst insert" abstimmen (macht die Funktion bereits — Index sichert es ab).

### 7. „Erinnerung senden" im Dashboard kopiert nur den Link
**Problem:** `src/pages/app/dashboard.tsx` beschriftet den Button mit `app.dashboard.remind` („Erinnerung senden"), ruft aber `copyMagicLink("invoice", …)` auf — es wird **keine E-Mail** versendet. `src/pages/app/invoices.tsx` nutzt dagegen korrekt `emailDocumentLink`.

**Lösung:** Dashboard-Button auf `emailDocumentLink("invoice", row.id)` umstellen und Erfolg/Misserfolg wie in `invoices.tsx` per Toast melden (Simuliert/E-Mail gesendet).

### 8. Konsistenz „Zahlung bestätigen" bei Teilzahlung
**Problem:** `src/pages/app/payments.tsx` und `src/pages/app/invoice-detail.tsx` setzen den Rechnungsstatus nur bei exakt ausgeglichenem Betrag auf `paid`; bei Teilzahlung bleibt `sent`/`overdue`. Funktioniert, ist aber inkonsistent zur „Saldo"-Logik.

**Lösung:** Gemeinsame Hilfsfunktion in `src/lib/actions.ts` (`applyPaymentToInvoice`) einführen und in beiden Stellen nutzen: `amount_paid` erhöhen, Status `paid` bei vollständiger Zahlung, sonst `sent` (bzw. `overdue` beibehalten). Reduziert doppelte Logik.

---

## Kritische Dateien

| Datei | Änderung |
|---|---|
| `src/hooks/use-auth.tsx` | Signup-Flag setzen |
| `src/components/shared/route-guards.tsx` | Flag → `/welcome` |
| `src/pages/welcome.tsx` | Flag löschen |
| `src/pages/signup.tsx` | eigenes navigate entfernen |
| `src/pages/admin/ai-analyst.tsx` | Session-Token senden |
| `supabase/functions/admin-ai-analyst/index.ts` | Admin-Prüfung serverseitig |
| `src/components/landing/pricing-section.tsx` | companyId/plan mitgeben |
| `src/pages/app/invoice-detail.tsx` | echter Druck/Download |
| `src/pages/app/documents.tsx` | URL-Feld + echter Download |
| `src/components/landing/landing-hero.tsx`, `beta-section.tsx` | Anker-Scroll |
| `src/pages/admin/settings.tsx` + Migration | partieller Unique-Index |
| `src/pages/app/dashboard.tsx` | E-Mail statt Link kopieren |
| `src/lib/actions.ts` | `applyPaymentToInvoice` |
| `src/pages/app/payments.tsx` | gemeinsame Zahlungslogik |

Wiederverwendete bestehende Bausteine: `emailDocumentLink`/`copyMagicLink` (`src/hooks/use-magic-link.ts`), `logAudit`/`nextDocumentNumber` (`src/lib/actions.ts`), Auth-Muster aus `send-document` und `run-reminder-cycle`.

---

## Implementation checklist

- [x] `signUp()` setzt `sessionStorage["payalarm:justSignedUp"]` nach erfolgreichem Signup (`use-auth.tsx`, `JUST_SIGNED_UP_KEY`).
- [x] `RedirectIfAuthed` leitet bei gesetztem Flag nach `/welcome` statt `homeForRole` (`route-guards.tsx`).
- [x] `welcome.tsx` entfernt das Flag beim Mount und leitet Direktbesuche ohne Signup-Flag zum Portal; `signup.tsx` navigiert nicht mehr selbst.
- [x] `admin-ai-analyst` liest den Authorization-Header, ruft `auth.getUser()` und verlangt `profiles.role === 'admin'`; sonst 401/403.
- [x] `ai-analyst.tsx` sendet `session.access_token` (kein Anon-Key) und zeigt 401 (`ai.authError`)/403 (`ai.forbidden`) an.
- [x] `admin-ai-analyst` ist nach der Änderung erneut deployt.
- [x] `pricing-section.tsx` übergibt `companyId` und `plan` an `create-checkout-session`.
- [x] Neue Seite `src/pages/app/invoice-print.tsx` (druckoptimiert, auto-Print) + Route `/app/invoices/:id/print`; „Herunterladen" in `invoice-detail.tsx` öffnet sie in neuem Tab; „Drucken" bleibt `window.print()`.
- [x] `documents.tsx`: Anlege-Dialog erfasst optionale Datei-URL (`documents.url`); „Datei öffnen" nutzt `window.open(url)`; ohne URL ist der Button deaktiviert mit Hinweis (`app.documents.noFile`).
- [x] `landing-hero.tsx` (`#workflow`) und `beta-section.tsx` (`#pricing`) nutzen native Anker-Links.
- [x] Migration legt partiellen Unique-Index `settings(key) where company_id is null` an.
- [x] `dashboard.tsx` „Erinnerung senden" versendet per `emailDocumentLink` und meldet Ergebnis per Toast.
- [x] `applyPaymentToInvoice` existiert in `src/lib/actions.ts` und wird in `payments.tsx` + `invoice-detail.tsx` verwendet.
- [x] Neue i18n-Keys (EN+DE) ergänzt (`ai.forbidden`, `app.documents.url/urlHint/open/noFile`); Key-Sets identisch.

## Verification checklist

- [x] `pnpm exec tsc --noEmit` läuft fehlerfrei.
- [x] `pnpm lint` läuft fehlerfrei.
- [x] `pnpm build` läuft fehlerfrei.
- [x] `check-i18n.mjs` → „i18n check passed"; `scan-i18n.mjs` ohne missing/unknown.
- [x] **Negativ (verifiziert per curl):** Aufruf von `admin-ai-analyst` ohne Session → `HTTP 401` `{"error":{"code":401,...}}`.
- [x] **Negativ (verifiziert per curl):** Aufruf mit Business-Session (`business@payalarm.app`) → `HTTP 403` `Admin access required`.
- [x] **Positiv (verifiziert per curl):** Aufruf mit Admin-Session (`admin@payalarm.app`) → `HTTP 200`, echte gestreamte Antwort aus DB-Daten („There is 1 active company … Nordlicht GmbH").
- [x] Signup → `/welcome` ist über das Einmal-Flag deterministisch (kein Race mehr); `/welcome`-Button nutzt `homeForRole`.
- [x] Landing-Pricing übergibt `companyId`/`plan`; ohne Login → `/signup`.
- [x] Teilzahlung nutzt gemeinsame Logik `applyPaymentToInvoice` (Status bleibt bis Vollausgleich, dann `paid`).
- [x] Dashboard „Erinnerung senden" ruft `emailDocumentLink` (Toast „E-Mail gesendet"/„simuliert").
- [x] Keine neuen Konsolen-/Runtime-Fehler (`captured_error_count: 0`); Landing-Screenshot Desktop 1280 unverändert korrekt.
- [ ] Manuell im Browser (Klick-Test, nicht per Screenshot-Tool möglich): Signup-Durchlauf Business/Admin, Anker-Scroll, Druck-/PDF-Ansicht, Dokument-URL, Zahlung bestätigen.

