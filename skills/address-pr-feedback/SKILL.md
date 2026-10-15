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
4. **Failed checks.** Run `gh pr checks <number>`. If any failed, follow `references/failed-checks.md` for this and every later step.
5. **SonarQube.** If the PR has a SonarQube or SonarCloud check or bot comment, follow `references/sonarqube.md` for this and every later step.

Done when every unresolved thread, unanswered comment, failed check and open SonarQube item is on one list.

## 2. Triage

Read the code or log each item points at, then give each review comment a verdict:

- **Fix**: it's right and the change belongs in this PR.
- **No change**: it's wrong, already handled, or out of scope. Bot claims about an API, a library or a language feature count as unverified until checked against typings, docs, or by running the code; record that evidence, since the reply will cite it.
- **Ask**: a design call, a trade-off, or anything the PR author should own.

Show the user one table: item, source (person, bot, check or SonarQube), one-line summary, verdict or options, and the planned change, reply or rerun. Wait for their go-ahead and apply any overrides.

Done when the user has approved an action for every item.

## 3. Fix

Make the approved fixes. Run the project's lint, type check and tests for the code you touched. Commit in logical groups using the repository's commit message convention, then push.

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

## 5. Confirm

1. Run `gh pr checks <number>`. Anything newly failing goes back through triage; anything still running gets reported as pending.
2. Run `scripts/review-threads.sh <number>` again: only threads opened by people should remain, each with a reply.
3. Read the PR description against the final diff. Propose edits for anything the fixes made inaccurate; apply them with `gh pr edit <number> --body-file <file>` once approved.
