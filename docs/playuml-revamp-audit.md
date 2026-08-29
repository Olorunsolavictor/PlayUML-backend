# PlayUML Revamp Audit

_Last updated: 2026-08-29_

## Current Read

PlayUML is no longer just a fantasy music experiment. The strongest shape is now clear:

- A simple fantasy A&R game.
- Users build a five-artiste squad.
- The football pitch is the main mental model.
- The game should reward people who spot artistes early.
- The admin area should help us understand if scoring reflects real-life momentum.

The current app works, but it has grown too many surfaces too quickly. The revamp should simplify the player experience, protect the working backend, and make the pitch the center of the game.

## What Works

### Core Game

- Five-artiste team structure is easy to understand.
- Coin budget creates useful tension during team building.
- Captain mechanic is simple and familiar.
- Leaderboard gives the game social proof.
- Daily/weekly scoring already gives users a reason to check back.
- Pitch view is the clearest, most shareable version of the squad.

### Product Direction

- The early-spotter idea is strong.
- The game can evolve into “fantasy A&R” instead of only “fantasy music charts.”
- Users already understand bragging language like “I invested early.”
- UGC squad cards and pitch screenshots fit the culture of music Twitter/X.

### Backend

- Auth, users, teams, artistes, scoring, leaderboard, analytics, and admin endpoints already exist.
- Team transfers support basket-style swaps, not just one-for-one swaps.
- Coin validation exists.
- Admin role protection exists.
- Resend email support is now in place.
- Scoring is mostly idempotent through daily score records.

### Admin

- Admin area already shows users, teams, artistes, analytics, API health, and artiste performance.
- Admin-only artiste charts are the right direction for validating whether scoring matches real-world movement.

## What Needs Work

### Player UX

- The app has too many player sections for the current stage.
- Overview, My Team, Analytics, News, Banter, Draft Room, and other areas compete for attention.
- The pitch should become the main game screen, not an alternate view.
- Comparison should be removed from the player MVP for now.
- Swap flow should be simpler: select artiste on pitch, choose replacement, confirm.
- The app should feel calmer and less colorful, with proper light and dark modes.

### Frontend Structure

- Main pages are too large and hard to safely change.
- `Overview` and `ViewTeam` have too much product logic, UI logic, and visual styling mixed together.
- Current visual system is heavily purple/dark-mode-first.
- There is no clean neutral token system for light/dark mode.
- Some older features are still present even though the new MVP direction does not need them.

### Scoring Reliability

- Cron success does not always mean scoring fully completed.
- Some admin cron endpoints return success once a child job starts, not when the full job finishes.
- Job state is mostly in memory, so server restarts can hide what happened.
- Missing snapshot/data cases can make scoring silently skip a team/day.
- We need persistent scoring job logs.

### Analytics

- Analytics exists, but the event names and grouping need to match product questions.
- We need to know who visits, who creates a team, who returns, who swaps, who captains, and who exports.
- Admin interactions should stay excluded from product analytics.
- Current analytics should evolve from “page/activity count” into “is this game habit-forming?”

### Testing

- Backend has no meaningful automated tests yet.
- Scoring, signup email, captain change, transfers, and cron jobs need basic regression tests before a serious relaunch.

## Recommended MVP Revamp

### Player Navigation

Use four main areas:

- Squad
- Market
- Leaderboard
- Settings

Optional later:

- News
- Private Leagues
- Banter
- Deep artiste comparison

### Main Screen

The default screen should be the squad pitch.

It should show:

- Five artistes on the pitch.
- Captain badge.
- Today points.
- Week points.
- Coins left.
- Rank movement.
- One clear action: improve squad.

### Market

The market should focus on discovery, not spreadsheets.

Useful tags:

- Rising
- Value
- Low Owned
- Early Call
- Hot

Avoid making this feel like real-money trading. The emotional hook is “I spotted this artiste before everyone else.”

### Admin

Admin should stay inside the same app for now, behind role protection.

Admin should focus on:

- Users
- Teams
- Artiste performance
- Scoring health
- Email health
- Analytics
- Algorithm settings/readme

## Revamp Order

### Step 1: Stabilize The Engine

- Add persistent scoring job logs.
- Fix scoring skip cases.
- Make cron report real completion/failure.
- Add a safe manual scoring status page in admin.
- Add tests for signup, email sending, transfers, captain changes, and scoring.

### Step 2: Simplify The Frontend Shell

- Reduce navigation to the MVP sections.
- Create a neutral design token system.
- Add real light and dark mode.
- Remove extra color noise.
- Make the pitch screen the default home.

### Step 3: Rebuild Squad Flow

- Pitch-first squad screen.
- Click artiste to view details.
- Swap from the selected pitch slot.
- Keep comparison out of MVP.
- Keep export/share, but make it secondary.

### Step 4: Rebuild Market Flow

- Search and filter artistes.
- Show simple reasons to pick each artiste.
- Highlight early-spotter opportunities.
- Keep pricing understandable.

### Step 5: Measure Product Truth

Track:

- New user signup.
- Email verified.
- Team created.
- First captain selected.
- First swap completed.
- Return next day.
- Return after score update.
- Squad export.
- Leaderboard view.
- Market artiste viewed.
- Early pick added.

### Step 6: Launch Small Again

- Relaunch to existing users first.
- Watch admin analytics for one week.
- Interview the most active users.
- Decide whether to deepen fantasy gameplay or push harder into music discovery.

## Keep

- Five-a-side squad.
- Coin budget.
- Captain.
- Leaderboard.
- Daily/weekly scoring.
- Admin analytics.
- Artiste performance charts.
- Exportable squad cards.

## Remove Or Hide For MVP

- Player-facing artiste comparison.
- Heavy analytics pages for normal users.
- Banter/news until retention is stronger.
- Too many colorful glass panels.
- Any feature that does not help users pick, score, brag, or return.

## Biggest Product Bet

PlayUML should become the place where music fans prove they heard it first.

The fantasy game gives structure. The pitch gives clarity. The market gives discovery. The leaderboard gives status.

If the revamp does those four things clearly, the product becomes much easier to explain and much easier to share.

