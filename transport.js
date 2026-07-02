/* ============================================================
   transport.js — the multiplayer abstraction for Bol Bachan
   ------------------------------------------------------------
   This is the seam that makes the game "hybrid-ready". The game
   never talks to a network directly; it talks to a Transport.
   Two implementations:

     • LocalTransport     — WORKS TODAY. Everything lives in this
                            one browser/host device. Players are
                            added on the host; the room "code" is
                            cosmetic. No backend required.

     • RealtimeTransport  — STUB. The interface every networked
                            backend must satisfy so phones (in-room
                            players AND the remote stream audience)
                            can join, submit, and vote. Wire your
                            backend in the marked TODOs and flip
                            BOL_CONFIG.TRANSPORT to 'realtime'.

   The remote-audience (hybrid) votes flow through the SAME
   castVote() path, just tagged source:'remote'. So when realtime
   is wired, the stream layer lights up with zero game-logic changes.
   ============================================================ */
(function (global) {
  'use strict';
  const CFG = global.BOL_CONFIG || {};

  // ---- tiny event emitter ----
  function Emitter() {
    const map = {};
    return {
      on(evt, cb) { (map[evt] || (map[evt] = [])).push(cb); return this; },
      emit(evt, payload) { (map[evt] || []).forEach(cb => { try { cb(payload); } catch (e) { console.error(e); } }); }
    };
  }

  function genCode() {
    const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 4 }, () => a[Math.floor(Math.random() * a.length)]).join('');
  }

  /* ===================== LOCAL (works today) ===================== */
  function LocalTransport() {
    const bus = Emitter();
    const state = { code: genCode(), players: [], remoteVoters: 0 };

    return {
      mode: 'local',
      get code() { return state.code; },
      get players() { return state.players.slice(); },

      async start() { return state.code; },

      // host adds players manually in local mode
      addPlayer(name) {
        const p = { id: 'P' + (state.players.length + 1), name: name.trim() || ('Player ' + (state.players.length + 1)) };
        state.players.push(p);
        bus.emit('playerJoin', p);
        return p;
      },
      removePlayer(id) {
        state.players = state.players.filter(p => p.id !== id);
      },

      // In local mode the host types each answer in; this just echoes it back
      submitAnswer(playerId, prompt, text) {
        bus.emit('submission', { playerId, prompt, text, source: 'local' });
      },

      // Votes from on-screen buttons (in-room). source can be 'room' or 'remote'(stub).
      castVote(matchupId, side, source) {
        bus.emit('vote', { matchupId, side, source: source || 'room' });
      },

      broadcastState() { /* no-op locally — host screen IS the state */ },

      on: bus.on,
      isRemoteAvailable() { return false; }
    };
  }

  /* ===================== REALTIME (host side, live) ===================== */
  // Connects to the WebSocket server in ./server (see server/SPEC.md).
  // The host (index.html) uses this; players/audience use play.html.
  function RealtimeTransport() {
    const bus = Emitter();
    const URL_ = CFG.REALTIME_URL || 'ws://localhost:8787';
    let ws = null, code = '----', ka = null;

    function open(resolve, reject) {
      try { ws = new WebSocket(URL_); } catch (e) { return reject && reject(e); }
      ws.onopen = () => { ws.send(JSON.stringify({ type: 'host_create' })); ka = setInterval(() => send({ type: 'ping' }), 25000); };
      ws.onerror = (e) => { console.warn('[Bol Bachan] realtime socket error', e); if (reject) { reject(new Error('cannot reach ' + URL_)); reject = null; } };
      ws.onclose = () => { clearInterval(ka); bus.emit('disconnect', {}); };
      ws.onmessage = (ev) => {
        let m; try { m = JSON.parse(ev.data); } catch (_) { return; }
        if (m.type === 'room') { code = m.code; if (resolve) { resolve(code); resolve = null; } }
        else if (m.type === 'player_join') bus.emit('playerJoin', { id: m.id, name: m.name, role: m.role });
        else if (m.type === 'submission') bus.emit('submission', { playerId: m.playerId, prompt: m.prompt, text: m.text, source: m.source });
        else if (m.type === 'vote') bus.emit('vote', { matchupId: m.matchupId, side: m.side, source: m.source });
        else if (m.type === 'superchat') bus.emit('superchat', m);
        else if (m.type === 'count') bus.emit('count', { players: m.players, audience: m.audience });
      };
    }
    function send(obj) { try { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); } catch (_) {} }

    return {
      mode: 'realtime',
      get code() { return code; },
      players: [],

      start() { return new Promise((resolve, reject) => open(resolve, reject)); },

      // In realtime mode players self-join from their phones (play.html) — no local add.
      addPlayer() {}, removePlayer() {},

      submitAnswer(playerId, prompt, text) { send({ type: 'submit', code, prompt, text }); },
      castVote(matchupId, side, source) { send({ type: 'vote', code, matchupId, side, source }); },
      broadcastState(state) { send({ type: 'state', code, state }); },

      // bridge a YouTube Live chat into this room (needs server YOUTUBE_API_KEY + a liveChatId)
      startYouTube(liveChatId) { send({ type: 'yt_start', code, liveChatId }); },
      stopYouTube() { send({ type: 'yt_stop', code }); },

      on: bus.on,
      isRemoteAvailable() { return true; }
    };
  }

  /* ===================== factory ===================== */
  function createTransport() {
    const mode = (CFG.TRANSPORT || 'local').toLowerCase();
    if (mode === 'realtime') return RealtimeTransport();
    return LocalTransport();
  }

  global.BolTransport = { createTransport, LocalTransport, RealtimeTransport, genCode };
})(window);
