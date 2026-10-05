#!/usr/bin/env node
/**
 * Runs axe-core against rendered pages in headless Chromium and prints the
 * violations in a compact form an agent can act on.
 *
 * Usage: node axe-scan.mjs <url-or-html-file>... [options]
 *
 * Exit codes: 0 no violations, 1 violations found, 2 usage or runtime error.
 */
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const WCAG_22_AA_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const SNIPPET_MAX_LENGTH = 200;

const USAGE = `Usage: node axe-scan.mjs <url-or-html-file>... [options]

Options:
  --tags <list>        Comma-separated axe tags (default: ${WCAG_22_AA_TAGS.join(",")})
  --best-practices     Also run axe "best-practice" rules
  --include <selector> Only scan inside this CSS selector
  --exclude <selector> Skip this CSS selector (repeatable)
  --wait-for <selector> Wait for this selector before scanning
  --viewport <WxH>     Viewport size (default: 1280x800)
  --json               Print raw axe results as JSON
  -h, --help           Show this help`;

/**
 * Resolves a dependency from the project being tested first, so its pinned
 * Playwright and browsers are reused, then from this skill's own install.
 */
function loadDependency(name) {
  const searchRoots = [resolve(process.cwd(), "package.json"), import.meta.url];
  for (const root of searchRoots) {
    try {
      return createRequire(root)(name);
    } catch {}
  }
  const skillScriptsDir = new URL(".", import.meta.url).pathname;
  console.error(
    `Missing dependency "${name}". Install once with:\n` +
      `  npm install --prefix "${skillScriptsDir}"\n` +
      `  npx --prefix "${skillScriptsDir}" playwright install chromium`,
  );
  process.exit(2);
}

function toUrl(target) {
  if (/^[a-z]+:\/\//i.test(target)) return target;
  const filePath = resolve(target);
  if (!existsSync(filePath)) {
    console.error(`Not a URL and no such file: ${target}`);
    process.exit(2);
  }
  return pathToFileURL(filePath).href;
}

function truncate(text, maxLength) {
  const singleLine = text.replace(/\s+/g, " ").trim();
  return singleLine.length > maxLength ? `${singleLine.slice(0, maxLength)}…` : singleLine;
}

function formatViolations(url, results) {
  const lines = [`\n## ${url}`];
  if (results.violations.length === 0) {
    lines.push("No violations.");
  }
  for (const violation of results.violations) {
    const criteria = violation.tags.filter((tag) => /^wcag\d{3,}$/.test(tag)).join(", ");
    lines.push(
      `\n[${violation.impact}] ${violation.id}: ${violation.help}` +
        (criteria ? ` (${criteria})` : ""),
      `  ${violation.helpUrl}`,
    );
    for (const node of violation.nodes) {
      lines.push(`  - target: ${node.target.join(" >>> ")}`);
      lines.push(`    html: ${truncate(node.html, SNIPPET_MAX_LENGTH)}`);
      if (node.failureSummary) {
        lines.push(`    fix: ${truncate(node.failureSummary, SNIPPET_MAX_LENGTH * 2)}`);
      }
    }
  }
  if (results.incomplete.length > 0) {
    lines.push("\nNeeds manual review (axe could not decide):");
    for (const item of results.incomplete) {
      const targets = item.nodes.map((node) => node.target.join(" >>> "));
      lines.push(`  - ${item.id}: ${item.help} [${targets.slice(0, 5).join(", ")}${targets.length > 5 ? ", …" : ""}]`);
    }
  }
  return lines.join("\n");
}

const { values: options, positionals: targets } = parseArgs({
  allowPositionals: true,
  options: {
    tags: { type: "string" },
    "best-practices": { type: "boolean", default: false },
    include: { type: "string" },
    exclude: { type: "string", multiple: true, default: [] },
    "wait-for": { type: "string" },
    viewport: { type: "string", default: "1280x800" },
    json: { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (options.help || targets.length === 0) {
  console.log(USAGE);
  process.exit(options.help ? 0 : 2);
}

const [viewportWidth, viewportHeight] = options.viewport.split("x").map(Number);
if (!viewportWidth || !viewportHeight) {
  console.error(`Invalid --viewport "${options.viewport}"; expected WxH, e.g. 1280x800`);
  process.exit(2);
}

const tags = options.tags ? options.tags.split(",").map((tag) => tag.trim()) : [...WCAG_22_AA_TAGS];
if (options["best-practices"]) tags.push("best-practice");

const { chromium } = loadDependency("playwright");
const axeSource = loadDependency("axe-core").source;

const browser = await chromium.launch();
let totalViolations = 0;
let axeVersion = "";
const rawResults = [];
try {
  const page = await browser.newPage({ viewport: { width: viewportWidth, height: viewportHeight } });
  for (const target of targets) {
    const url = toUrl(target);
    await page.goto(url, { waitUntil: "load" });
    if (options["wait-for"]) await page.waitForSelector(options["wait-for"]);
    await page.addScriptTag({ content: axeSource });
    const context = {
      ...(options.include ? { include: [options.include] } : {}),
      ...(options.exclude.length ? { exclude: options.exclude.map((selector) => [selector]) } : {}),
    };
    const results = await page.evaluate(
      ([runContext, runTags]) =>
        window.axe.run(Object.keys(runContext).length ? runContext : document, {
          runOnly: { type: "tag", values: runTags },
        }),
      [context, tags],
    );
    totalViolations += results.violations.length;
    axeVersion = results.testEngine.version;
    if (options.json) {
      rawResults.push({ url, ...results });
    } else {
      console.log(formatViolations(url, results));
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 2;
} finally {
  await browser.close();
}

if (options.json) console.log(JSON.stringify(rawResults, null, 2));
if (process.exitCode !== 2) {
  if (!options.json) console.log(`\naxe-core ${axeVersion} | tags: ${tags.join(",")} | violations: ${totalViolations}`);
  process.exitCode = totalViolations > 0 ? 1 : 0;
}
