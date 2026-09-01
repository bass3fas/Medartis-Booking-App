# Medartis Booking App

A Next.js application for scheduling surgical-set bookings, coordinating Warehouse work, recording set usage, and keeping an auditable history in Google Sheets and PostgreSQL.

## Requirements

- Node.js 20+
- A PostgreSQL database reachable from the deployment
- A Google Cloud service account with access to the booking spreadsheet and Drive folder
- HTTPS in production (required by service workers and browser push notifications)

## Setup

```bash
cd medartis
cp .env.example .env
npm ci
npx prisma migrate deploy
npm run dev
```

Open `http://localhost:3000`. New accounts are created as `operator`; an administrator must promote them to `sales`, `warehouse`, or `admin` in PostgreSQL before they can access the app.

## Environment variables

Copy `.env.example` and provide every value appropriate to your deployment. Never commit `.env`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Prisma. |
| `GOOGLE_SPREADSHEET_ID` | Yes | Google Sheet containing operational tables, including `Bookings` and `BookingSets`. |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Yes | Service-account email with Sheet and Drive access. |
| `GOOGLE_PRIVATE_KEY` | Yes | Service-account private key; preserve newline escapes. |
| `GOOGLE_DRIVE_PARENT_FOLDER_ID` | For uploads | Drive folder for uploaded booking/set files. |
| `VAPID_SUBJECT` | For push | Contact URI such as `mailto:operations@example.com`. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | For push | Public VAPID key exposed to the browser. |
| `VAPID_PRIVATE_KEY` | For push | Private VAPID key used only by the server. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Optional | SMTP transport and sender for email notifications. |
| `WAREHOUSE_EMAIL` | Optional | Additional email recipient when a booking is created. |
| `SALES_COORDINATOR_EMAIL` | Optional | Email recipient for usage notifications. |

Generate a VAPID key pair once with `npx web-push generate-vapid-keys`. Use the same pair in every deployment; changing it requires users to enable notifications again.

## Booking and notification workflow

1. A Sales user creates a booking. The application writes the row to the `Bookings` sheet and sends a web-push message to every subscribed user whose role is `warehouse`.
2. Warehouse users sign in and select **Enable notifications** in the in-app prompt. They must allow the browser permission; this stores each browser/PWA device subscription in PostgreSQL.
3. Warehouse or Admin updates a booking. When its status changes *to* `Confirmed` or `Delivered`, the Sales user assigned to the booking receives a web-push message on every subscribed device.
4. The service worker displays the message while the browser or installed PWA is in the background. Selecting it opens the bookings page.
5. Invalid/expired push endpoints are removed automatically. If VAPID configuration is absent, operations continue but push delivery is intentionally skipped and logged.

Browser push cannot be enabled silently: the user must accept the browser permission prompt. iOS requires the app to be installed as a PWA before web push is available.

## Architecture

- `app/actions/`: server actions for Sheets/Drive mutations and reads.
- `app/api/save-subscription/`: API route that persists browser push subscriptions.
- `app/components/`: reusable client UI, including the notification permission prompt.
- `app/lib/`: service integrations and shared notification code.
- `app/types/interfaces.ts`: shared application contracts.
- `prisma/`: PostgreSQL schema and migrations.

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```

The existing codebase may report legacy lint/type issues outside the notification feature; resolve those before treating lint as a release gate.
