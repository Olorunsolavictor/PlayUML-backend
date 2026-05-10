# PlayUML Founding Launch Execution Pack

## What This Document Is

This is the operational companion to the broader growth roadmap.

It answers three questions:

1. what we should do in the next 30 days
2. how we should launch the founding-player beta
3. what we need to measure so we know whether the product is really working

## North Star For The Next 30 Days

The goal is not massive scale.

The goal is:

- make the weekly game loop trustworthy
- get a small but serious group of players returning weekly
- get enough sharing and invites to prove the game can spread socially

If we can do that, then the product is ready for the next level.

## 30-Day Execution Checklist

## Week 1: Trust And Instrumentation

### Objective

Make the core product reliable enough that every new player has a fair shot at understanding and trusting the game.

### Product checklist

- fix any remaining scoring, rollover, or leaderboard trust issues
- make Overview never show stale post-swap states
- make swap flow easier to understand
- keep `Coins Left` visible in team management flows
- ensure all key weekly counters reset correctly
- confirm digest and cron behavior is observable from ops tooling

### Ops checklist

- finish the first admin console view
- expose latest scoring day, latest stat day, pipeline status, digest status
- confirm manual fallback procedure for scoring and digest
- document who runs what if cron misfires

### Analytics checklist

- instrument signup funnel
- instrument draft/team creation funnel
- instrument swap/captain events
- instrument leaderboard and overview views
- instrument squad export usage

### Success criteria for Week 1

- no trust-breaking scoring bug during the week
- team creation and swap flows behave correctly
- core analytics events are visible
- you can answer: how many signed up, drafted, swapped, and returned

## Week 2: Founding Players Setup

### Objective

Start behaving like a live game with a clear identity and controlled access.

### Product checklist

- polish squad export card
- tighten pitch-based team experience
- ensure leaderboard movement is legible and trustworthy
- improve first-time user wording where confusion exists
- add or finalize invite-only or league-code mechanics if possible

### Launch checklist

- define the `Founding Players` message
- create a simple invite script
- build a shortlist of first communities and creators
- seed 20 to 50 intentional players
- create at least 2 private leagues

### Content checklist

- create one launch graphic
- create one squad-share example
- create one leaderboard result example
- prepare founder posts for X, WhatsApp, and Instagram story format

### Success criteria for Week 2

- first controlled cohort onboarded
- first leagues active
- at least some exported squad cards shared externally
- real friction notes collected from actual use

## Week 3: Run The First Social Loop

### Objective

Turn real gameplay into social proof.

### Product checklist

- make sure exports are stable and attractive
- make sure leaderboard screenshots are worth sharing
- improve any onboarding issues discovered in Week 2

### Growth checklist

- activate creator-led mini leagues
- run weekly challenge posts
- publish rank-jump and top-performer content from the official account
- encourage players to challenge friends publicly

### Founder checklist

- post weekly leaderboard movement
- post "captain picks" content
- post product updates and player shoutouts
- manually follow up with early players who are active and vocal

### Success criteria for Week 3

- players are sharing without being chased every time
- at least one creator/community league shows traction
- users are talking about the game as a competition, not just an app

## Week 4: Evaluate And Prepare The Next Push

### Objective

Decide whether the current loop is strong enough for broader rollout.

### Product checklist

- review all player friction from first three weeks
- prioritize biggest blockers to retention and referrals
- decide the next product sprint around growth-critical features

### Business checklist

- identify whether premium private leagues are realistic next
- identify whether sponsor conversations are worth starting
- list creator/brand partners who showed genuine interest

### Analytics checklist

- review funnel conversion
- review D1 and D7 retention
- review weekly return behavior
- review export and invite usage
- review which channels produced the best players

### Success criteria for Week 4

- clear retention baseline
- clear source of best early users
- evidence of shareability
- confidence on whether to expand or keep the beta controlled

## 30-Day KPI Targets

These are early-stage directional targets, not investor-ready targets.

### Target metrics

- signup to team creation: 50%+
- first-week active rate among signups: 40%+
- D1 retention: meaningful enough to show repeat curiosity
- D7 retention: strong enough to prove a weekly loop exists
- squad export usage among active users: 20%+
- invite or referral participation among active users: 15%+
- weekly active users returning for another gameweek: 25%+

The exact numbers matter less than the pattern.
What we want is evidence that:

- people get it
- people come back
- people share it
- people invite others

## Founding Players Launch Plan

## Positioning

The product should be introduced as:

- the fantasy game for Afrobeats fans
- draft 5 artistes, captain one, climb the league

Do not lead with:

- analytics
- Web3
- wallets
- dashboards
- complex scoring explanations

Lead with:

- competition
- identity
- music
- weekly bragging rights

## Ideal Founding Players

Start with people who naturally understand one or more of these:

