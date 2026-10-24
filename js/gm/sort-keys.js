/* Sort keys (grandmaster): every row shows the same four figures in all three panels. A figure has a size (the ring
 * around it, 4 levels), a number of sides (3–6, polygon inscribed in the ring) and a darkness (4 levels). Each panel
 * lines the four figures up from left to right SORTED by one key — size, number of sides or darkness — always in the
 * same direction (ascending or descending, fixed for the whole puzzle). The key used follows a Latin square over the
 * 3×3 grid. In every row the figures are chosen so that all six sort orders (3 keys × 2 directions) are different and
 * far apart, so each visible panel identifies its key and direction without doubt; the Latin square of keys is checked
 * with needUnique. Distractors: other keys, wrong direction, swapped neighbours, a figure that does not belong to the row. */
(function () {
  'use strict';
  const RM = window.RM;

  const ZR = [6, 8, 10, 12];
  const DK = ['#ffffff', '#d0d4da', '#7f8795', '#1f2937'];
  const DKN = ['white', 'light grey', 'dark grey', 'black'];
  const KN = ['size', 'number of sides', 'darkness'];
  const XS = [16, 39, 61, 84];
  const ORD = ['1st', '2nd', '3rd', '4th'];

  RM.register({
    id: 'sort-keys',
    name: 'Sort keys',
    difficulty: 7,
    generate(rng, variant) {
      const dirF = variant % 2 === 0 ? (rng.chance(0.5) ? 1 : -1) : rng.chance(0.5) ? 1 : -1;
      const dirWord = (d) => (d > 0 ? 'ascending' : 'descending');
      const KG = RM.latinGrid(rng, rng.shuffle([0, 1, 2]));
      RM.needUnique(KG, KG[2][2], 'categorical');

      const ord = (figs, k, d) => RM.range(4).sort((a, b) => d * (figs[a][k] - figs[b][k]));
      const ham = (a, b) => a.filter((v, i) => v !== b[i]).length;
      const makeRow = () => {
        for (let t = 0; t < 300; t++) {
          const pz = rng.shuffle([0, 1, 2, 3]);
          const pn = rng.shuffle([0, 1, 2, 3]);
          const pd = rng.shuffle([0, 1, 2, 3]);
          const figs = RM.range(4).map((i) => [pz[i], pn[i], pd[i]]);
          const os = [];
          for (let k = 0; k < 3; k++) for (const d of [1, -1]) os.push(ord(figs, k, d));
          let ok = true;
          for (let i = 0; i < 6 && ok; i++) for (let j = i + 1; j < 6; j++) if (ham(os[i], os[j]) < 3) ok = false;
          if (ok) return figs;
        }
        throw RM.RETRY;
      };
      const ROWS = [makeRow(), makeRow(), makeRow()];
      RM.need(new Set(ROWS.map((f) => f.map((x) => x.join('')).sort().join('/'))).size === 3);
      const panel = (r, k, d) => ord(ROWS[r], k, d).map((i) => ROWS[r][i]);
      const K = KG[2][2];
      const ans = panel(2, K, dirF);

      /* ---------------------------------------------------------- distractors */
      const key = (figs) => figs.map((f) => f.join('')).join('|');
      const kCol = (k) => (KG[2][0] === k ? 1 : 2);
      const cands = [];
      const add = (figs, flaws, tier) => cands.push({ figs, flaws, tier });
      [0, 1, 2].forEach((k) => {
        if (k === K) return;
        add(panel(2, k, dirF), [`sorted by ${KN[k]}: this is the arrangement of column ${kCol(k)} of this row; each key is used once per row, so column 3 must be sorted by ${KN[K]}`], 1);
        add(panel(2, k, -dirF), [`sorted by ${KN[k]} (the key of column ${kCol(k)}) and in the wrong direction; column 3 must be sorted by ${KN[K]}, ${dirWord(dirF)}`], 3);
      });
      add(panel(2, K, -dirF), [`sorted by ${KN[K]} but ${dirWord(-dirF)}; every panel of the puzzle is sorted ${dirWord(dirF)}`], 1);
      for (let p = 0; p < 3; p++) {
        const f = ans.slice();
        [f[p], f[p + 1]] = [f[p + 1], f[p]];
        add(f, [`the figures at places ${p + 1} and ${p + 2} are swapped: sorted by ${KN[K]} (${dirWord(dirF)}) they must come the other way round`], 2);
      }
      const attrTxt = (a, v) => (a === 0 ? `size ${v + 1} (of 4)` : a === 1 ? `${v + 3} sides` : DKN[v]);
      for (let t = 0; t < 8; t++) {
        const a = rng.pick([0, 1, 2].filter((x) => x !== K));
        const p = rng.int(0, 3);
        const old = ans[p][a];
        const opts = RM.range(4).filter((v) => Math.abs(v - old) >= 2);
        const v = rng.pick(opts);
        const f = ans.map((x) => x.slice());
        f[p][a] = v;
        add(f, [`the ${ORD[p]} figure is not one of this row's figures: its ${a === 0 ? 'size' : a === 1 ? 'number of sides' : 'darkness'} should be ${attrTxt(a, old)}, here it is ${attrTxt(a, v)}`], 2);
      }
      const seen = new Set([key(ans)]);
      const by = { 1: [], 2: [], 3: [] };
      rng.shuffle(cands).forEach((c) => {
        const k = key(c.figs);
        if (seen.has(k)) return;
        seen.add(k);
        by[c.tier].push(c);
      });
      const swaps = by[2].filter((c) => c.flaws[0].indexOf('swapped') >= 0);
      const alter = by[2].filter((c) => c.flaws[0].indexOf('not one of') >= 0);
      const chosen = by[1].slice(0, 3).concat(swaps.slice(0, 2), alter.slice(0, 2));
      const rest = by[1].slice(3).concat(by[3], swaps.slice(2), alter.slice(2));
      while (chosen.length < 7 && rest.length) chosen.push(rest.shift());
      RM.need(chosen.length === 7 && by[1].length >= 2);

      /* ---------------------------------------------------------- drawing */
      const render = (figs) => {
        const pic = new RM.Pic();
        figs.forEach(([z, n, d], i) => {
          const R = ZR[z];
          const x = XS[i];
          RM.circle(pic, x, 50, R, { stroke: RM.GRAY, sw: 1.7 });
          const sides = n + 3;
          const a0 = sides === 4 ? -45 : -90;
          const pts = RM.range(sides).map((j) => {
            const a = ((a0 + (360 * j) / sides) * Math.PI) / 180;
            return [x + R * Math.cos(a), 50 + R * Math.sin(a)];
          });
          RM.polygon(pic, pts, { fill: DK[d], sw: 1.9 });
        });
        return pic.svg();
      };

      /* ---------------------------------------------------------- correction */
      const desc = (f, k) => {
        const parts = [`${f[1] + 3} sides`, `size ${f[0] + 1}`, DKN[f[2]]];
        return parts.map((s, i) => (i === (k === 0 ? 1 : k === 1 ? 0 : 2) ? `<b>${s}</b>` : s)).join(', ');
      };
      const keyRows = KG.map((row, r) => `row ${r + 1}: ${row.map((k, c) => (r === 2 && c === 2 ? '?' : KN[k])).join(', ')}`).join('; ');
      const rules = [
        {
          k: 'The figures',
          t: `each row shows the <b>same four figures</b> in its three panels; only their order changes. A figure has a <b>size</b> (the circle around it: 1 = smallest … 4 = largest), a <b>number of sides</b> (3, 4, 5 or 6) and a <b>darkness</b> (white, light grey, dark grey, black).`,
        },
        {
          k: 'Sorting',
          t: `in every panel the four figures are lined up from left to right sorted by <b>one key</b> — size, number of sides or darkness — always <b>${dirWord(dirF)}</b> (${dirF > 0 ? 'smallest, fewest sides, lightest first' : 'largest, most sides, darkest first'}). In each row the six possible orders are different, so each panel shows its key without doubt: ${keyRows}.`,
        },
        {
          k: 'Keys',
          t: `the keys form a Latin square: each key is used once in every row and once in every column. Row 3 already used ${KN[KG[2][0]]} (column 1) and ${KN[KG[2][1]]} (column 2), so the last panel is sorted by <b>${KN[K]}</b>.`,
        },
        {
          k: 'Answer',
          t: `row 3's figures sorted by ${KN[K]}, ${dirWord(dirF)}, from left to right: ${ans.map((f, i) => `${ORD[i]}: ${desc(f, K)}`).join('; ')}.`,
        },
      ];

      const panels = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (r < 2 || c < 2) panels.push(panel(r, KG[r][c], dirF));
      return {
        difficulty: 7,
        hint: 'the same four figures in every panel of a row — find what each panel is sorted by, and how the sorting key changes.',
        panels,
        answer: ans,
        options: [{ spec: ans, flaws: [] }].concat(chosen.map((c) => ({ spec: c.figs, flaws: c.flaws }))),
        render,
        key,
        rules,
      };
    },
  });
})();
