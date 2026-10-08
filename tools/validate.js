/* Validation script for the Raven Matrix Trainer.
 *
 *   NODE_PATH=$(npm root -g) node tools/validate.js [--sheets DIR] [--random N]
 *
 * 1. builds all catalogue puzzles and checks their structure;
 * 2. rasterises the 8 options of every puzzle and checks that no two options
 *    look (almost) the same;
 * 3. stress-tests every family with N random seeds;
 * 4. optionally writes contact sheets (PNG) for visual review.
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const sheetsDir = opt('--sheets', null);
const randomN = +opt('--random', 20);
const only = opt('--family', null);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1340, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, 'harness.html'));
  if (errors.length) throw new Error(errors.join('\n'));

  // 1 + 2: catalogue
  const report = await page.evaluate(async (only) => {
    const RM = window.RM;
    const raster = (svg) =>
      new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = c.height = 120;
          const x = c.getContext('2d');
          x.fillStyle = '#fff';
          x.fillRect(0, 0, 120, 120);
          x.drawImage(img, 0, 0, 120, 120);
          res(x.getImageData(0, 0, 120, 120).data);
        };
        img.onerror = () => rej(new Error('svg failed to load'));
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      });
    const diff = (a, b) => {
      let n = 0;
      for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 90) n++;
      return n;
    };
    const out = { problems: [], stats: [], time: 0 };
    const t0 = performance.now();
    for (const e of RM.catalog) {
      if (only && e.fam !== only) continue;
      let P;
      try {
        P = RM.puzzle(e.num);
      } catch (err) {
        out.problems.push(`#${e.num} ${e.fam}: build failed: ${err.message}`);
        continue;
      }
      if (P.panels.length !== 8) out.problems.push(`#${e.num}: ${P.panels.length} panels`);
      if (P.options.length !== 8) out.problems.push(`#${e.num}: ${P.options.length} options`);
      if (P.answerIndex < 0 || P.answerIndex > 7) out.problems.push(`#${e.num}: bad answer index`);
      P.flaws.forEach((f, i) => {
        if (i === P.answerIndex && f.length) out.problems.push(`#${e.num}: answer has flaws`);
        if (i !== P.answerIndex && !f.length) out.problems.push(`#${e.num}: option ${i + 1} has no flaw`);
      });
      const imgs = [];
      for (const s of P.options) imgs.push(await raster(s));
      for (const s of P.panels) await raster(s);
      let min = 1e9;
      let pair = null;
      for (let i = 0; i < 8; i++)
        for (let j = i + 1; j < 8; j++) {
          const d = diff(imgs[i], imgs[j]);
          if (d < min) {
            min = d;
            pair = [i + 1, j + 1];
          }
        }
      out.stats.push({ num: e.num, fam: e.fam, min, pair, attempts: P.attempts, diff: P.difficulty });
      if (min < 25) out.problems.push(`#${e.num} ${e.fam}: options ${pair.join(' & ')} differ by only ${min} px`);
    }
    out.time = performance.now() - t0;
    return out;
  }, only);

  // 3: random stress test
  const stress = await page.evaluate(
    ({ n, only }) => {
      const RM = window.RM;
      const res = {};
      for (const f of RM.familyOrder) {
        if (only && f !== only) continue;
        const t0 = performance.now();
        let fails = 0;
        let attempts = 0;
        const msgs = [];
        for (let i = 0; i < n; i++) {
          try {
            const P = RM.build(f, 1000 + i * 7919, i % 4);
            attempts += P.attempts;
          } catch (e) {
            fails++;
            if (msgs.length < 2) msgs.push(e.message);
          }
        }
        res[f] = { fails, avgAttempts: +(attempts / Math.max(1, n - fails)).toFixed(1), ms: +((performance.now() - t0) / n).toFixed(1), msgs };
      }
      return res;
    },
    { n: randomN, only }
  );

  console.log(`Catalogue built + rasterised in ${(report.time / 1000).toFixed(1)} s`);
  const byFam = {};
  report.stats.forEach((s) => {
    byFam[s.fam] = byFam[s.fam] || [];
    byFam[s.fam].push(s.min);
  });
  console.log('\nMinimum pixel difference between two options, per family (catalogue):');
  Object.keys(byFam).forEach((f) => console.log(`  ${f.padEnd(16)} ${byFam[f].join(', ')}`));
  console.log('\nRandom stress test:');
  Object.keys(stress).forEach((f) => {
    const s = stress[f];
    console.log(`  ${f.padEnd(16)} fails ${s.fails}/${randomN}  avg attempts ${s.avgAttempts}  ${s.ms} ms/puzzle ${s.msgs.join(' | ')}`);
  });
  const diffs = {};
  report.stats.forEach((s) => (diffs[s.diff] = (diffs[s.diff] || 0) + 1));
  console.log('\nDifficulty distribution:', JSON.stringify(diffs));
  if (report.problems.length) {
    console.log('\nPROBLEMS:');
    report.problems.forEach((p) => console.log('  ' + p));
  } else console.log('\nNo problems found.');
  if (errors.length) console.log('\nPage errors:\n' + errors.join('\n'));

  // 4: contact sheets
  if (sheetsDir) {
    fs.mkdirSync(sheetsDir, { recursive: true });
    const nums = await page.evaluate((only) => window.RM.catalog.filter((e) => !only || e.fam === only).map((e) => e.num), only);
    for (let i = 0; i < nums.length; i += 6) {
      const chunk = nums.slice(i, i + 6);
      await page.evaluate((chunk) => window.showSheet(chunk.map((n) => window.RM.puzzle(n))), chunk);
      await page.screenshot({ path: path.join(sheetsDir, `sheet-${String(chunk[0]).padStart(3, '0')}.png`), fullPage: true });
    }
    console.log(`\nContact sheets written to ${sheetsDir}`);
  }
  await browser.close();
  process.exit(report.problems.length || errors.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
