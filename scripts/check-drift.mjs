// Fails if build-data.mjs's copy of the scoring disagrees with the site's live scoring.js
// (the maintainer may change the formula). Run before publishing data/trmnl.json.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const get = async (path) => {
  const res = await fetch(`https://portwatch-vi.xyz/${path}`);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.text();
};
const tracker = JSON.parse(await get('data/tracker.json'));
// ponytail: imports the site's own module as data: URL; it is dependency-free by design (see its header).
const site = await import(`data:text/javascript,${encodeURIComponent(await get('assets/js/scoring.js'))}`);
const ov = site.overall(tracker.efforts);
const ours = JSON.parse(readFileSync(new URL('../data/trmnl.json', import.meta.url)));

assert.equal(ours.score, ov.score, 'score');
assert.equal(ours.top3, ov.top3, 'top3');
assert.equal(ours.leader, ov.leader?.effort.name ?? null, 'leader');
assert.equal(ours.furthest_label, ov.furthest.label, 'furthest');
assert.deepEqual(ours.milestones.map((m) => [m.label, m.at]), site.MILESTONES.map((m) => [m.label, m.at]), 'milestones');
assert.deepEqual(ours.markers.map((m) => m.score).sort(), ov.ranked.slice(0, 6).map((r) => r.score).sort(), 'top 6');
console.log(`OK: ${ours.leader} ${ours.score}% matches the site's scoring`);
