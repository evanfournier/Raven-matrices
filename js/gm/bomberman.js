/* Chain blast (grandmaster): 7x7 boards with walls (solid), crates (hatched) and bombs (black). In every row: column 1 = the board,
 * column 2 = the same board with one bomb lit, column 3 = the board after the blast. Hidden blast rules: range r in 4 (or 8)
 * directions; walls stop the blast; the first crate is destroyed and (usually) stops it; a bomb reached explodes too (chain).
 * 48 hypotheses (r 1-4 x crate stop/pass/solid x bomb chain/ignore x diagonals yes/no) are simulated on rows 1-2; rows are
 * chosen greedily so that the surviving hypotheses are refuted as far as possible, and all survivors must agree on row 3.
 * Distractors = results of refuted hypotheses and one-cell slips; the answer is never the most central option. */
(function () {
  'use strict';
  const RM = window.RM;
  const N = 7;
  const CS = 12;
  const X0 = 8;
  const DIR4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const DIR8 = DIR4.concat([[1, 1], [1, -1], [-1, 1], [-1, -1]]);
  const HYP = [];
  for (let r = 1; r <= 4; r++) for (const crate of ['stop', 'pass', 'solid']) for (const bomb of ['stop', 'ignore']) for (const diag of [false, true]) HYP.push({ r, crate, bomb, diag });
  const INTENDED = [
    { r: 3, crate: 'stop', bomb: 'stop', diag: false },
    { r: 2, crate: 'stop', bomb: 'stop', diag: true },
    { r: 3, crate: 'pass', bomb: 'stop', diag: false },
    { r: 2, crate: 'stop', bomb: 'stop', diag: false },
  ];

  function run(h, g, lit) {
    const ex = new Uint8Array(N * N);
    const kill = new Uint8Array(N * N);
    const order = [lit];
    ex[lit] = 1;
    const dirs = h.diag ? DIR8 : DIR4;
    for (let qi = 0; qi < order.length; qi++) {
      const p = order[qi];
      const px = p % N, py = (p / N) | 0;
      for (const [dx, dy] of dirs) {
        for (let k = 1; k <= h.r; k++) {
          const x = px + dx * k, y = py + dy * k;
          if (x < 0 || y < 0 || x >= N || y >= N) break;
          const i = y * N + x;
          const t = g[i];
          if (t === 1) break;
          if (t === 2) {
            if (h.crate === 'solid') break;
            kill[i] = 1;
            if (h.crate === 'stop') break;
          } else if (t === 3) {
            if (h.bomb === 'ignore') continue;
            if (!ex[i]) { ex[i] = 1; order.push(i); }
            if (h.bomb === 'stop') break;
          }
        }
      }
    }
    const out = g.slice();
    for (let i = 0; i < N * N; i++) if (kill[i] || ex[i]) out[i] = 0;
    return { out, order, kill };
  }
  const same = (a, b) => { for (let i = 0; i < N * N; i++) if (a[i] !== b[i]) return false; return true; };
  const rc = (i) => `row ${((i / N) | 0) + 1}, column ${(i % N) + 1}`;

  RM.register({
    id: 'bomberman',
    name: 'Chain blast',
    difficulty: 7,
    generate(rng, variant) {
      const I = INTENDED[variant % 4];
      const randBoard = () => {
        const g = Array(N * N).fill(0);
        const cells = rng.shuffle(RM.range(N * N));
        let ci = 0;
        const nw = rng.int(4, 7), nb = rng.int(3, 5), nc = rng.int(9, 13);
        for (let i = 0; i < nw; i++) g[cells[ci++]] = 1;
        const bombs = [];
        for (let i = 0; i < nb; i++) { const c = cells[ci++]; g[c] = 3; bombs.push(c); }
        for (let t = 0, placed = 0; placed < nc && t < 80; t++) {
          let c;
          if (rng.chance(0.7)) {
            const b = rng.pick(bombs);
            const [dx, dy] = rng.pick(DIR4);
            const k = rng.int(1, 4);
            const x = (b % N) + dx * k, y = ((b / N) | 0) + dy * k;
            if (x < 0 || y < 0 || x >= N || y >= N) continue;
            c = y * N + x;
          } else c = rng.int(0, N * N - 1);
          if (g[c] === 0) { g[c] = 2; placed++; }
        }
        const lit = rng.pick(bombs);
        if (rng.chance(0.65)) {
          const [dx, dy] = rng.pick(DIR4);
          const k = rng.int(1, 2), j = rng.int(1, 2);
          const bx = (lit % N) + dx * k, by = ((lit / N) | 0) + dy * k;
          const cx = bx + dx * j, cy = by + dy * j;
          if (bx >= 0 && by >= 0 && bx < N && by < N && cx >= 0 && cy >= 0 && cx < N && cy < N && g[by * N + bx] < 3 && g[cy * N + cx] !== 1 && g[cy * N + cx] !== 3 && g[by * N + bx] !== 1) {
            g[by * N + bx] = 3;
            g[cy * N + cx] = 2;
          }
        }
        return { g, lit };
      };
      const rows = [];
      let H = HYP.slice();
      const count = (a, b, t) => { let n = 0; for (let i = 0; i < N * N; i++) if (a[i] === t && b[i] !== t) n++; return n; };
      for (let r = 0; r < 2; r++) {
        let best = null;
        for (let t = 0; t < 60; t++) {
          const B = randBoard();
          const res = run(I, B.g, B.lit);
          if (count(B.g, res.out, 2) < 2 || res.order.length < 2) continue;
          const elim = H.filter((h) => !same(run(h, B.g, B.lit).out, res.out)).length;
          if (!best || elim > best.elim) best = { B, res, elim };
        }
        RM.need(best);
        rows.push(best);
        H = H.filter((h) => same(run(h, best.B.g, best.B.lit).out, best.res.out));
      }
      let r3 = null;
      for (let t = 0; t < 120; t++) {
        const B = randBoard();
        const res = run(I, B.g, B.lit);
        if (count(B.g, res.out, 2) < 3 || res.order.length < 3) continue;
        if (!H.every((h) => same(run(h, B.g, B.lit).out, res.out))) continue;
        const diff = HYP.filter((h) => !same(run(h, B.g, B.lit).out, res.out)).length;
        if (diff < 14) continue;
        if (!r3 || diff > r3.diff) r3 = { B, res, diff };
        if (diff >= 30) break;
      }
      RM.need(r3);
      rows.push(r3);

      const spec = (g, lit) => ({ g: g.join(''), lit });
      const A = r3.res.out;
      const ans = spec(A, -1);
      /* candidates: results of refuted hypotheses, one-cell slips */
      const cands = [];
      const seen = new Set([ans.g]);
      HYP.forEach((h) => {
        const o = run(h, r3.B.g, r3.B.lit).out;
        const k = o.join('');
        if (seen.has(k) || !H.every((x) => x !== h)) return;
        seen.add(k);
        cands.push({ g: o, cause: h, kind: 'hyp' });
      });
      const slips = [];
      for (let i = 0; i < N * N; i++) {
        const o = A.slice();
        if (A[i] === 0 && r3.B.g[i] === 2) o[i] = 2;
        else if (A[i] === 0 && r3.B.g[i] === 3) o[i] = 3;
        else if (A[i] === 2 || A[i] === 3) o[i] = 0;
        else continue;
        slips.push({ g: o, kind: 'slip' });
      }
      const dist = (a, b) => { let n = 0; for (let i = 0; i < N * N; i++) if (a[i] !== b[i]) n++; return n; };
      let chosen = null;
      for (let t = 0; t < 60 && !chosen; t++) {
        const hy = rng.shuffle(cands).slice(0, rng.int(3, 5));
        const sl = rng.shuffle(slips).slice(0, 7 - hy.length);
        const pick = hy.concat(sl);
        const keys = new Set(pick.map((p) => p.g.join('')).concat([ans.g]));
        if (pick.length !== 7 || keys.size !== 8) continue;
        const all = pick.map((p) => p.g).concat([A]);
        const sums = all.map((a) => all.reduce((s, b) => s + dist(a, b), 0));
        if (sums[7] <= Math.min(...sums.slice(0, 7))) continue;
        chosen = pick;
      }
      RM.need(chosen);
      const flawOf = (p) => {
        const f = [];
        if (p.cause) {
          const c = p.cause;
          const why = [];
          if (c.r !== I.r) why.push(`range ${c.r} instead of ${I.r}`);
          if (c.crate !== I.crate) why.push(c.crate === 'pass' ? 'the blast passing through crates' : 'crates that are not destroyed');
          if (c.bomb !== I.bomb) why.push('bombs that do not explode (no chain reaction)');
          if (c.diag !== I.diag) why.push(c.diag ? 'diagonal blasts' : 'no diagonal blasts');
          f.push(`this is what you get with ${why.join(' and ')}, which the first two rows contradict`);
        }
        const d = [];
        for (let i = 0; i < N * N; i++) {
          if (p.g[i] === A[i]) continue;
          if (A[i] === 0 && p.g[i] === 2) d.push(`the crate at ${rc(i)} is destroyed by the blast`);
          else if (A[i] === 0 && p.g[i] === 3) d.push(`the bomb at ${rc(i)} is set off, so it must be gone`);
          else if (A[i] === 2) d.push(`the crate at ${rc(i)} is out of the blast's reach and must stay`);
          else if (A[i] === 3) d.push(`the bomb at ${rc(i)} is never reached and must stay`);
        }
        return f.concat(d.slice(0, 3));
      };
      const options = [{ spec: ans, flaws: [] }].concat(chosen.map((p) => ({ spec: spec(p.g, -1), flaws: flawOf(p) })));

      const render = (s) => {
        const pic = new RM.Pic();
        for (let i = 0; i <= N; i++) {
          RM.line(pic, X0 + i * CS, X0, X0 + i * CS, X0 + N * CS, { sw: 0.5, color: RM.LIGHT });
          RM.line(pic, X0, X0 + i * CS, X0 + N * CS, X0 + i * CS, { sw: 0.5, color: RM.LIGHT });
        }
        for (let i = 0; i < N * N; i++) {
          const t = +s.g[i];
          if (!t) continue;
          const x = X0 + (i % N) * CS, y = X0 + ((i / N) | 0) * CS;
          const cx = x + CS / 2, cy = y + CS / 2;
          if (t === 1) pic.add(`<rect x="${x + 0.5}" y="${y + 0.5}" width="${CS - 1}" height="${CS - 1}" fill="${RM.INK}"/>`);
          else if (t === 2) pic.add(`<rect x="${x + 1}" y="${y + 1}" width="${CS - 2}" height="${CS - 2}" fill="${pic.paint('lines:45:2.6:1.2')}" stroke="${RM.INK}" stroke-width="1.3"/>`);
          else {
            RM.circle(pic, cx, cy, 4, { fill: 'black', sw: 0.5 });
            if (i === s.lit) {
              RM.circle(pic, cx, cy, 5.6, { fill: 'none', sw: 1.2 });
              [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([dx, dy]) => RM.line(pic, cx + dx * 5.9, cy + dy * 5.9, cx + dx * 8, cy + dy * 8, { sw: 1.1 }));
            }
          }
        }
        return pic.svg();
      };

      const panels = [];
      for (let r = 0; r < 3; r++) {
        panels.push(spec(rows[r].B.g, -1), spec(rows[r].B.g, rows[r].B.lit));
        if (r < 2) panels.push(spec(rows[r].res.out, -1));
      }
      const destroyed = [];
      for (let i = 0; i < N * N; i++) if (r3.B.g[i] === 2 && A[i] === 0) destroyed.push(rc(i));
      const crateTxt = { stop: 'a crate stops the blast and is destroyed (only the first crate on a line)', pass: 'every crate within range is destroyed and the blast goes on through them', solid: 'a crate stops the blast but is not destroyed' }[I.crate];
      const bombTxt = { stop: 'a bomb reached by the blast explodes too (chain reaction) with the same range', ignore: 'bombs are not affected' }[I.bomb];
      const rules = [
        { k: 'Blast', t: `the lit bomb explodes: its blast spreads <b>${I.r} square${I.r > 1 ? 's' : ''}</b> at most ${I.diag ? 'in all <b>8</b> directions (also diagonally)' : 'up, down, left and right (no diagonals)'}.` },
        { k: 'Obstacles', t: `a <b>wall</b> stops the blast and is never damaged; ${crateTxt}; ${bombTxt}. Empty squares let it through.` },
        { k: 'Result', t: 'the third panel of each row shows the board after everything has exploded: destroyed crates and all exploded bombs are gone, walls and everything else stay. Rows 1 and 2 fix the range and the obstacle rules.' },
        { k: 'Answer', t: `row 3: the lit bomb (${rc(r3.B.lit)}) sets off ${r3.res.order.length - 1} other bomb${r3.res.order.length === 2 ? '' : 's'} (${r3.res.order.slice(1).map(rc).join('; ') || 'none'}); crates destroyed: ${destroyed.join('; ') || 'none'}. <b>Remove exactly those bombs and crates</b>.` },
      ];
      return {
        difficulty: 7,
        hint: 'rows 1 and 2 tell you how far the blast goes and what stops it; then follow the chain bomb by bomb.',
        panels,
        answer: ans,
        options,
        render,
        key: (s) => s.g + '.' + s.lit,
        rules,
      };
    },
  });
})();
