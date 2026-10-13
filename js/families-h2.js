/* Elite families (h2): turtle, pipes, maze-flood — set H "Networks & paths". */
(function () {
  'use strict';
  const RM = window.RM;
  const bkey = (a) => a.map((x) => (x ? 1 : 0)).join('');

  /* ================================================================ Turtle walk */
  const VEC = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const TV = {
    id: ([x, y]) => [x, y],
    r90: ([x, y]) => [-y, x],
    r180: ([x, y]) => [-x, -y],
    r270: ([x, y]) => [y, -x],
    fh: ([x, y]) => [-x, y],
    fv: ([x, y]) => [x, -y],
    tr: ([x, y]) => [y, x],
    at: ([x, y]) => [-y, -x],
  };
  function walk(moves) {
    const pts = [[3, 3]];
    for (const [dx, dy] of moves) {
      const [x, y] = pts[pts.length - 1];
      pts.push([x + dx, y + dy]);
    }
    return pts;
  }
  function validWalk(moves) {
    const pts = walk(moves);
    if (pts.some(([x, y]) => x < 0 || x > 6 || y < 0 || y > 6)) return false;
    // no lattice point visited twice (also checks intermediate points of length-2 moves)
    const seen = new Set();
    let [x, y] = pts[0];
    seen.add(x + ',' + y);
    for (const [dx, dy] of moves) {
      const n = Math.max(Math.abs(dx), Math.abs(dy));
      for (let k = 0; k < n; k++) {
        x += Math.sign(dx);
        y += Math.sign(dy);
        if (seen.has(x + ',' + y)) return false;
        seen.add(x + ',' + y);
      }
    }
    return true;
  }
  const wkey = (moves) => walk(moves).map((p) => p.join(':')).join('|');
  RM.register({
    id: 'turtle',
    name: 'Turtle walk',
    difficulty: 6,
    generate(rng, variant) {
      const v = variant % 4;
      const order = v === 2 ? '21' : '12';
      const tf = ['id', 'r90', 'id', 'fh'][v];
      const combine = (p1, p2, ord, t) => (ord === '12' ? p1.concat(p2.map(TV[t])) : p2.concat(p1.map(TV[t])));
      const rpath = () => {
        const n = rng.int(2, 3);
        const out = [];
        while (out.length < n) {
          const d = rng.pick(VEC);
          const len = rng.chance(0.4) ? 2 : 1;
          const m = [d[0] * len, d[1] * len];
          const last = out[out.length - 1];
          if (last && Math.sign(last[0]) === -Math.sign(m[0]) && Math.sign(last[1]) === -Math.sign(m[1])) continue;
          if (last && Math.sign(last[0]) === Math.sign(m[0]) && Math.sign(last[1]) === Math.sign(m[1])) continue;
          out.push(m);
        }
        return out;
      };
      const rows = RM.range(3).map(() => {
        for (let t = 0; t < 300; t++) {
          const p1 = rpath();
          const p2 = rpath();
          const p3 = combine(p1, p2, order, tf);
          if (validWalk(p1) && validWalk(p2) && validWalk(p3)) return [p1, p2, p3];
        }
        throw RM.RETRY;
      });
      const preds = new Set();
      ['12', '21'].forEach((o) =>
        Object.keys(TV).forEach((t) => {
          const H = (a, b) => combine(a, b, o, t);
          if ([0, 1].every((r) => wkey(H(rows[r][0], rows[r][1])) === wkey(rows[r][2]))) preds.add(wkey(H(rows[2][0], rows[2][1])));
        })
      );
      // "straight arrow to the end point" reading
      const endOf = (m) => walk(m)[m.length];
      if ([0, 1].every((r) => rows[r][2].length === 1)) preds.add('straight');
      RM.need(preds.size === 1 && preds.has(wkey(rows[2][2])));
      void endOf;
      const [P1, P2, ans] = rows[2];
      const ring = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
      const turnSeg = (m, k, d) => {
        const out = m.map((x) => x.slice());
        const [dx, dy] = out[k];
        const len = Math.max(Math.abs(dx), Math.abs(dy));
        const j = ring.findIndex(([a, b]) => a === Math.sign(dx) && b === Math.sign(dy));
        const nd = ring[RM.mod(j + d, 8)];
        out[k] = [nd[0] * len, nd[1] * len];
        return out;
      };
      const firstLen = (order === '12' ? P1 : P2).length;
      const cands = [];
      const add = (m, why) => cands.push({ m, why });
      add(combine(P1, P2, order === '12' ? '21' : '12', tf), 'the two walks were joined in the wrong order');
      Object.keys(TV).filter((t) => t !== tf).forEach((t) => add(combine(P1, P2, order, t), t === 'id' ? 'the appended walk should have been transformed' : 'the appended walk was turned or mirrored the wrong way'));
      const ext = ans.map((x) => x.slice());
      ext[firstLen - 1] = [ext[firstLen - 1][0] + Math.sign(ext[firstLen - 1][0]), ext[firstLen - 1][1] + Math.sign(ext[firstLen - 1][1])];
      add(ext, 'one segment is too long');
      [1, -1].forEach((d) => add(turnSeg(ans, ans.length - 1, d), 'the last segment points in the wrong direction'));
      [1, -1].forEach((d) => add(turnSeg(ans, 0, d), 'the first segment points in the wrong direction'));
      add(ans.slice(0, -1), 'the walk is missing its last segment');
      const seen = new Set([wkey(ans)]);
      const wrong = [];
      cands.forEach((c) => {
        const k = wkey(c.m);
        if (c.m.length && validWalk(c.m) && !seen.has(k) && wrong.length < 7) {
          seen.add(k);
          wrong.push({ spec: { m: c.m }, flaws: [c.why] });
        }
      });
      RM.need(wrong.length === 7);
      const OTXT = {
        0: 'the 1st walk, then the 2nd walk continued from where the 1st one ended',
        1: 'the 1st walk, then the 2nd walk <b>turned 90° clockwise</b>, continued from where the 1st one ended',
        2: 'the <b>2nd</b> walk first, then the 1st walk continued from where it ended',
        3: 'the 1st walk, then the 2nd walk <b>mirrored left ↔ right</b>, continued from where the 1st one ended',
      }[v];
      return {
        difficulty: v === 3 ? 7 : 6,
        hint: 'each drawing is a journey from the little square.',
        panels: RM.flat(rows.map((r) => r.map((m) => ({ m })))),
        answer: { m: ans },
        key: (s) => wkey(s.m),
        render(sp) {
          const pic = new RM.Pic();
          for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) RM.circle(pic, 14 + i * 12, 14 + j * 12, 1.3, { fill: 'gray', sw: 0 });
          const pts = walk(sp.m).map(([x, y]) => [14 + x * 12, 14 + y * 12]);
          RM.polyline(pic, pts, { sw: 3 });
          const [ex, ey] = pts[pts.length - 1];
          const [px, py] = pts[pts.length - 2];
          const a = Math.atan2(ey - py, ex - px);
          const h = (t) => [ex - 7 * Math.cos(a + t), ey - 7 * Math.sin(a + t)];
          RM.polygon(pic, [[ex, ey], h(0.45), h(-0.45)], { fill: 'black', sw: 1 });
          pic.add(`<rect x="46" y="46" width="8" height="8" fill="#fff" stroke="${RM.INK}" stroke-width="2"/>`);
          return pic.svg();
        },
        options: [{ spec: { m: ans }, flaws: [] }].concat(wrong),
        rules: [
          { k: 'Walks', t: 'each drawing is a walk on the dot grid that starts at the small square and ends at the arrow.' },
          { k: 'Combination', t: `the 3rd walk is ${OTXT}.` },
          { k: 'Answer', t: `do the same with the two walks of row 3 → a walk of <b>${ans.length} segments</b>.` },
        ],
      };
    },
  });

  /* ================================================================ Waterworks
   * Tiles are 4-bit opening masks: 1 = up, 2 = right, 4 = down, 8 = left. */
  const rotMask = (m, k) => {
    let x = m;
    for (let i = 0; i < RM.mod(k, 4); i++) x = ((x << 1) | (x >> 3)) & 15;
    return x;
  };
  const mirMask = (m) => (m & 5) | ((m & 2) << 2) | ((m & 8) >> 2); // left ↔ right
  const flipMask = (m) => (m & 10) | ((m & 1) << 2) | ((m & 4) >> 2); // up ↔ down
  const BASES = [5, 3, 3, 3, 7, 7, 15, 5];
  function water(t, e) {
    const wet = new Array(16).fill(false);
    const start = e * 4;
    if (!(t[start] & 8)) return wet;
    const stack = [start];
    wet[start] = true;
    const D = [[1, 0, -1, 4], [2, 1, 0, 8], [4, 0, 1, 1], [8, -1, 0, 2]];
    while (stack.length) {
      const i = stack.pop();
      const x = i % 4;
      const y = Math.floor(i / 4);
      for (const [bit, dx, dy, opp] of D) {
        if (!(t[i] & bit)) continue;
        const X = x + dx;
        const Y = y + dy;
        if (X < 0 || X > 3 || Y < 0 || Y > 3) continue;
        const j = Y * 4 + X;
        if (!wet[j] && t[j] & opp) {
          wet[j] = true;
          stack.push(j);
        }
      }
    }
    return wet;
  }
  RM.register({
    id: 'pipes',
    name: 'Waterworks',
    difficulty: 7,
    generate(rng, variant) {
      const v = variant % 4;
      const step = (t) => {
        if (v === 2) return t.map((_, i) => t[Math.floor(i / 4) * 4 + RM.mod((i % 4) - 1, 4)]);
        if (v === 1) return t.map((m, i) => rotMask(m, ((i % 4) + Math.floor(i / 4)) % 2 ? -1 : 1));
        return t.map((m) => rotMask(m, 1));
      };
      const rows = RM.range(3).map((ri) => {
        for (let k = 0; k < 400; k++) {
          const t0 = RM.range(16).map(() => (rng.chance(0.88) ? rotMask(rng.pick(BASES), rng.int(0, 3)) : 0));
          const e0 = rng.int(0, 3);
          const E = v === 3 ? [e0, (e0 + 1) % 4, (e0 + 2) % 4] : [e0, e0, e0];
          const t1 = step(t0);
          const row = [t0, t1, step(t1)].map((t, c) => ({ t, e: E[c], wet: water(t, E[c]) }));
          if (row.every((p, c) => p.wet.filter(Boolean).length >= (ri === 2 && c === 2 ? 4 : 2))) return row;
        }
        throw RM.RETRY;
      });
      // transformation hypotheses: rotate all, checkerboard rotations, wrap shifts, whole-grid mirrors/turns
      const H = [];
      for (let k = 0; k < 4; k++) H.push((t) => t.map((m) => rotMask(m, k)));
      for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) if (a !== b) H.push((t) => t.map((m, i) => rotMask(m, ((i % 4) + Math.floor(i / 4)) % 2 ? b : a)));
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => H.push((t) => t.map((_, i) => t[RM.mod(Math.floor(i / 4) - dy, 4) * 4 + RM.mod((i % 4) - dx, 4)])));
      const gridT = {
        r90: (t) => RM.tgrid(t, 4, 'r90').map((m) => rotMask(m, 1)),
        r180: (t) => RM.tgrid(t, 4, 'r180').map((m) => rotMask(m, 2)),
        r270: (t) => RM.tgrid(t, 4, 'r270').map((m) => rotMask(m, 3)),
        fh: (t) => RM.tgrid(t, 4, 'fh').map(mirMask),
        fv: (t) => RM.tgrid(t, 4, 'fv').map(flipMask),
      };
      Object.values(gridT).forEach((g) => H.push(g));
      const preds = new Set();
      H.forEach((h) => {
        if ([0, 1].every((r) => [0, 1].every((c) => h(rows[r][c].t).join() === rows[r][c + 1].t.join()))) preds.add(h(rows[2][1].t).join());
      });
      RM.need(preds.size === 1 && preds.has(rows[2][2].t.join()));
      if (v === 3) {
        const Eg = rows.map((r) => r.map((p) => p.e));
        RM.needUnique(Eg, Eg[2][2], 'numeric', 4);
      }
      const ans = rows[2][2];
      const wetI = RM.range(16).filter((i) => ans.wet[i]);
      const dryNb = RM.range(16).filter((i) => !ans.wet[i] && ans.t[i] && [-1, 1, -4, 4].some((d) => ans.wet[i + d] && Math.abs(((i + d) % 4) - (i % 4)) <= 1));
      RM.need(dryNb.length && wetI.length >= 3);
      const iB = rng.pick(wetI.filter((i) => i !== ans.e * 4 && ![5, 10, 15].includes(ans.t[i])).concat(wetI.slice(-1)));
      const bMask = rotMask(ans.t[iB], 1);
      RM.need(bMask !== ans.t[iB]);
      const iA = rng.pick(dryNb);
      const iC = rng.pick(wetI.filter((i) => i !== iB));
      const C = 18;
      const RTXT = {
        0: 'every pipe tile turns <b>90° clockwise</b> on the spot',
        1: 'pipe tiles on the shaded squares turn <b>90° clockwise</b>, the others turn <b>90° anticlockwise</b>',
        2: 'every row of tiles slides <b>one place to the right</b> (the last tile comes back on the left); tiles do not turn',
        3: 'every pipe tile turns <b>90° clockwise</b>, and the inlet moves down one row (back to the top after the bottom)',
      }[v];
      return {
        hint: 'turn the pipes first, then pour the water.',
        panels: RM.flat(rows),
        answer: ans,
        key: (s) => s.t.join(',') + '|' + s.e + '|' + bkey(s.wet),
        render(sp) {
          const pic = new RM.Pic();
          for (let i = 0; i < 16; i++) {
            const x = 14 + (i % 4) * C;
            const y = 14 + Math.floor(i / 4) * C;
            const shade = v === 1 && ((i % 4) + Math.floor(i / 4)) % 2 === 0;
            pic.add(`<rect x="${x}" y="${y}" width="${C}" height="${C}" fill="${shade ? RM.FAINT : '#fff'}" stroke="${RM.LIGHT}" stroke-width="0.8"/>`);
          }
          pic.add(`<rect x="14" y="14" width="72" height="72" fill="none" stroke="${RM.INK}" stroke-width="1.8"/>`);
          const arms = [[1, 0, -1], [2, 1, 0], [4, 0, 1], [8, -1, 0]];
          for (let pass = 0; pass < 2; pass++)
            sp.t.forEach((m, i) => {
              if (!m) return;
              const cx = 14 + (i % 4) * C + C / 2;
              const cy = 14 + Math.floor(i / 4) * C + C / 2;
              const col = pass === 0 ? RM.INK : sp.wet[i] ? RM.DARK : '#fff';
              const sw = pass === 0 ? 7 : 4;
              arms.forEach(([bit, dx, dy]) => m & bit && RM.line(pic, cx, cy, cx + (dx * C) / 2, cy + (dy * C) / 2, { sw, color: col, cap: pass === 0 ? 'butt' : 'butt' }));
              RM.circle(pic, cx, cy, sw / 2, { fill: pass === 0 ? 'black' : sp.wet[i] ? 'dark' : 'white', sw: 0 });
            });
          const ey = 14 + sp.e * C + C / 2;
          RM.polygon(pic, [[3, ey - 5], [11, ey], [3, ey + 5]], { fill: 'black', sw: 1 });
          return pic.svg();
        },
        perturb: [
          {
            apply: (s) => {
              s.t[iB] = rotMask(s.t[iB], 1);
              s.wet = water(s.t, s.e);
              return s;
            },
            why: 'one pipe tile is turned the wrong way',
          },
          { apply: (s) => (s.wet[iA] ? null : ((s.wet[iA] = true), s)), why: 'water appears in a pipe that is not connected to the inlet' },
          { apply: (s) => (s.wet[iC] ? ((s.wet[iC] = false), s) : null), why: 'a pipe connected to the inlet has no water' },
        ],
        rules: [
          { k: 'Pipes', t: `from one panel to the next, ${RTXT}.` },
          { k: 'Water', t: 'water enters at the black arrow and fills every pipe connected to it through matching openings (dark = water). This is true in every panel.' },
          { k: 'Answer', t: `transform the pipes of row 3, then follow the water from the inlet → <b>${wetI.length} tiles</b> carry water.` },
        ],
      };
    },
  });

  /* ================================================================ Flood fill
   * 24 internal walls: 0–11 horizontal (between (x,y) and (x,y+1), index y*4+x), 12–23 vertical (between (x,y) and (x+1,y), index 12+y*3+x). */
  function flood(w, s) {
    const seen = new Array(16).fill(false);
    const st = [s];
    seen[s] = true;
    while (st.length) {
      const i = st.pop();
      const x = i % 4;
      const y = Math.floor(i / 4);
      const nb = [];
      if (y < 3 && !w[y * 4 + x]) nb.push(i + 4);
      if (y > 0 && !w[(y - 1) * 4 + x]) nb.push(i - 4);
      if (x < 3 && !w[12 + y * 3 + x]) nb.push(i + 1);
      if (x > 0 && !w[12 + y * 3 + x - 1]) nb.push(i - 1);
      nb.forEach((j) => {
        if (!seen[j]) {
          seen[j] = true;
          st.push(j);
        }
      });
    }
    return seen;
  }
  RM.register({
    id: 'maze-flood',
    name: 'Flood fill',
    difficulty: 6,
    generate(rng, variant) {
      const v = variant % 4;
      const fname = ['xor', 'or', 'and', 'xor'][v];
      const f = RM.BOOL[fname].f;
      const rows = RM.range(3).map(() => {
        for (let k = 0; k < 400; k++) {
          const sy = rng.int(0, 3);
          const sx0 = rng.int(0, 3);
          const S = RM.range(3).map((c) => sy * 4 + (v === 3 ? (sx0 + c) % 4 : sx0));
          const dens = fname === 'and' ? 0.62 : fname === 'or' ? 0.22 : 0.33;
          const A = RM.range(24).map(() => rng.chance(dens));
          const B = RM.range(24).map(() => rng.chance(dens));
          const Cw = A.map((x, i) => f(x, B[i]));
          const row = [A, B, Cw].map((w, c) => ({ w, s: S[c], sh: flood(w, S[c]) }));
          if (row.every((p) => {
            const n = p.sh.filter(Boolean).length;
            return n >= 3 && n <= 13;
          })) return row;
        }
        throw RM.RETRY;
      });
      const pw = new Set();
      RM.ALL_BOOL.forEach((g) => {
        if ([0, 1].every((r) => rows[r][0].w.every((x, i) => g(x, rows[r][1].w[i]) === rows[r][2].w[i]))) pw.add(bkey(rows[2][0].w.map((x, i) => g(x, rows[2][1].w[i]))));
      });
      const ans = rows[2][2];
      RM.need(pw.size === 1 && pw.has(bkey(ans.w)));
      RM.ALL_BOOL.forEach((g) => {
        if ([0, 1].every((r) => rows[r][0].sh.every((x, i) => g(x, rows[r][1].sh[i]) === rows[r][2].sh[i]))) RM.need(bkey(rows[2][0].sh.map((x, i) => g(x, rows[2][1].sh[i]))) === bkey(ans.sh));
      });
      if (v === 3) {
        const Sx = rows.map((r) => r.map((p) => p.s % 4));
        RM.needUnique(Sx, Sx[2][2], 'numeric', 4);
      }
      // walls whose toggling changes the flooded area
      const changing = RM.range(24).filter((i) => {
        const w = ans.w.slice();
        w[i] = !w[i];
        return bkey(flood(w, ans.s)) !== bkey(ans.sh);
      });
      RM.need(changing.length >= 2);
      const [e1, e2] = rng.sample(changing, 2);
      const edgeCells = RM.range(16).filter((i) => !ans.sh[i]);
      RM.need(edgeCells.length);
      const cB = rng.pick(edgeCells);
      const C = 18;
      const tog = (s, e) => {
        s.w[e] = !s.w[e];
        s.sh = flood(s.w, s.s);
        return s;
      };
      return {
        difficulty: v === 3 ? 7 : 6,
        hint: "the grey area isn't arbitrary — where can the water go?",
        panels: RM.flat(rows),
        answer: ans,
        key: (s) => bkey(s.w) + '|' + s.s + '|' + bkey(s.sh),
        render(sp) {
          const pic = new RM.Pic();
          for (let i = 0; i < 16; i++) {
            const x = 14 + (i % 4) * C;
            const y = 14 + Math.floor(i / 4) * C;
            pic.add(`<rect x="${x}" y="${y}" width="${C}" height="${C}" fill="${sp.sh[i] ? '#c4c9d0' : '#fff'}" stroke="${RM.LIGHT}" stroke-width="0.7"/>`);
          }
          sp.w.forEach((on, i) => {
            if (!on) return;
            if (i < 12) {
              const x = 14 + (i % 4) * C;
              const y = 14 + (Math.floor(i / 4) + 1) * C;
              RM.line(pic, x, y, x + C, y, { sw: 3.2, cap: 'square' });
            } else {
              const k = i - 12;
              const x = 14 + ((k % 3) + 1) * C;
              const y = 14 + Math.floor(k / 3) * C;
              RM.line(pic, x, y, x, y + C, { sw: 3.2, cap: 'square' });
            }
          });
          pic.add(`<rect x="14" y="14" width="72" height="72" fill="none" stroke="${RM.INK}" stroke-width="3"/>`);
          RM.shape(pic, 'drop', 14 + (sp.s % 4) * C + C / 2, 14 + Math.floor(sp.s / 4) * C + C / 2, 5.5, { fill: 'black', sw: 0.5 });
          return pic.svg();
        },
        perturb: [
          { apply: (s) => tog(s, e1), why: 'one wall is wrong (present/absent), so the water spreads differently' },
          { apply: (s) => tog(s, e2), why: 'another wall is wrong (present/absent), so the water spreads differently' },
          { apply: (s) => ((s.sh[cB] = !s.sh[cB]), s), why: 'the grey area does not match the walls: one square is wrongly coloured' },
        ],
        rules: [
          { k: 'Walls', t: `wall by wall: ${RM.BOOL[fname].text}.` },
          { k: 'Water', t: 'the grey squares are exactly those the water can reach from the drop without crossing a wall — in every panel.' },
        ].concat(v === 3 ? [{ k: 'Drop', t: 'the drop moves one square to the right at every step (back to the left edge after the right edge).' }] : [])
          .concat([{ k: 'Answer', t: `combine the walls of row 3, then flood from the drop → <b>${ans.sh.filter(Boolean).length} grey squares</b>.` }]),
      };
    },
  });
})();