- fantasy sports
- music fandom
- online banter
- creator communities
- campus/social competition

### Best early user types

- Afrobeats fan-page followers
- fantasy football players who also follow music culture
- music commentators and tastemakers
- campus social groups
- friend groups with existing banter culture
- creator communities that enjoy public competition

## Founding Players Cohort Design

### Cohort size

Start with:

- 20 to 50 intentional players in the first wave
- then expand toward 100 to 300 active weekly players

### Cohort structure

Split them into:

1. core testers
- forgiving
- give feedback
- tolerate bugs if communication is good

2. social players
- likely to share
- likely to challenge friends
- good for organic buzz

3. creator-led players
- have an audience
- can host a league
- can generate top-of-funnel traffic

## Launch Message

### Suggested framing

- "We’re opening PlayUML to founding players."
- "Build your 5-artiste squad and compete weekly."
- "If you love Afrobeats and fantasy-style competition, this is for you."

### What to offer

- founding player badge or recognition later
- early access to private leagues
- first access to new features
- public recognition for early winners and sharers

## Launch Channels

### Primary channels

1. WhatsApp
- friend groups
- creator group chats
- campus groups
- music community chats

2. X / Twitter
- founder posts
- weekly rankings
- player shoutouts
- creator challenges

3. Instagram stories
- squad cards
- leaderboard movement cards
- weekly winner cards

4. DM outreach
- hand-pick first users and creators
- personal invitation works better than generic broadcast at this stage

## Launch Sequence

### Step 1: Build the first list

Target:

- 50 names

Breakdown:

- 20 friends/community players
- 15 music-heavy social players
- 10 micro-creators
- 5 high-signal testers

### Step 2: Personal invite

Message should be short and clear:

- what it is
- why they were picked
- what they should do first
- what kind of feedback or sharing you want

### Step 3: Get them into leagues fast

Do not invite people into an empty app.

Invite them into:

- a founder league
- a creator league
- a campus/friend league

Competition is the hook.

### Step 4: Trigger sharing moments

Prompt them to share:

- their squad card
- their captain choice
- their leaderboard rise
- their private league challenge

### Step 5: Follow up manually

For the first cohort, do not try to automate everything.

Founder follow-up matters.

Ask:

- what confused you?
- what made sense immediately?
- what made you want to share?
- what almost made you leave?

## Founding Players Weekly Ritual

Every gameweek should have a visible rhythm.

### Pre-week

- captain picks post
- creator challenge post
- reminder to lock in teams

### During week

- top movers content
- rank jump content
- banter content

### End of week

- winner post
- best captain post
- biggest riser post
- share prompt for next week

This ritual is what makes the game feel alive.

## Founder-Led Growth Playbook

As founder, I would personally do the following each week:

- post a squad card
- post a leaderboard snapshot
- shout out the biggest climber
- tag or mention creators running leagues
- show product improvements publicly
- reward the most engaged early players with attention and status

At this stage, founder energy is part of distribution.

## Analytics Events Spec

## Principles

Instrumentation should answer three questions:

1. do people understand the game?
2. do they come back?
3. do they spread it?

### Event naming style

Use snake_case and keep it boring and consistent.

### Shared properties for most events

- `user_id`
- `session_id`
- `platform`
- `source`
- `campaign`
- `league_id` if relevant
- `week_key`
- `timestamp`

## Acquisition And Activation Events

### signup_started

Fire when a user begins signup.

Properties:

- `entry_page`
- `source`
- `campaign`

### signup_completed

Fire when signup succeeds.

Properties:

- `source`
- `campaign`
- `method`

### login_completed

Fire when login succeeds.

Properties:

- `source`

### onboarding_tour_started

Fire when a user opts into the tour.

Properties:

- `entry_context`

### onboarding_tour_skipped

Fire when a user skips the tour.

Properties:

- `entry_context`

### onboarding_tour_completed

Fire when a user finishes the tour.

Properties:

- `steps_completed`

## Draft And Team Creation Events

### draft_viewed

Fire when Draft Room is opened.

Properties:

- `has_team`
- `coins_left`

### artiste_selected

Fire when a user adds an artiste during drafting.

Properties:

- `artiste_id`
- `artiste_name`
- `price`
- `coins_used`
- `coins_left`
- `selected_count`

### artiste_removed

Fire when a user removes an artiste during drafting.

Properties:

- `artiste_id`
- `price`
- `coins_used`
- `coins_left`
- `selected_count`

### captain_selected

Fire when a captain is chosen during draft or later.

Properties:

- `artiste_id`
- `artiste_name`
- `context`
- `week_key`

### team_created

Fire when team creation succeeds.

Properties:

- `coins_used`
- `coins_left`
- `captain_id`
- `captain_name`
- `source`

