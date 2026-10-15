# Failed checks

## Collect

Run `gh pr checks <number> --json name,bucket,link,workflow` and keep entries whose `bucket` is `fail`. If a check is still `pending`, say so and collect it later rather than waiting.

For a GitHub Actions job (its link contains `/actions/runs/<run-id>/job/<job-id>`), read the failing steps with `gh run view --job <job-id> --log-failed`. That log can be long, may label every line `UNKNOWN STEP`, and ends in cleanup output, so find the first `##[error]` line and read the lines above it; the nearest `##[group]Run` line before it names the step.

Other checks are external services; note the name and link.

## Triage

Give each failed check its cause and the options that fit it, with a recommended one:

- **Fix in this PR**: the failure comes from the PR's changes (a test, lint, type or build error). Reproduce it locally with the same command the job ran.
- **Rerun**: the log points to something transient (network timeout, runner lost, rate limit, a known flaky test). Compare with recent runs of the same workflow on the base branch: `gh run list --workflow "<workflow>" --branch <base> --limit 5`.
- **Already broken on the base branch**: the same job fails there too. Options are to fix it here, wait for a fix upstream, or leave it to the repository owners.
- **Needs someone else**: missing secrets, permissions, or an external service's configuration. Say who or what is needed.

## Fix

For a check you're fixing, run its local equivalent along with the project's usual checks.

Run approved reruns after pushing, so they pick up the new commits when relevant: `gh run rerun <run-id> --failed`.
