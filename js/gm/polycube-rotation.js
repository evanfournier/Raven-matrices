/* 3D rotation (grandmaster): Shepard–Metzler style mental rotation in a 2×2 analogy. The top-left panel shows a
 * rigid object made of identical cubes (drawn in a slightly off-isometric view, white tops, light-gray front-left
 * faces, dark-gray front-right faces); the top-right panel shows the same object turned in space. The bottom-left
 * object is the top-left one, same orientation, with one extra cube (variant 3: one cube moved); the answer is that
 * object turned exactly like the top row. Variant 0: two quarter turns about different axes (a third of a turn about
 * a corner-to-corner diagonal); 1: a quarter turn about a horizontal axis; 2: a half turn (about a face or an edge
 * axis); 3: any quarter turn, with a moved cube. Objects have no symmetry at all (no rotation, no mirror), so the
 * turn A→B is the only one of the 48 cube symmetries that fits; distractors are mirror images, wrong turns, and the
 * correctly turned object with the extra cube on the wrong cube and/or pointing in its unturned direction. */
(function () {
  'use strict';
  const RM = window.RM;

  /* ---------------------------------------------------------------- camera
   * Slightly off-isometric (azimuth 37°, elevation 26°): no two lattice positions project onto the same point,
   * unlike a true isometric view where (1,1,1) vanishes. Visible faces: top (+z), +x (front-left), +y (front-right). */
  const D2R = Math.PI / 180;
  const AZ = 37 * D2R, EL = 26 * D2R;
  const V = [Math.cos(EL) * Math.cos(AZ), Math.cos(EL) * Math.sin(AZ), Math.sin(EL)];
  const SR = [-Math.sin(AZ), Math.cos(AZ), 0];
  const SU = [-Math.sin(EL) * Math.cos(AZ), -Math.sin(EL) * Math.sin(AZ), Math.cos(EL)];
  const proj = (p) => [p[0] * SR[0] + p[1] * SR[1], -(p[0] * SU[0] + p[1] * SU[1] + p[2] * SU[2])];
  const FACE = [
    { o: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], a: V[2], fill: '#efefef' }, // top
    { o: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1], a: V[0], fill: '#bdbdbd' }, // +x, front-left
    { o: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1], a: V[1], fill: '#6f6f6f' }, // +y, front-right
  ];
  const FULL = V[0] + V[1] + V[2];

  /* ---------------------------------------------------------------- the 48 cube symmetries */
  const MATS = [];
  [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]].forEach((p) => {
    for (let s = 0; s < 8; s++) {
      const m = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      for (let k = 0; k < 3; k++) m[k][p[k]] = (s >> k) & 1 ? -1 : 1;
      MATS.push(m);
    }
  });
  const det = (m) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const ROT = MATS.filter((m) => det(m) === 1);
  const IMP = MATS.filter((m) => det(m) === -1);
  const ap = (m, v) => [0, 1, 2].map((k) => m[k][0] * v[0] + m[k][1] * v[1] + m[k][2] * v[2]);
  const mul = (a, b) => [0, 1, 2].map((i) => [0, 1, 2].map((j) => a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j]));
  const inv = (m) => [0, 1, 2].map((i) => [0, 1, 2].map((j) => m[j][i]));
  const trace = (m) => m[0][0] + m[1][1] + m[2][2];
  const mk = (m) => m.map((r) => r.join(',')).join('|');
  const I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  // quarter turns (+90° by the right-hand rule) about x, y, z and their inverses
  const QP = [
    [[1, 0, 0], [0, 0, -1], [0, 1, 0]],
    [[0, 0, 1], [0, 1, 0], [-1, 0, 0]],
    [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
  ];
  const QT = QP.concat(QP.map(inv));
  const qAxis = (m) => [0, 1, 2].find((k) => m[k][k] === 1);

  /* ---------------------------------------------------------------- polycube helpers */
  const NB = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const same = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  const tf = (m, cells) => cells.map((c) => ap(m, c));
  function norm(cells) {
    const mn = [0, 1, 2].map((k) => Math.min(...cells.map((c) => c[k])));
    return cells.map((c) => sub(c, mn)).sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  }
  const ckey = (cells) => norm(cells).map((c) => c.join(',')).join(';');
  const has = (cells, p) => cells.some((c) => same(c, p));
  const nbCount = (cells, p) => NB.filter((d) => has(cells, add(p, d))).length;
  const fits = (cells, lim) => [0, 1, 2].every((k) => Math.max(...cells.map((c) => c[k])) - Math.min(...cells.map((c) => c[k])) < lim);
  const symCount = (cells) => {
    const k = ckey(cells);
    return MATS.filter((m) => ckey(tf(m, cells)) === k).length;
  };
  const enc = (c) => (c[0] + 8) * 400 + (c[1] + 8) * 20 + (c[2] + 8);
  const ext = (cs, k) => Math.max(...cs.map((c) => c[k]));
  // largest number of cubes two normalised objects have in common (best translation)
  function overlap(S, D) {
    const set = new Set(D.map(enc));
    let best = 0;
    for (let x = -ext(S, 0); x <= ext(D, 0); x++)
      for (let y = -ext(S, 1); y <= ext(D, 1); y++)
        for (let z = -ext(S, 2); z <= ext(D, 2); z++) {
          let n = 0;
          for (const c of S) if (set.has(enc([c[0] + x, c[1] + y, c[2] + z]))) n++;
          if (n > best) best = n;
        }
    return best;
  }
  // does normalised S contain a translated copy of normalised P (same orientation)?
  function contains(S, P) {
    const set = new Set(S.map(enc));
    for (let x = 0; x <= ext(S, 0) - ext(P, 0); x++)
      for (let y = 0; y <= ext(S, 1) - ext(P, 1); y++)
        for (let z = 0; z <= ext(S, 2) - ext(P, 2); z++)
          if (P.every((c) => set.has(enc([c[0] + x, c[1] + y, c[2] + z])))) return true;
    return false;
  }

  /* Legibility: ray-cast samples of the three visible faces of every cube towards the viewer. Every cube must keep a
   * good part of its outline visible and at least one face mostly visible, so that no cube is hidden or guessable. */
  const NS = 6;
  function rayHits(p, q) {
    let t0 = 1e-6, t1 = Infinity;
    for (let k = 0; k < 3; k++) {
      const a = (q[k] - p[k]) / V[k], b = (q[k] + 1 - p[k]) / V[k];
      if (a > t0) t0 = a;
      if (b < t1) t1 = b;
    }
    return t1 - t0 > 1e-6;
  }
  function legible(cells) {
    for (const c of cells) {
      const front = cells.filter((q) => q !== c && q[0] >= c[0] && q[1] >= c[1] && q[2] >= c[2]);
      let best = 0;
      for (const f of FACE) {
        if (has(cells, add(c, f.o))) continue; // glued to a neighbour: not a drawn face of this cube
        let vis = 0;
        for (let i = 0; i < NS; i++)
          for (let j = 0; j < NS; j++) {
            const s = (i + 0.5) / NS, t = (j + 0.5) / NS;
            const p = [0, 1, 2].map((k) => c[k] + f.o[k] + f.u[k] * s + f.v[k] * t);
            if (!front.some((q) => rayHits(p, q))) vis++;
          }
        const fr = vis / (NS * NS);
        if (fr > 0 && fr < LG[1]) return false; // no thin slivers
        if (fr > best) best = fr;
      }
      if (best < LG[0]) return false;
    }
    return true;
  }
  const LG = [1, 0.25]; // [some exposed face fully visible, no exposed face visible by less than a quarter]

  /* ---------------------------------------------------------------- words */
  const DN = { '0,1': 'front-left', '0,-1': 'back-right', '1,1': 'front-right', '1,-1': 'back-left', '2,1': 'up', '2,-1': 'down' };
  const dn = (v) => {
    const k = [0, 1, 2].find((i) => v[i] !== 0);
    return DN[k + ',' + v[k]];
  };
  const AXN = ['front-left ↔ back-right', 'front-right ↔ back-left', 'vertical'];
  const RUNS = ['front-left ↔ back-right', 'front-right ↔ back-left', 'vertically'];
  const E = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const mapping = (m) => `up → ${dn(ap(m, E[2]))}, front-left → ${dn(ap(m, E[0]))}, front-right → ${dn(ap(m, E[1]))}`;
  function qPhrase(m) {
    const k = qAxis(m);
    if (k === 2) {
      const ccw = same(ap(m, E[0]), E[1]);
      return `a quarter turn about the vertical axis, ${ccw ? 'anticlockwise' : 'clockwise'} seen from above`;
    }
    return `a quarter turn about the ${AXN[k]} axis, the top tipping over towards the ${dn(ap(m, E[2]))}`;
  }
  function rotPhrase(m) {
    const t = trace(m);
    if (t === 1) return qPhrase(m);
    if (t === -1) {
      const k = [0, 1, 2].find((i) => m[i][i] === 1);
      if (k !== undefined) return `a half turn about the ${AXN[k]} axis`;
      return 'a half turn about a slanting axis (halfway between two of the cube directions)';
    }
    // three-fold: two quarter turns in a row; prefer a decomposition that starts with a turn about the vertical axis
    let best = null;
    for (const q1 of QT)
      for (const q2 of QT)
        if (qAxis(q1) !== qAxis(q2) && mk(mul(q2, q1)) === mk(m) && (!best || (qAxis(q1) === 2 && qAxis(best[0]) !== 2))) best = [q1, q2];
    return `two quarter turns in a row — first ${qPhrase(best[0])}, then ${qPhrase(best[1])}`;
  }
  const sides = (dirs) => {
    const w = dirs.map(dn);
    return w.length === 1 ? `its ${w[0]} side` : `its ${w.slice(0, -1).join(', ')} and ${w[w.length - 1]} sides`;
  };
  // a cube described by the directions of its neighbours, if that signature is unique in the object
  function describe(cells, a, m) {
    const sig = (c) => NB.filter((d) => has(cells, add(c, d)));
    const sk = (c) => sig(c).map((d) => d.join()).sort().join('|');
    if (cells.filter((c) => sk(c) === sk(a)).length === 1) return `the cube whose other neighbours are on ${sides(sig(a).map((d) => ap(m, d)))}`;
    // an end cube: name it by the length of the straight row it ends
    const runLen = (c) => {
      const s = sig(c);
      if (s.length !== 1) return 0;
      let L = 1;
      while (has(cells, add(c, s[0].map((x) => x * L)))) L++;
      return L;
    };
    const L = runLen(a);
    if (L >= 2 && cells.filter((c) => runLen(c) === L).length === 1) return `the loose end cube (one neighbour only) that finishes a straight row of ${RM.word(L)} cubes`;
    return null;
  }
  function longestRow(cells) {
    const runs = [];
    for (let k = 0; k < 3; k++)
      for (const c of cells) {
        if (has(cells, sub(c, E[k]))) continue;
        let L = 1;
        while (has(cells, add(c, E[k].map((x) => x * L)))) L++;
        runs.push({ k, L });
      }
    runs.sort((a, b) => b.L - a.L);
    return runs[0].L >= 3 && (runs.length < 2 || runs[1].L < runs[0].L) ? runs[0] : null;
  }

  /* ---------------------------------------------------------------- one draw */
  function attempt(rng, variant) {
    const moved = variant === 3;
    let pool;
    if (variant === 0) pool = ROT.filter((m) => trace(m) === 0);
    else if (variant === 1) pool = QT.filter((m) => qAxis(m) !== 2);
    else if (variant === 2) pool = ROT.filter((m) => trace(m) === -1);
    else pool = QT;

    // a Shepard–Metzler-like "snake": straight arms joined at right angles, 3 arms along the 3 different axes
    // (sometimes a 4th short arm); no cube touches the snake anywhere but at its two path neighbours
    const lens = rng.chance(0.8)
      ? rng.pick([[1, 1, 3], [1, 3, 1], [3, 1, 1], [1, 2, 2], [2, 1, 2], [2, 2, 1]])
      : rng.pick([[2, 1, 1, 1], [1, 2, 1, 1], [1, 1, 2, 1], [1, 1, 1, 2]]);
    const axes = rng.shuffle([0, 1, 2]);
    axes.push(rng.pick([axes[0], axes[1]]));
    const X = [[0, 0, 0]];
    for (let i = 0; i < lens.length; i++) {
      const dir = E[axes[i]].map((x) => x * (rng.chance(0.5) ? 1 : -1));
      for (let j = 0; j < lens[i]; j++) {
        const c = add(X[X.length - 1], dir);
        if (has(X, c) || nbCount(X, c) !== 1) return null;
        X.push(c);
      }
    }
    if (!fits(X, 4)) return null;
    if (symCount(X) !== 1) return null; // no rotation AND no mirror symmetry
    const R = rng.pick(pool);
    const B = tf(R, X);
    // hypotheses for the top row: every one of the 48 cube symmetries (turns and mirror images) mapping A onto B
    if (MATS.filter((T) => ckey(tf(T, X)) === ckey(B)).length !== 1) return null;

    // the modification (column relation)
    const mods = [];
    for (const m of moved ? X.filter((c) => nbCount(X, c) === 1) : [null]) {
      const base = m ? X.filter((c) => !same(c, m)) : X;
      for (const a of base)
        for (const d of NB) {
          const e = add(a, d);
          if (has(X, e) || nbCount(base, e) !== 1) continue;
          mods.push({ m, base, a, d, e });
        }
    }
    let mod = null, C = null;
    for (const md of rng.shuffle(mods)) {
      const Cc = md.base.concat([md.e]);
      if (!fits(Cc, 4) || same(ap(R, md.d), md.d) || symCount(Cc) !== 1) continue;
      if (md.m && ckey(Cc) === ckey(X)) continue;
      mod = md;
      C = Cc;
      break;
    }
    if (!mod) return null;
    const D = tf(R, C);
    const An = norm(X), Bn = norm(B), Cn = norm(C), Dn = norm(D);
    if (![An, Bn, Cn, Dn].every(legible)) return null;
    const ansKey = ckey(D);
    // every hypothesis consistent with the top row must predict the same answer
    const cons = MATS.filter((T) => ckey(tf(T, X)) === ckey(B));
    if (!cons.every((T) => ckey(tf(T, C)) === ansKey)) return null;

    const rotKeys = new Set(ROT.map((T) => ckey(tf(T, C))));
    const base = tf(R, mod.base); // turned object without the extra (moved) cube
    const baseN = norm(base);
    const Ra = ap(R, mod.a), Rd = ap(R, mod.d), Re = ap(R, mod.e);
    const noun = moved ? 'moved cube' : 'extra cube';
    const cands = [];
    // (1) the right turned object, extra cube in a wrong place
    const place = (f, pri, flaw) => {
      if (has(base, f) || same(f, Re)) return;
      cands.push({ cells: base.concat([f]), cat: 'place', pri: pri + rng.next() * 0.3, flaw });
    };
    place(add(Ra, mod.d), 5, `The ${noun} still sticks out ${dn(mod.d)}, as in the bottom-left panel: it was not turned with the rest of the object (after the turn it must stick out ${dn(Rd)}).`);
    for (const a2 of rng.shuffle(mod.base.filter((c) => nbCount([mod.a], c) === 1))) {
      const Ra2 = ap(R, a2);
      place(add(Ra2, Rd), 4.5, `The ${noun} points the right way (${dn(Rd)}) but sits on the wrong cube: it must stay on the cube that carries it in the bottom-left panel.`);
      place(add(Ra2, mod.d), 4, `The ${noun} sits on the wrong cube and still sticks out ${dn(mod.d)}, as if it had not been turned (it must stick out ${dn(Rd)} from the cube that carries it).`);
    }
    for (const T of ROT)
      if (mk(T) !== mk(R) && mk(T) !== mk(I3)) {
        const Td = ap(T, mod.d);
        if (!same(Td, Rd) && !same(Td, mod.d))
          place(add(Ra, Td), 3, `The ${noun} sticks out ${dn(Td)}, but turning the bottom-left object like the top row sends its ${dn(mod.d)} direction to ${dn(Rd)}.`);
      }
    // (2) the bottom-left object turned the wrong way
    const RI = inv(R);
    for (const T of ROT) {
      if (mk(T) === mk(R)) continue;
      const S = norm(tf(T, C));
      let pri = overlap(S, Dn) + rng.next() * 0.6;
      let flaw;
      if (mk(T) === mk(I3)) {
        pri -= 3;
        flaw = 'This is the bottom-left object not turned at all.';
      } else {
        if (mk(T) === mk(RI)) pri += 1.5;
        flaw = `This is the bottom-left object turned the wrong way (${mapping(T)}); the top row turns ${mapping(R)}.`;
        if (mk(T) === mk(RI) && mk(RI) !== mk(R)) flaw = `This is the bottom-left object turned the opposite way (${mapping(T)}); the top row turns ${mapping(R)}.`;
      }
      cands.push({ cells: S, cat: 'rot', pri, flaw });
    }
    // (3) mirror images
    for (const M of IMP) {
      const S = norm(tf(M, D));
      cands.push({
        cells: S,
        cat: 'mir',
        pri: overlap(S, Dn) + rng.next() * 0.6,
        flaw: 'This is a mirror image of the correct object (as seen in a mirror): no turn of the bottom-left object can produce it.',
      });
    }

    // pick 7: by category quotas first, most tempting first
    const quota = rng.pick([{ place: 3, rot: 2, mir: 2 }, { place: 3, rot: 2, mir: 2 }, { place: 2, rot: 3, mir: 2 }, { place: 3, rot: 1, mir: 3 }]);
    cands.sort((p, q) => q.pri - p.pri);
    const seen = new Set([ansKey]);
    const chosen = [];
    const cnt = { place: 0, rot: 0, mir: 0 };
    const tryTake = (c) => {
      const S = norm(c.cells), k = ckey(S);
      if (seen.has(k)) return;
      // a wrong option must never be both "the top-right object plus a cube" and "a turn of the bottom-left object"
      if (rotKeys.has(k) && contains(S, baseN)) return;
      if (!legible(S)) {
        seen.add(k);
        return;
      }
      seen.add(k);
      chosen.push({ spec: { c: S }, flaws: [c.flaw], cat: c.cat });
      cnt[c.cat]++;
    };
    for (const cat of ['place', 'rot', 'mir'])
      for (const c of cands) {
        if (cnt[cat] >= quota[cat]) break;
        if (c.cat === cat) tryTake(c);
      }
    for (const c of cands) {
      if (chosen.length >= 7) break;
      tryTake(c);
    }
    if (chosen.length < 7 || cnt.place < 2 || cnt.rot < 1 || cnt.mir < 1) return null;

    return { X, B, C, D, An, Bn, Cn, Dn, R, mod, chosen, moved };
  }

  RM.register({
    id: 'polycube-rotation',
    name: '3D rotation',
    difficulty: 8,
    generate(rng, variant) {
      variant = variant | 0;
      let r = null;
      for (let i = 0; i < 60 && !r; i++) r = attempt(rng, variant);
      RM.need(r);
      const { X, C, An, Bn, Cn, Dn, R, mod, chosen, moved } = r;

      // one scale for every panel and option
      const specs = [An, Bn, Cn, Dn].concat(chosen.map((o) => o.spec.c));
      let W = 0, H = 0;
      const box = (cells) => {
        const pts = [];
        for (const c of cells) for (let k = 0; k < 8; k++) pts.push(proj([c[0] + (k & 1), c[1] + ((k >> 1) & 1), c[2] + ((k >> 2) & 1)]));
        const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
        return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      };
      specs.forEach((s) => {
        const b = box(s);
        W = Math.max(W, b[1] - b[0]);
        H = Math.max(H, b[3] - b[2]);
      });
      const S = Math.min(88 / W, 88 / H, 24);

      const render = (spec) => {
        const pic = new RM.Pic();
        const cells = spec.c.slice().sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
        const b = box(cells);
        const ox = 50 - (S * (b[0] + b[1])) / 2, oy = 50 - (S * (b[2] + b[3])) / 2;
        for (const c of cells)
          for (const f of FACE) {
            const o = add(c, f.o);
            const pts = [o, add(o, f.u), add(add(o, f.u), f.v), add(o, f.v)].map((p) => {
              const q = proj(p);
              return [ox + S * q[0], oy + S * q[1]];
            });
            RM.polygon(pic, pts, { fill: f.fill, sw: 1.5 });
          }
        return pic.svg();
      };

      // correction text
      const d = mod.d, Rd = ap(R, d);
      const row = longestRow(X);
      const rowTxt = row
        ? ` Check it on the straight row of ${RM.word(row.L)} cubes: it runs ${RUNS[row.k]} in the top-left panel and ${RUNS[[0, 1, 2].find((k) => ap(R, E[row.k])[k] !== 0)]} in the top-right one.`
        : '';
      const anchorA = describe(mod.base, mod.a, I3);
      const anchorB = describe(mod.base, mod.a, R);
      const nTot = C.length;
      const rules = [
        {
          k: 'Reading the drawings',
          t: 'Each panel shows one solid object built from identical cubes. White faces point up, light-gray faces point to the front-left, dark-gray faces to the front-right.',
        },
        {
          k: 'Top row: the same object, turned',
          t: `The top-right object is the top-left one turned in space: ${rotPhrase(R)}. Every direction moves with it: <b>${mapping(R)}</b>.${rowTxt} The object has no symmetry, so this is the only turn that works — and no mirror image fits either.`,
        },
        moved
          ? {
              k: 'Left column: one cube moved',
              t: `The bottom-left object is the top-left one, same orientation, with one cube moved: the end cube that stuck out ${dn(sub(mod.m, mod.base.find((c) => nbCount([mod.m], c) === 1)))} has gone, and a cube now sticks out <b>${dn(d)}</b> from ${anchorA || 'another cube'}.`,
            }
          : {
              k: 'Left column: one cube added',
              t: `The bottom-left object is the top-left one, same orientation, with one extra cube (${RM.word(nTot)} cubes instead of ${RM.word(nTot - 1)}). It sticks out <b>${dn(d)}</b> from ${anchorA || 'the cube that carries it'}.`,
            },
        {
          k: 'Answer: the same turn',
          t: `Turn the bottom-left object exactly like the top row. The ${moved ? 'moved' : 'extra'} cube turns with the rest: ${dn(d)} becomes <b>${dn(Rd)}</b>${
            anchorB ? `, still attached to ${anchorB}` : ''
          }. So the answer is <b>the top-right object${moved ? ' with the same cube moved' : ''}, plus a cube sticking out ${dn(Rd)} from ${anchorB ? 'that cube' : 'the same cube as before'}</b> (${RM.word(nTot)} cubes in all; reading down the right column gives the same result).`,
        },
        {
          k: 'Traps',
          t: `Mirror images look almost right but no turn can produce them; other options turn the object the wrong way, or keep the ${moved ? 'moved' : 'extra'} cube pointing ${dn(d)} as in the bottom-left panel, or put it on a neighbouring cube.`,
        },
      ];

      const options = [{ spec: { c: Dn }, flaws: [] }].concat(chosen.map((o) => ({ spec: o.spec, flaws: o.flaws })));
      return {
        size: 2,
        panels: [{ c: An }, { c: Bn }, { c: Cn }],
        answer: { c: Dn },
        options,
        render,
        key: (spec) => spec.c.map((c) => c.join(',')).join(';'),
        rules,
        hint: moved ? 'It is the same object, turned — but in the bottom one a cube has moved.' : 'It is the same object, turned — but the bottom one has grown.',
        difficulty: variant === 1 || variant === 3 ? 7 : 8,
      };
    },
  });
})();
