/* Magic dominoes (grandmaster): every panel is one domino (two halves of 0–6 pips), laid horizontally or
 * vertically in a chessboard pattern. Variant 0: along each row the dominoes are chained end to end (the first
 * half of a domino repeats the second half of the previous one) and every row AND every column holds the same
 * number of pips. Variant 1: the chains run down the columns. Variant 2 (★8): no chain, but in each row the third
 * domino is the half-by-half sum of the first two modulo 7, and all rows hold the same number of pips. Variant 3:
 * no chain, but the first halves alone form a magic square, and so do the second halves. The generator checks a
 * large list of alternative readings (other chains, reversed reading of vertical dominoes, mod-7 sums, half magic
 * squares, diagonal sums, distinct pieces, classic Raven rules on halves and totals): every reading that fits the
 * visible panels must also accept the answer, and the intended rules must single it out among all 98 dominoes. */
(function () {
  'use strict';
  const RM = window.RM;
  const HOR = 0;
  const VER = 1;
  const HALF = 38;
  const PD = 10.8;
  const PR = 3.7;
  const LAYOUT = [
    [],
    [[0, 0]],
    [[-1, -1], [1, 1]],
    [[-1, -1], [0, 0], [1, 1]],
    [[-1, -1], [1, -1], [-1, 1], [1, 1]],
    [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]],
    [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]],
  ];

  function render(s) {
    const pic = new RM.Pic();
    const f = RM.fmt;
    const hor = s.o === HOR;
    const w = hor ? 2 * HALF : HALF;
    const h = hor ? HALF : 2 * HALF;
    const x0 = 50 - w / 2;
    const y0 = 50 - h / 2;
    pic.add(`<rect x="${f(x0 + 2.6)}" y="${f(y0 + 2.6)}" width="${w}" height="${h}" rx="6" fill="${RM.LIGHT}"/>`);
    pic.add(`<rect x="${f(x0)}" y="${f(y0)}" width="${w}" height="${h}" rx="6" fill="${RM.WHITE}" stroke="${RM.INK}" stroke-width="2.4"/>`);
    if (hor) RM.line(pic, 50, y0 + 4.5, 50, y0 + h - 4.5, { sw: 1.8 });
    else RM.line(pic, x0 + 4.5, 50, x0 + w - 4.5, 50, { sw: 1.8 });
    [s.a, s.b].forEach((n, k) => {
      const cx = hor ? 50 + (k ? 1 : -1) * (HALF / 2) : 50;
      const cy = hor ? 50 : 50 + (k ? 1 : -1) * (HALF / 2);
      LAYOUT[n].forEach(([dx, dy]) => {
        const px = hor ? -dy : dx;
        const py = hor ? dx : dy;
        pic.add(`<circle cx="${f(cx + px * PD)}" cy="${f(cy + py * PD)}" r="${PR}" fill="${RM.INK}"/>`);
      });
    });
    return pic.svg();
  }
  const keyOf = (s) => s.a + '' + s.b + s.o;
  const tot = (d) => d.a + d.b;
  const ukey = (d) => Math.min(d.a, d.b) + ',' + Math.max(d.a, d.b);
  const word = (o) => (o === HOR ? 'horizontal' : 'vertical');
  const dom = (d) => d.a + '|' + d.b;
  const pips = (n) => (n === 1 ? '1 pip' : n + ' pips');

  /* ---------------------------------------------------------------- hypotheses (atoms) */
  // readings: which half is "first"
  const READ = [
    (d) => [d.a, d.b],
    (d) => (d.o === VER ? [d.b, d.a] : [d.a, d.b]),
    (d) => (d.o === HOR ? [d.b, d.a] : [d.a, d.b]),
    (d) => [d.b, d.a],
  ];
  const ROWS = [[0, 1, 2], [3, 4, 5], [6, 7, 8]];
  const COLS = [[0, 3, 6], [1, 4, 7], [2, 5, 8]];
  const ATOMS = [];
  const BY = {};
  function atom(id, cons) {
    const a = { id, cons };
    ATOMS.push(a);
    BY[id] = a;
  }
  const pairsOf = (L) => L.flatMap((R) => [[R[0], R[1]], [R[1], R[2]]]);
  READ.forEach((rd, ri) => {
    const hv = (G, i, k) => rd(G[i])[k];
    atom('chainRow' + ri, pairsOf(ROWS).map(([i, j]) => ({ cells: [i, j], f: (G) => hv(G, i, 1) === hv(G, j, 0) })));
    atom('chainCol' + ri, pairsOf(COLS).map(([i, j]) => ({ cells: [i, j], f: (G) => hv(G, i, 1) === hv(G, j, 0) })));
    if (ri > 1) return;
    // the chain closes into a ring (last half of a line = first half of that line)
    atom('ringRow' + ri, ROWS.map((L) => ({ cells: [L[0], L[2]], f: (G) => hv(G, L[2], 1) === hv(G, L[0], 0) })));
    atom('ringCol' + ri, COLS.map((L) => ({ cells: [L[0], L[2]], f: (G) => hv(G, L[2], 1) === hv(G, L[0], 0) })));
    [0, 1].forEach((k) => {
      const hs = (G, L) => hv(G, L[0], k) + hv(G, L[1], k) + hv(G, L[2], k);
      const modc = (L) => ({ cells: L, f: (G) => (hv(G, L[0], k) + hv(G, L[1], k)) % 7 === hv(G, L[2], k) });
      atom(`modRow${ri}_${k}`, ROWS.map(modc));
      atom(`modCol${ri}_${k}`, COLS.map(modc));
      const eq = (L) => [[0, 1], [1, 2]].map(([x, y]) => ({ cells: L[x].concat(L[y]), f: (G) => hs(G, L[x]) === hs(G, L[y]) }));
      atom(`hmRow${ri}_${k}`, eq(ROWS));
      atom(`hmCol${ri}_${k}`, eq(COLS));
    });
  });
  const ts = (G, L) => tot(G[L[0]]) + tot(G[L[1]]) + tot(G[L[2]]);
  const teq = (L) => [[0, 1], [1, 2]].map(([x, y]) => ({ cells: L[x].concat(L[y]), f: (G) => ts(G, L[x]) === ts(G, L[y]) }));
  atom('magicRow', teq(ROWS));
  atom('magicCol', teq(COLS));
  atom('magicDiag', [
    { cells: [2, 4, 6, 0, 1, 2], f: (G) => ts(G, [2, 4, 6]) === ts(G, ROWS[0]) },
    { cells: [0, 4, 8, 0, 1, 2], f: (G) => ts(G, [0, 4, 8]) === ts(G, ROWS[0]) },
  ]);
  const dcons = [];
  for (let i = 0; i < 9; i++) for (let j = i + 1; j < 9; j++) dcons.push({ cells: [i, j], f: (G) => ukey(G[i]) !== ukey(G[j]) });
  atom('distinct', dcons);
  [0, 1].forEach((p) =>
    atom('orient' + p, RM.range(9).map((i) => ({ cells: [i], f: (G) => G[i].o === ((((i / 3) | 0) + (i % 3)) % 2 === 0 ? p : 1 - p) })))
  );
  const visOK = (at, G) => at.cons.every((c) => c.cells.indexOf(8) >= 0 || c.f(G));
  const fullOK = (at, G) => at.cons.every((c) => c.f(G));
  const INTENDED = [
    ['chainRow0', 'magicRow', 'magicCol'],
    ['chainCol0', 'magicRow', 'magicCol'],
    ['modRow0_0', 'modRow0_1', 'magicRow'],
    ['hmRow0_0', 'hmCol0_0', 'hmRow0_1', 'hmCol0_1'],
  ];

  /* ---------------------------------------------------------------- generators */
  let CH = null;
  function chainBuckets() {
    if (CH) return CH;
    CH = {};
    for (let v0 = 0; v0 < 7; v0++)
      for (let v1 = 0; v1 < 7; v1++)
        for (let v2 = 0; v2 < 7; v2++)
          for (let v3 = 0; v3 < 7; v3++) {
            const ds = [[v0, v1], [v1, v2], [v2, v3]].map(([a, b]) => ukey({ a, b }));
            if (new Set(ds).size < 3) continue;
            const S = v0 + 2 * v1 + 2 * v2 + v3;
            const b = (CH[S] = CH[S] || { all: [], by: {} });
            const t = [v0, v1, v2, v3];
            b.all.push(t);
            const k = v0 - v2 + ',' + (v1 - v3);
            (b.by[k] = b.by[k] || []).push(t);
          }
    return CH;
  }
  let MB = null;
  function modBuckets() {
    if (MB) return MB;
    MB = {};
    for (let a0 = 0; a0 < 7; a0++)
      for (let b0 = 0; b0 < 7; b0++)
        for (let a1 = 0; a1 < 7; a1++)
          for (let b1 = 0; b1 < 7; b1++) {
            const row = [{ a: a0, b: b0 }, { a: a1, b: b1 }, { a: (a0 + a1) % 7, b: (b0 + b1) % 7 }];
            if (new Set(row.map(ukey)).size < 3) continue;
            const S = row.reduce((s, d) => s + tot(d), 0);
            (MB[S] = MB[S] || []).push(row);
          }
    return MB;
  }
  const distinctAll = (rows) => new Set(rows.flat().map(ukey)).size === 9;

  function genChain(rng) {
    const B = chainBuckets();
    for (let t = 0; t < 60; t++) {
      const S = rng.int(11, 25);
      const bk = B[S];
      const r0 = rng.pick(bk.all);
      const r1 = rng.pick(bk.all);
      const list = bk.by[-(r0[0] - r0[2] + r1[0] - r1[2]) + ',' + -(r0[1] - r0[3] + r1[1] - r1[3])];
      if (!list) continue;
      const rows = [r0, r1, rng.pick(list)].map((v) => [0, 1, 2].map((c) => ({ a: v[c], b: v[c + 1] })));
      if (distinctAll(rows)) return rows;
    }
    RM.need(false);
  }
  function genMod(rng) {
    const B = modBuckets();
    for (let t = 0; t < 60; t++) {
      const S = rng.int(12, 26);
      const bk = B[S];
      if (!bk || bk.length < 3) continue;
      const rows = [rng.pick(bk), rng.pick(bk), rng.pick(bk)];
      if (!distinctAll(rows)) continue;
      // wrap-around must be visible in rows 1–2 (at least twice)
      let wraps = 0;
      for (let r = 0; r < 2; r++) {
        if (rows[r][0].a + rows[r][1].a > 6) wraps++;
        if (rows[r][0].b + rows[r][1].b > 6) wraps++;
      }
      if (wraps >= 2) return rows;
    }
    RM.need(false);
  }
  function magicGrid(rng, S) {
    for (let t = 0; t < 80; t++) {
      const m = [[rng.int(0, 6), rng.int(0, 6), 0], [rng.int(0, 6), rng.int(0, 6), 0], [0, 0, 0]];
      m[0][2] = S - m[0][0] - m[0][1];
      m[1][2] = S - m[1][0] - m[1][1];
      m[2][0] = S - m[0][0] - m[1][0];
      m[2][1] = S - m[0][1] - m[1][1];
      m[2][2] = S - m[2][0] - m[2][1];
      if (m.flat().every((x) => x >= 0 && x <= 6) && new Set(m.flat()).size >= 4) return m;
    }
    return null;
  }
  function genHalfMagic(rng) {
    for (let t = 0; t < 40; t++) {
      const A = magicGrid(rng, rng.int(6, 12));
      const B = magicGrid(rng, rng.int(6, 12));
      if (!A || !B) continue;
      const rows = [0, 1, 2].map((r) => [0, 1, 2].map((c) => ({ a: A[r][c], b: B[r][c] })));
      if (distinctAll(rows)) return rows;
    }
    RM.need(false);
  }

  /* ---------------------------------------------------------------- family */
  RM.register({
    id: 'domino-magic',
    name: 'Magic dominoes',
    difficulty: 7,
    generate(rng, variant) {
      const v = variant | 0;
      const phase = v === 0 ? HOR : rng.int(0, 1);
      const g3 = (fn) => RM.grid3((r, c) => fn(G[r * 3 + c]));
      let G = null;
      // cheap local retries: draw a grid, then reject it if any alternative reading gets in the way
      for (let t = 0; !G; t++) {
        RM.need(t < 400);
        let rows;
        if (v === 0) rows = genChain(rng);
        else if (v === 1) {
          const tt = genChain(rng);
          rows = [0, 1, 2].map((r) => [0, 1, 2].map((c) => tt[c][r]));
        } else if (v === 2) rows = genMod(rng);
        else rows = genHalfMagic(rng);
        const H = rows.flat().map((d, i) => ({ a: d.a, b: d.b, o: (((i / 3) | 0) + (i % 3)) % 2 === 0 ? phase : 1 - phase }));
        // 1. every hypothesis that fits the visible panels must accept the answer
        if (ATOMS.some((at) => visOK(at, H) && !fullOK(at, H))) continue;
        G = H;
        try {
          // 2. classic Raven rules on first halves, second halves and totals (two readings of vertical dominoes)
          for (let ri = 0; ri < 2; ri++)
            for (let k = 0; k < 2; k++) {
              const gr = g3((d) => READ[ri](d)[k]);
              const w = READ[ri](G[8])[k];
              RM.needNoConflict(gr, w, 'numeric');
              RM.needNoConflict(gr, w, 'numeric', 7);
            }
          RM.needNoConflict(g3(tot), tot(G[8]), 'numeric');
          if (v === 2) {
            RM.needUnique(g3((d) => d.a), G[8].a, 'numeric', 7);
            RM.needUnique(g3((d) => d.b), G[8].b, 'numeric', 7);
          }
        } catch (e) {
          if (e !== RM.RETRY) throw e;
          G = null;
        }
      }
      const ans = G[8];

      // 3. the intended rules single out the answer among all 98 dominoes
      const intended = INTENDED[v].map((id) => BY[id]).concat([BY['orient' + phase]]);
      const fits = (s) => {
        const H = G.slice();
        H[8] = s;
        return intended.every((at) => fullOK(at, H));
      };
      let count = 0;
      for (let a = 0; a < 7; a++) for (let b = 0; b < 7; b++) for (let o = 0; o < 2; o++) if (fits({ a, b, o })) count++;
      RM.need(count === 1 && fits(ans));

      // ---------------------------------------------------------------- texts
      const T = tot(ans);
      const rowT = ROWS.map((L) => ts(G, L));
      const colT = COLS.map((L) => ts(G, L));
      const S = rowT[0];
      const no = 1 - ans.o;
      const sumTxt = (L) => L.map((i) => tot(G[i])).join(' + ');
      const firstDef =
        'Each panel is one domino. Its <b>first half</b> is the left half of a horizontal domino or the top half of a vertical one; the other half is its <b>second half</b>. Count the pips of each half (a blank half counts 0).';
      const orientRule = {
        k: 'Chessboard orientation',
        t: `Horizontal and vertical dominoes alternate like the squares of a chessboard: the four corners and the centre are ${word(ans.o)}, the four edge panels ${word(no)}. The missing corner domino is therefore <b>${word(ans.o)}</b>.`,
      };
      const orientFlaw = (s) => `it is ${word(s.o)}, but in the chessboard pattern the bottom-right corner domino is ${word(ans.o)}`;
      const swapped = (s) => s.a === ans.b && s.b === ans.a && s.a !== s.b;
      let rules;
      let hint;
      let flawsOf;
      let mistakes = [];
      const o = ans.o;
      if (v <= 1) {
        const prev = v === 0 ? G[7] : G[5];
        const other = v === 0 ? G[5] : G[7];
        const lines = v === 0 ? ROWS : COLS;
        const lname = v === 0 ? 'row' : 'column';
        const prevName = v === 0 ? 'domino to its left' : 'domino above it';
        const chains = lines
          .map((L, r) => `${lname} ${r + 1}: ` + (r < 2 ? L.map((i) => dom(G[i])).join(' → ') : `${dom(G[L[0]])} → ${dom(G[L[1]])} → ${ans.a}|?`))
          .join('; ');
        rules = [
          { k: 'Reading a domino', t: firstDef },
          {
            k: v === 0 ? 'Domino chain along each row' : 'Domino chain down each column',
            t: `In every ${lname} the dominoes are laid end to end, as in a game of dominoes: the first half of each domino repeats the second half of the ${v === 0 ? 'previous domino in the row' : 'domino above it'}. ${chains}.`,
          },
          {
            k: `Magic total: ${S} pips`,
            t: `Every row and every column holds the same number of pips, ${S}. Row 1: ${sumTxt(ROWS[0])} = ${rowT[0]}; row 2: ${sumTxt(ROWS[1])} = ${rowT[1]}; column 1: ${sumTxt(COLS[0])} = ${colT[0]}; column 2: ${sumTxt(COLS[1])} = ${colT[1]}. Row 3 and column 3 must reach ${S} too.`,
          },
          orientRule,
          {
            k: 'Missing domino',
            t: `Its first half repeats the second half of the ${prevName} (${dom(prev)}): <b>${ans.a}</b>. Its pips: bottom row ${S} − (${tot(G[6])} + ${tot(G[7])}) = ${T}, and the right column agrees: ${S} − (${tot(G[2])} + ${tot(G[5])}) = ${T}. Second half: ${T} − ${ans.a} = <b>${ans.b}</b>. Answer: <b>${word(ans.o)} domino ${dom(ans)}</b>.`,
          },
        ];
        hint =
          v === 0
            ? 'Look closely at where neighbouring dominoes of a row meet — and count the pips of whole rows and whole columns.'
            : 'Look closely at where neighbouring dominoes of a column meet — and count the pips of whole rows and whole columns.';
        flawsOf = (s) => {
          const out = [];
          if (swapped(s)) out.push(`it is the right domino turned the wrong way round: its first half must be ${ans.a}, repeating the second half of the ${prevName} (${dom(prev)})`);
          else if (s.a !== ans.a) out.push(`its first half shows ${pips(s.a)}, but it must repeat the second half of the ${prevName} (${dom(prev)}), i.e. ${ans.a}`);
          if (tot(s) !== T) out.push(`it holds ${pips(tot(s))} in all, but the bottom row and the right column each need ${T} to reach ${S}`);
          if (s.o !== ans.o) out.push(orientFlaw(s));
          return out;
        };
        mistakes = [
          [prev.a, T - prev.a, o],
          [other.b, T - other.b, o],
          [prev.b, prev.a, o],
        ];
      } else if (v === 2) {
        const A = [G[6].a, G[7].a];
        const B = [G[6].b, G[7].b];
        const mod = (x, y) => `${x} + ${y} = ${x + y}${x + y > 6 ? ` − 7 = ${(x + y) % 7}` : ''}`;
        const rowTxt = (r) => {
          const [d0, d1, d2] = ROWS[r].map((i) => G[i]);
          return `row ${r + 1}: first halves ${mod(d0.a, d1.a)}, second halves ${mod(d0.b, d1.b)} → ${dom(d2)}`;
        };
        rules = [
          { k: 'Reading a domino', t: firstDef },
          {
            k: 'Third domino = sum of the first two, modulo 7',
            t: `In each row, the first half of the 3rd domino is the sum of the first halves of the 1st and 2nd dominoes, and the same for the second halves — but a half can show at most 6 pips, so whenever the sum is 7 or more, 7 is taken off (counting wraps round 6 → 0). ${rowTxt(0)}; ${rowTxt(1)}.`,
          },
          {
            k: `Equal rows: ${S} pips`,
            t: `Each row holds the same number of pips: row 1: ${sumTxt(ROWS[0])} = ${rowT[0]}; row 2: ${sumTxt(ROWS[1])} = ${rowT[1]}. The bottom row must also hold ${S}.`,
          },
          orientRule,
          {
            k: 'Missing domino',
            t: `First half: ${mod(A[0], A[1]).replace(/\d+$/, '<b>$&</b>')}. Second half: ${mod(B[0], B[1]).replace(/\d+$/, '<b>$&</b>')}. Check: ${tot(G[6])} + ${tot(G[7])} + ${T} = ${S}. Answer: <b>${word(ans.o)} domino ${dom(ans)}</b>.`,
          },
        ];
        hint = 'Treat first halves and second halves separately — and remember a domino half never shows more than 6.';
        flawsOf = (s) => {
          const out = [];
          if (swapped(s)) out.push(`its two halves are exchanged: the first half must be ${mod(A[0], A[1])}`);
          else {
            if (s.a !== ans.a) out.push(`its first half should be ${mod(A[0], A[1])}, not ${s.a}`);
            if (s.b !== ans.b) out.push(`its second half should be ${mod(B[0], B[1])}, not ${s.b}`);
          }
          if (tot(s) !== T) out.push(`it holds ${pips(tot(s))}, so the bottom row would not total ${S}`);
          if (s.o !== ans.o) out.push(orientFlaw(s));
          return out;
        };
        const raw = (x, y) => (x + y > 6 ? x + y - 6 : x + y);
        mistakes = [
          [(A[0] + B[1]) % 7, (B[0] + A[1]) % 7, o],
          [raw(A[0], A[1]), raw(B[0], B[1]), o],
          [Math.abs(A[0] - A[1]), Math.abs(B[0] - B[1]), o],
          [(G[2].a + G[5].a) % 7, (G[2].b + G[5].b) % 7, o],
        ];
      } else {
        const SA = G[0].a + G[1].a + G[2].a;
        const SB = G[0].b + G[1].b + G[2].b;
        const hsum = (L, k) => L.map((i) => G[i][k]).join(' + ') + ' = ' + L.reduce((s, i) => s + G[i][k], 0);
        rules = [
          { k: 'Reading a domino', t: firstDef },
          {
            k: 'Two magic squares in one',
            t: `Take the first halves alone: every row and every column of first halves adds up to ${SA} (row 1: ${hsum(ROWS[0], 'a')}; row 2: ${hsum(ROWS[1], 'a')}; column 1: ${hsum(COLS[0], 'a')}; column 2: ${hsum(COLS[1], 'a')}). The second halves alone add up to ${SB} in every row and column (row 1: ${hsum(ROWS[0], 'b')}; row 2: ${hsum(ROWS[1], 'b')}; column 1: ${hsum(COLS[0], 'b')}; column 2: ${hsum(COLS[1], 'b')}).`,
          },
          {
            k: `Whole dominoes: ${S} pips`,
            t: `Consequently every row and column of whole dominoes holds ${SA} + ${SB} = ${S} pips — but this alone fixes only the total of the missing domino (${T}), not how the pips are split between its halves.`,
          },
          orientRule,
          {
            k: 'Missing domino',
            t: `First half: ${SA} − ${G[6].a} − ${G[7].a} = <b>${ans.a}</b> (column check: ${SA} − ${G[2].a} − ${G[5].a} = ${ans.a}). Second half: ${SB} − ${G[6].b} − ${G[7].b} = <b>${ans.b}</b> (column check: ${SB} − ${G[2].b} − ${G[5].b} = ${ans.b}). Answer: <b>${word(ans.o)} domino ${dom(ans)}</b>.`,
          },
        ];
        hint = 'Every line of whole dominoes balances — but so does something smaller.';
        flawsOf = (s) => {
          const out = [];
          if (swapped(s)) out.push(`its halves are exchanged: the first halves of the bottom row must add up to ${SA}, so its first half is ${ans.a}`);
          else {
            if (s.a !== ans.a) out.push(`the first halves of the bottom row must add up to ${SA}: its first half should be ${SA} − ${G[6].a} − ${G[7].a} = ${ans.a}, not ${s.a}`);
            if (s.b !== ans.b) out.push(`the second halves of the bottom row must add up to ${SB}: its second half should be ${SB} − ${G[6].b} − ${G[7].b} = ${ans.b}, not ${s.b}`);
          }
          if (s.o !== ans.o) out.push(orientFlaw(s));
          return out;
        };
        mistakes = [
          [ans.a + 1, ans.b - 1, o],
          [ans.a - 1, ans.b + 1, o],
        ];
      }

      // ---------------------------------------------------------------- distractors
      // two clusters: near-misses of the answer and near-misses of a tempting wrong domino (decoy), so that the
      // answer is not simply the "average" of the options
      const a = ans.a;
      const b = ans.b;
      const seen0 = keyOf(ans);
      const ok = (x, y) => x >= 0 && x <= 6 && y >= 0 && y <= 6;
      const pert = (x, y, z) => [[y, x, z], [x, y, 1 - z], [x, y + 1, z], [x, y - 1, z], [x + 1, y, z], [x - 1, y, z], [x + 1, y - 1, z], [x - 1, y + 1, z]];
      const valid = (arr) => {
        const out = [];
        const ks = new Set([seen0]);
        arr.forEach(([x, y, z]) => {
          if (!ok(x, y)) return;
          const sp = { a: x, b: y, o: z };
          const k = keyOf(sp);
          if (ks.has(k) || fits(sp)) return;
          ks.add(k);
          out.push(sp);
        });
        return out;
      };
      const decoys = rng.shuffle(valid(mistakes.concat([[a + 1, b - 1, o], [a - 1, b + 1, o]])));
      const score = (x, L) => L.reduce((n, y) => n + (y === x ? 0 : (x.a === y.a) + (x.b === y.b) + (tot(x) === tot(y)) + (x.o === y.o)), 0);
      let pick = null;
      for (let di = 0; di < decoys.length * 4 && !pick; di++) {
        const D = decoys[di % decoys.length];
        const sel = [D];
        const ks = new Set([seen0, keyOf(D)]);
        const add = (sp) => {
          const k = keyOf(sp);
          if (ks.has(k) || sel.length >= 7) return;
          if (sp.o !== o && sel.filter((d) => d.o !== o).length >= 2) return;
          ks.add(k);
          sel.push(sp);
        };
        valid([[b, a, o]]).forEach(add);
        const PA = rng.shuffle(valid(pert(a, b, o)));
        const PD = rng.shuffle(valid(pert(D.a, D.b, D.o)));
        for (let i = 0; i < 8; i++) {
          if (PD[i]) add(PD[i]);
          if (PA[i]) add(PA[i]);
        }
        if (sel.length < 7) continue;
        const cnt = (f) => sel.filter(f).length;
        if (cnt((d) => d.a === a) < 2 || cnt((d) => d.b === b) < 1 || cnt((d) => tot(d) === T) < 2) continue;
        const all = sel.concat([ans]);
        const sa = score(ans, all);
        if (sel.every((d) => score(d, all) < sa)) continue;
        pick = sel;
      }
      RM.need(!!pick);
      const options = [{ spec: ans, flaws: [] }].concat(pick.map((s) => ({ spec: s, flaws: flawsOf(s) })));
      RM.need(options.every((op, i) => i === 0 || op.flaws.length > 0));

      return {
        panels: G.slice(0, 8),
        answer: ans,
        options,
        render,
        key: keyOf,
        rules,
        hint,
        difficulty: [7, 7, 8, 7][v],
      };
    },
  });
})();
