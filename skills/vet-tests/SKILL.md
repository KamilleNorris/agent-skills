---
name: vet-tests
description: >-
  Use when the user asks to review or vet tests they just wrote or edited ("review the tests
  I just wrote", "check this spec", "are these tests any good"), or to find duplicate /
  redundant / overlapping tests in a PR or branch ("review the tests in this PR", "vet this
  diff's test additions before merge") — even when they don't say the word "duplicate". Not
  for hunting missing coverage.
---

# Vet tests

## Overview

Confirm every test under review earns its place: it asserts real behavior, and it doesn't
duplicate another test. This is a judgment task — the mechanical parts (listing the tests,
spotting a repeated title) are trivial; the value is reading the code under test and deciding
what each assertion actually protects. This reviews the tests in scope, not whether coverage
is missing — don't hunt for untested behavior unless the user asks.

## Inputs

Optional, in priority order (see Step 1): a spec path or "this spec", a PR number, a branch
name, or nothing (defaults to working-tree changes). Runs at any granularity — a single spec
you just saved, the tests changed in your working tree, or a whole PR — and is cheap to run
iteratively while writing, not only at merge time.

## Guidelines

Read `references/review-rubric.md` for the meaningful-vs-duplicative criteria, how a test's
type sets its responsibility, and the patterns that are NOT duplication — consult it while
judging in Step 4. When a repo has coverage tooling and the user wants a proposed deletion
confirmed, `references/coverage-check.md` adds a deterministic safety net (a coverage drop
proves the test was not a duplicate) — used in Step 6.

## Workflow

**1. Resolve scope — which tests am I vetting?** Take the first that applies:
- **Explicit target** — a spec path the user named, "this spec", or the file just written/
  edited in the session: review every test in it (or just the ones the session added).
- **Working-tree changes** — right after writing/editing without a named file: the
  uncommitted spec changes — `git diff --name-only` (add `--staged` / `HEAD` as needed),
  keeping test files by the repo's convention (e.g. `*.spec.*`, `*.test.*`, `test_*.py`,
  `*_test.go`).
- **PR number** — `gh pr view <N> --json files` (filter to test files), or `gh pr diff <N>`
  for the added test lines.
- **Branch** — the current branch vs the repo's default (`main` / `master`):
  `git diff --name-only <default>...HEAD`.

For a diff-based scope, review only the tests the change **adds or modifies**, and note
net-new vs. edited — an edited test is judged on its new form. For an explicit whole-spec
scope, review every test in the file.

**2. Read each test in scope AND the code it exercises.** You cannot judge meaningfulness
from the test alone. Open the unit under test (the component, class, module, or function the
spec imports) and confirm each test asserts an observable behavior that unit actually owns.

**3. Gather the comparison set for duplication.** Duplication is rarely within one file. Pull
sibling specs in the same directory, specs that import/exercise the same unit (`grep` the
symbol under test across the repo's test files), and — for an integration spec — the unit spec
of the collaborator it drives. See the rubric's Distinct section for what counts as overlap
(cross-layer, shared-collaborator). A repeated or near-identical test **title** across files is
a strong candidate signal — but a candidate only; confirm same unit, same branch, same
assertions before calling it duplication.

**4. Classify, then judge each test** against the rubric. First label its type — unit,
integration, or functional/behavioral — because that sets what the test is responsible for
asserting (a unit must not re-verify a collaborator; an integration test's whole job is the
seam). Then: meaningful? distinct? If duplicative, of what?

**5. Report** per Output Format below. Do not edit tests unless the user asks — review first.

**6. Optionally verify a removal against coverage.** After reporting, if the repo has coverage
tooling and any verdict is `drop`/`collapse`, ask the user whether to run the coverage check —
don't run it unprompted. If they confirm, follow `references/coverage-check.md`: baseline the
full suite, remove the flagged test, re-run, and diff with `scripts/coverage_diff.py`. A
coverage drop proves the test was not a duplicate — restore it. Coverage holding is necessary
but not sufficient; the assertion-overlap judgment still decides. Skip entirely when no
coverage tooling exists.

## Output Format

Group by changed file. Per test: the action (`keep`/`drop`/`collapse`/`merge`), a `file:line`
anchor, one line of why. Then a short recommendation and any unresolved questions — see
`references/review-rubric.md`'s Output Format section for the exact template.
