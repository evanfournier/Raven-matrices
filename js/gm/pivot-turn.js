/* Pivot turn (grandmaster): on a faint 8×8 lattice each row shows an asymmetric polyomino and a small ring on a
 * lattice point (the pivot, different in every row, often outside the figure). Column 2 = the figure turned a
 * quarter turn about the ring (clockwise, or anticlockwise in variants 1 and 3); column 3 = the figure of column 2
 * turned the same way about the same ring again. Hypotheses checked against rows 1–2: all 8 turns/flips of the
 * dihedral group, each about the ring / the figure's own centre / the centre of the frame; all consistent ones must
 * give the same row 3. Distractors: other turns and mirror images, other centres, pivot one lattice step away,
 * the ring of another row. */
(function () {
  'use strict';
  const RM = window.RM;
  const G = 8;
  const U = 11;
  const O0 = 6;

  const TR = {
    id: (dx, dy) => [dx, dy],
    r90: (dx, dy) => [-dy, dx],
    r180: (dx, dy) => [-dx, -dy],
    r270: (dx, dy) => [dy, -dx],
    fh: (dx, dy) => [-dx, dy],
    fv: (dx, dy) => [dx, -dy],
    tr: (dx, dy) => [dy, dx],
    at: (dx, dy) => [-dy, -dx],
  };
  const TK = Object.keys(TR);
  /* cells are [x, y] (column, row); centre c = [cx, cy] in lattice units; null if the image is off the lattice */
  function turn(cells, c, k) {
    const out = [];
    for (const [x, y] of cells) {
      const [ex, ey] = TR[k](x + 0.5 - c[0], y + 0.5 - c[1]);
      const nx = c[0] + ex - 0.5;
      const ny = c[1] + ey - 0.5;
      if (Math.abs(nx - Math.round(nx)) > 1e-9 || Math.abs(ny - Math.round(ny)) > 1e-9) return null;
      out.push([Math.round(nx), Math.round(ny)]);
    }
    return out;
  }
  const inGrid = (c) => !!c && c.every(([x, y]) => x >= 0 && y >= 0 && x < G && y < G);
  const skey = (c) => c.map((p) => p[0] * 16 + p[1]).sort((a, b) => a - b).join(',');
  const own = (c) => {
    const xs = c.map((p) => p[0]);
    const ys = c.map((p) => p[1]);
    return [(Math.min(...xs) + Math.max(...xs) + 1) / 2, (Math.min(...ys) + Math.max(...ys) + 1) / 2];
  };
  const norm = (c) => {
    const mx = Math.min(...c.map((p) => p[0]));
    const my = Math.min(...c.map((p) => p[1]));
    return skey(c.map(([x, y]) => [x - mx, y - my]));
  };

  function polyomino(rng, n) {
    for (let t = 0; t < 60; t++) {
      const cells = [[0, 0]];
      let guard = 0;
      while (cells.length < n && guard++ < 60) {
        const [x, y] = rng.pick(cells);
        const [dx, dy] = rng.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
        if (!cells.some((p) => p[0] === x + dx && p[1] === y + dy)) cells.push([x + dx, y + dy]);
      }
      if (cells.length < n) continue;
      const xs = cells.map((p) => p[0]);
      const ys = cells.map((p) => p[1]);
      const w = Math.max(...xs) - Math.min(...xs) + 1;
      const h = Math.max(...ys) - Math.min(...ys) + 1;
      if (Math.max(w, h) > 4 || Math.min(w, h) < 2) continue;
      const ks = new Set(TK.map((k) => norm(turn(cells, [0, 0], k))));
      if (ks.size === 8) return cells;
    }
    throw RM.RETRY;
  }

  const CFG = [
    { step: 'r90', n: 5, diff: 7 },
    { step: 'r270', n: 5, diff: 7 },
    { step: 'r90', n: 6, diff: 8 },
    { step: 'r270', n: 6, diff: 8 },
  ];

  RM.register({
    id: 'pivot-turn',
    name: 'Pivot turn',
    difficulty: 7,
    generate(rng, variant) {
      const cfg = CFG[variant % 4];
      const T = cfg.step;
      const cw = T === 'r90';
      const F = [];
      const P = [];
      for (let r = 0; r < 3; r++) {
        let done = false;
        for (let t = 0; t < 150 && !done; t++) {
          const shape = polyomino(rng, cfg.n);
          const piv = [rng.int(0, G), rng.int(0, G)];
          const dx = rng.int(0, G - 1);
          const dy = rng.int(0, G - 1);
          const f0 = shape.map(([x, y]) => [x + dx, y + dy]);
          if (!inGrid(f0)) continue;
          const xs0 = f0.map((q) => q[0]);
          const ys0 = f0.map((q) => q[1]);
          const out = piv[0] < Math.min(...xs0) || piv[0] > Math.max(...xs0) + 1 || piv[1] < Math.min(...ys0) || piv[1] > Math.max(...ys0) + 1;
          if (!out && t < 110) continue;
          const f1 = turn(f0, piv, T);
          const f2 = f1 && turn(f1, piv, T);
          if (!inGrid(f1) || !inGrid(f2)) continue;
          const k0 = skey(f0);
          const k1 = skey(f1);
          const k2 = skey(f2);
          if (k0 === k1 || k1 === k2 || k0 === k2) continue;
          if (new Set(f0.map((p) => p.join())).size !== cfg.n) continue;
          // the three pictures must clearly differ (at least 3 cells each)
          const d = (a, b) => a.split(',').filter((v) => !b.split(',').includes(v)).length;
          if (d(k0, k1) < 3 || d(k1, k2) < 3 || d(k0, k2) < 3) continue;
          F.push([f0, f1, f2]);
          P.push(piv);
          done = true;
        }
        RM.need(done);
      }
      // pivots of the three rows differ; at least two rows have the ring outside the figure's bounding box
      RM.need(new Set(P.map((p) => p.join())).size === 3);
      const outside = F.filter((f, r) => {
        const xs = f[0].map((p) => p[0]);
        const ys = f[0].map((p) => p[1]);
        return P[r][0] < Math.min(...xs) || P[r][0] > Math.max(...xs) + 1 || P[r][1] < Math.min(...ys) || P[r][1] > Math.max(...ys) + 1;
      }).length;
      RM.need(outside >= 2);

      /* identifiability: every (turn/flip × centre) fitting rows 1–2 gives the same row 3 */
      const cen = { ring: (r, c) => P[r], own: (r, c) => own(c), frame: () => [G / 2, G / 2] };
      let fit = 0;
      for (const k of TK)
        for (const cn of Object.keys(cen)) {
          let ok = true;
          for (let r = 0; r < 2 && ok; r++) {
            const a = turn(F[r][0], cen[cn](r, F[r][0]), k);
            const b = a && turn(a, cen[cn](r, a), k);
            ok = !!a && !!b && skey(a) === skey(F[r][1]) && skey(b) === skey(F[r][2]);
          }
          if (!ok) continue;
          fit++;
          const a = turn(F[2][0], cen[cn](2, F[2][0]), k);
          const b = a && turn(a, cen[cn](2, a), k);
          RM.need(!!b && skey(b) === skey(F[2][2]));
        }
      RM.need(fit >= 1);

      /* distractors */
      const pv = P[2];
      const f1 = F[2][1];
      const truth = F[2][2];
      const tk = skey(truth);
      const cands = [];
      const add = (grp, cells, flaw) => {
        if (inGrid(cells) && skey(cells) !== tk) cands.push({ grp, cells, flaw });
      };
      const other = cw ? 'r270' : 'r90';
      const dirw = cw ? 'clockwise' : 'anticlockwise';
      const dirw2 = cw ? 'anticlockwise' : 'clockwise';
      add('id', f1, 'the figure was not turned at all: this is the figure of the previous panel again');
      add('opp', turn(f1, pv, other), `the figure was turned the wrong way (${dirw2}): that gives back the figure of column 1, not the next quarter turn ${dirw}`);
      add('half', turn(f1, pv, 'r180'), 'the figure was turned by a half turn instead of a quarter turn');
      add('mirror', turn(f1, pv, 'fh'), 'this is a mirror image (left–right through the ring), not a turn: the figure itself is never mirrored');
      add('mirror', turn(f1, pv, 'fv'), 'this is a mirror image (top–bottom through the ring), not a turn: the figure itself is never mirrored');
      add('diag', turn(f1, pv, 'tr'), 'this is a mirror image (along a diagonal through the ring), not a turn');
      add('diag', turn(f1, pv, 'at'), 'this is a mirror image (along a diagonal through the ring), not a turn');
      const oc = own(f1);
      add('own', turn(f1, oc, T), 'the figure was turned about its own centre instead of about the ring');
      add('panel', turn(f1, [G / 2, G / 2], T), 'the figure was turned about the centre of the frame instead of about the ring');
      [[-1, 0, 'one step to the left'], [1, 0, 'one step to the right'], [0, -1, 'one step up'], [0, 1, 'one step down']].forEach(([dx, dy, w]) =>
        add('shift', turn(f1, [pv[0] + dx, pv[1] + dy], T), `the figure was turned about a point ${w} of the ring: the centre of the turn must be exactly the ring`)
      );
      [0, 1].forEach((r) => add('other', turn(f1, P[r], T), `the figure was turned about the ring of row ${r + 1} instead of the ring of its own row`));
      add('first', turn(F[2][0], pv, T), 'the figure was turned only once from column 1: this is the figure of column 2 again, a second turn is needed');
      const seen = new Set();
      const uniq = rng.shuffle(cands).filter((c) => (seen.has(skey(c.cells)) ? false : (seen.add(skey(c.cells)), true)));
      const order = ['shift', 'shift', 'opp', 'half', 'mirror', 'own', 'panel', 'other', 'diag', 'id', 'first'];
      const chosen = [];
      order.forEach((g) => {
        if (chosen.length >= 7) return;
        const c = uniq.find((x) => x.grp === g && !chosen.includes(x));
        if (c) chosen.push(c);
      });
      uniq.forEach((c) => {
        if (chosen.length < 7 && !chosen.includes(c)) chosen.push(c);
      });
      RM.need(chosen.length === 7);
      const S = (cells) => ({ c: cells.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), p: pv });
      const options = [{ spec: S(truth), flaws: [] }].concat(chosen.map((c) => ({ spec: S(c.cells), flaws: [c.flaw] })));

      const render = (s) => {
        const pic = new RM.Pic();
        for (let i = 0; i <= G; i++) {
          RM.line(pic, O0 + i * U, O0, O0 + i * U, O0 + G * U, { sw: 0.7, color: RM.LIGHT });
          RM.line(pic, O0, O0 + i * U, O0 + G * U, O0 + i * U, { sw: 0.7, color: RM.LIGHT });
        }
        for (const [x, y] of s.c) pic.add(`<rect x="${O0 + x * U + 0.5}" y="${O0 + y * U + 0.5}" width="${U - 1}" height="${U - 1}" fill="${RM.INK}"/>`);
        RM.circle(pic, O0 + s.p[0] * U, O0 + s.p[1] * U, 3.6, { fill: 'white', stroke: RM.INK, sw: 2 });
        return pic.svg();
      };
      const key = (s) => skey(s.c) + '|' + s.p.join();

      /* explanation */
      const cellName = ([x, y]) => `row ${y + 1}, column ${x + 1}`;
      const pcell = f1.slice().sort((a, b) => a[1] - b[1] || a[0] - b[0])[0];
      const dxy = [pcell[0] + 0.5 - pv[0], pcell[1] + 0.5 - pv[1]];
      const nxy = TR[T](dxy[0], dxy[1]);
      const nc = [Math.round(pv[0] + nxy[0] - 0.5), Math.round(pv[1] + nxy[1] - 0.5)];
      const where = (d) => {
        const hx = d[0];
        const hy = d[1];
        return `${Math.abs(hx)} to the ${hx < 0 ? 'left' : 'right'} and ${Math.abs(hy)} ${hy < 0 ? 'above' : 'below'} the ring (measured between the ring and the middle of the cell)`;
      };
      const rules = [
        {
          k: 'Pivot',
          t: `on the faint lattice each row shows a figure made of black cells and a <b>ring</b> on a lattice point; the ring is the <b>pivot</b> and is different in every row (it can lie outside the figure).`,
        },
        {
          k: 'The turn',
          t: `going from one panel to the next the whole figure is turned a <b>quarter turn ${dirw}</b> about the ring (not about its own centre or the centre of the frame, and never mirrored). Column 2 is column 1 turned once, column 3 is column 2 turned once more — in total a half turn of column 1 about the ring. A cell ${where(dxy)} ends ${where(nxy).replace(' (measured between the ring and the middle of the cell)', '')} after one turn.`,
        },
        {
          k: 'Row 3',
          t: `panel 8 is the figure of panel 7 turned another quarter turn ${dirw} about the ring of row 3 (same as turning the figure of panel 6 by a half turn). Check with the cell at ${cellName(pcell)} (the top-most cell of panel 7): it moves to ${cellName(nc)}. The other cells follow rigidly. Black cells (row, column): <b>${truth.slice().sort((a, b) => a[1] - b[1] || a[0] - b[0]).map((c) => `${c[1] + 1},${c[0] + 1}`).join(' · ')}</b>.`,
        },
      ];
      const panels = [];
      for (let r = 0; r < 3; r++) {
        panels.push({ c: F[r][0], p: P[r] }, { c: F[r][1], p: P[r] });
        if (r < 2) panels.push({ c: F[r][2], p: P[r] });
      }
      return {
        difficulty: cfg.diff,
        hint: 'the whole figure swings about the ring, like a clock hand — turn it twice.',
        panels: panels.map((s) => S2(s)),
        answer: S(truth),
        options,
        render,
        key,
        rules,
      };
      function S2(s) {
        return { c: s.c.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), p: s.p };
      }
    },
  });
})();
