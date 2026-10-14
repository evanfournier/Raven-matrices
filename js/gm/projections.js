/* Row & column counts (grandmaster): discrete tomography. Every panel is a board of sockets holding black discs.
 * The 3rd board of each matrix row is the ONLY board whose board rows contain as many discs as those of the 1st
 * board and whose board columns contain as many discs as those of the 2nd board (variant 1: rows from the 2nd board,
 * columns from the 1st; variant 2: 6 × 6 boards; variant 3: the 1st board's row counts are read bottom to top).
 * Each 3rd board is drawn among the boards that are uniquely determined by their row and column counts (no 2 × 2
 * "switching" rectangle, Ryser), so the counts force a single pattern. */
(function () {
  'use strict';
  const RM = window.RM;

  /* ------------------------------------------------------------ boards (arrays of 0/1 rows) */
  const sum = (a) => a.reduce((s, v) => s + v, 0);
  const rowsOf = (M) => M.map(sum);
  const colsOf = (M) => M[0].map((_, j) => M.reduce((s, r) => s + r[j], 0));
  const keyM = (M) => M.map((r) => r.join('')).join('/');
  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const ham = (A, B) => {
    let d = 0;
    A.forEach((r, i) => r.forEach((v, j) => (d += v !== B[i][j] ? 1 : 0)));
    return d;
  };
  const copy = (M) => M.map((r) => r.slice());
  const TR = (M) => M[0].map((_, j) => M.map((r) => r[j]));
  const TF = {
    id: copy,
    fh: (M) => M.map((r) => r.slice().reverse()),
    fv: (M) => M.slice().reverse().map((r) => r.slice()),
    tr: TR,
    r180: (M) => M.slice().reverse().map((r) => r.slice().reverse()),
    r90: (M) => M[0].map((_, j) => M.map((r) => r[j]).reverse()),
    r270: (M) => M[0].map((_, j) => M.map((r) => r[M.length - 1 - j])),
    at: (M) => TR(M).reverse().map((r) => r.reverse()),
  };
  const pushRow = (r, left) => {
    const k = sum(r);
    return r.map((_, j) => (left ? (j < k ? 1 : 0) : j >= r.length - k ? 1 : 0));
  };
  const GRAV = {
    left: (M) => M.map((r) => pushRow(r, true)),
    right: (M) => M.map((r) => pushRow(r, false)),
    up: (M) => TR(TR(M).map((r) => pushRow(r, true))),
    down: (M) => TR(TR(M).map((r) => pushRow(r, false))),
  };
  /* Ryser: a board is the only one with its row and column counts iff it has no 2 × 2 "switching" rectangle
   * (1 0 / 0 1 or 0 1 / 1 0), i.e. iff its rows are nested. */
  function uniquelyDetermined(M) {
    const n = M.length;
    for (let a = 0; a < n; a++)
      for (let b = a + 1; b < n; b++) {
        let ab = false;
        let ba = false;
        for (let j = 0; j < M[0].length; j++) {
          if (M[a][j] && !M[b][j]) ab = true;
          if (M[b][j] && !M[a][j]) ba = true;
        }
        if (ab && ba) return false;
      }
    return true;
  }
  /* Gale–Ryser construction: some board with row counts R and column counts C, or null if none exists. */
  function construct(R, C, rng) {
    const n = R.length;
    const m = C.length;
    if (sum(R) !== sum(C) || R.some((v) => v < 0 || v > m) || C.some((v) => v < 0 || v > n)) return null;
    const rem = C.slice();
    const M = R.map(() => Array(m).fill(0));
    const order = rng.shuffle(RM.range(n)).sort((a, b) => R[b] - R[a]);
    for (const i of order) {
      const cols = rng.shuffle(RM.range(m)).sort((a, b) => rem[b] - rem[a]);
      for (let t = 0; t < R[i]; t++) {
        if (rem[cols[t]] <= 0) return null;
        M[i][cols[t]] = 1;
        rem[cols[t]]--;
      }
    }
    return rem.every((v) => v === 0) ? M : null;
  }
  const withRows = (rng, R, m) =>
    R.map((k) => {
      const row = Array(m).fill(0);
      rng.sample(RM.range(m), k).forEach((j) => (row[j] = 1));
      return row;
    });
  const withCols = (rng, C, n) => TR(withRows(rng, C, n));

  /* The 3rd board: rows nested along a random column priority, i.e. uniquely determined by its counts. */
  function makeX(rng, n) {
    const [lo, hi] = n === 5 ? [9, 16] : [13, 23];
    for (let t = 0; t < 80; t++) {
      const pri = rng.shuffle(RM.range(n));
      const r = RM.range(n).map(() => rng.int(1, n - 1));
      if (rng.chance(0.3)) r[rng.int(0, n - 1)] = 0;
      if (rng.chance(0.3)) r[rng.int(0, n - 1)] = n;
      const X = r.map((k) => {
        const row = Array(n).fill(0);
        for (let j = 0; j < k; j++) row[pri[j]] = 1;
        return row;
      });
      const c = colsOf(X);
      const T = sum(r);
      if (T < lo || T > hi) continue;
      if (new Set(r).size < 3 || new Set(c).size < 3) continue;
      if (Object.keys(GRAV).some((g) => keyM(GRAV[g](X)) === keyM(X))) continue;
      if (keyM(TR(X)) === keyM(X)) continue;
      return X;
    }
    throw RM.RETRY;
  }

  /* ------------------------------------------------------------ hypotheses a solver may hold */
  /* count profiles a 3rd board could copy: rows / columns of the 1st or 2nd board, read forwards or backwards */
  function profiles(A, B) {
    const base = { R1: rowsOf(A), R2: rowsOf(B), C1: colsOf(A), C2: colsOf(B) };
    const out = {};
    Object.keys(base).forEach((k) => {
      out[k] = base[k];
      out[k + '~'] = base[k].slice().reverse();
    });
    return out;
  }
  /* cell-wise rules: the 16 boolean functions, copies / turns / mirrors, discs pushed to one side */
  function cellRules(A, B) {
    const out = {};
    RM.ALL_BOOL.forEach((f, i) => (out['bool' + i] = A.map((r, y) => r.map((v, x) => (f(!!v, !!B[y][x]) ? 1 : 0)))));
    Object.keys(TF).forEach((t) => {
      out['1' + t] = TF[t](A);
      out['2' + t] = TF[t](B);
    });
    Object.keys(GRAV).forEach((g) => {
      out['1' + g] = GRAV[g](A);
      out['2' + g] = GRAV[g](B);
    });
    return out;
  }
  /* examples: two [A, B, C] triples; pre: [A, B] of the missing triple. Every rule that fits both examples must
   * predict X. Returns the profile hypotheses that fit (for the intended-rule check). */
  function checkReading(examples, pre, X) {
    const R = rowsOf(X);
    const C = colsOf(X);
    const ex = examples.map(([A, B, Z]) => ({ p: profiles(A, B), c: cellRules(A, B), R: rowsOf(Z), C: colsOf(Z), k: keyM(Z) }));
    const pp = profiles(pre[0], pre[1]);
    const pc = cellRules(pre[0], pre[1]);
    const rowFits = [];
    const colFits = [];
    Object.keys(pp).forEach((h) => {
      if (ex.every((e) => same(e.p[h], e.R))) {
        rowFits.push(h);
        RM.need(same(pp[h], R));
      }
      if (ex.every((e) => same(e.p[h], e.C))) {
        colFits.push(h);
        RM.need(same(pp[h], C));
      }
    });
    Object.keys(pc).forEach((h) => {
      if (ex.every((e) => keyM(e.c[h]) === e.k)) RM.need(keyM(pc[h]) === keyM(X));
    });
    return { rowFits, colFits };
  }

  /* ------------------------------------------------------------ text helpers */
  const ORD = ['1st', '2nd', '3rd', '4th', '5th', '6th'];
  const seq = (a) => '(' + a.join(', ') + ')';
  const dots = (M) => M.map((r) => r.map((v) => (v ? '●' : '○')).join('')).join(' / ');
  const colList = (cs) => RM.list(cs.map((j) => String(j + 1)));

  RM.register({
    id: 'projections',
    name: 'Row & column counts',
    difficulty: 8,
    generate(rng, variant) {
      const v = variant % 4;
      const n = v === 2 ? 6 : 5;
      const rowFrom = v === 1 ? 1 : 0; // which panel (0 = 1st, 1 = 2nd) gives the row counts
      const rev = v === 3; // row counts read bottom to top
      const minHam = n === 5 ? 6 : 8;

      /* ---- the three matrix rows */
      const rows = [];
      for (let k = 0; k < 3; k++) {
        let row = null;
        for (let t = 0; t < 60 && !row; t++) {
          const X = makeX(rng, n);
          const R = rowsOf(X);
          const C = colsOf(X);
          if (rows.some((rw) => same(rowsOf(rw[2]), R) || same(colsOf(rw[2]), C))) continue;
          const rp = withRows(rng, rev ? R.slice().reverse() : R, n);
          const cp = withCols(rng, C, n);
          if (ham(rp, X) < minHam || ham(cp, X) < minHam || ham(rp, cp) < minHam) continue;
          if (same(colsOf(rp), C) || same(rowsOf(cp), R)) continue;
          if (Object.keys(TF).some((f) => keyM(TF[f](rp)) === keyM(X) || keyM(TF[f](cp)) === keyM(X))) continue;
          row = rowFrom === 0 ? [rp, cp, X] : [cp, rp, X];
        }
        RM.need(row);
        rows.push(row);
      }
      const X = rows[2][2];
      RM.need(uniquelyDetermined(X));

      /* ---- uniqueness: row-wise reading (intended) and column-wise reading */
      const want = { r: (rowFrom === 0 ? 'R1' : 'R2') + (rev ? '~' : ''), c: rowFrom === 0 ? 'C2' : 'C1' };
      const fit = checkReading([rows[0], rows[1]], [rows[2][0], rows[2][1]], X);
      RM.need(fit.rowFits.indexOf(want.r) >= 0 && fit.colFits.indexOf(want.c) >= 0);
      checkReading(
        [0, 1].map((c) => [rows[0][c], rows[1][c], rows[2][c]]),
        [rows[0][2], rows[1][2]],
        X
      );

      /* ---- distractors */
      const R = rowsOf(X);
      const C = colsOf(X);
      const T = sum(R);
      const rowP = rows[2][rowFrom];
      const colP = rows[2][1 - rowFrom];
      const rowSrc = rowFrom === 0 ? 'the 1st panel' : 'the 2nd panel';
      const colSrc = rowFrom === 0 ? 'the 2nd panel' : 'the 1st panel';
      const rowSrcS = rowFrom === 0 ? "the 1st panel's" : "the 2nd panel's";
      const colSrcS = rowFrom === 0 ? "the 2nd panel's" : "the 1st panel's";
      const xk = keyM(X);
      const pool = [];
      const seen = new Set([xk]);
      const add = (M, kind, story) => {
        if (!M) return;
        const k = keyM(M);
        if (seen.has(k) || sum(rowsOf(M)) !== T) return;
        seen.add(k);
        const r = rowsOf(M);
        const c = colsOf(M);
        const rOK = same(r, R);
        const cOK = same(c, C);
        if (rOK && cOK) return; // cannot happen (X is unique), kept as a safety net
        const why = story ? [story] : [];
        const rTxt = rev ? `${seq(R)} (the 1st panel's row counts read bottom to top)` : `${seq(R)} like ${rowSrcS}`;
        if (rOK) why.push(`its row counts are right, but its columns hold ${seq(c)} discs (left to right) instead of ${seq(C)} like ${colSrcS}`);
        else if (cOK) why.push(`its column counts are right, but its rows hold ${seq(r)} discs (top to bottom) instead of ${rTxt}`);
        else why.push(`its rows hold ${seq(r)} discs instead of ${seq(R)} and its columns ${seq(c)} instead of ${seq(C)}`);
        pool.push({ M, kind, rOK, cOK, why });
      };
      const ones = (M) => {
        const out = [];
        M.forEach((r, i) => r.forEach((v, j) => v && out.push([i, j])));
        return out;
      };
      const moved = (M, a, b) => {
        const Z = copy(M);
        Z[a[0]][a[1]] = 0;
        Z[b[0]][b[1]] = 1;
        return Z;
      };
      /* one disc moved inside its board row / column / to another row and column */
      const moves = (M, mode, cnt, story) => {
        const os = rng.shuffle(ones(M));
        let made = 0;
        for (const a of os) {
          const targets = rng.shuffle(
            RM.range(n * n)
              .map((q) => [Math.floor(q / n), q % n])
              .filter(([i, j]) => !M[i][j] && (mode === 'row' ? i === a[0] : mode === 'col' ? j === a[1] : i !== a[0] && j !== a[1]))
          );
          if (!targets.length) continue;
          const b = targets[0];
          const before = pool.length;
          const txt =
            story === true
              ? mode === 'row'
                ? `a disc of board row ${a[0] + 1} is in column ${b[1] + 1} instead of column ${a[1] + 1}`
                : mode === 'col'
                ? `a disc of board column ${a[1] + 1} is in row ${b[0] + 1} instead of row ${a[0] + 1}`
                : `the disc of board row ${a[0] + 1}, column ${a[1] + 1} has moved to row ${b[0] + 1}, column ${b[1] + 1}`
              : story;
          add(moved(M, a, b), story === true ? 'near-' + mode : 'far', txt);
          if (pool.length > before && ++made >= cnt) return;
        }
      };
      add(rowP, 'copy', `this is ${rowSrc} of the row unchanged`);
      add(colP, 'copy', `this is ${colSrc} of the row unchanged`);
      add(TF.fh(X), 'sym', 'this is the right board mirrored left ↔ right');
      add(TF.fv(X), 'sym', rev ? "the 1st panel's row counts were copied top to bottom instead of bottom to top" : 'this is the right board turned upside down');
      add(TF.tr(X), 'sym', 'this is the right board with rows and columns swapped');
      add(TF.r180(X), 'sym', 'this is the right board turned half a turn');
      add(construct(rowsOf(colP), colsOf(rowP), rng), 'swap', `it takes its row counts from ${colSrc} and its column counts from ${rowSrc} (the roles are swapped)`);
      moves(X, 'row', 3, true);
      moves(X, 'col', 3, true);
      moves(X, 'diag', 2, true);
      pool.filter((p) => p.kind === 'sym' || p.kind === 'copy').forEach((p) => moves(p.M, rng.pick(['row', 'col']), 1, null));

      /* pick 7: both partial checks (rows only / columns only) must leave several options, the answer must not be
       * the "most typical" option, and no simple feature may single it out */
      const feat = (M) => {
        const r = rowsOf(M);
        const c = colsOf(M);
        return [r.filter((x) => x === n).length, r.filter((x) => !x).length, c.filter((x) => x === n).length, c.filter((x) => !x).length].join(',');
      };
      const fx = feat(X);
      let best = null;
      for (let t = 0; t < 50; t++) {
        const near = rng.shuffle(pool.filter((p) => p.kind.indexOf('near') === 0));
        const sym = rng.shuffle(pool.filter((p) => p.kind === 'sym' || p.kind === 'swap'));
        const cop = rng.shuffle(pool.filter((p) => p.kind === 'copy'));
        const far = rng.shuffle(pool.filter((p) => p.kind === 'far'));
        const pick = [];
        const take = (arr, k) => arr.slice(0, k).forEach((p) => pick.length < 7 && pick.indexOf(p) < 0 && pick.push(p));
        take(near.filter((p) => p.rOK), 1);
        take(near.filter((p) => p.cOK), 1);
        take(near.filter((p) => !p.rOK && !p.cOK), rng.int(0, 1));
        take(cop, rng.int(0, 1));
        take(sym, rng.int(2, 3));
        take(far, 2);
        take(rng.shuffle(pool), 7);
        if (pick.length < 7) continue;
        const nr = pick.filter((p) => p.rOK).length;
        const nc = pick.filter((p) => p.cOK).length;
        if (nr < 2 || nc < 2) continue;
        if (!pick.some((p) => feat(p.M) === fx)) continue;
        const all = [X].concat(pick.map((p) => p.M));
        const tot = all.map((A) => all.reduce((s, B) => s + ham(A, B), 0));
        const edge = Math.min(...tot.slice(1)) - tot[0]; // > 0: the answer is the most central option
        const score = edge + (pick.filter((p) => p.kind.indexOf('near') === 0).length >= 2 ? 0 : 3);
        if (!best || score < best.score) best = { pick, score };
        if (score <= 0) break;
      }
      RM.need(best && best.score <= 0);
      const options = [{ spec: { b: X }, flaws: [] }].concat(best.pick.map((p) => ({ spec: { b: p.M }, flaws: p.why })));

      /* ---- correction */
      const ex = rows[0];
      const exR = rowsOf(ex[rowFrom]);
      const exC = colsOf(ex[1 - rowFrom]);
      const rank = RM.range(n).sort((a, b) => C[b] - C[a] || a - b);
      const groups = [];
      rank.forEach((j) => {
        const g = groups[groups.length - 1];
        if (g && C[g[0]] === C[j]) g.push(j);
        else groups.push([j]);
      });
      const rankTxt = groups
        .map((g) => (g.length === 1 ? `column ${g[0] + 1} needs ${C[g[0]]}` : `columns ${colList(g)} need ${C[g[0]]} each`))
        .join(', ');
      const needs = Array.from(new Set(R)).sort((a, b) => a - b);
      const useTxt = needs
        .map((k) => {
          const rs = R.map((x, i) => (x === k ? i + 1 : 0)).filter(Boolean);
          const who = (rs.length === 1 ? 'row ' : 'rows ') + RM.list(rs.map(String));
          if (k === 0) return `${who} stay${rs.length === 1 ? 's' : ''} empty`;
          if (k === n) return `${who} ${rs.length === 1 ? 'is' : 'are'} full`;
          return `${who} (${k} disc${k > 1 ? 's' : ''}) take${rs.length === 1 ? 's' : ''} column${k > 1 ? 's' : ''} ${colList(rank.slice(0, k))}`;
        })
        .join('; ');
      const rowRule = rev
        ? `the 3rd board's rows, read top to bottom, hold as many discs as the 1st board's rows read <b>bottom to top</b> (its top row matches the 1st board's bottom row, and so on). Top matrix row: the 1st board's rows hold ${seq(exR)} from the top, so the 3rd board's hold ${seq(exR.slice().reverse())}.`
        : `row by row (top to bottom), the 3rd board holds exactly as many discs as <b>${rowSrc}</b>. Top matrix row: ${seq(exR)} in both.`;
      const srcR = rev ? `the 1st panel's rows hold ${seq(R.slice().reverse())} from the top, so the missing board's rows (top to bottom) need ${seq(R)}` : `${rowSrcS} rows hold ${seq(R)}, so the missing board's rows need the same`;
      return {
        difficulty: 8,
        hint: 'count the discs along each row and along each column of the boards — not only in the whole board.',
        panels: RM.flat(rows.map((rw) => rw.map((M) => ({ b: M })))),
        answer: { b: X },
        options,
        key: (s) => keyM(s.b),
        render(s) {
          const pic = new RM.Pic();
          const M = s.b;
          const m = M.length;
          const step = m === 5 ? 16 : 13.6;
          const o = 50 - (step * (m - 1)) / 2;
          const rd = m === 5 ? 6.2 : 5.3;
          pic.add(`<rect x="${RM.fmt(o - step / 2 - 1)}" y="${RM.fmt(o - step / 2 - 1)}" width="${RM.fmt(step * m + 2)}" height="${RM.fmt(step * m + 2)}" rx="5" fill="none" stroke="${RM.LIGHT}" stroke-width="1.6"/>`);
          M.forEach((r, i) =>
            r.forEach((val, j) => {
              const x = o + j * step;
              const y = o + i * step;
              if (val) RM.circle(pic, x, y, rd, { fill: 'black', sw: 0 });
              else RM.circle(pic, x, y, rd - 1.6, { fill: 'none', stroke: RM.GRAY, sw: 1.5 });
            })
          );
          return pic.svg();
        },
        rules: [
          {
            k: 'Boards',
            t: `every panel is a ${n} × ${n} board of sockets; what matters is <b>how many discs</b> each board row and each board column holds, not the overall shape (so the three boards of a matrix row always hold the same number of discs: ${RM.list(rows.map((rw) => String(sum(rowsOf(rw[2])))))} in the top, middle and bottom rows).`,
          },
          { k: 'Row counts', t: rowRule },
          { k: 'Column counts', t: `column by column (left to right), the 3rd board holds exactly as many discs as <b>${colSrc}</b>. Top matrix row: ${seq(exC)} in both.` },
          {
            k: 'Only one board',
            t: 'these counts allow exactly one board. Rank the columns by how many discs they need: a row needing k discs must use the k most-needed columns (the most-needed column needs a disc in every row that has any, the next one in every row with at least two, and so on); any other arrangement leaves some column with too many or too few discs.',
          },
          {
            k: 'Answer',
            t: `bottom matrix row: ${srcR}; ${colSrcS} columns hold ${seq(C)}. Ranking: ${rankTxt}. So ${useTxt}. Missing board, top row to bottom row: <b>${dots(X)}</b> (${T} discs).`,
          },
        ],
      };
    },
  });
})();
