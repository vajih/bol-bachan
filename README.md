# 🎤 Bol Bachan — *Best answer wins. Bolo zara!*

A desi roast & wordplay party game (Quiplash-style), built **hybrid-ready**: it plays
fully in-room today on one screen, and the remote stream-audience layer is scaffolded
and stubbed so wiring a live backend later is a drop-in. No backend, no build step —
just static files.

## What it is
Two players get the same prompt ("The real reason the rishta didn't work out: ___"),
each gives their funniest answer, the two go head-to-head, and the room votes. Funniest
banks points. A few rounds → a **Best of the Night** champion.

## Run locally
It fetches `data/prompts.csv`, so serve it over http (don't open the file directly):
```bash
python3 -m http.server 8090
# open http://localhost:8090
```

## Three things to try
- **Watch Auto-Demo** — plays itself with sample desi answers and simulated votes, then loops. Great for showing people (and for stream b-roll).
- **Host a Game** — add players (or "Fill sample players"), then run prompts; tap an answer to vote, reveal the winner, play to the finale.
- **play.html** — the phone-join screen (intentionally **stubbed** in this MVP).

## Files
```
bol-bachan/
├── index.html     ← host game + Auto-Demo
├── play.html      ← phone player/audience join (STUBBED)
├── config.js      ← settings + feature flags (rounds, votes, TRANSPORT, REMOTE_AUDIENCE)
├── bol-data.js    ← CSV prompt loader
├── transport.js   ← LocalTransport (works) + RealtimeTransport (STUB) — the hybrid seam
├── theme.js       ← original Web-Audio theme song (royalty-free, generated live)
├── data/prompts.csv                ← the Urdu-English prompt deck (the cultural payload)
├── assets/img/bol-bachan-logo.svg  ← brand logo (also favicon + social image)
├── vercel.json    ← static deploy config
└── DEPLOY.md      ← publish steps
```

## The hybrid architecture (how the stub becomes live)
The game never touches the network directly — it talks to a **Transport** (`transport.js`):

- `LocalTransport` runs everything on the host device. **No backend. Works now.**
- `RealtimeTransport` is a documented **stub**. Implement its `start / submitAnswer /
  castVote / broadcastState` against a backend (recommended: a small **Node + `ws`**
  WebSocket server with rooms keyed by code, on Render/Railway/Fly — Vercel is perfect
  for this static front-end but not for long-lived sockets), then set
  `config.js → TRANSPORT:'realtime'` and `REMOTE_AUDIENCE.enabled:true`.

Remote-audience votes flow through the same `castVote()` path tagged `source:'remote'`,
so the streamed audience lights up with no changes to game logic.

## Customizing the deck
Edit `data/prompts.csv` (`id, prompt, demo_answers`). Use `___` for the blank.
`demo_answers` (pipe-separated) are only used by the Auto-Demo. Keep it local and roast-y.
The deck is the product — retire prompts that flop, keep the ones that land.

## Broadcast mode (for YouTube Live / OBS)
`broadcast.html` is a clean full-screen "program output" scene — big prompt card,
head-to-head answers with animated vote bars, scoreboard, and a champion screen — with
no host controls or buttons. It mirrors the live game in real time.

How it works: the game (`index.html`) publishes its state over the browser's
`BroadcastChannel`; `broadcast.html` listens and renders. Open it from the game's
**📺 Broadcast** chip (or the home-screen link), or go straight to `/broadcast.html`.

**Streaming it:** open Broadcast View in its own browser window (same computer + same
browser as the game — that's how the two tabs stay in sync), then in OBS add a
**Window Capture** of that window (put it on a second monitor or a spare window).
Note: an OBS *Browser Source* runs in a separate browser and won't receive the
BroadcastChannel messages — use Window Capture for now. (Cross-machine sync, chat
voting, and Super Chat arrive with the realtime backend.)

Tip: the Auto-Demo also drives the broadcast view, so you can rehearse the whole
stream look before the event.

## Deploy
Static site — deploy anywhere. See **DEPLOY.md** for the fastest paths (Vercel CLI,
GitHub import, or Netlify drop).

---
Part of a small family of desi party games (see also: Dilwale Family Feud).
