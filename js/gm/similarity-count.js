/* Self-reference (grandmaster): every panel shows one figure with four two-valued features (shape, fill, size, inner
 * mark) and k dots in the bottom-right corner. LAYER 1: in every row each feature of the third figure is a boolean
 * function (XOR, AND, OR, NOR ...; a different one per feature) of the same feature in the first two figures. LAYER 2:
 * k = the number of features the figure shares with a REFERENCE figure: the figure to its left (variant 0, first panel
 * of a row compares with the last), to its right (1), above it (2) or the next one in reading order (3). Some dots thus
 * depend on the missing figure itself. Checked: for each feature every boolean function / Latin / constant reading
 * consistent with rows 1-2 predicts the same value (the row 3 input pair has been seen), also for column-wise
 * functions; for the dots, every (reference in {left, right, above, below, previous, next} x feature subset x
 * shared/different) hypothesis consistent with the 8 visible dot counts predicts the same count for the answer. */
(function () {
  'use strict';
  const RM = window.RM;

  const BF = {
    xor: { f: (a, b) => a ^ b, t: (v0, v1) => `${v1} when the first two figures <b>differ</b>, ${v0} when they are alike` },
    xnor: { f: (a, b) => 1 - (a ^ b), t: (v0, v1) => `${v1} when the first two figures are <b>alike</b>, ${v0} when they differ` },
    and: { f: (a, b) => a & b, t: (v0, v1) => `${v1} only when <b>both</b> of the first two are ${v1}, otherwise ${v0}` },
    or: { f: (a, b) => a | b, t: (v0, v1) => `${v1} when <b>at least one</b> of the first two is ${v1}, otherwise ${v0}` },
    nand: { f: (a, b) => 1 - (a & b), t: (v0, v1) => `${v0} only when <b>both</b> of the first two are ${v1}, otherwise ${v1}` },
    nor: { f: (a, b) => 1 - (a | b), t: (v0, v1) => `${v1} only when <b>both</b> of the first two are ${v0}, otherwise ${v0}` },
    andnot: { f: (a, b) => a & (1 - b), t: (v0, v1) => `${v1} only when the 1st is ${v1} and the 2nd is ${v0}, otherwise ${v0}` },
    notand: { f: (a, b) => (1 - a) & b, t: (v0, v1) => `${v1} only when the 1st is ${v0} and the 2nd is ${v1}, otherwise ${v0}` },
  };
  const BN = Object.keys(BF);
  const SHP = ['circle', 'square', 'triangle', 'diamond', 'hexagon'];
  const MARKS = { plus: 'a plus mark', bar: 'a bar mark', ring: 'a small ring' };
  const ATT = ['shape', 'fill', 'size', 'mark'];
  const REFS = [
    (r, c) => [r, (c + 2) % 3],
    (r, c) => [r, (c + 1) % 3],
    (r, c) => [(r + 2) % 3, c],
    (r, c) => [(r + 1) % 3, c],
    (r, c) => [Math.floor((3 * r + c + 8) / 3) % 3, (3 * r + c + 8) % 3],
    (r, c) => [Math.floor((3 * r + c + 1) / 3) % 3, (3 * r + c + 1) % 3],
  ];
  const VREF = [0, 1, 2, 5];
  const popc = (m) => (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1);

  function genAttr(rng, fn) {
    for (let t = 0; t < 120; t++) {
      const rows = [0, 1, 2].map(() => [rng.int(0, 1), rng.int(0, 1)]);
      if (!rows.slice(0, 2).some((p) => p[0] === rows[2][0] && p[1] === rows[2][1])) continue;
      const g = rows.map(([a, b]) => [a, b, fn(a, b)]);
      if (new Set(g.flat()).size < 2) continue;
      let bad = false;
      for (let tt = 0; tt < 16 && !bad; tt++) {
        const f = (a, b) => (tt >> (a * 2 + b)) & 1;
        if ([0, 1].every((c) => f(g[0][c], g[1][c]) === g[2][c]) && f(g[0][2], g[1][2]) !== g[2][2]) bad = true;
      }
      if (bad) continue;
      const m = g.map((r) => r.slice());
      m[2][2] = undefined;
      if (!RM.unique(m, g[2][2], 'categorical', undefined, true)) continue;
      return g;
    }
    return null;
  }

  RM.register({
    id: 'similarity-count',
    name: 'Self-reference',
    difficulty: 8,
    generate(rng, variant) {
      const shp = rng.sample(SHP, 2);
      const mk = rng.pick(Object.keys(MARKS));
      const NAMES = [shp, ['white', 'black'], ['small', 'large'], ['no mark', MARKS[mk]]];
      const fnames = rng.sample(BN, 4);
      const A = fnames.map((fnm) => genAttr(rng, BF[fnm].f));
      RM.need(A.every((x) => x));
      const F = [0, 1, 2].map((r) => [0, 1, 2].map((c) => A.map((g) => g[r][c])));
      const refIdx = VREF[variant];
      const shared = (x, y, mask) => {
        let n = 0;
        for (let j = 0; j < 4; j++) if ((mask >> j) & 1 && x[j] === y[j]) n++;
        return n;
      };
      const hypVal = (h, r, c) => {
        const [r2, c2] = REFS[h.ref](r, c);
        const s = shared(F[r][c], F[r2][c2], h.mask);
        return h.diff ? popc(h.mask) - s : s;
      };
      const K = [0, 1, 2].map((r) => [0, 1, 2].map((c) => hypVal({ ref: refIdx, mask: 15, diff: false }, r, c)));
      RM.need(new Set(K.flat().slice(0, 8)).size >= 3);
      for (let ref = 0; ref < 6; ref++)
        for (let mask = 1; mask < 16; mask++)
          for (let d = 0; d < 2; d++) {
            const h = { ref, mask, diff: !!d };
            let ok = true;
            for (let p = 0; p < 8 && ok; p++) if (hypVal(h, Math.floor(p / 3), p % 3) !== K[Math.floor(p / 3)][p % 3]) ok = false;
            if (ok) RM.need(hypVal(h, 2, 2) === K[2][2]);
          }

      const spec = (f, k) => ({ a: f.slice(), k });
      const panels = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (r < 2 || c < 2) panels.push(spec(F[r][c], K[r][c]));
      const ansF = F[2][2];
      const answer = spec(ansF, K[2][2]);
      const [rr, rc] = REFS[refIdx](2, 2);
      const refF = F[rr][rc];
      const altIdx = [1, 0, 3, 4][variant];
      const [ar, ac] = REFS[altIdx](2, 2);
      const altShared = shared(ansF, F[ar][ac], 15);
      const altName = ['the figure to its right', 'the figure to its left', 'the figure below it (wrapping around)', 'the previous figure in reading order'][variant];
      const refName = ['the figure to its left (the middle one of row 3)', 'the figure to its right, wrapping around (the first one of row 3)', 'the figure above it (the one in row 2, column 3)', 'the next figure in reading order, wrapping around (the first one of the matrix)'][variant];
      const K2 = K[2][2];
      const val = (f, j) => NAMES[j][f[j]];

      const cand = new Map();
      const addC = (mask, k, tag) => {
        if (k < 0 || k > 4) return;
        const f = ansF.map((v, j) => ((mask >> j) & 1 ? 1 - v : v));
        if (mask === 0 && k === K2) return;
        const key = mask + ',' + k;
        if (!cand.has(key)) cand.set(key, { mask, k, f, tag });
      };
      for (let k = 0; k <= 4; k++) addC(0, k, 't1');
      for (let mask = 1; mask < 16; mask++) {
        const sh = shared(ansF.map((v, j) => ((mask >> j) & 1 ? 1 - v : v)), refF, 15);
        addC(mask, sh, 'self' + popc(mask));
        addC(mask, K2, 'same' + popc(mask));
      }
      const all = [...cand.values()];
      const diffK = 4 - K2;
      const chosen = [];
      const take = (arr, n) => {
        for (const x of rng.shuffle(arr)) if (n > 0 && !chosen.includes(x)) (chosen.push(x), n--);
      };
      const t1 = all.filter((x) => x.mask === 0);
      take(t1.filter((x) => x.k === diffK || x.k === altShared), 2);
      take(t1, 2 - chosen.length > 0 ? 2 - chosen.length : 0);
      take(all.filter((x) => x.tag === 'self1'), 2);
      take(all.filter((x) => x.tag === 'same1'), 2);
      take(all.filter((x) => x.mask !== 0 && popc(x.mask) === 2), 7 - chosen.length);
      take(all, 7 - chosen.length);
      RM.need(chosen.length === 7);

      const flawsOf = (x) => {
        const fl = [];
        for (let j = 0; j < 4; j++)
          if ((x.mask >> j) & 1) fl.push(`the ${ATT[j]} is wrong: the ${ATT[j]} rule gives <b>${val(ansF, j)}</b>, not ${val(x.f, j)}`);
        const sh = shared(x.f, refF, 15);
        if (x.mask === 0) {
          let extra = '';
          if (x.k === diffK) extra = ' (that counts the features that DIFFER)';
          else if (x.k === altShared) extra = ' (that is what you get by comparing with ${altName} instead)';
          fl.push(`it shows ${x.k} dot${x.k === 1 ? '' : 's'}, but this figure shares exactly ${K2} feature${K2 === 1 ? '' : 's'} with ${refName}${extra}`);
        } else if (x.k !== sh) {
          fl.push(`its ${x.k} dot${x.k === 1 ? '' : 's'} do not even fit this figure, which shares ${sh} feature${sh === 1 ? '' : 's'} with ${refName}`);
        } else fl.push('its dots are consistent with this figure, but the figure itself is wrong');
        return fl;
      };
      const options = [{ spec: answer, flaws: [] }].concat(chosen.map((x) => ({ spec: spec(x.f, x.k), flaws: flawsOf(x) })));

      const fdesc = (f) => `${val(f, 0)}, ${val(f, 1)}, ${val(f, 2)}, ${val(f, 3)}`;
      const rules = [
        { k: 'Figures', t: `each of the four features of the 3rd figure of a row is computed from the same feature of the first two figures, with its own rule: ${[0, 1, 2, 3].map((j) => `<b>${ATT[j]}</b> — ${BF[fnames[j]].t(NAMES[j][0], NAMES[j][1])}`).join('; ')}. (Rows 1 and 2 show these rules at work; row 3 only uses input combinations that already occurred.)` },
        { k: 'Dots', t: `the dots count the <b>features a figure shares</b> with a reference figure (shape, fill, size, mark: 0 to 4). The reference is ${['the figure to its left; the first figure of a row is compared with the last figure of the same row', 'the figure to its right; the last figure of a row is compared with the first figure of the same row', 'the figure above it; the figure in row 1 is compared with the one in row 3 of the same column', 'the next figure in reading order (left to right, row by row); the very last figure is compared with the very first'][variant]}. So some dots depend on the missing figure itself.` },
        { k: 'Row 3', t: `the missing figure is: ${[0, 1, 2, 3].map((j) => `${ATT[j]} = ${val(ansF, j)}`).join(', ')}, that is <b>${fdesc(ansF)}</b>.` },
        { k: 'Answer', t: `its reference is ${refName}: ${[0, 1, 2, 3].map((j) => `${ATT[j]} ${val(ansF, j)} / ${val(refF, j)} (${ansF[j] === refF[j] ? 'same' : 'different'})`).join('; ')}. It shares <b>${K2}</b> feature${K2 === 1 ? '' : 's'}, so the answer has <b>${K2} dot${K2 === 1 ? '' : 's'}</b>.` },
      ];
      const DX = [80, 90, 80, 90];
      const DY = [90, 90, 80, 80];
      return {
        difficulty: 8,
        hint: 'First work out the figures row by row, one feature at a time; then see what the dots count.',
        panels,
        answer,
        options,
        rules,
        key: (s) => JSON.stringify([s.a, s.k]),
        render(s) {
          const pic = new RM.Pic();
          const r = s.a[2] ? 26 : 15;
          const black = s.a[1] === 1;
          RM.shape(pic, shp[s.a[0]], 46, 46, r, { fill: black ? 'black' : 'white', sw: 2.2 });
          if (s.a[3]) {
            const m = r * 0.55;
            const col = black ? '#ffffff' : RM.INK;
            const o = { sw: 2.8, color: col };
            if (mk === 'plus') (RM.line(pic, 46 - m, 46, 46 + m, 46, o), RM.line(pic, 46, 46 - m, 46, 46 + m, o));
            else if (mk === 'bar') RM.line(pic, 46 - m, 46, 46 + m, 46, { sw: 4, color: col });
            else RM.circle(pic, 46, 46, m * 0.7, { fill: black ? 'black' : 'white', stroke: col, sw: 2.6 });
          }
          for (let i = 0; i < s.k; i++) RM.circle(pic, DX[i], DY[i], 3.2, { fill: 'black' });
          return pic.svg();
        },
      };
    },
  });
})();
