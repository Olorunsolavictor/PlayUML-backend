# PlayUML Coin Algorithm V2 Proposal

## Goal

Improve the coin market so it feels better as a **game economy**, not just as a mathematically smooth market.

This proposal is for the version we can roll out **after the current gameweek ends**.

The aim is to keep what is already working in the current system, while fixing the parts that are making drafting and swaps harder than they should be.

## Bottom Line

The current coin algorithm is a good technical v1, but it is not yet a strong long-term game economy.

Its biggest weakness is this:

> it is better at preserving a smooth market than at preserving a playable market

For PlayUML, the market needs to do more than react to momentum.
It also needs to make drafting fun, create real tradeoffs, and keep enough cheap-value picks in circulation.

## What Is Working in V1

These parts should stay:

1. **Momentum-based pricing**
2. **7-day recency weighting**
3. **Max daily move**
4. **Inactivity penalty**
5. **A bounded coin range**

Why these should stay:

- they keep the market alive
- they prevent total chaos
- they make prices feel responsive without becoming random

Files involved:

- [rebalanceCoinsPercentile.js](/Users/user/playuml-backend/src/scripts/rebalanceCoinsPercentile.js)
- [coin-pricing-and-market-algorithm.md](/Users/user/playuml-backend/docs/coin-pricing-and-market-algorithm.md)

## What Is Not Working Well Enough

### 1. The Market Is Too Compressed

Too many artistes drift into similar mid-high price bands.

That causes:

- fewer interesting cheap picks
- harder drafting under a `100 coin / 5 artiste` budget
- swaps that feel blocked
- less diversity across teams

### 2. The Market Is Too Relative

The current algorithm preserves the total market coin pool and redistributes value.

That is elegant, but it means:

- if the market starts too expensive, it tends to stay expensive
- the system does not naturally rebuild a strong cheap tier
- the game can feel mathematically stable but strategically narrow

### 3. The Source Weighting May Be Too Last.fm-Heavy

Current weights:

- Last.fm = `0.7`
- YouTube = `0.3`

That can undervalue artistes whose mass momentum is more visible on YouTube than on Last.fm.

For Afrobeats and broader music-fandom behavior, that balance likely needs retesting.

## V2 Design Principles

The next version of the coin algorithm should optimize for these outcomes:

1. **A healthy player market**
2. **Clear price tiers**
3. **Visible value picks**
4. **Meaningful premium stars**
5. **Momentum that still matters**
6. **Fair and understandable movement**

In simple terms:

- the market should still react
- but it should also stay draftable

## The Main V2 Shift

The biggest change in V2 should be:

> move from a purely market-neutral redistribution model to a market-shaped distribution model

That means we stop thinking only in terms of:

- who is above average
- who is below average

And we start thinking in terms of:

- what kind of market structure the game needs to remain playable

## Proposed Market Structure

This is the kind of price distribution PlayUML should aim for:

- **Cheap tier:** `8–12`
- **Value tier:** `13–17`
- **Strong tier:** `18–23`
- **Premium tier:** `24–30`

These are not hardcoded final numbers, but they are the right shape.

### Why This Structure Helps

It creates:

- low-cost squad fillers with upside
- stable mid-tier picks
- strong reliable names
- premium stars that force real tradeoffs

That is exactly what a `100 coin / 5 artiste` fantasy game needs.

## Proposed V2 Algorithm

V2 should still use momentum, but should pass through a stronger game-economy shaping layer.

### Step 1: Keep the Current Daily Momentum Inputs

Keep:

- YouTube subscriber delta
- YouTube views delta
- Last.fm listeners delta
- Last.fm playcount delta

Keep the 7-day rolling weighted momentum model.

This part is solid.

### Step 2: Rebalance the Source Weights

Current:

- Last.fm `0.7`
- YouTube `0.3`

Proposed test ranges:

- option A: Last.fm `0.6`, YouTube `0.4`
- option B: Last.fm `0.55`, YouTube `0.45`

Recommendation:

- start with `0.6 / 0.4`

Why:

- still gives Last.fm more influence
- gives YouTube enough weight to reflect broader mainstream music momentum

## Step 3: Keep the 7-Day Recency Model

Keep the same rolling weights for now:

- `0.35`
- `0.25`
- `0.15`
- `0.10`
- `0.07`
- `0.05`
- `0.03`

Why:

- it is a strong part of the current system
- we do not need to change too many variables at once

## Step 4: Replace Pure Relative Pricing with Tier-Aware Target Pricing

Instead of saying:

- price is only based on market-relative z-score

Use:

- a **tier-aware target coin calculation**

### Concept

Every artiste gets:

1. a **base market strength score**
2. a **momentum adjustment**
3. a **final target band**

### Base Market Strength Score

Use a slow-moving base score from:

- Spotify popularity
- Spotify followers

This gives each artiste a structural place in the market.

