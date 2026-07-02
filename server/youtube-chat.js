/* ============================================================
   youtube-chat.js — bridge YouTube Live chat into a room
   ------------------------------------------------------------
   Polls the YouTube Data API liveChatMessages endpoint, parses
   A/B votes and Super Chats, and calls back into the room.

   Safe no-op unless BOTH are present:
     • process.env.YOUTUBE_API_KEY   (API key with YouTube Data API v3)
     • a liveChatId passed in         (from the live broadcast)

   How to get liveChatId: liveBroadcasts.list (part=snippet) →
   items[0].snippet.liveChatId  (needs OAuth for your own broadcast),
   OR videos.list(part=liveStreamingDetails, id=VIDEO_ID) →
   items[0].liveStreamingDetails.activeLiveChatId.
   Super Chat *amounts* require OAuth scope; anonymous API-key polling
   still returns messages and basic superChatDetails on many chats.
   ============================================================ */
'use strict';

const API = 'https://www.googleapis.com/youtube/v3/liveChat/messages';

function parseVote(text) {
  const t = (text || '').trim().toUpperCase();
  if (/^(A|1)\b/.test(t) || t === 'A' || t === '1') return 'a';
  if (/^(B|2)\b/.test(t) || t === 'B' || t === '2') return 'b';
  return null;
}

/**
 * Start polling. Returns { active, stop() }.
 * @param {string} liveChatId
 * @param {(evt:{type:'vote',side:'a'|'b'}|{type:'superchat',author,amount,comment})=>void} onEvent
 */
function startYouTubePoller(liveChatId, onEvent) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key || !liveChatId || typeof fetch !== 'function') {
    console.log('[youtube-chat] not configured (need YOUTUBE_API_KEY + liveChatId + Node 18 fetch) — running in no-op mode');
    return { active: false, stop() {} };
  }

  let stopped = false, pageToken = null, timer = null;
  const seen = new Set(); // de-dupe message ids across pages

  async function poll() {
    if (stopped) return;
    let interval = 5000;
    try {
      const url = new URL(API);
      url.searchParams.set('liveChatId', liveChatId);
      url.searchParams.set('part', 'snippet,authorDetails');
      url.searchParams.set('key', key);
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      pageToken = data.nextPageToken || null;
      interval = Math.max(2000, data.pollingIntervalMillis || 5000);

      for (const item of (data.items || [])) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        const sn = item.snippet || {};
        const text = sn.displayMessage || (sn.textMessageDetails && sn.textMessageDetails.messageText) || '';

        if (sn.superChatDetails) {
          onEvent({
            type: 'superchat',
            author: (item.authorDetails && item.authorDetails.displayName) || 'Someone',
            amount: sn.superChatDetails.amountDisplayString || '',
            comment: sn.superChatDetails.userComment || text || ''
          });
          continue;
        }
        const side = parseVote(text);
        if (side) onEvent({ type: 'vote', side });
      }
      if (seen.size > 5000) seen.clear(); // bound memory over a long stream
    } catch (e) {
      console.warn('[youtube-chat] poll error:', e.message);
      interval = 8000;
    }
    if (!stopped) timer = setTimeout(poll, interval);
  }

  console.log('[youtube-chat] polling live chat', liveChatId);
  poll();
  return { active: true, stop() { stopped = true; if (timer) clearTimeout(timer); } };
}

module.exports = { startYouTubePoller, parseVote };
