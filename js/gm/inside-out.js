/* Inside or outside (grandmaster): every panel shows one convoluted closed curve (the outline of a hidden
 * polyomino on an invisible 7 × 7 grid, with deep bays and narrow channels) and a few dots on the grid's cell
 * centres. A dot is black when it lies inside the curve and white when it lies outside (Jordan curve: count the
 * crossings of a ray to the edge, odd = inside). Within a row the dots stay put while the curve moves (variant 0:
 * quarter-turn clockwise about the panel centre; 1: mirrored left–right, then flipped top–bottom; 2: slides one
 * grid step per panel; 3: the curve stays and the dots turn), so the colours have to be re-derived every time. */
(function () {
  'use strict';
  const RM = window.RM;
  const N = 7;
  const CS = 12.8;
  const O = 50 - 3.5 * CS;
  const DR = [-1, 0, 1, 0];
  const DC = [0, 1, 0, -1];
  const DIRN = ['up', 'right', 'down', 'left'];
  const G = {
    id: (r, c) => [r, c],
    r90: (r, c) => [c, N - 1 - r],
    r180: (r, c) => [N - 1 - r, N - 1 - c],
    r270: (r, c) => [N - 1 - c, r],
    fh: (r, c) => [r, N - 1 - c],
    fv: (r, c) => [N - 1 - r, c],
    tr: (r, c) => [c, r],
    at: (r, c) => [N - 1 - c, N - 1 - r],
  };
  const GN = Object.keys(G);
  const GDESC = {
    id: 'left unchanged',
    r90: 'turned a quarter-turn clockwise',
    r180: 'turned a half-turn',
    r270: 'turned a quarter-turn anticlockwise',
    fh: 'mirrored left–right',
    fv: 'flipped top–bottom',
    tr: 'flipped over the top-left/bottom-right diagonal',
    at: 'flipped over the top-right/bottom-left diagonal',
  };
  const ANCH = ['tl', 'tr', 'bl', 'br', 'ctr'];

  const inG = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
  const rOf = (i) => Math.floor(i / N);
  const cOf = (i) => i % N;
  const asc = (a, b) => a - b;
  const same = (a, b) => !!a && !!b && a.length === b.length && a.every((v, i) => v === b[i]);

  function tf(set, g, dr, dc) {
    const out = [];
    for (const i of set) {
      const p = G[g](rOf(i), cOf(i));
      const r = p[0] + (dr || 0);
      const c = p[1] + (dc || 0);
      if (!inG(r, c)) return null;
      out.push(r * N + c);
    }
    return out.sort(asc);
  }
  function bbox(set) {
    let r0 = N, r1 = -1, c0 = N, c1 = -1;
    for (const i of set) {
      const r = rOf(i), c = cOf(i);
      if (r < r0) r0 = r;
      if (r > r1) r1 = r;
      if (c < c0) c0 = c;
      if (c > c1) c1 = c;
    }
    return { r0, r1, c0, c1 };
  }
  function anchored(set, g, a) {
    const b = bbox(set);
    const t = tf(set, g);
    const bt = bbox(t);
    let dr, dc;
    if (a === 'ctr') {
      const x = b.r0 + b.r1 - bt.r0 - bt.r1;
      const y = b.c0 + b.c1 - bt.c0 - bt.c1;
      if (x % 2 || y % 2) return null;
      dr = x / 2;
      dc = y / 2;
    } else {
      dr = a[0] === 't' ? b.r0 - bt.r0 : b.r1 - bt.r1;
      dc = a[1] === 'l' ? b.c0 - bt.c0 : b.c1 - bt.c1;
    }
    return tf(t, 'id', dr, dc);
  }
  /* rigid motion (g about the panel centre, then a shift) taking a to b, or null */
  function motion(a, b) {
    for (const g of GN) {
      const ga = tf(a, g);
      const ba = bbox(ga), bb = bbox(b);
      const dr = bb.r0 - ba.r0, dc = bb.c0 - ba.c0;
      if (same(tf(ga, 'id', dr, dc), b)) return { g, dr, dc };
    }
    return null;
  }
  /* Predictions of every motion hypothesis consistent with all the given transitions:
   * "the same rigid motion each time" and "the same turn/flip, re-anchored at a corner or the centre of the
   * bounding box". An off-grid prediction is returned as null (counts as a conflict). */
  function predictions(pairs, src) {
    const out = [];
    for (const g of GN) {
      let t = null;
      let ok = true;
      for (const [a, b] of pairs) {
        const ga = tf(a, g);
        const ba = bbox(ga), bb = bbox(b);
        const dr = bb.r0 - ba.r0, dc = bb.c0 - ba.c0;
        if ((t && (t[0] !== dr || t[1] !== dc)) || !same(tf(ga, 'id', dr, dc), b)) {
          ok = false;
          break;
        }
        t = [dr, dc];
      }
      if (ok) out.push(tf(tf(src, g), 'id', t[0], t[1]));
      for (const a of ANCH) if (pairs.every(([x, y]) => same(anchored(x, g, a), y))) out.push(anchored(src, g, a));
    }
    return out;
  }

  function toGrid(set) {
    const g = new Uint8Array(N * N);
    for (const i of set) g[i] = 1;
    return g;
  }
  /* crossings of the curve along the four axis rays from cell i to the panel edge */
  function rays(gr, i) {
    const res = [];
    for (let d = 0; d < 4; d++) {
      let cur = gr[i], k = 0, r = rOf(i), c = cOf(i);
      for (;;) {
        r += DR[d];
        c += DC[d];
        const nv = inG(r, c) ? gr[r * N + c] : 0;
        if (nv !== cur) {
          k++;
          cur = nv;
        }
        if (!inG(r, c)) break;
      }
      res.push(k);
    }
    return res;
  }
  const minRay = (gr, i) => Math.min.apply(null, rays(gr, i));
  const isHard = (gr, i) => minRay(gr, i) >= (gr[i] ? 3 : 2);
  function walls(gr, i) {
    let w = 0;
    for (let d = 0; d < 4; d++) {
      const r = rOf(i) + DR[d], c = cOf(i) + DC[d];
      if ((inG(r, c) ? gr[r * N + c] : 0) !== gr[i]) w++;
    }
    return w;
  }

  /* ------------------------------------------------------------ curve (polyomino outline) */
  function grow(rng, H, W, n) {
    for (let tries = 0; tries < 20; tries++) {
      const g = new Uint8Array(H * W);
      const at = (r, c) => r >= 0 && r < H && c >= 0 && c < W && g[r * W + c] === 1;
      const okAdd = (r, c) => {
        if (r < 0 || r >= H || c < 0 || c >= W || g[r * W + c]) return false;
        let nb = 0;
        for (let d = 0; d < 4; d++) if (at(r + DR[d], c + DC[d])) nb++;
        if (nb !== 1) return false;
        for (const a of [-1, 1]) for (const b of [-1, 1]) if (at(r + a, c + b) && !at(r + a, c) && !at(r, c + b)) return false;
        return true;
      };
      const r0 = rng.int(0, H - 1), c0 = rng.int(0, W - 1);
      g[r0 * W + c0] = 1;
      const list = [[r0, c0]];
      let tip = [r0, c0];
      let head = rng.int(0, 3);
      const spin = rng.chance(0.5) ? 1 : 3;
      let fails = 0;
      while (list.length < n && fails < 60) {
        const fromTip = rng.chance(0.8);
        const base = fromTip ? tip : rng.pick(list);
        let dirs;
        if (fromTip) {
          const x = rng.next();
          const L = (head + spin) % 4, R = (head + 4 - spin) % 4;
          dirs = x < 0.45 ? [head, L, R] : x < 0.85 ? [L, head, R] : [R, head, L];
        } else dirs = rng.shuffle([0, 1, 2, 3]);
        let done = false;
        for (const d of dirs) {
          const nr = base[0] + DR[d], nc = base[1] + DC[d];
          if (okAdd(nr, nc)) {
            g[nr * W + nc] = 1;
            list.push([nr, nc]);
            tip = [nr, nc];
            head = d;
            done = true;
            break;
          }
        }
        if (!done) fails++;
      }
      if (list.length === n) return list;
    }
    return null;
  }
  /* boundary as a list of corner vertices [vr, vc]; null if it is not one simple closed curve */
  function corners(set) {
    const gr = toGrid(set);
    const at = (r, c) => inG(r, c) && gr[r * N + c] === 1;
    const next = new Map();
    const V = (r, c) => r * 8 + c;
    let edges = 0;
    const put = (a, b) => {
      if (next.has(a)) edges = -1e9;
      next.set(a, b);
      edges++;
    };
    for (const i of set) {
      const r = rOf(i), c = cOf(i);
      if (!at(r - 1, c)) put(V(r, c), V(r, c + 1));
      if (!at(r, c + 1)) put(V(r, c + 1), V(r + 1, c + 1));
      if (!at(r + 1, c)) put(V(r + 1, c + 1), V(r + 1, c));
      if (!at(r, c - 1)) put(V(r + 1, c), V(r, c));
    }
    if (edges < 0) return null;
    const start = next.keys().next().value;
    const loop = [start];
    let v = next.get(start);
    while (v !== start && loop.length <= edges) {
      loop.push(v);
      v = next.get(v);
    }
    if (loop.length !== edges) return null;
    const pts = loop.map((k) => [Math.floor(k / 8), k % 8]);
    const cs = [];
    for (let j = 0; j < pts.length; j++) {
      const a = pts[(j + pts.length - 1) % pts.length], b = pts[j], c = pts[(j + 1) % pts.length];
      if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) !== 0) cs.push(b);
    }
    return cs;
  }
  function outsideConnected(set) {
    const gr = toGrid(set);
    const M = N + 2;
    const seen = new Uint8Array(M * M);
    const stack = [0];
    seen[0] = 1;
    let cnt = 0;
    while (stack.length) {
      const k = stack.pop();
      const r = Math.floor(k / M) - 1, c = (k % M) - 1;
      if (inG(r, c)) cnt++;
      for (let d = 0; d < 4; d++) {
        const nr = r + DR[d], nc = c + DC[d];
        if (nr < -1 || nr > N || nc < -1 || nc > N) continue;
        const nk = (nr + 1) * M + nc + 1;
        if (seen[nk] || (inG(nr, nc) && gr[nr * N + nc])) continue;
        seen[nk] = 1;
        stack.push(nk);
      }
    }
    return cnt === N * N - set.length;
  }
  function normKey(set) {
    const b = bbox(set);
    return set.map((i) => (rOf(i) - b.r0) * 16 + cOf(i) - b.c0).sort(asc).join('.');
  }
  const asym = (set) => {
    const k = normKey(set);
    return GN.every((g) => g === 'id' || normKey(tf(set, g)) !== k);
  };

  function makeShape(rng, v, slide) {
    for (let t = 0; t < 30; t++) {
      let H = N, W = N, n = rng.int(15, 20);
      if (v === 2) {
        if (slide[1]) W = 5;
        else H = 5;
        n = rng.int(11, 15);
      }
      const list = grow(rng, H, W, n);
      if (!list) continue;
      let r0 = 99, c0 = 99, r1 = -1, c1 = -1;
      for (const [r, c] of list) {
        r0 = Math.min(r0, r);
        r1 = Math.max(r1, r);
        c0 = Math.min(c0, c);
        c1 = Math.max(c1, c);
      }
      const h = r1 - r0 + 1, w = c1 - c0 + 1;
      if (h < 4 || w < 4) continue;
      let minR = 0, maxR = N - h, minC = 0, maxC = N - w;
      if (v === 2) {
        if (slide[0] > 0) maxR -= 2;
        if (slide[0] < 0) minR += 2;
        if (slide[1] > 0) maxC -= 2;
        if (slide[1] < 0) minC += 2;
      }
      if (maxR < minR || maxC < minC) continue;
      const orr = rng.int(minR, maxR), occ = rng.int(minC, maxC);
      const set = list.map(([r, c]) => (r - r0 + orr) * N + c - c0 + occ).sort(asc);
      if (!outsideConnected(set) || !corners(set) || !asym(set)) continue;
      const gr = toGrid(set);
      let hard = 0;
      for (let i = 0; i < N * N; i++) if (isHard(gr, i)) hard++;
      if (hard < (v === 2 ? 2 : 3)) continue;
      return set;
    }
    return null;
  }

  /* ------------------------------------------------------------ dots */
  const rotK = (p, k) => {
    let r = rOf(p), c = cOf(p);
    for (let j = 0; j < k; j++) [r, c] = G.r90(r, c);
    return r * N + c;
  };
  function pickDots(rng, shapes, posFn, last) {
    const grids = shapes.map(toGrid);
    const info = [];
    for (let p = 0; p < N * N; p++) {
      const pos = [0, 1, 2].map((k) => posFn(k, p));
      const col = pos.map((q, k) => grids[k][q]);
      const hard = pos.map((q, k) => isHard(grids[k], q));
      info.push({ p, col, hard, chg: col[0] !== col[1] || col[1] !== col[2] });
    }
    const adj = (a, b) => Math.abs(rOf(a) - rOf(b)) + Math.abs(cOf(a) - cOf(b)) === 1;
    for (let t = 0; t < 30; t++) {
      const n = rng.int(7, 10);
      let chosen = [];
      if (last) {
        const h3 = info.filter((x) => x.hard[2]);
        if (h3.length < 2) return null;
        chosen = rng.sample(h3, Math.min(h3.length, rng.int(2, 3)));
      } else {
        const hv = info.filter((x) => x.hard.some((h, k) => h && !x.col[k]));
        if (hv.length) chosen = rng.sample(hv, Math.min(hv.length, rng.int(1, 2)));
      }
      if (chosen.some((a) => chosen.some((b) => adj(a.p, b.p)))) continue;
      for (const pass of [0, 1])
        for (const x of rng.shuffle(info)) {
          if (chosen.length >= n) break;
          if (chosen.includes(x) || chosen.some((y) => adj(x.p, y.p))) continue;
          if (rng.chance(pass ? 0.5 : x.chg ? 0.8 : 0.25)) chosen.push(x);
        }
      if (chosen.length !== n) continue;
      let ok = true;
      for (let k = 0; k < 3 && ok; k++) {
        const b = chosen.filter((x) => x.col[k]).length;
        if (b < 2 || b > n - 2) ok = false;
      }
      if (!ok) continue;
      if (chosen.filter((x) => x.col[0] !== x.col[1]).length < 2) continue;
      if (chosen.filter((x) => x.col[1] !== x.col[2]).length < 2) continue;
      return chosen.map((x) => x.p);
    }
    return null;
  }

  function makeRow(rng, v, slide, last) {
    for (let t = 0; t < 10; t++) {
      const S = makeShape(rng, v, slide);
      if (!S) continue;
      const shapes =
        v === 0
          ? [S, tf(S, 'r90'), tf(S, 'r180')]
          : v === 1
          ? [S, tf(S, 'fh'), tf(S, 'r180')]
          : v === 2
          ? [S, tf(S, 'id', slide[0], slide[1]), tf(S, 'id', 2 * slide[0], 2 * slide[1])]
          : [S, S, S];
      const posFn = v === 3 ? (k, p) => rotK(p, k) : (k, p) => p;
      const ids = pickDots(rng, shapes, posFn, last);
      if (!ids) continue;
      const grids = shapes.map(toGrid);
      const pos = [0, 1, 2].map((k) => ids.map((p) => posFn(k, p)));
      const col = pos.map((ps, k) => ps.map((q) => grids[k][q]));
      return { shapes, grids, ids, pos, col };
    }
    return null;
  }

  /* ------------------------------------------------------------ drawing */
  function pathD(cs) {
    const P = cs.map(([vr, vc]) => [O + vc * CS, O + vr * CS]);
    const R = 3;
    const m = P.length;
    const f = (p) => RM.fmt(p[0]) + ' ' + RM.fmt(p[1]);
    let d = '';
    for (let j = 0; j < m; j++) {
      const a = P[(j + m - 1) % m], b = P[j], c = P[(j + 1) % m];
      const la = Math.hypot(b[0] - a[0], b[1] - a[1]), lc = Math.hypot(c[0] - b[0], c[1] - b[1]);
      const p1 = [b[0] - ((b[0] - a[0]) / la) * R, b[1] - ((b[1] - a[1]) / la) * R];
      const p2 = [b[0] + ((c[0] - b[0]) / lc) * R, b[1] + ((c[1] - b[1]) / lc) * R];
      d += (j ? 'L' : 'M') + f(p1) + 'Q' + f(b) + ' ' + f(p2);
    }
    return d + 'Z';
  }
  function render(spec) {
    const pic = new RM.Pic();
    pic.add(`<path d="${pathD(corners(spec.s))}" fill="none" stroke="${RM.INK}" stroke-width="2.4" stroke-linejoin="round"/>`);
    for (const [i, b] of spec.d) RM.circle(pic, O + (cOf(i) + 0.5) * CS, O + (rOf(i) + 0.5) * CS, 3.3, { fill: b ? 'black' : 'white', sw: 1.3 });
    return pic.svg();
  }
  const key = (spec) => spec.s.join('.') + '|' + spec.d.map((x) => x[0] + (x[1] ? 'b' : 'w')).join('.');
  const mk = (s, pos, col) => ({ s, d: pos.map((q, j) => [q, col[j]]).sort((a, b) => a[0] - b[0]) });

  function region(q) {
    const r = rOf(q), c = cOf(q);
    const a = r <= 1 ? 'top' : r >= 5 ? 'bottom' : '';
    const b = c <= 1 ? 'left' : c >= 5 ? 'right' : '';
    return a || b ? (a && b ? a + ' ' + b : a || b) : 'near the centre';
  }
  function rayWhy(gr, q) {
    const rs = rays(gr, q);
    const k = Math.min.apply(null, rs);
    return `going ${DIRN[rs.indexOf(k)]} you cross the curve ${k === 0 ? 'no times' : k === 1 ? 'once' : k + ' times'}`;
  }
  const listNums = (a) => (a.length ? (a.length === 1 ? String(a[0]) : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]) : 'none');

  RM.register({
    id: 'inside-out',
    name: 'Inside or outside',
    difficulty: 7,
    generate(rng, variant) {
      const v = variant;
      const slide = v === 2 ? rng.pick([[0, 1], [0, -1], [1, 0], [-1, 0]]) : null;
      const rows = [];
      for (let i = 0; i < 3; i++) {
        const row = makeRow(rng, v, slide, i === 2);
        RM.need(row);
        rows.push(row);
      }
      RM.need(new Set(rows.map((r) => normKey(r.shapes[0]))).size === 3);

      /* ---- uniqueness: how the curve and the dots move */
      const layer = (L) => {
        const step = [];
        for (const i of [0, 1]) step.push([L(i, 0), L(i, 1)], [L(i, 1), L(i, 2)]);
        step.push([L(2, 0), L(2, 1)]);
        const p1 = predictions(step, L(2, 1));
        const p2 = predictions([[L(0, 0), L(0, 2)], [L(1, 0), L(1, 2)]], L(2, 0));
        RM.need(p1.length + p2.length > 0 && p1.concat(p2).every((x) => same(x, L(2, 2))));
      };
      layer((i, k) => rows[i].shapes[k]);
      layer((i, k) => rows[i].pos[k].slice().sort(asc));

      /* ---- uniqueness: what decides the colour of a dot */
      const vis = [];
      for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) if (i < 2 || k < 2) vis.push([i, k]);
      const bbIn = (s, q) => {
        const b = bbox(s);
        return rOf(q) >= b.r0 && rOf(q) <= b.r1 && cOf(q) >= b.c0 && cOf(q) <= b.c1;
      };
      const CH = [
        (gr, q) => gr[q] === 1, // intended: inside
        (gr, q) => gr[q] === 0,
        (gr, q) => gr[q] === 1 || minRay(gr, q) >= 2, // "enclosed on all four sides"
        (gr, q, s) => bbIn(s, q),
        (gr, q) => walls(gr, q) >= 1,
        (gr, q) => walls(gr, q) >= 2,
        (gr, q) => walls(gr, q) >= 3,
        (gr, q) => walls(gr, q) <= 1,
        (gr, q) => minRay(gr, q) % 2 === 1 && minRay(gr, q) >= 1,
      ];
      for (const h of CH) {
        const fits = (i, k) => rows[i].pos[k].every((q, j) => +h(rows[i].grids[k], q, rows[i].shapes[k]) === rows[i].col[k][j]);
        if (vis.every(([i, k]) => fits(i, k))) RM.need(fits(2, 2));
      }
      for (const f of RM.ALL_BOOL) {
        const fits = (i) => rows[i].ids.every((_, j) => +f(rows[i].col[0][j], rows[i].col[1][j]) === rows[i].col[2][j]);
        if (fits(0) && fits(1)) RM.need(fits(2));
      }
      const blacks = rows.map((r) => r.col.map((c) => c.reduce((a, b) => a + b, 0)));
      const whites = rows.map((r) => r.col.map((c) => c.length - c.reduce((a, b) => a + b, 0)));
      RM.needNoConflict(blacks, blacks[2][2], 'numeric');
      RM.needNoConflict(whites, whites[2][2], 'numeric');

      /* ---- panels */
      const spec = (i, k) => mk(rows[i].shapes[k], rows[i].pos[k], rows[i].col[k]);
      const panels = vis.map(([i, k]) => spec(i, k));
      const answer = spec(2, 2);
      const panelKeys = new Set(panels.map(key));

      /* ---- distractors */
      const R = rows[2];
      const S3 = R.shapes[2], P3 = R.pos[2], C3 = R.col[2];
      const derive = (s, pos) => {
        const gr = toGrid(s);
        return pos.map((q) => gr[q]);
      };
      const flip = (col, js) => col.map((c, j) => (js.includes(j) ? 1 - c : c));
      const cands = [];
      const add = (grp, pri, s, pos, col) => {
        if (!s || !pos) return;
        const sp = mk(s, pos, col);
        cands.push({ grp, pri: pri + (panelKeys.has(key(sp)) ? 3 : 0) + rng.next() * 0.6, spec: sp });
      };
      add('A', 0, S3, P3, R.col[1]);
      add('A', 3, S3, P3, R.col[0]);
      add('A', 0.3, S3, P3, P3.map((q) => +(R.grids[2][q] === 1 || minRay(R.grids[2], q) >= 2)));
      const hardJ = P3.map((q, j) => j).filter((j) => isHard(R.grids[2], P3[j]));
      const chgJ = C3.map((c, j) => j).filter((j) => C3[j] !== R.col[1][j]);
      hardJ.forEach((j) => add('A', 0.8, S3, P3, flip(C3, [j])));
      chgJ.forEach((j) => add('A', 1.4, S3, P3, flip(C3, [j])));
      if (hardJ.length >= 2) add('A', 1.8, S3, P3, flip(C3, rng.sample(hardJ, 2)));
      hardJ.forEach((j) => add('A', 2.2, S3, P3, flip(R.col[1], [j])));
      add('A', 4, S3, P3, C3.map((c) => 1 - c));
      if (v === 3) {
        for (const g of GN) {
          const pos = R.pos[1].map((q) => {
            const p = G[g](rOf(q), cOf(q));
            return p[0] * N + p[1];
          });
          if (same(pos.slice().sort(asc), P3.slice().sort(asc))) continue;
          add('B', 0, S3, pos, derive(S3, pos));
          add('C', 0, S3, pos, C3);
        }
        const s90 = tf(S3, 'r90');
        add('B', 0.5, s90, P3, derive(s90, P3));
        add('B', 1, s90, R.pos[1], derive(s90, R.pos[1]));
      } else {
        const S2 = R.shapes[1];
        const wrong = [];
        if (v === 2) {
          const [a, b] = slide;
          for (const t of [[0, 0], [2 * a, 2 * b], [-a, -b], [a + b, b + a], [a - b, b - a]]) wrong.push([tf(S2, 'id', t[0], t[1]), 0]);
          for (const g of ['fh', 'fv', 'r180']) wrong.push([anchored(S3, g, 'tl'), 0.5]);
        } else for (const g of GN) wrong.push([tf(S2, g), 0]);
        for (const [s, p] of wrong) {
          if (!s || same(s, S3)) continue;
          add('B', p, s, P3, derive(s, P3));
          add('C', p, s, P3, C3);
        }
      }
      cands.sort((a, b) => a.pri - b.pri);
      const seen = new Set([key(answer)]);
      const uniq = [];
      for (const c of cands) {
        const k = key(c.spec);
        if (!seen.has(k)) {
          seen.add(k);
          uniq.push(c);
        }
      }
      const picked = [];
      for (const [grp, q] of [['A', 4], ['B', 2], ['C', 1]]) uniq.filter((c) => c.grp === grp).slice(0, q).forEach((c) => picked.push(c));
      for (const c of uniq) if (picked.length < 7 && !picked.includes(c)) picked.push(c);
      RM.need(picked.length === 7);

      /* ---- texts */
      const intended =
        v === 0
          ? 'turned a further quarter-turn clockwise'
          : v === 1
          ? 'flipped top–bottom'
          : v === 2
          ? 'slid one more step ' + (slide[1] > 0 ? 'to the right' : slide[1] < 0 ? 'to the left' : slide[0] > 0 ? 'down' : 'up')
          : '';
      const stepWord = (dr, dc) => {
        const parts = [];
        if (dc) parts.push(`${Math.abs(dc)} step${Math.abs(dc) > 1 ? 's' : ''} to the ${dc > 0 ? 'right' : 'left'}`);
        if (dr) parts.push(`${Math.abs(dr)} step${Math.abs(dr) > 1 ? 's' : ''} ${dr > 0 ? 'down' : 'up'}`);
        return parts.join(' and ');
      };
      const P3s = P3.slice().sort(asc);
      const explain = (sp) => {
        const flaws = [];
        let curveWrong = false;
        if (!same(sp.s, S3)) {
          curveWrong = true;
          const m = motion(R.shapes[1], sp.s);
          if (v === 3) flaws.push('The curve has moved, but within a row the curve stays where it is — only the dots turn.');
          else if (v === 2)
            flaws.push(
              m.g !== 'id'
                ? `The curve has been ${GDESC[m.g]}; it should only slide, without turning or flipping.`
                : `Compared with the middle panel the curve has ${m.dr || m.dc ? 'moved ' + stepWord(m.dr, m.dc) : 'not moved'}${same(sp.s, R.shapes[0]) ? ' (back to where it was in the first panel)' : ''}, but it should have ${intended}.`
            );
          else
            flaws.push(
              `The curve is the middle panel's curve ${GDESC[m.g]}${same(sp.s, R.shapes[0]) ? ' (it is back where it was in the first panel)' : ''}, but it should be ${intended}.`
            );
        }
        const pos = sp.d.map((x) => x[0]);
        if (v === 3 && !same(pos, P3s)) {
          const m = motion(R.pos[1].slice().sort(asc), pos);
          flaws.push(
            `The dots are the middle panel's dots ${m ? GDESC[m.g] : 'moved'}${same(pos, R.pos[0].slice().sort(asc)) ? ' (back where they were in the first panel)' : ''}, but they should be turned a further quarter-turn clockwise about the centre.`
          );
          curveWrong = true;
        }
        const gr = toGrid(sp.s);
        const wrongD = sp.d.map((x, j) => ({ j, q: x[0], b: x[1] })).filter((o) => o.b !== gr[o.q]);
        if (wrongD.length === sp.d.length) flaws.push('Every colour is swapped: a dot must be black when it is inside the curve and white when it is outside.');
        else if (wrongD.length) {
          let pre = '';
          if (!curveWrong) {
            const ck = (col) => key(mk(S3, P3, col)) === key(sp);
            if (ck(R.col[1])) pre = 'The dots kept their colours from the middle panel, but the ' + (v === 3 ? 'dots have moved' : 'curve has moved') + ', so some dots changed side. ';
            else if (ck(R.col[0])) pre = 'The colours are those of the first panel, but the curve and the dots are no longer in the same relative position. ';
          }
          const txt = wrongD
            .slice(0, 3)
            .map((o) => `dot ${o.j + 1} (${region(o.q)}) must be ${gr[o.q] ? 'black' : 'white'}: it is ${gr[o.q] ? 'inside' : 'outside'} the curve (${rayWhy(gr, o.q)})`)
            .join('; ');
          flaws.push(pre + txt.charAt(0).toUpperCase() + txt.slice(1) + (wrongD.length > 3 ? `; and ${wrongD.length - 3} more dot(s) are wrong.` : '.'));
        } else if (curveWrong) flaws[flaws.length - 1] += ' (Its dots are coloured correctly for that wrong position.)';
        return flaws;
      };
      const options = [{ spec: answer, flaws: [] }].concat(picked.map((c) => ({ spec: c.spec, flaws: explain(c.spec) })));
      options.forEach((o, j) => RM.need(j === 0 || o.flaws.length > 0));

      const ad = answer.d;
      const grA = R.grids[2];
      const blackN = ad.map((x, j) => (x[1] ? j + 1 : 0)).filter((x) => x);
      const tricky = ad
        .map((x, j) => ({ j, q: x[0] }))
        .filter((o) => isHard(grA, o.q))
        .map((o) => `dot ${o.j + 1} (${region(o.q)}): ${rayWhy(grA, o.q)}, so it is ${grA[o.q] ? 'inside → black' : 'outside → white'}`);
      const midMap = new Map(R.pos[1].map((q, j) => [R.ids[j], R.col[1][j]]));
      const changed = ad.map((x, j) => j).filter((j) => {
        const id = R.ids[P3.indexOf(ad[j][0])];
        return midMap.get(id) !== ad[j][1];
      });
      const moves =
        v === 0
          ? 'Within a row the dots never move (each row has its own dots). The closed curve <b>turns a quarter-turn clockwise about the centre of the panel</b> from each panel to the next.'
          : v === 1
          ? 'Within a row the dots never move (each row has its own dots). The closed curve is <b>mirrored left–right</b> from the first to the second panel, then <b>flipped top–bottom</b> from the second to the third (so the third is the first turned a half-turn).'
          : v === 2
          ? `Within a row the dots never move (each row has its own dots). The closed curve <b>slides one step ${intended.replace('slid one more step ', '')}</b> from each panel to the next (one step = the spacing between neighbouring dot positions); it never turns.`
          : 'Within a row the closed curve never moves (each row has its own curve). The whole pattern of dots <b>turns a quarter-turn clockwise about the centre of the panel</b> from each panel to the next.';
      const first =
        v === 3
          ? 'Keep the curve of row 3 and turn the dots of the middle panel a further quarter-turn clockwise.'
          : `Take the curve of the middle panel of row 3, ${intended}.`;
      const rules = [
        { k: 'What moves', t: moves },
        {
          k: 'Black = inside',
          t: 'A dot is <b>black when it lies inside the closed curve</b> and white when it lies outside. Because curve and dots move relative to each other, dots change side — the colours are never simply copied from the previous panel.',
        },
        {
          k: 'Inside or outside?',
          t: 'Follow an imaginary straight line from the dot to the edge of the panel and count how many times it crosses the curve: <b>odd = inside, even (0, 2, …) = outside</b>. This settles the dots hidden in deep bays and narrow channels.',
        },
        {
          k: 'Missing panel',
          t:
            `${first} Number its ${ad.length} dots in reading order (top row first, left to right). ` +
            (tricky.length ? `The tricky ones: ${tricky.join('; ')}. ` : '') +
            `Compared with the middle panel, dot${changed.length === 1 ? '' : 's'} ${listNums(changed.map((j) => j + 1))} changed colour. ` +
            `<b>Dots ${listNums(blackN)} are black (inside); the other ${ad.length - blackN.length} are white.</b>`,
        },
      ];

      return {
        panels,
        answer,
        options,
        render,
        key,
        rules,
        hint: 'Is each dot inside the loop or outside it? Count the crossings on the way to the edge.',
        difficulty: v === 2 ? 6 : 7,
      };
    },
  });
})();
