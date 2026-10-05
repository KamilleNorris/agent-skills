# agent-skills

Harness-agnostic [Agent Skills](https://agentskills.io): each skill is a `SKILL.md` plus the references and scripts it points at, usable by any agent that reads the format (Claude Code, Copilot CLI, Codex, Cursor, Kiro, Gemini CLI…).

| Skill | What it does |
| --- | --- |
| [`accessibility`](skills/accessibility/SKILL.md) | WCAG 2.2 AA rules for writing frontend code, plus testing with static lint, an axe-core scan of rendered pages, and a keyboard checklist |

## Install

```bash
npx skills add KamilleNorris/agent-skills            # pick skills interactively
npx skills add KamilleNorris/agent-skills@accessibility -g
```

Or clone and link `skills/<name>` into your agent's skills directory (e.g. `~/.agents/skills/`).

## accessibility: axe scan setup

`skills/accessibility/scripts/axe-scan.mjs` needs Node 20+, `playwright`, and `axe-core`. It uses the tested project's copies when present; otherwise install the pinned ones once:

```bash
npm install --prefix skills/accessibility/scripts
npx --prefix skills/accessibility/scripts playwright install chromium
node skills/accessibility/scripts/axe-scan.mjs skills/accessibility/scripts/fixtures/broken.html   # expect 6 violations
```
