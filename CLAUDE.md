# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev          # Start dev server with hot reload (watches server/ and shared/)
npm run build        # Build client (Vite) + server (esbuild) for production
npm run start        # Run production build
npm run check        # TypeScript type checking
npm run db:push      # Apply Drizzle schema migrations to database
npm run db:sanitize  # Clean HTML tags from recipes in database
```

**Testing:**
```bash
npx jest                    # Run all tests
npx jest tests/foo.test.ts  # Run single test file
```

## Architecture Overview

This is a **full-stack TypeScript monorepo** with React frontend and Express backend on a single port.

```
client/           # React 18 + Vite + TailwindCSS + Radix UI
  src/
    pages/        # Route components (home, recipe-detail, favorites)
    components/   # UI components including Radix-based ui/ library
    hooks/        # Custom hooks (useRecipeData, useFavorites, useAuth)

server/           # Express.js + Drizzle ORM
  routes.ts       # API route handlers
  storage.ts      # Database interface (IStorage) + PostgreSQL implementation
  crawler.ts      # Background recipe crawler (15+ recipe sites)
  gemini.ts       # Google Gemini API for screenshot extraction
  services/       # Business logic (recipe-service, enhanced-scraper, youtube-service)
  middleware/     # Security (CORS, rate limiting, request IDs)

shared/           # Shared types (imported by both client and server)
  schema.ts       # Drizzle table definitions + Zod validation schemas
```

**Path aliases:** `@/*` → `client/src/*`, `@shared/*` → `shared/*`

## Key Patterns

**Request/Response Flow:**
```
Routes → ResponseHandler.asyncHandler() → Services → Storage → Database
```

**API Response Format:**
```typescript
// Success: { error: false, message: "...", data: {...} }
// Error:   { error: true, message: "...", requestId: "..." }
```

**Storage Interface:** All database access goes through `IStorage` interface in `storage.ts`, implemented by `DatabaseStorage` class.

**Recipe Scraping:** Domain-specific strategies in `server/services/`:
- Standard sites: Cheerio HTML parsing (`enhanced-scraper.ts`)
- Protected sites: Playwright browser automation (`ultimate-bypass.ts`, `allrecipes-bypass.ts`)
- YouTube: Transcript extraction + Gemini processing (`youtube-service.ts`)
- Screenshots: Gemini Vision API (`gemini.ts`)

## Required Environment Variables

```
DATABASE_URL       # PostgreSQL connection string (Neon recommended)
GEMINI_API_KEY     # Google Gemini API for screenshot/video processing
SESSION_SECRET     # Express session encryption key
```

See `docs/ENVIRONMENT_VARIABLES.md` for full reference including OAuth keys and crawler settings.

## Database

- **ORM:** Drizzle with PostgreSQL
- **Schema:** `shared/schema.ts` (tables: recipes, users, sessions, crawledUrls)
- **Migrations:** Run `npm run db:push` after schema changes

## API Endpoints

```
GET  /api/recipes/paginated    # List recipes (page, limit params)
GET  /api/recipes/search       # Search (q, tags, category, cuisine)
GET  /api/recipes/:id          # Get single recipe
POST /api/recipes/scrape       # Scrape recipe from URL
POST /api/recipes/screenshot   # Extract recipe from image (Gemini Vision)
DELETE /api/recipes/:id        # Delete recipe
```

## Development Notes

- **Node 20+ required** (see `engines` in package.json)
- Dev mode: Vite serves frontend on 5173, proxied to Express API on 5000
- Production: Single Express server serves both static files and API
- Background crawler runs automatically (configurable via `CRAWL_*` env vars)
- Detailed deployment docs in `docs/` directory (Railway recommended)
