# Physical-world multiplayer research spec

**Status:** Research only  -  not on the Phase A shipping path (`create → scan → revoke`)
**Public summary:** `site/what-can-a-qr-do/physical-world-multiplayer/`
**Privacy boundary:** `docs/REFERENCE_OPERATOR_DATA_POLICY.md`
**Roadmap context:** `docs/PHASE_A_STRANGER_PATH_PRIORITIES.md`

---

## Purpose

Define the city-scale game concept in a way that is exciting **and** constrained:

- exciting enough to guide narrative, design, and later prototypes
- constrained enough that the reference operator does **not** become a player-tracking system
- clear enough that game copy never overrides maintenance or safety truth

This is a **research spec**, not a commitment to ship city gameplay before the simpler Phase A verticals.

---

## Core claim

A city can host a live game season without special hardware or a proprietary app:

> A bench, mural, cafe window, trail marker, alley arch, or stairwell can function as a
> **revocable public game object** whose state changes over time.

The QR is not the game. The QR is the **physical handle** for a live object on the map.

What changes is the public state behind the object:

- which faction holds it
- whether a route is open
- whether a chapter is unlocked
- whether a sanctuary is active
- whether the object is paused, repaired, or revoked

---

## Player fantasy

The strongest framing is not "scavenger hunt" or "geocaching with points."

The strongest framing is:

- **the city as a playable season**
- **ordinary places with mythic roles**
- **public objects that can wake, pause, split routes, and unlock story**

Example roles:

| Place | Game role |
|-------|-----------|
| Bench | District gate |
| Mural | Lore archive |
| Cafe window | Sanctuary / treaty zone |
| Trail marker | Route splitter |
| Alley arch | Finale switch |

The map lives in public space. The resolver only answers what is true **now**.

---

## Object state model

Multiplayer state should stay **object-scoped** and public-facing.

| State class | Example values | Notes |
|-------------|----------------|-------|
| **Territory** | `unclaimed`, `held_by_north`, `sanctuary_until_dawn` | Public world state |
| **Narrative** | `chapter_4_live`, `artist_note_published`, `rumor_active` | Lore and authored reveals |
| **Route** | `open`, `rerouted`, `sunrise_only`, `weather_mode` | Path and timing logic |
| **Lifecycle** | `active`, `paused`, `revoked` | Same core primitive as other objects |
| **Care** | `report_open`, `repair_verified`, `maintenance_pause` | Use only when stewardship is real |

Important: the public state is about the **object**, not a retained history of who scanned it.

---

## Authority model

One reason this concept stays honest is that different truths come from different signers.

| Stream | Controlled by | May change | Must not claim |
|--------|---------------|------------|----------------|
| **Game stream** | Organizer / game operator | faction state, route windows, lore, finale timing | safety certification, ownership proof, legal identity |
| **Maintainer stream** | Actual maintainer / steward | pause, repair notice, service state, closure notice | player score or faction outcomes |
| **Artist / place stream** | Artist, venue, steward | commentary, history, local notes, place canon | safety or emergency readiness |
| **Resolver lifecycle** | Owner / authorized revoker | active, revoked, suspended | gameplay legitimacy beyond state exposure |

If a maintenance or safety-critical stream conflicts with a game stream, the maintenance or safety
stream wins in scan copy.

See also: `site/what-can-a-qr-do/combining-ideas/games-maintenance/`.

---

## Privacy and data policy constraints

The reference operator data policy is a hard boundary, not a vibe.

### Must not become normal

- Per-scan trails
- Location history
- Device fingerprinting
- Ad-tech style player profiling
- Silent expansion into access logs as product default
- Phone number or email **required** for the core scan loop

### Allowed public truth

The resolver **may** publish public object state such as:

- which faction holds a ward
- whether a route is open
- whether a chapter is live
- whether a node is revoked
- whether a repair reactivated a route

### Design rule

The game may reveal the state of the world without storing a movement dossier on the players.

If a future operator wants richer player accounts, teams, or opt-in history, that must be:

1. explicit
2. optional
3. published in a separate operator policy
4. not required for the basic QR → resolver loop

---

## Allowed mechanics

Good mechanics fit the current primitive:

- time-windowed unlocks
- faction ownership at the object level
- signed lore drops
- district sanctuaries
- route reroutes after revocation or repair
- finale switches triggered by published state transitions
- clean revocation when a marker is compromised or removed

These are strong because they use **live object state**, not secret telemetry.

---

## Game theory / cooperation design

Use game theory to design rules that make cooperation more rewarding than exploitation.

### Public goods mechanics

