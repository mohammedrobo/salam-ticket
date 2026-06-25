# Fleet Manager — Driver Check-In System

A real-time driver management dashboard for warehouse and logistics operations. Drivers scan a QR code to check in, and managers see them on a live dashboard.

## How It Works

```
Manager opens dashboard → sees QR code + waiting drivers
         ↓
Driver scans QR with phone → enters name → appears on dashboard
         ↓
Driver gets order & leaves → manager clicks "Done" → removed from list
```

## Features

- **QR Code Check-In** — Drivers scan a QR code to open the check-in page
- **Live Dashboard** — Auto-refreshes every 3 seconds to show new drivers
- **Printable QR** — Print the QR code and post it at your facility
- **Simple Flow** — Driver enters name once, sees confirmation, done
- **One-Click Remove** — Manager clicks "Done" when driver leaves

## Tech Stack

- **Frontend:** Next.js 16, React, Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **QR Code:** Generated dynamically per domain
- **Deployment:** Vercel

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
  status TEXT DEFAULT 'waiting'
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

| Page | URL | Purpose |
|------|-----|---------|
| Dashboard | `/` | Manager view — QR code + driver list |
| Check-In | `/scan` | Driver enters their name |
| Print QR | `/print` | Print-optimized QR code |

## Project Structure

```
salam-ticket/
├── app/
│   ├── page.tsx          # Dashboard
│   ├── scan/page.tsx     # Driver check-in
│   ├── print/page.tsx    # Printable QR
│   └── api/
│       ├── drivers/      # CRUD for drivers
│       └── qr/           # QR code generation
├── lib/
│   └── db.ts             # Supabase client
└── .env.local            # Environment variables
```

## License

MIT