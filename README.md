# PlayUML Backend

Express + MongoDB backend for the PlayUML fantasy-music game.

## Tech Stack
- Node.js (ES modules)
- Express 5
- MongoDB + Mongoose
- JWT auth
- Swagger docs

## Environment Variables
Create a `.env` file in project root with:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
YOUTUBE_API_KEY=your_youtube_data_api_key
LASTFM_API_KEY=your_lastfm_api_key

SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=your_verified_sender_email

SCORE_MULTIPLIER=1
ARTIST_DAILY_CAP=25
LASTFM_LISTENERS_DIVISOR=1000
LASTFM_PLAYCOUNT_DIVISOR=100000
YOUTUBE_SUBSCRIBER_DIVISOR=1000
YOUTUBE_VIEWS_DIVISOR=100000

# optional: coin rebalance source weights (defaults to LASTFM_WEIGHT / YOUTUBE_WEIGHT)
COIN_LASTFM_WEIGHT=0.7
COIN_YOUTUBE_WEIGHT=0.3

# optional: RSS news ingestion (no API key needed)
NEWS_RSS_FEEDS=https://www.notjustok.com/feed/,https://www.pulse.ng/entertainment/rss
NEWS_MAX_ITEMS=20
NEWS_CACHE_TTL_MS=600000
NEWS_REQUEST_TIMEOUT_MS=8000
NEWS_REQUIRE_AFROBEATS=true

# optional: AI intel copy (captain/transfer/risk explanations)
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash
```

## Install and Run
```bash
npm install
npm run dev
```

Base URL (local): `http://localhost:5000`

## API Docs
Swagger UI is available at:

`http://localhost:5000/api-docs`

## Main Routes
- `POST /auth/signup`
- `POST /auth/verify`
- `POST /auth/login`
- `GET /users/me` (Bearer token)
- `GET /artistes`
- `POST /teams` (Bearer token)
- `GET /teams/me` (Bearer token)
- `PATCH /teams/me/captain` (Bearer token)
- `GET /teams/me/daily?days=7` (Bearer token)
- `GET /leaderboard/weekly`
- `GET /leaderboard/season`
- `GET /news?limit=20`
- `GET /intel/me` (Bearer token)
- `GET /admin/run-daily-pipeline?key=YOUR_ADMIN_API_KEY`
- `GET /admin/send-daily-digest?key=YOUR_ADMIN_API_KEY`

## Scripts
- `npm run dev` - Start dev server with nodemon
- `npm run seed:artists` - Seed artistes from Spotify IDs
- `npm run seed:youtube` - Update `youtubeChannelId` values from name-to-channel map
- `npm run seed:afrobeats` - Seed Afrobeats artiste set
- `npm run snapshot:daily` - Save daily Spotify stats snapshot
- `npm run score:daily` - Compute daily team scores and leaderboard totals
- `npm run daily:pipeline` - Run snapshot, rebalance coins, sync today's coin snapshot, clear daily intel cache, then score
- `npm run digest:daily` - Send one daily digest email per verified user with a team
- `npm run rebalance:coins` - Rebalance coins (percentile strategy)
- `npm run rebalance:coins:simple` - Rebalance coins (simple strategy)
- `npm run reset:scoring` - Reset all team scoring totals and daily score history
- `npm run reset:game` - Clear daily stats, intel cache, and score history while keeping users and team selections
- `npm run reset:all` - Full fresh start: delete users, teams, scores, daily stats, banter, and intel cache

## Scoring (Current Phase)
- `lastfmScore = (listenerDelta / LASTFM_LISTENERS_DIVISOR) + (playcountDelta / LASTFM_PLAYCOUNT_DIVISOR)`
- `youtubeScore = (subscriberDelta / YOUTUBE_SUBSCRIBER_DIVISOR) + (viewsDelta / YOUTUBE_VIEWS_DIVISOR)`
- `artistRawScore = lastfmScore + youtubeScore`
- `artistScore = clamp(artistRawScore, 0, ARTIST_DAILY_CAP) * SCORE_MULTIPLIER`
- `captainScore = round(artistScore * 1.5)` for captain only

## YouTube Data Notes
- Daily snapshots now also read YouTube channel statistics via YouTube Data API v3.
- Each artiste can include `youtubeChannelId` in the `Artiste` document.
- If `YOUTUBE_API_KEY` is missing or YouTube fetch fails, snapshot continues with YouTube stats as `0`.
- `seed:youtube` supports both direct channel IDs and query hints (for example `Wizkid -> starboytv`) to resolve IDs.
- Recommended flow:
  1) `npm run seed:afrobeats`
  2) Add tricky overrides in `src/scripts/seedYoutubeChannels.js` (for example `Wizkid: "starboytv"`)
  3) `npm run seed:youtube`
  4) `npm run daily:pipeline`

## News Injection (RSS, No API Key)
- Endpoint: `GET /news?limit=20`
- Uses RSS/Atom feeds and normalizes into:
  - `id`, `title`, `url`, `summary`, `imageUrl`, `source`, `publishedAt`
- Feed fetch is cached in-memory (`NEWS_CACHE_TTL_MS`) to keep response fast and reduce source requests.

## Daily Intel Cache
- Endpoint: `GET /intel/me` (auth required)
- Intel is now generated **once per user per UTC day** and then served from Mongo cache.
- Optional forced refresh (admin only):
  - `GET /intel/me?refresh=1`
  - header: `x-admin-key: <ADMIN_API_KEY>`

## Cron Recommendation
- Use one Render cron job instead of multiple separate jobs.
- Command: `npm run daily:pipeline`
- Suggested schedule: `15 1 * * *` UTC
- This keeps ordering correct: snapshot -> coin rebalance -> sync today's coin values -> clear today's intel cache -> score teams

## cron-job.org Setup
- If your host does not provide cron on your plan, use `cron-job.org`.
- Create a job that hits:
  - `GET https://YOUR_BACKEND_DOMAIN/admin/run-daily-pipeline?key=YOUR_ADMIN_API_KEY`
- Recommended schedule:
  - `15 1 * * *` UTC
- Optional status check:
  - `GET https://YOUR_BACKEND_DOMAIN/admin/run-daily-pipeline/status?key=YOUR_ADMIN_API_KEY`

## Daily Digest
- Trigger URL:
  - `GET https://YOUR_BACKEND_DOMAIN/admin/send-daily-digest?key=YOUR_ADMIN_API_KEY`
- Status URL:
  - `GET https://YOUR_BACKEND_DOMAIN/admin/send-daily-digest/status?key=YOUR_ADMIN_API_KEY`
- Digest sends once per user per UTC day and skips users without a verified email or drafted team.
- Suggested schedule:
  - run this after the pipeline, for example `06:30 UTC` if your pipeline runs earlier in the morning

## Fresh Season Reset
- If you want a clean restart without deleting users or drafted teams:
  1) `npm run reset:game`
  2) `npm run daily:pipeline`

## Full Fresh Start
- If you want a full restart from zero before launch:
  1) `npm run reset:all`
  2) create new users and draft new teams
  3) `npm run daily:pipeline`
  4) let Render cron take over with `npm run daily:pipeline`
