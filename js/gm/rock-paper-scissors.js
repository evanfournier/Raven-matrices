/* Rock, paper, scissors (grandmaster): every row has two boards (columns 1 and 2) with circles / squares / triangles on
 * some cells; column 3 is the two boards laid on top of each other. A cell with one token keeps it, two equal tokens
 * merge into one, two different tokens fight and the winner stays — according to a hidden CYCLIC dominance (A beats B
 * beats C beats A). Rows 1–2 show all three pairings. Hypotheses checked against rows 1–2: both cycles, all 6 transitive
 * rankings, "column 1 wins", "column 2 wins", "conflict → empty", "conflict → the third token", each with and without
 * "equal tokens cancel out"; every surviving hypothesis must predict the same board for row 3. */
(function () {
  'use strict';
  const RM = window.RM;

  const NAME = ['', 'circle', 'square', 'triangle'];
  const SYM = ['·', '○', '□', '△'];
  const SHAPE = ['', 'circle', 'square', 'triangle'];
  const nxt = (a, dir) => ((a - 1 + dir + 3) % 3) + 1;
  const duel = (a, b, dir) => (b === nxt(a, dir) ? a : b); // a beats nxt(a,dir)
  const same = (a, b) => a.join('') === b.join('');
  const PERMS = [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]];

  function hyps() {
    const out = [];
    for (const eq of [true, false]) {
      const cons = [
        { id: 'cyc+', f: (a, b) => duel(a, b, 1) },
        { id: 'cyc-', f: (a, b) => duel(a, b, -1) },
        ...PERMS.map((p) => ({ id: 'rank' + p.join(''), p, f: (a, b) => (p.indexOf(a) < p.indexOf(b) ? a : b) })),
        { id: 'col1', f: (a) => a },
        { id: 'col2', f: (a, b) => b },
        { id: 'none', f: () => 0 },
        { id: 'third', f: (a, b) => 6 - a - b },
      ];
      for (const c of cons)
        out.push({ eq, id: c.id, p: c.p, f: (a, b) => (a === 0 ? b : b === 0 ? a : a === b ? (eq ? a : 0) : c.f(a, b)) });
    }
    return out;
  }
  const merge = (A, B, h) => A.map((a, i) => h.f(a, B[i]));

  function genRow(rng, N) {
    const A = [], B = [];
    for (let i = 0; i < N * N; i++) {
      const u = rng.next();
      const t1 = rng.int(1, 3);
      if (u < 0.3) { A.push(0); B.push(0); }
      else if (u < 0.5) { A.push(t1); B.push(0); }
      else if (u < 0.7) { A.push(0); B.push(t1); }
      else if (u < 0.78) { A.push(t1); B.push(t1); }
      else { A.push(t1); B.push(1 + ((t1 - 1 + rng.int(1, 2)) % 3)); }
    }
    return { A, B };
  }
  const nConf = (r) => r.A.filter((a, i) => a && r.B[i] && a !== r.B[i]).length;
  const nEq = (r) => r.A.filter((a, i) => a && a === r.B[i]).length;

  RM.register({
    id: 'rock-paper-scissors',
    name: 'Rock, paper, scissors',
    difficulty: 7,
    generate(rng, variant) {
      const N = variant % 2 === 1 ? 5 : 4;
      const dir = rng.pick([1, -1]);
      const hy = hyps();
      const truth = hy.find((h) => h.eq && h.id === (dir > 0 ? 'cyc+' : 'cyc-'));
      const minC = N === 4 ? 4 : 6;
      const rows = [];
      for (let r = 0; r < 3; r++) {
        let row = null;
        for (let t = 0; t < 40 && !row; t++) {
          const c = genRow(rng, N);
          const k = nConf(c);
          if (k >= (r < 2 ? minC - 1 : minC) && k <= minC + 3) row = c;
        }
        RM.need(row);
        row.C = merge(row.A, row.B, truth);
        rows.push(row);
      }
      const pairs = new Set();
      for (const r of [0, 1]) rows[r].A.forEach((a, i) => { const b = rows[r].B[i]; if (a && b && a !== b) pairs.add(a + b); });
      RM.need(pairs.size === 3);
      RM.need(nEq(rows[0]) + nEq(rows[1]) >= 2 && nEq(rows[2]) >= 1);
      const live = hy.filter((h) => [0, 1].every((r) => same(merge(rows[r].A, rows[r].B, h), rows[r].C)));
      const answer = rows[2].C;
      RM.need(live.length >= 1 && live.every((h) => same(merge(rows[2].A, rows[2].B, h), answer)));

      const place = (i) => `line ${((i / N) | 0) + 1}, place ${(i % N) + 1}`;
      const why = (a, b) =>
        a && b && a !== b ? `a ${NAME[a]} (board 1) meets a ${NAME[b]} (board 2): the ${NAME[duel(a, b, dir)]} wins`
        : a && a === b ? `two ${NAME[a]}s merge into one ${NAME[a]}`
        : a || b ? `only a ${NAME[a || b]} here, it stays`
        : 'nothing on either board, it stays empty';
      const A3 = rows[2].A, B3 = rows[2].B;
      const show = (v) => (v ? 'a ' + NAME[v] : 'nothing');
      const diffCells = (bd) => answer.map((v, i) => (bd[i] !== v ? i : -1)).filter((i) => i >= 0);

      // ---- candidates
      const rev = dir > 0 ? 'cyc-' : 'cyc+';
      const pri = (h) => (!h.eq ? (h.id === (dir > 0 ? 'cyc+' : 'cyc-') ? 4.5 : 9) : h.id === rev ? 0 : h.id === 'col1' ? 1 : h.id === 'col2' ? 2 : h.id === 'none' ? 3 : h.id === 'third' ? 4 : 5 + rng.next());
      const descr = (h) =>
        !h.eq ? 'two identical tokens cancel each other out'
        : h.id === rev ? 'the dominance cycle is reversed'
        : h.id === 'col1' ? 'the token of board 1 always wins'
        : h.id === 'col2' ? 'the token of board 2 always wins'
        : h.id === 'none' ? 'two different tokens destroy each other'
        : h.id === 'third' ? 'two different tokens turn into the third kind'
        : `a fixed ranking ${h.p.map((x) => NAME[x]).join(' > ')} decides`;
      const evid = (h) => {
        for (const r of [0, 1])
          for (let i = 0; i < N * N; i++) {
            const a = rows[r].A[i], b = rows[r].B[i];
            if (h.f(a, b) !== rows[r].C[i]) return `row ${r + 1}, ${place(i)} shows the opposite (${why(a, b)})`;
          }
        return 'the visible rows contradict it';
      };
      const cands = new Map();
      const add = (bd, flaws, p) => {
        const k = bd.join('');
        if (k === answer.join('') || (cands.has(k) && cands.get(k).p <= p)) return;
        cands.set(k, { bd, flaws, p });
      };
      for (const h of hy) {
        if (h === truth) continue;
        const bd = merge(A3, B3, h);
        const dc = diffCells(bd);
        if (!dc.length) continue;
        const i = dc[0];
        add(bd, [`This is what you get if ${descr(h)}, but ${evid(h)}; here ${place(i)} should show ${show(answer[i])} (${why(A3[i], B3[i])}).`], pri(h));
      }
      // single / double cell slips
      const natural = (i) => {
        const a = A3[i], b = B3[i], w = answer[i];
        if (a && b && a !== b) return a === w ? b : a;
        if (w) return 0;
        return rng.int(1, 3);
      };
      for (let t = 0; t < 14; t++) {
        const k = t < 8 ? 1 : 2;
        const idx = rng.sample(RM.range(N * N), k);
        const bd = answer.slice();
        idx.forEach((i) => (bd[i] = natural(i)));
        add(bd, idx.map((i) => `${place(i)} should show ${show(answer[i])} (${why(A3[i], B3[i])}), not ${show(bd[i])}.`), 20 + k + rng.next());
      }
      const chosen = Array.from(cands.values()).sort((x, y) => x.p - y.p).slice(0, 7);
      RM.need(chosen.length === 7);

      // ---- rules
      const cyc = dir > 0 ? 'circle beats square, square beats triangle, triangle beats circle' : 'square beats circle, triangle beats square, circle beats triangle';
      const ex = [];
      for (const [a, b] of [[1, 2], [2, 3], [3, 1]]) {
        let f = null;
        for (const r of [0, 1]) for (let i = 0; i < N * N && !f; i++) {
          const x = rows[r].A[i], y = rows[r].B[i];
          if ((x === a && y === b) || (x === b && y === a)) f = `row ${r + 1}, ${place(i)}: ${NAME[x]} + ${NAME[y]} → ${NAME[rows[r].C[i]]}`;
        }
        ex.push(f);
      }
      const confl = [];
      for (let i = 0; i < N * N; i++) if (A3[i] && B3[i] && A3[i] !== B3[i]) confl.push(`${place(i)}: ${NAME[A3[i]]} + ${NAME[B3[i]]} → ${NAME[answer[i]]}`);
      const lines = RM.range(N).map((r) => answer.slice(r * N, r * N + N).map((v) => SYM[v]).join(' '));
      const rules = [
        { k: 'Boards', t: `in every row, column 3 is column 1 and column 2 <b>laid on top of each other</b>, cell by cell (lines run across, places run down the board).` },
        { k: 'Easy cells', t: 'a cell with a single token keeps it; two <b>identical</b> tokens merge into one; an empty cell stays empty.' },
        { k: 'Duels', t: `two <b>different</b> tokens fight and the winner stays. There is no strongest token: the dominance is a circle — <b>${cyc}</b>. Rows 1–2 show every pairing (${ex.join('; ')}).` },
        { k: 'Row 3', t: `the duels of the last row: ${confl.join('; ')}. All other cells follow the easy rules.` },
        { k: 'Answer', t: `the missing board, line by line: <b>${lines.join(' / ')}</b>.` },
      ];

      const spec = (c) => ({ n: N, c });
      const panels = [];
      for (let r = 0; r < 3; r++) {
        panels.push(spec(rows[r].A), spec(rows[r].B));
        if (r < 2) panels.push(spec(rows[r].C));
      }
      const render = (s) => {
        const pic = new RM.Pic();
        const n = s.n, x0 = 8, cs = 84 / n;
        for (let i = 0; i <= n; i++) {
          RM.line(pic, x0, x0 + i * cs, x0 + 84, x0 + i * cs, { sw: i === 0 || i === n ? 1.8 : 1, color: i === 0 || i === n ? RM.INK : RM.LIGHT, cap: 'butt' });
          RM.line(pic, x0 + i * cs, x0, x0 + i * cs, x0 + 84, { sw: i === 0 || i === n ? 1.8 : 1, color: i === 0 || i === n ? RM.INK : RM.LIGHT, cap: 'butt' });
        }
        s.c.forEach((v, i) => {
          if (v) RM.shape(pic, SHAPE[v], x0 + ((i % n) + 0.5) * cs, x0 + (((i / n) | 0) + 0.5) * cs, cs * 0.34, { fill: 'dark', sw: 1.2 });
        });
        return pic.svg();
      };
      return {
        difficulty: 7,
        hint: 'when two different tokens meet, ask who wins — and check whether any token is the strongest of all.',
        panels,
        answer: spec(answer),
        options: [{ spec: spec(answer), flaws: [] }].concat(chosen.map((c) => ({ spec: spec(c.bd), flaws: c.flaws }))),
        render,
        key: (s) => s.c.join(''),
        rules,
      };
    },
  });
})();
