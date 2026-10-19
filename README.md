# The Conscious Mirror — Logged-in Web App

Instant reflective responses using an LLM, with history, recurring themes, and freemium limits.

## Features

- Multi-step guided form
- Instant reflection via non-directive system prompt
- History + recurring theme extraction
- Free limit (3 reflections / 30 days) + paid unlimited path
- Supabase-ready auth, storage, and usage tracking
- Stripe checkout stub (not wired up yet: no /api/checkout or webhook in this repo)
- Server-side safety check: crisis language is caught before any model call, is not stored,
  and does not use up a reflection
- Free limit is enforced atomically in the database (see `consume_reflection` in `supabase/schema.sql`)

## Local setup

```bash
npm install
cp .env.example .env.local
# Add an LLM key (XAI_API_KEY + MIRROR_MODEL, or OPENAI_API_KEY) and the Supabase keys,
# including SUPABASE_SERVICE_ROLE_KEY (server only). /api/reflect needs all of them.
npm run dev
```

Open http://localhost:3000

## Production setup (Supabase + Stripe + Vercel)

### 1. Supabase
1. Create a project at https://supabase.com
2. In the SQL editor, run the contents of `supabase/schema.sql` (safe to re-run; it also removes the old
   permissive `usage` policies that let users edit their own count)
3. Enable Email auth (or magic links) under Authentication
4. Copy the project URL and anon key into `.env.local` / Vercel env vars
5. (Optional) Add service role key for server-side usage updates

### 2. Stripe
1. Create a product + recurring price for "Unlimited Reflections"
2. Add the price ID and secret key to env vars
3. The `/api/checkout` route creates a Checkout Session
4. On success, mark the user as paid in the `usage` table (via webhook or success page)

### 3. Deploy
- Push the repo to GitHub
- Import into Vercel
- Add all env vars from `.env.example`
- Set `NEXT_PUBLIC_SITE_URL` to your production domain

### 4. Auth
Email/password auth is implemented at `/auth`. After sign-in the dashboard loads history from Supabase and the reflect form uses the authenticated user id.

## Pages and routes

- `/` landing, `/auth` sign in, `/reflect` guided form, `/dashboard` history and usage
- `POST /api/reflect` (Bearer token from the Supabase session)

## Freemium

- Free: 3 reflections per 30-day period
- Paid: unlimited

System prompt is in `src/lib/mirror.ts`.
