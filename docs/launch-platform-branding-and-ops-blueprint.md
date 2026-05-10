# PlayUML Launch Platform, Branding, Hosting, Admin, and Analytics Blueprint

## Bottom Line

Yes, we should start treating this like a legitimate product.

But "legitimate" here means:

- clear landing page
- clean infrastructure
- compliant source attribution
- admin visibility
- product analytics
- error monitoring
- a growth-ready setup that does not create legal or operational mess

My founder recommendation is:

1. separate the **marketing surface** from the **game app**
2. treat **Spotify, YouTube, and Last.fm attribution** as a real compliance concern
3. simplify hosting into a clean, boring architecture
4. build one **admin + analytics operating system** so you can actually steer the product

## The Main Decision

The next version of PlayUML should look like this:

- `playuml.app` = landing page / marketing site
- `app.playuml.app` = the actual game
- `api.playuml.app` = backend API
- optional later: `ops.playuml.app` or an in-app admin section

This separation makes the product easier to understand, easier to market, and easier to operate.

## 1. Landing Page

## Why You Need It

Right now the app mostly behaves like a product for people who are already inside.

A landing page gives you:

- a simple explanation for new users
- a home for creator traffic
- a place for ads, invites, and social links to land
- a place to collect interest before pushing everyone into signup

## What The Landing Page Should Do

It should answer these questions in under 10 seconds:

1. what is this?
2. why is it fun?
3. how does it work?
4. why should I join now?

## Recommended Structure

### Hero

- headline: fantasy football for Afrobeats fans
- subhead: draft 5 artistes, captain one, climb weekly leagues
- primary CTA: `Join the League`
- secondary CTA: `See How It Works`

### How It Works

Use 3 steps only:

1. draft 5 artistes
2. captain one
3. earn points from daily music momentum

### Social Proof

- sample squad card
- leaderboard screenshot
- creator/private league example
- short founding-player callout

### Why It’s Different

- music-native fantasy game
- weekly competition
- social bragging
- creator and community leagues

### Trust Section

- daily scoring
- transparent rules
- community competition
- data sources listed clearly

### Founding Players / Waitlist / Invite

- invite-only or priority access CTA
- small note about early leagues / founding badge / early access

### Footer

- rules
- privacy
- terms
- source attributions
- contact

## What I Would Avoid

- too much technical explanation
- wallet talk on the landing page
- giant feature list
- too many third-party logos in the hero
- leading with analytics instead of gameplay

## Landing Page Copy Angle

Lead with:

- competition
- music taste as strategy
- weekly ranking
- captain choices
- creator/community leagues

Do not lead with:

- APIs
- dashboards
- blockchain
- advanced stats

## 2. Spotify, YouTube, and Last.fm Branding / Attribution

This part matters a lot.

You are not just using data.
You are building a public-facing product with brand and API dependencies.

## Spotify

### What the official guidance says

Spotify's developer branding guidelines and policy say:

- if you display Spotify metadata, artwork, or audio preview clips, you must attribute Spotify content with Spotify branding
- Spotify metadata should link back to Spotify
- your app name should not include `Spotify`
- your logo should not look like Spotify's brand elements
- Spotify says **don’t pair brands** in co-branded communications

Sources:

