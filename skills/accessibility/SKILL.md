---
name: accessibility
description: Accessibility (a11y, WCAG 2.2 AA) for frontend code. Use when writing or changing UI markup, components, styles, or forms, and when auditing or testing pages with axe.
---

# Accessibility

Target: **WCAG 2.2 Level AA**. axe-core detects only the barriers a machine can decide; the rest need **semantics by construction** while writing and a **keyboard pass** while testing. A clean axe run is evidence, never proof of conformance.

## Writing UI

Before writing or changing markup, components, styles, or forms, read [`references/writing.md`](references/writing.md). Each rule there is tagged with the axe rule id that catches it, or **manual** where axe cannot. Apply every rule that touches the elements you are writing.

Prefer the native element (`<button>`, `<a href>`, `<label>`, `<dialog>`, `<select>`) over ARIA on a `<div>`. Reach for ARIA only when no native element carries the semantics, and then follow the matching [WAI-ARIA APG pattern](https://www.w3.org/WAI/ARIA/apg/patterns/) for roles, states, and keyboard behaviour.

## Testing UI

**Requires `playwright-cli`, installed globally** (`npm install -g @playwright/cli@latest`). If `command -v playwright-cli` finds nothing, tell the user to install it; until then, the rendered scan and keyboard pass are unverified.

Read [`references/testing.md`](references/testing.md), then run every layer the project can support:

1. **Static lint**: the project's a11y ESLint plugin, when configured.
2. **Rendered scan**: `scripts/axe-scan.sh` on each changed page open in `playwright-cli`, in each state the change touches (open menu, error message, empty list, dialog).
3. **Keyboard pass**: the manual checklist in `testing.md`.

Done when, for every changed page and state: axe reports zero violations at the WCAG 2.2 AA tags, every "needs manual review" item has been looked at, and every manual checklist item has been checked. Report which layers ran, which states were scanned, and what stayed unverified (for example, no running dev server, `playwright-cli` not installed, or no screen reader available).
