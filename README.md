# agent-skills

Harness-agnostic [Agent Skills](https://agentskills.io): each skill is a `SKILL.md` plus the references and scripts it points at, usable by any agent that reads the format (Claude Code, Copilot CLI, Codex, Cursor, Kiro, Gemini CLI…).

| Skill | What it does |
| --- | --- |
| [`accessibility`](skills/accessibility/SKILL.md) | WCAG 2.2 AA rules for writing frontend code, plus testing with static lint, an axe-core scan of rendered pages, and a keyboard checklist |
| [`vet-tests`](skills/vet-tests/SKILL.md) | Review just-written tests for quality and find duplicate or overlapping tests in a diff |

## Install

```bash
npx skills add KamilleNorris/agent-skills            # pick skills interactively
npx skills add KamilleNorris/agent-skills@accessibility -g
```

Or clone and link `skills/<name>` into your agent's skills directory (e.g. `~/.agents/skills/`).

## accessibility: test setup

**Testing pages requires [`playwright-cli`](https://github.com/microsoft/playwright-cli) installed globally.** The writing rules work without it.

```bash
npm install -g @playwright/cli@latest   # required
npm install -g axe-core@4.13.0          # optional: offline scans; otherwise axe-core loads from jsDelivr
```

Check it works:

```bash
python3 -m http.server 8000 --directory skills/accessibility/scripts/fixtures &
playwright-cli open http://localhost:8000/broken.html --config=skills/accessibility/scripts/cli.config.json
skills/accessibility/scripts/axe-scan.sh   # expect 6 violations
playwright-cli close
```

## License

[MIT](LICENSE)
