# AutoCount - AI Cloud Accounting Platform

A full-featured cloud accounting platform built with Next.js, featuring a **Custom Invoice Template Designer** and an **AI Business Chat Assistant**.

## Features

### Core Accounting
- **Chart of Accounts** — Tree view with CRUD, grouped by type (Asset, Liability, Equity, Revenue, Expense)
- **General Ledger** — Journal entries with double-entry bookkeeping, auto-balance validation
- **Contacts** — Customer and vendor management with search and type filtering
- **Invoicing** — Create, send, and track invoices with dynamic line items and auto-calculations
- **Reports** — Profit & Loss, Balance Sheet, Trial Balance, Aged Receivables/Payables
- **Dashboard** — Real-time summary cards, revenue chart, recent invoices, overdue alerts

### Feature 1: Custom Invoice Template Designer
- Section-based configurator with live preview
- Toggle sections on/off: Header, Document Info, Bill To, Line Items, Totals, Footer
- Custom fields with one-click presets (PO Number, Blanket Order, Delivery Order, etc.)
- Style controls: primary color, font family, font size
- WYSIWYG preview that matches the printed PDF
- Multi-template support per company

### Feature 2: AI Business Chat Assistant
- Natural language questions about your business data
- Two-step AI pipeline: query generation + response formatting via Anthropic Claude API (Claude Sonnet 4)
- Safe query execution with allowlist validation (read-only, company-scoped)
- Floating chat panel accessible from every page
- Suggestion chips for common queries
- Error handling for all edge cases

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS v4 + shadcn/ui |
| Database | PostgreSQL via Neon (serverless) |
| ORM | Prisma 7 with `@prisma/adapter-pg` |
| Auth | NextAuth.js v4 (credentials provider) |
| PDF | @react-pdf/renderer |
| AI | Anthropic Claude API (Claude Sonnet 4) |
| Hosting | Vercel |

---

## Deploy to Production (Vercel + Neon)

### Step 1: Create a Neon Database (free)

1. Go to [neon.tech](https://neon.tech) and sign up
2. Create a new project (any name, choose nearest region)
3. Copy the **connection string** — it looks like:
   ```
   postgresql://user:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### Step 2: Push to GitHub

```bash
cd Autocount
git init
git add .
git commit -m "Initial commit - AutoCount AI Accounting Platform"
git remote add origin https://github.com/YOUR_USERNAME/autocount.git
git push -u origin main
```

### Step 3: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign up (free)
2. Click **"Add New Project"** and import your GitHub repo
3. In the **Environment Variables** section, add these 4 variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Neon connection string from Step 1 |
| `NEXTAUTH_SECRET` | Any random string (run `openssl rand -base64 32` to generate) |
| `NEXTAUTH_URL` | `https://your-app-name.vercel.app` (update after first deploy) |
| `ANTHROPIC_API_KEY` | Your Anthropic API key (from [console.anthropic.com](https://console.anthropic.com)) |

4. Click **Deploy** — Vercel will build and deploy automatically

### Step 4: Set Up the Database

After the first deploy, push the schema to your Neon database:

```bash
# Set DATABASE_URL to your Neon connection string
set DATABASE_URL=postgresql://user:password@host/db?sslmode=require

# Push the schema to Neon
npx prisma db push

# Seed with sample data
npm run seed
```

### Step 5: Done!

Your app is live at `https://your-app-name.vercel.app`. Login with:
- **Email:** admin@techventures.my
- **Password:** admin123

> **Note:** Update `NEXTAUTH_URL` in Vercel environment variables to match your actual Vercel URL, then redeploy.

---

## Local Development

### Prerequisites
- Node.js 20+
- A PostgreSQL database (Neon free tier works)

### Installation

```bash
npm install

# Copy env template and fill in your values
cp .env.example .env

# Push schema to your database
npx prisma db push

# Generate Prisma client
npx prisma generate

# Seed with sample data
npm run seed

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Demo Credentials
- **Email:** admin@techventures.my
- **Password:** admin123

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login and registration pages
│   ├── (dashboard)/      # Main app pages (sidebar layout)
│   │   ├── accounts/     # Chart of Accounts
│   │   ├── contacts/     # Customer & vendor management
│   │   ├── dashboard/    # Dashboard with stats
│   │   ├── invoices/     # Invoice list, create, view/edit
│   │   ├── journal/      # General Ledger / Journal entries
│   │   ├── reports/      # Financial reports
│   │   ├── settings/     # Company settings
│   │   └── templates/    # Invoice Template Designer
│   └── api/              # API routes
├── components/
│   ├── chat/             # AI Chat panel and messages
│   ├── layout/           # Sidebar, topbar
│   ├── pdf/              # PDF renderer component
│   ├── template-editor/  # Template config panel + preview
│   └── ui/               # shadcn/ui components
├── lib/
│   ├── ai/               # System prompt, query validator, executor
│   ├── auth.ts           # NextAuth configuration
│   └── prisma.ts         # Prisma client singleton
├── types/                # TypeScript types and template config
└── generated/prisma/     # Generated Prisma client
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run seed` | Seed database with sample data |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:studio` | Open Prisma Studio (DB browser) |
