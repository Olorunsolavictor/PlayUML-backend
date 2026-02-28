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

## Scripts
- `npm run dev` - Start dev server with nodemon
- `npm run seed:artists` - Seed artistes from Spotify IDs
- `npm run seed:youtube` - Update `youtubeChannelId` values from name-to-channel map
- `npm run seed:afrobeats` - Seed Afrobeats artiste set
- `npm run snapshot:daily` - Save daily Spotify stats snapshot
- `npm run score:daily` - Compute daily team scores and leaderboard totals
- `npm run rebalance:coins` - Rebalance coins (percentile strategy)
- `npm run rebalance:coins:simple` - Rebalance coins (simple strategy)
- `npm run reset:scoring` - Reset all team scoring totals and daily score history

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
  4) `npm run snapshot:daily`
  5) `npm run score:daily`