Some city objects should only "wake up" when enough people contribute.

Example:

- 20 anonymous scans unlock the next clue
- no leaderboard, just collective progress

### Anti-hoarding rewards

If someone discovers a QR first, they should get more value by sharing it than hiding it.

Example:

- first finder gets an initial clue
- the object evolves only after 5 more people scan it

### Trust / vouch mechanics

Players can unlock deeper paths by being vouched for by previous objects, businesses, or community
members.

Example:

- "This clue requires a vouch from a NewBo object"
- legitimacy comes from place-linked trust, not legal identity

### Prisoner's dilemma design

Give players choices where selfish behavior gives a small short-term reward, but cooperation unlocks
a larger shared reward.

Example:

- reveal a clue privately now
- or leave it hidden so the group can unlock a better ending

### Scarcity without surveillance

Create scarcity with time windows, expiring clues, rotating QR states, or limited-use capabilities
instead of tracking people.

Example:

- "This object can only issue 25 passes before sunset"

### Sybil resistance

Reduce spam and fake participation without requiring identity.

Options:

- rate limits
- proof-of-control challenges
- local physical codes
- one-time signed tokens
- business-issued vouches
- device-local limits

### Coordination games

Some puzzles should require people to visit different places and combine information.

Example:

- Czech Village, NewBo, and Greene Square each reveal one fragment
- together they unlock the next state

The strongest version is not points and badges.

It is a city-scale coordination game where trust, timing, scarcity, and cooperation change what
physical objects reveal.

---

## Disallowed mechanics

Avoid mechanics that quietly demand surveillance infrastructure or fake authority:

- "heatmap" progression based on retained scan logs
- "42 players visited here today" if derived from hidden per-scan analytics
- streak systems built from silent request logging
- device fingerprinting for anti-cheat
- fake "proof of presence" claims from a static QR alone
- players marking emergency or safety equipment "safe"
- gameplay that requires people to expose phone numbers, legal identity, or home location

If a number appears on the public map, be able to explain how it was produced **without** hidden
scan analytics.

---

## Care loop / maintenance combo

The most defensible civic version is not "gamify inspection."

It is:

1. reward discovery and attention
2. let people report visible issues
3. let maintainers publish the real service state
4. let repair reactivate the route or chapter

Good examples:

- fountain light out → maintainer pauses node → repair reopens route
- mural lamp broken → steward posts notice → chapter resumes after fix
- trail marker cracked → route rerouted until replacement is installed

Bad examples:

- players deciding AED readiness
- crowd consensus overriding maintainer truth
- points for pretending to inspect safety-critical systems

---

## Prototype path (later, not now)

When the simpler Phase A verticals are proven, a first multiplayer prototype should stay narrow.

### Suggested first prototype

- one neighborhood or festival footprint
- 10–20 nodes, not city-wide saturation
- 3 node roles max (example: gate, lore archive, sanctuary)
- organizer-signed updates or manual world-state flips
- no new player identity system required
- one published rules page explaining what scans do and do not prove

### Success criteria

- players understand the public-state model without needing an app tutorial
- privacy review can explain the design without hand-waving
- compromised markers can be revoked cleanly
- maintenance-adjacent nodes never imply player authority over safety truth

---

## Not on the current path

This concept should stay out of the current shipping path until the simpler verticals are proven.

Not in Phase A:

- city-wide live multiplayer rollout
- resolver-backed player inventory
- opt-out scan analytics
- geofence enforcement as a default requirement
- anti-cheat systems based on hidden device profiling
- a separate app-only game economy

Current build focus remains the simpler pilots in `docs/PHASE_A_STRANGER_PATH_PRIORITIES.md`.

---

## Open questions

- How should game state be updated without drifting into hidden player telemetry?
- Which multiplayer actions need organizer signatures versus simple schedule rules?
- What moderation model governs lore, faction naming, and public place annotations?
- How should compromised or vandalized markers be removed from play quickly?
- Which parts belong to the reference operator versus a later specialized game operator?

---

## Related

| Doc / path | Use |
|------------|-----|
| `site/what-can-a-qr-do/physical-world-multiplayer/` | Public narrative page |
| `docs/REFERENCE_OPERATOR_DATA_POLICY.md` | Privacy boundary |
| `docs/PHASE_A_STRANGER_PATH_PRIORITIES.md` | Why this is research, not current shipping scope |
| `docs/ORGANIZER_SIGNED_REVOKE_PILOT.md` | Closest active shipping primitive for trusted updates |
| `site/what-can-a-qr-do/combining-ideas/games-maintenance/` | Authority split between play and maintenance |
