/* Closure (grandmaster): each panel is a 5x5 table of a relation on the symbols A-E (black square in row X, column Y = "X leads to Y").
 * Panel 3 of every row is the transitive closure of the union of panels 1 and 2: all arrows of both, plus a direct arrow X->Z whenever a chain
 * of any length leads from X to Z (and X->X when X lies on a cycle). */
(function () {
  'use strict';
  const RM = window.RM;
  const N = 5;
  const NAMES = 'ABCDE';
  const zero = () => new Array(N * N).fill(0);
  const uni = (a, b) => a.map((v, k) => v | b[k]);
  const comp = (a, b) => {
    const r = zero();
    for (let i = 0; i < N; i++) for (let k = 0; k < N; k++) if (a[i * N + k]) for (let j = 0; j < N; j++) if (b[k * N + j]) r[i * N + j] = 1;
    return r;
  };
  const closure = (a) => {
    const r = a.slice();
    for (let k = 0; k < N; k++) for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (r[i * N + k] && r[k * N + j]) r[i * N + j] = 1;
    return r;
  };
  const tr = (a) => a.map((v, k) => a[(k % N) * N + Math.floor(k / N)]);
  const ident = () => zero().map((v, k) => (k % N === Math.floor(k / N) ? 1 : 0));
  const cnt = (a) => a.reduce((s, v) => s + v, 0);
  const eq = (a, b) => a.every((v, k) => v === b[k]);
  const hasCycle = (c) => RM.range(N).some((i) => c[i * N + i]);
  const cells = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (i !== j) cells.push(i * N + j);
  const nm = (k) => NAMES[Math.floor(k / N)] + '→' + NAMES[k % N];
  const list = (rel) => rel.map((v, k) => (v ? nm(k) : null)).filter(Boolean);

  const HYPS = [
    ['union', (a, b) => uni(a, b)],
    ['comp12', (a, b) => comp(a, b)],
    ['comp21', (a, b) => comp(b, a)],
    ['compboth', (a, b) => uni(comp(a, b), comp(b, a))],
    ['two', (a, b) => { const u = uni(a, b); return uni(u, comp(u, u)); }],
    ['three', (a, b) => { const u = uni(a, b); const u2 = comp(u, u); return uni(u, uni(u2, comp(u2, u))); }],
    ['sep', (a, b) => uni(closure(a), closure(b))],
    ['sepA', (a, b) => uni(closure(a), b)],
    ['sepB', (a, b) => uni(a, closure(b))],
    ['refl', (a, b) => uni(closure(uni(a, b)), ident())],
    ['clcomp', (a, b) => closure(comp(a, b))],
    ['sym', (a, b) => { const c = closure(uni(a, b)); return uni(c, tr(c)); }],
    ['uniclA', (a, b) => closure(a)],
    ['uniclB', (a, b) => closure(b)],
  ];

  function genRow(rng, cfg, cyc) {
    for (let t = 0; t < 500; t++) {
      const a = zero();
      const b = zero();
      rng.sample(cells, rng.int(cfg.lo, cfg.hi)).forEach((k) => (a[k] = 1));
      rng.sample(cells, rng.int(cfg.lo, cfg.hi)).forEach((k) => (b[k] = 1));
      const u = uni(a, b);
      if (cnt(a) + cnt(b) - cnt(u) > 1) continue;
      const c = closure(u);
      if (cnt(c) - cnt(u) < 3 || cnt(c) > cfg.maxc) continue;
      if (cyc !== null && hasCycle(c) !== cyc) continue;
      if (eq(c, uni(u, comp(u, u)))) continue;
      return { a, b, c };
    }
    RM.need(false);
  }

  function witness(u, i, j) {
    const prev = new Array(N).fill(-2);
    const q = [];
    for (let k = 0; k < N; k++) if (u[i * N + k]) { prev[k] = i; q.push(k); }
    while (q.length) {
      const x = q.shift();
      for (let k = 0; k < N; k++) if (u[x * N + k] && prev[k] === -2) { prev[k] = x; q.push(k); }
    }
    if (prev[j] === -2) return null;
    const p = [j];
    let x = j;
    do { x = prev[x]; p.unshift(x); } while (x !== i);
    return p.map((n) => NAMES[n]).join('→');
  }

  RM.register({
    id: 'closure',
    name: 'Closure',
    difficulty: 8,
    generate(rng, variant) {
      const cfg = [
        { lo: 3, hi: 4, maxc: 14 },
        { lo: 3, hi: 4, maxc: 13 },
        { lo: 4, hi: 4, maxc: 15 },
        { lo: 3, hi: 4, maxc: 14 },
      ][variant];
      let cyc;
      if (variant === 0) { const r = rng.int(0, 1); cyc = [r === 0, r === 1, rng.chance(0.5)]; }
      else if (variant === 1) cyc = [false, false, false];
      else if (variant === 2) cyc = [true, true, true];
      else cyc = [false, false, true];
      const rows = cyc.map((cy) => genRow(rng, cfg, cy));
      const rkey = (rel) => rel.join('');
      RM.need(new Set(rows.map((r) => rkey(r.a))).size === 3 && new Set(rows.map((r) => rkey(r.b))).size === 3 && new Set(rows.map((r) => rkey(r.c))).size === 3);
      const A = rows[2].c;
      const Ak = rkey(A);
      // hypotheses: every alternative reading must contradict rows 1-2
      HYPS.forEach((h) => {
        const ok = eq(h[1](rows[0].a, rows[0].b), rows[0].c) && eq(h[1](rows[1].a, rows[1].b), rows[1].c);
        RM.need(!ok || (h[0] === 'three' && eq(h[1](rows[2].a, rows[2].b), A)));
      });
      for (let t = 0; t < 16; t++) {
        const f = (x, y) => (t >> (x * 2 + y)) & 1;
        const pr = (r) => r.a.map((v, k) => f(v, r.b[k]));
        if (eq(pr(rows[0]), rows[0].c) && eq(pr(rows[1]), rows[1].c)) RM.need(eq(pr(rows[2]), A));
      }
      // distractors
      const u = uni(rows[2].a, rows[2].b);
      const named = [];
      const near = [];
      const seen = new Set([Ak]);
      const add = (list2, spec, text) => {
        const k = rkey(spec);
        if (seen.has(k)) return;
        seen.add(k);
        const miss = [];
        const extra = [];
        spec.forEach((v, c) => { if (A[c] && !v) miss.push(c); if (!A[c] && v) extra.push(c); });
        const fl = [text];
        if (miss.length) fl.push('missing ' + miss.slice(0, 3).map((c) => nm(c) + (u[c] ? '' : ' (' + witness(u, Math.floor(c / N), c % N) + ')')).join(', ') + (miss.length > 3 ? ' and ' + (miss.length - 3) + ' more' : '') + '.');
        if (extra.length) fl.push(extra.slice(0, 3).map(nm).join(', ') + (extra.length > 1 ? ' are' : ' is') + ' shown, but no chain of arrows leads there' + (extra.length > 3 ? ' (and ' + (extra.length - 3) + ' more like it)' : '') + '.');
        list2.push({ spec, d: miss.length + extra.length, fl });
      };
      const T = {
        union: 'This is only the union of panels 1 and 2: the arrows implied by chains were not added.',
        two: 'Only chains of two arrows were shortcut; longer chains (three or more arrows) still give direct arrows.',
        three: 'Chains were followed only up to three arrows; a longer chain also gives a direct arrow.',
        sep: 'The closure was done on each panel separately and merged: chains that mix an arrow of panel 1 with an arrow of panel 2 were missed.',
        sepA: 'Only panel 1 was closed; chains through panel 2 arrows were not completed.',
        sepB: 'Only panel 2 was closed; chains through panel 1 arrows were not completed.',
        refl: 'Every symbol was also linked to itself, but X leads to X only when X lies on a cycle.',
        clcomp: 'Only "panel-1 arrow then panel-2 arrow" chains were used; the original arrows are lost.',
        sym: 'Arrows were treated as two-way, but they only go from row symbol to column symbol.',
        comp12: 'Only "panel-1 arrow then panel-2 arrow" chains were drawn.',
        comp21: 'Only "panel-2 arrow then panel-1 arrow" chains were drawn.',
        compboth: 'Only two-arrow chains mixing the panels were drawn; the original arrows are lost.',
        uniclA: 'The result of panel 1 alone was closed; panel 2 was ignored.',
        uniclB: 'The result of panel 2 alone was closed; panel 1 was ignored.',
        transp: 'The table is read the wrong way round (a black square must mean row symbol → column symbol).',
      };
      HYPS.forEach((h) => add(named, h[1](rows[2].a, rows[2].b), T[h[0]]));
      add(named, tr(A), T.transp);
      const derived = [];
      A.forEach((v, k) => { if (v && !u[k]) derived.push(k); });
      derived.forEach((k) => { const s = A.slice(); s[k] = 0; add(near, s, 'One implied arrow is missing.'); });
      // extra arrows: converse of a derived arrow, or a cell reachable only backwards
      cells.concat(RM.range(N).map((i) => i * N + i)).forEach((k) => {
        if (A[k]) return;
        const i = Math.floor(k / N);
        const j = k % N;
        if (A[j * N + i] || (i === j)) { const s = A.slice(); s[k] = 1; add(near, s, 'One arrow was added that no chain justifies.'); }
      });
      derived.forEach((k) => {
        [-1, 1, N, -N].forEach((dd) => {
          const k2 = k + dd;
          if (k2 < 0 || k2 >= N * N || (dd === 1 && k2 % N === 0) || (dd === -1 && k % N === 0) || A[k2]) return;
          const s = A.slice(); s[k] = 0; s[k2] = 1; add(near, s, 'An implied arrow was drawn in the wrong cell.');
        });
      });
      let pick = null;
      for (let t = 0; t < 60 && !pick; t++) {
        const nm1 = rng.shuffle(named.filter((x) => x.d <= 7)).slice(0, rng.int(3, 5));
        const rest = rng.shuffle(near).slice(0, 7 - nm1.length);
        const all = nm1.concat(rest);
        if (all.length !== 7) continue;
        const more = all.filter((x) => cnt(x.spec) > cnt(A)).length;
        const less = all.filter((x) => cnt(x.spec) < cnt(A)).length;
        if (more >= 2 && less >= 2) pick = all;
      }
      RM.need(pick);
      const options = [{ spec: A, flaws: [] }].concat(pick.map((x) => ({ spec: x.spec, flaws: x.fl })));
      const panels = [];
      rows.forEach((r, i) => { panels.push(r.a, r.b); if (i < 2) panels.push(r.c); });

      const ed = (rel) => list(rel).join(', ') || 'none';
      const drv = derived.map((k) => nm(k) + ' (' + witness(u, Math.floor(k / N), k % N) + ')');
      const cycl = RM.range(N).filter((i) => A[i * N + i]).map((i) => NAMES[i]);
      const ex = (() => {
        const r = rows[0];
        const uu = uni(r.a, r.b);
        const d = r.c.map((v, k) => (v && !uu[k] ? k : -1)).filter((k) => k >= 0);
        const k = d.slice().sort((x, y) => witness(uu, Math.floor(y / N), y % N).length - witness(uu, Math.floor(x / N), x % N).length)[0];
        return nm(k) + ' appears in the 3rd panel of row 1 through ' + witness(uu, Math.floor(k / N), k % N);
      })();
      return {
        panels,
        answer: A,
        options,
        render: renderRel,
        key: (s) => s.join(''),
        rules: [
          { k: 'Reading a table', t: 'Each panel is a table on the symbols A to E. A black square in <b>row X, column Y</b> means "X leads to Y" (an arrow X→Y). A black square on the diagonal means X leads back to itself.' },
          { k: 'Rule of the rows', t: 'In every row the 1st and 2nd panels are two sets of arrows and the 3rd panel contains everything that can be <b>reached by following arrows of either panel, one after the other</b>: first take all arrows of both panels, then whenever X→Y and Y→Z exist add X→Z, and keep going until nothing new appears. This holds for chains of any length (e.g. ' + ex + '), and X→X appears only if X lies on a cycle.' },
          { k: 'Not just the union', t: 'The union alone, two-step chains only, each panel closed separately, composing panel 1 with panel 2, or adding self-links all fail on rows 1 and 2.' },
          { k: 'Last row', t: 'Panel 1: ' + ed(rows[2].a) + '. Panel 2: ' + ed(rows[2].b) + '. Union: ' + ed(u) + '.<br>Implied arrows: ' + (drv.join(', ') || 'none') + (cycl.length ? '; the cycle makes ' + cycl.join(', ') + ' lead to itself' : '') + '.' },
          { k: 'Answer', t: 'The missing table contains exactly these ' + cnt(A) + ' arrows: <b>' + ed(A) + '</b>.' },
        ],
        hint: 'Think of the black squares as arrows: what can you reach by following several of them in a row, using both panels?',
      };
    },
  });

  function renderRel(rel) {
    const pic = new RM.Pic();
    const c = 14.4;
    const x0 = 6.5;
    const y0 = 6.5;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const x = x0 + (j + 1) * c;
        const y = y0 + (i + 1) * c;
        pic.add(`<rect x="${RM.fmt(x)}" y="${RM.fmt(y)}" width="${c}" height="${c}" fill="${i === j ? RM.FAINT : RM.WHITE}" stroke="${RM.GRAY}" stroke-width="0.9"/>`);
        if (rel[i * N + j]) pic.add(`<rect x="${RM.fmt(x + 1.6)}" y="${RM.fmt(y + 1.6)}" width="${RM.fmt(c - 3.2)}" height="${RM.fmt(c - 3.2)}" fill="${RM.INK}"/>`);
      }
      const t = (cx, cy) => `<text x="${RM.fmt(cx)}" y="${RM.fmt(cy + 3.6)}" font-family="Arial,Helvetica,sans-serif" font-size="10.5" font-weight="700" text-anchor="middle" fill="${RM.INK}">${NAMES[i]}</text>`;
      pic.add(t(x0 + (i + 1.5) * c, y0 + c / 2));
      pic.add(t(x0 + c / 2, y0 + (i + 1.5) * c));
    }
    RM.line(pic, x0 + c, y0 + c, x0 + c, y0 + 6 * c, { sw: 1.8, color: RM.INK, cap: 'butt' });
    RM.line(pic, x0 + c, y0 + c, x0 + 6 * c, y0 + c, { sw: 1.8, color: RM.INK, cap: 'butt' });
    return pic.svg();
  }
})();
