**Why:** a failed run (e.g. drift check after the site changes its scoring) only sends an email; the display silently shows stale data. The owner wants to be told in the repo.
**Goals:** one open issue while failures continue, a short comment per failed run, auto-close when a run succeeds.
**Non-goals:** external notifications (Slack, email), retries, issue per run.
**Anti-goal:** giving `issues: write` to the job that runs code downloaded from the site.
1. Extra steps in the `build` job: simplest, but `issues: write` would be reachable by the downloaded `scoring.js`. Rejected.
2. **Separate `report` job** (`needs: build`, `if: always()`), the only one with `issues: write`, using the preinstalled `gh` CLI. Chosen (recommended, owner agreed).
3. A marketplace issue-creation action: adds a third-party dependency for ~15 lines of shell. Rejected.
- `build` keeps `contents: write` only; `report` gets `issues: write` only and does no checkout.
- Failure: find the open issue labelled `workflow-failure` (label created on first use); if none, create it ("Build TRMNL data is failing"); otherwise comment. Both include the run link and time.
- Success: if an open `workflow-failure` issue exists, comment "Fixed by <run>" and close it.
- Cancelled runs are ignored (concurrency group cancels nothing today, but be safe).
- Docs: README (How it works + failure paragraph) and the workflow header comment.
