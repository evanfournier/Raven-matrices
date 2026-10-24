/* Perimeter (grandmaster): polyominoes (some with holes) on a faint 6x6 grid. The perimeter = number of unit edges on the
 * boundary, the boundary of every hole included. Rule per variant: column 3 = column 1 + column 2, perimeter constant per
 * row, or column 3 = column 1 - column 2. Area, outer-only perimeter and bounding box are decoys (needNoConflict).
 * All 8 options are one-square moves of one hidden base shape, so none is "typical"; only the answer has the right perimeter. */
(function () {
  'use strict';
  const RM = window.RM;
  const N = 6;
  const CS = 14;
  const X0 = 8;
  const id = (x, y) => y * N + x;
  const NB = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const inside = (x, y) => x >= 0 && y >= 0 && x < N && y < N;

  function info(set) {
    let per = 0;
    let x0 = N, y0 = N, x1 = -1, y1 = -1;
    set.forEach((i) => {
      const x = i % N, y = (i / N) | 0;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      NB.forEach(([dx, dy]) => { if (!inside(x + dx, y + dy) || !set.has(id(x + dx, y + dy))) per++; });
    });
    const out = new Set();
    const st = [[-1, -1]];
    out.add('-1,-1');
    while (st.length) {
      const [x, y] = st.pop();
      NB.forEach(([dx, dy]) => {
        const a = x + dx, b = y + dy;
        if (a < -1 || b < -1 || a > N || b > N || out.has(a + ',' + b) || (inside(a, b) && set.has(id(a, b)))) return;
        out.add(a + ',' + b);
        st.push([a, b]);
      });
    }
    let he = 0, holes = 0;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (set.has(id(x, y)) || out.has(x + ',' + y)) continue;
      holes++;
      NB.forEach(([dx, dy]) => { if (inside(x + dx, y + dy) && set.has(id(x + dx, y + dy))) he++; });
    }
    return { per, he, outer: per - he, holes, area: set.size, bb: x1 - x0 + y1 - y0 + 2 };
  }
  function pinch(set, x, y) {
    for (const sx of [1, -1]) for (const sy of [1, -1]) {
      if (inside(x + sx, y + sy) && set.has(id(x + sx, y + sy)) && !set.has(id(x + sx, y)) && !set.has(id(x, y + sy))) return true;
    }
    return false;
  }
  function valid(set) {
    if (!set.size) return false;
    const arr = Array.from(set);
    const seen = new Set([arr[0]]);
    const st = [arr[0]];
    while (st.length) {
      const i = st.pop();
      const x = i % N, y = (i / N) | 0;
      NB.forEach(([dx, dy]) => {
        if (!inside(x + dx, y + dy)) return;
        const j = id(x + dx, y + dy);
        if (set.has(j) && !seen.has(j)) { seen.add(j); st.push(j); }
      });
    }
    if (seen.size !== set.size) return false;
    return arr.every((i) => !pinch(set, i % N, (i / N) | 0));
  }
  const norm = (set) => {
    let mx = N, my = N;
    set.forEach((i) => { mx = Math.min(mx, i % N); my = Math.min(my, (i / N) | 0); });
    return Array.from(set).map((i) => (((i / N) | 0) - my) * N + (i % N) - mx).sort((a, b) => a - b).join(',');
  };

  function gen(rng, P, hole) {
    for (let t = 0; t < 150; t++) {
      const set = new Set();
      const keep = new Set();
      let n;
      let ring = 0;
      if (hole) {
        const [w, h] = rng.pick([[3, 3], [3, 3], [3, 4], [4, 3]]);
        const ox = rng.int(0, N - w), oy = rng.int(0, N - h);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          if (x === 0 || y === 0 || x === w - 1 || y === h - 1) set.add(id(ox + x, oy + y));
          else keep.add(id(ox + x, oy + y));
        }
        ring = set.size;
        n = ring + Math.max(1, (P - info(set).per) / 2) + rng.int(0, 1);
      } else {
        set.add(id(rng.int(0, N - 1), rng.int(0, N - 1)));
        n = Math.ceil((P - 2) / 2) + rng.int(0, 4);
      }
      const bias = rng.pick([1, 3, 6]);
      while (set.size < n) {
        const cand = [];
        let tot = 0;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const q = id(x, y);
          if (set.has(q) || keep.has(q)) continue;
          let k = 0;
          NB.forEach(([dx, dy]) => { if (inside(x + dx, y + dy) && set.has(id(x + dx, y + dy))) k++; });
          if (!k || pinch(set, x, y)) continue;
          const w = k === 1 ? bias : 1;
          cand.push([q, w]);
          tot += w;
        }
        if (!cand.length) break;
        let r = rng.next() * tot;
        let pick = cand[0][0];
        for (const [q, w] of cand) { r -= w; if (r <= 0) { pick = q; break; } }
        set.add(pick);
      }
      const f = info(set);
      if (f.per === P && (hole ? f.holes > 0 && set.size > ring : f.holes === 0) && set.size === n && valid(set)) return set;
    }
    return null;
  }

  function moves(S) {
    const res = [];
    S.forEach((c) => {
      const S1 = new Set(S);
      S1.delete(c);
      const cand = new Set();
      S1.forEach((i) => {
        const x = i % N, y = (i / N) | 0;
        NB.forEach(([dx, dy]) => { if (inside(x + dx, y + dy) && !S1.has(id(x + dx, y + dy)) && id(x + dx, y + dy) !== c) cand.add(id(x + dx, y + dy)); });
      });
      cand.forEach((q) => {
        const S2 = new Set(S1);
        S2.add(q);
        if (valid(S2)) res.push(S2);
      });
    });
    S.forEach((c) => {
      const S1 = new Set(S);
      S1.delete(c);
      if (valid(S1)) res.push(S1);
      const x = c % N, y = (c / N) | 0;
      NB.forEach(([dx, dy]) => {
        if (!inside(x + dx, y + dy) || S.has(id(x + dx, y + dy))) return;
        const S2 = new Set(S);
        S2.add(id(x + dx, y + dy));
        if (valid(S2)) res.push(S2);
      });
    });
    return res;
  }

  RM.register({
    id: 'perimeter',
    name: 'Perimeter',
    difficulty: 7,
    generate(rng, variant) {
      const mode = ['sum', 'const', 'sum', 'diff'][variant % 4];
      let PG;
      if (mode === 'sum') {
        const pairs = [];
        while (pairs.length < 3) {
          const a = 2 * rng.int(3, 8), b = 2 * rng.int(3, 6);
          if (a + b > 22 || (variant === 0 && a + b < 18)) continue;
          if (!pairs.some((p) => p[0] === a && p[1] === b)) pairs.push([a, b]);
        }
        PG = RM.grid3((r, c) => (c < 2 ? pairs[r][c] : pairs[r][0] + pairs[r][1]));
      } else if (mode === 'const') {
        const ps = rng.sample([8, 10, 12, 14, 16, 18, 20], 3);
        PG = RM.grid3((r) => ps[r]);
      } else {
        const rows = [];
        while (rows.length < 3) {
          const b = 2 * rng.int(3, 5), c = 2 * rng.int(3, 6);
          if (!rows.some((p) => p[0] === b && p[1] === c)) rows.push([b, c]);
        }
        PG = RM.grid3((r, c) => (c === 0 ? rows[r][0] + rows[r][1] : c === 1 ? rows[r][0] : rows[r][1]));
      }
      RM.needUnique(PG, PG[2][2], 'numeric');
      const T = PG[2][2];
      const SETS = RM.grid3(() => null);
      const INF = RM.grid3(() => null);
      let nh = 0;
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        const P = PG[r][c];
        const hole = P >= 18 && rng.chance(variant === 0 ? (c === 2 ? 1 : 0.7) : 0.4);
        let s = null;
        for (let t = 0; t < 6 && !s; t++) {
          s = gen(rng, P, hole);
          if (s && (SETS[r].some((o) => o && norm(o) === norm(s)) || (r === 2 && c === 2 && SETS.some((row) => row.some((o) => o && norm(o) === norm(s)))))) s = null;
        }
        RM.need(s);
        SETS[r][c] = s;
        INF[r][c] = info(s);
        if (INF[r][c].holes) nh++;
      }
      if (variant === 0) RM.need(INF[2][2].holes > 0 && nh >= 3);
      RM.needNoConflict(RM.grid3((r, c) => INF[r][c].area), INF[2][2].area, 'numeric');
      RM.needNoConflict(RM.grid3((r, c) => INF[r][c].outer), INF[2][2].outer, 'numeric');
      RM.needNoConflict(RM.grid3((r, c) => INF[r][c].bb), INF[2][2].bb, 'numeric');

      const ansSet = SETS[2][2];
      const ai = INF[2][2];
      const ansNorm = norm(ansSet);
      /* ---- options: one-square moves of a hidden base shape B (the answer is one of them) */
      const baseOpts = moves(ansSet);
      RM.need(baseOpts.length);
      let cands = [];
      for (let bt = 0; bt < 12 && cands.length < 7; bt++) {
        const B = rng.pick(baseOpts);
        const seen = new Set([ansNorm, norm(B)]);
        cands = [];
        const p1 = moves(B);
        let pool = p1.slice();
        rng.sample(p1, Math.min(8, p1.length)).forEach((S) => { pool = pool.concat(moves(S)); });
        rng.shuffle(pool).forEach((S) => {
          const f = info(S);
          const nk = norm(S);
          if (f.per === T || seen.has(nk)) return;
          seen.add(nk);
          cands.push({ S, f, trap: f.holes > 0 && f.outer === T });
        });
      }
      RM.need(cands.length >= 7);
      let chosen = null;
      for (let tr = 0; tr < 60 && !chosen; tr++) {
        const pool = rng.shuffle(cands).sort((a, b) => (b.trap ? 1 : 0) - (a.trap ? 1 : 0));
        const cnt = {};
        const pick = [];
        pool.forEach((c) => {
          if (pick.length >= 7 || (cnt[c.f.per] || 0) >= 4) return;
          cnt[c.f.per] = (cnt[c.f.per] || 0) + 1;
          pick.push(c);
        });
        if (pick.length < 7) continue;
        const ps = pick.map((c) => c.f.per).concat([T]).sort((a, b) => a - b);
        if (ps[0] === T || ps[7] === T) continue;
        if (new Set(ps).size < 3) continue;
        if (pick.filter((c) => c.f.area === ai.area).length > 3) continue;
        if (ai.holes ? pick.filter((c) => c.f.holes).length < 3 : pick.filter((c) => c.f.holes).length > 3) continue;
        chosen = pick;
      }
      RM.need(chosen);
      const flawOf = (c) => {
        const f = c.f;
        let t = `its outline has ${f.per} unit edges${f.holes ? ` (${f.outer} on the outside + ${f.he} around the hole)` : ''}, not ${T}`;
        if (c.trap) t += `; it only looks right if the hole's ${f.he} edges are forgotten`;
        return t;
      };
      const spec = (S) => Array.from(S).sort((a, b) => a - b);
      const options = [{ spec: spec(ansSet), flaws: [] }].concat(chosen.map((c) => ({ spec: spec(c.S), flaws: [flawOf(c)] })));

      const render = (sp) => {
        const set = new Set(sp);
        const pic = new RM.Pic();
        for (let i = 0; i <= N; i++) {
          RM.line(pic, X0 + i * CS, X0, X0 + i * CS, X0 + N * CS, { sw: 0.6, color: RM.LIGHT });
          RM.line(pic, X0, X0 + i * CS, X0 + N * CS, X0 + i * CS, { sw: 0.6, color: RM.LIGHT });
        }
        set.forEach((i) => {
          const x = i % N, y = (i / N) | 0;
          pic.add(`<rect x="${X0 + x * CS}" y="${X0 + y * CS}" width="${CS}" height="${CS}" fill="${pic.paint('light')}" stroke="#fff" stroke-width="1"/>`);
        });
        set.forEach((i) => {
          const x = i % N, y = (i / N) | 0;
          const px = X0 + x * CS, py = X0 + y * CS;
          const seg = (a, b, c, d) => RM.line(pic, a, b, c, d, { sw: 2.6, cap: 'round' });
          if (!set.has(id(x, y - 1)) || y === 0) seg(px, py, px + CS, py);
          if (!set.has(id(x, y + 1)) || y === N - 1) seg(px, py + CS, px + CS, py + CS);
          if (x === 0 || !set.has(id(x - 1, y))) seg(px, py, px, py + CS);
          if (x === N - 1 || !set.has(id(x + 1, y))) seg(px + CS, py, px + CS, py + CS);
        });
        return pic.svg();
      };

      const row = (r) => PG[r];
      const rl = { sum: 'column 3 = column 1 + column 2', const: 'all three shapes of a row have the <b>same</b> perimeter', diff: 'column 3 = column 1 − column 2' }[mode];
      const calc = (r) => (mode === 'sum' ? `${row(r)[0]} + ${row(r)[1]} = ${row(r)[2]}` : mode === 'diff' ? `${row(r)[0]} − ${row(r)[1]} = ${row(r)[2]}` : `${row(r)[0]}, ${row(r)[1]}, ${row(r)[2]}`);
      const rules = [
        { k: 'Perimeter', t: 'count the unit edges on the boundary of the grey shape: the outer outline <b>and</b> the outline of every hole (every edge between a grey square and a white square or the outside). The thick line marks them all.' },
        { k: 'Rule', t: `the perimeters obey: <b>${rl}</b>. Row 1: ${calc(0)}; row 2: ${calc(1)}. The number of squares (area), the outer outline alone and the bounding box follow no rule.` },
        { k: 'Row 3', t: `the first two shapes have perimeters ${row(2)[0]} and ${row(2)[1]}, so the missing shape needs perimeter <b>${T}</b> (${calc(2)}).` },
        { k: 'Answer', t: `the shape with ${ai.area} squares whose outline has ${ai.outer} edges outside${ai.holes ? ` + ${ai.he} around the hole` : ''} = <b>${T}</b> unit edges.` },
      ];
      return {
        difficulty: 7,
        hint: 'count edges, not squares — and do not forget what is inside a shape.',
        panels: SETS.flat().slice(0, 8).map(spec),
        answer: spec(ansSet),
        options,
        render,
        key: (s) => s.join(','),
        rules,
      };
    },
  });
})();
