/* Leaper distance (grandmaster): a hidden leaper (a,b) jumps a squares one way and b the other. Each panel marks the
   squares at minimum move distance exactly k (or at most k) from the star; columns give k, rows give start squares. */
(function () {
  'use strict';
  const RM = window.RM;
  const NAMES = { '1,2': 'knight', '1,3': 'camel', '2,3': 'zebra' };

  function moves(a, b) {
    const s = new Map();
    for (const [p, q] of [[a, b], [b, a]])
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) s.set(p * sx + ',' + q * sy, [p * sx, q * sy]);
    return [...s.values()];
  }
  function dists(n, mv, st) {
    const d = new Array(n * n).fill(-1);
    d[st] = 0;
    let q = [st];
    while (q.length) {
      const nq = [];
      for (const c of q) {
        const x = c % n, y = (c - x) / n;
        for (const [dx, dy] of mv) {
          const u = x + dx, v = y + dy;
          if (u < 0 || v < 0 || u >= n || v >= n) continue;
          if (d[v * n + u] < 0) { d[v * n + u] = d[c] + 1; nq.push(v * n + u); }
        }
      }
      q = nq;
    }
    return d;
  }
  function marks(n, mv, st, k, cum) {
    const d = dists(n, mv, st), r = [];
    for (let i = 0; i < n * n; i++) if (d[i] > 0 && (cum ? d[i] <= k : d[i] === k)) r.push(i);
    return r;
  }
  const mk = (n, st, m) => ({ n, st, m });
  const same = (x, y) => x.length === y.length && x.every((v, i) => v === y[i]);

  RM.register({
    id: 'knight-reach',
    name: 'Leaper distance',
    difficulty: 8,
    generate(rng, variant) {
      const n = variant === 3 ? 6 : 7;
      const cum = variant === 1;
      const ks = variant === 2 ? [2, 3, 4] : [1, 2, 3];
      const lp = rng.pick([[1, 2], [1, 2], [1, 3], [2, 3]]);
      const mv = moves(lp[0], lp[1]);
      const N = n * n;
      const starts = rng.sample(RM.range(N), 3);
      const grid = [];
      for (let r = 0; r < 3; r++) {
        grid.push([]);
        for (let c = 0; c < 3; c++) grid[r].push(mk(n, starts[r], marks(n, mv, starts[r], ks[c], cum)));
      }
      const ans = grid[2][2];
      RM.need(ans.m.length >= 3);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) RM.need(grid[r][c].m.length >= 2);
      // hypotheses: leaper (a,b), distance offset, exact/cumulative
      let hyp = 0;
      for (let a = 0; a <= 4; a++) for (let b = Math.max(a, 1); b <= 4; b++) {
        const hm = moves(a, b);
        for (let off = 0; off <= 2; off++) for (const hc of [false, true]) {
          const f = (r, c) => marks(n, hm, starts[r], ks[c] - ks[0] + 1 + off, hc);
          let ok = true;
          for (let r = 0; r < 3 && ok; r++) for (let c = 0; c < 3; c++) {
            if (r === 2 && c === 2) continue;
            if (!same(f(r, c), grid[r][c].m)) { ok = false; break; }
          }
          if (!ok) continue;
          hyp++;
          RM.need(same(f(2, 2), ans.m));
        }
      }
      RM.need(hyp >= 1);
      // distractors
      const kk = ks[2], st = starts[2];
      const cand = [];
      const add = (m, why) => { if (m.length && !same(m, ans.m)) cand.push({ spec: mk(n, st, m), flaws: [why] }); };
      const x0 = st % n, y0 = (st - x0) / n;
      if (!cum) add(marks(n, mv, st, kk, true), 'this marks every square within ' + kk + ' moves, not only those needing exactly ' + kk + '.');
      else add(marks(n, mv, st, kk, false), 'this marks only squares needing exactly ' + kk + ' moves; the columns are cumulative (at most k).');
      add(marks(n, mv, st, kk - 1, cum), 'this is the picture for ' + (kk - 1) + ' moves, not ' + kk + '.');
      add(marks(n, mv, st, kk + 1, cum), 'this is the picture for ' + (kk + 1) + ' moves, not ' + kk + '.');
      add(marks(n, mv, st, kk - 2, cum), 'this is the picture for ' + (kk - 2) + ' moves, not ' + kk + '.');
      for (const [a, b] of [[1, 2], [1, 3], [2, 3], [1, 4], [0, 2], [2, 2]])
        if (a !== lp[0] || b !== lp[1]) add(marks(n, moves(a, b), st, kk, cum), 'this is the pattern of a different leaper (' + a + ',' + b + '), not of the piece shown in the first column.');
      for (const m of ans.m) { // missing / extra squares
        add(ans.m.filter((v) => v !== m), 'one square is missing: every square that needs exactly ' + kk + ' moves must be marked.');
      }
      const d = dists(n, mv, st);
      for (let i = 0; i < N; i++) if (d[i] > 0 && !ans.m.includes(i) && d[i] !== kk) {
        add(ans.m.concat([i]).sort((p, q) => p - q), 'an extra square is marked that does not need ' + (cum ? 'at most ' : 'exactly ') + kk + ' moves.');
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const u = x0 + dx, v = y0 + dy;
        if (u < 0 || v < 0 || u >= n || v >= n) continue;
        const s2 = v * n + u;
        const m2 = marks(n, mv, s2, kk, cum);
        if (m2.length && !(same(m2, ans.m))) cand.push({ spec: mk(n, s2, m2), flaws: ['the star is not on the right square (one square off); the start square is the one in the previous panels of this row.'] });
      }
      const seen = new Set([key(ans)]);
      const uniq = [];
      for (const c of rng.shuffle(cand)) { const k = key(c.spec); if (!seen.has(k)) { seen.add(k); uniq.push(c); } }
      RM.need(uniq.length >= 7);
      // prefer structural distractors first (those added early are more tempting): keep order bias
      const early = cand.filter((c) => uniq.includes(c)).slice(0, 5);
      const rest = rng.shuffle(uniq.filter((c) => !early.includes(c)));
      const opts = early.concat(rest).slice(0, 7);
      opts.push({ spec: ans, flaws: [] });

      const pos = (i) => 'column ' + ((i % n) + 1) + ', row ' + (Math.floor(i / n) + 1);
      const nm = NAMES[lp[0] + ',' + lp[1]];
      const col1 = grid[2][0];
      const rules = [
        { k: 'The piece', t: 'The star is a leaper of type (' + lp[0] + ',' + lp[1] + ')' + (nm ? ' (a ' + nm + ')' : '') + ': one jump moves it ' + lp[0] + ' square(s) in one direction and ' + lp[1] + ' in the perpendicular one, in any of the 8 orientations, and it cannot leave the ' + n + '×' + n + ' board. The first column (' + ks[0] + (ks[0] === 1 ? ' move' : ' moves') + ') shows its jump pattern, clipped by the edges.' },
        { k: 'The columns', t: 'Dots mark the squares ' + (cum ? 'reachable in <b>at most</b> k moves' : 'whose <b>minimum</b> number of moves is <b>exactly</b> k') + ', with k = ' + ks.join(', ') + ' for the three columns. ' + (cum ? 'Each column therefore contains the previous one.' : 'A square reachable in fewer moves is not marked.') + ' The star square itself is never marked.' },
        { k: 'The rows', t: 'Each row uses a different start square for the star; the same piece is used everywhere.' },
        { k: 'Missing panel', t: 'The star of row 3 stands at ' + pos(st) + '. Counting jumps from there (1 move: ' + marks(n, mv, st, 1, false).length + ' squares), the squares ' + (cum ? 'within ' : 'needing exactly ') + kk + ' moves number <b>' + ans.m.length + '</b>: ' + ans.m.map(pos).join('; ') + '.' },
      ];
      return {
        panels: RM.flat(grid).slice(0, 8),
        answer: ans,
        options: opts,
        render,
        key,
        rules,
        hint: 'The first column shows you how this piece jumps.',
        difficulty: 8,
      };
    },
  });

  function key(s) { return s.st + ':' + s.m.join(','); }
  function render(s) {
    const pic = new RM.Pic();
    const n = s.n, cs = 92 / n, o = 4;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++)
      pic.add('<rect x="' + RM.fmt(o + x * cs) + '" y="' + RM.fmt(o + y * cs) + '" width="' + RM.fmt(cs) + '" height="' + RM.fmt(cs) + '" fill="' + ((x + y) % 2 ? RM.FAINT : RM.WHITE) + '"/>');
    pic.add('<rect x="' + o + '" y="' + o + '" width="92" height="92" fill="none" stroke="' + RM.INK + '" stroke-width="1.6"/>');
    for (const i of s.m) RM.circle(pic, o + (i % n + 0.5) * cs, o + (Math.floor(i / n) + 0.5) * cs, cs * 0.24, { fill: 'black' });
    const sx = s.st % n, sy = Math.floor(s.st / n);
    RM.shape(pic, 'star5', o + (sx + 0.5) * cs, o + (sy + 0.5) * cs, cs * 0.46, { fill: 'white', sw: 1.8 });
    return pic.svg();
  }
})();
