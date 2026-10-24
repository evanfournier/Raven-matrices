/* Coupled counts (grandmaster): every panel shows b black dots (upper half) and w white dots (lower half). Along every
 * row the SAME hidden rule turns the pair (b, w) of one panel into the pair of the next one, each new count being
 * computed from BOTH old counts, e.g. b' = w, w' = b + w, or b' = w + 1, w' = |b - w|. Rows 1-2 give four transitions,
 * row 3 one more. Hypotheses checked: for each component all forms alpha*b + beta*w + gamma (alpha, beta in -1..2,
 * gamma in -2..2) and |b - w + g1| + g2 that reproduce the visible transitions must predict the same new count; the
 * same rule read down the columns, and simple Raven rules on b, w and b+w (needNoConflict) must not disagree either. */
(function () {
  'use strict';
  const RM = window.RM;

  const ev = (f, b, w) => (f.t === 'lin' ? f.a * b + f.b * w + f.c : Math.abs(b - w + f.c1) + f.c2);
  const FORMS = [];
  for (let a = -1; a <= 2; a++) for (let b = -1; b <= 2; b++) for (let c = -2; c <= 2; c++) FORMS.push({ t: 'lin', a, b, c });
  for (let c1 = -2; c1 <= 2; c1++) for (let c2 = -2; c2 <= 2; c2++) FORMS.push({ t: 'abs', c1, c2 });

  const inner = (f, X, Y) => {
    if (f.t === 'abs') {
      const s = X + ' − ' + Y + (f.c1 ? (f.c1 > 0 ? ' + ' : ' − ') + Math.abs(f.c1) : '');
      return '|' + s + '|' + (f.c2 ? (f.c2 > 0 ? ' + ' : ' − ') + Math.abs(f.c2) : '');
    }
    const parts = [];
    if (f.a) parts.push([f.a, X]);
    if (f.b) parts.push([f.b, Y]);
    let s = '';
    parts.forEach(([c, n], i) => {
      const m = Math.abs(c);
      const t = m === 1 ? n : m + ' × ' + n;
      s += i === 0 ? (c < 0 ? '−' : '') + t : (c < 0 ? ' − ' : ' + ') + t;
    });
    if (!parts.length) return String(f.c);
    if (f.c) s += (f.c > 0 ? ' + ' : ' − ') + Math.abs(f.c);
    return s;
  };
  const dependsW = (f) => f.t === 'abs' || f.b !== 0;
  const dependsB = (f) => f.t === 'abs' || f.a !== 0;
  const CURATED = [
    [{ t: 'lin', a: 0, b: 1, c: 1 }, { t: 'abs', c1: 0, c2: 0 }],
    [{ t: 'lin', a: 0, b: 1, c: 0 }, { t: 'lin', a: 1, b: 1, c: 0 }],
    [{ t: 'abs', c1: 0, c2: 0 }, { t: 'lin', a: 1, b: 0, c: 1 }],
    [{ t: 'lin', a: 1, b: 1, c: 0 }, { t: 'abs', c1: 0, c2: 0 }],
    [{ t: 'lin', a: 0, b: 1, c: 1 }, { t: 'lin', a: 1, b: 1, c: -1 }],
  ];

  const ZX = [20, 40, 60, 80];
  function render(sp) {
    const pic = new RM.Pic();
    RM.line(pic, 12, 50, 88, 50, { sw: 1.2, color: RM.LIGHT, dash: '3 3' });
    for (let i = 0; i < sp.b; i++) RM.circle(pic, ZX[i % 4], 17 + 20 * Math.floor(i / 4), 7.5, { fill: 'black', sw: 1.8 });
    for (let i = 0; i < sp.w; i++) RM.circle(pic, ZX[i % 4], 63 + 20 * Math.floor(i / 4), 7.5, { fill: 'white', sw: 1.8 });
    return pic.svg();
  }
  const key = (sp) => sp.b + ',' + sp.w;

  RM.register({
    id: 'coupled-counts',
    name: 'Coupled counts',
    difficulty: 8,
    generate(rng, variant) {
      /* hidden rule */
      let fb;
      let fw;
      if (variant === 0) [fb, fw] = rng.pick(CURATED);
      else {
        const lin = () => ({ t: 'lin', a: rng.pick([-1, 0, 1, 1, 2]), b: rng.pick([-1, 1, 1, 2]), c: rng.int(-2, 2) });
        fb = rng.chance(0.2) ? { t: 'abs', c1: 0, c2: rng.int(-1, 1) } : lin();
        fw = rng.chance(0.3) ? { t: 'abs', c1: 0, c2: rng.int(-1, 1) } : lin();
        if (fw.t === 'lin') fw.a = rng.pick([1, 1, 2, -1]);
      }
      RM.need(dependsW(fb) && dependsB(fw));
      const F = (p) => ({ b: ev(fb, p.b, p.w), w: ev(fw, p.b, p.w) });
      const inR = (p) => p.b >= 0 && p.w >= 0 && p.b <= 8 && p.w <= 8;

      /* rows */
      const rows = [];
      for (let r = 0; r < 3; r++) {
        let row = null;
        for (let t = 0; t < 40 && !row; t++) {
          const p0 = { b: rng.int(0, 6), w: rng.int(0, 6) };
          const p1 = F(p0);
          const p2 = F(p1);
          if (inR(p1) && inR(p2) && key(p0) !== key(p1) && key(p1) !== key(p2) && key(p0) !== key(p2) && !rows.some((x) => key(x[0]) === key(p0))) row = [p0, p1, p2];
        }
        RM.need(row);
        rows.push(row);
      }
      const P = rows;
      const ans = P[2][2];
      const flat = [].concat(...P);
      RM.need(new Set(flat.map(key)).size >= 7);
      RM.need(!flat.slice(0, 8).some((p) => key(p) === key(ans)));
      RM.need(flat.slice(0, 8).filter((p) => p.b + p.w === 0).length === 0);

      /* identifiability of the rule: horizontal transitions */
      const comp = (trans, k) => FORMS.filter((f) => trans.every(([from, to]) => ev(f, from.b, from.w) === to[k]));
      const H = [[P[0][0], P[0][1]], [P[0][1], P[0][2]], [P[1][0], P[1][1]], [P[1][1], P[1][2]], [P[2][0], P[2][1]]];
      const hb = comp(H, 'b');
      const hw = comp(H, 'w');
      RM.need(hb.length > 0 && hw.length > 0);
      RM.need(hb.every((f) => ev(f, P[2][1].b, P[2][1].w) === ans.b) && hw.every((f) => ev(f, P[2][1].b, P[2][1].w) === ans.w));
      /* the same rule read down the columns must not fit (or must give the same answer) */
      const V = [[P[0][0], P[1][0]], [P[1][0], P[2][0]], [P[0][1], P[1][1]], [P[1][1], P[2][1]]];
      const vb = comp(V, 'b');
      const vw = comp(V, 'w');
      if (vb.length && vw.length) RM.need(vb.every((f) => ev(f, P[1][2].b, P[1][2].w) === ans.b) && vw.every((f) => ev(f, P[1][2].b, P[1][2].w) === ans.w));
      /* simple Raven rules on each count and on the total must not predict anything else */
      const g = (fn) => RM.grid3((r, c) => (r === 2 && c === 2 ? undefined : fn(P[r][c])));
      RM.needNoConflict(g((p) => p.b), ans.b, 'numeric');
      RM.needNoConflict(g((p) => p.w), ans.w, 'numeric');
      RM.needNoConflict(g((p) => p.b + p.w), ans.b + ans.w, 'numeric');
      RM.needNoConflict(g((p) => Math.abs(p.b - p.w)), Math.abs(ans.b - ans.w), 'numeric');

      /* distractors */
      const a1 = P[2][0];
      const a2 = P[2][1];
      const pool = new Map();
      const put = (p, sc, why) => {
        if (!inR(p) || key(p) === key(ans)) return;
        const k = key(p);
        const flaws = [`${p.b} black and ${p.w} white: ${why ? why + '; ' : ''}the rule gives ${ans.b} black and ${ans.w} white`];
        const score = sc + rng.next() * 0.7;
        if (!pool.has(k) || pool.get(k).score > score) pool.set(k, { spec: { b: p.b, w: p.w }, flaws, score });
      };
      put({ b: ans.w, w: ans.b }, 0.5, 'the black and white counts are swapped');
      put(F(ans), 0.7, 'this is the result of applying the rule three times in a row; panel 9 needs it only once more after panel 8');
      put(a2, 0.8, 'this just repeats panel 8; the rule must be applied once more');
      put({ b: ans.b, w: a2.w }, 1, 'only the black count was updated, the white count must change as well');
      put({ b: a2.b, w: ans.w }, 1, 'only the white count was updated, the black count must change as well');
      put({ b: 2 * a2.b - a1.b, w: 2 * a2.w - a1.w }, 1.1, 'this continues the arithmetic progression of the last two panels, but the counts follow the coupled rule');
      put({ b: a2.b + a1.b, w: a2.w + a1.w }, 1.6, 'this adds the last two panels');
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([db, dw]) => put({ b: ans.b + db, w: ans.w + dw }, 1.2, `the ${db ? 'black' : 'white'} count is off by one`));
      [[1, 1], [-1, -1], [1, -1], [-1, 1]].forEach(([db, dw]) => put({ b: ans.b + db, w: ans.w + dw }, 1.8, 'both counts are off by one'));
      [[2, 0], [-2, 0], [0, 2], [0, -2]].forEach(([db, dw]) => put({ b: ans.b + db, w: ans.w + dw }, 2.2, `the ${db ? 'black' : 'white'} count is off by two`));
      /* near-miss rules: fit all transitions but one */
      [['b', 'w'], ['w', 'b']].forEach(([k]) => {
        for (let skip = 0; skip < 5; skip++) {
          const t = H.filter((_, i) => i !== skip);
          const fs = comp(t, k).filter((f) => ev(f, a2.b, a2.w) !== ans[k]);
          if (!fs.length) continue;
          const f = fs[0];
          const p = { b: ans.b, w: ans.w };
          p[k] = ev(f, a2.b, a2.w);
          put(p, 1.5, `the ${k === 'b' ? 'black' : 'white'} count comes from a rule that does not fit every visible transition`);
        }
      });
      let chosen = null;
      for (let t = 0; t < 30 && !chosen; t++) {
        const list = [...pool.values()].map((o) => ({ o, r: o.score + rng.next() * 1.4 })).sort((x, y) => x.r - y.r).slice(0, 7).map((x) => x.o);
        const specs = list.map((o) => o.spec).concat([ans]);
        const uniq = (k) => {
          const m = {};
          specs.forEach((s) => (m[s[k]] = (m[s[k]] || 0) + 1));
          return Object.values(m).filter((x) => x >= m[ans[k]]).length === 1;
        };
        if (!(uniq('b') && uniq('w')) && list.some((o) => o.spec.b === ans.b) && list.some((o) => o.spec.w === ans.w)) chosen = list;
      }
      RM.need(chosen);

      /* correction */
      const rowTxt = (r) => `(${P[r][0].b}, ${P[r][0].w}) → (${P[r][1].b}, ${P[r][1].w})` + (r < 2 ? ` → (${P[r][2].b}, ${P[r][2].w})` : '');
      const calc = (f, p) => {
        const e = inner(f, p.b, p.w);
        const v = ev(f, p.b, p.w);
        return (e === String(v) ? '' : e + ' = ') + `<b>${v}</b>`;
      };
      const rules = [
        { k: 'Panels', t: 'each panel holds <b>b black dots</b> (upper half) and <b>w white dots</b> (lower half). Read each panel as a pair (b, w).' },
        { k: 'Rule', t: `along every row the <b>same rule</b> turns a pair into the next one, and each new count depends on <b>both</b> old counts: <b>new black = ${inner(fb, 'old black', 'old white')}</b> and <b>new white = ${inner(fw, 'old black', 'old white')}</b>. Row 1: ${rowTxt(0)}; row 2: ${rowTxt(1)}; row 3 so far: (${a1.b}, ${a1.w}) → (${a2.b}, ${a2.w}). All five visible steps obey the rule; swapping the roles of the colours or reading it down the columns does not work.` },
        { k: 'Panel 9', t: `apply the rule once more to panel 8, (${a2.b}, ${a2.w}): new black = ${calc(fb, a2)}; new white = ${calc(fw, a2)}.` },
        { k: 'Answer', t: `<b>${ans.b} black</b> dot${ans.b === 1 ? '' : 's'} in the upper half and <b>${ans.w} white</b> dot${ans.w === 1 ? '' : 's'} in the lower half.` },
      ];
      return {
        difficulty: 8,
        hint: 'each new count is computed from both old counts, the same way in every row.',
        panels: flat.slice(0, 8).map((p) => ({ b: p.b, w: p.w })),
        answer: { b: ans.b, w: ans.w },
        options: [{ spec: { b: ans.b, w: ans.w }, flaws: [] }].concat(chosen.map((o) => ({ spec: o.spec, flaws: o.flaws }))),
        render,
        key,
        rules,
      };
    },
  });
})();
