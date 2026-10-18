/* Linear map (grandmaster): one unknown integer 2x2 matrix M (det +-1, with a shear part) carries a lattice triangle
   from column 1 to column 2 and again from column 2 to column 3, about the origin of a graph-paper panel. */
(function () {
  'use strict';
  const RM = window.RM;
  const U = 9.5, B = 4;
  const ap = (M, p) => [M[0] * p[0] + M[1] * p[1], M[2] * p[0] + M[3] * p[1]];
  const inb = (p) => Math.abs(p[0]) <= B && Math.abs(p[1]) <= B;
  const eq = (p, q) => p[0] === q[0] && p[1] === q[1];
  const isPerm = (M) => (M[0] === 0 && M[3] === 0) || (M[1] === 0 && M[2] === 0);
  const area2 = (v) => (v[1][0] - v[0][0]) * (v[2][1] - v[0][1]) - (v[1][1] - v[0][1]) * (v[2][0] - v[0][0]);
  const tri = (M, v) => v.map((p) => ap(M, p));
  const key = (s) => s.v.map((p) => p.join(',')).join(';');
  const px = (p) => [50 + p[0] * U, 50 - p[1] * U];

  function render(s) {
    const pic = new RM.Pic();
    for (let k = -B; k <= B; k++) {
      if (k === 0) continue;
      const a = 50 + k * U, h = B * U;
      RM.line(pic, a, 50 - h, a, 50 + h, { sw: 0.6, color: RM.LIGHT });
      RM.line(pic, 50 - h, a, 50 + h, a, { sw: 0.6, color: RM.LIGHT });
    }
    const h = B * U + 3;
    RM.line(pic, 50 - h, 50, 50 + h, 50, { sw: 1.2, color: RM.GRAY });
    RM.line(pic, 50, 50 - h, 50, 50 + h, { sw: 1.2, color: RM.GRAY });
    const q = s.v.map(px);
    pic.add('<polygon points="' + q.map((p) => RM.fmt(p[0]) + ',' + RM.fmt(p[1])).join(' ') +
      '" fill="none" stroke="' + RM.INK + '" stroke-width="1.5" stroke-linejoin="round"/>');
    const r = 3.4;
    RM.circle(pic, q[0][0], q[0][1], r, { fill: RM.INK, sw: 1, stroke: RM.INK });
    RM.circle(pic, q[1][0], q[1][1], r, { fill: RM.WHITE, sw: 1.6, stroke: RM.INK });
    pic.add('<rect x="' + RM.fmt(q[2][0] - r) + '" y="' + RM.fmt(q[2][1] - r) + '" width="' + RM.fmt(2 * r) +
      '" height="' + RM.fmt(2 * r) + '" fill="' + RM.GRAY + '" stroke="' + RM.INK + '" stroke-width="1"/>');
    return pic.svg();
  }

  function pickM(rng, variant) {
    for (let i = 0; i < 200; i++) {
      const M = [0, 0, 0, 0].map(() => rng.int(-2, 2));
      const d = M[0] * M[3] - M[1] * M[2];
      if (variant === 3 ? d !== -1 : (variant === 1 ? Math.abs(d) !== 1 : d !== 1)) continue;
      if (isPerm(M)) continue;
      const M2 = [M[0] * M[0] + M[1] * M[2], M[0] * M[1] + M[1] * M[3], M[2] * M[0] + M[3] * M[2], M[2] * M[1] + M[3] * M[3]];
      if (M2.every((x, j) => x === M[j])) continue;
      if (M2[0] === 1 && M2[1] === 0 && M2[2] === 0 && M2[3] === 1) continue;
      return M;
    }
    RM.need(false);
  }

  function randTri(rng, M) {
    for (let i = 0; i < 60; i++) {
      const v = [0, 1, 2].map(() => [rng.int(-B, B), rng.int(-B, B)]);
      if (v.some((p) => p[0] === 0 && p[1] === 0)) continue;
      if (Math.abs(area2(v)) < 4) continue;
      const c2 = tri(M, v), c3 = tri(M, c2);
      if (![v, c2, c3].every((t) => t.every(inb))) continue;
      if (key({ v }) === key({ v: c2 }) || key({ v: c2 }) === key({ v: c3 })) continue;
      return { v, c2, c3 };
    }
    return null;
  }

  function generate(rng, variant) {
    const M = pickM(rng, variant);
    const rows = [];
    for (let r = 0; r < 3; r++) { const t = randTri(rng, M); RM.need(t); rows.push(t); }
    const ans = rows[2].c3;
    // hypotheses: p -> N p + t, N entries -3..3, |t| <= 2 ; all consistent ones must predict the same answer
    const pairs = [];
    for (let r = 0; r < 3; r++) for (let i = 0; i < 3; i++) {
      pairs.push([rows[r].v[i], rows[r].c2[i]]);
      if (r < 2) pairs.push([rows[r].c2[i], rows[r].c3[i]]);
    }
    const pred = (r2) => r2;
    for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) for (let c = -3; c <= 3; c++) for (let d = -3; d <= 3; d++) {
      const N = [a, b, c, d];
      for (let tx = -2; tx <= 2; tx++) for (let ty = -2; ty <= 2; ty++) {
        let ok = true;
        for (let k = 0; k < pairs.length && ok; k++) {
          const q = ap(N, pairs[k][0]);
          if (q[0] + tx !== pairs[k][1][0] || q[1] + ty !== pairs[k][1][1]) ok = false;
        }
        if (!ok) continue;
        const p = rows[2].c2.map((x) => { const q = ap(N, x); return [q[0] + tx, q[1] + ty]; });
        RM.need(key({ v: pred(p) }) === key({ v: ans }));
      }
    }
    const A = rows[2].c2, a3 = rows[2].c3;
    const det = M[0] * M[3] - M[1] * M[2];
    const inv = [M[3] / det, -M[1] / det, -M[2] / det, M[0] / det];
    const MT = [M[0], M[2], M[1], M[3]];
    const cand = [];
    const add = (v, why) => cand.push({ v, why });
    add(tri(MT, A), 'This applies the transposed matrix (rows and columns mixed up) instead of the map found in rows 1 and 2.');
    add(tri(inv, A), 'This applies the inverse map, i.e. it goes backwards instead of forwards.');
    add(A.map((p) => p.slice()), 'This repeats the middle panel: the map was applied only once instead of being applied again.');
    add(tri(M, a3), 'The map was applied three times to the first panel; the third panel needs exactly two applications.');
    add(a3.map((p) => [p[0], -p[1]]), 'This is the correct shape mirrored across the horizontal axis.');
    add(a3.map((p) => [-p[0], p[1]]), 'This is the correct shape mirrored across the vertical axis.');
    add(a3.map((p) => [-p[0], -p[1]]), 'This is the correct shape turned half a turn about the origin.');
    add(a3.map((p) => [-p[1], p[0]]), 'This is the correct shape rotated a quarter turn; the map is a shear, not a rotation.');
    add([a3[1], a3[0], a3[2]], 'The vertices are right but the black and white discs are swapped.');
    add([a3[0], a3[2], a3[1]], 'The vertices are right but the white disc and the gray square are swapped.');
    add([a3[2], a3[1], a3[0]], 'The vertices are right but the black disc and the gray square are swapped.');
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) add(a3.map((p) => [p[0] + dx, p[1] + dy]), 'This is the correct shape shifted by one unit; the origin never moves, so nothing is translated.');
    for (let i = 0; i < 4; i++) for (const e of [1, -1]) {
      const N = M.slice(); N[i] += e;
      add(tri(N, A), 'One coefficient of the map is off by one, so one or more vertices land on the wrong lattice point.');
    }
    const used = new Set([key({ v: ans })]), opts = [];
    for (const c of rng.shuffle(cand)) {
      if (!c.v.every(inb)) continue;
      const k = key({ v: c.v });
      if (used.has(k)) continue;
      used.add(k);
      opts.push({ spec: { v: c.v }, flaws: [c.why] });
    }
    RM.need(opts.length >= 7);
    const options = opts.slice(0, 7);
    options.push({ spec: { v: ans }, flaws: [] });

    const e1 = ap(M, [1, 0]), e2 = ap(M, [0, 1]);
    const f = (p) => '(' + p[0] + ', ' + p[1] + ')';
    const nm = ['black disc', 'white disc', 'gray square'];
    const steps = rows[2].v.map((p, i) => nm[i] + ' ' + f(p) + ' → ' + f(rows[2].c2[i]) + ' → <b>' + f(ans[i]) + '</b>').join('; ');
    return {
      panels: [0, 1].flatMap((r) => [rows[r].v, rows[r].c2, rows[r].c3]).concat([rows[2].v, rows[2].c2]).map((v) => ({ v })),
      answer: { v: ans },
      options, render, key,
      rules: [
        { k: 'The picture', t: 'Each panel is graph paper with the origin in the centre. A triangle sits on lattice points, its corners marked by a black disc, a white disc and a gray square, so every corner can be followed from panel to panel.' },
        { k: 'One map', t: 'The same linear map carries every triangle from its left panel to the next one. The origin stays fixed. Here the point (1, 0) goes to ' + f(e1) + ' and (0, 1) goes to ' + f(e2) + '; any point (x, y) goes to x·' + f(e1) + ' + y·' + f(e2) + '. It is not a rotation: lengths and angles change.' },
        { k: 'Twice', t: 'Column 2 is the map applied to column 1, and column 3 is the map applied to column 2 (so twice to column 1). Check on rows 1 and 2: both steps use the same map.' },
        { k: 'Missing panel', t: 'Apply the map to the corners of the middle panel of row 3: ' + steps + '.' },
      ],
      hint: 'The origin never moves; everything else is carried along twice by the same map.',
    };
  }

  RM.register({ id: 'shear', name: 'Linear map', difficulty: 7, generate });
})();
