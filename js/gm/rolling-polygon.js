/* Rolling polygon (grandmaster): each row shows one regular polygon (square to heptagon) standing on a ground
 * marked with ticks one side-length apart. One corner carries a black dot and one edge is drawn thick. Between
 * panels the polygon ROLLS (tips over a bottom corner) a fixed number of edges: each roll moves it one tick along
 * and turns it by one corner, clockwise when rolling right. The solver counts the ticks in rows 1-2, then has to roll
 * the row-3 polygon in the head and say where the dot and the thick edge end up and where the polygon stands.
 * Variants: 0 = k (2-3) edges to the right each time; 1 = k edges to the left; 2 = two different roll counts for
 * the two steps (same in every row); 3 = rolls one way, then back the other way. */
(function () {
  'use strict';
  const RM = window.RM;
  const md = RM.mod;
  const GY = 66; // ground line
  const DEG = Math.PI / 180;
  const POLY = { 4: 'square', 5: 'pentagon', 6: 'hexagon', 7: 'heptagon' };

  /* vertex slot j: 0 = bottom-right corner, 1 = bottom-left corner, then clockwise (up the left side, over the top,
   * down the right side). Edge slot j joins vertex slots j and j+1 (edge 0 = the one on the ground).
   * Rolling one edge to the right adds 1 to every slot, rolling left subtracts 1. */
  const vAng = (n, j) => 90 - 180 / n + (j * 360) / n;
  const GEO = {};
  [4, 5, 6, 7].forEach((n) => {
    const R = 1 / (2 * Math.sin(Math.PI / n));
    const a = R * Math.cos(Math.PI / n);
    const pts = RM.range(n).map((j) => [0.5 + R * Math.cos(vAng(n, j) * DEG), -a + R * Math.sin(vAng(n, j) * DEG)]);
    const xs = pts.map((p) => p[0]);
    GEO[n] = { R, pts, lo: Math.min(...xs), hi: Math.max(...xs) };
  });

  function vName(n, j) {
    j = md(j, n);
    if (j === 0) return 'bottom-right corner';
    if (j === 1) return 'bottom-left corner';
    const a = md(vAng(n, j), 360);
    if (Math.abs(a - 270) < 1) return 'top corner';
    const left = a > 90 && a < 270;
    const m = left ? a : md(180 - a, 360);
    const side = left ? 'left' : 'right';
    if (n % 2 === 0 && Math.abs(m - (270 - 180 / n)) < 1) return 'top-' + side + ' corner';
    return (m < 202.5 ? side : 'upper-' + side) + ' corner';
  }
  function eName(n, j) {
    j = md(j, n);
    if (j === 0) return 'bottom edge';
    const a = md(90 + (j * 360) / n, 360);
    if (Math.abs(a - 270) < 1) return 'top edge';
    const left = a > 90 && a < 270;
    const m = left ? a : md(180 - a, 360);
    const side = left ? 'left' : 'right';
    return (m < 157.5 ? 'lower-' + side : m < 202.5 ? side : 'upper-' + side) + ' edge';
  }

  const roll = (sp, d) => Object.assign({}, sp, { p: sp.p + d, ds: md(sp.ds + d, sp.n), ts: md(sp.ts + d, sp.n) });
  const sameState = (a, b) => a.p === b.p && a.ds === b.ds && a.ts === b.ts;
  const angTxt = (n, k) => {
    const v = (k * 360) / n;
    return (Number.isInteger(v) ? '' : '≈ ') + RM.fmt(Math.round(v * 10) / 10) + '°';
  };
  const ticks = (k) => RM.plural(k, 'tick');
  const edges = (k) => RM.plural(k, 'edge');

  function render(sp) {
    const pic = new RM.Pic();
    pic.add(`<rect x="4" y="${GY}" width="92" height="7" fill="${pic.paint('ldots')}"/>`);
    RM.line(pic, 4, GY, 96, GY, { sw: 2 });
    const i0 = Math.ceil((5 - sp.x0) / sp.s);
    for (let i = i0; sp.x0 + i * sp.s <= 95; i++) RM.line(pic, sp.x0 + i * sp.s, GY, sp.x0 + i * sp.s, GY + 4.5, { sw: 1.5, color: RM.DARK });
    const g = GEO[sp.n];
    const bx = sp.x0 + sp.p * sp.s;
    const v = g.pts.map((q) => [bx + q[0] * sp.s, GY + q[1] * sp.s]);
    RM.polygon(pic, v, { fill: 'white', sw: 1.8 });
    const a = v[sp.ts];
    const b = v[(sp.ts + 1) % sp.n];
    RM.line(pic, a[0], a[1], b[0], b[1], { sw: 5.2, cap: 'round' });
    const d = v[sp.ds];
    RM.circle(pic, d[0], d[1], 3.2, { fill: 'black', sw: 0 });
    return pic.svg();
  }

  /* all rotations rho in [-lim, lim] (in corners) that explain every observed pair a -> b (mod n) */
  function rotPreds(obs, n3, from, lim) {
    const out = new Set();
    for (let rho = -lim; rho <= lim; rho++) if (obs.every((o) => md(o.a + rho - o.b, o.n) === 0)) out.add(md(from + rho, n3));
    return out;
  }
  /* displacements of the form a*n + b (a in -1..1) that explain every observed move */
  function dispPreds(obs, n3, from) {
    const out = new Set();
    for (let a = -1; a <= 1; a++) for (let b = -14; b <= 14; b++) if (obs.every((o) => a * o.n + b === o.dp)) out.add(from + a * n3 + b);
    return out;
  }
  const only = (set, v) => set.size === 1 && set.has(v);

  const NAMES_V = [];
  const NAMES_E = [];
  [4, 5, 6, 7].forEach((n) =>
    RM.range(n).forEach((j) => {
      if (NAMES_V.indexOf(vName(n, j)) < 0) NAMES_V.push(vName(n, j));
      if (NAMES_E.indexOf(eName(n, j)) < 0) NAMES_E.push(eName(n, j));
    })
  );
  const GOALS = [{ f: (s) => s.ds <= 1 }]
    .concat(NAMES_V.map((nm) => ({ f: (s) => vName(s.n, s.ds) === nm })))
    .concat(NAMES_E.map((nm) => ({ f: (s) => eName(s.n, s.ts) === nm })));
  const firstHit = (s, dir, f) => {
    for (let h = 1; h <= s.n; h++) if (f(roll(s, dir * h))) return h;
    return 0;
  };

  RM.register({
    id: 'rolling-polygon',
    name: 'Rolling polygon',
    difficulty: 7,
    generate(rng, variant) {
      let d1, d2;
      if (variant === 0) d1 = d2 = rng.int(2, 3);
      else if (variant === 1) d1 = d2 = -rng.int(1, 3);
      else if (variant === 2) {
        const sg = rng.pick([1, -1]);
        const ab = rng.sample([1, 2, 3], 2);
        d1 = sg * ab[0];
        d2 = sg * ab[1];
      } else {
        const sg = rng.pick([1, -1]);
        d1 = sg * rng.int(1, 3);
        d2 = -sg * rng.int(1, 3);
      }
      const n3 = variant === 0 ? rng.pick([5, 6, 7]) : rng.pick([4, 5, 6, 7]);
      const ns = rng.sample([4, 5, 6, 7].filter((n) => n !== n3), 2).concat([n3]);
      const sg2 = Math.sign(d2);
      const k2 = Math.abs(d2);
      const dir2 = sg2 > 0 ? 'right' : 'left';
      const cw2 = sg2 > 0 ? 'clockwise' : 'anticlockwise';
      const pc = [0, d1, d1 + d2];

      // wrong position for half of the options (row 3)
      const pAns = pc[2];
      const posCands = [
        { p: pc[1], why: `it has not moved from where it stood in the 2nd panel: ${k2 === 1 ? 'a roll' : k2 + ' rolls'} also carr${k2 === 1 ? 'ies' : 'y'} it ${ticks(k2)} to the ${dir2}` },
        { p: pAns + sg2, why: `it has moved ${ticks(k2 + 1)} to the ${dir2} — one side-length too far for ${k2 === 1 ? 'a single roll' : k2 + ' rolls'}` },
      ];
      if (k2 >= 2) posCands.push({ p: pAns - sg2, why: `it has moved only ${ticks(k2 - 1)} to the ${dir2}; ${k2} rolls carry it ${ticks(k2)}` });
      posCands.push({ p: pc[1] - d2, why: `it has moved to the ${sg2 > 0 ? 'left' : 'right'}; the polygon rolls to the ${dir2}` });
      const order = rng.shuffle(posCands);

      // sizes and offsets per row
      const fitRow = (n, ps) => {
        const g = GEO[n];
        const lo = Math.min(...ps) + g.lo;
        const hi = Math.max(...ps) + g.hi;
        const s = Math.min(18, 32 * Math.sin(Math.PI / n), 86 / (hi - lo));
        if (s < Math.max(9.5, 17 * Math.sin(Math.PI / n))) return null;
        const xa = 7 - lo * s;
        const xb = 93 - hi * s;
        return { s: Math.round(s * 10) / 10, x0: Math.round((xa + rng.next() * Math.max(0, xb - xa - 0.2)) * 10) / 10 };
      };
      const rowFit = [];
      for (let r = 0; r < 2; r++) {
        rowFit.push(fitRow(ns[r], pc));
        RM.need(rowFit[r]);
      }
      let wrong = null;
      for (const c of order) {
        const f = fitRow(n3, pc.concat([c.p]));
        if (f) {
          wrong = c;
          rowFit.push(f);
          break;
        }
      }
      RM.need(wrong);

      // marks and states
      const S = [];
      for (let r = 0; r < 3; r++) {
        const n = ns[r];
        let ds, ts;
        for (let t = 0; t < 30; t++) {
          ds = rng.int(0, n - 1);
          ts = rng.int(0, n - 1);
          if (ds !== ts && ds !== md(ts + 1, n) && (n % 2 === 0 || md(2 * ts - 2 * ds + 1, n) !== 0)) break;
          ds = -1;
        }
        RM.need(ds >= 0);
        const s0 = { n, s: rowFit[r].s, x0: rowFit[r].x0, p: 0, ds, ts };
        S.push([s0, roll(s0, d1), roll(roll(s0, d1), d2)]);
      }
      const A = S[2][2];
      const C2 = S[2][1];

      // ---- uniqueness: every reading consistent with the visible panels must predict the answer
      const obsT = (c0, c1) => [0, 1].map((r) => S[r]).map((row) => ({ n: row[0].n, a: row[c0], b: row[c1] }));
      [
        [1, 2, 5],
        [0, 2, 7],
      ].forEach(([c0, c1, lim]) => {
        const o = obsT(c0, c1);
        const from = S[2][c0];
        RM.need(only(rotPreds(o.map((x) => ({ n: x.n, a: x.a.ds, b: x.b.ds })), n3, from.ds, lim), A.ds));
        RM.need(only(rotPreds(o.map((x) => ({ n: x.n, a: x.a.ts, b: x.b.ts })), n3, from.ts, lim), A.ts));
        RM.need(only(dispPreds(o.map((x) => ({ n: x.n, dp: x.b.p - x.a.p })), n3, from.p), A.p));
      });
      // the first step of row 3 must be explained by the same rotation as rows 1-2
      RM.need(only(rotPreds([0, 1, 2].map((r) => ({ n: ns[r], a: S[r][0].ds, b: S[r][1].ds })), n3, 0, 5), md(d1, n3)));
      // "it rolls until <goal>" readings
      for (const dir of [1, -1]) {
        for (const goal of GOALS) {
          if (![0, 1].every((r) => dir * firstHit(S[r][1], dir, goal.f) === d2)) continue;
          const h = firstHit(C2, dir, goal.f);
          if (h) RM.need(sameState(roll(C2, dir * h), A));
        }
      }
      // no simple Raven pattern on where the marks are in the picture
      RM.needNoConflict(RM.grid3((r, c) => vName(ns[r], S[r][c].ds)), vName(n3, A.ds), 'categorical');
      RM.needNoConflict(RM.grid3((r, c) => eName(ns[r], S[r][c].ts)), eName(n3, A.ts), 'categorical');
      RM.needNoConflict(RM.grid3((r, c) => (S[r][c].ds <= 1 ? 'g' : 'a')), A.ds <= 1 ? 'g' : 'a', 'categorical');

      // ---- distractor marks
      const n = n3;
      const at = (ds, ts, why) => ({ ds: md(ds, n), ts: md(ts, n), why });
      const rotM = (k) => at(C2.ds + k, C2.ts + k, null);
      const rigid = [];
      if (k2 >= 2) rigid.push(Object.assign(rotM(d2 - sg2), { why: `the dot and the thick edge have travelled only ${k2 - 1} corner${k2 - 1 > 1 ? 's' : ''} round instead of ${k2}` }));
      rigid.push(Object.assign(rotM(d2 + sg2), { why: `the dot and the thick edge have travelled ${k2 + 1} corners round — one roll too many` }));
      rigid.push(Object.assign(rotM(-d2), { why: `the marks have turned ${sg2 > 0 ? 'anticlockwise' : 'clockwise'}; a polygon rolling to the ${dir2} turns ${cw2}` }));
      rigid.push(Object.assign(rotM(0), { why: 'the dot and the thick edge are exactly where they were in the 2nd panel: the polygon would have slid without turning' }));
      const loose = [
        at(1 - A.ds, -A.ts, 'the marks are a mirror image of the right ones (left and right swapped)'),
        at(A.ds + 1, A.ts, `the thick edge is right, but the dot is one corner off (it should be at the ${vName(n, A.ds)})`),
        at(A.ds - 1, A.ts, `the thick edge is right, but the dot is one corner off (it should be at the ${vName(n, A.ds)})`),
        at(A.ds, A.ts + 1, `the dot is right, but the thick edge is one edge off (it should be the ${eName(n, A.ts)})`),
        at(A.ds, A.ts - 1, `the dot is right, but the thick edge is one edge off (it should be the ${eName(n, A.ts)})`),
      ].filter((m) => m.ds !== m.ts && m.ds !== md(m.ts + 1, n));
      const seen = new Set([A.ds + ',' + A.ts]);
      const uniq = (arr) =>
        rng.shuffle(arr).filter((m) => {
          const kk = m.ds + ',' + m.ts;
          if (seen.has(kk)) return false;
          seen.add(kk);
          return true;
        });
      const R1 = uniq(rigid);
      const L1 = uniq(loose);
      RM.need(R1.length >= 1 && L1.length >= 1 && R1.length + L1.length >= 3);
      const rest = rng.shuffle(R1.slice(1).concat(L1.slice(1)));
      const marks = [{ ds: A.ds, ts: A.ts, why: null }, R1[0], L1[0], rest[0]];

      const options = [];
      [null, wrong].forEach((pos) =>
        marks.forEach((m) => {
          const spec = Object.assign({}, A, { p: pos ? pos.p : A.p, ds: m.ds, ts: m.ts });
          const flaws = [];
          if (pos) flaws.push(pos.why);
          if (m.why) flaws.push(m.why);
          options.push({ spec, flaws });
        })
      );

      // ---- correction
      const rowsTxt = ns.map((nn, r) => `row ${r + 1}: ${POLY[nn]}`).join(', ');
      const step = (d) => `<b>${edges(Math.abs(d))} to the ${d > 0 ? 'right' : 'left'}</b>`;
      let how;
      if (d1 === d2) how = `In every row the polygon rolls ${step(d1)} from one panel to the next: it advances ${ticks(Math.abs(d1))} each time, and the dot and the thick edge travel ${Math.abs(d1)} corners ${d1 > 0 ? 'clockwise' : 'anticlockwise'}.`;
      else how = `In every row the polygon first rolls ${step(d1)} (panel 1 → 2), then ${step(d2)} (panel 2 → 3)${variant === 3 ? ' — it comes back the other way' : ''}. Count the ticks it advances; the dot and the thick edge confirm it by travelling the same number of corners.`;
      const rules = [
        {
          k: 'Rolling, not sliding',
          t: `Each row shows one regular polygon (${rowsTxt}) on a ground whose ticks are exactly one side-length apart. It never slides: it <b>rolls</b>, tipping over a bottom corner. Each roll lays the next edge flat on the ground, carries the polygon <b>one tick</b> further and turns it by one corner (square 90°, pentagon 72°, hexagon 60°, heptagon ≈ 51.4°) — clockwise when it rolls to the right, anticlockwise to the left.`,
        },
        { k: 'How many rolls', t: how },
        {
          k: 'The marks ride along',
          t: 'The black dot (on a corner) and the thick edge are painted on the polygon, so they turn with it: after each roll every corner has moved one place round in the direction of rolling. Both marks therefore move together, by the same number of corners.',
        },
        {
          k: 'Row 3',
          t: `In the 2nd panel the ${POLY[n]} has the dot on its ${vName(n, C2.ds)} and its ${eName(n, C2.ts)} is thick. It now rolls ${edges(k2)} to the ${dir2}: it moves <b>${ticks(k2)} to the ${dir2}</b> and turns ${cw2} by ${k2} × ${angTxt(n, 1)} = ${angTxt(n, k2)}. The dot ends on the <b>${vName(n, A.ds)}</b> and the thick edge becomes the <b>${eName(n, A.ts)}</b>.`,
        },
      ];

      return {
        panels: RM.flat(RM.grid3((r, c) => S[r][c])),
        answer: A,
        options,
        render,
        key: (sp) => [sp.n, sp.s, sp.x0, sp.p, sp.ds, sp.ts].join('|'),
        rules,
        hint: 'It does not slide — it tips over its corners.',
      };
    },
  });
})();
