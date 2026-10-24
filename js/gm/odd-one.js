/* Odd one out (grandmaster): every panel shows four figures in a 2x2 block, three identical and ONE odd figure that
 * differs from them in exactly one of three two-valued features (shape, fill, size). Three layers: (1) the odd figure
 * walks around the block by a fixed number of quadrants per column (variant 0: one clockwise, 1: one anticlockwise,
 * 2: two = the opposite corner, 3: either one way or the other), each row starting in its own quadrant; (2) the feature
 * in which it differs follows a Latin square; (3) the three identical figures follow, feature by feature, a boolean row
 * rule (XOR, AND, NOR, copy the 1st / the 2nd ...) of the first two panels. Checked: position grid (mod 4) and
 * feature Latin square have a unique listed reading; for every feature of the common figure every boolean function
 * consistent with rows 1-2 (row-wise and column-wise) predicts the same value, because row 3's input pair has been seen. */
(function () {
  'use strict';
  const RM = window.RM;

  const BF = {
    xor: { f: (a, b) => a ^ b, t: (v0, v1) => `${v1} when the first two panels <b>differ</b>, ${v0} when they are alike` },
    xnor: { f: (a, b) => 1 - (a ^ b), t: (v0, v1) => `${v1} when the first two panels are <b>alike</b>, ${v0} when they differ` },
    and: { f: (a, b) => a & b, t: (v0, v1) => `${v1} only when <b>both</b> of the first two panels are ${v1}, otherwise ${v0}` },
    or: { f: (a, b) => a | b, t: (v0, v1) => `${v1} when <b>at least one</b> of the first two is ${v1}, otherwise ${v0}` },
    nor: { f: (a, b) => 1 - (a | b), t: (v0, v1) => `${v1} only when <b>both</b> of the first two panels are ${v0}, otherwise ${v0}` },
    first: { f: (a) => a, t: () => 'the <b>same as in the 1st panel</b>' },
    second: { f: (a, b) => b, t: () => 'the <b>same as in the 2nd panel</b>' },
    andnot: { f: (a, b) => a & (1 - b), t: (v0, v1) => `${v1} only when the 1st is ${v1} and the 2nd is ${v0}, otherwise ${v0}` },
  };
  const BN = Object.keys(BF);
  const SHP = ['circle', 'square', 'triangle', 'diamond', 'hexagon'];
  const ATT = ['shape', 'fill', 'size'];
  const QN = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
  const QX = [27, 73, 73, 27];
  const QY = [27, 27, 73, 73];

  function genAttr(rng, fn) {
    for (let t = 0; t < 150; t++) {
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
    id: 'odd-one',
    name: 'Odd one out',
    difficulty: 7,
    generate(rng, variant) {
      const shp = rng.sample(SHP, 2);
      const NAMES = [shp, ['white', 'black'], ['small', 'large']];
      const step = variant === 0 ? 1 : variant === 1 ? 3 : variant === 2 ? 2 : rng.pick([1, 3]);
      const q0 = rng.shuffle([0, 1, 2, 3]).slice(0, 3);
      const P = RM.grid3((r, c) => (q0[r] + step * c) % 4);
      RM.needUnique(P, P[2][2], 'numeric', 4);
      const L = RM.latinGrid(rng, [0, 1, 2]);
      RM.needUnique(L, L[2][2], 'categorical');
      const fnames = rng.sample(BN, 3);
      const C = fnames.map((fnm) => genAttr(rng, BF[fnm].f));
      RM.need(C.every((x) => x));

      const cf = (r, c) => C.map((g) => g[r][c]);
      const figs = (comm, odd, jflip) => {
        const arr = [0, 1, 2, 3].map(() => comm.slice());
        arr[odd] = comm.map((v, j) => (jflip.includes(j) ? 1 - v : v));
        return arr;
      };
      const panel = (r, c) => ({ f: figs(cf(r, c), P[r][c], [L[r][c]]) });
      const panels = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (r < 2 || c < 2) panels.push(panel(r, c));
      const comm = cf(2, 2);
      const qA = P[2][2];
      const jA = L[2][2];
      const answer = { f: figs(comm, qA, [jA]) };
      const key = (s) => JSON.stringify(s.f);
      const ak = key(answer);
      const val = (j, v) => NAMES[j][v];
      const desc = (t) => `${val(2, t[2])} ${val(1, t[1])} ${val(0, t[0])}`;

      const cand = [];
      const add = (grp, f, flaws) => {
        const sp = { f };
        if (key(sp) !== ak) cand.push({ grp, spec: sp, flaws });
      };
      for (let q = 0; q < 4; q++) {
        if (q !== qA) add('a', figs(comm, q, [jA]), [`the odd figure is in the ${QN[q]} corner, but in this panel it must be in the <b>${QN[qA]}</b> corner (${QN[P[2][0]]} then ${QN[P[2][1]]} → ${QN[qA]})`]);
        for (let j = 0; j < 3; j++) {
          if (j === jA) continue;
          const fl = [`the odd figure differs in its ${ATT[j]}, but in this panel it must differ in its <b>${ATT[jA]}</b> (Latin square of the features)`];
          if (q === qA) add('b', figs(comm, q, [j]), fl);
          else add('c', figs(comm, q, [j]), [`the odd figure is in the ${QN[q]} corner instead of the ${QN[qA]} corner`, fl[0]]);
        }
        if (q !== qA) {
          for (let j = 0; j < 3; j++) {
            const f = figs(comm, qA, [jA]);
            f[q] = comm.map((v, i) => (i === j ? 1 - v : v));
            add('e', f, [`two figures differ from the rest (${QN[qA]} and ${QN[q]}); there must be exactly one odd figure`]);
          }
        }
      }
      for (let j = 0; j < 3; j++) {
        if (j === jA) continue;
        add('f', figs(comm, qA, [jA, j]), [`the odd figure differs in two features (${ATT[jA]} and ${ATT[j]}); it must differ in exactly one`]);
      }
      for (let i = 0; i < 3; i++) {
        const c2 = comm.map((v, j) => (j === i ? 1 - v : v));
        add('d', figs(c2, qA, [jA]), [`the ${ATT[i]} of the three identical figures should be <b>${val(i, comm[i])}</b>, not ${val(i, c2[i])}`]);
      }
      const seen = new Set();
      const uniq = cand.filter((x) => (seen.has(key(x.spec)) ? false : seen.add(key(x.spec))));
      const chosen = [];
      const take = (g, n) => {
        for (const x of rng.shuffle(uniq.filter((y) => y.grp === g))) if (n > 0 && !chosen.includes(x)) (chosen.push(x), n--);
      };
      take('a', 2);
      take('b', 1);
      take('c', 1);
      take('d', 1);
      take('e', 1);
      take('f', 1);
      for (const x of rng.shuffle(uniq)) if (chosen.length < 7 && !chosen.includes(x)) chosen.push(x);
      RM.need(chosen.length === 7);
      const options = [{ spec: answer, flaws: [] }].concat(chosen.map((x) => ({ spec: x.spec, flaws: x.flaws })));

      const stepTxt = ['one quadrant <b>clockwise</b>', '', 'two quadrants (to the <b>opposite</b> corner)', ''];
      const mv = step === 1 ? stepTxt[0] : step === 3 ? 'one quadrant <b>anticlockwise</b>' : stepTxt[2];
      const prow = (r) => [0, 1, 2].map((c) => (r < 2 || c < 2 ? QN[P[r][c]] : '?')).join(' → ');
      const lrow = (r) => [0, 1, 2].map((c) => (r < 2 || c < 2 ? ATT[L[r][c]] : '?')).join(', ');
      const rules = [
        { k: 'The odd one', t: 'in every panel three figures are identical and <b>one</b> differs from them in exactly <b>one</b> feature: shape, fill or size.' },
        { k: 'Position', t: `from panel to panel the odd figure moves ${mv}; each row starts in its own corner. Row 1: ${prow(0)}; row 2: ${prow(1)}; row 3: ${prow(2)}, so the odd figure is <b>${QN[qA]}</b>.` },
        { k: 'Its difference', t: `the feature in which it differs follows a <b>Latin square</b> (each feature once in every row and column). Row 1: ${lrow(0)}; row 2: ${lrow(1)}; row 3: ${lrow(2)}, so it differs in its <b>${ATT[jA]}</b>.` },
        { k: 'The identical figures', t: `their features follow row rules on the first two panels. ${[0, 1, 2].map((j) => `<b>${ATT[j]}</b>: ${BF[fnames[j]].t(NAMES[j][0], NAMES[j][1])}`).join('; ')}. Row 3 uses combinations already seen in rows 1 and 2, so the three identical figures are <b>${desc(comm)}</b>.` },
        { k: 'Answer', t: `three ${desc(comm)} figures and, in the ${QN[qA]} corner, the odd one with a different ${ATT[jA]}: <b>${desc(answer.f[qA])}</b>.` },
      ];
      return {
        difficulty: 7,
        hint: 'Solve three small puzzles: where the odd figure is, what makes it odd, and what the other three look like.',
        panels,
        answer,
        options,
        rules,
        key,
        render(s) {
          const pic = new RM.Pic();
          s.f.forEach((t, p) => RM.shape(pic, shp[t[0]], QX[p], QY[p], t[2] ? 19 : 10, { fill: t[1] ? 'black' : 'white', sw: 2.2 }));
          return pic.svg();
        },
      };
    },
  });
})();
