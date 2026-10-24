/* Centre of mass (grandmaster): three identical black dots on a 9x9 lattice and a white ring at their centroid (always
 * derived). The three dots have their own fixed move (vector), shared by all rows; per column every dot moves by it.
 * Dots are unlabelled, so the solver must also work out which dot has which move. */
(function () {
  'use strict';
  const RM = window.RM;
  const G = 8;
  const px = (v) => 10 + 10 * v;
  const rd = (v) => Math.round(v * 1e4) / 1e4;
  const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  const sk = (pts) => pts.map((p) => p[0] + ',' + p[1]).sort().join('|');
  const sortPts = (pts) => pts.map((p) => [rd(p[0]), rd(p[1])]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cen = (D) => [rd((D[0][0] + D[1][0] + D[2][0]) / 3), rd((D[0][1] + D[1][1] + D[2][1]) / 3)];
  const mk = (D, R) => ({ D: sortPts(D), R: R || cen(D) });
  const keyOf = (s) => sk(s.D) + '#' + s.R[0] + ',' + s.R[1];
  const d2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
  const eq = (p, q) => Math.abs(p[0] - q[0]) < 1e-6 && Math.abs(p[1] - q[1]) < 1e-6;
  const dist = (a, b) => {
    const A = a.D.map(String), B = b.D.map(String);
    return A.filter((x) => !B.includes(x)).length + B.filter((x) => !A.includes(x)).length + (eq(a.R, b.R) ? 0 : 1);
  };
  const cp = (p) => `(${p[0] + 1}, ${p[1] + 1})`; // (column, row), 1-based
  const vecTxt = (v) => [v[0] ? `${Math.abs(v[0])} ${v[0] > 0 ? 'right' : 'left'}` : '', v[1] ? `${Math.abs(v[1])} ${v[1] > 0 ? 'down' : 'up'}` : ''].filter(Boolean).join(' and ');

  // alternative "special points" a solver might think the ring marks
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  function circum(D) {
    const [a, b, c] = D;
    const dd = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
    if (Math.abs(dd) < 1e-9) return null;
    const f = (p) => p[0] * p[0] + p[1] * p[1];
    return [(f(a) * (b[1] - c[1]) + f(b) * (c[1] - a[1]) + f(c) * (a[1] - b[1])) / dd, (f(a) * (c[0] - b[0]) + f(b) * (a[0] - c[0]) + f(c) * (b[0] - a[0])) / dd];
  }
  const median = (D) => [D.map((p) => p[0]).sort((x, y) => x - y)[1], D.map((p) => p[1]).sort((x, y) => x - y)[1]];
  const SPECIAL = [
    ['the midpoint of two of the dots', (D) => [mid(D[0], D[1]), mid(D[0], D[2]), mid(D[1], D[2])]],
    ['the circumcentre of the three dots', (D) => { const o = circum(D); return o ? [o] : []; }],
    ['the orthocentre of the three dots', (D) => { const o = circum(D); return o ? [[D[0][0] + D[1][0] + D[2][0] - 2 * o[0], D[0][1] + D[1][1] + D[2][1] - 2 * o[1]]] : []; }],
    ['the incentre of the three dots', (D) => {
      const [a, b, c] = D, la = Math.sqrt(d2(b, c)), lb = Math.sqrt(d2(a, c)), lc = Math.sqrt(d2(a, b)), s = la + lb + lc;
      return s ? [[(la * a[0] + lb * b[0] + lc * c[0]) / s, (la * a[1] + lb * b[1] + lc * c[1]) / s]] : [];
    }],
    ['the centre of the box around the dots', (D) => { const xs = D.map((p) => p[0]), ys = D.map((p) => p[1]); return [[(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]]; }],
    ['the middle column and middle row of the dots', (D) => [median(D)]],
    ['the midpoint of the two dots that are farthest apart', (D) => { const pr = [[0, 1], [0, 2], [1, 2]], m = Math.max(...pr.map((q) => d2(D[q[0]], D[q[1]]))); return pr.filter((q) => d2(D[q[0]], D[q[1]]) === m).map((q) => mid(D[q[0]], D[q[1]])); }],
    ['the midpoint of the two dots that are closest together', (D) => { const pr = [[0, 1], [0, 2], [1, 2]], m = Math.min(...pr.map((q) => d2(D[q[0]], D[q[1]]))); return pr.filter((q) => d2(D[q[0]], D[q[1]]) === m).map((q) => mid(D[q[0]], D[q[1]])); }],
  ];

  function vsets(A, B, C) {
    const out = [];
    for (const s of PERMS) {
      const w = A.map((a, i) => [B[s[i]][0] - a[0], B[s[i]][1] - a[1]]);
      if (sk(A.map((a, i) => [a[0] + 2 * w[i][0], a[1] + 2 * w[i][1]])) === sk(C)) out.push(w);
    }
    return out;
  }

  function genV(rng) {
    for (let t = 0; t < 300; t++) {
      const V = [0, 1, 2].map(() => [rng.int(-2, 2), rng.int(-2, 2)]);
      if (V.some((v) => !v[0] && !v[1])) continue;
      if (new Set(V.map(String)).size < 3) continue;
      const sx = V[0][0] + V[1][0] + V[2][0], sy = V[0][1] + V[1][1] + V[2][1];
      if (RM.mod(sx, 3) || RM.mod(sy, 3) || (!sx && !sy)) continue;
      if (V.reduce((s, v) => s + Math.abs(v[0]) + Math.abs(v[1]), 0) < 6) continue;
      return V;
    }
    return null;
  }
  const okPanel = (D, R) => {
    for (let i = 0; i < 3; i++) {
      if (D[i].some((v) => v < 0 || v > G)) return false;
      if (d2(R, D[i]) < 2) return false;
      for (let j = i + 1; j < 3; j++) if (d2(D[i], D[j]) < 2) return false;
    }
    return R[0] >= 0 && R[0] <= G && R[1] >= 0 && R[1] <= G;
  };
  function genRow(rng, V) {
    const rg = (v) => [Math.max(0, -2 * v), Math.min(G, G - 2 * v)];
    for (let t = 0; t < 120; t++) {
      const A = [];
      for (let i = 0; i < 2; i++) {
        const [lx, hx] = rg(V[i][0]), [ly, hy] = rg(V[i][1]);
        A.push([rng.int(lx, hx), rng.int(ly, hy)]);
      }
      const pick3 = (axis) => {
        const [lo, hi] = rg(V[2][axis]), ok = [];
        for (let x = lo; x <= hi; x++) if (RM.mod(x + A[0][axis] + A[1][axis], 3) === 0) ok.push(x);
        return ok.length ? rng.pick(ok) : null;
      };
      const x3 = pick3(0), y3 = pick3(1);
      if (x3 === null || y3 === null) continue;
      A.push([x3, y3]);
      const P = [0, 1, 2].map((c) => A.map((a, i) => [a[0] + c * V[i][0], a[1] + c * V[i][1]]));
      if (P.every((D) => okPanel(D, cen(D)))) return { A, P };
    }
    return null;
  }

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

  RM.register({
    id: 'centroid',
    name: 'Centre of mass',
    difficulty: 7,
    generate(rng, variant) {
      const V = genV(rng);
      RM.need(V);
      const rows = [];
      for (let r = 0; r < 3; r++) {
        const row = genRow(rng, V);
        RM.need(row);
        rows.push(row);
      }
      RM.need(sk(rows[0].A) !== sk(rows[1].A) && sk(rows[0].A) !== sk(rows[2].A) && sk(rows[1].A) !== sk(rows[2].A));
      const [r0, r1, r2] = rows;
      const panels = [r0.P[0], r0.P[1], r0.P[2], r1.P[0], r1.P[1], r1.P[2], r2.P[0], r2.P[1]];
      const C3 = r2.P[2], B3 = r2.P[1], A3 = r2.P[0];
      const Rt = cen(C3);

      // 1. which dot has which move: all vector sets consistent with rows 1-2 must predict the same third panel
      const Vs = new Map();
      vsets(r0.P[0], r0.P[1], r0.P[2]).forEach((w) => Vs.set(sk(w), w));
      for (const kk of Array.from(Vs.keys())) if (!vsets(r1.P[0], r1.P[1], r1.P[2]).some((x) => sk(x) === kk)) Vs.delete(kk);
      RM.need(Vs.size > 0);
      const preds = new Set();
      for (const w of Vs.values())
        for (const s of PERMS) {
          const B = A3.map((a, i) => [a[0] + w[s[i]][0], a[1] + w[s[i]][1]]);
          if (sk(B) === sk(B3)) preds.add(sk(A3.map((a, i) => [a[0] + 2 * w[s[i]][0], a[1] + 2 * w[s[i]][1]])));
        }
      RM.need(preds.size === 1 && preds.has(sk(C3)));
      // 2. which point does the ring mark?
      SPECIAL.forEach((h) => {
        const ok = panels.every((D) => h[1](D).some((p) => eq(p, cen(D))));
        if (ok) { const L = h[1](C3); RM.need(L.length === 1 && eq(L[0], Rt)); }
      });

      const cands = [];
      const add = (D, R, tag, flaws) => {
        const sD = sortPts(D), s = { D: sD, R: [rd(R[0]), rd(R[1])] };
        if (!okPanel(sD, s.R) || sD.some((p) => p[0] !== Math.round(p[0]) || p[1] !== Math.round(p[1]))) return;
        if (new Set(sD.map(String)).size < 3) return;
        cands.push({ spec: s, key: keyOf(s), tag, flaws });
      };
      const ringTxt = (what) => `The ring is at ${what}, not at the centre of mass (average position) of the three dots.`;
      const sameDots = C3;
      add(sameDots, cen(B3), 'ring', ['The ring has not moved with the dots: it must sit at the centre of mass of the three dots in THIS panel.']);
      add(sameDots, cen(A3), 'ring', ['The ring was left where it was in the first panel; it must follow the centre of mass of the three dots.']);
      SPECIAL.forEach((h) => h[1](C3).forEach((p) => add(sameDots, p, 'ringsp', [ringTxt(h[0])])));
      [[1, 0, 'one column to the right'], [-1, 0, 'one column to the left'], [0, 1, 'one row down'], [0, -1, 'one row up']].forEach((d) =>
        add(sameDots, [Rt[0] + d[0], Rt[1] + d[1]], 'ringoff', [`The ring is ${d[2]} of the centre of mass of the three dots.`]));
      // wrong dots (ring placed at the centroid of the shown dots, or left at the true centroid)
      const wrongDots = [];
      const dotOf = (i) => `the dot that starts at ${cp(A3[i])}`;
      wrongDots.push([B3, 'once', 'The dots have moved only once from the first panel; the move must be applied twice.']);
      wrongDots.push([A3.map((a, i) => [a[0] + 3 * V[i][0], a[1] + 3 * V[i][1]]), 'thrice', 'The dots have moved three times from the first panel; only two moves have happened.']);
      for (let i = 0; i < 3; i++) {
        for (let j = i + 1; j < 3; j++)
          wrongDots.push([A3.map((a, m) => { const v = m === i ? V[j] : m === j ? V[i] : V[m]; return [a[0] + 2 * v[0], a[1] + 2 * v[1]]; }), 'swap', `${dotOf(i)} and ${dotOf(j)} have exchanged their moves; each dot keeps its own move (${vecTxt(V[i])} for the first, ${vecTxt(V[j])} for the second).`]);
        wrongDots.push([C3.map((c, m) => (m === i ? B3[i] : c)), 'stay', `${dotOf(i)} must move ${vecTxt(V[i])} in every column; here it did not make its second move.`]);
        wrongDots.push([C3.map((c, m) => (m === i ? A3[i] : c)), 'back', `${dotOf(i)} must move ${vecTxt(V[i])} in every column; here it is back at its start.`]);
        if (V[i][0] !== V[i][1]) wrongDots.push([C3.map((c, m) => (m === i ? [B3[i][0] + V[i][1], B3[i][1] + V[i][0]] : c)), 'swapxy', `${dotOf(i)} must move ${vecTxt(V[i])} per column; its second move has its horizontal and vertical parts exchanged.`]);
        if (V[i][0] || V[i][1]) wrongDots.push([C3.map((c, m) => (m === i ? [A3[i][0] + 2 * V[i][0] * -1, A3[i][1] + 2 * V[i][1] * -1] : c)), 'neg', `${dotOf(i)} moves ${vecTxt(V[i])} per column; here it moved the opposite way.`]);
      }
      wrongDots.forEach((w) => {
        add(w[0], cen(w[0].map((p) => p.slice())), w[1], [w[2]]);
        const R = Rt;
        const cs = cen(w[0]);
        if (!eq(R, cs)) add(w[0], R, w[1] + '+', [w[2], 'Also the ring is not at the centre of mass of the dots shown.']);
      });
      const ans = mk(C3, Rt);
      const out = pick7(rng, { spec: ans, key: keyOf(ans) }, cands);

      const trip = A3.map((a, i) => `${cp(a)} → ${cp(B3[i])} → ${cp(C3[i])}`);
      const sx = C3.reduce((s, p) => s + p[0] + 1, 0), sy = C3.reduce((s, p) => s + p[1] + 1, 0);
      return {
        panels: panels.map((D) => mk(D)),
        answer: ans,
        options: [{ spec: ans, flaws: [] }].concat(out.map((x) => ({ spec: x.spec, flaws: x.flaws }))),
        render(s) {
          const pic = new RM.Pic();
          let d = '';
          for (let x = 0; x <= G; x++) for (let y = 0; y <= G; y++) d += `M${px(x)} ${px(y)}h0`;
          pic.add(`<path d="${d}" stroke="#c9c9c9" stroke-width="1.5" stroke-linecap="round" fill="none"/>`);
          RM.circle(pic, px(s.R[0]), px(s.R[1]), 5.2, { fill: 'white', sw: 2.2 });
          s.D.forEach((p) => RM.circle(pic, px(p[0]), px(p[1]), 4, { fill: 'black', sw: 0 }));
          return pic.svg();
        },
        key: keyOf,
        rules: [
          { k: 'Ring', t: 'The white ring always marks the <b>centre of mass</b> of the three black dots: the average of their three columns and the average of their three rows.' },
          { k: 'Moves', t: `The dots are identical, but each has its own fixed move per column, the same in every row: ${V.map(vecTxt).join('; ')} (one move each). From panel to panel a dot makes its move once, so from the first to the third panel it makes it twice.` },
          { k: 'Last row', t: `Positions are (column, row) counted from the top-left. Matching each dot with its move gives: ${trip.join('; ')}.` },
          { k: 'Ring position', t: `Centre of mass of the last three positions: columns (${C3.map((p) => p[0] + 1).join(' + ')}) / 3 = ${sx}/3 = ${rd(sx / 3)}, rows (${C3.map((p) => p[1] + 1).join(' + ')}) / 3 = ${sy}/3 = ${rd(sy / 3)}.` },
          { k: 'Answer', t: `<b>Dots at ${sortPts(C3).map(cp).join(', ')}; ring at ${cp(Rt)}.</b>` },
        ],
        hint: 'Find the three moves first (they repeat in every row); the ring is then just an average.',
      };
    },
  });
})();