- [Spotify Design & Branding Guidelines](https://developer.spotify.com/documentation/design?o=7632)
- [Spotify Developer Policy](https://developer.spotify.com/policy)

### Practical implication for PlayUML

Do this:

- attribute Spotify where Spotify-sourced content is being used
- link Spotify-sourced entity views back to Spotify when appropriate
- use Spotify's official assets only where needed

Do not do this:

- put Spotify in the product name
- create a "PlayUML x Spotify x YouTube x Last.fm" co-branded lockup
- use Spotify green or icon in a way that suggests endorsement

### My recommendation

Use **text attribution and contextual attribution**, not big logo walls.

Example:

- on entity/detail pages: `Source: Spotify`
- in footer/compliance page: `Uses data from Spotify, YouTube, and Last.fm`

That is much safer than plastering all three logos together.

## YouTube

### What the official guidance says

YouTube's API branding guidelines say:

- you can use approved YouTube branding assets for YouTube-integrated features
- any YouTube logo used in an app must link back to YouTube content or a YouTube part of the app
- you must never use `YouTube`, `YT`, or variants in your app name
- do not modify the logos or use them as the most prominent element

Source:

- [YouTube API Services Branding Guidelines](https://developers.google.com/youtube/terms/branding-guidelines)

### Practical implication for PlayUML

Do this:

- use simple source attribution for YouTube-driven stats
- if you use a YouTube logo/icon, make it clickable to relevant YouTube content or a YouTube section

Do not do this:

- put YouTube branding next to your app name
- create a fake partnership feel

## Last.fm

### What the official guidance says

Last.fm's API docs and API terms indicate:

- use a clear User-Agent
- be reasonable in usage and not excessive with calls
- if you plan to use the API for commercial purposes, contact `partners@last.fm`
- you must credit Last.fm and include links back to Last.fm when using Last.fm data
- the API terms also reference using `powered by AudioScrobbler` assets from Last.fm resources

Sources:

- [Last.fm API Introduction](https://www.last.fm/api/intro)
- [Last.fm API Terms of Service](https://www.last.fm/ru/api/tos)
- [Last.fm Legal Terms](https://www.last.fm/legal)

### Important note

I am making one inference here:

- because Last.fm's branding resources are not as cleanly surfaced as Spotify/YouTube's developer branding pages, the safest current approach is conservative attribution: text credit + link back + compliance with API terms, unless you deliberately adopt the official AudioScrobbler asset treatment from their resources.

### Practical implication for PlayUML

Do this:

- credit Last.fm clearly
- link back where appropriate
- contact Last.fm before leaning into commercial/public usage more aggressively

Do not do this:

- invent your own Last.fm-style badge or pseudo-logo treatment

## Brand-Safe Recommendation For PlayUML

Use this rule across the product:

### In the app

- use simple source labels on relevant components
- use text like `Data from Spotify`, `YouTube delta`, `Last.fm listeners`
- reserve logos for places where official guidance clearly supports them

### In the footer / legal / compliance page

- centralize the attribution
- explain that data is sourced from Spotify, YouTube, and Last.fm
- include links to each source/service where appropriate

### On the landing page

- do **not** make the hero a grid of third-party logos
- keep the PlayUML brand primary
- list sources in the trust/compliance section, not the hero

## 3. Hosting Architecture

## Recommended Setup

### Frontend / Landing Page

Use **Vercel** for the marketing site and the Vite frontend.

Why:

- your frontend is already a Vite app
- Vercel officially supports Vite well
- previews for every change are very useful
- custom domains and fast deployments are straightforward

Sources:

- [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)
- [Deploying to Vercel](https://vercel.com/docs/deployments)

### Backend API

Keep or move the backend to **Render Web Service**.

Why:

- Express is a standard Render fit
- Render supports WebSocket connections and zero-downtime deploys
- you already have job-like operational patterns that fit Render well

Source:

- [Render Web Services Docs](https://render.com/docs/web-services)

### Scheduled Jobs

Use **Render Cron Jobs** for scheduled tasks that run and exit.

This fits your current scripts well:

- daily snapshot
- scoring
- digest
- maintenance tasks

Source:

- [Render Cron Jobs Docs](https://render.com/docs/cronjobs)

### Background Work Later

If the product gets heavier and you need queue-driven async work, use **Render Background Workers** later.

Examples:

- queued digest batches
- analytics processing
- export generation
- moderation pipelines

Source:

- [Render Background Workers Docs](https://render.com/docs/background-workers)

### Database

Use a managed MongoDB provider and take monitoring seriously.

If you are using MongoDB Atlas, its monitoring and alerts are strong enough for this stage.

Sources:

- [Atlas Monitoring and Alerts](https://www.mongodb.com/docs/atlas/monitoring-alerts/)
- [Atlas Guidance for Monitoring and Alerts](https://www.mongodb.com/docs/atlas/architecture/current/monitoring-alerts/)

## My exact recommendation

For now:

- `playuml.app` on Vercel
- `app.playuml.app` on Vercel
- `api.playuml.app` on Render
- cron jobs on Render
- MongoDB Atlas (or keep your current managed Mongo if already in place)

This is boring, which is good.

## What I Would Not Do Yet

- self-host Kubernetes
- split into too many microservices
- add a separate admin deployment immediately
- move jobs to a more complex queue system before you need it

## 4. Admin Surface

## Recommendation

Do **not** start with a separate admin app.

Start with:

- a role-based admin section inside the current app

That is enough for now.

## What Admin Should Include First

### Ops overview

- latest score day
- latest stat day
- current week key
- users
- verified users
- total teams
- teams scored
- unscored teams

### Job health

- pipeline status
- digest status
- last success / last failure
- last run logs or summaries

### Player lookup

- search by username or email
- team exists or not
- captain
- coins used / coins left
- swaps used
- weekly points

### Product analytics summary

- signups
- team creations
- active users this week
- exports
- invites
- week-over-week return rate

### Source/algorithm page

- scoring divisor settings
- market price settings
- current integration health

## Later, not now

- destructive delete actions
- complicated support tooling
- a big backoffice app

## 5. Analytics: How You’ll See If The Product Is Working

You need two different layers:

## Product analytics

This answers:

- are people signing up?
- are they drafting?
- do they come back?
- do they share?
- do they invite?

## Error / reliability analytics

This answers:

- what is breaking?
- who is affected?
- where are errors happening?
- what changed before failure?

## Recommended Stack

### Product analytics

Use **PostHog**.

Why:

- product analytics
- funnels
- retention
- paths
- session replay
- feature flags if needed later
- can stay in one system for a while

Official signals:

- PostHog positions itself as a single stack for product analytics, session replay, web analytics, error tracking, feature flags, and more
- the pricing page indicates a generous free tier for early usage

Sources:

- [PostHog](https://posthog.com/)
- [PostHog product overview / pricing](https://archive.posthog.com/)

### Error tracking

Two valid choices:

1. **Use PostHog first** if you want one simpler stack early
2. **Add Sentry** if you want stronger dedicated error monitoring and production debugging

Sentry is the stronger specialized tool for production error visibility.

Useful official references:

- [Sentry React Data Collected](https://docs.sentry.io/platforms/javascript/guides/react/data-management/data-collected)
- [Sentry JS / React browser support](https://docs.sentry.io/platforms/javascript/guides/react/troubleshooting/supported-browsers)

## My recommendation

For simplicity:

### Stage 1

- PostHog for product analytics and session replay
- Render/Atlas built-in service monitoring

### Stage 2

- add Sentry when you want deeper production error triage

This keeps the stack manageable.

## What To Track

At minimum, track:

- landing_page_viewed
- cta_clicked
- signup_started
- signup_completed
- team_created
- overview_viewed
- leaderboard_viewed
- captain_changed
- transfers_applied
- squad_export_completed
- invite_started
- invite_sent
- invite_join_completed
- digest_opened
- returned_next_week

## Dashboards You Need

### Dashboard 1: Marketing funnel

- landing page visitors
- CTA clicks
- signup start rate
- signup completion rate

### Dashboard 2: Activation

- signup to team creation
- team creation by source/channel
- first leaderboard visit

### Dashboard 3: Weekly engagement

- WAU
- captain changes
- swaps applied
- weekly return rate

### Dashboard 4: Virality

- exports
- invite sends
- invite joins
- creator league performance

### Dashboard 5: Trust / ops

- scoring runs
- digest runs
- API failures
- top frontend errors
- cluster alerts

## 6. What To Build Next In Order

## Phase 1: Foundations

1. landing page
2. source attribution / compliance page
3. admin console v1
4. analytics instrumentation
5. error monitoring

## Phase 2: Growth surfaces

1. private leagues
2. referral / invite system
3. better export/share cards
4. creator league support

## Phase 3: Business surfaces

1. premium leagues
2. sponsor reporting
3. creator partnership tools
4. deeper admin analytics

## 7. Founder Recommendation

If I were you, I would do the following next:

### Immediate

- build the landing page
- set up compliant attribution patterns
- finalize the first admin console
- add product analytics
- add basic error visibility

### Then

- start controlled acquisition through creators, communities, and WhatsApp groups
- measure activation and weekly retention closely
- only after that, push harder on growth and monetization

## Final Position

Yes, this can start looking and operating like a legitimate product now.

But legitimacy here is not only polish.
It is:

- clean public story
- compliant source usage
- boring reliable hosting
- visibility into product health
- visibility into player behavior

Once those pieces are in place, the game stops being just a cool idea and starts behaving like a real company.

## Sources

- Spotify Design & Branding Guidelines: https://developer.spotify.com/documentation/design?o=7632
- Spotify Developer Policy: https://developer.spotify.com/policy
- YouTube API Branding Guidelines: https://developers.google.com/youtube/terms/branding-guidelines
- Last.fm API Introduction: https://www.last.fm/api/intro
- Last.fm API Terms of Service: https://www.last.fm/ru/api/tos
- Last.fm Legal: https://www.last.fm/legal
- Vite on Vercel: https://vercel.com/docs/frameworks/frontend/vite
- Vercel Deployments: https://vercel.com/docs/deployments
- Render Web Services: https://render.com/docs/web-services
- Render Cron Jobs: https://render.com/docs/cronjobs
- Render Background Workers: https://render.com/docs/background-workers
- MongoDB Atlas Monitoring and Alerts: https://www.mongodb.com/docs/atlas/monitoring-alerts/
- MongoDB Atlas Guidance for Monitoring and Alerts: https://www.mongodb.com/docs/atlas/architecture/current/monitoring-alerts/
- PostHog: https://posthog.com/
- PostHog product overview and pricing context: https://archive.posthog.com/
- Sentry React Data Collection: https://docs.sentry.io/platforms/javascript/guides/react/data-management/data-collected
- Sentry React browser support: https://docs.sentry.io/platforms/javascript/guides/react/troubleshooting/supported-browsers
