/* Sandpile (grandmaster): abelian sandpile. Column 3 = column 1 + column 2, then every cell holding 4+ grains topples
   (loses 4, each orthogonal neighbour gains 1, grains pushed off the edge vanish) until all cells hold at most 3. */
(function () {
  'use strict';
  const RM = window.RM;
  const NB = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const DG = [[1, 1], [-1, -1], [1, -1], [-1, 1]];

  function topple(n, v, opts) { // returns {g, log, lost}
    opts = opts || {};
    const g = v.slice(), log = [];
    let lost = 0, guard = 0;
    const dirs = opts.dirs || NB;
    while (guard++ < 60) {
      const unstable = [];
      for (let i = 0; i < n * n; i++) if (g[i] >= 4) unstable.push(i);
      if (!unstable.length) break;
      const pass = [];
      const d = g.slice();
      for (const i of unstable) {
        const k = Math.floor(g[i] / 4), r = Math.floor(i / n), c = i % n;
        d[i] -= 4 * k;
        pass.push([r, c, k]);
        for (const [dr, dc] of dirs) {
          let rr = r + dr, cc = c + dc;
          if (opts.wrap) { rr = (rr + n) % n; cc = (cc + n) % n; }
          if (rr < 0 || cc < 0 || rr >= n || cc >= n) lost += k; else d[rr * n + cc] += k;
        }
      }
      for (let i = 0; i < n * n; i++) g[i] = d[i];
      log.push(pass);
      if (opts.oneRound) break;
    }
    return { g, log, lost };
  }

  function gridTxt(n, g) {
    let s = '';
    for (let r = 0; r < n; r++) s += g.slice(r * n, r * n + n).join(' ') + (r < n - 1 ? '<br>' : '');
    return '<span style="font-family:monospace">' + s + '</span>';
  }

  RM.register({
    id: 'sandpile',
    name: 'Sandpile',
    difficulty: 8,
    generate(rng, variant) {
      const n = variant >= 2 ? 4 : 3, N = n * n;
      const sq = variant === 3;
      const mk = () => { const a = []; for (let i = 0; i < N; i++) a.push(rng.pick([0, 1, 2, 2, 3, 3, 3])); return a; };
      const rows = [];
      for (let r = 0; r < 3; r++) {
        const A = mk(), B = mk(), S = A.map((x, i) => x + B[i]);
        const t = topple(n, S);
        rows.push({ A, B, S, C: t.g, log: t.log, lost: t.lost });
      }
      const cells = (row) => row.log.reduce((s, p) => s + p.length, 0);
      const nTop = (row) => row.log.reduce((s, p) => s + p.reduce((q, x) => q + x[2], 0), 0);
      const cascade = (row) => row.log.length >= 2;
      RM.need(cascade(rows[0]) || cascade(rows[1]));
      RM.need(rows[0].lost + rows[1].lost > 0);
      RM.need(nTop(rows[2]) >= 2 && cells(rows[2]) >= 2 && rows[2].log.length >= 2 - (variant > 1 ? 1 : 0));
      RM.need(nTop(rows[0]) >= 1 && nTop(rows[1]) >= 1);
      RM.need(rows[0].S.some(x => x > 3));
      RM.need(rows.every(r => r.C.some(x => x > 0)) && rows.every(r => r.A.join() !== r.C.join() && r.B.join() !== r.C.join()));
      // alternative hypotheses
      const hyps = {
        'mod4': (S) => S.map(x => x % 4),
        'cap3': (S) => S.map(x => Math.min(3, x)),
        'sub4': (S) => S.map(x => x >= 4 ? x - 4 : x),
        'diag8': (S) => topple(n, S, { dirs: NB.concat(DG) }).g.map(x => x), // threshold handled below
        'one round': (S) => topple(n, S, { oneRound: true }).g,
      };
      hyps.diag8 = (S) => { const o = S.slice(); const t = topple(n, S.map(x => x >= 8 ? x : x), { dirs: NB.concat(DG) }); void t; return o; };
      for (const h of Object.keys(hyps)) {
        const f = hyps[h];
        const fits01 = rows[0].C.join() === f(rows[0].S).join() && rows[1].C.join() === f(rows[1].S).join();
        RM.need(!fits01);
        RM.need(f(rows[2].S).join() !== rows[2].C.join());
      }
      const ans = rows[2].C, S3 = rows[2].S;
      const key = (a) => a.join('');
      const cand = [];
      const add = (a, why) => {
        if (a.some(x => x < 0 || x > 3) || key(a) === key(ans)) return;
        cand.push({ spec: a, flaws: [why] });
      };
      add(hyps.mod4(S3), 'This is the plain sum taken modulo 4: cells just wrap around instead of toppling, so no grain is passed to the neighbours.');
      add(hyps.cap3(S3), 'The sum was capped at 3 grains per cell; the extra grains do not vanish, they topple onto the neighbours.');
      add(topple(n, S3, { oneRound: true }).g, 'Toppling stopped after one round, but the grains that moved made other cells overloaded again, which must topple too.');
      add(topple(n, S3, { dirs: DG }).g, 'Grains were pushed to the diagonal neighbours; a toppling cell feeds only its four orthogonal neighbours (up, down, left, right).');
      add(topple(n, S3, { wrap: true }).g, 'Grains pushed over the edge wrapped around to the opposite side; they must simply be lost.');
      add(topple(n, S3, { dirs: NB.concat(DG) }).g.map(x => Math.min(3, x)), 'A toppling cell gave grains to 8 neighbours; it gives exactly one grain to each of its 4 orthogonal neighbours.');
      // one grain off, one cell
      const idxs = rng.shuffle(RM.range(N));
      for (const i of idxs) {
        for (const d of rng.shuffle([1, -1])) {
          const a = ans.slice(); a[i] += d;
          add(a, 'One cell is off by one grain (' + (d > 0 ? 'one too many' : 'one too few') + ' at row ' + (Math.floor(i / n) + 1) + ', column ' + (i % n + 1) + '): the toppling was not counted exactly.');
        }
      }
      // two cells swapped / mirrored
      const mir = RM.tgrid(ans, n, 'fh');
      add(mir, 'The result is mirrored left to right: the grains must stay where the toppling puts them.');
      const rot = RM.tgrid(ans, n, 'tr');
      add(rot, 'The result is transposed (rows and columns swapped).');
      const pr = [];
      for (const c of cand) if (!pr.some(p => key(p.spec) === key(c.spec))) pr.push(c);
      RM.need(pr.length >= 7);
      const tempt = pr.slice(0, 6), rest = pr.slice(6);
      const opts = tempt.concat(rng.sample(rest, 7 - tempt.length)).slice(0, 7);
      opts.push({ spec: ans, flaws: [] });

      const lines = (row) => row.log.map((p, i) => 'round ' + (i + 1) + ': ' + p.map(x => '(' + (x[0] + 1) + ',' + (x[1] + 1) + ')' + (x[2] > 1 ? '×' + x[2] : '')).join(' ')).join('; ');
      const r0 = rows[0];
      const g = {
        panels: [rows[0].A, rows[0].B, rows[0].C, rows[1].A, rows[1].B, rows[1].C, rows[2].A, rows[2].B],
        answer: ans,
        options: opts,
        render(spec) {
          const pic = new RM.Pic();
          const cs = 88 / n, o = 6;
          for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
            const x = o + c * cs, y = o + r * cs;
            pic.add('<rect x="' + RM.fmt(x) + '" y="' + RM.fmt(y) + '" width="' + RM.fmt(cs) + '" height="' + RM.fmt(cs) + '" fill="#f3f4f6" stroke="' + RM.INK + '" stroke-width="1.6"/>');
            const k = spec[r * n + c], m = cs / 2, d = cs * 0.25, gr = cs * 0.15;
            const pts = k === 1 ? [[0, 0]] : k === 2 ? [[-d, -d], [d, d]] : k === 3 ? [[-d, -d], [0, 0], [d, d]] : [];
            for (const [dx, dy] of pts) {
              if (sq) pic.add('<rect x="' + RM.fmt(x + m + dx - gr) + '" y="' + RM.fmt(y + m + dy - gr) + '" width="' + RM.fmt(2 * gr) + '" height="' + RM.fmt(2 * gr) + '" fill="' + RM.INK + '"/>');
              else RM.circle(pic, x + m + dx, y + m + dy, gr, { fill: RM.INK, sw: 0 });
            }
          }
          return pic.svg();
        },
        key: (s) => s.join(''),
        rules: [
          { k: 'Grid', t: 'Each panel is a ' + n + '×' + n + ' board; a cell holds 0 to 3 grains (' + (sq ? 'small squares' : 'dots') + ').' },
          { k: 'Adding', t: 'In every row, the third board is obtained by <b>adding</b> the grains of the first two boards cell by cell, then letting the pile settle.' },
          { k: 'Toppling', t: 'A cell with <b>4 or more</b> grains topples: it loses 4 grains and each of its 4 neighbours (up, down, left, right) gains 1. Grains pushed off the edge are lost. Repeat until every cell has at most 3 grains (the order does not matter). Check on row 1: sum<br>' + gridTxt(n, r0.S) + '<br>settles in ' + lines(r0) + ' (row, column) to<br>' + gridTxt(n, r0.C) },
          { k: 'Last row', t: 'Sum of the first two boards of row 3:<br>' + gridTxt(n, S3) + '<br>Topplings: ' + lines(rows[2]) + '.<br>Final board:<br><b>' + gridTxt(n, ans) + '</b>' },
        ],
        hint: "A cell can't hold more than three grains: the rest goes somewhere.",
      };
      return g;
    },
  });
})();
