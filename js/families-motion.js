/* Puzzle families based on movement, rotation and ordering. */
(function () {
  'use strict';
  const RM = window.RM;
  const { nm, fn } = RM;
  const rad = Math.PI / 180;
  const polar = (cx, cy, r, a) => [cx + r * Math.sin(a * rad), cy - r * Math.cos(a * rad)];

  function arrowHead(pic, x, y, ang, size, style) {
    const back = polar(x, y, size, ang + 180);
    const l = polar(back[0], back[1], size * 0.55, ang - 90);
    const r = polar(back[0], back[1], size * 0.55, ang + 90);
    if (style === 'open') {
      RM.polyline(pic, [l, [x, y], r], { sw: 2.4 });
    } else if (style === 'dot') {
      RM.circle(pic, x, y, size * 0.45, { fill: 'black', sw: 0 });
    } else {
      RM.polygon(pic, [[x, y], l, r], { fill: 'black', sw: 1, stroke: RM.INK });
    }
  }
  /* Rotation hypotheses on a cyclic array: every rotation (and reflection)
   * that maps col1→col2 and col2→col3 in rows 1–2 must give the same row 3. */
  function rotHyps(N, reflect) {
    const H = [];
    for (let j = 0; j < N; j++) {
      H.push((a) => a.map((_, i) => a[RM.mod(i - j, N)]));
      if (reflect) H.push((a) => a.map((_, i) => a[RM.mod(j - i, N)]));
    }
    return H;
  }
  function uniqueCyclic(rows, N, extraMaps) {
    const preds = new Set();
    const maps = extraMaps || [(a) => a];
    rotHyps(N, true).forEach((h) =>
      maps.forEach((m) => {
        const H = (a) => m(h(a));
        if ([0, 1].every((r) => H(rows[r][0]).join() === rows[r][1].join() && H(rows[r][1]).join() === rows[r][2].join())) preds.add(H(rows[2][1]).join());
      })
    );
    return preds.size === 1 && preds.has(rows[2][2].join());
  }
  const PERM3 = [[0, 1, 2], [1, 2, 0], [2, 0, 1], [0, 2, 1], [2, 1, 0], [1, 0, 2]];
  function uniquePerm3(rows) {
    const preds = new Set();
    PERM3.forEach((p) => {
      const H = (a) => p.map((i) => a[i]);
      if ([0, 1].every((r) => H(rows[r][0]).join() === rows[r][1].join() && H(rows[r][1]).join() === rows[r][2].join())) preds.add(H(rows[2][1]).join());
    });
    return preds.size === 1 && preds.has(rows[2][2].join());
  }

  /* ================================================================ Orbits */
  const TRACKS = {
    sq8: {
      n: 8,
      pos: [[22, 22], [50, 22], [78, 22], [78, 50], [78, 78], [50, 78], [22, 78], [22, 50]],
      r: 9,
      draw(pic) {
        for (let k = 0; k < 4; k++) {
          RM.line(pic, 8 + k * 28, 8, 8 + k * 28, 92, { sw: 0.7, color: RM.LIGHT, cap: 'butt' });
          RM.line(pic, 8, 8 + k * 28, 92, 8 + k * 28, { sw: 0.7, color: RM.LIGHT, cap: 'butt' });
        }
      },
    },
    sq12: {
      n: 12,
      pos: (() => {
        const c = [17, 39, 61, 83];
        return [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1], [3, 2], [3, 3], [2, 3], [1, 3], [0, 3], [0, 2], [0, 1]].map(([i, j]) => [c[i], c[j]]);
      })(),
      r: 7.5,
      draw(pic) {
        for (let k = 0; k < 5; k++) {
          RM.line(pic, 6 + k * 22, 6, 6 + k * 22, 94, { sw: 0.7, color: RM.LIGHT, cap: 'butt' });
          RM.line(pic, 6, 6 + k * 22, 94, 6 + k * 22, { sw: 0.7, color: RM.LIGHT, cap: 'butt' });
        }
      },
    },
    circ8: {
      n: 8,
      pos: RM.range(8).map((k) => polar(50, 50, 34, k * 45)),
      r: 8.5,
      draw(pic) {
        RM.circle(pic, 50, 50, 34, { stroke: RM.LIGHT, sw: 1 });
        RM.range(8).forEach((k) => {
          const p = polar(50, 50, 34, k * 45);
          RM.circle(pic, p[0], p[1], 1.6, { fill: 'light', sw: 0 });
        });
      },
    },
    circ12: {
      n: 12,
      pos: RM.range(12).map((k) => polar(50, 50, 36, k * 30)),
      r: 7,
      draw(pic) {
        RM.circle(pic, 50, 50, 36, { stroke: RM.LIGHT, sw: 1 });
        RM.range(12).forEach((k) => {
          const p = polar(50, 50, 36, k * 30);
          RM.circle(pic, p[0], p[1], 1.5, { fill: 'light', sw: 0 });
        });
      },
    },
  };
  const ORBIT_TOKENS = [
    { s: 'circle', f: 'black', n: 'black disc' },
    { s: 'square', f: 'white', n: 'white square' },
    { s: 'triangle', f: 'gray', n: 'grey triangle' },
    { s: 'star5', f: 'black', n: 'black star' },
    { s: 'diamond', f: 'white', n: 'white diamond' },
  ];
  RM.register({
    id: 'orbits',
    name: 'Orbits',
    difficulty: 4,
    generate(rng, variant) {
      const track = TRACKS[['sq8', 'circ8', 'sq12', 'circ12'][variant % 4]];
      const N = track.n;
      const toks = rng.sample(ORBIT_TOKENS, 3);
      const speeds = rng.sample([1, -1, 2, -2, 3, -3].filter((v) => RM.mod(2 * v, N) !== 0), 3);
      RM.need(new Set(speeds.map(Math.abs)).size >= 2);
      const starts = toks.map(() => [rng.int(0, N - 1), rng.int(0, N - 1), rng.int(0, N - 1)]);
      const G = toks.map((t, k) => RM.grid3((r, c) => RM.mod(starts[k][r] + speeds[k] * c, N)));
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) RM.need(new Set(G.map((g) => g[r][c])).size === 3);
      G.forEach((g) => RM.needUnique(g, g[2][2], 'numeric', N));
      const ans = { p: G.map((g) => g[2][2]) };
      const alts = [];
      G.forEach((g, k) => {
        const cands = [RM.mod(g[2][2] - 2 * speeds[k], N), RM.mod(g[2][2] + 1, N), RM.mod(g[2][2] - 1, N), g[2][1]];
        const alt = cands.find((v) => v !== g[2][2] && !ans.p.includes(v) && !alts.includes(v));
        RM.need(alt !== undefined);
        alts.push(alt);
      });
      const say = (v) => `${Math.abs(v)} step${Math.abs(v) > 1 ? 's' : ''} ${v > 0 ? 'clockwise' : 'anticlockwise'}`;
      return {
        panels: RM.flat(RM.grid3((r, c) => ({ p: G.map((g) => g[r][c]) }))),
        answer: ans,
        render(sp) {
          const pic = new RM.Pic();
          track.draw(pic);
          sp.p.forEach((pos, k) => {
            const [x, y] = track.pos[pos];
            RM.shape(pic, toks[k].s, x, y, track.r, { fill: toks[k].f, sw: 1.8 });
          });
          return pic.svg();
        },
        perturb: toks.map((t, k) => ({ apply: (s) => ((s.p[k] = alts[k]), s), why: `the ${t.n} is in the wrong place` })),
        rules: toks
          .map((t, k) => ({ k: RM.cap(t.n), t: `moves <b>${say(speeds[k])}</b> around the track at every step.` }))
          .concat([{ k: 'Rows', t: 'each row starts from its own positions; only the movement inside a row matters. Each token moves independently of the others.' }]),
      };
    },
  });

  /* ================================================================ Clock arithmetic */
  function dial(pic, frame) {
    RM.shape(pic, frame, 50, 50, 45, { fill: 'none', sw: 2 });
    for (let k = 0; k < 8; k++) {
      const a = polar(50, 50, 33, k * 45);
      const b = polar(50, 50, 37, k * 45);
      RM.line(pic, a[0], a[1], b[0], b[1], { sw: 1.4, color: RM.GRAY });
    }
  }
  const ANGLE_RULES = {
    sum: { f: (a, b) => a + b, t: 'angle(3rd) = angle(1st) + angle(2nd)' },
    diff: { f: (a, b) => a - b, t: 'angle(3rd) = angle(1st) − angle(2nd)' },
    prog: { f: (a, b) => 2 * b - a, t: 'turns by the same amount at each step' },
  };
  RM.register({
    id: 'clock-sum',
    name: 'Clock arithmetic',
    difficulty: 5,
    generate(rng, variant) {
      const [ra, rb] = [['sum', 'diff'], ['sum', 'prog'], ['diff', 'sum'], ['sum', 'sum']][variant % 4];
      const mk = (rule) =>
        RM.range(3).map(() => {
          const x = rng.int(0, 7);
          const y = rng.int(rule === 'prog' ? 0 : 1, 7);
          return [x, y, RM.mod(ANGLE_RULES[rule].f(x, y), 8)];
        });
      const A = mk(ra);
      const B = mk(rb);
      const frames = rng.shuffle(['circle', 'square', 'octagon']);
      const Fr = RM.latinGrid(rng, frames);
      RM.needUnique(A, A[2][2], 'numeric', 8);
      RM.needUnique(B, B[2][2], 'numeric', 8);
      RM.needUnique(Fr, Fr[2][2]);
      const ans = { a: A[2][2], b: B[2][2], fr: Fr[2][2] };
      const altOf = (g, rule) => {
        const [x, y] = g[2];
        const c = [RM.mod(rule === 'sum' ? x - y : x + y, 8), RM.mod(g[2][2] + 1, 8), RM.mod(g[2][2] - 1, 8)];
        return c.find((v) => v !== g[2][2]);
      };
      const altA = altOf(A, ra);
      const altB = altOf(B, rb);
      const deg = (v) => v * 45 + '°';
      return {
        panels: RM.flat(RM.grid3((r, c) => ({ a: A[r][c], b: B[r][c], fr: Fr[r][c] }))),
        answer: ans,
        render(sp) {
          const pic = new RM.Pic();
          dial(pic, sp.fr);
          const pa = polar(50, 50, 31, sp.a * 45);
          RM.line(pic, 50, 50, pa[0], pa[1], { sw: 2.2 });
          arrowHead(pic, pa[0], pa[1], sp.a * 45, 8, 'tri');
          const pb = polar(50, 50, 19, sp.b * 45);
          RM.line(pic, 50, 50, pb[0], pb[1], { sw: 6 });
          RM.circle(pic, 50, 50, 3.2, { fill: 'white', sw: 1.6 });
          return pic.svg();
        },
        perturb: [
          { apply: (s) => ((s.a = altA), s), why: `the long hand should point at ${deg(ans.a)}` },
          { apply: (s) => ((s.b = altB), s), why: `the short thick hand should point at ${deg(ans.b)}` },
          { apply: (s) => ((s.fr = Fr[2][1]), s), why: `the dial should be a ${nm(ans.fr)}` },
        ],
        rules: [
          { k: 'Angles', t: 'measure each hand clockwise from 12 o\'clock (0°, 45°, 90°, …, 315°); a full turn wraps around.' },
          { k: 'Long hand', t: `${ANGLE_RULES[ra].t}. Row 3: ${deg(A[2][0])} and ${deg(A[2][1])} → <b>${deg(ans.a)}</b>.` },
          { k: 'Short hand', t: `${ANGLE_RULES[rb].t}. Row 3: ${deg(B[2][0])} and ${deg(B[2][1])} → <b>${deg(ans.b)}</b>.` },
          { k: 'Dial', t: `circle, square and octagon each appear once per row and column → <b>${nm(ans.fr)}</b>.` },
        ],
      };
    },
  });

  /* ================================================================ Two speeds */
  RM.register({
    id: 'clock-speed',
    name: 'Compass & moon',
    difficulty: 4,
    generate(rng) {
      const k1 = rng.pick([1, -1, 2, -2, 3, -3]);
      const k2 = rng.pick([1, -1, 2, -2, 3, -3].filter((v) => Math.abs(v) !== Math.abs(k1) && v !== -k1));
      const T = RM.grid3((r, c) => 0);
      const M = RM.grid3((r, c) => 0);
      for (let r = 0; r < 3; r++) {
        const t0 = rng.int(0, 7);
        const m0 = rng.int(0, 7);
        for (let c = 0; c < 3; c++) {
          T[r][c] = RM.mod(t0 + k1 * c, 8);
          M[r][c] = RM.mod(m0 + k2 * c, 8);
        }
      }
      const rings = rng.shuffle(['single', 'double', 'dashed']);
      const Rg = RM.latinGrid(rng, rings);
      RM.needUnique(T, T[2][2], 'numeric', 8);
      RM.needUnique(M, M[2][2], 'numeric', 8);
      RM.needUnique(Rg, Rg[2][2]);
      const ans = { t: T[2][2], m: M[2][2], g: Rg[2][2] };
      return {
        panels: RM.flat(RM.grid3((r, c) => ({ t: T[r][c], m: M[r][c], g: Rg[r][c] }))),
        answer: ans,
        render(sp) {
          const pic = new RM.Pic();
          RM.circle(pic, 50, 50, 44, { sw: sp.g === 'double' ? 1.4 : 2, dash: sp.g === 'dashed' ? 'dashed' : null });
          if (sp.g === 'double') RM.circle(pic, 50, 50, 40, { sw: 1.4 });
          const a = sp.t * 45;
          const tip = polar(50, 50, 30, a);
          const tail = polar(50, 50, 30, a + 180);
          const l = polar(50, 50, 7, a - 90);
          const r = polar(50, 50, 7, a + 90);
          RM.polygon(pic, [tip, r, l], { fill: 'black', sw: 1.6 });
          RM.polygon(pic, [tail, l, r], { fill: 'white', sw: 1.6 });
          const mp = polar(50, 50, 36, sp.m * 45);
          RM.circle(pic, mp[0], mp[1], 4, { fill: 'gray', sw: 1.4 });
          return pic.svg();
        },
        perturb: [
          { apply: (s) => ((s.t = RM.mod(ans.t + 4, 8)), s), why: 'the needle is reversed (black and white halves swapped)' },
          { apply: (s) => ((s.m = RM.mod(ans.m - 2 * k2, 8)), s), why: 'the grey moon went round the wrong way' },
          { apply: (s) => ((s.g = Rg[2][0]), s), why: `the rim should be ${ans.g}` },
        ],
        rules: [
          { k: 'Needle', t: `the black tip turns <b>${RM.turn(k1)}</b> at every step along a row → it points ${RM.compass(ans.t)}.` },
          { k: 'Moon', t: `the grey moon travels <b>${RM.turn(k2)}</b> at every step, independently of the needle → ${RM.compass(ans.m)}.` },
          { k: 'Rim', t: `single, double and dashed rims appear once per row and column → <b>${ans.g}</b>.` },
        ],
      };
    },
  });

  /* ================================================================ Quadrant carousel */
  RM.register({
    id: 'carousel',
    name: 'Carousel',
    difficulty: 4,
    generate(rng) {
      const shapes = rng.sample(['circle', 'square', 'triangle', 'star5', 'diamond', 'hexagon', 'cross', 'heart'], 4);
      const sa = rng.pick([1, -1]);
      const sh = rng.pick([-sa, 2]);
      const rot = (arr, k) => arr.map((_, i) => arr[RM.mod(i - k, 4)]);
      const rows = RM.range(3).map(() => {
        const s = rng.shuffle(shapes);
        return [s, rot(s, sa), rot(s, 2 * sa)];
      });
      RM.need(rows[0][0].join() !== rows[1][0].join() && rows[1][0].join() !== rows[2][0].join());
      const H = RM.grid3((r, c) => 0);
      const h0 = [rng.int(0, 3), rng.int(0, 3), rng.int(0, 3)];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) H[r][c] = RM.mod(h0[r] + sh * c, 4);
      const marks = rng.shuffle(['circle', 'square', 'triangle']);
      const Mk = RM.latinGrid(rng, marks);
      RM.need(uniqueCyclic(rows, 4));
      RM.needUnique(H, H[2][2], 'numeric', 4);
      RM.needUnique(Mk, Mk[2][2]);
      const ans = { a: rows[2][2], h: H[2][2], m: Mk[2][2] };
      const POS = [[29, 29], [71, 29], [71, 71], [29, 71]];
      const pname = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
      const say = (v) => (v === 2 ? 'two places (diagonally across)' : `one place ${v > 0 ? 'clockwise' : 'anticlockwise'}`);
      return {
        panels: RM.flat(RM.grid3((r, c) => ({ a: rows[r][c], h: H[r][c], m: Mk[r][c] }))),
        answer: ans,
        render(sp) {
          const pic = new RM.Pic();
          sp.a.forEach((s, i) => RM.shape(pic, s, POS[i][0], POS[i][1], 15, { fill: i === sp.h ? 'black' : 'white', sw: 2 }));
          RM.shape(pic, sp.m, 50, 50, 5, { fill: 'black', sw: 0.6 });
          return pic.svg();
        },
        perturb: [
          { apply: (s) => ((s.a = rot(s.a, -2 * sa)), s), why: 'the shapes turned the wrong way' },
          { apply: (s) => ((s.h = RM.mod(H[2][1] + sa, 4)), s), why: 'the black fill followed the shape instead of moving on its own' },
          { apply: (s) => ((s.m = Mk[2][0]), s), why: 'wrong centre mark' },
        ],
        rules: [
          { k: 'Shapes', t: `the four shapes rotate <b>${say(sa)}</b> around the square at every step.` },
          { k: 'Black fill', t: `the black fill is attached to a <i>position</i>, not to a shape: it jumps <b>${say(sh)}</b> at every step → ${pname[ans.h]}, which now holds the ${nm(ans.a[ans.h])}.` },
          { k: 'Centre', t: 'the small centre mark takes each of its three forms once per row and column.' },
        ],
      };
    },
  });

  /* ================================================================ Hex rotor */
  RM.register({
    id: 'rotor',
    name: 'Rotor',
    difficulty: 4,
    generate(rng, variant) {
      const K = variant % 4 < 2 ? 6 : 8;
      const recolor = variant % 2 === 1;
      const perRow = variant % 4 === 2;
      const kk = perRow ? rng.sample([1, 2, 3, -1, -2, -3], 3) : [rng.pick(K === 6 ? [1, 2, -1, -2] : [1, 2, 3, -1, -3])];
      const sig = (a) => a.map((v) => (v + 1) % 3);
      const rot = (a, j) => a.map((_, i) => a[RM.mod(i - j, K)]);
      const rows = RM.range(3).map((r) => {
        const k = perRow ? kk[r] : kk[0];
        const s = RM.range(K).map(() => rng.int(0, 2));
        RM.need(new Set(s).size === 3);
        const step = (a) => (recolor ? sig(rot(a, k)) : rot(a, k));
        return [s, step(s), step(step(s))];
      });
      const colorMaps = [[0, 1, 2], [1, 2, 0], [2, 0, 1], [0, 2, 1], [2, 1, 0], [1, 0, 2]].map((p) => (a) => a.map((v) => p[v]));
      if (perRow) {
        const preds = new Set();
        rotHyps(K, true).forEach((h) => {
          if (h(rows[2][0]).join() === rows[2][1].join()) preds.add(h(rows[2][1]).join());
        });
        RM.need(preds.size === 1 && preds.has(rows[2][2].join()));
        [0, 1].forEach((r) => RM.need(rows[r][0].join() !== rows[r][1].join()));
      } else RM.need(uniqueCyclic(rows, K, colorMaps));
      const k3 = perRow ? kk[2] : kk[0];
      const ans = rows[2][2];
      const i1 = rng.int(0, K - 1);
      let i2 = rng.int(0, K - 1);
      while (i2 === i1) i2 = rng.int(0, K - 1);
      const perturb = [
        { apply: (s) => ((s.c = rot(s.c, -2 * k3)), s), why: 'the pattern turned the wrong way' },
        recolor
          ? { apply: (s) => ((s.c = s.c.map((v) => (v + 2) % 3)), s), why: 'the colours were not advanced (white→grey→black→white)' }
          : { apply: (s) => ((s.c[i1] = (s.c[i1] + 1) % 3), s), why: 'one sector has the wrong colour' },
        { apply: (s) => ((s.c[i2] = (s.c[i2] + 2) % 3), s), why: 'a sector has the wrong colour' },
      ];
      const C = ['white', 'gray', 'black'];
      const deg = 360 / K;
      const turn = (k) => `${Math.abs(k) * deg}° ${k > 0 ? 'clockwise' : 'anticlockwise'}`;
      return {
        difficulty: recolor || perRow ? 5 : 4,
        panels: RM.flat(rows.map((r) => r.map((c) => ({ c })))),
        answer: { c: ans },
        render(sp) {
          const pic = new RM.Pic();
          const off = K === 6 ? 0 : 22.5;
          const V = RM.range(K).map((i) => polar(50, 50, 43, off + i * deg));
          sp.c.forEach((v, i) => RM.polygon(pic, [[50, 50], V[i], V[(i + 1) % K]], { fill: C[v], sw: 1.8 }));
          return pic.svg();
        },
        perturb,
        rules: [
          perRow
            ? { k: 'Rotation', t: `inside each row the pattern turns by a fixed amount at every step, but each row has its own speed: row 1 ${turn(kk[0])}, row 2 ${turn(kk[1])}, row 3 <b>${turn(kk[2])}</b>.` }
            : { k: 'Rotation', t: `at every step the whole pattern turns <b>${turn(kk[0])}</b>.` },
        ].concat(recolor ? [{ k: 'Colours', t: 'at the same time every sector changes colour: white → grey → black → white.' }] : []),
      };
    },
  });

  /* ================================================================ Twin rings */
  RM.register({
    id: 'twin-rings',
    name: 'Twin rings',
    difficulty: 4,
    generate(rng) {
      const NO = 8;
      const NI = rng.pick([4, 6]);
      const a = rng.pick([1, 2, 3, -1, -2, -3]);
      const b = rng.pick(NI === 4 ? [1, -1] : [1, 2, -1, -2]) * (a > 0 ? -1 : 1);
      const rot = (arr, j) => arr.map((_, i) => arr[RM.mod(i - j, arr.length)]);
      const ringRows = (N, k, cnt) =>
        RM.range(3).map(() => {
          const on = rng.sample(RM.range(N), cnt);
          const s = RM.range(N).map((i) => on.includes(i));
          return [s, rot(s, k), rot(s, 2 * k)];
        });
      const O = ringRows(NO, a, rng.int(3, 4));
      const I = ringRows(NI, b, 2);
      RM.need(uniqueCyclic(O, NO));
      RM.need(uniqueCyclic(I, NI));
      const cs = rng.sample(['circle', 'star5', 'triangle', 'cross', 'diamond'], 3);
      const Ce = RM.latinGrid(rng, cs);
      RM.needUnique(Ce, Ce[2][2]);
      const ans = { o: O[2][2], i: I[2][2], c: Ce[2][2] };
      const step = (k, N) => `${Math.abs(k) * (360 / N)}° ${k > 0 ? 'clockwise' : 'anticlockwise'}`;
      return {
        panels: RM.flat(RM.grid3((r, c) => ({ o: O[r][c], i: I[r][c], c: Ce[r][c] }))),
        answer: ans,
        render(sp) {
          const pic = new RM.Pic();
          RM.circle(pic, 50, 50, 37, { stroke: RM.LIGHT, sw: 1 });
          RM.circle(pic, 50, 50, 20, { stroke: RM.LIGHT, sw: 1 });
          sp.o.forEach((on, i) => {
            const p = polar(50, 50, 37, i * 45);
            if (on) RM.circle(pic, p[0], p[1], 6.2, { fill: 'black', sw: 0 });
            else RM.circle(pic, p[0], p[1], 1.6, { fill: 'light', sw: 0 });
          });
          sp.i.forEach((on, i) => {
            const p = polar(50, 50, 20, (i * 360) / NI);
            if (on) RM.shape(pic, 'square', p[0], p[1], 5.5, { fill: 'white', sw: 1.8 });
            else RM.circle(pic, p[0], p[1], 1.5, { fill: 'light', sw: 0 });
          });
          RM.shape(pic, sp.c, 50, 50, 6, { fill: 'gray', sw: 1.4 });
          return pic.svg();
        },
        perturb: [
          { apply: (s) => ((s.o = rot(s.o, -2 * a)), s), why: 'the black dots turned the wrong way' },
          { apply: (s) => ((s.i = rot(s.i, -2 * b)), s), why: 'the white squares turned the wrong way' },
          { apply: (s) => ((s.c = Ce[2][1]), s), why: `the centre should be a ${nm(ans.c)}` },
        ],
        rules: [
          { k: 'Outer ring', t: `the black dots turn <b>${step(a, NO)}</b> at every step.` },
          { k: 'Inner ring', t: `the white squares turn <b>${step(b, NI)}</b> at every step — the two rings are independent.` },
          { k: 'Centre', t: `each centre symbol appears once per row and column → <b>${nm(ans.c)}</b>.` },
        ],
      };
    },
  });

  /* ================================================================ Nested shapes */
  RM.register({
    id: 'matryoshka',
    name: 'Matryoshka',
    difficulty: 5,
    generate(rng) {
      const shapes = rng.sample(['circle', 'square', 'hexagon', 'octagon', 'pentagon'], 3);
      const fills = ['white', 'gray', 'black'];
      const ds = rng.pick([1, -1]);
      const df = -ds;
      const shift = (a, d) => a.map((_, i) => a[RM.mod(i - d, 3)]);
      const S = RM.range(3).map(() => {
        const s = rng.shuffle(shapes);
        return [s, shift(s, ds), shift(s, 2 * ds)];
      });
      const F = RM.range(3).map(() => {
        const f = rng.shuffle(fills);
        return [f, shift(f, df), shift(f, 2 * df)];
      });
      RM.need(uniquePerm3(S) && uniquePerm3(F));
      const Sat = RM.latinGrid(rng, [1, 2, 3]);
      RM.needUnique(Sat, Sat[2][2], 'numeric');
      const ans = { s: S[2][2], f: F[2][2], d: Sat[2][2] };
      const R = [43, 27, 12];
      const lvl = ['outer', 'middle', 'inner'];
      const dir = (d) => (d > 0 ? 'one level inwards (the innermost jumps to the outside)' : 'one level outwards (the outermost jumps to the centre)');
      return {
        panels: RM.flat(RM.grid3((r, c) => ({ s: S[r][c], f: F[r][c], d: Sat[r][c] }))),
        answer: ans,
        render(sp) {
          const pic = new RM.Pic();
          for (let i = 0; i < 3; i++) RM.shape(pic, sp.s[i], 50, 50, R[i], { fill: sp.f[i], sw: 2 });
          for (let i = 0; i < sp.d; i++) RM.circle(pic, 92 - i * 7.5, 8, 3.1, { fill: 'black', sw: 0 });
          return pic.svg();
        },
        perturb: [
          { apply: (s) => ((s.s = shift(S[2][1], -ds)), s), why: 'the shapes moved in the wrong direction' },
          { apply: (s) => ((s.f = shift(F[2][1], -df)), s), why: 'the colours moved in the wrong direction' },
          { apply: (s) => ((s.d = 1 + RM.mod(ans.d, 3)), s), why: 'wrong number of corner dots' },
        ],
        rules: [
          { k: 'Shapes', t: `at every step each shape moves <b>${dir(ds)}</b>.` },
          { k: 'Colours', t: `the colours move independently, in the <b>opposite</b> direction: ${dir(df)}.` },
          { k: 'Answer', t: `${lvl.map((l, i) => `${l}: ${fn(ans.f[i])} ${nm(ans.s[i])}`).join(', ')}.` },
          { k: 'Corner dots', t: 'one, two and three dots appear once per row and column.' },
        ],
      };
    },
  });

  /* ================================================================ Decorated needle */
  const DECOS = ['arrow', 'tri', 'dot', 'ring', 'bar', 'square', 'fork'];
  const DECO_NAME = { arrow: 'open arrowhead', tri: 'solid arrowhead', dot: 'black ball', ring: 'white ring', bar: 'cross-bar', square: 'black square', fork: 'fork' };
  function deco(pic, kind, x, y, ang) {
    const u = (d, a) => polar(x, y, d, ang + a);
    if (kind === 'arrow') RM.polyline(pic, [u(10, 150), [x, y], u(10, -150)], { sw: 2.4 });
    else if (kind === 'tri') RM.polygon(pic, [u(3, 0), u(11, 155), u(11, -155)], { fill: 'black', sw: 1 });
    else if (kind === 'dot') RM.circle(pic, x, y, 4.6, { fill: 'black', sw: 0 });
    else if (kind === 'ring') RM.circle(pic, ...u(4.5, 0), 4.5, { fill: 'white', sw: 2 });
    else if (kind === 'bar') {
      const a = u(7, 90);
      const b = u(7, -90);
      RM.line(pic, a[0], a[1], b[0], b[1], { sw: 2.6 });
    } else if (kind === 'square') RM.polygon(pic, [u(5, 45), u(5, 135), u(5, 225), u(5, 315)], { fill: 'black', sw: 1 });
    else if (kind === 'fork') {
      const a = u(9, 35);
      const b = u(9, -35);
      RM.line(pic, x, y, a[0], a[1], { sw: 2.4 });
      RM.line(pic, x, y, b[0], b[1], { sw: 2.4 });
    }
  }
  RM.register({
    id: 'needles',
    name: 'Decorated needles',
    difficulty: 4,
    generate(rng) {
      const d = rng.shuffle(DECOS);
      const setA = d.slice(0, 3);
      const setB = d.slice(3, 6);
      const step = rng.pick([1, 2, 3, -1, -2, -3]);
      const t0 = [rng.int(0, 7), rng.int(0, 7), rng.int(0, 7)];
      const T = RM.grid3((r, c) => RM.mod(t0[r] + step * c, 8));
      const a = rng.pick([1, 2]);
      const A = RM.grid3((r, c) => setA[RM.latin(r, c, a, 0)]);
      const B = RM.grid3((r, c) => setB[RM.latin(r, c, 3 - a, 1)]);
      const styles = rng.shuffle(['solid', 'dashed', 'dotted']);
      const L = RM.grid3((r, c) => styles[c]);
      RM.needUnique(T, T[2][2], 'numeric', 8);
      RM.needUnique(A, A[2][2]);
      RM.needUnique(B, B[2][2]);
      const ans = { t: T[2][2], a: A[2][2], b: B[2][2], l: L[2][2] };
      return {
        panels: RM.flat(RM.grid3((r, c) => ({ t: T[r][c], a: A[r][c], b: B[r][c], l: L[r][c] }))),
        answer: ans,
        key: (s) => (s.t >= 4 ? [s.t - 4, s.b, s.a, s.l] : [s.t, s.a, s.b, s.l]).join(','),
        render(sp) {
          const pic = new RM.Pic();
          const ang = sp.t * 45;
          const pa = polar(50, 50, 33, ang);
          const pb = polar(50, 50, 33, ang + 180);
          RM.line(pic, pb[0], pb[1], pa[0], pa[1], { sw: 2.6, dash: sp.l, cap: sp.l === 'dotted' ? 'round' : 'butt' });
          deco(pic, sp.a, pa[0], pa[1], ang);
          deco(pic, sp.b, pb[0], pb[1], ang + 180);
          return pic.svg();
        },
        perturb: [
          { apply: (s) => ((s.t = RM.mod(ans.t - 2 * step, 8)), s), why: 'the needle turned the wrong way' },
          { apply: (s) => ((s.a = A[2][1]), s), why: `the leading end should carry the ${DECO_NAME[ans.a]}` },
          { apply: (s) => ((s.b = B[2][0]), s), why: `the trailing end should carry the ${DECO_NAME[ans.b]}` },
        ],
        rules: [
          { k: 'Two families of ends', t: `one end always carries one of {${setA.map((x) => DECO_NAME[x]).join(', ')}} (the leading end), the other one of {${setB.map((x) => DECO_NAME[x]).join(', ')}}.` },
          { k: 'Direction', t: `the leading end turns <b>${RM.turn(step)}</b> at every step → it points ${RM.compass(ans.t)}.` },
          { k: 'Decorations', t: `each family is distributed once per row and column → leading end: <b>${DECO_NAME[ans.a]}</b>, trailing end: <b>${DECO_NAME[ans.b]}</b>.` },
          { k: 'Line', t: `the line style depends only on the column → <b>${ans.l}</b>.` },
        ],
      };
    },
  });

  /* ================================================================ Dot-driven rotation */
  RM.register({
    id: 'dot-driven',
    name: 'Dot-driven arrow',
    difficulty: 5,
    generate(rng) {
      const dir = rng.pick([1, -1]);
      const Nd = RM.range(3).map(() => rng.shuffle([1, 2, 3]));
      RM.need(Nd[0].join() !== Nd[1].join());
      const T = RM.range(3).map((r) => {
        const t = [rng.int(0, 7)];
        t.push(RM.mod(t[0] + dir * Nd[r][0], 8));
        t.push(RM.mod(t[1] + dir * Nd[r][1], 8));
        return t;
      });
      const frames = rng.shuffle(['circle', 'square', 'hexagon']);
      const Fr = RM.latinGrid(rng, frames);
      RM.needNoConflict(T, T[2][2], 'numeric', 8);
      RM.needUnique(Fr, Fr[2][2]);
      // the obvious wrong idea (use the dots of the destination panel) must fail on rows 1–2
      RM.need([0, 1].some((r) => RM.mod(T[r][0] + dir * Nd[r][1], 8) !== T[r][1]));
      const ans = { t: T[2][2], n: Nd[2][2], fr: Fr[2][2] };
      const altT = RM.mod(T[2][1] + dir * Nd[2][2], 8);
      RM.need(altT !== ans.t);
      const altN = Nd[2][0];
      const DOTS = { 1: [[50, 50]], 2: [[45.5, 50], [54.5, 50]], 3: [[50, 45.5], [45.8, 52.5], [54.2, 52.5]] };
      return {
        hint: 'measure how far the arrow turns between two neighbouring panels. Is there something in the panels that tells you the amount?',
        panels: RM.flat(RM.grid3((r, c) => ({ t: T[r][c], n: Nd[r][c], fr: Fr[r][c] }))),
        answer: ans,
        render(sp) {
          const pic = new RM.Pic();
          RM.shape(pic, sp.fr, 50, 50, 45, { fill: 'none', sw: 2 });
          const a = sp.t * 45;
          const s = polar(50, 50, 13, a);
          const e = polar(50, 50, 36, a);
          RM.line(pic, s[0], s[1], e[0], e[1], { sw: 2.6 });
          arrowHead(pic, e[0], e[1], a, 9, 'tri');
          DOTS[sp.n].forEach((p) => RM.circle(pic, p[0], p[1], 2.6, { fill: 'black', sw: 0 }));
          return pic.svg();
        },
        perturb: [
          { apply: (s) => ((s.t = altT), s), why: 'the arrow was turned using the wrong panel\'s dots' },
          { apply: (s) => ((s.n = altN), s), why: `there should be ${ans.n} dot${ans.n > 1 ? 's' : ''}` },
          { apply: (s) => ((s.fr = Fr[2][1]), s), why: `the frame should be a ${nm(ans.fr)}` },
        ],
        rules: [
          { k: 'Link between attributes', t: `the number of dots in a panel tells how far the arrow turns to reach the <i>next</i> panel: each dot = <b>45° ${dir > 0 ? 'clockwise' : 'anticlockwise'}</b>.` },
          { k: 'Answer', t: `row 3: the 2nd panel has ${Nd[2][1]} dot${Nd[2][1] > 1 ? 's' : ''}, so the arrow turns ${Nd[2][1] * 45}° ${dir > 0 ? 'clockwise' : 'anticlockwise'} → points ${RM.compass(ans.t)}.` },
          { k: 'Dots', t: `1, 2 and 3 dots appear once in every row → <b>${ans.n}</b>.` },
          { k: 'Frame', t: `each frame appears once per row and column → <b>${nm(ans.fr)}</b>.` },
        ],
      };
    },
  });

  /* ================================================================ Fraction pies */
  RM.register({
    id: 'fraction-pie',
    name: 'Fraction pies',
    difficulty: 4,
    generate(rng, variant) {
      const sub = variant % 2 === 1;
      const K = RM.range(3).map(() => {
        if (sub) {
          const z = rng.int(1, 4);
          const y = rng.int(1, 7 - z);
          return [y + z, y, z];
        }
        const x = rng.int(1, 5);
        const y = rng.int(1, 7 - x);
        return [x, y, x + y];
      });
      const step = rng.pick([1, 2, -1, -2, 3]);
      const a0 = [rng.int(0, 7), rng.int(0, 7), rng.int(0, 7)];
      const A = RM.grid3((r, c) => RM.mod(a0[r] + step * c, 8));
      const fills = rng.shuffle(['black', 'gray', 'hatch']);
      const F = RM.latinGrid(rng, fills);
      const E = RM.grid3((r, c) => RM.mod(A[r][c] + K[r][c], 8));
      RM.needUnique(K, K[2][2], 'numeric');
      RM.needUnique(A, A[2][2], 'numeric', 8);
      RM.needNoConflict(E, E[2][2], 'numeric', 8);
      RM.needUnique(F, F[2][2]);
      const ans = { k: K[2][2], a: A[2][2], f: F[2][2] };
      const altK = ans.k + (ans.k >= 7 ? -1 : ans.k <= 1 ? 1 : rng.pick([1, -1]));
      return {
        panels: RM.flat(RM.grid3((r, c) => ({ k: K[r][c], a: A[r][c], f: F[r][c] }))),
        answer: ans,
        render(sp) {
          const pic = new RM.Pic();
          RM.circle(pic, 50, 50, 40, { fill: 'white', sw: 2 });
          const s = polar(50, 50, 40, sp.a * 45);
          const e = polar(50, 50, 40, (sp.a + sp.k) * 45);
          pic.add(`<path d="M50 50L${RM.fmt(s[0])} ${RM.fmt(s[1])}A40 40 0 ${sp.k > 4 ? 1 : 0} 1 ${RM.fmt(e[0])} ${RM.fmt(e[1])}Z" fill="${pic.paint(sp.f)}" stroke="${RM.INK}" stroke-width="2" stroke-linejoin="round"/>`);
          return pic.svg();
        },
        perturb: [
          { apply: (s) => ((s.k = altK), s), why: `the shaded part should be ${ans.k}/8 of the disc, not ${altK}/8` },
          { apply: (s) => ((s.a = RM.mod(ans.a - 2 * step, 8)), s), why: 'the shaded part starts at the wrong place' },
          { apply: (s) => ((s.f = F[2][1]), s), why: `the shading should be ${fn(ans.f)}` },
        ],
        rules: [
          { k: 'Size', t: `measure the shaded part in eighths: ${sub ? '3rd = 1st − 2nd' : '3rd = 1st + 2nd'}. Row 3: ${K[2][0]}/8 ${sub ? '−' : '+'} ${K[2][1]}/8 = <b>${ans.k}/8</b>.` },
          { k: 'Start', t: `the edge where the shading starts (going clockwise) turns <b>${RM.turn(step)}</b> at every step → it starts at ${RM.compass(ans.a)}.` },
          { k: 'Shading', t: `black, grey and hatched each appear once per row and column → <b>${fn(ans.f)}</b>.` },
        ],
      };
    },
  });

  /* ================================================================ Vector sum */
  RM.register({
    id: 'vector-sum',
    name: 'Vector sum',
    difficulty: 5,
    generate(rng, variant) {
      const sub = variant % 4 === 2;
      const v = () => {
        let p;
        do p = [rng.int(-2, 2), rng.int(-2, 2)];
        while (!p[0] && !p[1]);
        return p;
      };
      const rows = RM.range(3).map(() => {
        const a = v();
        const b = v();
        const c = sub ? [a[0] - b[0], a[1] - b[1]] : [a[0] + b[0], a[1] + b[1]];
        RM.need(Math.abs(c[0]) <= 2 && Math.abs(c[1]) <= 2 && (c[0] || c[1]));
        return [a, b, c];
      });
      const X = rows.map((r) => r.map((p) => p[0]));
      const Y = rows.map((r) => r.map((p) => p[1]));
      RM.needUnique(X, X[2][2], 'numeric');
      RM.needUnique(Y, Y[2][2], 'numeric');
      const heads = rng.shuffle(['tri', 'open', 'dot']);
      const Hd = RM.latinGrid(rng, heads);
      RM.needUnique(Hd, Hd[2][2]);
      const ans = { x: X[2][2], y: Y[2][2], h: Hd[2][2] };
      const dx = Math.abs(ans.x) === 2 ? -Math.sign(ans.x) : rng.pick([1, -1]);
      const dy = Math.abs(ans.y) === 2 ? -Math.sign(ans.y) : rng.pick([1, -1]);
      const U = 16;
      const HN = { tri: 'solid head', open: 'open head', dot: 'ball end' };
      const desc = (x, y) => `${Math.abs(x)} ${x >= 0 ? 'right' : 'left'}, ${Math.abs(y)} ${y >= 0 ? 'down' : 'up'}`;
      return {
        hint: 'treat each arrow as a move on the dot grid (so many columns, so many rows) and look at the arrowheads separately.',
        panels: RM.flat(RM.grid3((r, c) => ({ x: X[r][c], y: Y[r][c], h: Hd[r][c] }))),
        answer: ans,
        render(sp) {
          const pic = new RM.Pic();
          for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) RM.circle(pic, 50 + i * U, 50 + j * U, 1.5, { fill: 'gray', sw: 0 });
          const ex = 50 + sp.x * U;
          const ey = 50 + sp.y * U;
          RM.line(pic, 50, 50, ex, ey, { sw: 2.6 });
          const ang = (Math.atan2(sp.x, -sp.y) * 180) / Math.PI;
          arrowHead(pic, ex, ey, ang, 9, sp.h);
          RM.circle(pic, 50, 50, 3, { fill: 'white', sw: 1.6 });
          return pic.svg();
        },
        perturb: [
          { apply: (s) => ((s.x += dx), s.x || s.y ? s : null), why: 'the arrow ends one column off' },
          { apply: (s) => ((s.y += dy), s.x || s.y ? s : null), why: 'the arrow ends one row off' },
          { apply: (s) => ((s.h = Hd[2][0]), s), why: `the arrow should have a ${HN[ans.h]}` },
        ],
        rules: [
          { k: 'Arrows as moves', t: `read each arrow as a move on the dot grid, starting from the centre. ${sub ? 'The 3rd move = the 1st move <b>minus</b> the 2nd move' : 'The 3rd move = the 1st move <b>followed by</b> the 2nd move (vector addition)'}.` },
          { k: 'Answer', t: `row 3: (${desc(X[2][0], Y[2][0])}) ${sub ? '−' : '+'} (${desc(X[2][1], Y[2][1])}) = <b>${desc(ans.x, ans.y)}</b>.` },
          { k: 'Arrowhead', t: `solid head, open head and ball end appear once per row and column → <b>${HN[ans.h]}</b>.` },
        ],
      };
    },
  });

  /* ================================================================ Stacking order */
  RM.register({
    id: 'z-order',
    name: 'Stacking order',
    difficulty: 4,
    generate(rng) {
      const shapes = rng.sample(['circle', 'square', 'triangle', 'hexagon', 'pentagon', 'diamond'], 3);
      const fills = rng.shuffle(['white', 'light', 'hatch']);
      const up = rng.pick([true, false]);
      const step = (o) => (up ? [o[2], o[0], o[1]] : [o[1], o[2], o[0]]);
      const rows = RM.range(3).map(() => {
        const o = rng.shuffle([0, 1, 2]);
        return [o, step(o), step(step(o))];
      });
      RM.need(new Set(rows.map((r) => r[0].join())).size >= 2);
      RM.need(uniquePerm3(rows));
      const marks = rng.sample(['circle', 'star5', 'triangle', 'square', 'cross'], 3);
      const Mk = RM.latinGrid(rng, marks);
      RM.needUnique(Mk, Mk[2][2]);
      const ans = { o: rows[2][2], m: Mk[2][2] };
      const POS = [[38, 40], [62, 40], [50, 62]];
      const lvl = (o, i) => ['bottom', 'middle', 'top'][o.indexOf(i)];
      return {
        panels: RM.flat(RM.grid3((r, c) => ({ o: rows[r][c], m: Mk[r][c] }))),
        answer: ans,
        render(sp) {
          const pic = new RM.Pic();
          sp.o.forEach((i) => RM.shape(pic, shapes[i], POS[i][0], POS[i][1], 23, { fill: fills[i], sw: 2.2 }));
          RM.shape(pic, sp.m, 88, 12, 5.5, { fill: 'black', sw: 0.6 });
          return pic.svg();
        },
        perturb: [
          { apply: (s) => (([s.o[1], s.o[2]] = [s.o[2], s.o[1]]), s), why: 'the two upper figures are stacked the wrong way round' },
          { apply: (s) => (([s.o[0], s.o[1]] = [s.o[1], s.o[0]]), s), why: 'the two lower figures are stacked the wrong way round' },
          { apply: (s) => ((s.m = Mk[2][1]), s), why: `the corner symbol should be a ${nm(ans.m)}` },
        ],
        rules: [
          { k: 'Stacking', t: up ? 'at every step the figure on <b>top</b> slides to the <b>bottom</b> of the pile; the other two move up one level.' : 'at every step the figure at the <b>bottom</b> comes to the <b>top</b> of the pile; the other two move down one level.' },
          { k: 'Answer', t: `${shapes.map((s, i) => `${nm(s)}: ${lvl(ans.o, i)}`).join(', ')}.` },
          { k: 'Corner symbol', t: `each corner symbol appears once per row and column → <b>${nm(ans.m)}</b>.` },
        ],
      };
    },
  });

  /* ================================================================ Billiards */
  RM.register({
    id: 'billiards',
    name: 'Billiards',
    difficulty: 5,
    generate(rng, variant) {
      const nb = variant % 4 === 0 ? 2 : 3;
      const BALLS = [
        { s: 'circle', f: 'black', n: 'black ball' },
        { s: 'circle', f: 'white', n: 'white ball' },
        { s: 'square', f: 'gray', n: 'grey square' },
      ].slice(0, nb);
      const V = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
      if (variant % 4 === 3) V.push([2, 0], [0, 2], [-2, 0], [0, -2], [2, 1], [1, 2]);
      const bounce = (p, v) => {
        let q = p + v;
        let w = v;
        if (q > 4) {
          q = 8 - q;
          w = -v;
        }
        if (q < 0) {
          q = -q;
          w = -v;
        }
        return [q, w];
      };
      const traj = BALLS.map(() => {
        let p = [rng.int(0, 4), rng.int(0, 4)];
        let v = rng.pick(V);
        const out = [p];
        for (let t = 1; t < 9; t++) {
          const [x, vx] = bounce(p[0], v[0]);
          const [y, vy] = bounce(p[1], v[1]);
          p = [x, y];
          v = [vx, vy];
          out.push(p);
        }
        return { path: out, v0: v };
      });
      const vel0 = traj.map((t) => [t.path[1][0] - t.path[0][0], t.path[1][1] - t.path[0][1]]);
      for (let t = 0; t < 9; t++) RM.need(new Set(traj.map((b) => b.path[t].join())).size === nb);
      // at least one wall bounce, and no row-by-row shortcut that disagrees
      RM.need(traj.some((b) => b.path.some((p, t) => t >= 2 && (p[0] - b.path[t - 1][0] !== b.path[t - 1][0] - b.path[t - 2][0] || p[1] - b.path[t - 1][1] !== b.path[t - 1][1] - b.path[t - 2][1]))));
      traj.forEach((b) => {
        [0, 1].forEach((ax) => {
          const g = RM.grid3((r, c) => b.path[r * 3 + c][ax]);
          RM.needNoConflict(g, g[2][2], 'numeric');
        });
      });
      const ans = { p: traj.map((b) => b.path[8]) };
      const alts = [];
      traj.forEach((b, k) => {
        const p7 = b.path[7];
        const p8 = b.path[8];
        const cands = [p7, [2 * p7[0] - p8[0], 2 * p7[1] - p8[1]], [p8[0] + 1, p8[1]], [p8[0], p8[1] + 1], [p8[0] - 1, p8[1]], [p8[0], p8[1] - 1]];
        const ok = (q) =>
          q[0] >= 0 && q[0] <= 4 && q[1] >= 0 && q[1] <= 4 && (q[0] !== p8[0] || q[1] !== p8[1]) && !ans.p.some((o) => o[0] === q[0] && o[1] === q[1]) && !alts.some((o) => o[0] === q[0] && o[1] === q[1]);
        const alt = cands.find(ok);
        RM.need(!!alt);
        alts.push(alt);
      });
      const dsc = (v) => {
        const parts = [];
        if (v[0]) parts.push(`${Math.abs(v[0])} ${v[0] > 0 ? 'right' : 'left'}`);
        if (v[1]) parts.push(`${Math.abs(v[1])} ${v[1] > 0 ? 'down' : 'up'}`);
        return parts.join(' and ');
      };
      return {
        reading: 'sequence',
        hint: 'follow each ball separately through the 9 panels. What happens when a ball reaches a wall?',
        panels: RM.range(8).map((t) => ({ p: traj.map((b) => b.path[t]) })),
        answer: ans,
        render(sp) {
          const pic = new RM.Pic();
          for (let k = 0; k <= 5; k++) {
            RM.line(pic, 10 + k * 16, 10, 10 + k * 16, 90, { sw: 0.7, color: RM.LIGHT, cap: 'butt' });
            RM.line(pic, 10, 10 + k * 16, 90, 10 + k * 16, { sw: 0.7, color: RM.LIGHT, cap: 'butt' });
          }
          pic.add(`<rect x="10" y="10" width="80" height="80" fill="none" stroke="${RM.INK}" stroke-width="1.6"/>`);
          sp.p.forEach((p, k) => RM.shape(pic, BALLS[k].s, 18 + p[0] * 16, 18 + p[1] * 16, 6, { fill: BALLS[k].f, sw: 1.8 }));
          return pic.svg();
        },
        perturb: BALLS.map((b, k) => ({ apply: (s) => ((s.p[k] = alts[k]), s), why: `the ${b.n} is in the wrong cell` })).concat(
          nb === 2 ? [{ apply: (s) => ((s.p = s.p.slice().reverse()), s), why: 'the two balls are swapped' }] : []
        ),
        rules: [
          { k: 'Reading order', t: 'this one is a <b>sequence</b>: read the 9 panels like a text — left to right, then the next row. Each panel is one moment.' },
        ]
          .concat(BALLS.map((b, k) => ({ k: RM.cap(b.n), t: `moves <b>${dsc(vel0[k])}</b> per panel and bounces off the walls (its direction reverses on the axis that hit the wall).` })))
          .concat([{ k: 'Answer', t: 'continue each trajectory one more step from panel 8.' }]),
      };
    },
  });
})();
