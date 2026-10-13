/* Elite families (f1): tumble, tilt-maze, line-clear — set F "Panel physics". */
(function () {
  'use strict';
  const RM = window.RM;
  const COL = { 1: 'black', 2: 'gray', 3: 'hatch' };
  const CNAME = { 1: 'black', 2: 'grey', 3: 'hatched' };

  function gridLines(pic, x0, y0, c, nx, ny) {
    for (let i = 1; i < nx; i++) RM.line(pic, x0 + i * c, y0, x0 + i * c, y0 + ny * c, { sw: 0.6, color: RM.LIGHT, cap: 'butt' });
    for (let j = 1; j < ny; j++) RM.line(pic, x0, y0 + j * c, x0 + nx * c, y0 + j * c, { sw: 0.6, color: RM.LIGHT, cap: 'butt' });
  }
  function cell(pic, x, y, s, fill) {
    pic.add(`<rect x="${RM.fmt(x + 0.6)}" y="${RM.fmt(y + 0.6)}" width="${RM.fmt(s - 1.2)}" height="${RM.fmt(s - 1.2)}" fill="${pic.paint(fill)}" stroke="${RM.INK}" stroke-width="1.2"/>`);
  }

  /* ================================================================ Tumble */
  /* gravity toward one side: 0 down, 1 left, 2 up, 3 right (implemented by rotating) */
  function settle(a, n) {
    const out = new Array(n * n).fill(0);
    for (let x = 0; x < n; x++) {
      const col = [];
      for (let y = n - 1; y >= 0; y--) if (a[y * n + x]) col.push(a[y * n + x]);
      col.forEach((v, i) => (out[(n - 1 - i) * n + x] = v));
    }
    return out;
  }
  const ROT = ['id', 'r90', 'r180', 'r270'];
  function gravity(a, n, side) {
    if (side === 0) return settle(a, n);
    // rotate so that the wanted side becomes the floor, settle, rotate back
    const to = ROT[side];
    const back = ROT[(4 - side) % 4];
    return RM.tgrid(settle(RM.tgrid(a, n, to), n), n, back);
  }
  RM.register({
    id: 'tumble',
    name: 'Tumble',
    difficulty: 6,
    generate(rng, variant) {
      const v = variant % 4;
      const n = v < 2 ? 4 : 5;
      const ncol = v === 1 || v === 2 ? 3 : 2;
      const rot = ['r90', 'r270', 'r90', 'r270'][v];
      const step = (a) => settle(RM.tgrid(a, n, rot), n);
      const rows = RM.range(3).map(() => {
        const nb = rng.int(5, n === 4 ? 7 : 9);
        const a = new Array(n * n).fill(0);
        for (let k = 0; k < nb; k++) a[rng.int(0, n * n - 1)] = rng.int(1, ncol);
        const s = settle(a, n);
        RM.need(s.filter(Boolean).length >= 5);
        const b = step(s);
        const c = step(b);
        RM.need(b.join() !== s.join() && c.join() !== b.join() && c.join() !== s.join());
        return [s, b, c];
      });
      RM.need(new Set(rows.map((r) => r[0].join())).size === 3);
      // every transform (+ optional gravity toward any side) fitting rows 1–2 must agree on row 3
      const preds = new Set();
      ['id', 'r90', 'r180', 'r270', 'fh', 'fv', 'tr', 'at'].forEach((t) =>
        [-1, 0, 1, 2, 3].forEach((g) => {
          const H = (a) => (g < 0 ? RM.tgrid(a, n, t) : gravity(RM.tgrid(a, n, t), n, g));
          if ([0, 1].every((r) => H(rows[r][0]).join() === rows[r][1].join() && H(rows[r][1]).join() === rows[r][2].join())) preds.add(H(rows[2][1]).join());
        })
      );
      RM.need(preds.size === 1 && preds.has(rows[2][2].join()));
      const src = rows[2][1];
      const ans = rows[2][2];
      const turn = { r90: '90° clockwise', r270: '90° anticlockwise', r180: 'a half turn (180°)', id: 'no turn' };
      // plausible wrong outcomes
      const cands = [];
      const add = (cells, why) => cells && cands.push({ cells, why });
      ['r90', 'r270', 'r180'].filter((r) => r !== rot).forEach((r) => {
        add(settle(RM.tgrid(src, n, r), n), `the box was turned ${turn[r]} instead of ${turn[rot]}`);
        add(RM.tgrid(src, n, r), `the box was turned ${turn[r]} instead of ${turn[rot]}, and the blocks did not fall`);
      });
      add(RM.tgrid(src, n, rot), 'the blocks were left hanging — they must fall after the turn');
      add(gravity(RM.tgrid(src, n, rot), n, 1), 'the blocks fell sideways instead of down');
      add(gravity(RM.tgrid(src, n, rot), n, 3), 'the blocks fell sideways instead of down');
      add(settle(RM.tgrid(src, n, 'fh'), n), 'the box was mirrored instead of turned');
      const swapped = ans.slice();
      for (let x = 0, done = false; x < n && !done; x++)
        for (let y = n - 1; y > 0 && !done; y--) {
          const i = y * n + x;
          const j = (y - 1) * n + x;
          if (swapped[i] && swapped[j] && swapped[i] !== swapped[j]) {
            [swapped[i], swapped[j]] = [swapped[j], swapped[i]];
            done = true;
          }
        }
      add(swapped, 'two stacked blocks are in the wrong order');
      const seen = new Set([ans.join('')]);
      const wrong = [];
      cands.forEach((c) => {
        const k = c.cells.join('');
        if (!seen.has(k) && wrong.length < 7) {
          seen.add(k);
          wrong.push({ spec: { c: c.cells }, flaws: [c.why] });
        }
      });
      RM.need(wrong.length === 7);
      return {
        difficulty: v === 2 ? 7 : 6,
        hint: 'imagine holding the box and turning it.',
        panels: RM.flat(rows.map((r) => r.map((c) => ({ c })))),
        answer: { c: ans },
        options: [{ spec: { c: ans }, flaws: [] }].concat(wrong),
        key: (sp) => sp.c.join(''),
        render(sp) {
          const pic = new RM.Pic();
          const c = 76 / n;
          gridLines(pic, 12, 12, c, n, n);
          sp.c.forEach((v2, i) => v2 && cell(pic, 12 + (i % n) * c, 12 + Math.floor(i / n) * c, c, COL[v2]));
          pic.add(`<rect x="12" y="12" width="76" height="76" fill="none" stroke="${RM.INK}" stroke-width="3"/>`);
          return pic.svg();
        },
        rules: [
          { k: 'Turn', t: `at every step the whole box is turned <b>${turn[rot]}</b>, blocks included.` },
          { k: 'Gravity', t: 'then every block falls straight down as far as it can; blocks in a column keep their order.' },
          { k: 'Answer', t: 'turn the 2nd box of row 3 the same way and let the blocks drop.' },
        ],
      };
    },
  });

  /* ================================================================ Tilt maze */
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const DNAME = ['up', 'right', 'down', 'left'];
  /* phys: 'normal' | 'pass' (marbles ignore each other) | 'nowall' | 'one' (move one cell) */
  function tilt(walls, m, d, phys) {
    const [dx, dy] = DIRS[d];
    const order = m.map((p, i) => i).sort((i, j) => (m[j][0] - m[i][0]) * dx + (m[j][1] - m[i][1]) * dy);
    const out = m.map((p) => p.slice());
    const blocked = (x, y, k) => {
      if (x < 0 || x > 4 || y < 0 || y > 4) return true;
      if (phys !== 'nowall' && walls.includes(y * 5 + x)) return true;
      if (phys !== 'pass') return out.some((q, j) => j !== k && q[0] === x && q[1] === y);
      return false;
    };
    order.forEach((k) => {
      let [x, y] = out[k];
      while (!blocked(x + dx, y + dy, k)) {
        x += dx;
        y += dy;
        if (phys === 'one') break;
      }
      out[k] = [x, y];
    });
    return out;
  }
  const mkey = (m) => m.map((p) => p.join(':')).join('|');
  RM.register({
    id: 'tilt-maze',
    name: 'Tilt maze',
    difficulty: 6,
    generate(rng, variant) {
      const v = variant % 4;
      const nm = v === 0 ? 2 : 3;
      let seq1;
      let seq2;
      if (v === 0) {
        const d = rng.int(0, 3);
        seq1 = [d];
        seq2 = [(d + rng.pick([1, 3])) % 4];
      } else if (v === 1) {
        const d = rng.int(0, 3);
        seq1 = [d];
        seq2 = [(d + 2) % 4];
      } else if (v === 2) {
        const d = rng.int(0, 3);
        seq1 = [d];
        seq2 = [(d + rng.int(1, 3)) % 4];
      } else {
        const d = rng.int(0, 3);
        const e = (d + rng.pick([1, 3])) % 4;
        seq1 = [d, e];
        seq2 = rng.chance(0.5) ? [(d + 2) % 4, (e + 2) % 4] : [(e + 2) % 4, (d + 2) % 4];
      }
      const run = (walls, m, seq, phys) => seq.reduce((a, d) => tilt(walls, a, d, phys || 'normal'), m);
      const rows = RM.range(3).map(() => {
        const walls = rng.sample(RM.range(25), rng.int(3, 6));
        const free = RM.range(25).filter((i) => !walls.includes(i));
        const m = rng.sample(free, nm).map((i) => [i % 5, Math.floor(i / 5)]);
        const b = run(walls, m, seq1);
        const c = run(walls, b, seq2);
        RM.need(mkey(b) !== mkey(m) && mkey(c) !== mkey(b));
        return { walls, p: [m, b, c] };
      });
      // hypotheses: any sequence of 1–2 tilts with normal physics, or one tilt with other physics, per step
      const hyps = [];
      for (let a = 0; a < 4; a++) {
        ['normal', 'pass', 'nowall', 'one'].forEach((ph) => hyps.push({ seq: [a], ph }));
        for (let b = 0; b < 4; b++) hyps.push({ seq: [a, b], ph: 'normal' });
      }
      const fit = (step) => hyps.filter((h) => [0, 1].every((r) => mkey(run(rows[r].walls, rows[r].p[step], h.seq, h.ph)) === mkey(rows[r].p[step + 1])));
      const preds = new Set(fit(1).map((h) => mkey(run(rows[2].walls, rows[2].p[1], h.seq, h.ph))));
      RM.need(preds.size === 1 && preds.has(mkey(rows[2].p[2])));
      RM.need(fit(0).length >= 1);
      const BALL = [
        { f: 'black', n: 'black ball' },
        { f: 'white', n: 'white ball' },
        { f: 'gray', n: 'grey ball' },
      ];
      const seqText = (sq) => sq.map((d) => DNAME[d]).join(', then ');
      const W = rows[2].walls;
      const R2 = rows[2].p[1];
      const ans = rows[2].p[2];
      const cands = [];
      const add = (m, why) => m && cands.push({ m, why });
      for (let d = 0; d < 4; d++) {
        const seqs = seq2.length === 1 ? [[d]] : [[d, seq2[1]], [seq2[0], d]];
        seqs.forEach((sq) => sq.join() !== seq2.join() && add(run(W, R2, sq), `the board was tilted ${seqText(sq)} instead of ${seqText(seq2)}`));
      }
      add(run(W, R2, seq2, 'nowall'), 'a ball rolled through a wall');
      add(run(W, R2, seq2, 'pass'), 'a ball rolled through another ball');
      add(run(W, R2, seq2, 'one'), 'the balls moved only one cell instead of rolling as far as possible');
      if (seq2.length === 2) add(run(W, R2, [seq2[1], seq2[0]]), 'the two tilts were done in the wrong order');
      for (let i = 0; i < nm; i++)
        for (let j = i + 1; j < nm; j++) {
          const m = ans.map((p) => p.slice());
          [m[i], m[j]] = [m[j], m[i]];
          add(m, `the ${BALL[i].n} and the ${BALL[j].n} are in each other's places`);
        }
      for (let k = 0; k < nm; k++)
        DIRS.forEach(([dx, dy]) => {
          const m = ans.map((p) => p.slice());
          m[k] = [m[k][0] + dx, m[k][1] + dy];
          if (m[k][0] >= 0 && m[k][0] <= 4 && m[k][1] >= 0 && m[k][1] <= 4) add(m, `the ${BALL[k].n} is one cell off — it rolls until it is blocked, no further`);
        });
      const valid = (m) => m.every((p, k) => !W.includes(p[1] * 5 + p[0]) && !m.some((q, j) => j !== k && q[0] === p[0] && q[1] === p[1]));
      const seen = new Set([mkey(ans)]);
      const wrong = [];
      cands.forEach((c) => {
        const k = mkey(c.m);
        if (valid(c.m) && !seen.has(k) && wrong.length < 7) {
          seen.add(k);
          wrong.push({ spec: { w: W, m: c.m }, flaws: [c.why] });
        }
      });
      RM.need(wrong.length === 7);
      return {
        difficulty: v === 3 ? 7 : 6,
        hint: 'the grey squares are fixed; the balls are not.',
        panels: RM.flat(rows.map((r) => r.p.map((m) => ({ w: r.walls, m })))),
        answer: { w: W, m: ans },
        options: [{ spec: { w: W, m: ans }, flaws: [] }].concat(wrong),
        key: (s) => mkey(s.m),
        render(sp) {
          const pic = new RM.Pic();
          gridLines(pic, 10, 10, 16, 5, 5);
          sp.w.forEach((i) => pic.add(`<rect x="${10 + (i % 5) * 16 + 1}" y="${10 + Math.floor(i / 5) * 16 + 1}" width="14" height="14" fill="${RM.DARK}"/>`));
          pic.add(`<rect x="10" y="10" width="80" height="80" fill="none" stroke="${RM.INK}" stroke-width="2.4"/>`);
          sp.m.forEach((p, k) => RM.circle(pic, 18 + p[0] * 16, 18 + p[1] * 16, 6, { fill: BALL[k].f, sw: 1.8 }));
          return pic.svg();
        },
        rules: [
          { k: 'Rolling', t: 'tilting the board makes every ball roll in that direction until it hits a wall, the edge or a ball that has already stopped. The dark squares never move.' },
          { k: 'Panel 1 → 2', t: `the board is tilted <b>${seqText(seq1)}</b>.` },
          { k: 'Panel 2 → 3', t: `the board is tilted <b>${seqText(seq2)}</b>.` },
          { k: 'Answer', t: `apply the same tilt${seq2.length > 1 ? 's' : ''} to the 2nd board of row 3.` },
        ],
      };
    },
  });

  /* ================================================================ Line clear */
  const PIECES = {
    I3: [[0, 0], [1, 0], [2, 0]],
    V3: [[0, 0], [0, 1], [0, 2]],
    L3a: [[0, 0], [0, 1], [1, 1]],
    L3b: [[1, 0], [0, 1], [1, 1]],
    L3c: [[0, 0], [1, 0], [0, 1]],
    L3d: [[0, 0], [1, 0], [1, 1]],
    O: [[0, 0], [1, 0], [0, 1], [1, 1]],
    T: [[0, 0], [1, 0], [2, 0], [1, 1]],
    Tu: [[1, 0], [0, 1], [1, 1], [2, 1]],
    S: [[1, 0], [2, 0], [0, 1], [1, 1]],
    Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
    L: [[0, 0], [0, 1], [0, 2], [1, 2]],
    J: [[1, 0], [1, 1], [1, 2], [0, 2]],
    I4: [[0, 0], [1, 0], [2, 0], [3, 0]],
  };
  const TRO = ['I3', 'V3', 'L3a', 'L3b', 'L3c', 'L3d'];
  const TET = ['O', 'T', 'Tu', 'S', 'Z', 'L', 'J', 'I4'];
  /* grid: W×H row-major, 0 empty, 1 pile, 2 piece */
  function drop(g, W, H, piece, px, mode) {
    const cells = PIECES[piece];
    const fits = (y) => cells.every(([dx, dy]) => {
      const x = px + dx;
      const yy = y + dy;
      return x >= 0 && x < W && yy < H && (yy < 0 || !g[yy * W + x]);
    });
    let y = -3;
    if (mode === 'bottom') {
      const h = Math.max(...cells.map((c) => c[1]));
      y = H - 1 - h;
    } else if (mode === 'top') y = 0;
    else {
      while (fits(y + 1)) y++;
      if (mode === 'high') y--;
    }
    const out = g.slice();
    for (const [dx, dy] of cells) {
      const yy = y + dy;
      if (yy < 0 || yy >= H) return null;
      out[yy * W + px + dx] = 2;
    }
    return out;
  }
  function clearRows(g, W, H, sand) {
    const rows = [];
    for (let y = 0; y < H; y++) rows.push(g.slice(y * W, y * W + W));
    const kept = rows.filter((r) => !r.every(Boolean));
    const n = H - kept.length;
    let out = [].concat(...RM.range(n).map(() => new Array(W).fill(0)), ...kept);
    if (sand) {
      const s = new Array(W * H).fill(0);
      for (let x = 0; x < W; x++) {
        const col = [];
        for (let y = H - 1; y >= 0; y--) if (out[y * W + x]) col.push(out[y * W + x]);
        col.forEach((v, i) => (s[(H - 1 - i) * W + x] = v));
      }
      out = s;
    }
    return { g: out, n };
  }
  RM.register({
    id: 'line-clear',
    name: 'Line clear',
    difficulty: 6,
    generate(rng, variant) {
      const v = variant % 4;
      const W = v >= 2 ? 6 : 5;
      const H = 6;
      const pool = v === 0 ? TRO : v === 1 ? TRO.concat(['O', 'T', 'L', 'J']) : TET.concat(['L3a', 'L3b']);
      const result = (g, piece, px, mode) => {
        const d = drop(g, W, H, piece, px, mode || 'drop');
        if (!d) return null;
        if (mode === 'noclear' || mode === 'top' || mode === 'bottom') return { g: d, n: 0 };
        return clearRows(d, W, H, mode === 'sand');
      };
      const makeRow = () => {
        for (let t = 0; t < 200; t++) {
          const piece = rng.pick(pool);
          const w = Math.max(...PIECES[piece].map((c) => c[0])) + 1;
          const px = rng.int(0, W - w);
          // build a pile that the piece completes: start from the piece landing spot
          const g = new Array(W * H).fill(0);
          const nfull = v === 0 ? 1 : rng.int(1, 2);
          const base = H - 1;
          for (let y = base; y > base - 3; y--) for (let x = 0; x < W; x++) if (rng.chance(y > base - nfull ? 0.92 : 0.45)) g[y * W + x] = 1;
          // settle the pile so nothing floats
          const s = clearRows(g, W, H, true).g.map((x) => (x ? 1 : 0));
          if (s.filter(Boolean).length < W) continue;
          const r = result(s, piece, px);
          if (!r || r.n < 1 || r.n > 2) continue;
          return { pile: s, piece, px, res: r.g };
        }
        throw RM.RETRY;
      };
      const rows = RM.range(3).map(makeRow);
      // alternative mechanics fitting rows 1–2 must agree on row 3
      const preds = new Set();
      ['drop', 'noclear', 'sand', 'bottom', 'top'].forEach((mode) => {
        if ([0, 1].every((r) => {
          const x = result(rows[r].pile, rows[r].piece, rows[r].px, mode);
          return x && x.g.join() === rows[r].res.join();
        })) {
          const x = result(rows[2].pile, rows[2].piece, rows[2].px, mode);
          preds.add(x ? x.g.join() : 'none');
        }
      });
      RM.need(preds.size === 1 && preds.has(rows[2].res.join()));
      const R = rows[2];
      const ans = R.res;
      const cands = [];
      const add = (g, why) => g && cands.push({ g, why });
      const res = (piece, px, mode) => {
        const x = result(R.pile, piece, px, mode);
        return x ? x.g : null;
      };
      const w = Math.max(...PIECES[R.piece].map((c) => c[0])) + 1;
      add(res(R.piece, R.px, 'noclear'), 'the completed row should have disappeared');
      add(res(R.piece, R.px, 'sand'), 'after a clear, rows move down as a whole — blocks must not fall into the holes');
      if (R.px > 0) add(res(R.piece, R.px - 1), 'the piece landed one column too far to the left');
      if (R.px + w < W) add(res(R.piece, R.px + 1), 'the piece landed one column too far to the right');
      if (R.px > 0) add(res(R.piece, R.px - 1, 'noclear'), 'the piece landed one column too far to the left, and a full row was left');
      if (R.px + w < W) add(res(R.piece, R.px + 1, 'noclear'), 'the piece landed one column too far to the right, and a full row was left');
      add(res(R.piece, R.px, 'high'), 'the piece stopped one row too high');
      const d0 = drop(R.pile, W, H, R.piece, R.px, 'drop');
      if (d0) {
        // cleared rows emptied but nothing moved down
        const gap = d0.slice();
        for (let y = 0; y < H; y++) if (RM.range(W).every((x) => gap[y * W + x])) for (let x = 0; x < W; x++) gap[y * W + x] = 0;
        add(gap, 'the full row was emptied but the blocks above did not move down');
      }
      add(res(R.piece, R.px, 'bottom'), 'the piece was pushed to the floor through the pile');
      const seen = new Set([ans.join('')]);
      const wrong = [];
      cands.forEach((c) => {
        const k = c.g.join('');
        if (!seen.has(k) && wrong.length < 7) {
          seen.add(k);
          wrong.push({ spec: { g: c.g }, flaws: [c.why] });
        }
      });
      RM.need(wrong.length === 7);
      const pieceGrid = (piece, px) => {
        const g = new Array(W * H).fill(0);
        PIECES[piece].forEach(([dx, dy]) => (g[dy * W + px + dx] = 2));
        return g;
      };
      const c = 12;
      const x0 = 50 - (W * c) / 2;
      const y0 = 90 - H * c;
      const nCleared = clearRows(d0, W, H).n;
      return {
        difficulty: v === 3 ? 7 : 6,
        hint: 'the middle panel shows something that is about to fall.',
        panels: RM.flat(rows.map((r) => [{ g: r.pile }, { g: pieceGrid(r.piece, r.px) }, { g: r.res }])),
        answer: { g: ans },
        options: [{ spec: { g: ans }, flaws: [] }].concat(wrong),
        key: (sp) => sp.g.join(''),
        render(sp) {
          const pic = new RM.Pic();
          gridLines(pic, x0, y0, c, W, H);
          sp.g.forEach((val, i) => val && cell(pic, x0 + (i % W) * c, y0 + Math.floor(i / W) * c, c, val === 1 ? 'black' : 'gray'));
          RM.polyline(pic, [[x0, y0 - 4], [x0, y0 + H * c], [x0 + W * c, y0 + H * c], [x0 + W * c, y0 - 4]], { sw: 3 });
          return pic.svg();
        },
        rules: [
          { k: 'Drop', t: 'the 2nd panel shows a piece above the well. In the 3rd panel it has dropped straight down (without turning) onto the pile of the 1st panel and stopped on the first block or the floor it meets.' },
          { k: 'Clear', t: 'every row that is now completely full disappears, and everything above it moves down by one row per cleared row (blocks do not fall into holes).' },
          { k: 'Answer', t: `in row 3 the piece completes <b>${nCleared} row${nCleared > 1 ? 's' : ''}</b>, which vanish${nCleared > 1 ? '' : 'es'}.` },
        ],
      };
    },
  });
})();
