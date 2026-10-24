/* Reversi (grandmaster): each row is [position, the new disc alone on an empty board (ringed), position after the move].
 * From the new disc, in each of the 8 directions, a run of one or more opponent discs directly next to it that is
 * closed by a disc of the mover's colour flips; runs that end at an empty square or the edge do not flip, whatever
 * their length. Rows 1-2 show diagonal flips, long runs and unclosed lines; the generator simulates 54 readings
 * (4 / 8 / diagonal-only directions, closed by mover's disc / disc or edge / no closing needed, whole run / first disc /
 * runs of one only, all lines / longest line only) against rows 1-2 and demands that every reading that fits predicts
 * the answer. The 8 options are the 8 subsets of three independent mistakes (a cube): an omitted flip, an extra flip of
 * an unclosed line, and a placement slip. */
(function () {
  'use strict';
  const RM = window.RM;
  /* directions clockwise from up; odd indices are diagonals */
  const D8 = [[-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1]];
  const DN = ['up', 'up-right', 'right', 'down-right', 'down', 'down-left', 'left', 'up-left'];
  const SIZES = [6, 6, 7, 6];
  const CN = { 1: 'black', 2: 'white' };

  /* runs of opponent discs from (r,c) in every direction: { d, cells, end: 'mine' | 'empty' | 'edge', endCell } */
  function lines(b, n, r, c, col) {
    const out = [];
    for (let d = 0; d < 8; d++) {
      const cells = [];
      let y = r + D8[d][0];
      let x = c + D8[d][1];
      while (y >= 0 && y < n && x >= 0 && x < n && b[y * n + x] === 3 - col) {
        cells.push(y * n + x);
        y += D8[d][0];
        x += D8[d][1];
      }
      let end = 'edge';
      let endCell = -1;
      if (y >= 0 && y < n && x >= 0 && x < n) {
        endCell = y * n + x;
        end = b[endCell] === col ? 'mine' : 'empty';
      }
      out.push({ d, cells, end, endCell });
    }
    return out;
  }
  /* cells flipped under a reading H */
  function flipsOf(H, L) {
    let ls = L.filter((l) => l.cells.length && (H.dirs === 'all' || (H.dirs === 'orth' ? l.d % 2 === 0 : l.d % 2 === 1)));
    ls = ls.filter((l) => (H.close === 'mine' ? l.end === 'mine' : H.close === 'edge' ? l.end !== 'empty' : true));
    if (H.len === 'single') ls = ls.filter((l) => l.cells.length === 1);
    if (H.lines === 'longest' && ls.length) {
      const m = Math.max(...ls.map((l) => l.cells.length));
      ls = ls.filter((l) => l.cells.length === m);
    }
    const out = [];
    ls.forEach((l) => (H.len === 'first' ? out.push(l.cells[0]) : l.cells.forEach((x) => out.push(x))));
    return out;
  }
  const boardAfter = (b, at, col, flips) => {
    const x = b.slice();
    x[at] = col;
    flips.forEach((f) => (x[f] = col));
    return x;
  };
  const HS = [];
  ['all', 'orth', 'diag'].forEach((dirs) => ['mine', 'edge', 'none'].forEach((close) => ['all', 'first', 'single'].forEach((len) => ['all', 'longest'].forEach((ln) => HS.push({ dirs, close, len, lines: ln })))));
  const H0 = { dirs: 'all', close: 'mine', len: 'all', lines: 'all' };

  RM.register({
    id: 'reversi',
    name: 'Reversi',
    difficulty: 8,
    generate(rng, variant) {
      const n = SIZES[variant % 4];
      const N2 = n * n;
      const nm = (i) => `r${((i / n) | 0) + 1}c${(i % n) + 1}`;
      const names = (a) => a.map(nm).join(', ');
      const dirsOf = (ls) => ls.filter((l) => l.cells.length);

      /* one row: a position, a move, its result; with requirements on what it shows */
      const genRow = (col, req) => {
        for (let t = 0; t < 700; t++) {
          const b = RM.range(N2).map(() => {
            const u = rng.next();
            return u < 0.38 ? 0 : u < 0.69 ? 1 : 2;
          });
          const cnt = b.filter((x) => x).length;
          if (cnt < Math.round(N2 * 0.5) || cnt > Math.round(N2 * 0.68)) continue;
          const empt = RM.range(N2).filter((i) => !b[i]);
          const at = rng.pick(empt);
          const L = lines(b, n, (at / n) | 0, at % n, col);
          const F = L.filter((l) => l.cells.length && l.end === 'mine');
          const U = L.filter((l) => l.cells.length && l.end !== 'mine');
          if (F.length < 2 || !U.length) continue;
          const tot = F.reduce((a, l) => a + l.cells.length, 0);
          if (tot < 3 || tot > 8) continue;
          if (req.diag && !F.some((l) => l.d % 2)) continue;
          if (req.orth && !F.some((l) => l.d % 2 === 0)) continue;
          if (req.long && !F.some((l) => l.cells.length >= 2)) continue;
          if (req.uneven && new Set(F.map((l) => l.cells.length)).size < 2) continue;
          if (req.diagU && !U.some((l) => l.d % 2)) continue;
          const flips = flipsOf(H0, L);
          return { b, at, col, L, F, U, c: boardAfter(b, at, col, flips) };
        }
        throw RM.RETRY;
      };
      const c1 = rng.pick([1, 2]);
      const rows = [
        genRow(c1, { diag: true, orth: true, diagU: true }),
        genRow(3 - c1, { long: true, orth: true, uneven: true }),
        genRow(rng.pick([1, 2]), { diag: true, long: true, uneven: true, diagU: rng.chance(0.5) }),
      ];
      rows.forEach((r) => RM.need(r.c.join() !== r.b.join()));
      RM.need(new Set(rows.map((r) => r.b.join())).size === 3);
      const R3 = rows[2];
      const ans = R3.c;

      /* identifiability */
      let intended = false;
      for (const h of HS) {
        if (!rows.slice(0, 2).every((r) => boardAfter(r.b, r.at, r.col, flipsOf(h, r.L)).join() === r.c.join())) continue;
        if (h.dirs === 'all' && h.close === 'mine' && h.len === 'all' && h.lines === 'all') intended = true;
        RM.need(boardAfter(R3.b, R3.at, R3.col, flipsOf(h, R3.L)).join() === ans.join());
      }
      RM.need(intended);

      /* the three-mistake cube */
      const col = R3.col;
      const oc = 3 - col;
      const cn = CN[col];
      const F = R3.F;
      const U = R3.U;
      const real = R3.at;
      const endTxt = (l) => (l.end === 'empty' ? `ends at the empty square ${nm(l.endCell)}` : 'runs to the edge of the board');
      const ops = [];
      F.forEach((l) => {
        ops.push({ g: 'omit', ln: [l.d], flips: (s) => l.cells.forEach((x) => s.f.delete(x)), tx: `the ${DN[l.d]} line (${names(l.cells)}) is closed by a ${cn} disc at ${nm(l.endCell)}, so it must flip, but here it does not` });
        if (l.cells.length >= 2)
          ops.push({ g: 'omit', ln: [l.d], flips: (s) => l.cells.slice(1).forEach((x) => s.f.delete(x)), tx: `only the first disc of the ${DN[l.d]} line (${names(l.cells)}) flipped; the whole run up to the ${cn} disc at ${nm(l.endCell)} flips` });
      });
      const diagF = F.filter((l) => l.d % 2);
      if (diagF.length >= 2 && F.some((l) => l.d % 2 === 0))
        ops.push({ g: 'omit', ln: diagF.map((l) => l.d), flips: (s) => diagF.forEach((l) => l.cells.forEach((x) => s.f.delete(x))), tx: `the diagonal lines (${diagF.map((l) => DN[l.d]).join(', ')}) did not flip, but diagonals count like rows and columns` });
      U.forEach((l) => {
        ops.push({ g: 'over', ln: [l.d], flips: (s) => l.cells.forEach((x) => s.f.add(x)), tx: `the ${DN[l.d]} line (${names(l.cells)}) next to the new disc ${endTxt(l)}, with no ${cn} disc closing it, so it must not flip, but here it flipped` });
        if (l.cells.length >= 2)
          ops.push({ g: 'over', ln: [l.d], flips: (s) => s.f.add(l.cells[0]), tx: `the first disc of the ${DN[l.d]} line (${names(l.cells)}) flipped, but that line ${endTxt(l)} and is not closed by a ${cn} disc` });
      });
      if (U.length >= 2)
        ops.push({ g: 'over', ln: U.map((l) => l.d), flips: (s) => U.forEach((l) => s.f.add(l.cells[0])), tx: `the neighbouring ${CN[oc]} discs of the unclosed lines (${U.map((l) => DN[l.d]).join(', ')}) flipped too; only closed lines flip` });
      const stray = RM.range(N2).filter((i) => ans[i] === oc && R3.b[i] === oc && !R3.L.some((l) => l.cells.includes(i)) && !R3.L.some((l) => l.endCell === i)).filter((i) => {
        const dy = ((i / n) | 0) - ((real / n) | 0);
        const dx = (i % n) - (real % n);
        return !(dy === 0 || dx === 0 || Math.abs(dy) === Math.abs(dx));
      });
      if (stray.length) {
        const i = rng.pick(stray);
        ops.push({ g: 'place', ln: [], flips: (s) => s.f.add(i), tx: `the ${CN[oc]} disc at ${nm(i)} is not on a straight line with the new disc, so it cannot flip` });
      }
      const nb = RM.range(8).map((d) => [((real / n) | 0) + D8[d][0], (real % n) + D8[d][1]]).filter((q) => q[0] >= 0 && q[0] < n && q[1] >= 0 && q[1] < n).map((q) => q[0] * n + q[1]).filter((i) => !R3.b[i]);
      if (nb.length) {
        const e = rng.pick(nb);
        ops.push({ g: 'new', ln: [], newAt: e, tx: `the new disc is at ${nm(e)}, but the ring in panel 2 marks ${nm(real)}` });
      }
      ops.push({ g: 'new', ln: [], newCol: oc, tx: `the new disc is ${CN[oc]}, but the ring in panel 2 marks a ${cn} disc: the mover is ${cn}` });
      const apply = (set) => {
        const s = { f: new Set(flipsOf(H0, R3.L)), at: real, col };
        set.forEach((o) => {
          if (o.flips) o.flips(s);
          if (o.newAt !== undefined) s.at = o.newAt;
          if (o.newCol !== undefined) s.col = o.newCol;
        });
        // flips keep the mover's colour; a wrongly coloured new disc only changes itself
        const x = R3.b.slice();
        s.f.forEach((i) => (x[i] = col));
        x[s.at] = s.col;
        return x;
      };
      let chosen = null;
      const om = ops.filter((o) => o.g === 'omit');
      const ov = ops.filter((o) => o.g === 'over');
      RM.need(om.length && ov.length && ops.length >= 4);
      const tryTri = (pool) => {
        for (let t = 0; t < 60; t++) {
          const a = rng.pick(om);
          const b = rng.pick(ov);
          const rest = pool.filter((o) => o !== a && o !== b);
          if (!rest.length) return null;
          const tri = [a, b, rng.pick(rest)];
          if (tri.filter((o) => o.g === 'new').length > 1) continue;
          const used = [].concat(...tri.map((o) => o.ln));
          if (new Set(used).size !== used.length) continue;
          const subs = RM.range(8).map((m) => tri.filter((_, i) => m & (1 << i)));
          const boards = subs.map(apply);
          if (new Set(boards.map((x) => x.join())).size < 8) continue;
          if (boards.some((x, i) => i && x.join() === ans.join())) continue;
          if (boards[0].join() !== ans.join()) continue;
          return subs.map((sb, i) => ({ b: boards[i], flaws: sb.map((o) => o.tx) }));
        }
        return null;
      };
      chosen = tryTri(om.concat(ov)) || tryTri(ops);
      RM.need(chosen);

      /* drawing */
      const u = 88 / n;
      const render = (sp) => {
        const pic = new RM.Pic();
        for (let i = 1; i < n; i++) {
          RM.line(pic, 6 + u * i, 6, 6 + u * i, 94, { sw: 0.9, color: RM.LIGHT, cap: 'butt' });
          RM.line(pic, 6, 6 + u * i, 94, 6 + u * i, { sw: 0.9, color: RM.LIGHT, cap: 'butt' });
        }
        pic.add(`<rect x="6" y="6" width="88" height="88" fill="none" stroke="${RM.INK}" stroke-width="2"/>`);
        const disc = (i, cc) => {
          const x = 6 + u * ((i % n) + 0.5);
          const y = 6 + u * (((i / n) | 0) + 0.5);
          RM.circle(pic, x, y, u * 0.38, { fill: cc === 1 ? 'black' : 'white', sw: 1.6 });
          return [x, y];
        };
        if (sp.t === 'm') {
          const [x, y] = disc(sp.at, sp.col);
          RM.circle(pic, x, y, u * 0.38 + 2.8, { fill: 'none', sw: 1.7 });
        } else sp.b.forEach((v, i) => v && disc(i, v));
        return pic.svg();
      };
      const key = (sp) => (sp.t === 'm' ? `m${sp.at}.${sp.col}` : 'p' + sp.b.join(''));

      /* correction */
      const trace = dirsOf(R3.L)
        .map((l) => {
          const nn = l.cells.length;
          const endW = l.end === 'mine' ? `a ${cn} disc at ${nm(l.endCell)}` : l.end === 'empty' ? `an empty square (${nm(l.endCell)})` : 'the edge of the board';
          return `${DN[l.d]}: ${nn} ${CN[oc]} disc${nn > 1 ? 's' : ''} (${names(l.cells)}), then ${endW} → ${l.end === 'mine' ? '<b>flips</b>' : 'no flip'}`;
        })
        .join('; ');
      const ev1 = rows[0].F.find((l) => l.d % 2) || rows[0].F[0];
      const evU = rows[0].U[0] ? [0, rows[0]] : [1, rows[1]];
      const ul = evU[1].U[0];
      const evTxt = `Row 1: the ${DN[ev1.d]} run ${names(ev1.cells)} flips; ${evU[0] === 0 ? '' : 'row 2:'} the ${DN[ul.d]} run ${names(ul.cells)} ${ul.end === 'empty' ? 'ends at an empty square' : 'runs to the edge'} and stays.`;
      const flipList = F.reduce((a, l) => a.concat(l.cells), []);
      const rules = [
        { k: 'Move', t: `each row: panel 1 is a position, panel 2 shows <b>where the new disc goes</b> (ringed; its colour is the mover's), panel 3 is the position after the move. Squares are named by row and column from the top left (r3c4 = row 3, column 4).` },
        {
          k: 'Flipping',
          t: `from the new disc look in <b>all 8 directions</b> (rows, columns and diagonals). Directly next to it, a run of one or more opposite-coloured discs that is <b>closed at its far end by a disc of the mover's colour</b> flips completely. A run that ends at an empty square or at the edge does <b>not</b> flip, however long it is. ${evTxt}`,
        },
        { k: 'Row 3', t: `the new <b>${cn}</b> disc goes on ${nm(real)}. ${trace}.` },
        { k: 'Answer', t: `the new disc plus the flipped discs <b>${names(flipList)}</b> become ${cn}; everything else stays as in panel 1.` },
      ];
      const mv = (r) => ({ t: 'm', at: r.at, col: r.col });
      const pos = (b) => ({ t: 'p', b });
      const panels = [];
      rows.forEach((r, i) => {
        panels.push(pos(r.b), mv(r));
        if (i < 2) panels.push(pos(r.c));
      });
      return {
        difficulty: 8,
        hint: 'look along every straight line from the new disc, and ask what stands at the far end of each run.',
        panels,
        answer: pos(ans),
        options: chosen.map((o, i) => ({ spec: pos(o.b), flaws: o.flaws })),
        render,
        key,
        rules,
      };
    },
  });
})();
