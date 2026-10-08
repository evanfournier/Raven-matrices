/* Puzzle families based on attributes, counts and arithmetic. */
(function () {
  'use strict';
  const RM = window.RM;
  const { nm, fn } = RM;

  /* Rows of three numbers following a simple rule. */
  function counterRows(rng, rule, lo, hi) {
    const rows = [];
    for (let r = 0; r < 3; r++) {
      let row;
      if (rule === 'sum') {
        const x = rng.int(lo, Math.max(lo, Math.floor(hi / 2)));
        const y = rng.int(lo, Math.max(lo, Math.floor(hi / 2)));
        row = [x, y, x + y];
      } else if (rule === 'diff') {
        const z = rng.int(lo, Math.max(lo, Math.floor(hi / 2)));
        const y = rng.int(Math.max(1, lo), Math.max(1, Math.floor(hi / 2)));
        row = [y + z, y, z];
      } else {
        const d = rng.pick([-2, -1, 1, 2]);
        const s = d > 0 ? rng.int(lo, hi - 2 * d) : rng.int(lo - 2 * d, hi);
        row = [s, s + d, s + 2 * d];
      }
      rows.push(row);
    }
    RM.need(rows.every((row) => row.every((v) => v >= lo && v <= hi)));
    return rows;
  }
  RM.counterRows = counterRows;

  function ruleText(rule, row, unit) {
    const [a, b, c] = row;
    if (rule === 'sum') return `3rd = 1st + 2nd. Row 3: ${a} + ${b} = <b>${c}</b>`;
    if (rule === 'diff') return `3rd = 1st − 2nd. Row 3: ${a} − ${b} = <b>${c}</b>`;
    const d = b - a;
    return `changes by a constant step inside each row (the step may differ between rows). Row 3: ${a} → ${b} → <b>${c}</b> (${d > 0 ? '+' : '−'}${Math.abs(d)}${unit ? ' ' + unit : ''} each time)`;
  }
  RM.ruleText = ruleText;

  function altCount(rng, correct, lo, hi, extra) {
    const c = (extra || []).concat([correct + 1, correct - 1, correct + 2]).filter((v) => v >= lo && v <= hi && v !== correct);
    RM.need(c.length > 0);
    return c[0];
  }

  /* ================================================================ Triple rule */
  RM.register({
    id: 'tri-rule',
    name: 'Triple rule',
    difficulty: 3,
    generate(rng, variant) {
      const shapes = rng.sample(['circle', 'square', 'triangle', 'diamond', 'pentagon', 'hexagon', 'star5', 'cross', 'heart', 'star4', 'house'], 3);
      const fills = rng.sample(['white', 'black', 'gray', 'hatch', 'dots'], 3);
      const a = rng.pick([1, 2]);
      const S = RM.grid3((r, c) => shapes[RM.latin(r, c, a, 0)]);
      const fo = rng.int(0, 2);
      const F = RM.grid3((r, c) => fills[RM.latin(r, c, 3 - a, fo)]);
      const rule = ['sum', 'diff', 'prog', rng.pick(['sum', 'diff'])][variant % 4];
      const N = counterRows(rng, rule, 1, 8);
      RM.needUnique(N, N[2][2], 'numeric');
      RM.needUnique(S, S[2][2]);
      RM.needUnique(F, F[2][2]);
      const spec = RM.grid3((r, c) => ({ s: S[r][c], f: F[r][c], n: N[r][c] }));
      const ans = spec[2][2];
      const altS = S[2][1];
      const altF = F[2][0];
      const [x, y] = N[2];
      const altN = altCount(rng, ans.n, 1, 8, rule === 'sum' ? [Math.abs(x - y)] : rule === 'diff' ? [x + y] : [y]);
      return {
        panels: RM.flat(spec),
        answer: ans,
        render(sp) {
          const pic = new RM.Pic();
          const L = RM.countLayout(sp.n);
          L.pts.forEach((p) => RM.shape(pic, sp.s, p[0], p[1], L.r, { fill: sp.f, sw: 1.8 }));
          return pic.svg();
        },
        perturb: [
          { apply: (s) => ((s.s = altS), s), why: `the figures should be ${nm(ans.s)}s, not ${nm(altS)}s` },
          { apply: (s) => ((s.f = altF), s), why: `the fill should be ${fn(ans.f)}, not ${fn(altF)}` },
          { apply: (s) => ((s.n = altN), s), why: `there should be ${ans.n} figures, not ${altN}` },
        ],
        rules: [
          { k: 'Shape', t: `every row and every column contains the ${RM.list(shapes.map(nm))} once each → <b>${nm(ans.s)}</b>.` },
          { k: 'Fill', t: `the fills (${RM.list(fills.map(fn))}) are also distributed once per row and column, but along the opposite diagonal to the shapes → <b>${fn(ans.f)}</b>.` },
          { k: 'Number', t: `number of figures: ${ruleText(rule, N[2])}.` },
        ],
      };
    },
  });

  /* ================================================================ Four axes */
  RM.register({
    id: 'four-axes',
    name: 'Four axes',
    difficulty: 4,
    generate(rng) {
      const shapes = rng.sample(['arrow', 'flag', 'house', 'kite', 'bolt', 'chevron', 'lshape', 'tshape', 'heart', 'crescent', 'drop', 'trapezoid'], 3);
      const fills = rng.sample(['white', 'black', 'gray', 'hatch', 'hlines'], 3);
      const step = rng.pick([1, 2, -1, -2, 3]);
      const base = [rng.int(0, 7), rng.int(0, 7), rng.int(0, 7)];
      const R = RM.grid3((r, c) => RM.mod(base[r] + step * c, 8));
      const fa = rng.pick([1, 2]);
      const fo = rng.int(0, 2);
      const F = RM.grid3((r, c) => fills[RM.latin(r, c, fa, fo)]);
      const D = [[], [], []];
      for (let c = 0; c < 3; c++) {
        D[0][c] = rng.int(1, 3);
        D[1][c] = rng.int(1, 3);
        D[2][c] = D[0][c] + D[1][c];
      }
      RM.needUnique(D, D[2][2], 'numeric');
      RM.needUnique(R, R[2][2], 'numeric', 8);
      RM.needUnique(F, F[2][2]);
      const spec = RM.grid3((r, c) => ({ s: shapes[r], r: R[r][c], f: F[r][c], d: D[r][c] }));
      const ans = spec[2][2];
      const altR = RM.mod(ans.r - 2 * step, 8);
      const altF = F[2][1];
      const altD = ans.d + rng.pick([1, -1]);
      return {
        panels: RM.flat(spec),
        answer: ans,
        render(sp) {
          const pic = new RM.Pic();
          RM.shape(pic, sp.s, 50, 42, 25, { fill: sp.f, rot: sp.r * 45, sw: 2 });
          const w = (sp.d - 1) * 10;
          for (let i = 0; i < sp.d; i++) RM.circle(pic, 50 - w / 2 + i * 10, 88, 3.4, { fill: 'black', sw: 0 });
          return pic.svg();
        },
        perturb: [
          { apply: (s) => ((s.r = altR), s), why: `the ${nm(ans.s)} is turned the wrong way` },
          { apply: (s) => ((s.f = altF), s), why: `the fill should be ${fn(ans.f)}` },
          { apply: (s) => ((s.d = altD), s), why: `there should be ${ans.d} dots, not ${altD}` },
        ],
        rules: [
          { k: 'Shape', t: `one shape per row → row 3 uses the <b>${nm(ans.s)}</b>.` },
          { k: 'Rotation', t: `inside every row the figure turns <b>${RM.turn(step)}</b> from one panel to the next.` },
          { k: 'Fill', t: `each fill (${RM.list(fills.map(fn))}) occurs once in every row and column → <b>${fn(ans.f)}</b>.` },
          { k: 'Dots', t: `the dots work <b>vertically</b>: in every column, row 3 = row 1 + row 2. Last column: ${D[0][2]} + ${D[1][2]} = <b>${ans.d}</b>.` },
        ],
      };
    },
  });

  /* ================================================================ Dual counter */
  const TOKENS = [
    { s: 'circle', f: 'black', n: 'black dots' },
    { s: 'star5', f: 'black', n: 'black stars' },
    { s: 'square', f: 'black', n: 'black squares' },
    { s: 'triangle', f: 'white', n: 'white triangles' },
    { s: 'circle', f: 'white', n: 'white circles' },
    { s: 'diamond', f: 'gray', n: 'grey diamonds' },
    { s: 'heart', f: 'white', n: 'white hearts' },
    { s: 'cross', f: 'gray', n: 'grey crosses' },
  ];
  RM.register({
    id: 'dual-counter',
    name: 'Two counters',
    difficulty: 4,
    generate(rng, variant) {
      const pairs = [['sum', 'diff'], ['diff', 'prog'], ['prog', 'sum'], ['diff', 'sum']];
      const [ruleA, ruleB] = pairs[variant % 4];
      const black = TOKENS.filter((t) => t.f === 'black');
      const other = TOKENS.filter((t) => t.f !== 'black');
      const tA = rng.pick(black);
      const tB = rng.pick(other.filter((t) => t.s !== tA.s));
      const A = counterRows(rng, ruleA, 0, 6);
      const B = counterRows(rng, ruleB, 0, 6);
      const frames = rng.sample(['circle', 'square', 'hexagon', 'octagon'], 3);
      const fa = rng.pick([1, 2]);
      const Fr = RM.grid3((r, c) => frames[RM.latin(r, c, fa, 1)]);
      RM.need(A.every((row, r) => row.every((v, c) => v + B[r][c] >= 1 && v + B[r][c] <= 8)));
      RM.needUnique(A, A[2][2], 'numeric');
      RM.needUnique(B, B[2][2], 'numeric');
      RM.needUnique(Fr, Fr[2][2]);
      const spec = RM.grid3((r, c) => ({ a: A[r][c], b: B[r][c], fr: Fr[r][c], seed: rng.seed() }));
      const ans = spec[2][2];
      const altA = altCount(rng, ans.a, 0, 8 - ans.b - 1, ruleA === 'sum' ? [Math.abs(A[2][0] - A[2][1])] : ruleA === 'diff' ? [A[2][0] + A[2][1]] : []);
      const altB = altCount(rng, ans.b, 0, 8 - Math.max(ans.a, altA), ruleB === 'sum' ? [Math.abs(B[2][0] - B[2][1])] : ruleB === 'diff' ? [B[2][0] + B[2][1]] : []);
      RM.need(Math.max(ans.a, altA) + Math.max(ans.b, altB) <= 9);
      const altFr = Fr[2][1];
      return {
        panels: RM.flat(spec),
        answer: ans,
        key: (s) => [s.a, s.b, s.fr].join(','),
        render(sp) {
          const pic = new RM.Pic();
          RM.shape(pic, sp.fr, 50, 50, 45, { fill: 'none', sw: 2 });
          const slots = RM.rng(sp.seed).sample(RM.range(9), sp.a + sp.b);
          slots.forEach((k, i) => {
            const t = i < sp.a ? tA : tB;
            const x = 29 + (k % 3) * 21;
            const y = 29 + Math.floor(k / 3) * 21;
            RM.shape(pic, t.s, x, y, 7.5, { fill: t.f, sw: 1.6 });
          });
          return pic.svg();
        },
        perturb: [
          { apply: (s, r) => ((s.a = altA), (s.seed = r.seed()), s), why: `${altA} ${tA.n} instead of ${ans.a}` },
          { apply: (s, r) => ((s.b = altB), (s.seed = r.seed()), s), why: `${altB} ${tB.n} instead of ${ans.b}` },
          { apply: (s) => ((s.fr = altFr), s), why: `the frame should be a ${nm(ans.fr)}` },
        ],
        rules: [
          { k: 'Positions', t: 'where the tokens sit is irrelevant — only how many there are of each kind.' },
          { k: RM.cap(tA.n), t: `${ruleText(ruleA, A[2])}.` },
          { k: RM.cap(tB.n), t: `${ruleText(ruleB, B[2])}.` },
          { k: 'Frame', t: `each row contains each frame (${RM.list(frames.map(nm))}) once → <b>${nm(ans.fr)}</b>.` },
        ],
      };
    },
  });

  /* ================================================================ Cogs */
  function gear(pic, n, fill, rot) {
    const pts = [];
    const p = 360 / n;
    for (let i = 0; i < n; i++) {
      const c = rot + p * i;
      [[c - 0.3 * p, 30], [c - 0.15 * p, 41], [c + 0.15 * p, 41], [c + 0.3 * p, 30]].forEach(([a, rr]) => {
        pts.push([50 + rr * Math.sin((a * Math.PI) / 180), 50 - rr * Math.cos((a * Math.PI) / 180)]);
      });
    }
    RM.polygon(pic, pts, { fill, sw: 2 });
  }
  RM.register({
    id: 'cogs',
    name: 'Cogwheels',
    difficulty: 3,
    generate(rng, variant) {
      const rule = ['sum', 'prog', 'diff', 'sum'][variant % 4];
      let T;
      if (rule === 'sum') T = RM.range(3).map(() => { const x = rng.int(3, 5); const y = rng.int(3, 6); return [x, y, x + y]; });
      else if (rule === 'diff') T = RM.range(3).map(() => { const z = rng.int(3, 5); const y = rng.int(3, 6); return [y + z, y, z]; });
      else T = counterRows(rng, 'prog', 3, 12);
      RM.need(T.every((row) => row.every((v) => v >= 3 && v <= 12)));
      const hubs = rng.sample(['circle', 'square', 'triangle', 'star5', 'cross', 'diamond'], 3);
      const ha = rng.pick([1, 2]);
      const H = RM.grid3((r, c) => hubs[RM.latin(r, c, ha, 2)]);
      const fills = rng.sample(['white', 'gray', 'hatch', 'dots'], 3);
      const fo = rng.int(0, 2);
      const F = RM.grid3((r, c) => fills[RM.latin(r, c, 3 - ha, fo)]);
      RM.needUnique(T, T[2][2], 'numeric');
      RM.needUnique(H, H[2][2]);
      RM.needUnique(F, F[2][2]);
      const spec = RM.grid3((r, c) => ({ n: T[r][c], h: H[r][c], f: F[r][c], rot: rng.int(0, 359) }));
      const ans = spec[2][2];
      const altN = altCount(rng, ans.n, 3, 12, rule === 'sum' ? [ans.n + 1] : [ans.n - 1]);
      const altH = H[2][0];
      const altF = F[2][1];
      return {
        panels: RM.flat(spec),
        answer: ans,
        key: (s) => [s.n, s.h, s.f].join(','),
        render(sp) {
          const pic = new RM.Pic();
          gear(pic, sp.n, sp.f, sp.rot);
          RM.shape(pic, sp.h, 50, 50, 11, { fill: 'white', sw: 2 });
          return pic.svg();
        },
        perturb: [
          { apply: (s, r) => ((s.n = altN), (s.rot = r.int(0, 359)), s), why: `the wheel has ${altN} teeth instead of ${ans.n}` },
          { apply: (s) => ((s.h = altH), s), why: `the hub should be a ${nm(ans.h)}` },
          { apply: (s) => ((s.f = altF), s), why: `the wheel should be filled with ${fn(ans.f)}` },
        ],
        rules: [
          { k: 'Teeth', t: `count the teeth (the wheel's rotation does not matter): ${ruleText(rule, T[2])}.` },
          { k: 'Hub', t: `each hub shape (${RM.list(hubs.map(nm))}) appears once per row and column → <b>${nm(ans.h)}</b>.` },
          { k: 'Fill', t: `each fill appears once per row and column, on the other diagonal → <b>${fn(ans.f)}</b>.` },
        ],
      };
    },
  });

  /* ================================================================ Bar charts */
  const BAR_RULES = {
    sum: { f: (a, b) => a + b, t: '3rd = 1st + 2nd' },
    diff: { f: (a, b) => a - b, t: '3rd = 1st − 2nd' },
    prog: { f: (a, b) => 2 * b - a, t: 'changes by the same amount at each step' },
    max: { f: Math.max, t: '3rd = the taller of the first two' },
    min: { f: Math.min, t: '3rd = the shorter of the first two' },
  };
  function barRows(rng, rule) {
    return RM.range(3).map(() => {
      if (rule === 'sum') { const x = rng.int(1, 4); const y = rng.int(1, 7 - x); return [x, y, x + y]; }
      if (rule === 'diff') { const z = rng.int(1, 4); const y = rng.int(1, 7 - z); return [y + z, y, z]; }
      if (rule === 'prog') { const d = rng.pick([-3, -2, -1, 1, 2, 3]); const s = d > 0 ? rng.int(1, 7 - 2 * d) : rng.int(1 - 2 * d, 7); return [s, s + d, s + 2 * d]; }
      let x = rng.int(1, 7);
      let y = rng.int(1, 7);
      while (y === x) y = rng.int(1, 7);
      return [x, y, BAR_RULES[rule].f(x, y)];
    });
  }
  RM.register({
    id: 'bars',
    name: 'Bar charts',
    difficulty: 4,
    generate(rng, variant) {
      const sets = [['sum', 'diff', 'prog'], ['max', 'sum', 'min'], ['prog', 'min', 'diff'], ['diff', 'max', 'prog']];
      const rules = rng.shuffle(sets[variant % 4]);
      const H = rules.map((rule) => barRows(rng, rule));
      H.forEach((g) => RM.need(g.every((row) => row.every((v) => v >= 1 && v <= 7))));
      H.forEach((g) => RM.needUnique(g, g[2][2], 'numeric'));
      const spec = RM.grid3((r, c) => ({ h: [H[0][r][c], H[1][r][c], H[2][r][c]] }));
      const ans = spec[2][2];
      const names = ['left (black)', 'middle (grey)', 'right (hatched)'];
      const alts = rules.map((rule, i) => {
        const [a, b] = H[i][2];
        const tempting = Object.keys(BAR_RULES).filter((k) => k !== rule).map((k) => BAR_RULES[k].f(a, b));
        return altCount(rng, ans.h[i], 1, 7, rng.shuffle(tempting));
      });
      return {
        panels: RM.flat(spec),
        answer: ans,
        render(sp) {
          const pic = new RM.Pic();
          const u = 10.5;
          for (let k = 1; k <= 7; k++) RM.line(pic, 8, 90 - k * u, 92, 90 - k * u, { sw: 0.6, color: RM.FAINT, cap: 'butt' });
          const fills = ['black', 'gray', 'hatch'];
          sp.h.forEach((h, i) => {
            pic.add(`<rect x="${15 + i * 25}" y="${RM.fmt(90 - h * u)}" width="20" height="${RM.fmt(h * u)}" fill="${pic.paint(fills[i])}" stroke="${RM.INK}" stroke-width="1.6"/>`);
          });
          RM.line(pic, 8, 90, 92, 90, { sw: 2, cap: 'butt' });
          return pic.svg();
        },
        perturb: alts.map((v, i) => ({
          apply: (s) => ((s.h[i] = v), s),
          why: `the ${names[i]} bar is ${v} units high instead of ${ans.h[i]}`,
        })),
        rules: rules.map((rule, i) => ({
          k: RM.cap(names[i]) + ' bar',
          t: `${BAR_RULES[rule].t}. Row 3: ${H[i][2][0]}, ${H[i][2][1]} → <b>${ans.h[i]}</b>.`,
        })).concat([{ k: 'Tip', t: 'the faint lines are units: each bar follows its own rule, independently of the others.' }]),
      };
    },
  });

  /* ================================================================ Attribute mix */
  RM.register({
    id: 'attribute-mix',
    name: 'Inheritance',
    difficulty: 4,
    generate(rng) {
      const vals = {
        outer: rng.sample(['circle', 'square', 'hexagon', 'triangle', 'pentagon', 'octagon'], 3),
        inner: rng.sample(['circle', 'star5', 'cross', 'diamond', 'star4', 'heart'], 3),
        fill: rng.sample(['white', 'light', 'lhatch', 'ldots'], 3),
        border: rng.sample(['solid', 'dashed', 'thick', 'double'], 3),
      };
      const attrs = ['outer', 'inner', 'fill', 'border'];
      const rules = rng.shuffle(['copy1', 'copy2', 'third', 'const']);
      const G = {};
      attrs.forEach((at, i) => {
        const v = vals[at];
        const rule = rules[i];
        const constOrder = rng.shuffle(v);
        G[at] = RM.range(3).map((r) => {
          if (rule === 'const') return [constOrder[r], constOrder[r], constOrder[r]];
          if (rule === 'third') return rng.shuffle(v);
          const [p, q] = rng.sample(v, 2);
          return rule === 'copy1' ? [p, q, p] : [p, q, q];
        });
        RM.needUnique(G[at], G[at][2][2]);
      });
      const spec = RM.grid3((r, c) => ({ outer: G.outer[r][c], inner: G.inner[r][c], fill: G.fill[r][c], border: G.border[r][c] }));
      const ans = spec[2][2];
      const label = { outer: 'outer shape', inner: 'inner symbol', fill: 'fill', border: 'outline' };
      const say = (at, v) => (at === 'outer' || at === 'inner' ? nm(v) : at === 'fill' ? fn(v) : v);
      const ruleSay = {
        copy1: 'the 3rd panel <b>copies the 1st panel</b>',
        copy2: 'the 3rd panel <b>copies the 2nd panel</b>',
        third: 'the 3rd panel takes the <b>value missing</b> from the first two (each value once per row)',
        const: '<b>constant</b> along each row',
      };
      const perturbAttrs = attrs.filter((at, i) => rules[i] !== 'const');
      return {
        panels: RM.flat(spec),
        answer: ans,
        render(sp) {
          const pic = new RM.Pic();
          const sw = sp.border === 'thick' ? 4.2 : sp.border === 'double' ? 1.5 : 2.2;
          RM.shape(pic, sp.outer, 50, 50, 40, { fill: sp.fill, sw, dash: sp.border === 'dashed' ? 'dashed' : null });
          if (sp.border === 'double') RM.shape(pic, sp.outer, 50, 50, 34, { fill: 'none', sw });
          RM.shape(pic, sp.inner, 50, sp.outer === 'triangle' ? 56 : 50, 10, { fill: 'black', sw: 1 });
          return pic.svg();
        },
        perturb: perturbAttrs.map((at) => {
          const rule = rules[attrs.indexOf(at)];
          const row = G[at][2];
          const alt = rule === 'copy1' ? row[1] : row[0];
          return {
            apply: (s) => ((s[at] = alt), s),
            why: `the ${label[at]} should be ${say(at, ans[at])}, not ${say(at, alt)}`,
          };
        }),
        rules: attrs.map((at, i) => ({ k: RM.cap(label[at]), t: `${ruleSay[rules[i]]} → <b>${say(at, ans[at])}</b>.` })),
      };
    },
  });

  /* ================================================================ Edge budget */
  const POLY = { 3: 'triangle', 4: 'square', 5: 'pentagon', 6: 'hexagon' };
  const SLOTS = {
    2: [[[29, 50], [71, 50]], 18],
    3: [[[29, 31], [71, 31], [50, 71]], 17],
    4: [[[28, 28], [72, 28], [28, 72], [72, 72]], 16],
  };
  function polySet(rng, T, k) {
    for (let t = 0; t < 200; t++) {
      const s = RM.range(k).map(() => rng.int(3, 6));
      if (s.reduce((a, b) => a + b, 0) === T) return s;
    }
    return null;
  }
  RM.register({
    id: 'edge-budget',
    name: 'Edge budget',
    difficulty: 5,
    generate(rng) {
      const totals = rng.sample(RM.range(8).map((i) => 11 + i), 3);
      const ks = (T) => [2, 3, 4].filter((k) => 3 * k <= T && 6 * k >= T);
      const panel = (T, k) => {
        const s = polySet(rng, T, k);
        RM.need(!!s);
        const slots = rng.shuffle(SLOTS[k][0]);
        return { items: s.map((t, i) => ({ t, x: slots[i][0], y: slots[i][1], rot: rng.int(0, 71) * 5, f: rng.pick(['white', 'white', 'gray', 'light']) })), r: SLOTS[k][1] };
      };
      const spec = totals.map((T, r) => {
        const opts = ks(T);
        RM.need(opts.length >= 2);
        const counts = [rng.pick(opts), rng.pick(opts), rng.pick(opts.filter((k) => k >= 3))];
        RM.need(new Set(counts).size >= 2);
        return counts.map((k) => panel(T, k));
      });
      const ans = spec[2][2];
      RM.need(ans.items.length >= 3);
      // Mixed-sign changes with no zero-sum subset: wrong totals sit on both sides of the right one.
      const deltas = rng.pick([[1, 1, -3], [-1, -1, 3], [1, -2, 3], [-1, 2, -3], [2, 2, -3], [-2, -2, 3]]);
      const idx = rng.shuffle(RM.range(ans.items.length));
      const used = [];
      const perturb = deltas.map((d) => {
        const i = idx.find((j) => !used.includes(j) && ans.items[j].t + d >= 3 && ans.items[j].t + d <= 6);
        RM.need(i !== undefined);
        used.push(i);
        return {
          apply: (s) => ((s.items[i].t += d), s),
          why: `one ${POLY[ans.items[i].t]} became a ${POLY[ans.items[i].t + d]} (${d > 0 ? '+' : '−'}${Math.abs(d)} edge${Math.abs(d) > 1 ? 's' : ''})`,
        };
      });
      const sum = (p) => p.items.reduce((a, b) => a + b.t, 0);
      return {
        hint: 'the number of shapes, their rotation and their colour are noise. Count something in every panel and compare totals along a row.',
        panels: RM.flat(spec),
        answer: ans,
        key: (s) => s.items.map((i) => i.t).join(','),
        render(sp) {
          const pic = new RM.Pic();
          sp.items.forEach((it) => RM.shape(pic, POLY[it.t], it.x, it.y, sp.r, { fill: it.f, rot: it.rot, sw: 2 }));
          return pic.svg();
        },
        perturb,
        rules: [
          { k: 'Count the edges', t: `add up the straight sides of all the polygons in a panel. Inside each row every panel has the <b>same total</b>: row 1 → ${totals[0]}, row 2 → ${totals[1]}, row 3 → ${totals[2]}.` },
          { k: 'Answer', t: `${ans.items.map((i) => i.t).join(' + ')} = <b>${sum(ans)}</b> edges. Number of shapes, rotation and fill are just noise.` },
        ],
      };
    },
  });

  /* ================================================================ Inventory */
  RM.register({
    id: 'inventory',
    name: 'Inventory',
    difficulty: 4,
    generate(rng) {
      const shapes = rng.sample(['circle', 'triangle', 'square', 'star5', 'diamond', 'heart'], 3);
      const types = [];
      shapes.forEach((s) => ['black', 'white'].forEach((c) => types.push(s + ':' + c)));
      const chosen = rng.sample(types, 4);
      RM.need(new Set(chosen.map((t) => t.split(':')[1])).size === 2);
      const inv = [];
      chosen.forEach((t) => {
        const n = rng.int(1, 3);
        for (let i = 0; i < n; i++) inv.push(t);
      });
      RM.need(inv.length >= 7 && inv.length <= 10);
      const rows = RM.range(3).map(() => {
        for (let t = 0; t < 100; t++) {
          const parts = [[], [], []];
          rng.shuffle(inv).forEach((it) => parts[rng.int(0, 2)].push(it));
          const sizes = parts.map((p) => p.length);
          if (sizes.every((n) => n >= 1 && n <= 6) && new Set(sizes).size >= 2) return parts.map((p) => p.sort());
        }
        throw RM.RETRY;
      });
      const ans = rows[2][2];
      const ansTypes = Array.from(new Set(ans));
      RM.need(ansTypes.length >= 2 && ans.length <= 5);
      const [Y, Z] = rng.sample(ansTypes, 2);
      const X = rng.pick(chosen.filter((t) => t !== Y && t !== Z));
      const Zr = Z.split(':')[0] + ':' + (Z.split(':')[1] === 'black' ? 'white' : 'black');
      const say = (t) => t.split(':')[1] + ' ' + nm(t.split(':')[0]);
      const count = (arr) => {
        const m = {};
        arr.forEach((t) => (m[t] = (m[t] || 0) + 1));
        return chosen.filter((t) => m[t]).map((t) => m[t] + ' ' + say(t) + (m[t] > 1 ? 's' : ''));
      };
      const mk = (items) => ({ items: items.slice().sort(), seed: rng.seed() });
      return {
        hint: 'positions do not matter. Compare the total contents of complete rows.',
        panels: RM.flat(rows.map((row) => row.map(mk))),
        answer: mk(ans),
        key: (s) => s.items.slice().sort().join(','),
        render(sp) {
          const pic = new RM.Pic();
          const slots = RM.rng(sp.seed).sample(RM.range(9), sp.items.length);
          sp.items.forEach((t, i) => {
            const [s, c] = t.split(':');
            RM.shape(pic, s, 24 + (slots[i] % 3) * 26, 24 + Math.floor(slots[i] / 3) * 26, 10, { fill: c, sw: 1.8 });
          });
          return pic.svg();
        },
        perturb: [
          { apply: (s) => (s.items.push(X), s.items.sort(), s), why: `one ${say(X)} too many` },
          { apply: (s) => { const i = s.items.indexOf(Y); if (i < 0) return null; s.items.splice(i, 1); return s; }, why: `a ${say(Y)} is missing` },
          { apply: (s) => { const i = s.items.indexOf(Z); if (i < 0) return null; s.items[i] = Zr; s.items.sort(); return s; }, why: `a ${say(Z)} has the wrong colour` },
        ],
        rules: [
          { k: 'Conservation', t: `positions don't matter. Each row contains, in total, the <b>same collection</b>: ${RM.list(count(inv))}.` },
          { k: 'Answer', t: `row 3 already shows ${RM.list(count(rows[2][0].concat(rows[2][1])))}, so the last panel must hold exactly <b>${RM.list(count(ans))}</b>.` },
        ],
      };
    },
  });

  /* ================================================================ Concentric rings */
  RM.register({
    id: 'concentric',
    name: 'Broken rings',
    difficulty: 3,
    generate(rng, variant) {
      const rule = ['sum', 'prog', 'diff', 'prog'][variant % 4];
      let N;
      if (rule === 'sum') N = RM.range(3).map(() => { const x = rng.int(1, 3); const y = rng.int(1, 5 - x); return [x, y, x + y]; });
      else if (rule === 'diff') N = RM.range(3).map(() => { const z = rng.int(1, 3); const y = rng.int(1, 5 - z); return [y + z, y, z]; });
      else N = RM.range(3).map(() => { const d = rng.pick([1, -1, 2, -2]); const s = d > 0 ? rng.int(1, 5 - 2 * d) : rng.int(1 - 2 * d, 5); return [s, s + d, s + 2 * d]; });
      RM.need(N.every((row) => row.every((v) => v >= 1 && v <= 5)));
      const step = rng.pick([1, 2, -1, -2, 3]);
      const base = [rng.int(0, 7), rng.int(0, 7), rng.int(0, 7)];
      const Gp = RM.grid3((r, c) => RM.mod(base[r] + step * c, 8));
      const dashes = rng.shuffle(['solid', 'dashed', 'dotted']);
      const da = rng.pick([1, 2]);
      const Ds = RM.grid3((r, c) => dashes[RM.latin(r, c, da, 0)]);
      const centers = rng.sample(['circle', 'square', 'triangle', 'star5', 'cross', 'diamond'], 3);
      const Ce = RM.grid3((r, c) => centers[RM.latin(r, c, 3 - da, 1)]);
      RM.needUnique(N, N[2][2], 'numeric');
      RM.needUnique(Gp, Gp[2][2], 'numeric', 8);
      RM.needUnique(Ds, Ds[2][2]);
      RM.needUnique(Ce, Ce[2][2]);
      const spec = RM.grid3((r, c) => ({ n: N[r][c], g: Gp[r][c], d: Ds[r][c], c: Ce[r][c] }));
      const ans = spec[2][2];
      const altN = altCount(rng, ans.n, 1, 5, []);
      const P = {
        n: { apply: (s) => ((s.n = altN), s), why: `${altN} rings instead of ${ans.n}` },
        g: { apply: (s) => ((s.g = RM.mod(ans.g - 2 * step, 8)), s), why: 'the gap points the wrong way' },
        d: { apply: (s) => ((s.d = Ds[2][1]), s), why: `the rings should be ${ans.d}` },
        c: { apply: (s) => ((s.c = Ce[2][0]), s), why: `the centre should be a ${nm(ans.c)}` },
      };
      const chosen = rng.sample(['n', 'g', 'd', 'c'], 3);
      return {
        panels: RM.flat(spec),
        answer: ans,
        render(sp) {
          const pic = new RM.Pic();
          for (let i = 0; i < sp.n; i++) {
            const rr = 43 - i * 7.6;
            const a0 = sp.g * 45 + 28;
            const a1 = sp.g * 45 - 28 + 360;
            const p = (a) => [50 + rr * Math.sin((a * Math.PI) / 180), 50 - rr * Math.cos((a * Math.PI) / 180)];
            const s = p(a0);
            const e = p(a1);
            pic.add(`<path d="M${RM.fmt(s[0])} ${RM.fmt(s[1])}A${rr} ${rr} 0 1 1 ${RM.fmt(e[0])} ${RM.fmt(e[1])}" fill="none" stroke="${RM.INK}" stroke-width="2.2"${sp.d === 'solid' ? '' : ` stroke-dasharray="${RM.dash(sp.d, 2.2)}"`} stroke-linecap="round"/>`);
          }
          RM.shape(pic, sp.c, 50, 50, 5.5, { fill: 'black', sw: 0.5 });
          return pic.svg();
        },
        perturb: chosen.map((k) => P[k]),
        rules: [
          { k: 'Number of rings', t: `${ruleText(rule, N[2])}.` },
          { k: 'Gap', t: `the opening of the rings turns <b>${RM.turn(step)}</b> from panel to panel inside each row → it points ${RM.compass(ans.g)}.` },
          { k: 'Line style', t: `solid, dashed and dotted each appear once per row and column → <b>${ans.d}</b>.` },
          { k: 'Centre', t: `each centre symbol appears once per row and column → <b>${nm(ans.c)}</b>.` },
        ],
      };
    },
  });

  /* ================================================================ Hatching */
  RM.register({
    id: 'hatching',
    name: 'Hatching',
    difficulty: 3,
    generate(rng, variant) {
      const unit = variant % 2 ? 30 : 45;
      const m = 180 / unit;
      const step = rng.pick([1, -1]);
      const base = [rng.int(0, m - 1), rng.int(0, m - 1), rng.int(0, m - 1)];
      const A = RM.grid3((r, c) => RM.mod(base[r] + step * c, m));
      const gaps = [3.6, 6.2, 9.6];
      const sa = rng.pick([1, 2]);
      const Sp = RM.grid3((r, c) => RM.latin(r, c, sa, 0));
      const outlines = rng.shuffle(['solid', 'dashed', 'thick']);
      const Ol = RM.grid3((r, c) => outlines[RM.latin(r, c, 3 - sa, 1)]);
      const shapes = rng.sample(['circle', 'square', 'hexagon', 'pentagon', 'octagon', 'diamond'], 3);
      RM.needUnique(A, A[2][2], 'numeric', m);
      RM.needUnique(Sp, Sp[2][2]);
      RM.needUnique(Ol, Ol[2][2]);
      const spec = RM.grid3((r, c) => ({ s: shapes[r], a: A[r][c] * unit, g: Sp[r][c], o: Ol[r][c] }));
      const ans = spec[2][2];
      const altA = RM.mod(ans.a + (unit === 45 ? 90 : -2 * step * unit), 180);
      const spName = ['dense', 'medium', 'sparse'];
      return {
        panels: RM.flat(spec),
        answer: ans,
        render(sp) {
          const pic = new RM.Pic();
          const sw = sp.o === 'thick' ? 4.4 : 2;
          RM.shape(pic, sp.s, 50, 50, 40, { fill: `lines:${sp.a}:${gaps[sp.g]}:1.3`, sw, dash: sp.o === 'dashed' ? 'dashed' : null });
          return pic.svg();
        },
        perturb: [
          { apply: (s) => ((s.a = altA), s), why: `the hatching lies at ${altA}° instead of ${ans.a}°` },
          { apply: (s) => ((s.g = Sp[2][1]), s), why: `the hatching should be ${spName[ans.g]}` },
          { apply: (s) => ((s.o = Ol[2][0]), s), why: `the outline should be ${ans.o}` },
        ],
        rules: [
          { k: 'Shape', t: `one shape per row → <b>${nm(ans.s)}</b>.` },
          { k: 'Angle', t: `the hatching turns <b>${unit}° ${step > 0 ? 'anticlockwise' : 'clockwise'}</b> at every step along a row → lines at ${ans.a}° from horizontal.` },
          { k: 'Density', t: `dense, medium and sparse hatching each appear once per row and column → <b>${spName[ans.g]}</b>.` },
          { k: 'Outline', t: `solid, dashed and thick outlines each appear once per row and column → <b>${ans.o}</b>.` },
        ],
      };
    },
  });
})();
