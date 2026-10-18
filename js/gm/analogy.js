/* Double analogy (grandmaster): compound figure (outer polygon, inner shape, vertex dots, side bar). A->B applies T, A->C applies U
   (each 2-3 elementary operations on different parts); D = T(U(A)) = U(T(A)). All op-sequences (<=3) consistent with the visible pairs must agree on D. */
(function () {
  'use strict';
  const RM = window.RM;
  const SH = ['arrow', 'house', 'flag', 'lshape', 'kite', 'triangle'];
  const SHN = { arrow: 'arrow', house: 'house', flag: 'flag', lshape: 'L-shape', kite: 'kite', triangle: 'triangle' };
  const FN = ['white', 'black', 'gray'];
  const mk = (s) => ({ n: s.n, inner: s.inner, fill: s.fill, rot: s.rot, dots: s.dots.slice(), bar: s.bar });
  const key = (s) => [s.n, s.inner, s.fill, s.rot, s.dots.join(''), s.bar].join('|');
  const srt = (a) => a.slice().sort((x, y) => x - y);
  const chg = (s, f) => { const t = mk(s); f(t); return t; };
  const sidesTo = (s, n) => (n < 3 || n > 6 || s.dots.some((d) => d >= n) || s.bar >= n) ? null : chg(s, (t) => { t.n = n; });
  const OPS = [
    { id: 'su', g: 'sides', f: (s) => sidesTo(s, s.n + 1), t: 'the outer polygon gains one side' },
    { id: 'sd', g: 'sides', f: (s) => sidesTo(s, s.n - 1), t: 'the outer polygon loses one side' },
    { id: 'fn', g: 'fill', f: (s) => chg(s, (t) => { t.fill = (s.fill + 1) % 3; }), t: 'the inner fill cycles white &rarr; black &rarr; gray &rarr; white' },
    { id: 'fp', g: 'fill', f: (s) => chg(s, (t) => { t.fill = (s.fill + 2) % 3; }), t: 'the inner fill cycles the other way (white &rarr; gray &rarr; black &rarr; white)' },
    { id: 'dc', g: 'dots', f: (s) => s.dots.length ? chg(s, (t) => { t.dots = srt(s.dots.map((d) => (d + 1) % s.n)); }) : null, t: 'every dot moves one vertex clockwise' },
    { id: 'dw', g: 'dots', f: (s) => s.dots.length ? chg(s, (t) => { t.dots = srt(s.dots.map((d) => (d + s.n - 1) % s.n)); }) : null, t: 'every dot moves one vertex counter-clockwise' },
    { id: 'dx', g: 'dots', f: (s) => s.dots.length && s.dots.length < s.n ? chg(s, (t) => { t.dots = RM.range(s.n).filter((i) => !s.dots.includes(i)); }) : null, t: 'dots and empty vertices exchange (the dots sit exactly on the vertices that were empty)' },
    { id: 'bn', g: 'bar', f: (s) => chg(s, (t) => { t.bar = (s.bar + 1) % s.n; }), t: 'the bar moves to the next side clockwise' },
    { id: 'bo', g: 'bar', f: (s) => s.n % 2 ? null : chg(s, (t) => { t.bar = (s.bar + s.n / 2) % s.n; }), t: 'the bar jumps to the opposite side' },
    { id: 'in', g: 'shape', f: (s) => chg(s, (t) => { t.inner = SH[(SH.indexOf(s.inner) + 1) % SH.length]; }), t: 'the inner shape becomes the next one in the list (arrow, house, flag, L-shape, kite, triangle, then back to arrow)' },
    { id: 'ip', g: 'shape', f: (s) => chg(s, (t) => { t.inner = SH[(SH.indexOf(s.inner) + SH.length - 1) % SH.length]; }), t: 'the inner shape becomes the previous one in the list (arrow, house, flag, L-shape, kite, triangle, then back to arrow)' },
    { id: 'r1', g: 'rot', f: (s) => chg(s, (t) => { t.rot = (s.rot + 1) % 4; }), t: 'the inner shape turns 90&deg; clockwise' },
    { id: 'r2', g: 'rot', f: (s) => chg(s, (t) => { t.rot = (s.rot + 2) % 4; }), t: 'the inner shape turns 180&deg;' },
    { id: 'r3', g: 'rot', f: (s) => chg(s, (t) => { t.rot = (s.rot + 3) % 4; }), t: 'the inner shape turns 90&deg; counter-clockwise' },
  ];
  const GROUPS = ['sides', 'fill', 'dots', 'bar', 'shape', 'rot'];
  const apply = (ops, s) => { for (const o of ops) { s = o.f(s); if (!s) return null; } return s; };
  const GF = {
    sides: (t, s) => { t.n = s.n; }, fill: (t, s) => { t.fill = s.fill; }, dots: (t, s) => { t.dots = s.dots.slice(); },
    bar: (t, s) => { t.bar = s.bar; }, shape: (t, s) => { t.inner = s.inner; }, rot: (t, s) => { t.rot = s.rot; },
  };
  const GN = { sides: 'number of sides', fill: 'inner fill', dots: 'dot positions', bar: 'bar position', shape: 'inner shape', rot: 'inner orientation' };
  const valid = (s) => s && s.dots.every((d) => d < s.n) && s.bar < s.n;
  const mirror = (s) => chg(s, (t) => { t.dots = srt(s.dots.map((d) => (s.n - d) % s.n)); t.bar = (s.n - 1 - s.bar + s.n) % s.n; t.rot = (4 - s.rot) % 4; });
  const describe = (s) => s.n + '-sided polygon, inner ' + SHN[s.inner] + ' (' + FN[s.fill] + ', turned ' + s.rot * 90 + '&deg;), ' +
    (s.dots.length ? s.dots.length + ' dot' + (s.dots.length > 1 ? 's' : '') + ' (vertices ' + s.dots.map((d) => d + 1).join(', ') + ' clockwise from the top)' : 'no dots') + ', bar on side ' + (s.bar + 1);

  function seqs(L) {
    const out = [[]];
    let cur = [[]];
    for (let l = 0; l < L; l++) { const nx = []; for (const q of cur) for (const o of OPS) nx.push(q.concat([o])); out.push(...nx); cur = nx; }
    return out.slice(1);
  }
  const SEQ = seqs(3);

  RM.register({
    id: 'analogy',
    name: 'Double analogy',
    difficulty: 7,
    generate(rng, variant) {
      const k = variant === 1 ? 3 : 2;
      const n = rng.int(3, 6);
      const dn = rng.int(1, n - 1);
      const A = { n, inner: rng.pick(SH), fill: rng.int(0, 2), rot: rng.int(0, 3), dots: srt(rng.sample(RM.range(n), dn)), bar: rng.int(0, n - 1) };
      const gs = rng.shuffle(GROUPS);
      const T = gs.slice(0, k).map((g) => rng.pick(OPS.filter((o) => o.g === g)));
      const U = gs.slice(k, 2 * k).map((g) => rng.pick(OPS.filter((o) => o.g === g)));
      const B = apply(T, A), C = apply(U, A);
      RM.need(B && C);
      const D = apply(U, B), D2 = apply(T, C);
      RM.need(D && D2 && key(D) === key(D2));
      const kA = key(A), kB = key(B), kC = key(C), kD = key(D);
      RM.need(kB !== kA && kC !== kA && kB !== kC && kD !== kB && kD !== kC && kD !== kA);
      // identifiability: every op-sequence consistent with A->B (A->C) must give D
      const nT = [], nU = [];
      for (const q of SEQ) {
        const r = apply(q, A);
        if (!r) continue;
        const kr = key(r);
        if (kr === kB) { const p = apply(q, C); RM.need(p && key(p) === kD); nT.push(q); }
        if (kr === kC) { const p = apply(q, B); RM.need(p && key(p) === kD); nU.push(q); }
      }
      // distractors
      const cand = new Map();
      const add = (s, flaw, pr) => {
        if (!valid(s)) return;
        const kk = key(s);
        if (kk === kD) return;
        if (!cand.has(kk)) cand.set(kk, { spec: s, flaws: [flaw], pr, r: rng.next() });
      };

      // T alone on C equals D by commutation, so use partial operations instead
      for (let i = 0; i < k; i++) {
        const Tm = T.filter((_, j) => j !== i), Um = U.filter((_, j) => j !== i);
        const a = apply(Tm, C), b = apply(Um, B);
        if (a) add(a, 'the across change is only partly applied: "' + T[i].t + '" is missing', 1);
        if (b) add(b, 'the downward change is only partly applied: "' + U[i].t + '" is missing', 1);
      }
      add(mk(C), 'this is C unchanged: the across change was not applied', 3);
      for (const g of GROUPS) {
        [[A, 'A'], [B, 'B'], [C, 'C']].forEach(([S, nm]) => {
          const t = mk(D); GF[g](t, S);
          add(t, 'the ' + GN[g] + ' is copied from ' + nm + ' instead of following both changes', 1);
        });
      }
      for (const o of OPS) { const t = o.f(D); if (t) add(t, 'one operation too many: ' + o.t + ' was applied again', 2); }
      const mD = mirror(D);
      add(mD, 'this is the mirror image of the answer', 2);
      const pool = [...cand.values()].sort((x, y) => x.pr - y.pr || x.r - y.r);
      RM.need(pool.length >= 7);
      const pick = pool.slice(0, 7);
      const options = pick.map((c) => ({ spec: c.spec, flaws: c.flaws })).concat([{ spec: D, flaws: [] }]);
      const names = (L) => L.map((o) => o.t).join('; ');
      return {
        size: 2,
        panels: [A, B, C],
        answer: D,
        options,
        hint: 'Read the change across and the change down. They affect different parts, and both apply to the missing figure.',
        rules: [
          { k: 'Figure', t: 'Each figure has an outer polygon, an inner shape (fill and orientation), dots on vertices (counted clockwise from the top vertex) and a bar on one side.' },
          { k: 'Across (A &rarr; B)', t: 'Compare the top row: ' + names(T) + '.' },
          { k: 'Down (A &rarr; C)', t: 'Compare the left column: ' + names(U) + '.' },
          { k: 'They are independent', t: 'The two changes act on different parts of the figure, so they can be combined in any order: applying the across change to C gives the same as applying the downward change to B.' },
          { k: 'Missing figure', t: 'Start from C (or B) and add the other change. Result: <b>' + describe(D) + '</b>.' },
        ],
        difficulty: variant === 1 ? 8 : 7,
        render(s) {
          const pic = new RM.Pic();
          const R = 33, cx = 50, cy = 50;
          const pts = RM.range(s.n).map((i) => { const a = (-90 + 360 * i / s.n) * Math.PI / 180; return [cx + R * Math.cos(a), cy + R * Math.sin(a)]; });
          RM.polygon(pic, pts, { fill: RM.WHITE, sw: 2.6 });
          const ba = (-90 + 360 * (s.bar + 0.5) / s.n) * Math.PI / 180, ap = R * Math.cos(Math.PI / s.n);
          RM.line(pic, cx + (ap + 1) * Math.cos(ba), cy + (ap + 1) * Math.sin(ba), cx + (ap + 10) * Math.cos(ba), cy + (ap + 10) * Math.sin(ba), { sw: 6.5, color: RM.INK });
          RM.shape(pic, s.inner, cx, cy, s.n === 3 ? 10 : 13, { fill: pic.paint(FN[s.fill]), rot: s.rot * 90, sw: 2 });
          for (const d of s.dots) RM.circle(pic, pts[d][0], pts[d][1], 4.6, { fill: RM.INK, sw: 1.2, stroke: RM.WHITE });
          return pic.svg();
        },
        key,
      };
    },
  });
})();
