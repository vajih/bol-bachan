/* ============================================================
   Bol Bachan — realtime room server
   Node + ws. In-memory rooms keyed by a 4-char code.
   Serves in-venue phones AND (via youtube-chat.js) YouTube Live chat.
   Protocol: see SPEC.md
   ============================================================ */
'use strict';
const http = require('http');
const { WebSocketServer } = require('ws');
const { startYouTubePoller } = require('./youtube-chat');

const PORT = process.env.PORT || 8787;

/* ---------- room state (in memory) ---------- */
const rooms = new Map(); // code -> { host, clients:Map(id->{ws,name,role}), yt }
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function genCode() {
  let code;
  do { code = Array.from({ length: 4 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join(''); }
  while (rooms.has(code));
  return code;
}
function send(ws, obj) { try { if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj)); } catch (_) {} }
function toHost(room, obj) { if (room && room.host) send(room.host, obj); }
function toClients(room, obj) { if (room) room.clients.forEach(c => send(c.ws, obj)); }
function counts(room) {
  let players = 0, audience = 0;
  room.clients.forEach(c => { if (c.role === 'audience') audience++; else players++; });
  return { players, audience };
}
function pushCount(room) { const c = counts(room); toHost(room, { type: 'count', ...c }); }

/* ---------- http (health check for Render/Railway) ---------- */
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
  } else if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><meta charset="utf-8"><title>Bol Bachan server</title>' +
      '<body style="font-family:system-ui,sans-serif;background:#0a0a0d;color:#f6f6fb;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center">' +
      '<div><h1 style="color:#fbbf24;margin:0 0 8px">Bol Bachan realtime server ✓</h1>' +
      '<p style="color:#9aa0a6">This is a WebSocket endpoint — there is no web page to view here.</p>' +
      '<p>Play the game at <a style="color:#f97316" href="https://bol-bachan.vercel.app">bol-bachan.vercel.app</a></p>' +
      '<p style="color:#54585e;font-size:.85rem">rooms active: ' + rooms.size + '</p></div></body>');
  } else { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not Found'); }
});

/* ---------- websocket ---------- */
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (buf) => {
    let m; try { m = JSON.parse(buf.toString()); } catch (_) { return; }
    const room = m.code ? rooms.get(m.code) : null;

    switch (m.type) {
      case 'host_create': {
        const code = genCode();
        rooms.set(code, { host: ws, clients: new Map(), yt: null });
        ws._role = 'host'; ws._code = code;
        send(ws, { type: 'room', code });
        break;
      }
      case 'host_resume': {
        if (!room) return send(ws, { type: 'error', message: 'room not found' });
        room.host = ws; ws._role = 'host'; ws._code = m.code;
        send(ws, { type: 'room', code: m.code });
        pushCount(room);
        break;
      }
      case 'join': {
        if (!room) return send(ws, { type: 'error', message: 'room not found' });
        const id = 'C' + Math.random().toString(36).slice(2, 8);
        const role = m.role === 'audience' ? 'audience' : 'player';
        const name = (m.name || 'Guest').toString().slice(0, 18);
        room.clients.set(id, { ws, name, role });
        ws._role = role; ws._code = m.code; ws._id = id;
        send(ws, { type: 'joined', id, code: m.code });
        toHost(room, { type: 'player_join', id, name, role });
        pushCount(room);
        break;
      }
      case 'state': { // host -> everyone
        if (!room || room.host !== ws) return;
        toClients(room, { type: 'state', state: m.state });
        break;
      }
      case 'submit': { // player -> host
        if (!room) return;
        toHost(room, { type: 'submission', playerId: ws._id || null, prompt: m.prompt, text: (m.text || '').toString().slice(0, 200), source: ws._role || 'player' });
        break;
      }
      case 'vote': { // player/audience -> host
        if (!room) return;
        toHost(room, { type: 'vote', matchupId: m.matchupId, side: m.side === 'b' ? 'b' : 'a', source: ws._role || 'player' });
        break;
      }
      case 'yt_start': { // host asks server to bridge a YouTube live chat
        if (!room || room.host !== ws) return;
        if (room.yt) room.yt.stop();
        room.yt = startYouTubePoller(m.liveChatId, (evt) => {
          if (evt.type === 'vote') toHost(room, { type: 'vote', matchupId: null, side: evt.side, source: 'chat' });
          else if (evt.type === 'superchat') toHost(room, { type: 'superchat', author: evt.author, amount: evt.amount, comment: evt.comment });
        });
        send(ws, { type: 'yt_status', running: !!(room.yt && room.yt.active) });
        break;
      }
      case 'yt_stop': {
        if (room && room.yt) { room.yt.stop(); room.yt = null; }
        break;
      }
      case 'ping': { send(ws, { type: 'pong' }); break; }
    }
  });

  ws.on('close', () => {
    const room = ws._code ? rooms.get(ws._code) : null;
    if (!room) return;
    if (ws._role === 'host') {
      room.host = null;               // keep room for a short grace period so host can resume
      setTimeout(() => { const r = rooms.get(ws._code); if (r && !r.host) { if (r.yt) r.yt.stop(); rooms.delete(ws._code); } }, 60000);
    } else if (ws._id) {
      room.clients.delete(ws._id);
      pushCount(room);
    }
  });
});

/* ---------- heartbeat: drop dead sockets ---------- */
const beat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false; try { ws.ping(); } catch (_) {}
  });
}, 30000);
wss.on('close', () => clearInterval(beat));

server.listen(PORT, () => console.log('Bol Bachan realtime server on :' + PORT));
