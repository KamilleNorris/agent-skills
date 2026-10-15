#!/usr/bin/env bash
# Prints a pull request's unresolved review threads as JSON lines, one thread per line.
#
# Usage: review-threads.sh [pr-number]   (defaults to the current branch's PR)
#
# Each line: {threadId, path, line, outdated, botThread, comments: [{id, author, bot, body}]}
# `id` is the comment's REST id, used to reply; `threadId` is the GraphQL id, used to resolve.
set -euo pipefail

pr="${1:-$(gh pr view --json number -q .number)}"
owner="$(gh repo view --json owner -q .owner.login)"
name="$(gh repo view --json name -q .name)"

gh api graphql -F owner="$owner" -F name="$name" -F number="$pr" -f query='
query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      reviewThreads(first: 100) {
        nodes {
          id isResolved isOutdated path line
          comments(first: 50) {
            nodes { databaseId body author { login __typename } }
          }
        }
      }
    }
  }
}' --jq '
.data.repository.pullRequest.reviewThreads.nodes[]
| select(.isResolved | not)
| {
    threadId: .id,
    path,
    line,
    outdated: .isOutdated,
    botThread: (.comments.nodes[0].author.__typename == "Bot"),
    comments: [.comments.nodes[] | {
      id: .databaseId,
      author: .author.login,
      bot: (.author.__typename == "Bot"),
      body
    }]
  }'
