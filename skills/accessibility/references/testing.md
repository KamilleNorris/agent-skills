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

Drive the page with [`playwright-cli`](https://github.com/microsoft/playwright-cli), then run `scripts/axe.js` (next to this skill's `SKILL.md`) in the same session. It loads axe-core 4.13 into the open page and runs every WCAG 2.0/2.1/2.2 A and AA rule, including `target-size`, which axe leaves off by default.

```bash
playwright-cli open http://localhost:3000/settings
playwright-cli --raw run-code --filename=<skill-dir>/scripts/axe.js
playwright-cli goto http://localhost:3000/login
playwright-cli --raw run-code --filename=<skill-dir>/scripts/axe.js
playwright-cli close
```

The command exits non-zero and prints the report when there are violations; it exits zero with `violations: 0` when clean.

**Options.** Set `window.axeScanOptions` with `eval` before the scan; it lasts until the next navigation.

```bash
playwright-cli eval "window.axeScanOptions = { include: '#settings-form', exclude: ['#chat-widget'] }"
```

| Key | Use |
| --- | --- |
| `include` | Scan only the changed component's container |
| `exclude` | Skip third-party embeds you do not own (array of selectors) |
| `bestPractices: true` | Add axe `best-practice` rules (landmarks, heading order) |
| `tags` | Override the tag set, e.g. `['wcag2a', 'wcag2aa']` |
| `json: true` | Return raw axe results |

| Need | Command |
| --- | --- |
| SPA route still rendering | `playwright-cli run-code "async page => page.locator('main').waitFor()"` |
| Mobile layout (run too when the change is responsive) | `playwright-cli open <url> --mobile`, or `playwright-cli resize 375 812` |
| Local HTML file (`file://` is blocked) | Serve the folder, e.g. `python3 -m http.server 8000`, and open `http://localhost:8000/<file>` |

**Setup.** `npm install -g @playwright/cli@latest`. It uses the installed Chrome by default; if it reports a missing browser, run `playwright-cli install-browser`. Each scan downloads the pinned axe-core from jsDelivr, so it needs network access.

**Reading results.**
- *Violations*: fix every one. Each entry gives the rule id, its WCAG criteria, the CSS target, the HTML, and axe's fix summary. The `helpUrl` explains the rule.
- *Needs manual review*: axe could not decide, typically contrast over images or gradients. Inspect each one and report what you concluded.
- Fix the source, reload, and rerun the scan until it reports zero violations.

**States.** One scan covers one DOM state. Put the page into each state the change touches with `playwright-cli` (`click`, `fill`, `press`), then rerun the scan without navigating. To keep that coverage as a regression test, add `@axe-core/playwright` to the project's own e2e tests:

```ts
import AxeBuilder from "@axe-core/playwright";

await page.getByRole("button", { name: "Delete" }).click();
const results = await new AxeBuilder({ page })
  .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
  .analyze();
expect(results.violations).toEqual([]);
```

**Component tests.** `jest-axe` (or `vitest-axe`) runs axe inside jsdom. jsdom has no layout, so `color-contrast` and `target-size` results there cannot be trusted (`jest-axe` turns `color-contrast` off); still run the rendered scan.

## 3. Keyboard pass

Check every interactive element the change touches, driving it with `playwright-cli` (`press Tab`, `press Shift+Tab`, `press Escape`, then `snapshot` to see where focus is and what changed). Where you cannot drive a check, list it as unverified for the user.

- [ ] Tab reaches every control in visual order; Shift+Tab reverses it.
- [ ] The focus indicator is visible on every stop, and never hidden under a sticky header or overlay.
- [ ] Enter and Space activate buttons; Enter follows links; arrow keys move within composite widgets (tabs, menus, listboxes, radio groups) as the APG pattern specifies.
- [ ] Esc closes dialogs, menus, and popovers, and focus returns to the control that opened them.
- [ ] A modal dialog keeps focus inside until it closes.
- [ ] Nothing traps focus; nothing happens just because an element receives focus.
- [ ] After a deletion, route change, or async update, focus lands somewhere sensible and status changes are announced (check for the `role="status"`/`aria-live` region).
- [ ] At 200% zoom and 320 CSS px width, content reflows and stays usable.
- [ ] Animation stops or reduces with `prefers-reduced-motion: reduce` (`playwright-cli set-reduced-motion reduce`).

`playwright-cli snapshot` shows the accessibility tree: the names, roles, and states a screen reader gets. Use it to confirm labels and state changes. It does not replace testing with a real screen reader (VoiceOver, NVDA), which stays with the user.
