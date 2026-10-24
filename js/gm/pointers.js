/* Pointers (grandmaster): four shapes sit in the corners of every panel, 2–3 arrows (told apart by their length) start
 * at the centre. A shape is black exactly when an ODD number of arrows points at it (only the four diagonal directions
 * point at a corner; up/down/left/right point at nothing, two arrows on the same shape cancel). Every arrow turns
 * clockwise by its own fixed multiple of 45° per column, the same in every row. Rows 1–2 and the visible part of row 3
 * are checked: each arrow's direction grid has a unique fitting rule, every colour rule (any function of the number of
 * arrows pointing at a shape) consistent with the visible panels gives the same colours for the missing panel. */
(function () {
  'use strict';
  const RM = window.RM;

  const DIRN = ['up', 'up-right', 'right', 'down-right', 'down', 'down-left', 'left', 'up-left'];
  const LEN = [27, 20, 13];
  const LNAME = ['long', 'medium', 'short'];
  const CORNER = { 7: 0, 1: 1, 5: 2, 3: 3 }; // direction -> TL, TR, BL, BR
  const CNAME = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
  const CPOS = [[20, 20], [80, 20], [20, 80], [80, 80]];
  const SHN = ['circle', 'square', 'diamond', 'pentagon', 'hexagon', 'star5'];

  RM.register({
    id: 'pointers',
    name: 'Pointers',
    difficulty: 7,
    generate(rng, variant) {
      const n = variant === 1 ? 2 : 3;
      const shp = rng.sample(SHN, 4);
      const inc = rng.sample([1, 2, 3, 4, 5, 6, 7], n);
      const A = [0, 1, 2].map(() => RM.range(n).map(() => rng.int(0, 7)));
      const D = (r, c, i) => RM.mod(A[r][i] + c * inc[i], 8);
      /* force a visible pair of arrows on the same shape (so that "odd" can be told from "at least one") */
      const fr = rng.int(0, 1);
      const fc = rng.int(0, 2);
      const [i0, j0] = rng.sample(RM.range(n), 2);
      A[fr][i0] = RM.mod(rng.pick([1, 3, 5, 7]) - fc * inc[i0], 8);
      A[fr][j0] = RM.mod(A[fr][i0] + fc * (inc[i0] - inc[j0]), 8);
      if (n === 3 && rng.chance(0.7)) {
        const [p, q, t] = rng.shuffle([0, 1, 2]);
        A[2][p] = RM.mod(rng.pick([1, 3, 5, 7]) - 2 * inc[p], 8);
        A[2][q] = RM.mod(A[2][p] + 2 * (inc[p] - inc[q]), 8);
        A[2][t] = RM.mod(rng.pick([1, 3, 5, 7]) - 2 * inc[t], 8);
      }
      const dirs = (r, c) => RM.range(n).map((i) => D(r, c, i));
      const cnt = (ds) => {
        const a = [0, 0, 0, 0];
        ds.forEach((d) => d % 2 === 1 && a[CORNER[d]]++);
        return a;
      };
      const odd = (cn) => cn.map((k) => k % 2 === 1);
      const cells = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) cells.push([r, c]);
      cells.forEach(([r, c]) => {
        const ds = dirs(r, c);
        RM.need(RM.range(8).every((d) => ds.filter((x) => x === d).length <= 2));
        RM.need(Math.max(...cnt(ds)) <= 2);
      });
      cells.slice(0, 8).forEach(([r, c]) => RM.need(dirs(r, c).join() !== dirs(2, 2).join()));
      for (let c = 0; c < 3; c++) RM.need(dirs(0, c).join() !== dirs(1, c).join() && dirs(1, c).join() !== dirs(2, c).join() && dirs(0, c).join() !== dirs(2, c).join());
      const CN = RM.grid3((r, c) => cnt(dirs(r, c)));
      const B = RM.grid3((r, c) => odd(CN[r][c]));
      const ansD = dirs(2, 2);
      const ansB = B[2][2];
      const prevB = B[2][1];
      RM.need(ansB.some((x) => x) && ansB.some((x) => !x));
      RM.need(ansB.join() !== prevB.join());
      /* rule identifiability: arrows */
      for (let i = 0; i < n; i++) RM.needUnique(RM.grid3((r, c) => D(r, c, i)), D(2, 2, i), 'numeric', 8);
      /* colour rules: every function of the arrow count that fits the visible panels */
      const vis = [];
      cells.slice(0, 8).forEach(([r, c]) => CN[r][c].forEach((k, idx) => vis.push([k, B[r][c][idx]])));
      const preds = new Set();
      for (let m = 0; m < 16; m++)
        if (vis.every(([k, b]) => !!((m >> k) & 1) === b)) preds.add(CN[2][2].map((k) => ((m >> k) & 1 ? 1 : 0)).join(''));
      RM.need(preds.size === 1 && preds.has(ansB.map((x) => (x ? 1 : 0)).join('')));
      /* no simple rule on a single shape's colour or on the number of black shapes */
      for (let k = 0; k < 4; k++) RM.needNoConflict(RM.grid3((r, c) => (B[r][c][k] ? 'b' : 'w')), ansB[k] ? 'b' : 'w', 'categorical');
      RM.needNoConflict(RM.grid3((r, c) => B[r][c].filter((x) => x).length), ansB.filter((x) => x).length, 'numeric');

      /* ---------------------------------------------------------- distractors */
      const sp = (d, b) => ({ d, b });
      const key = (s) => s.d.join(',') + '|' + s.b.map((x) => (x ? 1 : 0)).join('');
      const turn = (i) => `${inc[i] * 45}°`;
      const arrowFlaw = (i, w) =>
        `the ${LNAME[i]} arrow should point ${DIRN[ansD[i]]} (it turns ${turn(i)} clockwise per column, from ${DIRN[D(2, 1, i)]}); here it points ${DIRN[w]}`;
      const colFlaw = (k) => {
        const c = CN[2][2][k];
        return `the ${CNAME[k]} shape should be ${ansB[k] ? 'black' : 'white'}: ${c === 0 ? 'no arrow points' : c === 1 ? 'exactly one arrow points' : c + ' arrows point'} at it${c === 2 ? ' (an even number cancels out)' : ''}`;
      };
      const cands = [];
      const add = (s, flaws, tier) => cands.push({ s, flaws, tier });
      // right arrows, wrong colours
      add(sp(ansD, prevB), ['the shapes keep the colours of the previous panel: the colours must be recomputed for the new arrow directions'], 1);
      add(sp(ansD, CN[2][2].map((k) => k >= 1)), ['a shape with two arrows on it is not black: an even number of arrows cancels out (black needs an odd number)'], 1);
      add(sp(ansD, ansB.map((x) => !x)), ['all the colours are inverted: a shape is black when an odd number of arrows points at it'], 1);
      for (let k = 0; k < 4; k++) add(sp(ansD, ansB.map((x, q) => (q === k ? !x : x))), [colFlaw(k)], 1);
      for (let k = 0; k < 4; k++) for (let q = k + 1; q < 4; q++) add(sp(ansD, ansB.map((x, z) => (z === k || z === q ? !x : x))), [colFlaw(k), colFlaw(q)], 2);
      // wrong arrows
      const wrongs = (i) => {
        const o = [];
        const w = (d, why) => d !== ansD[i] && o.push({ d, why });
        w(RM.mod(ansD[i] + 1, 8), '');
        w(RM.mod(ansD[i] - 1, 8), '');
        w(D(2, 1, i), '');
        w(RM.mod(D(2, 1, i) - inc[i], 8), '');
        w(RM.mod(ansD[i] + 4, 8), '');
        for (let j = 0; j < n; j++) if (j !== i) w(RM.mod(D(2, 1, i) + inc[j], 8), '');
        return o;
      };
      for (let i = 0; i < n; i++)
        wrongs(i).forEach(({ d }) => {
          const ds = ansD.slice();
          ds[i] = d;
          const self = odd(cnt(ds));
          add(sp(ds, ansB), [arrowFlaw(i, d)], 2);
          add(sp(ds, self), [arrowFlaw(i, d)], 3);
        });
      for (let t = 0; t < 12; t++) {
        const [i, j] = rng.sample(RM.range(n), 2);
        const wi = rng.pick(wrongs(i)).d;
        const wj = rng.pick(wrongs(j)).d;
        const ds = ansD.slice();
        ds[i] = wi;
        ds[j] = wj;
        add(sp(ds, rng.chance(0.5) ? ansB : odd(cnt(ds))), [arrowFlaw(i, wi), arrowFlaw(j, wj)], 4);
      }
      const ak = key(sp(ansD, ansB));
      const seen = new Set([ak]);
      const by = { 1: [], 2: [], 3: [], 4: [] };
      rng.shuffle(cands).forEach((c) => {
        const k = key(c.s);
        if (seen.has(k)) return;
        seen.add(k);
        by[c.tier].push(c);
      });
      const chosen = [];
      const take = (arr, m) => arr.splice(0, m).forEach((c) => chosen.push(c));
      const sorted1 = by[1].slice().sort((a, b) => a.flaws.length - b.flaws.length);
      take(sorted1, 3);
      take(by[2], 2);
      take(by[3], 2);
      const rest = by[1].filter((c) => !chosen.includes(c)).concat(by[2], by[3], by[4]);
      take(rest, 7 - chosen.length);
      RM.need(chosen.length === 7);

      /* ---------------------------------------------------------- drawing */
      const render = (s) => {
        const pic = new RM.Pic();
        CPOS.forEach((p, k) => RM.shape(pic, shp[k], p[0], p[1], 11.5, { fill: s.b[k] ? 'black' : 'white', sw: 2.2 }));
        s.d.forEach((d, i) => {
          const a = (d * Math.PI) / 4;
          const ux = Math.sin(a);
          const uy = -Math.cos(a);
          const L = LEN[i];
          const hl = 7.5;
          const tip = [50 + L * ux, 50 + L * uy];
          const base = [50 + (L - hl) * ux, 50 + (L - hl) * uy];
          RM.line(pic, 50, 50, base[0], base[1], { sw: 2.6, cap: 'butt' });
          RM.polygon(pic, [tip, [base[0] - 3.8 * uy, base[1] + 3.8 * ux], [base[0] + 3.8 * uy, base[1] - 3.8 * ux]], { fill: 'black', sw: 1 });
        });
        RM.circle(pic, 50, 50, 3, { fill: 'black', sw: 1 });
        return pic.svg();
      };

      /* ---------------------------------------------------------- correction */
      const names = (b) => b.map((x, k) => (x ? CNAME[k] : null)).filter(Boolean);
      const j0s = names(ansB);
      const dbl = (() => {
        for (const [r, c] of cells.slice(0, 8)) {
          const k = CN[r][c].findIndex((x) => x === 2);
          if (k >= 0) return `row ${r + 1}, column ${c + 1} (two arrows on the ${CNAME[k]} shape, which is white)`;
        }
        return '';
      })();
      const rules = [
        {
          k: 'Arrows',
          t: `the arrows are told apart by their length. Each one turns <b>clockwise</b> by its own fixed angle from one column to the next, the same in every row: ${RM.range(n)
            .map((i) => `the ${LNAME[i]} arrow by <b>${turn(i)}</b>`)
            .join(', ')}.`,
        },
        {
          k: 'Colours',
          t: `an arrow points at a corner shape only along the four diagonals; an arrow pointing up, down, left or right points at no shape. A shape is <b>black</b> when an <b>odd</b> number of arrows points at it (1), otherwise white; two arrows on the same shape cancel out${dbl ? ' — see ' + dbl : ''}.`,
        },
        {
          k: 'Row 3',
          t: `from column 2 to column 3 (${RM.range(n)
            .map((i) => `${LNAME[i]}: ${DIRN[D(2, 1, i)]} → <b>${DIRN[ansD[i]]}</b>`)
            .join('; ')}). Arrows pointing at a shape: ${ansB.map((x, k) => `${CNAME[k]} ${CN[2][2][k]}`).join(', ')}.`,
        },
        {
          k: 'Answer',
          t: `the arrows as above and ${j0s.length ? '<b>' + j0s.join(' and ') + ' black</b>' : '<b>no shape black</b>'}, the other shapes white.`,
        },
      ];

      return {
        difficulty: 7,
        hint: 'each arrow has its own turning speed; count what points at each corner, and mind the shapes that are hit twice.',
        panels: cells.slice(0, 8).map(([r, c]) => sp(dirs(r, c), B[r][c])),
        answer: sp(ansD, ansB),
        options: [{ spec: sp(ansD, ansB), flaws: [] }].concat(chosen.map((c) => ({ spec: c.s, flaws: c.flaws }))),
        render,
        key,
        rules,
      };
    },
  });
})();
