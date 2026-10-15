---
name: address-pr-feedback
description: >-
  Work through review feedback on a GitHub pull request: fix or answer each unresolved
  comment from people and review bots (Bugbot, SonarQube, Copilot, CodeRabbit), reply on the
  thread, and resolve bot threads. Use when the user says "address the feedback", "handle the
  review comments", "resolve the bot threads" or names a PR with open review comments.
---

# Address PR feedback

Every unresolved comment on the PR ends with a **verdict** (fix, no change, or ask the user), a reply that states it, and the right resolution state. Nothing is posted or pushed until the user has seen the plan.

Needs the `gh` CLI, authenticated, run from a checkout of the PR's repository.

## 1. Collect

1. Find the PR: the number the user gave, else `gh pr view --json number,headRefName,url` for the current branch. Make sure the PR's branch is checked out and up to date with its remote before changing code.
2. Run `scripts/review-threads.sh <number>`. It prints one JSON line per unresolved inline thread, with the REST comment ids used to reply and the thread id used to resolve.
3. Run `gh pr view <number> --json reviews,comments` for feedback outside inline threads: review summaries and conversation comments (SonarQube and some bots post here). Keep the ones nobody has answered yet.

Done when every unresolved thread and every unanswered top-level comment is on one list.

## 2. Triage

Read the code each comment points at, then give it a verdict:

- **Fix**: the comment is right and the change belongs in this PR.
- **No change**: the comment is wrong, already handled, or out of scope. Bot claims about an API, a library or a language feature count as unverified until checked against typings, docs, or by running the code; record that evidence, since the reply will cite it.
- **Ask**: a design call, a trade-off, or anything the PR author should own.

Show the user a table: location, who said it, one-line summary, verdict, and the planned change or reply. Wait for their go-ahead and apply any overrides.

Done when the user has approved a verdict for every item.

## 3. Fix

Make the approved fixes. Run the project's lint, type check and tests for the code you touched. Commit in logical groups using the repository's commit message convention, then push once the commits are in.

Done when the checks pass and every "fix" item maps to a pushed commit.

## 4. Reply and resolve

Draft one reply per item and show the drafts together before posting. Each reply is short and says one of:

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

Done when `scripts/review-threads.sh` lists only threads opened by people, each with a reply.

## 5. Recheck the description

Read the PR description against the final diff. Propose edits for anything the fixes made inaccurate; apply them with `gh pr edit <number> --body-file <file>` once approved.
