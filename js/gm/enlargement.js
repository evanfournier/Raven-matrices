/* Enlargement (grandmaster): a lattice with a marked point O and a polygon. Column 2 is the polygon enlarged about O by
 * a factor k (2, -2, 1/2 or -1/2, fixed per puzzle); column 3 enlarges column 2 again by the same factor about the same
 * O (so the total factor is k squared). O differs from row to row. */
(function () {
  'use strict';
  const RM = window.RM;
  const R = 8;
  const px = (x) => 50 + 5 * x, py = (y) => 50 - 5 * y;
  const rd = (v) => Math.round(v * 1e6) / 1e6;
  const pk = (p) => rd(p[0]) + ',' + rd(p[1]);
  const setKey = (pts) => pts.map(pk).sort().join('|');
  const scale = (pts, o, f) => pts.map((p) => [o[0] + f * (p[0] - o[0]), o[1] + f * (p[1] - o[1])]);
  const isInt = (pts) => pts.every((p) => Math.abs(p[0] - Math.round(p[0])) < 1e-9 && Math.abs(p[1] - Math.round(p[1])) < 1e-9);
  const inLat = (pts) => pts.every((p) => Math.abs(p[0]) <= R && Math.abs(p[1]) <= R);
  const keyOf = (s) => s.O.join(',') + '#' + setKey(s.P);
  const dist = (a, b) => {
    const A = a.P.map(pk), B = b.P.map(pk);
    return A.filter((x) => !B.includes(x)).length + B.filter((x) => !A.includes(x)).length;
  };
  const frac = (f) => {
    const s = f < 0 ? '−' : '', a = Math.abs(f);
    return s + (a >= 1 ? String(a) : '1/' + Math.round(1 / a));
  };
  const cen = (pts) => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
  const fmtP = (p) => `(${p[0]}, ${p[1]})`;

  function pick7(rng, ans, cands) {
    const seen = new Set([ans.key]), pool = [];
    for (const c of cands) if (!seen.has(c.key)) { seen.add(c.key); pool.push(c); }
    RM.need(pool.length >= 7);
    for (let t = 0; t < 40; t++) {
      const by = {};
      rng.shuffle(pool).forEach((c) => (by[c.tag] = by[c.tag] || []).push(c));
      const tags = rng.shuffle(Object.keys(by)), out = [];
      for (let i = 0; out.length < 7 && i < 12; i++) for (const tg of tags) if (by[tg][i] && out.length < 7) out.push(by[tg][i]);
      if (out.length < 7) continue;
      const all = [ans].concat(out), sums = all.map((a) => all.reduce((s, b) => s + dist(a.spec, b.spec), 0));
      const o = sums.slice(1);
      if (sums[0] > Math.min(...o) && sums[0] < Math.max(...o)) return out;
    }
    RM.need(false);
  }

  function genRow(rng, F) {
    for (let t = 0; t < 120; t++) {
      const n = rng.pick([3, 3, 4, 4, 5]);
      const O = [rng.int(-4, 4), rng.int(-4, 4)];
      const lo = (o) => Math.max(-2, Math.ceil((-R - o) / 4)), hi = (o) => Math.min(2, Math.floor((R - o) / 4));
      const pts = [];
      for (let i = 0; i < 40 && pts.length < n; i++) {
        const p = [rng.int(lo(O[0]), hi(O[0])), rng.int(lo(O[1]), hi(O[1]))];
        if (!pts.some((q) => q[0] === p[0] && q[1] === p[1])) pts.push(p);
      }
      if (pts.length < n) continue;
      const c = cen(pts);
      const b = pts.slice().sort((p, q) => Math.atan2(p[1] - c[1], p[0] - c[0]) - Math.atan2(q[1] - c[1], q[0] - c[0]));
      let ok = true, area = 0;
      for (let i = 0; i < n; i++) {
        const p = b[i], q = b[(i + 1) % n];
        area += p[0] * q[1] - q[0] * p[1];
        const a1 = Math.atan2(p[1] - c[1], p[0] - c[0]);
        let gap = Math.atan2(q[1] - c[1], q[0] - c[0]) - a1;
        if (gap <= 1e-9) gap += 2 * Math.PI;
        if (gap >= Math.PI - 1e-9 || gap < 1e-6) ok = false;
      }
      if (!ok || Math.abs(area) < 8) continue;
      if (b.some((p) => (p[0] === 0 && p[1] === 0))) continue;
      const P = F.map((f) => b.map((p) => [O[0] + f * p[0], O[1] + f * p[1]]));
      if (!P.every(inLat)) continue;
      return { O, P };
    }
    return null;
  }

  RM.register({
    id: 'enlargement',
    name: 'Enlargement',
    difficulty: 7,
    generate(rng, variant) {
      const k = [rng.pick([-2, -0.5]), rng.pick([2, 0.5]), rng.pick([-2, -0.5]), rng.pick([2, 0.5, -2, -0.5])][variant];
      const F = [1, k, k * k].map((f) => (Math.abs(k) < 1 ? 4 * f : f));
      const rows = [];
      for (let r = 0; r < 3; r++) {
        const row = genRow(rng, F);
        RM.need(row);
        rows.push(row);
      }
      RM.need(rows[0].O.join() !== rows[1].O.join() && rows[0].O.join() !== rows[2].O.join() && rows[1].O.join() !== rows[2].O.join());
      // hypotheses: factor f about O / a corner of the polygon / its centroid / the panel centre
      const FS = [2, -2, 0.5, -0.5, 1, -1];
      const ANCH = {
        O: (P, O) => [scale(P, O, 1)],
        panel: (P) => [P],
        cent: (P) => [P],
        vert: (P) => P.map((p) => p),
      };
      const imgs = (kind, f, P, O) => {
        if (kind === 'O') return [scale(P, O, f)];
        if (kind === 'panel') return [scale(P, [0, 0], f)];
        if (kind === 'cent') return [scale(P, cen(P), f)];
        return P.map((v) => scale(P, v, f));
      };
      void ANCH;
      const trans = [];
      rows.forEach((r, i) => {
        trans.push([r.P[0], r.P[1], r.O]);
        if (i < 2) trans.push([r.P[1], r.P[2], r.O]);
      });
      const truth = setKey(rows[2].P[2]);
      for (const kind of ['O', 'panel', 'cent', 'vert'])
        for (const f of FS) {
          const consistent = trans.every((t) => imgs(kind, f, t[0], t[2]).some((im) => setKey(im) === setKey(t[1])));
          if (!consistent) continue;
          RM.need(imgs(kind, f, rows[2].P[1], rows[2].O).every((im) => setKey(im) === truth));
          RM.need(kind === 'O' && f === k);
        }

      const c3 = rows[2], O = c3.O, P1 = c3.P[0], P2 = c3.P[1], T = c3.P[2];
      const sp = (P) => ({ O, P });
      const cands = [];
      const mk = (P, tag, flaw) => {
        if (!P || !isInt(P) || !inLat(P)) return;
        P = P.map((p) => [Math.round(p[0]), Math.round(p[1])]);
        const spec = sp(P);
        cands.push({ spec, key: keyOf(spec), tag, flaws: [flaw] });
      };
      [-k * k, k, -k, 1 / k, 1, 2 * k * k, k * k * k, -k * k * k, (k * k) / 2, (-k * k) / 2, 1 / (k * k)].forEach((g) =>
        mk(scale(P1, O, g), g === k ? 'once' : 'factor',
          g === k
            ? `This is the first panel enlarged only once (factor ${frac(k)}): it is the middle panel again. The enlargement must be applied a second time.`
            : `This is the first panel enlarged by ${frac(g)} about O; two enlargements by ${frac(k)} make a total factor of ${frac(k * k)}.`)
      );
      P2.forEach((v, j) => mk(scale(P2, v, k), 'vertex', `The middle panel was enlarged about one of its own corners ${fmtP(v)} instead of about the marked point O.`));
      mk(scale(P2, [0, 0], k), 'panel', 'The enlargement was centred on the middle of the lattice instead of on the marked point O.');
      mk(scale(P2, cen(P2), k), 'cent', 'The enlargement was centred on the middle of the polygon instead of on the marked point O.');
      mk(T.map((p) => [2 * O[0] - p[0], p[1]]), 'mirror', 'This is a mirror image: the third picture must have the same orientation as the first one (two enlargements by the same factor never flip the shape).');
      mk(T.map((p) => [O[0] - (p[1] - O[1]), O[1] + (p[0] - O[0])]), 'turn', 'The picture is turned through a quarter turn about O; an enlargement never rotates a shape by a quarter turn.');
      mk(T.map((p) => [O[0] + k * k * (p[0] - O[0]), p[1]]), 'stretch', 'Only the horizontal distances from O were enlarged; the vertical ones stayed unchanged, which distorts the shape.');
      mk(T.map((p) => [p[0], O[1] + k * k * (p[1] - O[1])]), 'stretch', 'Only the vertical distances from O were enlarged; the horizontal ones stayed unchanged, which distorts the shape.');
      [[1, 0, 'to the right'], [-1, 0, 'to the left'], [0, 1, 'up'], [0, -1, 'down']].forEach((d) =>
        mk(T.map((p) => [p[0] + d[0], p[1] + d[1]]), 'shift', `Right shape and size, but the whole picture is shifted one unit ${d[2]}: each corner must lie exactly on the line from O through the corresponding corner of the middle panel.`)
      );
      T.forEach((v, i) => {
        for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const Q = T.map((p) => p.slice());
          Q[i] = [v[0] + d[0], v[1] + d[1]];
          mk(Q, 'corner', `One corner is misplaced: the corner at ${fmtP(Q[i])} must be at ${fmtP(v)}.`);
        }
      });
      const ans = sp(T);
      const out = pick7(rng, { spec: ans, key: keyOf(ans) }, cands);

      const kt = frac(k);
      const rel = P2.map((p) => `${fmtP(p)} → (${p[0] - O[0]}, ${p[1] - O[1]}) → (${k * (p[0] - O[0])}, ${k * (p[1] - O[1])}) → ${fmtP([O[0] + k * (p[0] - O[0]), O[1] + k * (p[1] - O[1])])}`);
      return {
        panels: [0, 1].reduce((a, r) => a.concat(rows[r].P.map((P) => ({ O: rows[r].O, P }))), []).concat([sp(P1), sp(P2)]),
        answer: ans,
        options: [{ spec: ans, flaws: [] }].concat(out.map((x) => ({ spec: x.spec, flaws: x.flaws }))),
        render(s) {
          const pic = new RM.Pic();
          let d = '';
          for (let x = -R; x <= R; x++) for (let y = -R; y <= R; y++) d += `M${px(x)} ${py(y)}h0`;
          pic.add(`<path d="${d}" stroke="#c4c4c4" stroke-width="1.5" stroke-linecap="round" fill="none"/>`);
          RM.polygon(pic, s.P.map((p) => [px(p[0]), py(p[1])]), { fill: '#d6d6d6', sw: 2.2 });
          s.P.forEach((p) => RM.circle(pic, px(p[0]), py(p[1]), 1.7, { fill: 'black', sw: 0 }));
          RM.circle(pic, px(s.O[0]), py(s.O[1]), 4.8, { fill: 'white', sw: 1.9 });
          RM.circle(pic, px(s.O[0]), py(s.O[1]), 1.9, { fill: 'black', sw: 0 });
          return pic.svg();
        },
        key: keyOf,
        rules: [
          { k: 'Centre', t: 'Each panel shows a lattice, a polygon with its corners on lattice points, and a marked point <b>O</b> (the circled dot). O stays fixed within a row but is different in each row.' },
          { k: 'Enlargement', t: `Each corner P moves to the point O + ${kt} × (P − O): it lies on the straight line through O and P, at ${frac(Math.abs(k))} times the distance from O${k < 0 ? ', but on the <b>opposite</b> side of O (negative factor: the shape is also turned half a turn)' : ''}.` },
          { k: 'Columns', t: `Column 2 is column 1 enlarged by ${kt} about O; column 3 is column 2 enlarged by the <b>same</b> factor about the <b>same</b> O (total factor ${frac(k * k)} from column 1).` },
          { k: 'Last row', t: `Coordinates from the middle of the lattice (x to the right, y up): O = ${fmtP(O)}. Middle panel corner → offset from O → times ${kt} → new corner: ${rel.join('; ')}.` },
          { k: 'Answer', t: `<b>Corners: ${T.map(fmtP).join(', ')}.</b>` },
        ],
        hint: 'Measure the corners from the marked point, not from the polygon itself.',
      };
    },
  });
})();
