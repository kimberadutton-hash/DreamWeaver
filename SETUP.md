# Dream Weaver — Setup Guide

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste and run `supabase-schema.sql`
3. In **Authentication → Settings**, enable email/password sign-in
4. Copy your project URL and keys from **Settings → API**

## 2. Environment Variables

Copy and fill in both env files:

**Root `.env`** (for the server):
```
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
PORT=3001
```

**`client/.env`** (for Vite/React):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## 3. Run Locally

```bash
npm run dev
```

This starts both the Express server (port 3001) and Vite dev server (port 5173) concurrently.
Open [http://localhost:5173](http://localhost:5173).

## 4. Deploy to Vercel

### Frontend
- Import the `client/` folder as a Vercel project
- Framework preset: **Vite**
- Add the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars

### Backend
- Import the `server/` folder as a separate Vercel project (or use a platform like Railway/Render)
- Add all four env vars
- Update the Vite proxy in `client/vite.config.js` to point to the deployed server URL

## Project Structure

```
dream-weaver/
├── client/              # React + Vite frontend
│   ├── src/
│   │   ├── contexts/    # AuthContext
│   │   ├── components/  # Layout, Sidebar
│   │   └── pages/       # All page components
│   └── .env             # VITE_ vars
├── server/              # Express API
│   ├── routes/          # analyze, ask, transcribe
│   └── lib/             # Anthropic client
├── supabase-schema.sql  # Run in Supabase SQL Editor
└── .env                 # Server env vars
```

## Features Built

- ✅ Auth (sign up / sign in / sign out)
- ✅ New Dream form with voice dictation + photo upload
- ✅ Daily Jungian prompt
- ✅ AI analysis (reflection, archetypes, symbols, tags)
- ✅ Dream Archive with search
- ✅ Dream Detail with edit, print, email analyst, delete
- ✅ Symbols & Themes frequency map
- ✅ Timeline grouped by year
- ✅ Ask Your Archive (natural language AI queries)
- ✅ Import CSV (Google Sheets format)
- ✅ Settings (name, analyst, dark mode)
