> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.
**Goal:** The workflow opens or updates one issue when a run fails, and closes it when a run succeeds.
**Architecture:** A second job `report` in `.github/workflows/build-data.yml`, `needs: build`, `if: always() && needs.build.result != 'cancelled'`, the only job with `issues: write`, using the preinstalled `gh` CLI. No checkout, no third-party action.
**Tech Stack:** GitHub Actions, `gh`, bash.
**Spec:** `docs/superpowers/specs/2026-11-25-failure-issue-design.md`
- `build` keeps `contents: write` only; `report` gets `issues: write` only (set per job, top-level `permissions` removed or moved into `build`).
- `persist-credentials: false` and token only in the commit step stay as they are.
- Label: `workflow-failure`. Issue title: `Build TRMNL data is failing`.
- English docs; README and workflow header comment updated in the same change.
- Two failed runs in a row: one issue, two comments (never two issues).
- Success with no open issue: nothing created, no error.
- Label missing on first failure: created, not an error.
- Cancelled `build`: `report` does nothing.
---
**Files:**
- Modify: `.github/workflows/build-data.yml`
- Modify: `README.md` ("How it works" failure paragraph)
**Interfaces:** Produces job `report` using env `GH_TOKEN`, `GH_REPO`, `RUN_URL`, `RESULT` (`needs.build.result`).
- [ ] **Step 1:** Move `permissions: contents: write` into the `build` job; add job `report` with `permissions: issues: write`.
- [ ] **Step 2:** In `report`, one bash step: `gh label create workflow-failure ... 2>/dev/null || true`; find `N=$(gh issue list --label workflow-failure --state open --json number -q '.[0].number')`. If `RESULT=failure`: comment on `N` if set, else `gh issue create` (title, label, body with `RUN_URL`). If `RESULT=success` and `N` set: `gh issue close "$N" --comment "Fixed by $RUN_URL"`.
- [ ] **Step 3:** Validate: `python3 -c "import yaml;yaml.safe_load(open('.github/workflows/build-data.yml'))"` passes (or `actionlint` if installed); `bash -n` on the extracted script.
- [ ] **Step 4:** README: replace "GitHub emails the repo owner..." with a description of the issue behaviour (open/comment/close, label); update the workflow header comment.
- [ ] **Step 5:** Commit. After merge, prove it live: temporarily break via `workflow_dispatch` is not possible without a code change, so state in the PR that the failure path was verified only by reading and the success path by the next scheduled run.
