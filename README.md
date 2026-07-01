# Fleet Manager — Driver Check-In System

A real-time driver management dashboard for warehouse and logistics operations. Drivers scan a QR code to check in, and managers see them on a live dashboard. Each office has its own isolated queue and login credentials.

## How It Works

```
Manager logs in at /login → selects office → opens dashboard
         ↓
Dashboard shows QR code (permanent) + live driver queue
         ↓
Driver scans QR with phone → enters name → appears on dashboard
         ↓
Manager can: "Done" (any driver) or "Break" (next driver)
         ↓
Break = 1 hour pause → driver returns to exact same queue position
Done = driver completed → removed from active queue
```

## Features

- **Office Authentication** — Each office has its own login credentials
- **Multi-Office Support** — Isolated driver queues per office (QCA2, QCA3, QCA5, QCC8, QCD7)
- **Permanent QR Code** — QR code never expires, no refresh needed, cached aggressively
- **Live Dashboard** — Auto-refreshes every 3 seconds to show new drivers
- **Printable QR** — Print the QR code and post it at your facility
- **Done Button for All** — Every driver in queue has a "Done" (تم) button, not just the first
- **Driver Break System** — Next driver can take a 1-hour break and return to their exact queue position
- **Break Countdown** — Both dashboard and driver's phone show live countdown during break
- **Queue Position** — Drivers see their position in the queue in real-time
- **Device Remembering** — Drivers don't need to re-enter name on same device
- **Auto-Return from Break** — After 1 hour, driver automatically returns to queue (server-side)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| React | 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 + custom CSS |
| Database | Supabase (PostgreSQL) |
| QR Code | `qrcode` library (server-side SVG) |
| Deployment | Vercel |

## Setup

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/salam-ticket.git
cd salam-ticket
npm install
```

### 2. Create Supabase project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click **New Project**
3. Name: `salam-ticket`
4. Set a password, choose a region
5. Click **Create**

### 3. Create the database table

Go to **SQL Editor** and run:

```sql
CREATE TABLE drivers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'waiting',
  office_id TEXT,
  device_id TEXT,
  completed_at TIMESTAMP,
  break_started_at TIMESTAMPTZ
);
```

### 4. Get your API keys

Go to **Settings → API** and copy:
- **Project URL**
- **service_role key**

### 5. Add environment variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 6. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

1. Push to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Add environment variables in **Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Click **Deploy**

## Pages

| Page | URL | Purpose | Auth Required |
|------|-----|---------|---------------|
| Login | `/login` | Office login (select office + enter password) | No |
| Dashboard | `/` | Manager view — QR code + driver list + break management | Yes |
| Check-In | `/scan?office=QCA2` | Driver enters their name | No |
| Print QR | `/print?office=QCA2` | Print-optimized QR code | No |

## API Routes

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/auth/login` | POST | Authenticate office (sets cookie) | No |
| `/api/auth/logout` | POST | Clear session cookie | No |
| `/api/auth/me` | GET | Check current session | No |
| `/api/drivers` | GET | List waiting/on_break drivers for current office | Yes |
| `/api/drivers` | POST | Add new driver to queue (or re-join after break/checkout) | No |
| `/api/drivers?id=X` | DELETE | Mark driver as checked_out | Yes |
| `/api/drivers/break` | POST | Put driver on 1-hour break | Yes |
| `/api/drivers/check-device` | GET | Check if device is registered for an office | No |
| `/api/qr` | GET | Generate permanent QR code SVG (cached) | No |

## Driver Statuses

| Status | Description |
|--------|-------------|
| `waiting` | Active in queue, waiting to be served |
| `on_break` | On a 1-hour break, will auto-return to original position |
| `checked_out` | Completed, removed from active queue |

## Break System

When a manager clicks **Break** on the next driver:
1. Driver's status changes to `on_break` (original `scanned_at` is preserved)
2. Driver's phone shows a countdown timer
3. Dashboard shows the driver in "On Break" section with countdown
4. After 1 hour, server auto-returns driver to `waiting` status
5. Driver returns to their **exact original queue position** (because `scanned_at` was preserved)

If a driver scans the QR while on break, they rejoin the queue immediately at their original position.

## Project Structure

```
salam-ticket/
├── app/
│   ├── globals.css           # Global styles (dark theme, animations, break styles)
│   ├── layout.tsx            # Root layout (metadata, fonts)
│   ├── page.tsx              # Dashboard (manager view, break management)
│   ├── login/
│   │   └── page.tsx          # Office login page
│   ├── scan/
│   │   └── page.tsx          # Driver check-in page (with break screen)
│   ├── print/
│   │   └── page.tsx          # Printable QR code page
│   └── api/
│       ├── auth/
│       │   ├── login/
│       │   │   └── route.ts  # POST: office login
│       │   ├── logout/
│       │   │   └── route.ts  # POST: clear session
│       │   └── me/
│       │       └── route.ts  # GET: session check
│       ├── drivers/
│       │   ├── route.ts      # GET/POST/DELETE: driver CRUD + auto-return breaks
│       │   ├── break/
│       │   │   └── route.ts  # POST: put driver on break
│       │   └── check-device/
│       │       └── route.ts  # GET: check device registration
│       └── qr/
│           └── route.ts      # GET: permanent QR code SVG generation
├── lib/
│   ├── db.ts                 # Supabase client singleton
│   └── offices.ts            # Office definitions + authentication
├── supabase/
│   └── migrations/
│       ├── 002_add_device_id.sql
│       └── 003_add_break_columns.sql
└── .env.local                # Environment variables
```

## Authentication

- Cookie-based sessions (`office_session`, httpOnly, 7-day expiry)
- Office credentials are defined in `lib/offices.ts`
- Dashboard checks auth on mount; unauthenticated users are redirected to `/login`
- The `/scan` page is intentionally public (drivers don't need to log in)

## Database Migrations

Run these in order via Supabase SQL Editor:

1. **002_add_device_id.sql** — Adds `device_id` column for device tracking
2. **003_add_break_columns.sql** — Adds `break_started_at` column for break system

## License

MIT