This answers:

- is this artiste generally a premium asset?
- or a low-cost flyer?

### Momentum Adjustment

Use the current rolling momentum score to move the artiste:

- up inside their band
- down inside their band
- or between adjacent bands if the movement is strong enough

This answers:

- are they hot right now?
- are they cooling off?

### Final Target Band

Instead of allowing the whole market to compress into the middle, we make the algorithm preserve a healthy spread.

## Suggested V2 Formula Shape

Not final code, but the logic should look like this:

```txt
baseScore =
  0.6 * spotifyPopularityComponent +
  0.4 * spotifyFollowersComponent

momentumScore =
  0.6 * lastfmMomentum +
  0.4 * youtubeMomentum

marketScore =
  0.7 * baseScore +
  0.3 * normalizedMomentumScore
```

Then:

1. rank artistes by marketScore
2. place them into target distribution buckets
3. assign target coin values inside those buckets
4. apply daily move limits and penalties

## Suggested Distribution Targets

For the active market pool, aim roughly for:

- `20%` cheap tier (`8–12`)
- `35%` value tier (`13–17`)
- `30%` strong tier (`18–23`)
- `15%` premium tier (`24–30`)

This is a starting proposal, not a sacred ratio.

Why this feels right:

- enough cheap names for creativity
- enough mid-tier names for flexibility
- enough premium names for aspiration
- not so many elites that everyone becomes unaffordable

## Step 5: Keep Daily Safety Rails

Keep:

- min coin = `8`
- max coin = `30`
- max daily move = `2`
- inactivity penalty = `1`

Why:

- these are already good guardrails
- they keep the market legible

## Step 6: Add a Soft Reversion Toward Market Shape

One reason markets drift badly is that once they compress, they can stay compressed.

V2 should add a **soft reversion mechanism**.

Meaning:

- each rebalance does not only follow momentum
- it also nudges the market back toward the intended tier structure

This should be gentle, not forced.

So if too many artistes pile up in the `18–22` range:

- weak performers drift downward faster
- premium underperformers fall back toward strong/value
- cheap value artistes with no support do not stay inflated forever

## Step 7: Use the Weekly Boundary for Major Rebalances

Daily changes should remain incremental.

But larger structural corrections should happen only:

- at the start of a new gameweek
- or during a planned market reset

Why:

- fairness
- predictability
- trust

That means:

- no major algorithm shape change mid-week
- no surprise re-tiering while users are already competing

## Recommended Rollout Plan

### After Current Gameweek Ends

1. snapshot the current market
2. simulate V2 pricing locally
3. inspect the resulting price distribution
4. test whether a `100 coin / 5 artiste` draft feels healthier
5. compare:
   - cheapest available picks
   - average squad flexibility
   - premium scarcity
   - likely team diversity

### Then Roll Out in Phases

#### Phase 1

Change only:

- source weights
- target market distribution

Keep:

- daily guardrails
- rolling recency model

#### Phase 2

If needed, refine:

- band ratios
- premium cap
- base-score weighting

#### Phase 3

Add player-facing explanation:

- “market prices react to recent momentum and overall artiste strength”

This improves trust without exposing every internal detail.

## Suggested Admin Metrics for V2

When V2 goes live, track these:

1. min coin value
2. max coin value
3. p10 / p25 / p50 / p75 / p90 price
4. average coins left after draft
5. average number of valid swap options per artiste
6. most selected artistes
7. premium pick concentration
8. duplicate team overlap rate

These are the metrics that will tell us whether the market is healthy.

## How We Will Know V2 Is Better

V2 is working if:

- more teams are meaningfully different
- users have more valid draft combinations
- swaps feel possible, not blocked
- cheap picks have real strategic relevance
- premium picks still feel special

V2 is failing if:

- everyone still clusters in the same price band
- users still struggle to complete valid teams
- most swaps still feel impossible
- the market becomes too random or too flat

## My Recommendation

If I were making the call as founder/product owner, I would do this:

1. keep the current weekly boundary intact
2. after this gameweek, move to a **tier-shaped market**
3. keep the recency model
4. reduce Last.fm dominance slightly
5. stop treating total-market preservation as the main design goal

That is the most important shift.

Because in the end:

- a mathematically elegant market is nice
- but a fun, strategic, draftable market is what the game actually needs

## Decision Summary

### Keep

- 7-day rolling weighted momentum
- max daily move
- inactivity penalty
- bounded coin range

### Change

- rebalance source weighting
- reduce pure market-neutral redistribution
- introduce target tier distribution
- blend structural artiste strength with recent momentum

### Rollout Timing

- after the current gameweek ends

## Founder Note

This is not just a backend refactor.

This is a game-economy redesign.

That means the success criteria are not only:

- cleaner formulas
- nicer math

They are:

- better drafting
- better swapping
- better team diversity
- better long-term retention
