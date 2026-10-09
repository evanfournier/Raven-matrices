/* Puzzle families based on set logic, colour algebra and transformations. */
(function () {
  'use strict';
  const RM = window.RM;
  const { nm } = RM;

  /* ---------------------------------------------------------- dihedral group on an n×n grid */
  const D4 = {
    id: { m: (x, y, n) => [x, y], t: 'left unchanged' },
    r90: { m: (x, y, n) => [n - 1 - y, x], t: 'rotated 90° clockwise' },
    r180: { m: (x, y, n) => [n - 1 - x, n - 1 - y], t: 'rotated 180°' },
    r270: { m: (x, y, n) => [y, n - 1 - x], t: 'rotated 90° anticlockwise' },
    fh: { m: (x, y, n) => [n - 1 - x, y], t: 'mirrored left ↔ right' },
    fv: { m: (x, y, n) => [x, n - 1 - y], t: 'mirrored top ↔ bottom' },
    tr: { m: (x, y, n) => [y, x], t: 'mirrored across the ↘ diagonal' },
    at: { m: (x, y, n) => [n - 1 - y, n - 1 - x], t: 'mirrored across the ↗ diagonal' },
  };
  RM.D4 = D4;
  const D4K = Object.keys(D4);
  /* transform an n×n array (row-major) */
  function tgrid(arr, n, k) {
    const out = new Array(n * n);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const [X, Y] = D4[k].m(x, y, n);
        out[Y * n + X] = arr[y * n + x];
      }
    return out;
  }
  RM.tgrid = tgrid;
  /* composition: the D4 key equal to "apply a, then b" */
  function compose(a, b) {
    const test = RM.range(9).map((i) => i);
    const want = tgrid(tgrid(test, 3, a), 3, b).join(',');
    return D4K.find((k) => tgrid(test, 3, k).join(',') === want);
  }
  RM.composeD4 = compose;

  function randBits(rng, n, p) {
    return RM.range(n).map(() => rng.next() < p);
  }
  const count = (a) => a.filter(Boolean).length;
  const bkey = (a) => a.map((v) => (v ? 1 : 0)).join('');

  /* Shared perturbations for "boolean overlay" puzzles: toggle elements of
   * different input classes (in both / only 1st / only 2nd / in neither). */
  function boolPerturb(rng, A, B, C, f, noun) {
    const cls = { 11: [], 10: [], '01': [], '00': [] };
    A.forEach((a, i) => cls[(a ? '1' : '0') + (B[i] ? '1' : '0')].push(i));
    const cand = [];
    if (cls[11].length >= 1 && cls[11].length <= 4)
      cand.push({ set: cls[11], why: `${noun}s present in both panels should be ${f(true, true) ? 'kept' : 'removed'}` });
    if (cls[10].length) cand.push({ set: [rng.pick(cls[10])], why: `a ${noun} that is only in the 1st panel is handled wrongly` });
    if (cls['01'].length) cand.push({ set: [rng.pick(cls['01'])], why: `a ${noun} that is only in the 2nd panel is handled wrongly` });
    if (cls['00'].length) cand.push({ set: [rng.pick(cls['00'])], why: `a ${noun} appears where both panels are empty` });
    if (cls[11].length > 4) cand.push({ set: [rng.pick(cls[11])], why: `a ${noun} present in both panels should be ${f(true, true) ? 'kept' : 'removed'}` });
    RM.need(cand.length >= 3);
    return cand.slice(0, 3).map((c) => ({
      apply: (s) => {
        c.set.forEach((i) => (s.on[i] = !s.on[i]));
        return s;
      },
      why: c.why,
    }));
  }

  /* Every two-input boolean function (optionally with a D4 transform on one
   * input or the output) that fits rows 1–2 must predict the same row 3. */
  function uniqueBool(rows, n) {
    const preds = new Set();
    const hyps = [];
    const tks = n ? D4K : ['id'];
    tks.forEach((k) => {
      hyps.push({ ta: 'id', tb: k, tc: 'id' });
      if (k !== 'id') {
        hyps.push({ ta: k, tb: 'id', tc: 'id' });
        hyps.push({ ta: 'id', tb: 'id', tc: k });
      }
    });
    const T = (arr, k) => (k === 'id' ? arr : tgrid(arr, n, k));
    for (const h of hyps)
      for (const f of RM.ALL_BOOL) {
        const ok = [0, 1].every((r) => {
          const a = T(rows[r][0], h.ta);
          const b = T(rows[r][1], h.tb);
          return bkey(T(a.map((v, i) => f(v, b[i])), h.tc)) === bkey(rows[r][2]);
        });
        if (!ok) continue;
        const a = T(rows[2][0], h.ta);
        const b = T(rows[2][1], h.tb);
        preds.add(bkey(T(a.map((v, i) => f(v, b[i])), h.tc)));
      }
    return preds.size === 1 && preds.has(bkey(rows[2][2]));
  }

  /* ================================================================ Pixel logic */
  RM.register({
    id: 'pixel-logic',
    name: 'Pixel logic',
    difficulty: 3,
    generate(rng, variant) {
      const n = [4, 4, 5, 4][variant % 4];
      const fname = rng.pick([['xor', 'or'], ['andnot', 'and', 'xnor'], ['xor', 'notand', 'or'], ['xor', 'or', 'andnot']][variant % 4]);
      const T = variant % 4 === 3 ? rng.pick(['r90', 'r180', 'fh', 'fv', 'tr']) : 'id';
      const look = variant % 4 === 1 ? 'dots' : 'squares';
      const f = RM.BOOL[fname].f;
      const nn = n * n;
      const rows = RM.range(3).map(() => {
        const A = randBits(rng, nn, rng.int(35, 50) / 100);
        const B = randBits(rng, nn, rng.int(35, 50) / 100);
        const Bt = T === 'id' ? B : tgrid(B, n, T);
        const C = A.map((a, i) => f(a, Bt[i]));
        RM.need(count(C) >= 2 && count(C) <= nn - 2 && bkey(C) !== bkey(A) && bkey(C) !== bkey(B));
        return [A, B, C];
      });
      RM.need(uniqueBool(rows, n));
      const ans = { on: rows[2][2] };
      const Bt3 = T === 'id' ? rows[2][1] : tgrid(rows[2][1], n, T);
      return {
        difficulty: T !== 'id' ? 5 : fname === 'xor' || fname === 'or' ? 3 : 4,
        hint: 'compare panels 1 and 2 with panel 3 cell by cell: which cells survive, which disappear?' + (T !== 'id' ? ' One of the panels is moved before being combined.' : ''),
        panels: RM.flat(rows.map((r) => r.map((on) => ({ on })))),
        answer: ans,
        key: (s) => bkey(s.on),
        render(sp) {
          const pic = new RM.Pic();
          const s = 80 / n;
          for (let i = 0; i < nn; i++) {
            const x = 10 + (i % n) * s;
            const y = 10 + Math.floor(i / n) * s;
            if (look === 'dots') {
              if (sp.on[i]) RM.circle(pic, x + s / 2, y + s / 2, s * 0.36, { fill: 'black', sw: 0 });
              else RM.circle(pic, x + s / 2, y + s / 2, 1.4, { fill: 'light', sw: 0 });
            } else if (sp.on[i]) pic.add(`<rect x="${RM.fmt(x)}" y="${RM.fmt(y)}" width="${RM.fmt(s)}" height="${RM.fmt(s)}" fill="${RM.INK}"/>`);
          }
          if (look === 'squares') {
            for (let k = 1; k < n; k++) {
              RM.line(pic, 10 + k * s, 10, 10 + k * s, 90, { sw: 0.6, color: RM.GRAY, cap: 'butt' });
              RM.line(pic, 10, 10 + k * s, 90, 10 + k * s, { sw: 0.6, color: RM.GRAY, cap: 'butt' });
            }
          }
          pic.add(`<rect x="10" y="10" width="80" height="80" fill="none" stroke="${RM.INK}" stroke-width="1.6"/>`);
          return pic.svg();
        },
        perturb: boolPerturb(rng, rows[2][0], Bt3, rows[2][2], f, look === 'dots' ? 'dot' : 'square'),
        rules: [
          { k: 'Rule', t: `work cell by cell along each row: ${RM.BOOL[fname].text}.` },
        ]
          .concat(T !== 'id' ? [{ k: 'Twist', t: `before combining, the 2nd panel is <b>${D4[T].t}</b>. Check it on rows 1 and 2.` }] : [])
          .concat([{ k: 'Answer', t: `apply the same operation to the two panels of row 3 → ${count(ans.on)} filled cells.` }]),
      };
    },
  });

  /* ================================================================ Segment logic */
  function polar(cx, cy, r, a) {
    return [cx + r * Math.sin((a * Math.PI) / 180), cy - r * Math.cos((a * Math.PI) / 180)];
  }
  const SEG_TEMPLATES = {
    star8() {
      const P = (k) => polar(50, 50, 40, k * 45);
      const segs = [];
      for (let k = 0; k < 8; k++) segs.push([[50, 50], P(k)]);
      for (let k = 0; k < 8; k++) segs.push([P(k), P(k + 1)]);
      return { segs, pts: [[50, 50]].concat(RM.range(8).map(P)) };
    },
    pentagram() {
      const P = (k) => polar(50, 53, 42, k * 72);
      const segs = [];
      for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) segs.push([P(i), P(j)]);
      return { segs, pts: RM.range(5).map(P) };
    },
    flag() {
      const c = [[12, 12], [50, 12], [88, 12], [88, 50], [88, 88], [50, 88], [12, 88], [12, 50]];
      const segs = [];
      for (let i = 0; i < 8; i++) segs.push([c[i], c[(i + 1) % 8]]);
      for (let i = 0; i < 8; i++) segs.push([[50, 50], c[i]]);
      return { segs, pts: c.concat([[50, 50]]) };
    },
    hexwheel() {
      const P = (k) => polar(50, 50, 41, 30 + k * 60);
      const segs = [];
      for (let k = 0; k < 6; k++) segs.push([P(k), P(k + 1)]);
      for (let k = 0; k < 6; k++) segs.push([[50, 50], P(k)]);
      for (let k = 0; k < 6; k += 2) segs.push([P(k), P(k + 2)]);
      return { segs, pts: [[50, 50]].concat(RM.range(6).map(P)) };
    },
    lattice() {
      const p = (i, j) => [15 + i * 35, 15 + j * 35];
      const segs = [];
      for (let j = 0; j < 3; j++) for (let i = 0; i < 2; i++) segs.push([p(i, j), p(i + 1, j)]);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) segs.push([p(i, j), p(i, j + 1)]);
      segs.push([p(0, 0), p(1, 1)], [p(2, 0), p(1, 1)], [p(0, 2), p(1, 1)], [p(2, 2), p(1, 1)]);
      const pts = [];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) pts.push(p(i, j));
      return { segs, pts };
    },
  };
  RM.register({
    id: 'segment-logic',
    name: 'Line logic',
    difficulty: 4,
    generate(rng, variant) {
      const tname = [['star8'], ['pentagram', 'hexwheel'], ['flag'], ['lattice', 'hexwheel']][variant % 4];
      const tpl = SEG_TEMPLATES[rng.pick(tname)]();
      const fname = rng.pick([['xor'], ['xor', 'or'], ['andnot', 'xor'], ['xor', 'notand', 'and']][variant % 4]);
      const f = RM.BOOL[fname].f;
      const m = tpl.segs.length;
      const rows = RM.range(3).map(() => {
        const A = randBits(rng, m, 0.42);
        const B = randBits(rng, m, 0.42);
        const C = A.map((a, i) => f(a, B[i]));
        RM.need(count(A) >= 3 && count(B) >= 3 && count(C) >= 2 && count(C) <= m - 2 && bkey(C) !== bkey(A) && bkey(C) !== bkey(B));
        return [A, B, C];
      });
      RM.need(uniqueBool(rows, 0));
      const ans = { on: rows[2][2] };
      return {
        hint: 'treat every single line segment as a separate element and compare panels 1 and 2 with panel 3.',
        panels: RM.flat(rows.map((r) => r.map((on) => ({ on })))),
        answer: ans,
        key: (s) => bkey(s.on),
        render(sp) {
          const pic = new RM.Pic();
          tpl.pts.forEach((p) => RM.circle(pic, p[0], p[1], 1.5, { fill: 'light', sw: 0 }));
          tpl.segs.forEach((sg, i) => {
            if (sp.on[i]) RM.line(pic, sg[0][0], sg[0][1], sg[1][0], sg[1][1], { sw: 3 });
          });
          return pic.svg();
        },
        perturb: boolPerturb(rng, rows[2][0], rows[2][1], rows[2][2], f, 'line'),
        rules: [
          { k: 'Rule', t: `treat each individual line (between two of the faint points) separately: ${RM.BOOL[fname].text}.` },
          { k: 'Answer', t: `apply it to the two panels of row 3 → ${count(ans.on)} lines.` },
        ],
      };
    },
  });

  /* ================================================================ Region logic */
  const REGION_TEMPLATES = {
    venn: { n: 7 },
    tiles: { n: 8 },
    target: { n: 12 },
  };
  function annular(r0, r1, a0, a1) {
    const p = (r, a) => polar(50, 50, r, a).map(RM.fmt).join(' ');
    if (r0 === 0) return `M50 50L${p(r1, a0)}A${r1} ${r1} 0 0 1 ${p(r1, a1)}Z`;
    return `M${p(r1, a0)}A${r1} ${r1} 0 0 1 ${p(r1, a1)}L${p(r0, a1)}A${r0} ${r0} 0 0 0 ${p(r0, a0)}Z`;
  }
  RM.register({
    id: 'region-logic',
    name: 'Region logic',
    difficulty: 4,
    generate(rng, variant) {
      const tname = ['venn', 'tiles', 'target', rng.pick(['venn', 'target'])][variant % 4];
      const m = REGION_TEMPLATES[tname].n;
      const fname = rng.pick([['xor', 'or'], ['xor', 'andnot'], ['xor', 'and', 'or'], ['xnor', 'notand', 'xor']][variant % 4]);
      const f = RM.BOOL[fname].f;
      const rows = RM.range(3).map(() => {
        const A = randBits(rng, m, 0.45);
        const B = randBits(rng, m, 0.45);
        const C = A.map((a, i) => f(a, B[i]));
        RM.need(count(A) >= 2 && count(B) >= 2 && count(C) >= 1 && count(C) <= m - 1 && bkey(C) !== bkey(A) && bkey(C) !== bkey(B));
        return [A, B, C];
      });
      RM.need(uniqueBool(rows, 0));
      const ans = { on: rows[2][2] };
      const SHADE = '#6b7280';
      const VC = [[39, 41], [61, 41], [50, 60]];
      return {
        hint: 'treat every region as a separate element and compare panels 1 and 2 with panel 3.',
        panels: RM.flat(rows.map((r) => r.map((on) => ({ on })))),
        answer: ans,
        key: (s) => bkey(s.on),
        render(sp) {
          const pic = new RM.Pic();
          if (tname === 'venn') {
            const clip = VC.map((c, k) => pic.def('c' + k, (id) => `<clipPath id="${id}"><circle cx="${c[0]}" cy="${c[1]}" r="25"/></clipPath>`));
            sp.on.forEach((on, i) => {
              if (!on) return;
              const bits = i + 1;
              const inside = [0, 1, 2].filter((k) => bits & (1 << k));
              const outside = [0, 1, 2].filter((k) => !(bits & (1 << k)));
              let el = `<rect width="100" height="100" fill="${SHADE}"`;
              if (outside.length) {
                const mid = pic.def('m' + outside.join(''), (id) => `<mask id="${id}"><rect width="100" height="100" fill="#fff"/>${outside.map((k) => `<circle cx="${VC[k][0]}" cy="${VC[k][1]}" r="25" fill="#000"/>`).join('')}</mask>`);
                el += ` mask="url(#${mid})"`;
              }
              el += '/>';
              inside.forEach((k) => (el = `<g clip-path="url(#${clip[k]})">${el}</g>`));
              pic.add(el);
            });
            VC.forEach((c) => RM.circle(pic, c[0], c[1], 25, { sw: 1.8 }));
          } else if (tname === 'tiles') {
            const c = [[12, 12], [50, 12], [88, 12], [88, 50], [88, 88], [50, 88], [12, 88], [12, 50]];
            for (let i = 0; i < 8; i++) RM.polygon(pic, [[50, 50], c[i], c[(i + 1) % 8]], { fill: sp.on[i] ? SHADE : 'white', sw: 1.8 });
          } else {
            const radii = [0, 14, 28, 42];
            for (let ring = 0; ring < 3; ring++)
              for (let q = 0; q < 4; q++) {
                const i = ring * 4 + q;
                pic.add(`<path d="${annular(radii[ring], radii[ring + 1], q * 90, q * 90 + 90)}" fill="${sp.on[i] ? SHADE : '#fff'}" stroke="${RM.INK}" stroke-width="1.8" stroke-linejoin="round"/>`);
              }
          }
          return pic.svg();
        },
        perturb: boolPerturb(rng, rows[2][0], rows[2][1], rows[2][2], f, 'region'),
        rules: [
          { k: 'Rule', t: `look at each region of the figure separately: ${RM.BOOL[fname].text}.` },
          { k: 'Answer', t: `apply it to the two panels of row 3 → ${count(ans.on)} shaded region${count(ans.on) === 1 ? '' : 's'}.` },
        ],
      };
    },
  });

  /* ================================================================ Colour algebra */
  const SYM = ['empty', '○', '●'];
  const TABLES = {
    add3: { f: (a, b) => (a + b) % 3, d: 5, name: 'colours add up like numbers modulo 3 (empty = 0, white = 1, black = 2)' },
    sub3: { f: (a, b) => RM.mod(a - b, 3), d: 5, name: '1st minus 2nd, modulo 3 (empty = 0, white = 1, black = 2) — order matters' },
    sat: { f: (a, b) => Math.min(a + b, 2), d: 4, name: 'darkness adds up (empty = 0, white = 1, black = 2) but cannot go beyond black' },
    swap: { f: (a, b) => (a === 0 ? b : b === 0 ? a : a === b ? 0 : 3 - a), d: 5, name: 'a colour meeting an empty spot is kept; two identical colours cancel out; when white meets black, the colour of the 2nd panel wins' },
  };
  const ALT_TABLES = [
    (a, b) => (a + b) % 3,
    (a, b) => RM.mod(a - b, 3),
    (a, b) => RM.mod(b - a, 3),
    (a, b) => Math.min(a + b, 2),
    Math.max,
    Math.min,
    (a) => a,
    (a, b) => b,
    (a, b) => ((a > 0) !== (b > 0) ? Math.max(a, b) : 0),
    (a, b) => (a * b) % 3,
    (a, b) => (a === 0 ? b : b === 0 ? a : a === b ? 0 : 3 - a),
  ];
  const LAYOUTS = {
    ring8: { pts: RM.range(8).map((k) => polar(50, 50, 33, k * 45)), r: 9, names: ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'] },
    grid9: {
      pts: RM.range(9).map((i) => [22 + (i % 3) * 28, 22 + Math.floor(i / 3) * 28]),
      r: 10,
      names: ['top-left', 'top-centre', 'top-right', 'middle-left', 'centre', 'middle-right', 'bottom-left', 'bottom-centre', 'bottom-right'],
    },
    hex7: {
      pts: [[50, 50]].concat(RM.range(6).map((k) => polar(50, 50, 31, k * 60))),
      r: 10,
      names: ['centre', 'top', 'upper-right', 'lower-right', 'bottom', 'lower-left', 'upper-left'],
    },
  };
  RM.register({
    id: 'color-algebra',
    name: 'Colour algebra',
    difficulty: 5,
    generate(rng, variant) {
      const tk = ['sat', 'add3', 'sub3', 'swap'][variant % 4];
      const lay = LAYOUTS[rng.pick(['ring8', 'grid9', 'hex7'])];
      const N = lay.pts.length;
      const tbl = TABLES[tk];
      const st = () => rng.pick([0, 1, 1, 2, 2]);
      const rows = RM.range(3).map(() => {
        const A = RM.range(N).map(st);
        const B = RM.range(N).map(st);
        return [A, B, A.map((a, i) => tbl.f(a, B[i]))];
      });
      const seen = new Set();
      [0, 1].forEach((r) => rows[r][0].forEach((a, i) => seen.add(a + ',' + rows[r][1][i])));
      RM.need(rows[2][0].every((a, i) => seen.has(a + ',' + rows[2][1][i])));
      RM.need([1, 2].every((a) => [1, 2].every((b) => seen.has(a + ',' + b))));
      const ansKey = rows[2][2].join('');
      const preds = new Set();
      ALT_TABLES.forEach((g) => {
        if ([0, 1].every((r) => rows[r][0].every((a, i) => g(a, rows[r][1][i]) === rows[r][2][i]))) preds.add(rows[2][0].map((a, i) => g(a, rows[2][1][i])).join(''));
      });
      RM.need(preds.size <= 1 && (!preds.size || preds.has(ansKey)));
      const C = rows[2][2];
      RM.need(C.some((v) => v > 0) && C.join('') !== rows[2][0].join('') && C.join('') !== rows[2][1].join(''));
      const idx = rng.shuffle(RM.range(N)).sort((i, j) => (rows[2][0][j] > 0 && rows[2][1][j] > 0) - (rows[2][0][i] > 0 && rows[2][1][i] > 0)).slice(0, 3);
      const sname = (v) => ['empty', 'white', 'black'][v];
      const perturb = idx.map((i) => {
        const a = rows[2][0][i];
        const b = rows[2][1][i];
        let alt = Math.max(a, b);
        if (alt === C[i]) alt = (C[i] + 1) % 3;
        return { apply: (s) => ((s.s[i] = alt), s), why: `the ${lay.names[i]} spot should be ${sname(C[i])} (${SYM[a]} with ${SYM[b]} gives ${SYM[C[i]]})` };
      });
      const table = [];
      [1, 2].forEach((a) => [1, 2].forEach((b) => table.push(`${SYM[a]} with ${SYM[b]} → ${SYM[tbl.f(a, b)]}`)));
      table.push(`${SYM[1]} with empty → ${SYM[tbl.f(1, 0)]}`, `empty with ${SYM[2]} → ${SYM[tbl.f(0, 2)]}`);
      return {
        difficulty: tbl.d,
        hint: 'each spot of panel 3 depends only on the same spot in panels 1 and 2. Build a little "colour with colour" table from rows 1 and 2.',
        panels: RM.flat(rows.map((r) => r.map((s) => ({ s })))),
        answer: { s: C },
        render(sp) {
          const pic = new RM.Pic();
          sp.s.forEach((v, i) => {
            const [x, y] = lay.pts[i];
            if (v === 0) RM.circle(pic, x, y, 1.6, { fill: 'light', sw: 0 });
            else RM.circle(pic, x, y, lay.r, { fill: v === 2 ? 'black' : 'white', sw: 2 });
          });
          return pic.svg();
        },
        perturb,
        rules: [
          { k: 'Spot by spot', t: `each position combines the same position of panels 1 and 2. Here: ${tbl.name}.` },
          { k: 'Table', t: table.join(' · ') + ' (the order is 1st panel with 2nd panel).' },
          { k: 'Method', t: 'read the table off rows 1 and 2 (every combination you need appears there), then apply it to row 3.' },
        ],
      };
    },
  });

  /* ================================================================ Wrap-around shift */
  RM.register({
    id: 'wrap-shift',
    name: 'Torus slide',
    difficulty: 4,
    generate(rng, variant) {
      const n = variant % 4 === 3 ? 5 : 4;
      const nn = n * n;
      const swap = variant % 2 === 1;
      const [dx, dy] = rng.pick([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [2, 1], [1, 2]]);
      const shift = (arr, sx, sy) => {
        const out = new Array(nn);
        for (let i = 0; i < nn; i++) out[RM.mod(Math.floor(i / n) + sy, n) * n + RM.mod((i % n) + sx, n)] = arr[i];
        return out;
      };
      const recolor = (arr) => arr.map((v) => (v === 0 ? 0 : 3 - v));
      const step = (arr) => (swap ? recolor(shift(arr, dx, dy)) : shift(arr, dx, dy));
      const rows = RM.range(3).map(() => {
        const base = RM.range(nn).map(() => (rng.next() < 0.36 ? rng.pick([1, 2]) : 0));
        RM.need(base.filter((v) => v).length >= 4);
        RM.need(base.some((v) => v === 1) && base.some((v) => v === 2));
        const b = step(base);
        return [base, b, step(b)];
      });
      // every shift (+ optional D4 transform and colour swap) that fits rows 1–2 must agree on row 3
      const preds = new Set();
      for (const k of D4K)
        for (let sx = 0; sx < n; sx++)
          for (let sy = 0; sy < n; sy++)
            for (const sw of [false, true]) {
              const H = (a) => {
                const t = shift(tgrid(a, n, k), sx, sy);
                return sw ? recolor(t) : t;
              };
              if ([0, 1].every((r) => H(rows[r][0]).join('') === rows[r][1].join('') && H(rows[r][1]).join('') === rows[r][2].join('')))
                preds.add(H(rows[2][1]).join(''));
            }
      RM.need(preds.size === 1 && preds.has(rows[2][2].join('')));
      const ans = rows[2][2];
      const colored = ans.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
      const [c1, c2] = rng.sample(colored, 2);
      const perturb = [
        { apply: (s) => ((s.c = shift(s.c, -2 * dx, -2 * dy)), s), why: 'the pattern slid in the opposite direction' },
        swap
          ? { apply: (s) => ((s.c = recolor(s.c)), s), why: 'the grey and black squares were not swapped' }
          : { apply: (s) => ((s.c[c1] = 0), s), why: 'one coloured square is missing' },
        { apply: (s) => ((s.c[c2] = s.c[c2] === 1 ? 2 : s.c[c2] === 2 ? 1 : 1), s), why: 'one square has the wrong colour' },
      ];
      const dir = [];
      if (dx) dir.push(`${Math.abs(dx)} square${Math.abs(dx) > 1 ? 's' : ''} ${dx > 0 ? 'right' : 'left'}`);
      if (dy) dir.push(`${Math.abs(dy)} square${Math.abs(dy) > 1 ? 's' : ''} ${dy > 0 ? 'down' : 'up'}`);
      return {
        difficulty: swap || n === 5 ? 5 : 4,
        hint: 'follow one distinctive group of squares from panel to panel. Where do squares go when they leave an edge?',
        panels: RM.flat(rows.map((r) => r.map((c) => ({ c })))),
        answer: { c: ans },
        render(sp) {
          const pic = new RM.Pic();
          const s = 80 / n;
          sp.c.forEach((v, i) => {
            if (!v) return;
            pic.add(`<rect x="${RM.fmt(10 + (i % n) * s)}" y="${RM.fmt(10 + Math.floor(i / n) * s)}" width="${RM.fmt(s)}" height="${RM.fmt(s)}" fill="${v === 2 ? RM.INK : RM.GRAY}"/>`);
          });
          for (let k = 1; k < n; k++) {
            RM.line(pic, 10 + k * s, 10, 10 + k * s, 90, { sw: 0.6, color: RM.LIGHT, cap: 'butt' });
            RM.line(pic, 10, 10 + k * s, 90, 10 + k * s, { sw: 0.6, color: RM.LIGHT, cap: 'butt' });
          }
          pic.add(`<rect x="10" y="10" width="80" height="80" fill="none" stroke="${RM.INK}" stroke-width="1.6"/>`);
          return pic.svg();
        },
        perturb,
        rules: [
          { k: 'Slide', t: `at every step the whole pattern slides <b>${RM.list(dir)}</b>. Squares that leave one edge come back in on the opposite edge (as if the grid were wrapped around a doughnut).` },
        ].concat(swap ? [{ k: 'Colour swap', t: 'at every step the grey squares also become black and the black squares become grey.' }] : []),
      };
    },
  });

  /* ================================================================ Permutation */
  function isDihedralOfCycle(P) {
    const k = P.length;
    for (let s = 0; s < k; s++) {
      if (P.every((v, i) => v === (i + s) % k)) return true;
      if (P.every((v, i) => v === RM.mod(s - i, k))) return true;
    }
    return false;
  }
  function order(P) {
    let cur = P.slice();
    for (let o = 1; o <= 12; o++) {
      if (cur.every((v, i) => v === i)) return o;
      cur = cur.map((v) => P[v]);
    }
    return 99;
  }
  RM.register({
    id: 'permutation',
    name: 'Shuffle code',
    difficulty: 4,
    generate(rng, variant) {
      const kind = ['bands', 'ring', 'hbands', 'ring'][variant % 4];
      const k = kind === 'ring' ? rng.pick([5, 6]) : kind === 'bands' ? 4 : 5;
      let P;
      for (let t = 0; t < 50; t++) {
        P = rng.shuffle(RM.range(k));
        if (order(P) >= 3 && !isDihedralOfCycle(P)) break;
        P = null;
      }
      RM.need(!!P);
      const items = kind === 'ring'
        ? rng.sample(['circle', 'square', 'triangle', 'star5', 'diamond', 'cross', 'heart', 'hexagon'], k)
        : rng.sample(['white', 'black', 'gray', 'hatch', kind === 'bands' ? 'vlines' : 'hlines', 'dots', 'xgrid'], k);
      const fills = kind === 'ring' ? rng.shuffle(['black', 'white', 'gray', 'black', 'white', 'gray']).slice(0, k) : null;
      const apply = (arr) => {
        const out = new Array(k);
        arr.forEach((v, i) => (out[P[i]] = v));
        return out;
      };
      const rows = RM.range(3).map(() => {
        const s = rng.shuffle(items);
        const b = apply(s);
        return [s, b, apply(b)];
      });
      RM.need(rows[0][0].join() !== rows[1][0].join());
      const ans = rows[2][2];
      const posName =
        kind === 'ring'
          ? k === 5
            ? ['top', 'upper right', 'lower right', 'lower left', 'upper left']
            : ['top', 'upper right', 'lower right', 'bottom', 'lower left', 'upper left']
          : kind === 'bands'
            ? ['band 1 (left)', 'band 2', 'band 3', 'band 4 (right)']
            : ['band 1 (top)', 'band 2', 'band 3', 'band 4', 'band 5 (bottom)'];
      const pairs = rng.shuffle([[0, 1], [k - 2, k - 1], [0, k - 1], [1, 2], [0, 2]]).slice(0, 3);
      const itemName = (v) => (kind === 'ring' ? nm(v) : RM.fn(v));
      return {
        hint: 'track where each individual element goes from panel 1 to panel 2. Does the same thing happen from panel 2 to panel 3?',
        panels: RM.flat(rows.map((r) => r.map((a) => ({ a })))),
        answer: { a: ans },
        render(sp) {
          const pic = new RM.Pic();
          if (kind === 'ring') {
            sp.a.forEach((v, i) => {
              const [x, y] = polar(50, 50, 32, (360 / k) * i);
              RM.shape(pic, v, x, y, 11, { fill: fills[items.indexOf(v)], sw: 1.8 });
            });
          } else if (kind === 'bands') {
            const w = 80 / k;
            sp.a.forEach((v, i) => pic.add(`<rect x="${RM.fmt(10 + i * w)}" y="10" width="${RM.fmt(w)}" height="80" fill="${pic.paint(v)}" stroke="${RM.INK}" stroke-width="1.4"/>`));
          } else {
            const h = 80 / k;
            sp.a.forEach((v, i) => pic.add(`<rect x="10" y="${RM.fmt(10 + i * h)}" width="80" height="${RM.fmt(h)}" fill="${pic.paint(v)}" stroke="${RM.INK}" stroke-width="1.4"/>`));
          }
          return pic.svg();
        },
        perturb: pairs.map(([i, j]) => ({
          apply: (s) => {
            const t = s.a[i];
            s.a[i] = s.a[j];
            s.a[j] = t;
            return s;
          },
          why: `the elements at ${posName[i]} and ${posName[j]} are swapped`,
        })),
        rules: [
          { k: 'Shuffle', t: `every step applies the <b>same reshuffle</b> of positions: ${RM.range(k).map((i) => `${posName[i]} → ${posName[P[i]]}`).join('; ')}.` },
          { k: 'Answer', t: `apply that reshuffle to the 2nd panel of row 3: ${ans.map(itemName).join(', ')} (in position order).` },
        ],
      };
    },
  });

  /* ================================================================ Dihedral chains */
  function polyomino(rng, size) {
    const cells = new Set([rng.int(0, 15)]);
    while (cells.size < size) {
      const c = rng.pick(Array.from(cells));
      const x = c % 4;
      const y = Math.floor(c / 4);
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [x + a, y + b]).filter(([a, b]) => a >= 0 && a < 4 && b >= 0 && b < 4);
      const [a, b] = rng.pick(nb);
      cells.add(b * 4 + a);
    }
    const arr = RM.range(16).map((i) => (cells.has(i) ? 2 : 0));
    if (size >= 6) {
      const on = arr.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
      arr[rng.pick(on)] = 1;
    }
    return { kind: 'poly', n: 4, c: arr };
  }
  function lineGlyph(rng) {
    const n = 5;
    let p = [rng.int(0, 4), rng.int(0, 4)];
    const pts = [p];
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    let last = null;
    for (let s = 0; s < 4; s++) {
      const opts = dirs.filter((d) => {
        if (last && d[0] === -last[0] && d[1] === -last[1]) return false;
        if (last && d[0] === last[0] && d[1] === last[1]) return false;
        const len = rng.int(1, 2);
        const q = [p[0] + d[0] * len, p[1] + d[1] * len];
        return q[0] >= 0 && q[0] < n && q[1] >= 0 && q[1] < n;
      });
      RM.need(opts.length > 0);
      const d = rng.pick(opts);
      let len = rng.int(1, 2);
      let q = [p[0] + d[0] * len, p[1] + d[1] * len];
      if (q[0] < 0 || q[0] >= n || q[1] < 0 || q[1] >= n) q = [p[0] + d[0], p[1] + d[1]];
      RM.need(q[0] >= 0 && q[0] < n && q[1] >= 0 && q[1] < n);
      RM.need(!pts.some((t) => t[0] === q[0] && t[1] === q[1]));
      pts.push(q);
      p = q;
      last = d;
    }
    return { kind: 'line', n, pts };
  }
  function tglyph(g, k) {
    if (g.kind === 'poly') return { kind: 'poly', n: g.n, c: tgrid(g.c, g.n, k) };
    return { kind: 'line', n: g.n, pts: g.pts.map(([x, y]) => D4[k].m(x, y, g.n)) };
  }
  function gkey(g) {
    return g.kind === 'poly' ? g.c.join('') : g.pts.map((p) => p.join(':')).join('|');
  }
  RM.register({
    id: 'dihedral',
    name: 'Mirror & turn',
    difficulty: 4,
    generate(rng, variant) {
      const kinds = [['poly', 'poly', 'poly'], ['line', 'line', 'line'], ['poly', 'poly', 'poly'], ['poly', 'line', 'poly']][variant % 4];
      const big = variant % 4 === 2;
      const glyphs = kinds.map((kd) => (kd === 'poly' ? polyomino(rng, big ? rng.int(6, 7) : 5) : lineGlyph(rng)));
      glyphs.forEach((g) => RM.need(new Set(D4K.map((k) => gkey(tglyph(g, k)))).size === 8));
      const nonId = D4K.filter((k) => k !== 'id');
      const T1 = rng.pick(nonId);
      const T2 = rng.pick(nonId.filter((k) => k !== T1 && compose(T1, k) !== 'id'));
      const rows = glyphs.map((g) => [g, tglyph(g, T1), tglyph(tglyph(g, T1), T2)]);
      const total = compose(T1, T2);
      const options = D4K.map((k) => ({
        spec: tglyph(glyphs[2], k),
        flaws: k === total ? [] : [`this is the first figure of row 3 ${D4[k].t}, but it must be ${D4[total].t}`],
      }));
      return {
        difficulty: big || kinds[1] !== kinds[0] ? 5 : 4,
        hint: 'compare each figure with its left neighbour: has it been turned or mirrored? The same two operations are used in every row.',
        panels: RM.flat(rows),
        answer: rows[2][2],
        options,
        key: gkey,
        render(g) {
          const pic = new RM.Pic();
          if (g.kind === 'poly') {
            const s = 17;
            const o = 50 - 2 * s;
            pic.add(`<rect x="${o}" y="${o}" width="${4 * s}" height="${4 * s}" fill="none" stroke="${RM.FAINT}" stroke-width="1"/>`);
            g.c.forEach((v, i) => {
              if (!v) return;
              pic.add(`<rect x="${o + (i % 4) * s}" y="${o + Math.floor(i / 4) * s}" width="${s}" height="${s}" fill="${v === 2 ? RM.INK : RM.GRAY}" stroke="#fff" stroke-width="1.2"/>`);
            });
          } else {
            const P = (p) => [18 + p[0] * 16, 18 + p[1] * 16];
            for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) RM.circle(pic, 18 + i * 16, 18 + j * 16, 1.3, { fill: 'light', sw: 0 });
            RM.polyline(pic, g.pts.map(P), { sw: 3.2 });
            const s = P(g.pts[0]);
            RM.circle(pic, s[0], s[1], 4.6, { fill: 'black', sw: 0 });
            const e = P(g.pts[g.pts.length - 1]);
            RM.circle(pic, e[0], e[1], 3.4, { fill: 'white', sw: 2 });
          }
          return pic.svg();
        },
        rules: [
          { k: 'Column 1 → 2', t: `the figure is <b>${D4[T1].t}</b>.` },
          { k: 'Column 2 → 3', t: `the figure is then <b>${D4[T2].t}</b>.` },
          { k: 'Answer', t: `overall, the 3rd panel is the 1st panel ${D4[total].t}. Each row uses a different figure but the same two transformations.` },
        ],
      };
    },
  });
})();
