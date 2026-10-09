/* UI smoke test: clicks through every view and saves screenshots.
 *   NODE_PATH=$(npm root -g) node tools/ui-smoke.js OUTDIR */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  const out = process.argv[2] || 'ui-shots';
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const errors = [];
  const shot = async (page, name) => page.screenshot({ path: path.join(out, name + '.png'), fullPage: true });
  for (const vp of [{ width: 1280, height: 900, tag: 'desktop' }, { width: 390, height: 844, tag: 'mobile' }]) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    page.on('pageerror', (e) => errors.push(vp.tag + ': ' + e));
    page.on('console', (m) => m.type() === 'error' && errors.push(vp.tag + ' console: ' + m.text()));
    const url = 'file://' + path.resolve(__dirname, '..', 'index.html');
    const t0 = Date.now();
    await page.goto(url);
    await page.waitForSelector('.tile');
    console.log(`${vp.tag}: catalogue rendered in ${Date.now() - t0} ms`);
    await shot(page, vp.tag + '-1-catalogue');

    // practice: wrong answer then solution
    await page.goto(url + '#/p/57');
    await page.waitForSelector('.opt');
    await page.click('[data-a="hint"]');
    const ans = await page.evaluate(() => window.RM.puzzle(57).answerIndex);
    const wrong = (ans + 1) % 8;
    await page.click(`.opt[data-i="${wrong}"]`);
    await shot(page, vp.tag + '-2-puzzle-selected');
    await page.click('[data-a="check"]');
    await page.waitForSelector('.verdict');
    await shot(page, vp.tag + '-3-puzzle-solved');
    // keyboard: next puzzle, answer correctly
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => location.hash === '#/p/58');
    const ans58 = await page.evaluate(() => window.RM.puzzle(58).answerIndex);
    await page.keyboard.press(String(ans58 + 1));
    await page.keyboard.press('Enter');
    await page.waitForSelector('.verdict.ok');

    if (vp.tag === 'desktop') {
      // timed test
      await page.goto(url + '#/test');
      await page.waitForSelector('#start');
      await page.click('.chip[data-k="n"][data-v="10"]');
      await page.click('#start');
      await page.waitForSelector('.opt');
      await shot(page, vp.tag + '-4-test-question');
      for (let i = 0; i < 10; i++) {
        await page.click(`.opt[data-i="${i % 8}"]`);
        await page.click('[data-a="next"]');
      }
      await page.waitForSelector('.big-score');
      await shot(page, vp.tag + '-5-test-results');
      await page.click('[data-r="0"]');
      await page.waitForSelector('.verdict');
      await page.click('[data-a="back"]');
      await page.waitForSelector('.big-score');

      // endless
      await page.goto(url + '#/endless');
      await page.waitForSelector('.opt');
      await page.selectOption('#famsel', 'billiards');
      await page.waitForSelector('.note');
      await page.click('[data-a="reveal"]');
      await page.waitForSelector('.verdict');
      await shot(page, vp.tag + '-6-endless');

      // guide
      await page.goto(url + '#/guide');
      await page.waitForSelector('.fam-list');
      await shot(page, vp.tag + '-7-guide');

      // catalogue after progress
      await page.goto(url + '#/catalogue');
      await page.waitForSelector('.tile.s-ok');
      await shot(page, vp.tag + '-8-catalogue-progress');
    }
    await page.close();
  }
  await browser.close();
  if (errors.length) {
    console.log('ERRORS:\n' + errors.join('\n'));
    process.exit(1);
  }
  console.log('UI smoke test passed.');
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
