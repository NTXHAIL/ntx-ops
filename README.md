# Hail Ops

Internal shop-operations software for **NTX Hail** (Dakine Investments LLC DBA NTX Hail).

Hail Ops is Phase 1 of a hail / paintless dent repair workspace: write estimates from a shop-owned PDR matrix, keep customers and claims attached, and hand an adjuster a clean printable sheet. It is inspired by the *kind* of shop workflow tools used in mobile recon — not a clone of Mobile Tech RX or any carrier schedule.

## What Phase 1 includes

- **HailSpec estimator** — navy header, carrier selector (State Farm matrix verbatim; other carriers are stubs that fall back to State Farm prices), overhead car silhouette with heat colors / R&R / CONV badges, panel editor (bottom sheet on phones, right drawer on desktop), photos, auto-save, saved-estimate list, and Review & Export (print, HTML report, photo ZIP, mailto). Phone, tablet, and desktop layouts share the same Hail Ops look (DM Sans, navy, blue/red).
- **Per-panel repair type** — PDR (matrix dent count + dime/nickel/quarter/half-dollar + markups), conventional (notes + hours and/or $), or replacement / R&R (description + parts $ + labor).
- **Oversized dents** — + / − steppers for OS, 2× OS, and 3× OS. Counts stay off the matrix dent total. Admin unit prices live under Settings → Markups (old DOS maps to 2× OS).
- **R&I labor** — + / − quantity on catalog times (headliner, moldings, glass, etc.).
- **VIN decoder** — NHTSA vPIC `DecodeVinValues` fills year / make / model / body class. If NHTSA fails, HailSpec’s local WMI year/make fallback is used. Invalid VINs do not block save.
- **Customers and claims** — phones, emails, address, vehicles, claim number, carrier, adjuster, deductible.
- **Print / PDF-friendly estimate** — use the browser print dialog to save a PDF.
- **Simple team auth** — email + password, with `ADMIN` and `ESTIMATOR` roles. Admins own settings and approve/decline; estimators write drafts and submit them.
- **Storm Leads (phase 1)** — ingest hail reports, approve storms, publish a mobile landing page, capture leads with TCPA consent proof and UTMs. No automatic ad spend and no SMS to the customer.

## What is not in Phase 1 (roadmap)

Documented so the shop does not expect these yet:

- Parts locator
- Work orders
- Invoices / payments
- Email and SMS sending to customers (staff new-lead email is in Storm Leads)
- Twilio speed-to-lead texts
- Meta / Google campaign launch
- QuickBooks Online integration
- Partner portals, CAT mass scheduling, or Mobile Tech RX feature parity

## Stack

Next.js (App Router) + TypeScript + Tailwind + shadcn/ui, Prisma, and SQLite. No extra services required for local use.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

`npm run dev` generates the Prisma client, creates `prisma/dev.db` if needed, and seeds catalogs plus sample records when the database is empty.

