# Testing accessibility

Three layers, cheapest first. Each catches what the others miss: static lint sees source but not rendered output, axe sees rendered output but not behaviour, the keyboard pass sees behaviour.

## 1. Static lint

Look in the project's ESLint config for an a11y plugin and run the project's lint script on changed files:

| Stack | Plugin | Flat-config entry |
| --- | --- | --- |
| React / JSX | `eslint-plugin-jsx-a11y` | `jsxA11y.flatConfigs.recommended` (or `.strict`) |
| Vue | `eslint-plugin-vuejs-accessibility` | `...pluginVueA11y.configs["flat/recommended"]` |
| Angular | `angular-eslint` | `angular.configs.templateAccessibility` |

If none is configured, recommend the matching plugin to the user instead of adding a dependency yourself. Lint is a fast pre-check, never a substitute for the rendered scan.

## 2. Rendered scan with axe

`scripts/axe-scan.mjs` (next to this skill's `SKILL.md`) loads pages in headless Chromium, injects axe-core, and runs every WCAG 2.0/2.1/2.2 A and AA rule, including `target-size`, which axe leaves off by default.

```bash
node <skill-dir>/scripts/axe-scan.mjs http://localhost:3000/settings http://localhost:3000/login
node <skill-dir>/scripts/axe-scan.mjs dist/index.html --wait-for "#app main"
```

| Option | Use |
| --- | --- |
| `--wait-for <selector>` | SPA routes: wait until the app has rendered |
| `--include <selector>` | Scan only the changed component's container |
| `--exclude <selector>` | Skip third-party embeds you do not own (repeatable) |
| `--best-practices` | Add axe `best-practice` rules (landmarks, heading order) |
| `--tags <list>` | Override the tag set, e.g. `wcag2a,wcag2aa` |
| `--viewport 375x812` | Mobile layout; run this too when the change is responsive |
| `--json` | Raw axe results |

Exit code `0` is clean, `1` means violations, `2` means usage or runtime error.

**Setup.** The script takes `playwright` and `axe-core` from the project under test when it has them, otherwise from the skill's own install. When it reports a missing dependency it prints the install commands; run them once.

**Reading results.**
- *Violations*: fix every one. Each entry gives the rule id, its WCAG criteria, the CSS target, the HTML, and axe's fix summary. The `helpUrl` explains the rule.
- *Needs manual review*: axe could not decide, typically contrast over images or gradients. Inspect each one and report what you concluded.
- Fix the source, then rerun the same command until it reports zero violations.

**States.** One scan covers one DOM state. For a menu, dialog, validation error, or loading state, scan it in that state. Either add `@axe-core/playwright` to the project's own e2e tests:

```ts
import AxeBuilder from "@axe-core/playwright";

await page.getByRole("button", { name: "Delete" }).click();
const results = await new AxeBuilder({ page })
  .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
  .analyze();
expect(results.violations).toEqual([]);
```

or render the state directly (a story, a test route, a query param) and point `axe-scan.mjs` at it.

**Component tests.** `jest-axe` (or `vitest-axe`) runs axe inside jsdom. jsdom has no layout, so `color-contrast` and `target-size` results there cannot be trusted (`jest-axe` turns `color-contrast` off); still run the rendered scan.

## 3. Keyboard pass

Check every interactive element the change touches. Drive it yourself through a browser automation tool when one is available; otherwise list these items as unverified for the user.

- [ ] Tab reaches every control in visual order; Shift+Tab reverses it.
- [ ] The focus indicator is visible on every stop, and never hidden under a sticky header or overlay.
- [ ] Enter and Space activate buttons; Enter follows links; arrow keys move within composite widgets (tabs, menus, listboxes, radio groups) as the APG pattern specifies.
- [ ] Esc closes dialogs, menus, and popovers, and focus returns to the control that opened them.
- [ ] A modal dialog keeps focus inside until it closes.
- [ ] Nothing traps focus; nothing happens just because an element receives focus.
- [ ] After a deletion, route change, or async update, focus lands somewhere sensible and status changes are announced (check for the `role="status"`/`aria-live` region).
- [ ] At 200% zoom and 320 CSS px width, content reflows and stays usable.
- [ ] Animation stops or reduces with `prefers-reduced-motion: reduce` (Playwright: `page.emulateMedia({ reducedMotion: "reduce" })`).

An accessibility-tree snapshot (Playwright `page.ariaSnapshot()` / `locator.ariaSnapshot()`, Chrome DevTools MCP `take_snapshot`) shows the names, roles, and states a screen reader gets. Use it to confirm labels and state changes. It does not replace testing with a real screen reader (VoiceOver, NVDA), which stays with the user.
