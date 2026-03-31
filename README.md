# Dream Weaver

A Jungian dream journal for deepening self-knowledge through active engagement with the unconscious. Record dreams, receive AI-assisted depth psychological analysis (archetypes, symbols, shadow work), track patterns over time, and maintain a living relationship with your inner life — optionally in collaboration with an analyst or therapist.

## Prerequisites

- Node.js 18 or higher
- A [Supabase](https://supabase.com) account (free tier works)
- An [Anthropic API key](https://console.anthropic.com) (for AI analysis features)

## Setup

**1. Clone the repo and install dependencies**

```bash
git clone https://github.com/your-username/dream-weaver.git
cd dream-weaver
npm install
```

**2. Set up Supabase**

- Create a new project at [supabase.com](https://supabase.com)
- In the SQL Editor, paste and run `supabase-schema.sql` (then any `migration_*.sql` files in order)
- In Authentication → Settings, enable **Email/Password** sign-in

**3. Configure environment variables**

```bash
# Server (root directory)
cp .env.example .env

# Client (Vite/React)
cp client/.env.example client/.env
```

Fill in both files with your credentials. Supabase values come from your project's **Settings → API** page.

**4. Start the dev server**

```bash
npm run dev
```

Opens at [http://localhost:5173](http://localhost:5173). The Express API runs on port 3001.

## Where to find your credentials

| Credential | Where to get it |
|---|---|
| `VITE_SUPABASE_URL` / `SUPABASE_URL` | Supabase project → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` / `SUPABASE_ANON_KEY` | Supabase project → Settings → API → `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API → `service_role` key (keep secret) |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys |

## Project structure

```
dream-weaver/
├── client/              # React 18 + Vite frontend
│   ├── src/
│   │   ├── contexts/    # AuthContext (auth, profile, dreamCount)
│   │   ├── hooks/       # useNavTier, useApiKey, usePrivacySettings
│   │   ├── components/  # Layout, Sidebar, shared UI
│   │   └── pages/       # All page components
│   └── .env             # VITE_ vars (copy from .env.example)
├── server/              # Express API (AI proxying)
├── supabase-schema.sql  # Run this first in Supabase SQL Editor
├── migration_*.sql      # Run after schema, in order
└── .env                 # Server env vars (copy from .env.example)
```

See [SETUP.md](SETUP.md) for deployment instructions.