## Team Management Events

### my_team_viewed

Fire when `My Team` opens.

Properties:

- `view_mode`
- `coins_left`
- `has_pending_transfers`

### pitch_artiste_selected

Fire when an artiste is selected on the pitch.

Properties:

- `artiste_id`
- `artiste_name`
- `is_captain`
- `context`

### transfer_staged

Fire when a transfer is added to the basket.

Properties:

- `out_artiste_id`
- `out_artiste_name`
- `in_artiste_id`
- `in_artiste_name`
- `projected_coins_used`
- `projected_coins_left`
- `basket_size`

### transfer_removed

Fire when a staged transfer is removed.

Properties:

- `out_artiste_id`
- `in_artiste_id`
- `basket_size`

### transfers_applied

Fire when one or more staged transfers are confirmed.

Properties:

- `transfer_count`
- `coins_used`
- `coins_left`
- `remaining_swaps`
- `week_key`

### captain_changed

Fire when a captain update succeeds.

Properties:

- `captain_id`
- `captain_name`
- `remaining_captain_changes`
- `week_key`

## Core Engagement Events

### overview_viewed

Fire when Overview loads.

Properties:

- `has_team`
- `rank`
- `coins_left`
- `week_key`

### leaderboard_viewed

Fire when leaderboard opens.

Properties:

- `rank`
- `week_key`
- `league_type`

### artiste_detail_viewed

Fire when an artiste detail page is opened.

Properties:

- `artiste_id`
- `artiste_name`
- `context`

### rules_viewed

Fire when game rules open.

Properties:

- `entry_context`

## Sharing And Virality Events

### squad_export_started

Fire when export is initiated.

Properties:

- `view_type`
- `week_key`

### squad_export_completed

Fire when export succeeds.

Properties:

- `view_type`
- `week_key`

### share_prompt_opened

Fire when any explicit share prompt opens.

Properties:

- `context`
- `asset_type`

### invite_started

Fire when invite flow begins.

Properties:

- `context`
- `league_id`

### invite_sent

Fire when an invite is actually sent or copied.

Properties:

- `channel`
- `context`
- `league_id`

### invite_join_completed

Fire when a referred player completes the intended join action.

Properties:

- `channel`
- `referrer_id`
- `league_id`

## Retention And Lifecycle Events

### digest_opened

Fire when a user opens the weekly/daily digest.

Properties:

- `digest_type`
- `week_key`

### notification_opened

Fire when a notification reopens the app.

Properties:

- `notification_type`
- `campaign`

### week_returned

Fire when a user comes back in a new week after being active in the previous week.

Properties:

- `previous_week_key`
- `current_week_key`

## Admin And Operational Events

These are internal and should go into a separate ops stream.

### scoring_job_started
### scoring_job_completed
### scoring_job_failed
### digest_job_started
### digest_job_completed
### digest_job_failed
### market_rebalance_started
### market_rebalance_completed
### market_rebalance_failed

Properties should include:

- `job_id`
- `week_key`
- `day`
- `duration_ms`
- `teams_processed`
- `error_message` when relevant

## Dashboards To Build First

## Dashboard 1: Acquisition Funnel

Track:

- signup_started
- signup_completed
- draft_viewed
- team_created

Question answered:

- where are new users dropping off?

## Dashboard 2: Core Engagement

Track:

- overview_viewed
- my_team_viewed
- leaderboard_viewed
- captain_changed
- transfers_applied

Question answered:

- are players actually playing the game weekly?

## Dashboard 3: Virality

Track:

- squad_export_completed
- share_prompt_opened
- invite_started
- invite_sent
- invite_join_completed

Question answered:

- is the product socially spreading or not?

## Dashboard 4: Retention

Track cohorts for:

- D1 retention
- D7 retention
- next-week return rate
- users who created a team vs users who did not

Question answered:

- does drafting convert into actual weekly behavior?

## Dashboard 5: Ops Trust

Track:

- scoring jobs
- digest jobs
- failed runs
- days with incomplete scoring

Question answered:

- can we scale safely without trust damage?

## Decision Rules

Use these rules so decisions stay sharp.

### If signup is strong but team creation is weak

Fix onboarding and draft clarity.

### If team creation is strong but D7 retention is weak

The weekly loop is not emotionally strong enough.

### If retention is good but sharing is weak

The product is fun but not yet socially legible.
Improve exports, prompts, and private league loops.

### If sharing is good but referred users do not stick

The game is marketable but not yet sticky.
Fix the actual product loop before buying growth.

## Final Recommendation

For the next 30 days, behave like a founder building a movement, not just an app.

That means:

- reliability first
- social proof second
- creator/community growth third
- monetization after trust and retention start proving themselves

If this works, you will not need to force "buzz".
The game itself will start producing it.
