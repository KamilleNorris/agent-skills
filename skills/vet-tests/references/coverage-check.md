# Coverage check — verifying a removal is safe

An optional, deterministic verification for a `drop` or `collapse` verdict. It answers one
question: *if this test is removed, does the suite still cover everything it did before?* Run
it only when the repo already has coverage tooling and the user has confirmed they want the
removal checked — ask first, don't run it unprompted. It is a safety net on the judgment, not
a detector of duplication.

## The principle — a one-way signal

Coverage parity is **necessary but not sufficient** for duplication:

- **Coverage drops after removal → proof the test was NOT a duplicate.** It uniquely executed
  some line or branch. Restore it and downgrade the verdict to `keep`. This direction is
  deterministic and trustworthy.
- **Coverage holds → only the necessary condition is met.** Two tests can execute the identical
  lines yet assert different things, so parity does not prove redundancy. It means the removal
  is *safe to consider*; the assertion-overlap judgment from the rubric still decides.

Never report "coverage held, therefore duplicate." Report "coverage held, so no path is lost;
the tests overlap because <assertion reason>."

## The critical setup — compare full suite vs full suite minus the test

Duplication means *another* test covers the same code. So the comparison must be:

- **before** = coverage for the **whole remaining suite** (every test that would still exist),
  including the flagged test.
- **after** = the same whole suite with **only the flagged test removed**.

Scoping either run to just the flagged test's file defeats the check — the sibling or
lower-layer test that makes it redundant lives elsewhere, and a file-scoped run would show a
false drop. Generate coverage for the whole suite (or at minimum every test that exercises the
unit under test *and* its collaborators).

## Procedure

1. Generate baseline coverage for the full suite → `before` report.
2. Remove (or `xit`/`skip`/`t.Skip`) the flagged test — for `collapse`, remove all but the
   named survivor.
3. Regenerate coverage the same way → `after` report.
4. Diff them:
   ```
   scripts/coverage_diff.py <before> <after>   # relative to this skill's directory
   ```
   Exit `0` = held, `1` = dropped (lists the lost lines/branches), `2` = usage/parse error.
5. Interpret per the principle above. Restore anything whose removal dropped coverage; report
   the rest with the assertion-overlap reason. Restore skipped tests afterward regardless.

## Emitting a coverage report the script reads

The script reads **lcov** and **Go coverprofile**. Generate a report for the full suite twice
(flagged test present, then removed) and diff the two. Name the runs so they don't clobber each
other (e.g. `lcov.before.info` / `lcov.after.info`). Not every runner emits lcov by default;
the flag or config to turn it on is below.

Check the repo's own test scripts first — a project that already produces coverage usually has
a `test-ci`, `coverage`, or `test:cov` target, and reusing it beats inventing a command.

| Runner | Command | Output |
| --- | --- | --- |
| Jest | `jest --coverage --coverageReporters=lcov` | `coverage/lcov.info` |
| Vitest | `vitest run --coverage --coverage.reporter=lcov` | `coverage/lcov.info` |
| Karma | lcov via `karma-coverage` in `karma.conf.js` | per the configured dir |
| c8 / nyc | `c8 --reporter=lcov <cmd>` | `coverage/lcov.info` |
| coverage.py (≥6.3) | run the suite, then `coverage lcov -o cov.info` | `cov.info` |
| pytest-cov | `pytest --cov=<pkg> --cov-report=lcov` | `coverage.lcov` |
| PHPUnit | `phpunit --coverage-clover` then convert, or Xdebug/PCOV with a clover-to-lcov step | varies |
| Go | `go test ./... -coverprofile=cover.out` | `cover.out` (coverprofile, read directly) |

Multi-project repos need the runs merged before diffing, or diffed per project — a partial
report looks like a coverage drop everywhere it doesn't reach. If the repo has a script that
combines per-project lcov files, use it.

## Caveats

- **Line/branch coverage is coarser than assertions.** The script proves a path is still
  executed, not that the surviving tests still *assert* the removed test's expectation. When a
  removed test held coverage but asserted something no survivor asserts, that is a meaningful
  loss the check cannot see — rely on the rubric judgment there.
- **Flaky or order-dependent suites** make the diff unreliable; note it rather than trusting a
  spurious drop.
- **No coverage tooling** in the repo → skip this step and report the verdict on judgment
  alone. Do not add coverage tooling just to run the check.
