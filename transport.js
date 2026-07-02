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

  /* ===================== REALTIME (STUB) ===================== */
  // Implement these against your backend of choice. Recommended for a hybrid
  // game night + stream: a small Node + `ws` WebSocket server (rooms keyed by
  // code) hosted somewhere that supports persistent sockets (Render/Railway/Fly).
  // Vercel is great for the static front-end but not for long-lived sockets.
  function RealtimeTransport() {
    const bus = Emitter();
    const NOT_WIRED = 'RealtimeTransport is not wired yet. ' +
      'Backend hint: ' + (CFG.REALTIME_BACKEND_HINT || 'a WebSocket server') + '. ' +
      'See transport.js TODOs.';

    function warn() { console.warn('[Bol Bachan] ' + NOT_WIRED); }

    return {
      mode: 'realtime-stub',
      code: '----',
      players: [],

      async start() {
        warn();
        // TODO: open socket, create room on the server, return the real room code.
        // const ws = new WebSocket(CFG.REALTIME_URL);
        // ws.onmessage = (m) => routeServerMessage(JSON.parse(m.data), bus);
        throw new Error(NOT_WIRED);
      },

      addPlayer() { warn(); /* players self-join from phones in realtime mode */ },
      removePlayer() { warn(); },

      submitAnswer() {
        warn();
        // TODO: ws.send({type:'submit', playerId, prompt, text})
      },

      castVote() {
        warn();
        // TODO: ws.send({type:'vote', matchupId, side, source})
        // The server tags votes from the stream-audience join page as source:'remote'.
      },

      broadcastState() {
        warn();
        // TODO: ws.send({type:'state', state})  // host -> all phones + audience
      },

      // Server should emit these back into `bus`:
      //   bus.emit('playerJoin', {id,name})
      //   bus.emit('submission', {playerId, prompt, text, source})
      //   bus.emit('vote', {matchupId, side, source})  // source:'room' | 'remote'
      on: bus.on,
      isRemoteAvailable() { return !!(CFG.REMOTE_AUDIENCE && CFG.REMOTE_AUDIENCE.enabled); }
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
