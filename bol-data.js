/* bol-data.js — prompt deck loader (CSV, no backend) */
(function (global) {
  'use strict';
  const CFG = global.BOL_CONFIG || {};

  function parseCSV(text) {
    const rows = []; let row = [], field = '', q = false;
    text = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; } else field += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else field += c;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    const clean = rows.filter(r => r.some(v => String(v).trim() !== ''));
    if (!clean.length) return [];
    const head = clean[0].map(h => h.trim().toLowerCase());
    return clean.slice(1).map(r => { const o = {}; head.forEach((h, i) => o[h] = (r[i] || '').trim()); return o; });
  }

  async function loadPrompts() {
    const res = await fetch(CFG.PROMPTS_CSV_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('Could not load prompts.csv (' + res.status + ')');
    const rows = parseCSV(await res.text());
    return rows.filter(r => r.prompt).map(r => ({
      id: r.id,
      prompt: r.prompt,
      demo: (r.demo_answers || '').split('|').map(s => s.trim()).filter(Boolean)
    }));
  }

  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }

  global.BolData = { parseCSV, loadPrompts, shuffle };
})(window);
