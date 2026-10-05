/**
 * playwright-cli run-code script: runs axe-core against the page currently
 * open in the session and returns a compact violation report. Normally run
 * through axe-scan.sh, which passes the path of a global axe-core install.
 *
 * axe-core comes from options.axePath when that file loads, otherwise from
 * jsDelivr at the pinned version. A strict Content-Security-Policy blocks the
 * file route unless the browser was opened with cli.config.json (bypassCSP);
 * the CDN route is unaffected.
 *
 * Options are read from window.axeScanOptions, set beforehand with
 *   playwright-cli eval "window.axeScanOptions = { include: 'main', exclude: ['#ads'], bestPractices: true }"
 * Supported keys: tags (string[]), bestPractices (boolean), include (selector),
 * exclude (selector[]), json (boolean, return raw axe results), axePath (file).
 * They last until the next navigation.
 *
 * Throws when violations are found, so the command exits non-zero.
 */
async page => {
  const AXE_VERSION = '4.13.0';
  const WCAG_22_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
  const SNIPPET_MAX_LENGTH = 200;

  const options = (await page.evaluate(() => window.axeScanOptions)) ?? {};

  let axeSource = 'already loaded';
  const isAxeLoaded = () => page.evaluate(() => typeof window.axe?.run === 'function');
  if (!(await isAxeLoaded()) && options.axePath) {
    try {
      await page.addScriptTag({ path: options.axePath });
      axeSource = options.axePath;
    } catch {}
  }
  if (!(await isAxeLoaded())) {
    const cdnUrl = `https://cdn.jsdelivr.net/npm/axe-core@${AXE_VERSION}/axe.min.js`;
    const response = await fetch(cdnUrl);
    if (!response.ok) throw new Error(`Could not download axe-core ${AXE_VERSION}: HTTP ${response.status}`);
    await page.evaluate(await response.text());
    axeSource = cdnUrl;
  }

  const tags = [...(options.tags ?? WCAG_22_AA_TAGS), ...(options.bestPractices ? ['best-practice'] : [])];
  const context = {
    ...(options.include ? { include: [options.include] } : {}),
    ...(options.exclude?.length ? { exclude: options.exclude.map(selector => [selector]) } : {}),
  };

  const results = await page.evaluate(
    ([runContext, runTags]) =>
      window.axe.run(Object.keys(runContext).length ? runContext : document, {
        runOnly: { type: 'tag', values: runTags },
      }),
    [context, tags],
  );

  if (options.json) return results;

  const truncate = (text, maxLength) => {
    const singleLine = text.replace(/\s+/g, ' ').trim();
    return singleLine.length > maxLength ? `${singleLine.slice(0, maxLength)}…` : singleLine;
  };
  const lines = [`## ${page.url()}`];
  for (const violation of results.violations) {
    const criteria = violation.tags.filter(tag => /^wcag\d{3,}$/.test(tag)).join(', ');
    lines.push(
      '',
      `[${violation.impact}] ${violation.id}: ${violation.help}${criteria ? ` (${criteria})` : ''}`,
      `  ${violation.helpUrl}`,
    );
    for (const node of violation.nodes) {
      lines.push(`  - target: ${node.target.join(' >>> ')}`);
      lines.push(`    html: ${truncate(node.html, SNIPPET_MAX_LENGTH)}`);
      if (node.failureSummary) lines.push(`    fix: ${truncate(node.failureSummary, SNIPPET_MAX_LENGTH * 2)}`);
    }
  }
  if (results.incomplete.length > 0) {
    lines.push('', 'Needs manual review (axe could not decide):');
    for (const item of results.incomplete) {
      const targets = item.nodes.map(node => node.target.join(' >>> '));
      lines.push(`  - ${item.id}: ${item.help} [${targets.slice(0, 5).join(', ')}${targets.length > 5 ? ', …' : ''}]`);
    }
  }
  lines.push('', `axe-core ${results.testEngine.version} from ${axeSource} | tags: ${tags.join(',')} | violations: ${results.violations.length}`);

  const report = lines.join('\n');
  if (results.violations.length > 0) throw new Error(report);
  return report;
}
