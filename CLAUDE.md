# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev        # Start dev server at localhost:3000
npm run build      # Production build
npm run preview    # Preview production build
```

No test framework configured.

## Tech Stack

- **Nuxt 3** (full-stack) + **Vue 3** Composition API + **TypeScript**
- **SQLite** via **@libsql/client** (Turso-compatible) + **Drizzle ORM**
- **Tailwind CSS v4** + **DaisyUI v5** — custom dark "tesla" theme (primary: `#E31937`)
- Server runtime: **Nitro**
- Deployment target: **Cloudflare Pages** + **Turso**

## Architecture

```
app/                    # Frontend (Nuxt srcDir)
  pages/                # File-based routing (index, charging, auth/login, auth/callback)
  composables/          # useAuth() — session-based auth
  services/             # AuthService — session/cookie-based auth
server/                 # Backend (Nitro serverDir)
  api/                  # API routes (auth/, charging/)
  database/             # schema.ts (Drizzle), db.ts (libsql init)
  utils/                # session.ts, tesla-token.ts
data/                   # Local SQLite database file (gitignored, dev only)
```

### Key Data Flow

- **Auth**: Local username/password login → session cookie (HTTP-only) → Tesla token managed entirely server-side
- **Tesla OAuth**: One-time binding flow — tokens stored in DB, auto-refreshed when expired
- **Charging logs**: Start/end charging captures full Tesla API response as raw JSON (`raw_data_start`, `raw_data_end`)
- **No client-side token**: Frontend never handles Tesla tokens; server reads from DB via session cookie auth

### Database Tables

- `vehicles` — cached vehicle info (tesla_id, display_name, vin, state)
- `charging_logs` — charging sessions (battery start/end, odometer, cost, location, charge_type, raw API data)
- `tokens` — Tesla OAuth access/refresh tokens
- `sessions` — login session tokens

## Environment Variables

```
TESLA_CLIENT_ID, TESLA_CLIENT_SECRET
TESLA_REDIRECT_URI=http://localhost:3000/auth/callback
TESLA_AUTH_URL=https://auth.tesla.com/oauth2/v3/authorize
TESLA_TOKEN_URL=https://auth.tesla.com/oauth2/v3/token
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<your-password>
TURSO_DB_URL=file:data/tesla.db        # Local dev: file:data/tesla.db, Prod: libsql://your-db.turso.io
TURSO_AUTH_TOKEN=                        # Required for Turso remote DB
```

## Conventions

- **All UI text and comments in Traditional Chinese (zh-TW)**
- Use `$fetch` for API calls (Nuxt's ofetch)
- Composables wrap refs with `readonly()` before returning
- Services use static methods, no instantiation
- All DB operations are async (libsql driver)
- External APIs: Tesla Fleet API (`fleet-api.prd.na.vn.cloud.tesla.com`)
