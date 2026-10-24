/* Minesweeper (grandmaster): every panel is a minesweeper board — mines are black discs, every other cell shows how many
 * of its 8 neighbours are mines (blank for 0); the digits are derived in every panel. Mines of column 3 are derived from
 * columns 1 and 2: variant 0/2: exactly one of the two boards has a mine there (XOR); variant 3: mine in column 1 and none
 * in column 2; variant 1: column 2 is column 1 shifted by a fixed vector (wrapping around), column 3 shifts again.
 * Hypotheses checked against rows 1–2: all 16 boolean functions of (col 1, col 2), all shifts (+ wrap / no wrap) for
 * both steps; every surviving hypothesis must predict the same mines in row 3. Distractors: digits counted with 4
 * neighbours, digits copied from a previous panel, other boolean rules, a digit off by one, a mine moved / missing. */
(function () {
  'use strict';
  const RM = window.RM;

  const bf = (T, a, b) => (T >> (a * 2 + b)) & 1;
  const same = (a, b) => a.join('') === b.join('');
  function digits(m, n, nb8) {
    return m.map((v, i) => {
      if (v) return -1;
      const r = (i / n) | 0, c = i % n;
      let s = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if ((!dr && !dc) || (!nb8 && dr && dc)) continue;
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && cc >= 0 && rr < n && cc < n && m[rr * n + cc]) s++;
      }
      return s;
    });
  }
  function shiftG(g, n, dr, dc, wrap) {
    const out = new Array(n * n).fill(0);
    g.forEach((v, i) => {
      if (!v) return;
      let r = ((i / n) | 0) + dr, c = (i % n) + dc;
      if (wrap) { r = (r + n * 4) % n; c = (c + n * 4) % n; }
      else if (r < 0 || c < 0 || r >= n || c >= n) return;
      out[r * n + c] = 1;
    });
    return out;
  }
  const VECS = [];
  for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) VECS.push([dr, dc]);

  RM.register({
    id: 'minesweeper',
    name: 'Minesweeper',
    difficulty: 7,
    generate(rng, variant) {
      const n = variant === 2 ? 6 : 5;
      const N = n * n;
      const mode = variant === 1 ? 'shift' : variant === 3 ? 'andnot' : 'xor';
      const T = mode === 'xor' ? 6 : 4;
      const vec = rng.pick(VECS.filter((v) => v[0] || v[1]));
      const rnd = (p) => RM.range(N).map(() => (rng.chance(p) ? 1 : 0));
      const cnt = (g) => g.reduce((s, v) => s + v, 0);
      const rows = [];
      for (let r = 0; r < 3; r++) {
        let row = null;
        for (let t = 0; t < 60 && !row; t++) {
          const A = rnd(mode === 'andnot' ? 0.42 : 0.3);
          const B = mode === 'shift' ? shiftG(A, n, vec[0], vec[1], true) : rnd(mode === 'andnot' ? 0.36 : 0.3);
          const C = mode === 'shift' ? shiftG(B, n, vec[0], vec[1], true) : A.map((a, i) => bf(T, a, B[i]));
          const ca = cnt(A), cc = cnt(C);
          const okC = mode === 'xor' ? cc >= 0.3 * N && cc <= 0.5 * N : mode === 'andnot' ? cc >= 0.16 * N && cc <= 0.32 * N : cc >= 0.2 * N && cc <= 0.4 * N;
          if (ca < 0.2 * N || ca > 0.36 * N || cnt(B) < 0.2 * N || cnt(B) > 0.36 * N || !okC) continue;
          if (mode !== 'shift') {
            const both = A.filter((a, i) => a && B[i]).length, onlyB = B.filter((b, i) => b && !A[i]).length, onlyA = A.filter((a, i) => a && !B[i]).length;
            if (both < 2 || onlyB < 2 || onlyA < 2) continue;
          }
          row = { A, B, C };
        }
        RM.need(row);
        rows.push(row);
      }
      const ans = rows[2].C;
      // ---- hypotheses
      const preds = new Set();
      for (let f = 0; f < 16; f++)
        if ([0, 1].every((r) => rows[r].A.every((a, i) => bf(f, a, rows[r].B[i]) === rows[r].C[i])))
          preds.add(rows[2].A.map((a, i) => bf(f, a, rows[2].B[i])).join(''));
      for (const wrap of [true, false])
        for (const w1 of VECS) {
          if (!rows.every((r) => same(shiftG(r.A, n, w1[0], w1[1], wrap), r.B))) continue;
          for (const w2 of VECS) if ([0, 1].every((r) => same(shiftG(rows[r].B, n, w2[0], w2[1], wrap), rows[r].C))) preds.add(shiftG(rows[2].B, n, w2[0], w2[1], wrap).join(''));
        }
      RM.need(preds.size === 1 && preds.has(ans.join('')));

      // ---- candidates
      const A3 = rows[2].A, B3 = rows[2].B;
      const D8 = (m) => digits(m, n, true);
      const spec = (m, d) => ({ n, m, d: d || D8(m) });
      const place = (i) => `line ${((i / n) | 0) + 1}, place ${(i % n) + 1}`;
      const mkd = (v) => (v ? 'a mine' : 'no mine');
      const reason = (i) => {
        if (mode === 'shift') {
          const r = (((i / n) | 0) - vec[0] + n * 4) % n, c = ((i % n) - vec[1] + n * 4) % n;
          return `the cell it comes from in column 2 (${place(r * n + c)}) holds ${mkd(B3[r * n + c])}`;
        }
        return `column 1 has ${mkd(A3[i])} there and column 2 has ${mkd(B3[i])}`;
      };
      const ruleWord = mode === 'xor' ? 'a cell is a mine only if exactly one of the two boards has a mine there' : mode === 'andnot' ? 'a cell is a mine only if board 1 has a mine and board 2 has none' : 'the mines of column 2 move once more';
      const dAns = D8(ans);
      const flawText = (m, d, lead) => {
        const out = [lead];
        const md = m.map((v, i) => (v !== ans[i] ? i : -1)).filter((i) => i >= 0);
        if (md.length) {
          out.push(md.slice(0, 2).map((i) => `${place(i)} must be ${ans[i] ? 'a mine' : 'safe'} (${reason(i)}), but here it is ${m[i] ? 'a mine' : 'safe'}.`).join(' '));
          return out.join(' ');
        }
        const dd = d.map((v, i) => (v !== dAns[i] ? i : -1)).filter((i) => i >= 0);
        out.push(dd.slice(0, 2).map((i) => `${place(i)} touches ${dAns[i]} mine${dAns[i] === 1 ? '' : 's'}, not ${d[i]}.`).join(' ') + (dd.length > 2 ? ` (and ${dd.length - 2} more wrong)` : ''));
        return out.join(' ');
      };
      const groups = { digit: [], rule: [], mine: [], off: [] };
      const addC = (g, m, d, lead) => {
        const k = m.join('') + '|' + d.join(',');
        if (k === ans.join('') + '|' + dAns.join(',')) return;
        groups[g].push({ m, d, k, flaws: [flawText(m, d, lead)] });
      };
      addC('digit', ans, digits(ans, n, false), 'The digits count only the 4 orthogonal neighbours, but diagonal mines count too.');
      {
        const dB = D8(B3);
        addC('digit', ans, dAns.map((v, i) => (v >= 0 && dB[i] >= 0 ? dB[i] : v)), 'The digits are copied from column 2 instead of being recomputed for the new mines.');
      }
      for (let f = 0; f < 16; f++) {
        if (f === T) continue;
        const m = A3.map((a, i) => bf(f, a, B3[i]));
        addC('rule', m, D8(m), `Wrong mines: ${ruleWord}.`);
      }
      const safe = RM.range(N).filter((i) => !ans[i]), mines = RM.range(N).filter((i) => ans[i]);
      const cw = (a, b) => (a === b ? 0 : a < 0 || b < 0 ? 6 : a === 0 || b === 0 ? 3 : 1.3);
      const vdist = (d1, d2) => d1.reduce((x, v, i) => x + cw(v, d2[i]), 0);
      for (let t = 0; t < 14; t++) {
        const d = dAns.slice();
        let w = 0;
        for (let g = 0; g < 5 && w < 3; g++) {
          const i = rng.pick(safe);
          if (d[i] !== dAns[i]) continue;
          d[i] = dAns[i] === 0 ? 1 : dAns[i] === 1 ? (rng.chance(0.6) ? 0 : 2) : dAns[i] + (rng.chance(0.5) ? 1 : -1);
          w = vdist(d, dAns);
        }
        addC('off', ans, d, vdist(d, dAns) > 0 && d.filter((v, i) => v !== dAns[i]).length > 1 ? 'Several digits are wrong.' : 'One digit is wrong.');
      }
      for (let t = 0; t < 10; t++) {
        const m = ans.slice();
        const i = rng.pick(mines);
        m[i] = 0;
        if (t % 2) {
          const nb = safe.filter((j) => Math.abs(((j / n) | 0) - ((i / n) | 0)) <= 1 && Math.abs((j % n) - (i % n)) <= 1);
          if (!nb.length) continue;
          m[rng.pick(nb)] = 1;
        } else if (rng.chance(0.5)) m[rng.pick(safe)] = 1;
        addC('mine', m, D8(m), 'The mine pattern is slightly off (the digits fit the mines drawn, but not the rule).');
      }
      const pickRand = (g, k) => rng.sample(groups[g], Math.min(k, groups[g].length));
      const order = [].concat(groups.digit.slice(0, 2), pickRand('rule', 2), pickRand('off', 2), pickRand('mine', 1));
      for (const g of ['rule', 'off', 'mine']) order.push(...rng.shuffle(groups[g]));
      const chosen = [];
      for (const c of order) if (chosen.length < 7 && vdist(c.d, dAns) >= 3 && chosen.every((o) => vdist(o.d, c.d) >= 3)) chosen.push(c);
      RM.need(chosen.length === 7);

      // ---- rules
      const sym = (v) => (v < 0 ? '●' : v === 0 ? '·' : String(v));
      const lines = RM.range(n).map((r) => dAns.slice(r * n, r * n + n).map(sym).join(' ')).join(' / ');
      const mineList = mines.map(place).join('; ');
      let ex = '';
      if (mode !== 'shift') {
        for (const r of [0, 1]) for (let i = 0; i < N && !ex; i++) if (rows[r].A[i] && rows[r].B[i]) ex = ` (for example row ${r + 1}, ${place(i)}: a mine on both boards leaves no mine)`;
      }
      const mineRule = {
        xor: { k: 'Mines', t: `the mines of column 3 are the cells where <b>exactly one</b> of the two boards (columns 1 and 2) has a mine; a mine on both boards cancels out${ex}.` },
        andnot: { k: 'Mines', t: `the mines of column 3 are the mines of column 1 that are <b>not</b> also mines in column 2 (a mine of column 2 removes the mine of column 1; mines of column 2 alone do not count)${ex}.` },
        shift: { k: 'Mines', t: `column 2 is column 1 with every mine moved by <b>${Math.abs(vec[0])} line${Math.abs(vec[0]) === 1 ? '' : 's'} ${vec[0] < 0 ? 'up' : 'down'}</b> and <b>${Math.abs(vec[1])} place${Math.abs(vec[1]) === 1 ? '' : 's'} ${vec[1] < 0 ? 'left' : 'right'}</b> (a mine leaving the board on one side re-enters on the opposite side); column 3 moves the mines of column 2 by the same amount again.` },
      }[mode];
      const rules = [
        { k: 'Digits', t: 'a cell without a mine shows the number of mines among its <b>8 neighbours</b> (diagonals included); 0 is left blank. The digits of every panel follow from its mines.' },
        mineRule,
        { k: 'Row 3', t: `the mines of the missing board: ${mineList}.` },
        { k: 'Answer', t: `the board, line by line (● mine, · zero): <b>${lines}</b>.` },
      ];

      const panels = [];
      for (let r = 0; r < 3; r++) {
        panels.push(spec(rows[r].A), spec(rows[r].B));
        if (r < 2) panels.push(spec(rows[r].C));
      }
      const render = (s) => {
        const pic = new RM.Pic();
        const k = s.n, x0 = 8, cs = 84 / k;
        for (let i = 0; i <= k; i++) {
          const edge = i === 0 || i === k;
          RM.line(pic, x0, x0 + i * cs, x0 + 84, x0 + i * cs, { sw: edge ? 1.8 : 1, color: edge ? RM.INK : RM.LIGHT, cap: 'butt' });
          RM.line(pic, x0 + i * cs, x0, x0 + i * cs, x0 + 84, { sw: edge ? 1.8 : 1, color: edge ? RM.INK : RM.LIGHT, cap: 'butt' });
        }
        s.d.forEach((v, i) => {
          const cx = x0 + ((i % k) + 0.5) * cs, cy = x0 + (((i / k) | 0) + 0.5) * cs;
          if (v < 0) RM.circle(pic, cx, cy, cs * 0.33, { fill: 'black', sw: 1 });
          else if (v > 0) pic.add(`<text x="${RM.fmt(cx)}" y="${RM.fmt(cy + cs * 0.22)}" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${RM.fmt(cs * 0.62)}" fill="${RM.DARK}" text-anchor="middle">${v}</text>`);
        });
        return pic.svg();
      };
      return {
        difficulty: variant === 1 ? 8 : 7,
        hint: 'first find where the mines of the last board are — only then count.',
        panels,
        answer: spec(ans),
        options: [{ spec: spec(ans), flaws: [] }].concat(chosen.map((c) => ({ spec: spec(c.m, c.d), flaws: c.flaws }))),
        render,
        key: (s) => s.m.join('') + '|' + s.d.join(','),
        rules,
      };
    },
  });
})();
