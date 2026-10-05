# Test review rubric

Classify each test's type first (it sets the responsibility bar), then answer two questions:
is it **meaningful**, and is it **distinct**. Judge all of it against the code under test —
never from the test file alone.

## Meaningful

A test is meaningful when it would catch a real regression. It should:

- assert an **observable behavior the unit owns** — a return value, emitted output, rendered
  DOM, a call it makes to a collaborator that IS its job (delegation/wiring), a state
  transition, an error surfaced.
- exercise a **distinct code path** — a branch, guard, or edge the other tests don't reach.
- fail if that behavior broke, and fail for that reason.

Smells that usually mean **not meaningful** (confirm against the code before calling it):

- **Tautology** — asserts a value the test itself hardcoded, with no transformation in
  between.
- **Tests the framework or a library** — re-verifies behavior owned by the framework or a
  third-party dependency (e.g. that a UI framework marks a control touched, that an HTTP
  client serializes a body). Not our code, not our test.
- **Restates the mock** — asserts a stub returns what the test told it to, when no logic sits
  between. (Asserting the unit *called* a collaborator correctly is different — that wiring
  is real behavior.)
- **Impl-detail lock-in** — asserts a private/internal shape with no behavioral consequence;
  breaks on refactor without protecting anything.
- **Non-discriminating** — passes identically whether the feature works or not.

## Classify the type first — it sets the responsibility bar

What a test is *responsible for* depends on its type, so classify each before judging it. A
single spec often mixes types across its cases — classify per test, not per file.

- **Unit** — exercises one unit with its collaborators stubbed. Responsible for the unit's own
  logic: transformations, branches, outputs, and the calls it makes to collaborators. Must
  NOT assert a stubbed collaborator's internal state or re-verify the collaborator's behavior.
- **Integration** — exercises a unit wired to its *real* collaborators instead of stubs (a
  real dependency, an actual DB, a real client + transport). Responsible for the **seam**:
  that the pieces connect — the right call is made with the right inputs, and data flows
  through the contract. Must NOT re-run the collaborator's own branch coverage; that belongs
  to the collaborator's unit spec (see **Cross-layer** below). Driving a real collaborator is
  this type's job, not a smell — but wiring a call is not *by itself* meaningful. An
  integration test earns its place only by asserting something the collaborator's own spec
  doesn't already prove: this implementation's inputs, outputs, or transform. Asserting the
  collaborator's generic response adds nothing if that collaborator is tested elsewhere.
- **Functional / behavioral** — exercises a surface the way its consumer uses it: a component
  through the accessible DOM, or an endpoint through its request/response. Follows the Testing
  Library guiding principle — *the more your tests resemble the way the software is used, the
  more confidence they give.* Responsible for consumer-facing outcomes — what renders, what
  the user can do, driven by state. Must NOT assert internals.

For a component / UI test specifically (functional in style, collaborator usually stubbed):

- Reading a collaborator's state to assert what the user then sees is correct — the
  collaborator reports a locked state, so assert the control is disabled. That is the
  component's own job.
- Asserting a collaborator was *called* is correct — a command method was invoked. The call
  is the component's job; what happens next is not.
- Asserting the collaborator's own state as the outcome is not — checking the collaborator's
  status flag tests the collaborator from the wrong spec.

## Distinct (not duplicative)

Duplication is a test that re-verifies behavior another test already covers. Types, roughly
by how often they hide:

- **Within-file** — two tests drive the same path with the same assertions.
- **Cross-file / sibling** — a test re-verifies what a neighboring spec already locks down. A
  verbatim or near-identical **title** in another spec is the strongest tell; confirm both
  hit the same unit + branch.
- **Cross-layer** — an integration spec re-proves a lower unit's already-tested behavior
  through a different test double, adding no new wiring or contract coverage. The incremental
  value of such a test is only what the *integration* uniquely proves (e.g. the right call is
  made); if a sibling test already establishes that, the rest are re-runs of the lower unit's
  spec.
- **Shared collaborator, many implementations** — a common cross-layer shape: several
  implementations each drive one shared collaborator (a strategy/adapter pattern — one
  implementation per variant behind a common core). The shared collaborator's behavior only
  needs proving once — through any one implementation, or the collaborator's own spec (often
  fixtured via *another* implementation). A second implementation's spec that asserts the same
  shared behavior is a re-run, even when no single file repeats a title. Such a spec should
  assert only what *its* implementation uniquely contributes — its own inputs, outputs, and
  transforms.

A title collision is a **candidate**, not a verdict — verify behavioral overlap first.

### NOT duplication — do not flag these

- **Same name, different layer, different assertion** — e.g. a functional test asserting a
  component delegates to a collaborator, and an integration test asserting the real call that
  collaborator then makes. Different responsibilities; both earn their place. Say so explicitly.
- **Branch matrix** — the dirty / clean / error paths of one method, each hitting a distinct
  path. Recognize the pattern; don't flag its members as redundant.
- **Positive + negative of one guard** — the "does X when C" and "does not X when not C"
  pair. Distinct branches.

## Actions

Assign each test one:

- **keep** — meaningful and distinct.
- **drop** — duplicative with no incremental value, or not meaningful.
- **collapse** — several near-identical tests that should become one (name the survivor).
- **merge** — fold this test's unique assertion into another, then drop it.

## Output format

Group by changed file. Per test: the action, a `file:line` anchor, one line of why (cite the
branch or assertion; for duplication, name the specific overlapping test). Then a short
recommendation and any unresolved questions.

```
### <file>
- keep — `file:42` "test title" — only test covering the <specific> branch.
- drop — `file:88` "test title" — re-runs <sibling-spec> "same title"; asserts only shared-collaborator behavior.
- collapse — `file:120`/`file:150` — two tests of the same error path; keep one.

### Recommendation
<what to change, briefly>

### Unresolved
<concise questions, if any>
```
