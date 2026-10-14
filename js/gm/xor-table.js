/* Star map (grandmaster): every panel shows the same constellation of places; each place holds a star or a small dot
 * and (in the two-layer variants) is black or white. Hidden row sets A_r and column sets B_c combine by XOR, layer by
 * layer: panel(r, c) = A_r XOR B_c. Consequently, inside every row exactly the same places switch star<->dot and
 * black<->white from one column to another. Missing panel = panel(3,1) with the column 1 -> 3 changes applied. */
(function () {
  'use strict';
  const RM = window.RM;

  const CELL9 = ['top-left', 'top-centre', 'top-right', 'middle-left', 'centre', 'middle-right', 'bottom-left', 'bottom-centre', 'bottom-right'];
  const ROWN = ['top', 'middle', 'bottom'];
  const ORD = ['1st', '2nd', '3rd', '4th'];
  const VARIANTS = [
    { n: 8, two: true, d: 8 },
    { n: 10, two: false, d: 7 },
    { n: 9, two: true, d: 8 },
    { n: 7, two: true, d: 8 },
  ];

  const bit = (m, p) => (m >> p) & 1;
  function pc(m) {
    let c = 0;
    while (m) {
      c += m & 1;
      m >>= 1;
    }
    return c;
  }
  function list(a) {
    if (!a.length) return 'nowhere';
    return a.length === 1 ? a[0] : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  }

  function layout(rng, n) {
    if (n <= 9) {
      const cells = rng.sample(RM.range(9), n).sort((a, b) => a - b);
      return cells.map((ci) => {
        const r = Math.floor(ci / 3);
        const c = ci % 3;
        return { x: 20 + 30 * c + rng.int(-5, 5), y: 20 + 30 * r + rng.int(-5, 5), name: CELL9[ci] };
      });
    }
    const cells = rng.sample(RM.range(12), n).sort((a, b) => a - b);
    return cells.map((ci) => {
      const r = Math.floor(ci / 4);
      const c = ci % 4;
      return { x: 15.5 + 23 * c + rng.int(-2, 2), y: 20 + 30 * r + rng.int(-5, 5), name: ROWN[r] + ' row, ' + ORD[c] + ' from the left' };
    });
  }

  /* No relation out = f(in1, in2) (any of the 16 boolean functions, applied place by place) fits the visible data:
   * between columns (rows 1-2) and between rows (columns 1-2). Returns true if all six families are refuted. */
  function conflict(get, n, i, j, k) {
    const seen = {};
    for (let a = 0; a < 2; a++)
      for (let p = 0; p < n; p++) {
        const kk = bit(get(a, i), p) * 2 + bit(get(a, j), p);
        const v = bit(get(a, k), p);
        if (seen[kk] === undefined) seen[kk] = [v, a, p];
        else if (seen[kk][0] !== v) return [seen[kk][1], seen[kk][2], a, p];
      }
    return null;
  }
  const TRIPLES = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 2, 0],
  ];
  function allRefuted(G, n) {
    const byRow = (a, c) => G[a][c];
    const byCol = (a, r) => G[r][a];
    return TRIPLES.every((t) => conflict(byRow, n, t[0], t[1], t[2]) && conflict(byCol, n, t[0], t[1], t[2]));
  }

  function genLayer(rng, n, o) {
    const full = (1 << n) - 1;
    for (let t = 0; t < 300; t++) {
      const A = [0, rng.int(1, full), rng.int(1, full)];
      const B = [rng.int(0, full), rng.int(0, full), rng.int(0, full)];
      const D = [B[0] ^ B[1], B[0] ^ B[2], B[1] ^ B[2]];
      if (!D.every((d) => pc(d) >= o.dMin && pc(d) <= o.dMax)) continue;
      const E = [A[1], A[2], A[1] ^ A[2]];
      if (!E.every((e) => pc(e) >= o.eMin && pc(e) <= n - 1)) continue;
      const G = RM.grid3((r, c) => A[r] ^ B[c]);
      if (!G.every((row) => row.every((m) => pc(m) >= o.cMin && pc(m) <= o.cMax))) continue;
      const vary = A[1] | A[2] | D[0] | D[1];
      if (pc(full & ~vary) > o.fixedMax) continue;
      if (!allRefuted(G, n)) continue;
      return { A, B, D, G };
    }
    return null;
  }

  /* Global count readings: "every place is lit equally often in each row" (or column). If such a reading fits the
   * visible panels, it must predict the answer. */
  function countsOK(G, n, ans) {
    const rowsK = (r, p) => bit(G[r][0], p) + bit(G[r][1], p) + bit(G[r][2], p);
    const colsK = (c, p) => bit(G[0][c], p) + bit(G[1][c], p) + bit(G[2][c], p);
    for (const dir of [0, 1]) {
      let ok = true;
      let pred = 0;
      for (let p = 0; p < n && ok; p++) {
        const k0 = dir ? colsK(0, p) : rowsK(0, p);
        const k1 = dir ? colsK(1, p) : rowsK(1, p);
        const x = dir ? k0 - bit(G[0][2], p) - bit(G[1][2], p) : k0 - bit(G[2][0], p) - bit(G[2][1], p);
        if (k0 !== k1 || x < 0 || x > 1) ok = false;
        else pred |= x << p;
      }
      if (ok && pred !== ans) return false;
    }
    return true;
  }

  /* Each place read on its own (constant, copy, diagonal, Latin... patterns): no such reading may contradict. */
  function perPlaceOK(val, n, ans) {
    for (let p = 0; p < n; p++) {
      const g = RM.grid3((r, c) => (r === 2 && c === 2 ? undefined : val(r, c, p)));
      if (!RM.unique(g, ans(p), 'categorical', 0, true)) return false;
    }
    return true;
  }

  RM.register({
    id: 'xor-table',
    name: 'Star map',
    difficulty: 8,
    generate(rng, variant) {
      const V = VARIANTS[variant || 0];
      const n = V.n;
      const two = V.two;
      const full = (1 << n) - 1;
      const pos = layout(rng, n);
      const vis3 = (G, f) => RM.grid3((r, c) => (r === 2 && c === 2 ? undefined : f(G[r][c])));
      const numOK = (G, f) => RM.unique(vis3(G, f), f(G[2][2]), 'numeric', 0, true);
      // presence layer: rows/columns refuted for every boolean combination, no count / per-place reading may conflict
      let PL = null;
      for (let t = 0; t < 30 && !PL; t++) {
        const L = genLayer(rng, n, { dMin: 2, dMax: n <= 8 ? 4 : 5, eMin: 2, cMin: 2, cMax: n - 2, fixedMax: 0 });
        if (!L) continue;
        const a = L.G[2][2];
        if (!numOK(L.G, pc) || !countsOK(L.G, n, a) || !perPlaceOK((r, c, p) => bit(L.G[r][c], p), n, (p) => bit(a, p))) continue;
        PL = L;
      }
      RM.need(PL);
      let CL = { A: [0, 0, 0], B: [0, 0, 0], D: [0, 0, 0], G: RM.grid3(() => 0) };
      if (two) {
        CL = null;
        const counts = [(s) => pc(s.k), (s) => pc(s.p & ~s.k), (s) => pc(s.p & s.k), (s) => pc(~s.p & full & ~s.k)];
        for (let t = 0; t < 40 && !CL; t++) {
          const L = genLayer(rng, n, { dMin: 1, dMax: 3, eMin: 1, cMin: 1, cMax: n - 1, fixedMax: 3 });
          if (!L) continue;
          const a = L.G[2][2];
          const ap = PL.G[2][2];
          const GG = RM.grid3((r, c) => ({ p: PL.G[r][c], k: L.G[r][c] }));
          if (!counts.every((f) => numOK(GG, f)) || !countsOK(L.G, n, a)) continue;
          if (!perPlaceOK((r, c, p) => bit(L.G[r][c], p), n, (p) => bit(a, p))) continue;
          if (!perPlaceOK((r, c, p) => bit(PL.G[r][c], p) + 2 * bit(L.G[r][c], p), n, (p) => bit(ap, p) + 2 * bit(a, p))) continue;
          CL = L;
        }
        RM.need(CL);
      }

      const grid = RM.grid3((r, c) => ({ p: PL.G[r][c], k: CL.G[r][c] }));
      const answer = grid[2][2];
      const key = (s) => s.p + '-' + s.k;
      const cells = RM.flat(grid);
      RM.need(new Set(cells.concat([answer]).map(key)).size === 9);
      // whole-panel reading (copies, diagonals, Latin squares of whole panels)
      RM.needNoConflict(vis3(grid, key), key(answer), 'categorical');

      /* ---------- words */
      const names = pos.map((q) => q.name);
      const at = (m) => list(RM.range(n).filter((p) => bit(m, p)).map((p) => names[p]));
      const stateName = (s, p) => (two ? (bit(s.k, p) ? 'white ' : 'black ') + (bit(s.p, p) ? 'star' : 'dot') : bit(s.p, p) ? 'star' : 'grey dot (no star)');
      function describe(s) {
        if (!two) return 'stars at ' + at(s.p) + '; grey dots at ' + at(full & ~s.p);
        const parts = [];
        const grp = [
          ['black stars', s.p & ~s.k],
          ['white stars', s.p & s.k],
          ['black dots', ~s.p & ~s.k & full],
          ['white dots', ~s.p & s.k & full],
        ];
        for (const [nm, m] of grp) if (m & full) parts.push(nm + ' at ' + at(m));
        return parts.join('; ');
      }
      const change = (dp, dk) => (two ? 'star⇄dot at ' + at(dp) + '; black⇄white at ' + at(dk) : 'a star appears or disappears at ' + at(dp));
      function diff(s) {
        const d = RM.range(n).filter((p) => bit(s.p ^ answer.p, p) || bit(s.k ^ answer.k, p));
        const txt = d.slice(0, 3).map((p) => names[p] + ' (' + stateName(s, p) + ' instead of ' + stateName(answer, p) + ')');
        return 'Wrong place' + (d.length > 1 ? 's' : '') + ': ' + txt.join(', ') + (d.length > 3 ? ', …' : '') + '.';
      }

      /* ---------- distractors */
      const P31 = grid[2][0];
      const P32 = grid[2][1];
      const xr = (s, t) => ({ p: s.p ^ t.p, k: s.k ^ t.k });
      const D12 = { p: PL.D[0], k: CL.D[0] };
      const D13 = { p: PL.D[1], k: CL.D[1] };
      const E13 = { p: PL.A[2], k: CL.A[2] };
      const E12 = { p: PL.A[1], k: CL.A[1] };
      // atomic changes (one place, one layer) of a change set
      const atoms = (d) => {
        const r = [];
        for (let p = 0; p < n; p++) {
          if (bit(d.p, p)) r.push({ p: 1 << p, k: 0 });
          if (bit(d.k, p)) r.push({ p: 0, k: 1 << p });
        }
        return r;
      };
      const subsetXor = (at, mask) => at.reduce((t, x, i) => ((mask >> i) & 1 ? xr(t, x) : t), { p: 0, k: 0 });
      const groups = {
        struct: [
          [xr(P31, P32), (two ? 'Built from row 3’s first two panels place by place (a star where exactly one of them has a star, white where exactly one is white)' : 'Built as row 3, column 1 XOR column 2 (a star where exactly one of them has a star)') + ' — column 3 is never made that way in rows 1–2.'],
          [P31, 'This is row 3, column 1 unchanged: the column 1 → 3 changes were not applied.'],
          [P32, 'This is row 3, column 2 copied: the column 1 → 2 changes were applied instead of the column 1 → 3 changes.'],
          [xr(P32, D13), 'The column 1 → 3 changes were applied to row 3, column 2 instead of row 3, column 1.'],
          [xr(answer, E12), 'The row 1 → row 3 changes were applied to row 2, column 3 instead of row 1, column 3.'],
          [grid[0][2], 'This is row 1, column 3 copied: the row 1 → row 3 changes were not applied.'],
          [{ p: P31.p | answer.p, k: answer.k }, 'Only the changes that add stars were applied: stars that must turn into dots were kept.'],
          [{ p: P31.p & answer.p, k: answer.k }, 'Only the changes that remove stars were applied: the new stars are missing.'],
          [{ p: P31.p | P32.p, k: P31.k | P32.k }, 'Superposition of row 3’s first two panels — column 3 is not obtained that way in rows 1–2.'],
        ],
        partial: [],
        extra: [],
        near: [],
      };
      if (two) {
        groups.struct.push(
          [{ p: answer.p, k: P31.k }, 'Star⇄dot changes applied, but the black⇄white changes were forgotten.'],
          [{ p: P31.p, k: answer.k }, 'Black⇄white changes applied, but the star⇄dot changes were forgotten.'],
          [{ p: answer.p, k: P31.k ^ P32.k }, 'Colours computed as column 1 XOR column 2 — not how colours change in rows 1–2.']
        );
      }
      const a13 = atoms(D13);
      for (const m of rng.shuffle(RM.range((1 << a13.length) - 2).map((i) => i + 1)).slice(0, 14))
        groups.partial.push([xr(P31, subsetXor(a13, m)), 'Only part of the column 1 → 3 changes was applied to row 3, column 1.']);
      const a12 = atoms(D12);
      for (const m of rng.shuffle(RM.range((1 << a12.length) - 1).map((i) => i + 1)).slice(0, 6))
        groups.extra.push([xr(answer, subsetXor(a12, m)), 'Column 1 → 2 changes were applied on top of the column 1 → 3 changes.']);
      const still = atoms({ p: full & ~D13.p, k: two ? full & ~D13.k : 0 });
      for (const x of rng.sample(still, Math.min(4, still.length)))
        groups.near.push([xr(answer, x), 'A place that never changes from column 1 to column 3 was changed.']);
      for (const x of rng.sample(atoms(E13), Math.min(3, atoms(E13).length)))
        groups.near.push([xr(grid[0][2], x), 'Only part of the row 1 → row 3 changes was applied to row 1, column 3.']);

      const ak = key(answer);
      const seen = new Set([ak]);
      const G2 = {};
      for (const g of Object.keys(groups)) {
        G2[g] = [];
        for (const [s, why] of groups[g]) {
          if (seen.has(key(s))) continue;
          seen.add(key(s));
          G2[g].push({ spec: s, flaws: [why + ' ' + diff(s)] });
        }
      }
      const dist = (a, b) => pc(a.p ^ b.p) + pc(a.k ^ b.k);
      function fair(opts) {
        // majority vote place by place must not rebuild the answer
        const maj = { p: 0, k: 0 };
        let tie = false;
        for (let p = 0; p < n; p++)
          for (const L of two ? ['p', 'k'] : ['p']) {
            const ones = opts.filter((o) => bit(o.spec[L], p)).length;
            if (ones * 2 === opts.length) tie = true;
            else if (ones * 2 > opts.length) maj[L] |= 1 << p;
          }
        if (!tie && key(maj) === ak) return false;
        // no state of a place may appear only in the answer
        const st = (o, p) => bit(o.spec.p, p) + 2 * bit(o.spec.k, p);
        for (let p = 0; p < n; p++) if (!opts.slice(1).some((o) => st(o, p) === st(opts[0], p))) return false;
        // the answer must not be the unique centre / hub of the options
        const W = [0, 6, 3, 1];
        const hub = (o) => opts.reduce((t, q) => t + (q === o ? 0 : W[dist(o.spec, q.spec)] || 0), 0);
        const sum = (o) => opts.reduce((t, q) => t + dist(o.spec, q.spec), 0);
        const d = opts.slice(1);
        return d.some((o) => hub(o) >= hub(opts[0])) && d.some((o) => sum(o) <= sum(opts[0]));
      }
      let options = null;
      const quota = { struct: [2, 4], partial: [2, 4], extra: [0, 2], near: [0, 2] };
      for (let t = 0; t < 80 && !options; t++) {
        let pick = [];
        for (const g of Object.keys(quota)) pick = pick.concat(rng.shuffle(G2[g]).slice(0, rng.int(quota[g][0], quota[g][1])));
        pick = rng.shuffle(pick).slice(0, 7);
        if (pick.length < 7) continue;
        const opts = [{ spec: answer, flaws: [] }].concat(pick);
        if (fair(opts)) options = opts;
      }
      RM.need(options);

      /* ---------- correction */
      const ex = conflict((a, c) => PL.G[a][c], n, 0, 1, 2);
      const pres = (m, p) => (bit(m, p) ? 'star' : 'dot');
      const rules = [
        {
          k: 'The map',
          t: two
            ? `Every panel shows the same ${n} places. Each place holds a <b>star</b> or a small <b>dot</b>, and each star or dot is <b>black</b> or <b>white</b> (hollow).`
            : `Every panel shows the same ${n} places. Each place holds a black <b>star</b> or just a small grey dot.`,
        },
        {
          k: 'Same change in every row',
          t:
            'Inside each row, compare the panels with each other: the changes from one column to another are <b>identical in all three rows</b>. ' +
            `Column 1 → column 2: ${change(PL.D[0], CL.D[0])}. Column 1 → column 3: ${change(PL.D[1], CL.D[1])}. ` +
            '(Equivalently, every column changes the same way from row to row.)',
        },
        {
          k: 'Not a combination of columns 1 and 2',
          t:
            'Column 3 is not built from columns 1 and 2 place by place (no XOR, OR, AND…): ' +
            (ex[0] === ex[2] ? `in row ${ex[0] + 1} the ${names[ex[1]]} and ${names[ex[3]]} places both read` : `in row ${ex[0] + 1} the ${names[ex[1]]} place and in row ${ex[2] + 1} the ${names[ex[3]]} place both read`) +
            ` “${pres(PL.G[ex[0]][0], ex[1])}, ${pres(PL.G[ex[0]][1], ex[1])}” in columns 1–2, ` +
            `yet column 3 shows a ${pres(PL.G[ex[0]][2], ex[1])} in the first case and a ${pres(PL.G[ex[2]][2], ex[3])} in the second.`,
        },
        {
          k: 'Missing panel',
          t:
            `Start from row 3, column 1 and apply the column 1 → 3 changes (${change(PL.D[1], CL.D[1])}). ` +
            `Result: <b>${describe(answer)}</b>. Check: row 3, column 2 with the column 2 → 3 changes (${change(PL.D[2], CL.D[2])}) gives the same panel.`,
        },
      ];

      return {
        panels: cells,
        answer,
        options,
        difficulty: V.d,
        key,
        render(s) {
          const pic = new RM.Pic();
          for (let i = 0; i < n; i++) {
            const q = pos[i];
            const lit = bit(s.p, i);
            const wh = bit(s.k, i);
            if (two) {
              if (lit) RM.shape(pic, 'star5', q.x, q.y, 8.5, { fill: wh ? 'white' : 'black', sw: 1.8 });
              else RM.circle(pic, q.x, q.y, 4, { fill: wh ? 'white' : 'black', sw: 1.6 });
            } else if (lit) RM.shape(pic, 'star5', q.x, q.y, 8.5, { fill: 'black', sw: 1.5 });
            else RM.circle(pic, q.x, q.y, 3, { fill: 'gray', stroke: RM.GRAY, sw: 1 });
          }
          return pic.svg();
        },
        rules,
        hint: 'Compare the panels inside each row with each other: what changes from one column to the next is the same in every row.',
      };
    },
  });
})();