The app listens on [http://127.0.0.1:43147](http://127.0.0.1:43147).

### Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Prisma SQLite URL. Default `file:./dev.db` is relative to `/prisma`. |
| `AUTH_SECRET` | Signs the session cookie. Change it anywhere this is shared. |
| `NHTSA_VPIC_URL` | Optional. Override the public NHTSA vPIC decode endpoint. No API key. |
| `STAFF_NOTIFY_EMAIL` | Inbox for new-lead staff mail. Defaults to `admin@ntxhail.local`. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Optional SMTP transport. If `SMTP_HOST` is unset, Hail Ops logs the staff email to the console. |
| `TWILIO_*` / `META_AD_ACCOUNT_ID` / `GOOGLE_ADS_CUSTOMER_ID` | Phase 2 stubs. Sending SMS or launching ads throws. |

VIN decode calls `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/{vin}?format=json`. It is a free public API. Leave `NHTSA_VPIC_URL` unset unless you are pointing at a mock.

Do not commit `.env`. `.env.example` is the only env file that belongs in git.

### Seeded demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@ntxhail.local` | `HailOps!admin` |
| Estimator | `estimator@ntxhail.local` | `HailOps!est` |

Seeded shop data includes three customers, one State Farm claim, three estimates (draft / pending / approved), labor rates and R&I times, markup rules, the **State Farm HailSpec 13-panel matrix**, and stub carrier records (Allstate, Farmers, GEICO, Progressive, Nationwide, Custom) that fall back to State Farm until filled in under Settings → Matrix.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Ensure DB + seed, then start Next.js on port 43147 |
| `npm test` | Pricing math tests (State Farm lookup, add-ons, R&R / Conventional / R&I, report lines) |
| `npm run test:e2e` | Playwright: key pages at 390 / 768 / 1440px have no horizontal overflow; save bar and panel-editor footer stay in view |
| `npm run lint` | ESLint |
| `npm run build` | Production build |
| `npm run db:seed` | Re-run the idempotent seed |
| `npm run db:studio` | Prisma Studio |
| `npm run storms:ingest` | Pull SPC / NWS hail reports for TX/OK/AR/MO, cluster storms, map ZIPs |

## How estimating works

1. Pick a customer (and optional vehicle / claim). Decode a VIN if you have one.
2. Tap a panel on the HailSpec-style silhouette. The panel editor is a bottom sheet on phones and a right-side drawer on desktop.
3. Leave R&R / Conventional off for PDR: step a dent-count **range**, pick size, tap add-ons. Or toggle R&R / Conventional for hours × shop labor.
4. Enable per-panel R&I ops (headliner, moldings, glass, …) with include toggles, optional R&R on ops, time +/−, and a labor-rate stepper.
5. OS / Double OS stay off the matrix dent count. Carrier chips match HailSpec labels (State Farm selected by default) but do not change pricing — the shop matrix still prices the job.
6. Review & Export lists entered panels; Print uses the existing Hail Ops print route after save.
7. Save a draft, submit for approval, then an admin approves or declines.

Totals are always integer cents. The same calculator used in the UI is covered by `src/lib/estimate-calc.test.ts`.

## Storm Leads

Phase 1 of an in-house hail lead-generation system. A competitor (Hail Surge) runs geo ads to a survey page, then texts and books in GoHighLevel. Hail Ops now owns the storm + landing + inbox slice so Joseph can approve an event before anything customer-facing goes live.

### Ingest hail into storms

```bash
# Last 7 UTC days from SPC daily CSVs + NWS Hail alerts
npm run storms:ingest

# Wider window
npm run storms:ingest -- --days=7

# Recorded SPC sample (no network)
npm run storms:ingest -- --sample=data/samples/spc-260510-hail.csv

# Parse only — do not write the database
npm run storms:ingest -- --days=3 --dry-run
```

Sources:

- SPC Local Storm Reports: `https://www.spc.noaa.gov/climo/reports/YYMMDD_rpts_hail.csv` (YY is the two-digit year). Hail size is hundredths of an inch (`175` = 1.75").
- NWS alerts: `https://api.weather.gov/alerts?event=Hail` for TX, OK, AR, and MO.
- If every live fetch fails, ingest falls back to `data/samples/spc-260510-hail.csv`.
- ZIP mapping uses the bundled GeoNames-derived centroids in `data/zips-tx-ok-ar-mo.csv` and an 8-mile radius around each report. `src/lib/storms/mrms.ts` is the hook for NOAA MRMS MESH swaths later (`zipsFromSwath` already exists).

Storms land as **Detected**. An admin must **Approve** before `/storm/<slug>` exists. Re-running ingest updates Detected storms and skips Approved / Active / Closed so an edited ZIP list is not overwritten.

Seeded demo storms:

| Storm | Status | Landing |
| --- | --- | --- |
| Dallas–Fort Worth hail (Apr 28, 2026) | Approved | `/storm/2026-04-28-dallas-fort-worth` |
| Quitman / Hawkins hail (May 10, 2026) | Detected | hidden until approved |
| Oklahoma City hail (Nov 2, 2025) | Closed | hidden |

The DFW storm includes a seed lead (Casey Nguyen) with SMS consent proof and Facebook UTMs.

### Landing page and consent

Approved (or Active) storms publish a mobile-first NTX Hail page at `/storm/<slug>`. Offer copy is editable per storm — do not hardcode deductible-waiver claims. The survey asks hail damage, comprehensive insurance, optional VIN (NHTSA decode), ZIP, name, mobile, email, preferred contact, and an optional photo.

SMS consent is a separate, unchecked-by-default checkbox with TCPA-style wording (frequency, msg & data rates, STOP, consent not a condition of service) and a link to `/privacy`. `/privacy` is placeholder copy marked **LEGAL REVIEW** for Joseph / counsel.

Each submission stores checkbox state, consent text + version `ntxhail-sms-v1`, timestamp, IP, user agent, and page URL (including `utm_*`, `fbclid`, `gclid`). Hail Ops creates or links a **Customer** and a **Lead**. Staff get a new-lead email (console in dev). **No SMS or email is sent to the lead.**

### Leads inbox

`/leads` lists submissions, filterable by storm and status (New / Contacted / Booked / Estimated / Won / Lost). Status is updated on the lead detail page, which also shows consent proof and attribution.

### Phase 2 hooks (do not call yet)

- `src/lib/integrations/sms.ts` — Twilio client stub
- `src/lib/integrations/ads.ts` — Meta / Google campaign stub
- `src/lib/mailer.ts` — pluggable staff mailer

## Roles

- **Estimator** — customers, claims, estimate drafts, submit for approval, view storms and leads.
- **Admin** — everything an estimator can do, plus shop catalogs, approve/decline estimates, approve/close storms, and edit ZIP lists / offer copy.

User management is a stub in Phase 1: accounts are seeded, not administered in the UI.

## Product name

- **Product:** Hail Ops
- **Brand:** NTX Hail
- **Legal:** Dakine Investments LLC DBA NTX Hail
