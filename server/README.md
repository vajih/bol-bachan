# Bol Bachan — realtime server

WebSocket room server so every attendee plays on their phone and the YouTube Live chat
can vote. See `SPEC.md` for the protocol.

## Run locally
```bash
cd server
npm install
npm start          # listens on :8787 (health check at GET /health)
```
Then in the front-end `config.js` set:
```js
TRANSPORT: 'realtime',
REALTIME_URL: 'ws://localhost:8787'
```

## Deploy (Render / Railway / Fly.io — needs persistent sockets)
- Root directory: `server/`
- Build: `npm install`  ·  Start: `node server.js`
- After deploy, set the front-end `config.js → REALTIME_URL` to the `wss://…` URL.

## YouTube Live chat (optional)
Set `YOUTUBE_API_KEY` (YouTube Data API v3). At game time the host sends the broadcast's
`liveChatId`; the server polls chat, turns `A`/`B` (or `1`/`2`) messages into votes, and
forwards Super Chats. Without the key it runs as a safe no-op.

## Message protocol
See `SPEC.md`. Quick reference — client→server: `host_create`, `host_resume`, `join`,
`state`, `submit`, `vote`, `yt_start`, `yt_stop`, `ping`. Server→client: `room`, `joined`,
`player_join`, `submission`, `vote`, `state`, `count`, `superchat`, `error`, `pong`.
