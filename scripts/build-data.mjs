// Builds data/trmnl.json from https://portwatch-vi.xyz/data/tracker.json (run by .github/workflows/build-data.yml).
// TRMNL polls the small output instead of the ~200 KB tracker, which is over TRMNL's polling size limit.
import { writeFileSync } from 'node:fs';

export function transform(input) {
  if (!Array.isArray(input?.efforts)) throw new Error("tracker.json has no efforts[]: format changed?");

  // Copy of https://portwatch-vi.xyz/assets/js/scoring.js (MILESTONES, GROUNDWORK weights, STABILITY,
  // scoreEffort, overall): keep in sync with it. scripts/check-drift.mjs fails when they disagree.
  const MILESTONES = [
    ['groundwork', 'Groundwork', 0], ['loads', 'Exe runs', 25], ['boots', 'First frame', 40],
    ['menu', 'Main menu', 55], ['ingame', 'In-game', 70], ['fps30', '30 FPS', 85], ['stable', 'Stable', 100],
  ].map(([key, label, at]) => ({ key, label, at }));
  const TICK = Object.fromEntries(MILESTONES.map((m) => [m.key, m.at]));
  const GW = { loader: 0.2, shaders: 0.28, graphics: 0.32, proven: 0.2 };
  const STAB = { often: 0.25, sometimes: 0.55, rarely: 0.8, stable: 1 };
  const clamp01 = (v) => (Number.isFinite(+v) ? Math.min(1, Math.max(0, +v)) : 0);
  const ladder = (v) => (v === true ? 1 : v === false || v == null ? 0 : clamp01(v));
  const round1 = (v) => Math.round(v * 10) / 10;

  function score(e) {
    const gta = e.gta || {};
    let s = TICK.loads * Object.keys(GW).reduce((a, k) => a + GW[k] * clamp01(e.groundwork?.[k]), 0);
    let reached = 'groundwork';
    let prev = s;
    for (const key of ['loads', 'boots', 'menu', 'ingame']) {
      const v = ladder(gta[key]);
      if (v >= 1) { s = prev = TICK[key]; reached = key; continue; }
      if (v > 0) s = Math.max(s, prev + v * (TICK[key] - prev));
      break;
    }
    if (reached === 'ingame') {
      const fps = clamp01((+gta.fps || 0) / 30);
      const stab = STAB[gta.stability] || 0;
      s = TICK.ingame + fps * (TICK.fps30 - TICK.ingame) + stab * (TICK.stable - TICK.fps30);
      if (fps >= 1) reached = 'fps30';
      if (fps >= 1 && stab >= 1) reached = 'stable';
    }
    return { score: round1(s), reached };
  }

  const all = input.efforts;
  const ranked = all.filter((e) => !e.nuked)
    .map((e) => ({ e, ...score(e) }))
    .sort((a, b) => b.score - a.score || (b.e.stats?.stars || 0) - (a.e.stats?.stars || 0));
  const leader = ranked[0];
  const idx = (k) => MILESTONES.findIndex((m) => m.key === k);
  const furthest = ranked.reduce((b, r) => Math.max(b, idx(r.reached)), 0);
  const top3 = ranked.slice(0, 3);
  const label = (k) => MILESTONES[idx(k)].label;

  // Top 6 on the bar. Like the site, spread the markers so they never overlap (min gap in % of bar width).
  const GAP = 6;
  const markers = ranked.slice(0, 6).map((r) => ({
    name: r.e.name, initials: r.e.name.slice(0, 2).toUpperCase(), score: r.score, x: r.score, leader: r === leader,
  })).sort((a, b) => a.x - b.x);
  markers.forEach((m, i) => { m.a = i ? Math.max(m.x, markers[i - 1].a + GAP) : m.x; });
  const shift = markers.reduce((s, m) => s + (m.x - m.a), 0) / Math.max(1, markers.length);
  // Markers are drawn in 12%-wide boxes centred on `a`, so keep a within [6, 94]; `left` = box start (integer, for w--[Ncqw]).
  markers.forEach((m, i) => { m.a = Math.max(6, i ? Math.max(m.a + shift, markers[i - 1].a + GAP) : m.a + shift); });
  const over = markers.length ? markers[markers.length - 1].a - 94 : 0;
  markers.forEach((m) => { if (over > 0) m.a -= over; m.a = Math.round(m.a); m.left = m.a - 6; });

  return {
    score: leader ? leader.score : 0,
    leader: leader ? leader.e.name : null,
    leader_reached_label: leader ? label(leader.reached) : null,
    furthest_label: MILESTONES[furthest].label,
    top3: top3.length ? round1(top3.reduce((a, r) => a + r.score, 0) / top3.length) : 0,
    booted: all.filter((e) => ladder(e.gta?.boots) >= 1).length,
    tracked: all.length,
    milestones: MILESTONES.map((m, i) => ({
      label: m.label, at: m.at, left: Math.max(0, m.at - 7), // label box is 14% wide, centred on the tick
      state: i <= furthest ? 'reached' : i === furthest + 1 ? 'next' : 'todo',
    })),
    markers,
  };
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const res = await fetch('https://portwatch-vi.xyz/data/tracker.json');
  if (!res.ok) throw new Error(`tracker.json: HTTP ${res.status}`);
  writeFileSync(new URL('../data/trmnl.json', import.meta.url), JSON.stringify(transform(await res.json()), null, 1) + '\n');
}
