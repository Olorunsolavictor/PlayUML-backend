# PlayUML Simplified MVP PRD

## Product Summary

PlayUML is a fantasy A&R game where players build a five-artiste lineup, back rising talent early, and compete on real-world music momentum.

The MVP should feel simple, calm, and immediately understandable:

> Pick five artistes. Watch them move. Prove your ear.

The football pitch is the main product metaphor. The user should see their squad as a team first, not as a dashboard full of charts.

## Why We Are Rebuilding

The current app works, but it has accumulated too many competing ideas:

- dashboard analytics
- artiste comparison
- pitch view
- transfer basket
- admin analytics
- market pricing
- UGC export
- digest/email flows

The next version should simplify the player experience and keep only the mechanics that make the game easy to understand and worth returning to.

## Product Thesis

People want to be rewarded for spotting music momentum early.

PlayUML should not become a generic music discovery app or a literal stock trading product. It should stay a game with virtual coins, squads, leaderboards, and reputation.

The strongest positioning is:

> Fantasy A&R for music fans.

Players are not "investors" in a financial sense. They are scouts backing artistes with virtual game coins.

## Target User

Primary user:

- music fan who follows artiste drops, online buzz, and cultural movement
- enjoys competition with friends
- wants to prove taste before the crowd catches up
- understands fantasy football style picking but does not want complicated rules

Secondary user:

- emerging artiste fanbase member
- music community admin
- A&R-curious listener
- creator who wants shareable proof of early picks

## Core MVP Promise

The MVP must answer four questions quickly:

1. Who is in my squad?
2. How are they doing?
3. Who is moving in the market?
4. Where do I rank?

Anything that does not support these four questions should be removed, hidden, or moved to admin.

## Core Game Loop

1. User signs up and verifies email.
2. User drafts five artistes within a 100 coin budget.
3. User selects one captain.
4. Every day, real-world music stats update scores.
5. User sees their squad on a football pitch.
6. User can make limited weekly swaps.
7. User climbs or falls on the leaderboard.
8. User notices rising artistes and tries to back them early.

## Main Navigation

MVP player navigation should be small:

- Squad
- Market
- Leaderboard
- Settings

Optional later:

- Leagues
- News
- Banter

Admin stays hidden behind role-based access and should not appear for normal players.

## Primary Screen: Squad

The Squad screen is the heart of the game.

### Layout

Desktop:

- left: five-a-side football pitch
- right: selected artiste card
- bottom: simple score trend and recent points

Mobile:

- pitch first
- selected artiste card below
- actions below the selected card

### Pitch Requirements

The pitch should:

- show all five artistes
- show captain clearly
- show today points
- show selected artiste with a clear ring
- feel compact but not crowded
- work well in light and dark mode

The pitch should not:

- look like a decorative extra
- be hidden behind tabs
- require scrolling before the main game is visible

### Selected Artiste Card

Show only high-signal information:

- artiste name
- image
- today points
- current coin value
- captain status
- last movement indicator

Primary actions:

- Make Captain
- Swap

Do not show artiste comparison in MVP.

## Market Screen

The Market screen helps users find who to back next.

### MVP Sections

- Market Movers
- Rising
- Value Picks
- All Artistes

### Artiste Row/Card Fields

Each artiste should show:

- image
- name
- coin value
- daily movement
- ownership percentage
- simple tag if relevant

Example tags:

- Rising
- Value
- Low Owned
- Hot Drop

Avoid heavy analytics on this screen. The goal is quick scouting.

## Swaps

Swaps should be simple.

MVP behavior:

- user selects an artiste from the pitch
- user taps Swap
- user chooses a replacement from Market-style list
- app shows projected coins left
- user confirms

Rules:

- final squad must fit within 100 coins
- weekly swap limit remains visible
- no advanced comparison panel in MVP
- no peer-to-peer trading
- no real-money trading

## Leaderboard

The leaderboard should remain simple and social.

Show:

- rank
- manager
- total weekly points
- today points
- rank movement as `+1`, `-2`, or neutral dot

Keep:

- global leaderboard

Later:

- private leagues
- biggest climber
- top scout

## Early Spotter Layer

This is the emotional hook, but it should be light in the MVP.

### MVP Version

Start with simple labels and tracking:

- Rising
- Value
- Low Owned
- Early Call

The app should reward users who back artistes before they gain momentum or ownership.

### Not MVP Yet

- complex scout reputation formula
- public scout profile
- badges marketplace
- full A&R dashboard
- real-money rewards

## Visual Design Direction

The new MVP should be calmer and less colorful.

### Theme

Support:

- light mode
- dark mode

Default:

- follow user system preference

### Color Direction

Use mostly neutral surfaces:

- white / near-white
- charcoal / near-black
- soft gray borders
- one primary brand accent
- one positive color
- one negative color

Avoid:

- heavy purple gradients
- too many glass cards
- neon everywhere
- multiple competing accent colors

### UI Feel

The player app should feel:

- clean
- sporty
- music-aware
- trustworthy
- easy to scan

The admin app can stay more utilitarian.

## Light Mode

Light mode should not feel like a weak afterthought.

Requirements:

- pitch must be legible on light background
- cards use subtle borders and shadows
- rank movement colors remain accessible
- primary action buttons keep strong contrast

## Dark Mode

Dark mode should be restrained.

Requirements:

- use deep neutral backgrounds
- avoid overusing purple
- keep the pitch readable
- reduce glow effects

## What To Remove From Player MVP

Remove or hide for now:

- artiste comparison panel
- deep analytics page
- too many dashboard cards
- score source mix as a major module
- complex transfer basket UI if it feels heavy
- news as a main navigation item
- banter as a main navigation item
- admin analytics from player navigation
- excessive gradients and glass effects

These can return later if the simple game loop proves sticky.

## Admin Requirements

Admin remains necessary, but it is not part of the player MVP.

Admin should show:

- total users
- total teams
- signups
- active users
- most selected artistes
- most captained artistes
- market movers
- daily scoring status
- latest snapshot day
- digest/email status
- artiste 7-day charts

Admin should stay:

- role-gated
- hidden from normal users
- read-only by default

## Email And Cron Reliability

The MVP cannot depend on unreliable ops.

Required before serious launch:

- Resend email verification works
- signup does not strand users if email fails
- password reset does not lock users out if email fails
- cron status reflects actual job outcomes
- missing snapshot days do not corrupt weekly points
- admin can see latest scoring/snapshot health

## MVP Success Metrics

Activation:

- signup completed
- email verified
- team created

Engagement:

- squad viewed
- captain changed
- swap started
- swap completed
- market viewed
- leaderboard viewed

Retention:

- day 1 return
- week 1 return
- users checking after scoring

Game health:

- teams under budget
- average coins left
- most selected artiste concentration
- cheap/mid/premium artiste distribution

Early-spotter signal:

- users selecting low-owned artistes
- users swapping into rising artistes
- users talking about calling artistes early
- share cards exported

## MVP Non-Goals

Do not build these in the simplified MVP:

- real-money investing
- cash prizes
- artiste tokens
- peer-to-peer trading
- complex stock exchange UI
- full blog/content platform
- public artiste submission portal
- large private league system
- complicated multipliers
- AI recommendations as a main experience

## Suggested MVP Screens

1. Auth
2. Draft
3. Squad
4. Market
5. Leaderboard
6. Settings
7. Hidden Admin

## Suggested Rebuild Phases

### Phase 1: Stabilize

- finish Resend migration
- patch cron/scoring guardrails
- verify signup and scoring daily
- keep admin read-only

### Phase 2: Simplify UI

- redesign player app around the pitch
- add light/dark mode
- reduce color intensity
- remove comparison from player MVP
- simplify navigation

### Phase 3: Strengthen Market

- add Market Movers
- add Rising and Value tags
- make swaps flow through the pitch
- show coins left clearly

### Phase 4: Test Early Spotter Hook

- add Early Call labels
- measure whether users care
- collect user feedback
- decide whether scout reputation becomes V2

## Decision Criteria

Persevere with this direction if users:

- understand the game faster
- return after scoring
- use the pitch as their mental model
- talk about artistes moving
- care about being early
- check leaderboard more than once per week

Reconsider if users:

- still do not understand what to do
- ignore the market
- do not care about early picks
- only check once and leave
- need constant explanation to play

## One-Sentence Product North Star

PlayUML helps music fans prove their ear by backing five artistes before the rest of the market catches up.
