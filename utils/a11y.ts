import AxeBuilder from '@axe-core/playwright';
import { Page, TestInfo, expect } from '@playwright/test';

const BLOCKING_IMPACTS = ['critical', 'serious'];

/** Runs axe (WCAG 2.x A/AA) and fails on critical/serious violations; the full result is attached for triage. */
export async function expectNoSeriousA11yViolations(page: Page, testInfo: TestInfo, options: { include?: string; exclude?: string[] } = {}) {
  let builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
  if (options.include) builder = builder.include(options.include);
  for (const selector of options.exclude ?? []) builder = builder.exclude(selector);

  const { violations } = await builder.analyze();
  await testInfo.attach('axe-violations.json', { body: JSON.stringify(violations, null, 2), contentType: 'application/json' });

  const blocking = violations
    .filter((v) => BLOCKING_IMPACTS.includes(v.impact ?? ''))
    .map((v) => `${v.impact} ${v.id}: ${v.help} (${v.nodes.length}x) e.g. ${v.nodes[0]?.target.join(' ')} → ${v.nodes[0]?.html.replace(/\s+/g, ' ').slice(0, 160)}`);
  expect(blocking, 'critical/serious axe violations').toEqual([]);
}
