# Fleet Manager — Driver Check-In System

A real-time driver management dashboard for warehouse and logistics operations. Drivers scan a QR code to check in, and managers see them on a live dashboard. Each office has its own isolated queue and login credentials.

## How It Works

```
Manager logs in at /login → selects office → opens dashboard
         ↓
Dashboard shows QR code + live driver queue
         ↓
Driver scans QR with phone → enters name → appears on dashboard
         ↓
Driver gets order & leaves → manager clicks "Done" → removed from list
```

## Features

- **Office Authentication** — Each office has its own login credentials
- **Multi-Office Support** — Isolated driver queues per office (QCA2, QCA3, QCA5, QCC8, QCD7)
- **QR Code Check-In** — Drivers scan a QR code to open the check-in page
- **Live Dashboard** — Auto-refreshes every 3 seconds to show new drivers
- **Printable QR** — Print the QR code and post it at your facility
- **Simple Flow** — Driver enters name once, sees confirmation, done
- **One-Click Remove** — Manager clicks "Done" when driver leaves
- **Queue Position** — Drivers see their position in the queue in real-time

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
  office_id TEXT
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
| Dashboard | `/` | Manager view — QR code + driver list | Yes |
| Check-In | `/scan?office=QCA2` | Driver enters their name | No |
| Print QR | `/print?office=QCA2` | Print-optimized QR code | No |

## API Routes

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/auth/login` | POST | Authenticate office (sets cookie) | No |
| `/api/auth/me` | GET | Check current session | No |
| `/api/drivers` | GET | List waiting drivers for current office | Yes |
| `/api/drivers` | POST | Add new driver to queue | No |
| `/api/drivers?id=X` | DELETE | Remove driver from queue | Yes |
| `/api/qr` | GET | Generate QR code SVG | No |

## Project Structure

```
salam-ticket/
├── app/
│   ├── globals.css           # Global styles (dark theme, animations)
│   ├── layout.tsx            # Root layout (metadata, fonts)
│   ├── page.tsx              # Dashboard (manager view)
│   ├── login/
│   │   └── page.tsx          # Office login page
│   ├── scan/
│   │   └── page.tsx          # Driver check-in page
│   ├── print/
│   │   └── page.tsx          # Printable QR code page
│   └── api/
│       ├── auth/
│       │   ├── login/
│       │   │   └── route.ts  # POST: office login
│       │   └── me/
│       │       └── route.ts  # GET: session check
│       ├── drivers/
│       │   └── route.ts      # GET/POST/DELETE: driver CRUD
│       └── qr/
│           └── route.ts      # GET: QR code SVG generation
├── lib/
│   ├── db.ts                 # Supabase client singleton
│   └── offices.ts            # Office definitions + authentication
└── .env.local                # Environment variables
```

## Authentication

- Cookie-based sessions (`office_session`, httpOnly, 7-day expiry)
- Office credentials are defined in `lib/offices.ts`
- Dashboard checks auth on mount; unauthenticated users are redirected to `/login`
- The `/scan` page is intentionally public (drivers don't need to log in)

## License

MIT
