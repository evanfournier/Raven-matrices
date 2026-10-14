/* Lattice areas (grandmaster): every panel shows one polygon whose corners sit on a 7×7 dot lattice, with
 * several slanted edges (directions 1:1, 1:2, 2:1). The only quantity that obeys the row rule is the AREA
 * (in grid squares, half squares included): 3rd = 1st + 2nd (variant 0), the three areas of a row are equal
 * (variant 1), 3rd = 1st − 2nd (variant 2) or the areas change by a constant step along each row (variant 3).
 * In variants 0, 1 and 3 the number of corners follows a separate Latin square (2nd rule). Dots inside, dots
 * on the outline, bounding box, position and number of slanted edges are decoys checked against every simple
 * Raven rule. Areas are measured by cutting into rectangles / right triangles or with Pick's formula. */
(function () {
  'use strict';
  const RM = window.RM;
  const N = 6; // lattice coordinates 0..6
  const SP = 13; // spacing in SVG units
  const O = 11; // origin
  const FILL = '#d5dae1';

  /* ------------------------------------------------------------ lattice geometry */
  const gcd = (a, b) => {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) [a, b] = [b, a % b];
    return a;
  };
  // allowed edge vectors: multiples of (1,0), (0,1), (1,1), (1,2), (2,1) with any signs
  const ALLOW = new Uint8Array(13 * 13);
  const aIdx = (dx, dy) => (dx + 6) * 13 + dy + 6;
  for (let dx = -6; dx <= 6; dx++)
    for (let dy = -6; dy <= 6; dy++) {
      const g = gcd(dx, dy);
      if (!g) continue;
      const a = Math.abs(dx / g);
      const b = Math.abs(dy / g);
      if (Math.max(a, b) <= 2 && Math.min(a, b) <= 1) ALLOW[aIdx(dx, dy)] = 1;
    }
  const allowed = (dx, dy) => Math.abs(dx) <= 6 && Math.abs(dy) <= 6 && ALLOW[aIdx(dx, dy)] === 1;
  const STEPS = [];
  for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) if (allowed(dx, dy)) STEPS.push([dx, dy]);
  const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
  const COS_MIN = Math.cos((26 * Math.PI) / 180);

  function segDist(p, a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(a[0] + t * dx - p[0], a[1] + t * dy - p[1]);
  }
  function segCross(a, b, c, d) {
    const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
    return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
  }

  /* measurements of a polygon given by its lattice vertices */
  function measure(v) {
    const n = v.length;
    let a2 = 0;
    let B = 0;
    let sl = 0;
    let steep = 0;
    for (let i = 0; i < n; i++) {
      const p = v[i];
      const q = v[(i + 1) % n];
      a2 += p[0] * q[1] - p[1] * q[0];
      const dx = q[0] - p[0];
      const dy = q[1] - p[1];
      B += gcd(dx, dy);
      if (dx && dy) {
        sl++;
        if (Math.abs(dx) !== Math.abs(dy)) steep++;
      }
    }
    const orient = Math.sign(a2);
    a2 = Math.abs(a2);
    let reflex = 0;
    for (let i = 0; i < n; i++) {
      const p = v[(i + n - 1) % n];
      const c = v[i];
      const q = v[(i + 1) % n];
      if (cross([c[0] - p[0], c[1] - p[1]], [q[0] - c[0], q[1] - c[1]]) * orient < 0) reflex++;
    }
    const xs = v.map((p) => p[0]);
    const ys = v.map((p) => p[1]);
    const minx = Math.min(...xs);
    const miny = Math.min(...ys);
    return { n, a2, B, I: (a2 - B + 2) / 2, sl, steep, reflex, minx, miny, w: Math.max(...xs) - minx, h: Math.max(...ys) - miny };
  }

  /* legibility: allowed edges, no collinear neighbours, no angle < 26°, simple, no narrow necks */
  function legible(v) {
    const n = v.length;
    for (let i = 0; i < n; i++) {
      const p = v[(i + n - 1) % n];
      const c = v[i];
      const q = v[(i + 1) % n];
      const u = [p[0] - c[0], p[1] - c[1]];
      const w = [q[0] - c[0], q[1] - c[1]];
      if (!allowed(w[0], w[1]) || cross(u, w) === 0) return false;
      if ((u[0] * w[0] + u[1] * w[1]) / Math.hypot(u[0], u[1]) / Math.hypot(w[0], w[1]) > COS_MIN) return false;
    }
    for (let i = 0; i < n; i++)
      for (let j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue;
        const a = v[i];
        const b = v[(i + 1) % n];
        const c = v[j];
        const d = v[(j + 1) % n];
        if (segCross(a, b, c, d)) return false;
        if (Math.min(segDist(a, c, d), segDist(b, c, d), segDist(c, a, b), segDist(d, a, b)) < 0.7) return false;
      }
    return true;
  }

  /* ------------------------------------------------------------ polygon pool (deterministic, built once) */
  let POOL = null;
  function walk(rng, n) {
    const s = [rng.int(0, N), rng.int(0, N)];
    const v = [s];
    const seen = new Set([s[0] * 7 + s[1]]);
    let prev = null;
    let first = null;
    for (let i = 1; i < n - 1; i++) {
      let ok = false;
      for (let t = 0; t < 12 && !ok; t++) {
        const e = rng.pick(STEPS);
        const x = v[i - 1][0] + e[0];
        const y = v[i - 1][1] + e[1];
        if (x < 0 || x > N || y < 0 || y > N || seen.has(x * 7 + y)) continue;
        if (prev && cross(prev, e) === 0) continue;
        v.push([x, y]);
        seen.add(x * 7 + y);
        prev = e;
        if (!first) first = e;
        ok = true;
      }
      if (!ok) return null;
    }
    const last = v[v.length - 1];
    const cands = [];
    for (let x = 0; x <= N; x++)
      for (let y = 0; y <= N; y++) {
        if (seen.has(x * 7 + y)) continue;
        const e1 = [x - last[0], y - last[1]];
        const e2 = [s[0] - x, s[1] - y];
        if (Math.max(Math.abs(e1[0]), Math.abs(e1[1])) > 4 || !allowed(e1[0], e1[1]) || !allowed(e2[0], e2[1])) continue;
        if (cross(prev, e1) === 0 || cross(e1, e2) === 0 || cross(e2, first) === 0) continue;
        cands.push([x, y]);
      }
    if (!cands.length) return null;
    v.push(rng.pick(cands));
    return v;
  }
  function buildPool() {
    const rng = RM.rng(RM.hash('lattice-area', 'pool', 3));
    const pool = {};
    const seen = new Set();
    let id = 0;
    for (let it = 0; it < 12000; it++) {
      const n = it % 9 < 2 ? 3 + (it % 2) : 4 + (it % 4);
      const v = walk(rng, n);
      if (!v) continue;
      const m = measure(v);
      if (m.a2 < 4 || m.a2 > 36 || m.sl < 2 || m.steep < 1 || m.reflex > 2 || m.w < 2 || m.h < 2) continue;
      if (n >= 6 && m.sl < 3) continue;
      const norm = v.map((p) => [p[0] - m.minx, p[1] - m.miny]);
      const k = canon(norm);
      if (seen.has(k) || !legible(v)) continue;
      seen.add(k);
      const key = n + ':' + m.a2;
      (pool[key] = pool[key] || []).push({ id: id++, v: norm, w: m.w, h: m.h });
    }
    return pool;
  }
  const bucket = (n, a2) => {
    if (!POOL) POOL = buildPool();
    return POOL[n + ':' + a2] || [];
  };
  /* congruence class of a pool shape (same polygon up to rotation / reflection), computed lazily */
  const cid = (s) => {
    if (s.cid === undefined) {
      let best = null;
      for (let t = 0; t < 8; t++) {
        const k = canon(transform(s.v, s.w, s.h, t));
        if (best === null || k < best) best = k;
      }
      s.cid = best;
    }
    return s.cid;
  };

  /* canonical key of a vertex cycle (independent of start vertex and direction) */
  function canon(v) {
    const s = v.map((p) => p[0] + ',' + p[1]);
    const n = s.length;
    let best = null;
    for (let i = 0; i < n; i++)
      for (const d of [1, -1]) {
        const t = [];
        for (let k = 0; k < n; k++) t.push(s[RM.mod(i + d * k, n)]);
        const j = t.join(' ');
        if (best === null || j < best) best = j;
      }
    return best;
  }

  /* dihedral transform inside a w×h box, then translation */
  function transform(v, w, h, t) {
    return v.map(([x, y]) => {
      const a = t & 1 ? w - x : x;
      const b = t & 2 ? h - y : y;
      return t & 4 ? [b, a] : [a, b];
    });
  }
  function place(rng, shape, t, dx, dy) {
    const tv = transform(shape.v, shape.w, shape.h, t);
    const W = t & 4 ? shape.h : shape.w;
    const H = t & 4 ? shape.w : shape.h;
    const ox = dx === undefined ? rng.int(0, N - W) : dx;
    const oy = dy === undefined ? rng.int(0, N - H) : dy;
    return { v: tv.map(([x, y]) => [x + ox, y + oy]), sid: shape.id };
  }

  const half = (a2) => (a2 % 2 ? (a2 > 1 ? Math.floor(a2 / 2) : '') + '½' : String(a2 / 2));
  const sq = (a2) => half(a2) + (a2 === 2 ? ' square' : ' squares');
  const pickTxt = (m) => `${m.I} inside + ${m.B} on the outline ÷ 2 − 1 = ${half(m.a2)}`;
  const ORD = ['1st', '2nd', '3rd'];

  RM.register({
    id: 'lattice-area',
    name: 'Lattice areas',
    difficulty: 7,
    generate(rng, variant) {
      const V = variant % 4;
      const RULE = ['sum', 'equal', 'diff', 'prog'][V];
      const latinCounts = V !== 2;

      /* ---- corner counts */
      let C;
      let cvals;
      if (latinCounts) {
        cvals = rng.sample([4, 5, 6, 7], 3).sort((a, b) => a - b);
        C = RM.latinGrid(rng, cvals);
        RM.needUnique(C, C[2][2], 'numeric');
      } else {
        // corners are a pure decoy here: no simple rule may fit them
        for (let t = 0; t < 60; t++) {
          C = RM.grid3(() => rng.int(4, 7));
          if (!RM.preds.numeric(RM.grid3((r, c) => (r === 2 && c === 2 ? undefined : C[r][c]))).length) break;
          C = null;
        }
        RM.need(C);
        cvals = [4, 5, 6, 7];
      }
      const ansN = C[2][2];

      /* ---- area grid (half squares), local retries */
      const drawA = () => {
        if (RULE === 'sum')
          return [0, 1, 2].map(() => {
            const a = rng.int(5, 15);
            const b = rng.int(5, 15);
            return [a, b, a + b];
          });
        if (RULE === 'equal') return rng.sample(RM.range(20), 3).map((i) => [8 + i, 8 + i, 8 + i]);
        if (RULE === 'diff')
          return [0, 1, 2].map(() => {
            const b = rng.int(4, 13);
            const c = rng.int(4, 14);
            return [b + c, b, c];
          });
        return [0, 1, 2].map(() => {
          const d = rng.pick([-6, -5, -4, -3, -2, 2, 3, 4, 5, 6]);
          const a = d > 0 ? rng.int(4, 30 - 2 * d) : rng.int(4 - 2 * d, 30);
          return [a, a + d, a + 2 * d];
        });
      };
      const aOk = (A) => {
        if (![].concat(...A).every((x) => x >= 4 && x <= 30)) return false;
        if ([].concat(...A).filter((x) => x % 2).length < 3) return false; // half squares must matter
        if (RULE === 'prog' && new Set(A.map((r) => r[1] - r[0])).size < 2) return false;
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (bucket(C[r][c], A[r][c]).length < (r + c === 4 ? 3 : 2)) return false;
        if (latinCounts && cvals.some((n) => n !== ansN && !bucket(n, A[2][2]).length)) return false;
        return RM.unique(A, A[2][2], 'numeric') && RM.unique(A.map((r) => r.map((x) => x / 2)), A[2][2] / 2, 'numeric');
      };
      let A = null;
      for (let t = 0; t < 80 && !A; t++) {
        const a = drawA();
        if (aOk(a)) A = a;
      }
      RM.need(A);
      const ansA = A[2][2];

      /* ---- decoy attributes: no simple rule on them may point to anything but the answer */
      const DECOYS = [
        ['I', (m) => m.I],
        ['B', (m) => m.B],
        ['IB', (m) => m.I + m.B],
        ['w', (m) => m.w],
        ['h', (m) => m.h],
        ['box', (m) => m.w * m.h],
        ['wh', (m) => m.w + m.h],
        ['x', (m) => m.minx, 1],
        ['y', (m) => m.miny, 1],
        ['cx', (m) => 2 * m.minx + m.w, 1],
        ['cy', (m) => 2 * m.miny + m.h, 1],
        ['sl', (m) => m.sl],
        ['hv', (m) => m.n - m.sl],
        ['reflex', (m) => m.reflex],
      ];
      if (!latinCounts) DECOYS.push(['n', (m) => m.n]);

      /* ---- the 8 visible polygons (no two congruent): shapes first, then positions, both tuned so that
       * the decoy attributes follow no simple rule (or only rules that agree with the answer) */
      const evalD = (list, MM) => {
        let bad = 0;
        const req = [];
        for (const [, f, pos] of list) {
          const P = RM.preds.numeric(RM.grid3((r, c) => (r === 2 && c === 2 ? undefined : f(MM[r * 3 + c]))));
          if (!P.length) continue;
          if (P.some((p) => p[1] !== P[0][1])) bad++;
          else req.push([f, P[0][1], pos]);
        }
        return { bad, req, score: bad * 10 + req.length };
      };
      const SHAPE_D = DECOYS.filter((d) => !d[2]);
      const POS_D = DECOYS.filter((d) => d[2]);
      const cells = [];
      const drawCell = (i) => {
        const b = bucket(C[Math.floor(i / 3)][i % 3], A[Math.floor(i / 3)][i % 3]).filter((s) => !cells.some((q, j) => j !== i && q && q.cid === cid(s)));
        if (!b.length) return null;
        const s = rng.pick(b);
        const tr = rng.int(0, 7);
        const v = transform(s.v, s.w, s.h, tr);
        return { s, tr, cid: cid(s), m: measure(v) };
      };
      for (let i = 0; i < 8; i++) cells[i] = drawCell(i);
      RM.need(cells.every((q) => q));
      let cur = evalD(SHAPE_D, cells.map((q) => q.m));
      for (let it = 0; it < 70 && cur.score > 1; it++) {
        const i = rng.int(0, 7);
        const old = cells[i];
        const nq = drawCell(i);
        if (!nq) continue;
        cells[i] = nq;
        const e = evalD(SHAPE_D, cells.map((q) => q.m));
        if (e.score <= cur.score) cur = e;
        else cells[i] = old;
      }
      RM.need(cur.bad === 0);
      let best = null;
      for (let it = 0; it < 30 && !(best && best.score === 0); it++) {
        const off = cells.map((q) => [rng.int(0, N - q.m.w), rng.int(0, N - q.m.h)]);
        const e = evalD(POS_D, cells.map((q, i) => ({ minx: off[i][0], miny: off[i][1], w: q.m.w, h: q.m.h })));
        if (!best || e.score < best.score) best = Object.assign(e, { off });
      }
      RM.need(best.bad === 0);
      const panelSpecs = cells.map((q, i) => place(rng, q.s, q.tr, best.off[i][0], best.off[i][1]));
      const M = panelSpecs.map((s) => measure(s.v));
      const used = new Set(cells.map((q) => q.cid));

      /* ---- the answer: right area and corner count, agreeing with any rule a decoy happens to fit */
      let answer = null;
      {
        const fixed = cur.req;
        const moving = best.req;
        const ab = rng.shuffle(bucket(ansN, ansA).filter((s) => !used.has(cid(s))));
        for (let k = 0; k < ab.length && !answer; k++) {
          for (const tr of rng.shuffle(RM.range(8))) {
            const v0 = transform(ab[k].v, ab[k].w, ab[k].h, tr);
            if (!fixed.every(([f, want]) => f(measure(v0)) === want)) continue;
            const W = tr & 4 ? ab[k].h : ab[k].w;
            const H = tr & 4 ? ab[k].w : ab[k].h;
            const spots = [];
            for (let ox = 0; ox <= N - W; ox++)
              for (let oy = 0; oy <= N - H; oy++) {
                const m = { minx: ox, miny: oy, w: W, h: H };
                if (moving.every(([f, want]) => f(m) === want)) spots.push([ox, oy]);
              }
            if (!spots.length) continue;
            const [ox, oy] = rng.pick(spots);
            answer = place(rng, ab[k], tr, ox, oy);
            used.add(cid(ab[k]));
            break;
          }
        }
      }
      RM.need(answer);
      const am = measure(answer.v);
      const pref = [am.w, am.h];
      const pickShape = (n, a2) => {
        let b = bucket(n, a2).filter((s) => !used.has(cid(s)));
        const p = b.filter((s) => (s.w === pref[0] && s.h === pref[1]) || (s.w === pref[1] && s.h === pref[0]));
        if (p.length && rng.chance(0.7)) b = p;
        if (!b.length) return null;
        return rng.pick(b);
      };

      /* ---- distractors */
      const isRight = (m) => m.a2 === ansA && (!latinCounts || m.n === ansN);
      const cands = [];
      const areaFlaw = (m, why) => `its area is ${sq(m.a2)} (${pickTxt(m)}), not ${half(ansA)}${why ? ' — ' + why : ''}`;
      const latinTxt = () => `one ${cvals[0]}-, one ${cvals[1]}- and one ${cvals[2]}-cornered polygon`;
      const countFlaw = (m) => `it has ${m.n} corners; the missing polygon needs ${ansN} (each row and each column has ${latinTxt()})`;
      const flawsOf = (m, why) => {
        const f = [];
        if (m.a2 !== ansA) f.push(areaFlaw(m, why));
        if (latinCounts && m.n !== ansN) f.push((m.a2 === ansA ? `its area (${sq(ansA)}) is right, but ` : '') + countFlaw(m));
        return f;
      };
      const add = (tag, n, a2, why, prio) => {
        if (a2 < 4 || a2 > 36) return;
        const s = pickShape(n, a2);
        if (!s) return;
        used.add(cid(s));
        const sp = place(rng, s, rng.int(0, 7));
        const m = measure(sp.v);
        cands.push({ tag, spec: sp, m, flaws: flawsOf(m, why), prio: prio + rng.next() });
      };
      const others = cvals.filter((x) => x !== ansN);
      // right area, wrong number of corners
      if (latinCounts) others.forEach((n) => add('count', n, ansA, '', 0));
      // copies of the two polygons of row 3
      [0, 1].forEach((c) => {
        const sp = { v: panelSpecs[6 + c].v.map((p) => p.slice()), sid: panelSpecs[6 + c].sid };
        const m = M[6 + c];
        const f = flawsOf(m, '');
        f.unshift(`it is simply the ${ORD[c]} polygon of row 3 again`);
        cands.push({ tag: 'copy', spec: sp, m, flaws: f, prio: 1 + rng.next() });
      });
      // the right row rule misapplied
      const [p1, p2] = A[2];
      const conf = [];
      if (RULE === 'sum') conf.push([Math.abs(p1 - p2), 'the two areas were subtracted instead of added']);
      if (RULE === 'diff') conf.push([p1 + p2, 'the two areas were added instead of subtracted']);
      if (RULE === 'diff') conf.push([p2 - p1 > 0 ? p2 - p1 : p1 + p2 - 2, 'wrong subtraction']);
      if (RULE === 'equal') [0, 1].forEach((r) => conf.push([A[r][0], `that is the area of row ${r + 1}`]));
      if (RULE === 'prog')
        [0, 1].forEach((r) => {
          const d = A[r][1] - A[r][0];
          if (d !== p2 - p1) conf.push([p2 + d, `the step of row ${r + 1} (${d > 0 ? '+' : '−'}${half(Math.abs(d))}) was used instead of this row's own step`]);
        });
      conf.forEach(([a2, why]) => {
        if (a2 === ansA) return;
        add('rule', rng.pick(cvals), a2, why, 2);
      });
      // slightly wrong areas (half a square, one square, two squares off)
      const deltas = rng.shuffle([-1, 1, -2, 2, -3, 3, -4, 4]);
      deltas.forEach((d, i) => add('area', i % 3 === 2 ? rng.pick(others.length ? others : cvals) : ansN, ansA + d, '', 3 + i / 4));

      /* ---- choose 7: dedupe, drop correct ones, balance */
      const keys = new Set([canon(answer.v)]);
      const pool = cands
        .filter((c) => !isRight(c.m) && c.flaws.length)
        .sort((a, b) => a.prio - b.prio)
        .filter((c) => {
          const k = canon(c.spec.v);
          if (keys.has(k)) return false;
          keys.add(k);
          return true;
        });
      const chosen = [];
      const take = (pred, k) => {
        for (const c of pool) {
          if (k <= 0) break;
          if (!chosen.includes(c) && pred(c)) {
            chosen.push(c);
            k--;
          }
        }
      };
      if (latinCounts) {
        take((c) => c.m.a2 === ansA, 2); // right area, wrong corners (a copy can be one of them in variant 1)
        RM.need(chosen.length === 2);
      }
      take((c) => c.tag === 'copy', 1);
      take((c) => c.tag === 'rule', 1);
      take((c) => c.tag === 'area' && c.m.n === ansN, latinCounts ? 2 : 3);
      take((c) => c.tag === 'area', 7 - chosen.length);
      take(() => true, 7 - chosen.length);
      RM.need(chosen.length === 7);
      // the answer's features must not be rare among the options
      const optM = [am].concat(chosen.map((c) => c.m));
      RM.need(optM.filter((m) => m.n === ansN).length >= 2 && (!latinCounts || optM.filter((m) => m.n === ansN).length <= 4));
      RM.need(optM.filter((m) => m.w === am.w && m.h === am.h).length >= 2 || optM.filter((m) => m.w * m.h === am.w * am.h).length >= 2);
      RM.need(chosen.every((c) => c.flaws.length));
      // a decoy that happens to fit a rule (always one agreeing with the answer) must not single out the answer
      RM.need(cur.req.concat(best.req).every(([f, want]) => optM.filter((m) => f(m) === want).length >= 2));

      /* ---- correction */
      const rowTxt = (r) => {
        const a = A[r].slice(0, r === 2 ? 2 : 3).map(half);
        if (RULE === 'sum') return r === 2 ? `${a[0]} + ${a[1]}` : `${a[0]} + ${a[1]} = ${a[2]}`;
        if (RULE === 'diff') return r === 2 ? `${a[0]} − ${a[1]}` : `${a[0]} − ${a[1]} = ${a[2]}`;
        if (RULE === 'equal') return a.join(', ');
        const d = A[r][1] - A[r][0];
        return a.join(' → ') + ` (${d > 0 ? '+' : '−'}${half(Math.abs(d))} each step)`;
      };
      const RT = {
        sum: 'in every row, the area of the 3rd polygon = area of the 1st + area of the 2nd',
        equal: 'the three polygons of a row all have the <b>same area</b>, however different they look',
        diff: 'in every row, the area of the 3rd polygon = area of the 1st − area of the 2nd',
        prog: 'along every row the area changes by the <b>same step</b> from one panel to the next (each row has its own step)',
      }[RULE];
      const d3 = A[2][1] - A[2][0];
      const ansTxt = {
        sum: `${half(p1)} + ${half(p2)} = <b>${sq(ansA)}</b>`,
        diff: `${half(p1)} − ${half(p2)} = <b>${sq(ansA)}</b>`,
        equal: `same as the other two: <b>${sq(ansA)}</b>`,
        prog: `${half(p2)} ${d3 > 0 ? '+' : '−'} ${half(Math.abs(d3))} = <b>${sq(ansA)}</b>`,
      }[RULE];
      const rules = [
        {
          k: 'Measure',
          t: 'each polygon has its corners on the dots; one grid square (between four neighbouring dots) is the unit. Measure the surface: cut it into rectangles and right-angled triangles — a slanted edge cuts its little w × h box exactly in half (area w × h ÷ 2) — or use Pick’s formula: <b>area = dots inside + dots on the outline (corners included) ÷ 2 − 1</b>.',
        },
        { k: 'Areas', t: `${RT}. Row 1: ${rowTxt(0)}. Row 2: ${rowTxt(1)}.` },
      ];
      if (latinCounts)
        rules.push({
          k: 'Corners',
          t: `the number of corners follows its own rule: every row and every column has ${latinTxt()}. Row 3 already has ${M[6].n} and ${M[7].n} corners → the missing one has <b>${ansN} corners</b>.`,
        });
      rules.push({
        k: 'Decoys',
        t: `${latinCounts ? '' : 'the number of corners, '}the number of dots inside, the size and position of the polygon and the number of slanted edges are only there to distract: none of them leads to a different answer.`,
      });
      rules.push({
        k: 'Row 3',
        t: `1st polygon: ${pickTxt(M[6])} squares; 2nd: ${pickTxt(M[7])} squares. Missing area: ${ansTxt}.`,
      });
      rules.push({
        k: 'Answer',
        t: `the polygon with an area of <b>${sq(ansA)}</b>${latinCounts ? ` and <b>${ansN} corners</b>` : ''} (${pickTxt(am)}).`,
      });

      return {
        difficulty: V === 1 || V === 2 ? 6 : 7,
        hint: 'measure each surface in grid squares — a slanted edge cuts its little box exactly in half.',
        panels: panelSpecs,
        answer,
        options: [{ spec: answer, flaws: [] }].concat(chosen.map((c) => ({ spec: c.spec, flaws: c.flaws }))),
        key: (s) => canon(s.v),
        render(sp) {
          const pic = new RM.Pic();
          const P = (p) => [O + SP * p[0], O + SP * p[1]];
          const pts = sp.v.map((p) => P(p).map(RM.fmt).join(',')).join(' ');
          // fill, then the dots (visible inside), then a solid outline on top
          pic.add(`<polygon points="${pts}" fill="${FILL}" stroke="none"/>`);
          for (let x = 0; x <= N; x++) for (let y = 0; y <= N; y++) RM.circle(pic, O + SP * x, O + SP * y, 1.45, { fill: '#8f97a3', sw: 0 });
          pic.add(`<polygon points="${pts}" fill="none" stroke="${RM.INK}" stroke-width="2.2" stroke-linejoin="round"/>`);
          return pic.svg();
        },
        rules,
      };
    },
  });
})();
