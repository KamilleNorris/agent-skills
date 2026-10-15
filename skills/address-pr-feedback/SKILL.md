---
name: address-pr-feedback
description: >-
  Work through everything blocking a GitHub pull request: unresolved review comments from
  people and bots (Bugbot, Copilot, CodeRabbit), failed GitHub Actions checks, and SonarQube
  issues. Fixes or answers each one, replies on threads and resolves bot threads. Use when the
  user says "address the feedback", "handle the review comments", "fix the failing checks",
  "resolve the bot threads" or names a PR that has open comments or red checks.
---

# Address PR feedback

Every open item on the PR (review comment, failed check, SonarQube issue) ends with a **verdict**, an action the user approved, and a reply or rerun where one applies. Nothing is posted, pushed or rerun until the user has seen the plan.

Needs the `gh` CLI, authenticated, run from a checkout of the PR's repository.

## 1. Collect

1. Find the PR: the number the user gave, else `gh pr view --json number,headRefName,url` for the current branch. Make sure the PR's branch is checked out and up to date with its remote before changing code.
2. **Review threads.** Run `scripts/review-threads.sh <number>`. It prints one JSON line per unresolved inline thread, with the REST comment ids used to reply and the thread id used to resolve.
3. **Top-level comments.** Run `gh pr view <number> --json reviews,comments` for review summaries and conversation comments. Keep the ones nobody has answered yet.
4. **Failed checks.** Run `gh pr checks <number> --json name,bucket,link,workflow` and keep entries whose `bucket` is `fail`. For a GitHub Actions job (its link contains `/actions/runs/<run-id>/job/<job-id>`), read the failing steps with `gh run view --job <job-id> --log-failed`. That log can be long, may label every line `UNKNOWN STEP`, and ends in cleanup output, so find the first `##[error]` line and read the lines above it; the nearest `##[group]Run` line before it names the step. Other checks are external services; note the name and link. If a check is still `pending`, say so and collect it later rather than waiting.
5. **SonarQube**, when the PR has a SonarQube or SonarCloud check or bot comment. See [SonarQube](#sonarqube).

Done when every unresolved thread, unanswered comment, failed check and open SonarQube issue is on one list.

## 2. Triage

Read the code or log each item points at, then give it a verdict.

Review comments and SonarQube issues:

- **Fix**: it's right and the change belongs in this PR.
- **No change**: it's wrong, already handled, or out of scope. Bot claims about an API, a library or a language feature count as unverified until checked against typings, docs, or by running the code; record that evidence, since the reply will cite it.
- **Ask**: a design call, a trade-off, or anything the PR author should own.

Failed checks get the cause and the options that fit it, with a recommended one:

- **Fix in this PR**: the failure comes from the PR's changes (a test, lint, type or build error). Reproduce it locally with the same command the job ran.
- **Rerun**: the log points to something transient (network timeout, runner lost, rate limit, a known flaky test). Compare with recent runs of the same workflow on the base branch: `gh run list --workflow "<workflow>" --branch <base> --limit 5`.
- **Already broken on the base branch**: the same job fails there too. Options are to fix it here, wait for a fix upstream, or leave it to the repository owners.
- **Needs someone else**: missing secrets, permissions, or an external service's configuration. Say who or what is needed.

Show the user one table: item, source (person, bot, check or SonarQube), one-line summary, verdict or options, and the planned change, reply or rerun. Wait for their go-ahead and apply any overrides.

Done when the user has approved an action for every item.

## 3. Fix

Make the approved fixes. Run the project's lint, type check and tests for the code you touched, plus the local equivalent of any check you're fixing. Commit in logical groups using the repository's commit message convention, then push.

Run approved reruns after the push, so they pick up the new commits when relevant: `gh run rerun <run-id> --failed`.

Done when local checks pass and every "fix" item maps to a pushed commit.

## 4. Reply and resolve

Draft one reply per review comment and show the drafts together before posting. Each reply is short and says one of:

- what changed, with the commit's short hash;
- why nothing changed, with the evidence (a doc link, the typings, or the command you ran and its output);
- that the question is open, when the user wants to reply themselves.

Post inline replies with:

```bash
gh api -X POST "repos/{owner}/{repo}/pulls/<number>/comments/<comment-id>/replies" -f body="<reply>"
```

Answer top-level comments with `gh pr comment <number> --body "<reply>"`.

Resolve each thread where `botThread` is true once its reply is posted. Leave threads opened by people unresolved, so the reviewer can confirm the fix, unless the user says otherwise.

```bash
gh api graphql -f query='mutation($id: ID!) { resolveReviewThread(input: {threadId: $id}) { thread { isResolved } } }' -F id="<threadId>"
```

SonarQube issues marked "no change" get their reason listed for the user, who decides whether to mark them accepted or false positive in SonarQube.

## 5. Confirm

1. Run `gh pr checks <number>`. Anything newly failing goes back through triage; anything still running gets reported as pending.
2. Run `scripts/review-threads.sh <number>` again: only threads opened by people should remain, each with a reply.
3. Read the PR description against the final diff. Propose edits for anything the fixes made inaccurate; apply them with `gh pr edit <number> --body-file <file>` once approved.

## SonarQube

Use the SonarQube CLI (`sonar`) when it's installed and `sonar auth status` reports a connected session. It finds the project key from the repository and prints which one it used on stderr; if it can't, pass `-p <key>`, which the SonarQube check's link carries as `id=<key>`.

1. **Quality gate**, which decides whether the check passes. Coverage, duplication or unreviewed hotspots can fail it with no open issues at all.

   ```bash
   sonar api get "/api/qualitygates/project_status?projectKey=<key>&pullRequest=<number>"
   ```

   Each failing condition (`status: "ERROR"`) is an item: compare `actualValue` with `errorThreshold`. A coverage condition is fixed with tests for the PR's new code.

2. **Issues**: `sonar list issues --pull-request <number> --format json`. Each issue has a `rule`, `message`, `severity`, `component` (the file path, prefixed with `<key>:`) and `textRange` for its lines. Triage them like review comments.

3. **Security hotspots**, when the gate's `new_security_hotspots_reviewed` condition fails: `sonar api get "/api/hotspots/search?projectKey=<key>&pullRequest=<number>"`. Reviewing a hotspot is a judgement for the user in SonarQube; summarize each one and its risk for them.

Without the CLI, use what's on the PR: the SonarQube check status and its summary comment. Tell the user the issue-level detail needs the CLI and a `sonar auth login`, then continue with the rest of the list.
