# Bol Bachan — Realtime Backend Spec

A small WebSocket server that turns Bol Bachan from a host-only show into an
**everyone-plays** game and a **YouTube-Live-interactive** show. It is the single
backend that serves *both* audiences:

1. **In-venue phones** — every attendee joins by room code and answers + votes on their
   phone (the "everyone participates" fix that justifies a per-head ticket).
2. **YouTube Live audience** — viewers vote by typing in live chat, and Super Chats
   trigger perks. The server polls the YouTube Data API and feeds those into the same vote pipeline.

The front-end never changes its game logic: it already talks to a `Transport`
(`transport.js`). This backend implements the server side of that contract.

## Roles
- **host** — the game screen (`index.html`). Creates the room, runs the game, receives
  submissions/votes, pushes state.
- **player** — an in-venue attendee (`play.html`) who submits answers and votes.
- **audience** — a remote/stream viewer who votes (and, later, submits wildcard answers).
- **chat** — a synthetic source: YouTube live-chat votes/Super Chats, injected by the server.

## Transport
WebSocket (JSON messages). Rooms are keyed by a 4-char code. One host socket per room;
many client sockets. In-memory state (no DB needed for a live event).

### Client → Server
| type | from | payload | effect |
|------|------|---------|--------|
| `host_create` | host | — | make room, reply `room {code}` |
| `host_resume` | host | `code` | re-attach host socket after reconnect |
| `join` | player/audience | `code, name, role` | join room; reply `joined {id}`; host gets `player_join` |
| `state` | host | `code, state` | relay `state {state}` to all clients (drives phones + broadcast) |
| `submit` | player | `code, prompt, text` | host gets `submission {playerId, prompt, text}` |
| `vote` | player/audience | `code, matchupId, side` | host gets `vote {matchupId, side, source}` |
| `ping` | any | — | reply `pong` (keep-alive) |

### Server → Client
`room {code}`, `joined {id, code}`, `player_join {id,name,role}`,
`submission {playerId,prompt,text,source}`, `vote {matchupId,side,source}`,
`state {state}`, `count {players,audience}`, `error {message}`, `pong`.

### Vote weighting (design)
The in-room vote decides the match; chat/audience votes are tallied separately as the
**"People's Champion"** so stream lag never overrides live play. `source` on each vote
is one of `player | audience | chat` so the host can bucket them.

## YouTube Live integration (`youtube-chat.js`)
- Input: a `liveChatId` (from the broadcast) + `YOUTUBE_API_KEY` (or OAuth for Super Chat details).
- Poll `liveChatMessages.list` on the interval the API returns (`pollingIntervalMillis`).
- Parse each message: a leading `A`/`1` or `B`/`2` → `vote {side, source:'chat'}`.
- `superChatDetails` present → `superchat {author, amount, comment}` → host perk.
- Emits into the room exactly like a client vote, so the game/overlay need no special-casing.
- **Safe no-op** when no API key/liveChatId is configured.

Note: polling (a few seconds) is fine — stream latency is 5–30s anyway, so all chat
interaction is designed as voting windows, never real-time races.

## Deployment
Static front-end stays on Vercel. This server needs persistent sockets, so deploy to
**Render / Railway / Fly.io** (root dir = `server/`, start = `node server.js`).
Set the front-end `config.js → REALTIME_URL` to the deployed `wss://…` URL and
`TRANSPORT:'realtime'`.

## Roadmap
1. ✅ Room server (create/join/state/submit/vote/ping) — this MVP.
2. Client integration: `play.html` join+vote+submit; host `RealtimeTransport`.
3. Game-loop wiring: remote submissions fill matchups; overlay shows remote/chat tallies + People's Champion.
4. YouTube chat poller live (API key + liveChatId).
5. Super Chat perks (sponsor a round, buy-in answer, submit a prompt).
