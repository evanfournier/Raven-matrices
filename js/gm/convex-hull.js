/* Rubber band (grandmaster): every panel is a 6×6 pegboard with black pegs and a rubber band stretched around
 * them (always their convex outline). Each peg is therefore a CORNER of the band, an EDGE peg (touching a straight
 * stretch) or an INNER peg (floating inside). The third panel of a row takes some pegs of the first two according to
 * these band roles (variant 0: corners of panel 1 + inner pegs of panel 2), and its own band is stretched again
 * around the pegs it received. Uniqueness is checked against every point-wise rule on the (role in panel 1, role in
 * panel 2) pairs, plus band-copy and count shortcuts. */
(function () {
  'use strict';
  const RM = window.RM;
  const NN = 6;
  const ALL = RM.range(NN * NN);
  const X = (i) => 15 + 14 * i;
  const ix = (k) => k % NN;
  const iy = (k) => (k / NN) | 0;
  const NAME = (k) => 'ABCDEF'[ix(k)] + (iy(k) + 1);
  const isPeg = (s) => s === 'C' || s === 'E' || s === 'I';
  const byNum = (a, b) => a - b;
  const list = (ks) => (ks.length ? ks.slice().sort(byNum).map(NAME).join(', ') : 'none');

  /* ---------------------------------------------------------------- geometry (lattice units) */
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const P = (k) => [ix(k), iy(k)];
  /* Convex hull (strict corners only), positively oriented: interior points have cross(a, b, q) > 0. */
  function hullIdx(ids) {
    const pts = Array.from(new Set(ids)).map(P).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (pts.length < 3) return [];
    const lo = [];
    const up = [];
    for (const p of pts) {
      while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
      lo.push(p);
    }
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop();
      up.push(p);
    }
    lo.pop();
    up.pop();
    const h = lo.concat(up).map((p) => p[1] * NN + p[0]);
    return h.length >= 3 ? h : [];
  }
  /* 1 inside, 0 on the outline, -1 outside (H convex, positively oriented). */
  function locate(H, k) {
    const q = P(k);
    let on = false;
    for (let i = 0; i < H.length; i++) {
      const c = cross(P(H[i]), P(H[(i + 1) % H.length]), q);
      if (c < 0) return -1;
      if (c === 0) on = true;
    }
    return on ? 0 : 1;
  }
  function depth(H, k) {
    const q = P(k);
    let m = Infinity;
    for (let i = 0; i < H.length; i++) {
      const a = P(H[i]);
      const b = P(H[(i + 1) % H.length]);
      m = Math.min(m, cross(a, b, q) / Math.hypot(b[0] - a[0], b[1] - a[1]));
    }
    return m;
  }
  /* Roles: C corner peg, E edge peg, I inner peg; holes: h inside, b on the band line, o outside. */
  function info(pegs) {
    const H = hullIdx(pegs);
    if (!H.length) return null;
    const set = new Set(pegs);
    const hs = new Set(H);
    const st = ALL.map((k) => {
      const l = locate(H, k);
      if (set.has(k)) return hs.has(k) ? 'C' : l === 0 ? 'E' : 'I';
      return l === 0 ? 'b' : l > 0 ? 'h' : 'o';
    });
    return { pegs: Array.from(set).sort(byNum), H, st };
  }
  const legible = (c) => c.pegs.every((k) => c.st[k] !== 'I' || depth(c.H, k) >= 0.5);
  const sortedH = (H) => H.slice().sort(byNum).join(',');

  /* An octilinear convex board region (rectangle with 45° corner cuts) whose corners are pegs, plus a few edge and
   * inner pegs: every hole is then clearly on, inside or outside the band. */
  function makePanel(rng) {
    for (let t = 0; t < 40; t++) {
      const w = rng.int(2, 5);
      const h = rng.int(2, 5);
      const x0 = rng.int(0, 5 - w);
      const y0 = rng.int(0, 5 - h);
      const x1 = x0 + w;
      const y1 = y0 + h;
      const cp = () => rng.pick([0, 0, 1, 1, 1, 2, 2, 3]);
      const tl = Math.min(cp(), w, h);
      const tr = Math.min(cp(), w - tl, h);
      const br = Math.min(cp(), h - tr, w);
      const bl = Math.min(cp(), w - br, h - tl);
      const raw = [[x0 + tl, y0], [x1 - tr, y0], [x1, y0 + tr], [x1, y1 - br], [x1 - br, y1], [x0 + bl, y1], [x0, y1 - bl], [x0, y0 + tl]];
      const H = hullIdx(raw.map((p) => p[1] * NN + p[0]));
      if (H.length < 3 || H.length > 6) continue;
      const base = info(H);
      const bnd = ALL.filter((k) => base.st[k] === 'b');
      const inn = ALL.filter((k) => base.st[k] === 'h');
      const nE = Math.min(bnd.length, rng.pick([0, 1, 1, 2]));
      const nI = Math.min(inn.length, rng.pick([0, 1, 1, 2, 2, 3]));
      const pegs = H.concat(rng.sample(bnd, nE), rng.sample(inn, nI));
      if (pegs.length < 4 || pegs.length > 9) continue;
      return info(pegs);
    }
    return null;
  }

  /* ---------------------------------------------------------------- rules */
  const VARS = [
    {
      id: 'c1i2',
      diff: 7,
      f: (a, b) => a === 'C' || b === 'I',
      need: [
        (a, b) => a === 'E' && b !== 'I',
        (a, b) => a === 'I' && b !== 'I',
        (a, b) => a !== 'C' && b === 'C',
        (a, b) => a !== 'C' && b === 'E',
        (a, b) => a !== 'C' && b === 'I',
        (a, b) => a === 'C' && b !== 'I',
      ],
      rule: 'Panel 3 keeps only the <b>corner pegs of panel 1</b> and the <b>inner pegs of panel 2</b>. Edge and inner pegs of panel 1 disappear, and so do the corner and edge pegs of panel 2.',
    },
    {
      id: 'xor',
      diff: 6,
      f: (a, b) => isPeg(a) !== isPeg(b),
      need: [(a, b) => isPeg(a) && isPeg(b), (a, b) => a === 'I' && !isPeg(b), (a, b) => !isPeg(a) && b === 'I', (a, b) => (a === 'E' && !isPeg(b)) || (b === 'E' && !isPeg(a))],
      rule: 'Panel 3 superimposes the pegs of panels 1 and 2, but a hole holding a peg in <b>both</b> panels ends up <b>empty</b> (the two pegs cancel). Corners, edges and inner pegs are treated alike.',
    },
    {
      id: 'c1c2',
      diff: 6,
      f: (a, b) => a === 'C' || b === 'C',
      need: [(a, b) => a === 'E' && b !== 'C', (a, b) => a === 'I' && b !== 'C', (a, b) => a !== 'C' && b === 'E', (a, b) => a !== 'C' && b === 'I', (a, b) => a === 'C' && !isPeg(b), (a, b) => !isPeg(a) && b === 'C'],
      rule: 'Panel 3 keeps only the <b>corner pegs</b> of the bands of panels 1 and 2. Every edge peg and every inner peg disappears.',
    },
    {
      id: 'esc',
      diff: 7,
      f: (a, b) => (isPeg(a) && b === 'o') || (isPeg(b) && a === 'o'),
      forbid: (a, b) => (isPeg(a) && b === 'b') || (isPeg(b) && a === 'b'),
      need: [(a, b) => isPeg(a) && b === 'o', (a, b) => a === 'o' && isPeg(b), (a, b) => isPeg(a) && b === 'h', (a, b) => a === 'h' && isPeg(b)],
      rule: 'Lay panel 1 on panel 2. A peg of panel 1 reaches panel 3 only if it lies <b>outside the band of panel 2</b>, and a peg of panel 2 only if it lies <b>outside the band of panel 1</b>. A peg that falls inside the other band (or on a peg of the other panel) is caught and disappears.',
    },
  ];

  const ALT = [
    { id: 'all', f: (a, b) => isPeg(a) || isPeg(b), why: 'it simply superimposes all the pegs of panels 1 and 2' },
    { id: 'xor', f: (a, b) => isPeg(a) !== isPeg(b), why: 'it superimposes panels 1 and 2 and cancels the pegs they share' },
    { id: 'c1i2', f: (a, b) => a === 'C' || b === 'I', why: 'it keeps the corner pegs of panel 1 and the inner pegs of panel 2' },
    { id: 'i1c2', f: (a, b) => a === 'I' || b === 'C', why: 'it keeps the inner pegs of panel 1 and the corner pegs of panel 2' },
    { id: 'b1i2', f: (a, b) => a === 'C' || a === 'E' || b === 'I', why: 'it keeps every peg of panel 1 touching its band (corners and edge pegs) plus the inner pegs of panel 2' },
    { id: 'c1n2', f: (a, b) => a === 'C' || b === 'E' || b === 'I', why: 'it keeps the corner pegs of panel 1 plus the edge and inner pegs of panel 2' },
    { id: 'c1c2', f: (a, b) => a === 'C' || b === 'C', why: 'it keeps the corner pegs of both panels' },
    { id: 'b1b2', f: (a, b) => a === 'C' || a === 'E' || b === 'C' || b === 'E', why: 'it keeps every peg touching a band (corners and edge pegs)' },
    { id: 'n1n2', f: (a, b) => a === 'E' || a === 'I' || b === 'E' || b === 'I', why: 'it keeps the pegs of both panels that are not corners' },
    { id: 'c1', f: (a) => a === 'C', why: 'it keeps only the corner pegs of panel 1' },
    { id: 'c2', f: (a, b) => b === 'C', why: 'it keeps only the corner pegs of panel 2' },
    { id: 'esc', f: (a, b) => (isPeg(a) && b === 'o') || (isPeg(b) && a === 'o'), why: 'it keeps the pegs lying outside the other panel’s band' },
    { id: 'esc1', f: (a, b) => isPeg(a) && b === 'o', why: 'it keeps only the pegs of panel 1 lying outside the band of panel 2' },
    { id: 'in', f: (a, b) => (isPeg(a) && b !== 'o') || (isPeg(b) && a !== 'o'), why: 'it keeps the pegs caught inside the other panel’s band' },
  ];

  /* Point-wise type of a hole: its role in panel 1, in panel 2 and in the superimposed picture (band stretched
   * around the pegs of both panels). Every rule a solver could read hole by hole is a function of this type. */
  const tkey = (a, b, u) => (isPeg(a) || isPeg(b) ? a + b + u : 'NN');
  function types(A, B) {
    const U = info(A.pegs.concat(B.pegs));
    return ALL.map((k) => tkey(A.st[k], B.st[k], U.st[k]));
  }

  function makeRow(rng, V) {
    const A = makePanel(rng);
    const B = makePanel(rng);
    if (!A || !B) return null;
    if (V.forbid && ALL.some((k) => V.forbid(A.st[k], B.st[k]))) return null;
    const out = ALL.filter((k) => V.f(A.st[k], B.st[k]));
    if (out.length < 4 || out.length > 9) return null;
    const C = info(out);
    if (!C || !legible(C)) return null;
    if (RM.sameArr(C.pegs, A.pegs) || RM.sameArr(C.pegs, B.pegs)) return null;
    return [A, B, C];
  }

  /* ---------------------------------------------------------------- drawing */
  const D = 4.4; // band offset from peg centres: peg radius 3.2 + half band width 1.2
  function beltPath(band) {
    let V = band.map((k) => [X(ix(k)), X(iy(k))]);
    let area = 0;
    for (let i = 0; i < V.length; i++) {
      const a = V[i];
      const b = V[(i + 1) % V.length];
      area += a[0] * b[1] - b[0] * a[1];
    }
    if (area < 0) V = V.slice().reverse();
    const n = V.length;
    const s = V.map((v, i) => (cross(V[(i + n - 1) % n], v, V[(i + 1) % n]) > 0 ? 1 : -1));
    const out = [];
    const inn = [];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const A = V[i];
      const B = V[j];
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const u = [(B[0] - A[0]) / L, (B[1] - A[1]) / L];
      const nr = [u[1], -u[0]];
      if (s[i] === s[j]) {
        out[i] = [A[0] + s[i] * D * nr[0], A[1] + s[i] * D * nr[1]];
        inn[j] = [B[0] + s[i] * D * nr[0], B[1] + s[i] * D * nr[1]];
      } else {
        const sb = (2 * D) / L;
        const cb = Math.sqrt(1 - sb * sb);
        const m = [sb * u[0] + s[i] * cb * nr[0], sb * u[1] + s[i] * cb * nr[1]];
        out[i] = [A[0] + D * m[0], A[1] + D * m[1]];
        inn[j] = [B[0] - D * m[0], B[1] - D * m[1]];
      }
    }
    const f = (p) => RM.fmt(p[0]) + ' ' + RM.fmt(p[1]);
    let d = 'M' + f(out[0]);
    for (let k = 1; k <= n; k++) {
      const i = k % n;
      d += ' L' + f(inn[i]) + ' A' + D + ' ' + D + ' 0 0 ' + (s[i] > 0 ? 1 : 0) + ' ' + f(out[i]);
    }
    return d + ' Z';
  }
  function render(spec) {
    const pic = new RM.Pic();
    const set = new Set(spec.pegs);
    pic.add(`<path d="${beltPath(spec.band)}" fill="#e9ecef" stroke="${RM.DARK}" stroke-width="2.4" stroke-linejoin="round"/>`);
    let holes = '';
    let pegs = '';
    ALL.forEach((k) => {
      const x = X(ix(k));
      const y = X(iy(k));
      if (set.has(k)) pegs += `<circle cx="${x}" cy="${y}" r="3.2" fill="${RM.INK}"/>`;
      else holes += `<circle cx="${x}" cy="${y}" r="1.6" fill="#ffffff" stroke="#9aa1ab" stroke-width="0.9"/>`;
    });
    pic.add(holes + pegs);
    return pic.svg();
  }
  function canonBand(band) {
    let V = band.slice();
    let area = 0;
    for (let i = 0; i < V.length; i++) {
      const a = P(V[i]);
      const b = P(V[(i + 1) % V.length]);
      area += a[0] * b[1] - b[0] * a[1];
    }
    if (area < 0) V.reverse();
    const m = V.indexOf(Math.min(...V));
    return V.slice(m).concat(V.slice(0, m));
  }
  const key = (s) => s.pegs.join(',') + '|' + canonBand(s.band).join(',');
  const mkSpec = (pegs, band) => ({ pegs: Array.from(new Set(pegs)).sort(byNum), band: band || hullIdx(pegs) });

  /* ---------------------------------------------------------------- generator */
  function generate(rng, variant) {
    const V = VARS[variant];
    // a pool of valid rows; choose rows 1-2 and row 3 so that every point-wise type of row 3 (and every
    // demonstration the rule needs) already appears in rows 1-2
    const pool = [];
    for (let t = 0; t < 90 && pool.length < 14; t++) {
      const row = makeRow(rng, V);
      if (!row) continue;
      const [A, B] = row;
      row.types = new Set(types(A, B));
      row.mask = V.need.reduce((m, p, i) => (ALL.some((k) => p(A.st[k], B.st[k])) ? m | (1 << i) : m), 0);
      pool.push(row);
    }
    RM.need(pool.length >= 6);
    const full = (1 << V.need.length) - 1;
    let rows = null;
    const order = rng.shuffle(RM.range(pool.length));
    search: for (const i3 of order) {
      const r3 = pool[i3];
      for (const i1 of order) {
        if (i1 === i3) continue;
        for (const i2 of order) {
          if (i2 === i3 || i2 <= i1) continue;
          const r1 = pool[i1];
          const r2 = pool[i2];
          if ((r1.mask | r2.mask) !== full) continue;
          let ok = true;
          for (const t of r3.types) if (!r1.types.has(t) && !r2.types.has(t)) (ok = false);
          if (!ok) continue;
          // shortcut: panel 3's band equal to the band of panel 1 (or 2) in rows 1-2 but not in row 3
          if ([0, 1].some((c) => [r1, r2].every((row) => sortedH(row[2].H) === sortedH(row[c].H)) && sortedH(r3[2].H) !== sortedH(r3[c].H))) continue;
          const all = [r1, r2, r3];
          const cnt = RM.grid3((r, c) => all[r][c].pegs.length);
          const cor = RM.grid3((r, c) => all[r][c].H.length);
          if (!RM.unique(cnt, cnt[2][2], 'numeric', undefined, true) || !RM.unique(cor, cor[2][2], 'numeric', undefined, true)) continue;
          rows = all;
          break search;
        }
      }
    }
    RM.need(rows);
    const row3 = rows[2];
    const [A3, B3, C3] = row3;
    const answer = mkSpec(C3.pegs, C3.H);
    const ansKey = key(answer);
    const ansSet = new Set(answer.pegs);

    /* ---------------- distractors */
    const holeWord = (s) => (V.id === 'esc' ? (s === 'o' ? 'empty, outside the band' : 'empty, inside the band') : 'empty');
    const roleWord = (s) => (s === 'C' ? 'corner peg' : s === 'E' ? 'edge peg' : s === 'I' ? 'inner peg' : holeWord(s));
    const pairDesc = (k) => 'panel 1: ' + roleWord(A3.st[k]) + '; panel 2: ' + roleWord(B3.st[k]);
    const pegFlaws = (pegs) => {
      const set = new Set(pegs);
      const extra = pegs.filter((k) => !ansSet.has(k));
      const miss = answer.pegs.filter((k) => !set.has(k));
      const fl = [];
      const say = (ks) => ks.slice(0, 3).map((k) => NAME(k) + ' (' + pairDesc(k) + ')').join(', ') + (ks.length > 3 ? ' …' : '');
      if (extra.length) fl.push((extra.length > 1 ? 'extra pegs at ' : 'extra peg at ') + say(extra) + ' — by the rule ' + (extra.length > 1 ? 'they disappear' : 'it disappears'));
      if (miss.length) fl.push((miss.length > 1 ? 'pegs missing at ' : 'peg missing at ') + say(miss) + ' — by the rule ' + (miss.length > 1 ? 'they must be kept' : 'it must be kept'));
      return fl;
    };
    const cands = [];
    const seenK = new Set([ansKey]);
    const add = (spec, flaws, group) => {
      if (!spec || spec.band.length < 3) return null;
      const k = key(spec);
      if (seenK.has(k)) return null;
      seenK.add(k);
      const c = { spec, flaws, group };
      cands.push(c);
      return c;
    };
    // 1. results of other combination rules (band re-stretched correctly)
    const ruleC = [];
    ALT.forEach((alt) => {
      if (alt.id === V.id) return;
      const pegs = ALL.filter((k) => alt.f(A3.st[k], B3.st[k]));
      if (pegs.length < 3) return;
      const sp = mkSpec(pegs);
      const c = add(sp, [alt.why].concat(pegFlaws(sp.pegs)), 'rule');
      if (c) ruleC.push(c);
    });
    // 2. one-peg slips on the answer (band re-stretched)
    const slips = (base, group) => {
      const res = [];
      base.pegs.forEach((k) => {
        const pegs = base.pegs.filter((q) => q !== k);
        const sp = mkSpec(pegs);
        if (sp.band.length < 3) return;
        const c = add(sp, pegFlaws(sp.pegs), group);
        if (c) res.push(c);
      });
      Array.from(new Set(A3.pegs.concat(B3.pegs))).forEach((k) => {
        if (base.pegs.includes(k)) return;
        const sp = mkSpec(base.pegs.concat([k]));
        const c = add(sp, pegFlaws(sp.pegs), group);
        if (c) res.push(c);
      });
      return res;
    };
    const slipA = slips(answer, 'slipA');
    // 3. right pegs, wrong band
    const bandC = [];
    answer.band.forEach((k) => {
      const H = hullIdx(answer.pegs.filter((q) => q !== k));
      if (H.length < 3) return;
      const c = add(mkSpec(answer.pegs, H), ['the band is not stretched around every peg: ' + NAME(k) + ' is left outside it'], 'band');
      if (c) bandC.push(c);
    });
    answer.pegs.forEach((q) => {
      if (C3.st[q] !== 'I') return;
      const H = answer.band;
      let best = -1;
      let bd = Infinity;
      for (let i = 0; i < H.length; i++) {
        const a = P(H[i]);
        const b = P(H[(i + 1) % H.length]);
        const d = cross(a, b, P(q)) / Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (d < bd) (bd = d), (best = i);
      }
      const band = H.slice(0, best + 1).concat([q], H.slice(best + 1));
      const c = add(mkSpec(answer.pegs, band), ['the band is pushed inward at ' + NAME(q) + ': a stretched rubber band never bends inward, it would pass outside that peg'], 'band');
      if (c) bandC.push(c);
    });
    [A3, B3].forEach((src, i) => {
      const c = add(mkSpec(answer.pegs, src.H), ['the band is copied from panel ' + (i + 1) + ' instead of being stretched around the pegs of panel 3'], 'band');
      if (c) bandC.push(c);
    });

    // pick 7: answer + 2 of its near misses, a tempting wrong rule W + 2 of its near misses, 2 more wrong rules;
    // the answer must be neither the most central option nor the one with the most near neighbours
    const dist = (s, t) => {
      const a = new Set(s.pegs);
      const b = new Set(t.pegs);
      let d = 0;
      a.forEach((k) => !b.has(k) && d++);
      b.forEach((k) => !a.has(k) && d++);
      return d + (canonBand(s.band).join() === canonBand(t.band).join() ? 0 : 1);
    };
    const ansC = { spec: answer, flaws: [] };
    const nearA = slipA.concat(bandC);
    const closeRules = ruleC.filter((c) => dist(c.spec, answer) >= 3 && c.spec.pegs.length >= 4);
    RM.need(closeRules.length >= 1 && slipA.length >= 2 && bandC.length >= 1);
    let chosen = null;
    const nearCache = new Map();
    const nearOf = (W) => {
      if (!nearCache.has(W)) {
        const res = slips(W.spec, 'slipW');
        W.spec.band.forEach((k) => {
          const H = hullIdx(W.spec.pegs.filter((q) => q !== k));
          if (H.length < 3) return;
          const c = add(mkSpec(W.spec.pegs, H), pegFlaws(W.spec.pegs).concat(['the band is not stretched around every peg: ' + NAME(k) + ' is left outside it']), 'bandW');
          if (c) res.push(c);
        });
        nearCache.set(W, res);
      }
      return nearCache.get(W);
    };
    for (let t = 0; t < 16 && !chosen; t++) {
      const W = rng.pick(closeRules);
      const pick = [W];
      const take = (arr, n) => {
        rng.shuffle(arr).forEach((c) => {
          if (n > 0 && !pick.includes(c)) {
            pick.push(c);
            n--;
          }
        });
      };
      take(nearOf(W), 2);
      take(rng.chance(0.5) ? slipA : nearA, 1);
      take(nearA, 1);
      take(ruleC.filter((c) => dist(c.spec, answer) >= 2), 7 - pick.length);
      take(cands, 7 - pick.length);
      if (pick.length !== 7) continue;
      const opts = pick.concat([ansC]);
      const sum = (o) => opts.reduce((acc, p) => acc + dist(o.spec, p.spec), 0);
      const nb = (o) => opts.filter((p) => p !== o && dist(o.spec, p.spec) <= 2).length;
      const sa = sum(ansC);
      const na = nb(ansC);
      if (!pick.some((o) => sum(o) <= sa) || !pick.some((o) => nb(o) >= na)) continue;
      chosen = opts;
    }
    RM.need(chosen);

    /* ---------------- correction */
    const rules = [
      {
        k: 'The rubber band',
        t: 'In every panel the band is stretched around all the pegs: it is their convex outline. So each peg is either a <b>corner</b> (the band bends around it), an <b>edge peg</b> (it only touches a straight stretch of the band) or an <b>inner peg</b> (it floats inside without touching the band).',
      },
      { k: 'Which pegs reach panel 3', t: V.rule },
      { k: 'Then stretch the band again', t: 'The band of panel 3 is never copied from panel 1 or 2: it is stretched afresh around the pegs that panel 3 received.' },
    ];
    const ks = (fn) => ALL.filter(fn);
    let calc;
    if (V.id === 'c1i2') {
      const c1 = ks((k) => A3.st[k] === 'C');
      const d1 = ks((k) => A3.st[k] === 'E' || A3.st[k] === 'I');
      const i2 = ks((k) => B3.st[k] === 'I');
      const d2 = ks((k) => (B3.st[k] === 'C' || B3.st[k] === 'E') && A3.st[k] !== 'C');
      const both = ks((k) => (B3.st[k] === 'C' || B3.st[k] === 'E') && A3.st[k] === 'C');
      calc = `Panel 1: its corners ${list(c1)} are kept${d1.length ? ', ' + list(d1) + ' (not ' + (d1.length > 1 ? 'corners' : 'a corner') + ') ' + (d1.length > 1 ? 'go' : 'goes') : ''}. Panel 2: ${
        i2.length ? (i2.length > 1 ? 'its inner pegs ' + list(i2) + ' are kept' : 'its inner peg ' + list(i2) + ' is kept') : 'it has no inner peg'
      }${d2.length ? ', ' + list(d2) + ' (on its band) ' + (d2.length > 1 ? 'go' : 'goes') : ''}${
        both.length ? ' (' + list(both) + ', also on the band of panel 2, ' + (both.length > 1 ? 'stay because they are corners' : 'stays because it is a corner') + ' in panel 1)' : ''
      }.`;
    } else if (V.id === 'xor') {
      calc = `Only in panel 1: ${list(ks((k) => isPeg(A3.st[k]) && !isPeg(B3.st[k])))}. Only in panel 2: ${list(ks((k) => !isPeg(A3.st[k]) && isPeg(B3.st[k])))}. In both, so cancelled: ${list(ks((k) => isPeg(A3.st[k]) && isPeg(B3.st[k])))}.`;
    } else if (V.id === 'c1c2') {
      calc = `Corners of panel 1: ${list(ks((k) => A3.st[k] === 'C'))}. Corners of panel 2: ${list(ks((k) => B3.st[k] === 'C'))}.`;
    } else {
      calc = `Pegs of panel 1 outside band 2: ${list(ks((k) => isPeg(A3.st[k]) && B3.st[k] === 'o'))}. Pegs of panel 2 outside band 1: ${list(ks((k) => isPeg(B3.st[k]) && A3.st[k] === 'o'))}. Caught: ${list(ks((k) => (isPeg(A3.st[k]) && B3.st[k] !== 'o') || (isPeg(B3.st[k]) && A3.st[k] !== 'o')))}.`;
    }
    rules.push({
      k: 'Row 3',
      t: `Holes are named like a chessboard: letters A–F for the columns (left to right), numbers 1–6 for the rows (top to bottom). ${calc} So panel 3 has <b>${RM.plural(answer.pegs.length, 'peg')}: ${list(answer.pegs)}</b>, and the band stretched around them has <b>${RM.word(answer.band.length)} corners: ${list(answer.band)}</b>${
        (() => {
          const e = answer.pegs.filter((k) => C3.st[k] === 'E');
          const i = answer.pegs.filter((k) => C3.st[k] === 'I');
          const part = [];
          if (e.length) part.push(list(e) + (e.length > 1 ? ' lie' : ' lies') + ' on a straight stretch');
          if (i.length) part.push(list(i) + (i.length > 1 ? ' float' : ' floats') + ' inside');
          return part.length ? ' (' + part.join('; ') + ')' : '';
        })()
      }.`,
    });

    const panels = [];
    rows.forEach((row, r) => row.forEach((p, c) => (r < 2 || c < 2) && panels.push(mkSpec(p.pegs, p.H))));
    return {
      panels,
      answer,
      options: chosen.map((o) => ({ spec: o.spec, flaws: o.flaws })),
      render,
      key,
      rules,
      hint: 'The band is not decoration — it decides which pegs stay.',
      difficulty: V.diff,
    };
  }

  RM.register({
    id: 'convex-hull',
    name: 'Rubber band',
    difficulty: 7,
    generate,
  });
})();
