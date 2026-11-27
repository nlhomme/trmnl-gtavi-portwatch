# trmnl-gtavi-portwatch

A TRMNL plugin that shows the "Overall progress · Closest effort to playable" panel of [PortWatch VI](https://portwatch-vi.xyz). The repo holds no PortWatch code: a GitHub workflow downloads the site's public `data/tracker.json`, scores it, and commits a small `data/trmnl.json` that TRMNL polls.

PortWatch VI belongs to someone else ([4lwayz/portwatch-vi](https://github.com/4lwayz/portwatch-vi)). We only read its public data; we never send it anything and cannot change it.

The owner is a DevOps engineer, not a programmer. Documentation, comments and log messages are in English (the plugin's audience is the TRMNL community).

## How it fits together

```text
portwatch-vi.xyz/data/tracker.json (~200 KB, updated every 3 h by the site's scout)
  → .github/workflows/build-data.yml (every 15 minutes)
      → scripts/build-data.mjs   → data/trmnl.json (~2 KB), committed only when it changed (each site refresh, ~8 a day)
      → scripts/check-drift.mjs  → fails if our scoring no longer matches the site's
TRMNL polls raw.githubusercontent.com/nlhomme/trmnl-gtavi-portwatch/main/data/trmnl.json
  → renders src/*.liquid
```

Why not poll `tracker.json` directly: TRMNL degrades private plugins whose polled response is over ~100 KB.

## Rule: the documentation must ALWAYS be up to date

Any change to the repo that alters what a reader would do or expect must update the documentation **in the same change**, never later. That covers `README.md`, `src/settings.yml` and the comments in the scripts, the workflow and the Liquid templates.

- Before finishing a change, ask: does any sentence, table, command or example in the documentation now say something false or incomplete? If yes, fix it now.
- A new file, field of `data/trmnl.json`, setting, script or workflow step is not done until it is documented.
- When something is removed or renamed, remove or rename every mention of it; search the whole repo for the old name.
- Commands and examples in the documentation must be ones that work as written. If one could not be tried, say so in the text.
- If the documentation and the code disagree, that is a bug: fix it even if it is unrelated to the task at hand, or report it.
- The screenshots in `docs/` (`preview-*.png`, used by `README.md`) are part of the documentation and must always be up to date. Any change to what a view shows or how it looks (templates, `data/trmnl.json` fields the views read, milestones, sizes) requires re-rendering the affected screenshots in the same change. If they cannot be re-rendered, say so in the final report and in the README next to the image, never leave them silently stale.

### Before every commit or push

The owner also edits files by hand, so the changes about to be committed are not only yours. When asked to commit or push, apply this rule to **everything** that is going in, whoever made it:

1. Look at the full set of changes first (`git status`, `git diff`, staged and unstaged, plus untracked files), not only at what you changed in this session.
2. For each change you did not make yourself, check it against the documentation exactly as you would for your own: is anything now false, missing or renamed?
3. If something needs updating, update it and include it in the same commit. Tell the owner what you added and why, so they can object.
4. If a manual change looks unintended or contradicts the documentation and you cannot tell which side is right, do not guess: ask before committing.
5. Run `node scripts/build-data.mjs` before committing when the changes touch `scripts/` or the fields the templates read.

Never commit a state where the documentation is known to be out of date.

`data/trmnl.json` is generated: never edit it by hand. The workflow's own commits (`chore: refresh TRMNL data`) touch only that file.

## Rule: everything that describes the data must stay in step

`data/trmnl.json` has one producer and several readers, and they must always agree on its fields:

- the producer, `scripts/build-data.mjs`;
- the readers, `src/shared.liquid` and the four views (`src/full.liquid`, `src/half_horizontal.liquid`, `src/half_vertical.liquid`, `src/quadrant.liquid`);
- the check, `scripts/check-drift.mjs`;
- the field table in `README.md`.

So whenever a field is added, renamed or removed in `build-data.mjs`, update every template that reads it, `check-drift.mjs` if it checks it, and the README table, in the same change.

The four views do not share one layout: each is designed for its size (`half_vertical` and `quadrant` are too narrow for the seven milestone labels and markers, so they show "Next: …" instead). A change to what the panel shows must still be carried to every view where it fits; when it does not fit a size, say so in that view's comment or the README.

## Rule: our scoring must match the site's

`build-data.mjs` holds a copy of the site's `assets/js/scoring.js` (milestones, groundwork weights, stability values, top-3 and "furthest" rules). The copy must give the same numbers as the original.

- When the site's `scoring.js` changes, port the change to `build-data.mjs` and keep the `MILESTONES` comment pointing at the original.
- `check-drift.mjs` runs the site's live `scoring.js` and compares: never weaken or skip it to make the workflow green. A red run means the copy is out of date.
- `check-drift.mjs` runs code downloaded from the site. In the workflow it must keep running with **no push access**: keep `persist-credentials: false` on the checkout, and give `GITHUB_TOKEN` only to the commit step.

## Rule: a workflow-failure issue is fixed only when the workflow succeeds

When treating an issue opened by the workflow ("Build TRMNL data is failing"), working locally is not enough: push the fix branch, run the workflow on it (`gh workflow run build-data.yml --ref <branch>`), and wait for the run to succeed (`gh run watch <id> --exit-status`) before saying the issue is fixed. The `report` job then closes the issue itself. Say so if the run failed or could not be run. The scheduled runs only use `main`, so the issue stays fixed for good only once the branch is merged.

## TRMNL markup

- Follow the TRMNL framework: no `style="…"`, no `<style>` blocks, no emojis, framework classes only (the `trmnl:trmnl` skill has the full rules).
- The framework has no `left--[x%]` class. Positions along the bar use `w--[Ncqw]` spacers, which only exist for whole numbers 0–100: anything used as a position must be an integer (the script rounds `markers[].a` and `markers[].left`).
- `.flex` adds a default gap: rows that position things with spacers need `gap--none`.
- There is no nowrap utility; multi-word labels that must not wrap use `&nbsp;`.
- `label--gray` breaks small text into dots on 1-bit screens: always pair it with `1bit:text--black`, which prints it solid there and changes nothing on 2-bit and colour screens.
- Sizes for the TRMNL X use `lg:` classes; portrait uses `portrait:` (every portrait screen) and `lg:portrait:` (X in portrait only, it wins over `portrait:`). Check every change on four screens: OG and X, each in landscape and portrait. The OG in portrait is the narrowest: the milestone names under the bar are hidden there (`portrait:hidden lg:portrait:block`), and the big score stacks above the other figures.
- The local Chrome render matches TRMNL for the OG, landscape and portrait (`screen screen--og`, add `screen--portrait` and a 480x800 window), but not for the X.
- `src/` is the plugin's import zip, unzipped: TRMNL imports a flat zip of `settings.yml`, `shared.liquid` and the four views ([format](https://help.trmnl.com/en/articles/10542599-importing-and-exporting-private-plugins)). Keep it flat, keep `settings.yml` in that format (`name`, `strategy`, `refresh_interval` are required; `refresh_interval` is in minutes, one of 15, 30, 60, 120, 240, 360, 480, 720, 1440), and keep each file under 100 KB.
- `settings.yml` is read only at import: editing it later does not change a plugin already installed on TRMNL.

### Previewing on TRMNL

TRMNL's preview (the TRMNL MCP `startPreview`) only renders markup saved in a plugin, and the local Chrome render is not reliable for the TRMNL X (it gets the X's scaling wrong). To preview changes that are not approved yet:

- Never write them to the owner's live PortWatch VI plugin: the device would show unapproved markup.
- Create a separate private test plugin (named "PortWatch VI (test)", polling the same `data/trmnl.json`), write the markup there and preview it.
- When the work is done, ask the owner to delete the test plugin. Do not delete it yourself.
- Previews spend from the account's hourly render allowance (60 an hour): batch them, and stop on a 429.

## Conventions

- Plugin files (`*.liquid`, `settings.yml`, `icon.svg`) live in `src/`. `icon.svg` is not part of the import zip (TRMNL takes the icon as an upload in the plugin's settings); it is black and white only, for e-ink. Scripts live in `scripts/`, generated data in `data/`.
- Never commit secrets. The workflow needs none beyond the repo's own `GITHUB_TOKEN`.
