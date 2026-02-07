# LiveCity

Hyper-Local Dynamic Guide & B2B Reputation SaaS.

LiveCity ranks places using real-time social media sentiment analysis ("Live Score"), builds AI-powered day routes, and gives businesses direct booking tools — no middleman commissions.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** Supabase (PostgreSQL + pgvector)
- **Maps:** Mapbox GL JS
- **AI:** Vercel AI SDK + OpenAI (sentiment analysis, embeddings, semantic search)
- **Charts:** Recharts
- **Styling:** Tailwind CSS 4

## Getting Started

```bash
# Install dependencies
npm install

# Copy env file and fill in your keys
cp .env.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox GL access token |
| `OPENAI_API_KEY` | OpenAI API key for AI features |
| `CRON_SECRET` | Secret for cron job authentication |

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── venues/          # Venue CRUD + semantic search
│   │   ├── reviews/analyze/ # AI sentiment analysis pipeline
│   │   ├── bookings/        # Direct booking system
│   │   └── cron/            # Live Score recalculation
│   ├── auth/                # Login / Signup pages
│   ├── dashboard/           # Business owner dashboard
│   ├── venue/[slug]/        # Venue detail page
│   └── page.tsx             # Main map + search page
├── components/
│   ├── dashboard/           # Analytics, bookings list
│   ├── layout/              # Header, navigation
│   ├── map/                 # Mapbox map view
│   ├── search/              # Semantic search bar
│   └── venues/              # Venue cards, Live Score badge
├── lib/
│   ├── supabase/            # Client/server/middleware helpers
│   ├── live-score.ts        # Live Score algorithm
│   └── utils.ts             # Shared utilities
├── types/
│   └── database.ts          # Supabase type definitions
└── middleware.ts             # Auth session refresh
supabase/
└── migrations/              # SQL schema (pgvector, RLS)
docs/
└── MASTER_PLAN.md           # Full project strategy document
```

## Key Features

- **Live Score:** Dynamic 0-10 rating based on weighted sentiment with freshness decay
- **Semantic Search:** Vector similarity search ("bbq with kids near river")
- **Direct Booking:** No-commission booking requests via WhatsApp or in-app
- **Business Dashboard:** AI-powered analytics, competitor tracking, action plans
- **CRM-Lite:** Booking request management (accept/reject) for venue owners
