/* Role shift (grandmaster): a figure = 1–3 copies of a shape (circle / square / triangle) with a fill (white / grey /
 * black). Shapes and fills carry a HIDDEN number 1–3 (the number of copies is its own number). Along a row the numbers
 * migrate between the attributes: e.g. new shape = the shape with the number of the previous FILL, new fill = the fill
 * with the number of the previous COUNT, new count = the previous SHAPE's number (or the cycle the other way round).
 * Rule identifiability: every attribute permutation (3!) × every bijection per target attribute (3!³ = 216) that is
 * consistent with the five visible transitions must predict the same missing panel. Distractors: wrong direction of the
 * shift, shift applied twice / not at all, one to three attributes wrong (each with the exact derivation). */
(function () {
  'use strict';
  const RM = window.RM;

  const SHN = ['circle', 'square', 'triangle'];
  const FLN = ['white', 'grey', 'black'];
  const FILL = ['white', 'gray', 'black'];
  const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  const LAY = [
    [[50, 50, 19]],
    [[31, 50, 15], [69, 50, 15]],
    [[50, 31, 14], [30, 67, 14], [70, 67, 14]],
  ];
  const AN = ['shape', 'fill', 'number of copies'];

  RM.register({
    id: 'role-shift',
    name: 'Role shift',
    difficulty: 8,
    generate(rng, variant) {
      const type = rng.int(0, 1);
      const sg = rng.shuffle([0, 1, 2]); // shape value -> number 0..2
      const ph = rng.shuffle([0, 1, 2]); // fill value -> number 0..2
      const si = [0, 1, 2].map((v) => sg.indexOf(v)); // number -> shape
      const pi = [0, 1, 2].map((v) => ph.indexOf(v)); // number -> fill
      /* state = [shape, fill, count] (values 0..2) */
      const step = (x, t) => {
        const [s, f, n] = x;
        return t === 0 ? [si[ph[f]], pi[n], sg[s]] : [si[n], pi[sg[s]], ph[f]];
      };
      const starts = [];
      while (starts.length < 3) {
        const x = [rng.int(0, 2), rng.int(0, 2), rng.int(0, 2)];
        if (!starts.some((y) => y.join() === x.join())) starts.push(x);
      }
      const G = starts.map((x) => {
        const b = step(x, type);
        return [x, b, step(b, type)];
      });
      const key = (x) => x.join('');
      const vis = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (r < 2 || c < 2) vis.push(G[r][c]);
      const ans = G[2][2];
      const prev = G[2][1];
      RM.need(vis.every((x) => key(x) !== key(ans)));
      G.forEach((row) => RM.need(key(row[0]) !== key(row[1]) && key(row[1]) !== key(row[2]) && key(row[0]) !== key(row[2])));
      RM.need(G.every((row) => row[0].some((v, a) => v !== row[1][a]) && row[1].filter((v, a) => v !== row[2][a]).length >= 2));

      /* ---- rule identifiability over the general class */
      const trans = [[G[0][0], G[0][1]], [G[0][1], G[0][2]], [G[1][0], G[1][1]], [G[1][1], G[1][2]], [G[2][0], G[2][1]]];
      const outs = new Set();
      PERMS.forEach((p) => {
        const pred = [];
        for (let a = 0; a < 3; a++) {
          const hs = PERMS.filter((h) => trans.every(([x, y]) => h[x[p[a]]] === y[a]));
          if (!hs.length) return;
          const vs = new Set(hs.map((h) => h[prev[p[a]]]));
          RM.need(vs.size === 1);
          pred.push([...vs][0]);
        }
        outs.add(pred.join(''));
      });
      RM.need(outs.size === 1 && outs.has(key(ans)));
      /* no simple rule on a single attribute may point elsewhere */
      RM.needNoConflict(RM.grid3((r, c) => G[r][c][0]), ans[0], 'categorical');
      RM.needNoConflict(RM.grid3((r, c) => G[r][c][1]), ans[1], 'categorical');
      RM.needNoConflict(RM.grid3((r, c) => G[r][c][2] + 1), ans[2] + 1, 'numeric');

      /* ---------------------------------------------------------- wording */
      const num = (a, v) => (a === 0 ? sg[v] + 1 : a === 1 ? ph[v] + 1 : v + 1);
      const val = (a, v) => (a === 0 ? SHN[v] : a === 1 ? FLN[v] : String(v + 1) + (v ? ' copies' : ' copy'));
      const desc = (x) => `${x[2] + 1} ${FLN[x[1]]} ${SHN[x[0]]}${x[2] ? 's' : ''}`;
      // target attribute -> source attribute
      const src = type === 0 ? [1, 2, 0] : [2, 0, 1];
      const why = (a, x, from) => {
        // x: value chosen for attribute a; from: the previous panel
        const sa = src[a];
        return `the ${AN[a]} must carry the number of the previous ${AN[sa]} (${val(sa, from[sa])} = number ${num(sa, from[sa])}): that is the ${val(a, ans[a])}, not the ${val(a, x)}`;
      };
      const other = step(prev, 1 - type);
      const twice = step(ans, type);
      const cands = [];
      const add = (x, flaws, tier) => cands.push({ x, flaws, tier });
      const dirTxt = (t) => (t === 0 ? 'shape ← fill, fill ← copies, copies ← shape' : 'shape ← copies, copies ← fill, fill ← shape');
      add(other, [`the numbers were passed on the wrong way round (${dirTxt(1 - type)}); in this puzzle it is ${dirTxt(type)}`], 1);
      add(prev.slice(), ['the figure is just repeated from the previous panel: every attribute must take a new value from another attribute'], 1);
      add(twice, ['the shift was applied twice: one step per column is enough'], 1);
      add(G[2][0].slice(), ["this is the first panel of the row again: the figure of column 3 comes from column 2, not from column 1"], 2);
      for (let m = 1; m < 8; m++) {
        const bits = [0, 1, 2].filter((a) => (m >> a) & 1);
        const w = ans.slice();
        const ok = bits.every((a) => {
          const alt = [0, 1, 2].filter((v) => v !== ans[a]);
          w[a] = rng.pick(alt);
          return true;
        });
        if (ok) add(w, bits.map((a) => why(a, w[a], prev)), bits.length === 1 ? 1 : bits.length === 2 ? 2 : 3);
      }
      for (let t = 0; t < 10; t++) {
        const bits = rng.sample([0, 1, 2], 2);
        const w = ans.slice();
        bits.forEach((a) => (w[a] = rng.pick([0, 1, 2].filter((v) => v !== ans[a]))));
        add(w, bits.sort().map((a) => why(a, w[a], prev)), 2);
      }
      const seen = new Set([key(ans)]);
      const by = { 1: [], 2: [], 3: [] };
      rng.shuffle(cands).forEach((c) => {
        const k = key(c.x);
        if (seen.has(k)) return;
        seen.add(k);
        by[c.tier].push(c);
      });
      const sem = by[1].filter((c) => c.flaws.length === 1 && /passed on|repeated|twice/.test(c.flaws[0]));
      const sing = by[1].filter((c) => !sem.includes(c));
      const chosen = sem.slice(0, 2).concat(sing.slice(0, 3), by[2].slice(0, 2));
      const rest = sem.slice(2).concat(sing.slice(3), by[2].slice(2), by[3]);
      while (chosen.length < 7 && rest.length) chosen.push(rest.shift());
      RM.need(chosen.length === 7);

      /* ---------------------------------------------------------- drawing */
      const render = (x) => {
        const pic = new RM.Pic();
        LAY[x[2]].forEach(([cx, cy, r]) => RM.shape(pic, SHN[x[0]], cx, cy, r, { fill: FILL[x[1]], sw: 2.2 }));
        return pic.svg();
      };

      /* ---------------------------------------------------------- correction */
      const nb = (a, v) => `${val(a, v)} = ${num(a, v)}`;
      const rulesTxt = type === 0
        ? 'the <b>shape</b> of the next panel is the one whose number equals the number of the previous <b>fill</b>; the next <b>fill</b> is the one whose number equals the previous <b>number of copies</b>; the next <b>number of copies</b> equals the number of the previous <b>shape</b>'
        : 'the <b>shape</b> of the next panel is the one whose number equals the previous <b>number of copies</b>; the next <b>number of copies</b> equals the number of the previous <b>fill</b>; the next <b>fill</b> is the one whose number equals the number of the previous <b>shape</b>';
      const row1 = `row 1: ${desc(G[0][0])} → ${desc(G[0][1])} → ${desc(G[0][2])}`;
      const rules = [
        {
          k: 'Hidden numbers',
          t: `shapes and fills carry a hidden number from 1 to 3 (the number of copies is simply its own number). Reading the rows gives: ${SHN.map((s, v) => `${s} = ${sg[v] + 1}`).join(', ')}; ${FLN.map((f, v) => `${f} = ${ph[v] + 1}`).join(', ')}.`,
        },
        {
          k: 'Role shift',
          t: `from one column to the next the numbers change roles: ${rulesTxt}. (${row1}.)`,
        },
        {
          k: 'Row 3',
          t: `column 2 shows ${desc(prev)}: ${nb(0, prev[0])}, ${nb(1, prev[1])}, ${prev[2] + 1} copies. New shape: number of the old ${AN[src[0]]} (${nb(src[0], prev[src[0]])}) → <b>${SHN[ans[0]]}</b>. New fill: number of the old ${AN[src[1]]} (${nb(src[1], prev[src[1]])}) → <b>${FLN[ans[1]]}</b>. New number of copies: number of the old ${AN[src[2]]} (${nb(src[2], prev[src[2]])}) → <b>${ans[2] + 1}</b>.`,
        },
        { k: 'Answer', t: `<b>${desc(ans)}</b>.` },
      ];

      const panels = vis.map((x) => x.slice());
      return {
        difficulty: 8,
        hint: 'nothing is copied: what a figure has in one panel turns up in a different attribute in the next — find the hidden numbering.',
        panels,
        answer: ans,
        options: [{ spec: ans, flaws: [] }].concat(chosen.map((c) => ({ spec: c.x, flaws: c.flaws }))),
        render,
        key,
        rules,
      };
    },
  });
})();
