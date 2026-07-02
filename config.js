/* ============================================================
   Bol Bachan — Configuration & feature flags
   A desi roast/wordplay party game (Quiplash-style), built
   hybrid-ready: plays in-room today, remote-audience layer stubbed.
   ============================================================ */
window.BOL_CONFIG = {
  GAME_TITLE: 'Bol Bachan',
  TAGLINE: 'Best answer wins. Bolo zara!',

  // Where prompts come from. 'local' = bundled CSV. (Same pattern as Family Feud;
  // a Google-Sheet URL can be dropped in later.)
  SOURCE: 'local',
  PROMPTS_CSV_URL: './data/prompts.csv',

  // ---- Game shape ----
  ROUNDS: 3,                 // number of rounds
  MATCHUPS_PER_ROUND: 3,     // head-to-head duels per round
  VOTE_SECONDS: 20,          // voting window (latency-tolerant; works for stream too)
  POINTS_PER_VOTE: 100,      // score weight

  // ---- Transport / multiplayer ----
  // 'local'    = everything runs on this one host device (no backend). WORKS TODAY.
  // 'realtime' = phones join by code via a backend.  *** STUBBED — not wired yet ***
  TRANSPORT: 'local',

  // ---- Remote audience (the hybrid layer) ----
  // When enabled + a realtime backend is wired, the streamed audience votes too.
  // Left OFF for the MVP; the UI shows a stubbed remote tally so you can see where it lands.
  REMOTE_AUDIENCE: {
    enabled: false,          // <-- flip on once RealtimeTransport is implemented
    showStubPanel: true,     // show the "remote votes" panel in stubbed state
    label: 'Stream audience'
  },

  // Backend you plan to wire later (informational; used by transport.js stub message).
  REALTIME_BACKEND_HINT: 'WebSocket server (e.g. small Node + ws on Render/Railway) or a managed realtime service',

  STORAGE_KEY: 'bol_bachan_state_v1'
};
