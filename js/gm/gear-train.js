/* Belts & gears (grandmaster): each panel is a chain of wheels joined by meshes (teeth touching), open belts and
 * crossed belts. Along a row every link advances one step in a fixed cycle (mesh → open belt → crossed belt → mesh),
 * the first wheel keeps its direction, and the last wheel's arrow is derived by physics: it reverses once per mesh or
 * crossed belt (open belts keep the direction) and turns (size of first ÷ size of last) times as fast as the first
 * wheel — shown by the number of curved strokes around it. Middle-wheel sizes, angles and heights are decoys. */
(function () {
  'use strict';
  const RM = window.RM;
  const M = 0, O = 1, C = 2;
  const NAME = ['mesh', 'open belt', 'crossed belt'];
  const TOOTH = 2.6, GAP = 7.5, PITCH = 4.3;
  const ARC = 3.4, HEAD_L = 5.6, HEAD_W = 3.6, SL1 = 5.2, SL2 = 9.0;
  const MINS = 0.7;
  const PAIRS = { 1: [[6, 6], [8, 8], [10, 10], [12, 12]], 2: [[10, 5], [12, 6], [14, 7]], 3: [[15, 5]] };
  const DEG = Math.PI / 180;
  const f = RM.fmt;
  const dirWord = (d) => (d > 0 ? 'clockwise' : 'counter-clockwise');
  const cnt = (L, t) => L.filter((x) => x === t).length;
  const keyL = (L) => L.join('');
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : w === 'mesh' ? 'es' : 's');
  const list = (L) => L.map((t) => NAME[t]).join(', ');
  const strokes = (n) => n + ' curved stroke' + (n === 1 ? '' : 's');

  function centres(sp) {
    const n = sp.R.length, P = [[0, 0]];
    for (let i = 0; i < n - 1; i++) {
      const d = sp.L[i] === M ? sp.R[i] + sp.R[i + 1] - TOOTH : sp.R[i] + sp.R[i + 1] + GAP;
      const a = sp.ang * DEG * sp.zig * (sp.shape ? i - (n - 2) / 2 : i % 2 ? -1 : 1);
      P.push([P[i][0] + d * Math.cos(a), P[i][1] + d * Math.sin(a)]);
    }
    return P;
  }
  /* rotation arrows on the first and last wheels, centred on the outward direction of the chain */
  function arcInfo(sp, P) {
    const n = sp.R.length;
    return [[0, 1, 0], [n - 1, n - 2, n - 2]].map(([e, b, li]) => {
      const out = Math.atan2(P[e][1] - P[b][1], P[e][0] - P[b][0]);
      let H = 60;
      if (sp.L[li] === O) {
        const d = Math.hypot(P[e][0] - P[b][0], P[e][1] - P[b][1]);
        H = Math.min(60, 78 - Math.max(0, Math.asin((sp.R[b] - sp.R[e]) / d) / DEG));
      }
      const k = e === 0 || !sp.sp ? 1 : sp.sp;
      return { e, out, H: H * DEG, extra: [0, HEAD_W + 1, SL1 + 1, SL2 + 1][k] };
    });
  }
  function box(sp, P, A, s) {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    const add = (x, y) => {
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    };
    P.forEach((p, i) => {
      add((p[0] - sp.R[i]) * s, (p[1] - sp.R[i]) * s);
      add((p[0] + sp.R[i]) * s, (p[1] + sp.R[i]) * s);
    });
    A.forEach((a) => {
      const rho = sp.R[a.e] * s + ARC + a.extra;
      for (let j = -3; j <= 3; j++) {
        const t = a.out + (a.H * j) / 3;
        add(P[a.e][0] * s + rho * Math.cos(t), P[a.e][1] * s + rho * Math.sin(t));
      }
    });
    return [x0, x1, y0, y1];
  }
  function fitScale(sp) {
    const P = centres(sp), A = arcInfo(sp, P);
    for (let s = 1.1; s > 0.6; s -= 0.02) {
      const b = box(sp, P, A, s);
      if (b[1] - b[0] <= 88 && b[3] - b[2] <= 88) return s;
    }
    return 0;
  }
  function beltSegs(A, ra, B, rb, type) {
    const th = Math.atan2(B[1] - A[1], B[0] - A[0]), d = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const be = Math.acos((type === O ? ra - rb : ra + rb) / d), flip = type === O ? 0 : Math.PI;
    return [1, -1].map((sg) => {
      const a = th + sg * be;
      return [[A[0] + ra * Math.cos(a), A[1] + ra * Math.sin(a)], [B[0] + rb * Math.cos(a + flip), B[1] + rb * Math.sin(a + flip)]];
    });
  }
  function segDist(p, s) {
    const [a, b] = s, dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  }
  function okLayout(sp) {
    const P = centres(sp), n = P.length;
    for (let i = 0; i < n; i++)
      for (let j = i + 2; j < n; j++) if (Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1]) < sp.R[i] + sp.R[j] + 5) return false;
    for (let i = 0; i < n - 1; i++) {
      if (sp.L[i] === M) continue;
      const segs = beltSegs(P[i], sp.R[i], P[i + 1], sp.R[i + 1], sp.L[i]);
      for (let j = 0; j < n; j++) if (j !== i && j !== i + 1 && segs.some((sg) => segDist(P[j], sg) < sp.R[j] + 1.8)) return false;
    }
    return true;
  }

  function arcPath(c, rho, a0, a1, d, sw) {
    const p0 = [c[0] + rho * Math.cos(a0), c[1] + rho * Math.sin(a0)], p1 = [c[0] + rho * Math.cos(a1), c[1] + rho * Math.sin(a1)];
    return `<path d="M${f(p0[0])} ${f(p0[1])} A${f(rho)} ${f(rho)} 0 0 ${d > 0 ? 1 : 0} ${f(p1[0])} ${f(p1[1])}" fill="none" stroke="${RM.INK}" stroke-width="${sw}" stroke-linecap="round"/>`;
  }
  function draw(sp, s) {
    const pic = new RM.Pic();
    const P0 = centres(sp), A = arcInfo(sp, P0), b = box(sp, P0, A, s);
    const ox = 50 - (b[0] + b[1]) / 2, oy = 50 - (b[2] + b[3]) / 2;
    const P = P0.map((p) => [p[0] * s + ox, p[1] * s + oy]);
    const R = sp.R.map((r) => r * s), T = TOOTH * s, n = P.length;
    for (let i = 0; i < n - 1; i++)
      if (sp.L[i] !== M) beltSegs(P[i], R[i], P[i + 1], R[i + 1], sp.L[i]).forEach(([p, q]) => RM.line(pic, p[0], p[1], q[0], q[1], { sw: 1.9 }));
    const gear = R.map((_, i) => sp.L[i] === M || sp.L[i - 1] === M);
    const nT = sp.R.map((r) => Math.max(6, Math.round((2 * Math.PI * (r - TOOTH / 2)) / PITCH)));
    const phi = [];
    for (let i = 0; i < n; i++) {
      if (i > 0 && sp.L[i - 1] === M) {
        const th = Math.atan2(P[i][1] - P[i - 1][1], P[i][0] - P[i - 1][0]);
        const pa = (2 * Math.PI) / nT[i - 1], pb = (2 * Math.PI) / nT[i];
        const u = RM.mod((th - phi[i - 1]) / pa, 1);
        phi[i] = th + Math.PI + (u - 0.5) * pb;
      } else phi[i] = -Math.PI / 2;
    }
    for (let i = 0; i < n; i++) {
      const [cx, cy] = P[i], r = R[i];
      let inner;
      if (gear[i]) {
        const rr = r - T, p = (2 * Math.PI) / nT[i], pts = [];
        for (let k = 0; k < nT[i]; k++) {
          const a = phi[i] + k * p;
          [[-0.27, rr], [-0.15, r], [0.15, r], [0.27, rr]].forEach(([q, rad]) => pts.push([cx + rad * Math.cos(a + q * p), cy + rad * Math.sin(a + q * p)]));
        }
        RM.polygon(pic, pts, { fill: 'white', sw: 1.5 });
        inner = rr;
      } else {
        RM.circle(pic, cx, cy, r, { fill: 'white', sw: 2.2 });
        inner = r - 1;
      }
      if (inner >= 6) RM.circle(pic, cx, cy, inner * 0.7, { sw: 1.1 });
      for (let k = 0; k < 3; k++) {
        const a = phi[i] + Math.PI / 2 + (k * 2 * Math.PI) / 3;
        RM.line(pic, cx, cy, cx + inner * 0.82 * Math.cos(a), cy + inner * 0.82 * Math.sin(a), { sw: 1.3 });
      }
      RM.circle(pic, cx, cy, 1.3 + 0.07 * r, { fill: 'black', sw: 0 });
    }
    A.forEach((a) => {
      const d = a.e === 0 ? sp.d0 : sp.d3, c = P[a.e], rho = R[a.e] + ARC;
      const st = a.out - d * a.H, en = a.out + d * a.H, ab = en - (d * HEAD_L) / rho;
      pic.add(arcPath(c, rho, st, ab + (d * 0.6) / rho, d, 1.8));
      const B = [c[0] + rho * Math.cos(ab), c[1] + rho * Math.sin(ab)];
      const tg = [-Math.sin(ab) * d, Math.cos(ab) * d], rad = [Math.cos(ab), Math.sin(ab)];
      RM.polygon(
        pic,
        [
          [B[0] + HEAD_L * tg[0], B[1] + HEAD_L * tg[1]],
          [B[0] + HEAD_W * rad[0], B[1] + HEAD_W * rad[1]],
          [B[0] - HEAD_W * rad[0], B[1] - HEAD_W * rad[1]],
        ],
        { fill: 'black', sw: 0.8 }
      );
      if (a.e > 0 && sp.sp >= 2) {
        pic.add(arcPath(c, rho + SL1, a.out - 0.8 * a.H, a.out + 0.8 * a.H, 1, 1.7));
        if (sp.sp === 3) pic.add(arcPath(c, rho + SL2, a.out - 0.8 * a.H, a.out + 0.8 * a.H, 1, 1.7));
      }
    });
    return pic.svg();
  }

  function generate(rng, variant) {
    const nL = variant === 3 ? 4 : 3, nW = nL + 1;
    const step = variant === 1 ? 2 : 1;
    const speed = variant !== 2;
    const adv = (t, k) => (t + step * k) % 3;
    const phys = (L, d0) => d0 * ((L.length - cnt(L, O)) % 2 ? -1 : 1);
    const cycleTxt = step === 1 ? 'mesh → open belt → crossed belt → mesh' : 'mesh → crossed belt → open belt → mesh';

    const starts = [];
    while (starts.length < 3) {
      const s = RM.range(nL).map(() => rng.int(0, 2));
      if (new Set(s).size >= 2 && !starts.some((o) => RM.sameArr(o, s))) starts.push(s);
    }
    const D0 = [0, 1, 2].map(() => rng.pick([1, -1]));
    const spGrid = RM.grid3(() => (speed ? rng.pick([1, 1, 2, 2, 3]) : 0));
    const grid = RM.grid3((r, c) => {
      const L = starts[r].map((t) => adv(t, c));
      for (let tries = 0; tries < 30; tries++) {
        const sp = spGrid[r][c];
        const pr = rng.pick(PAIRS[sp || rng.pick([1, 2, 3])]);
        const R = [pr[0]];
        for (let k = 1; k < nW - 1; k++) R.push(rng.int(6, variant === 3 ? 9 : 11));
        R.push(pr[1]);
        const shape = rng.int(0, 1);
        const spec = { R, L, shape, zig: rng.pick([1, -1]), ang: rng.pick(shape ? [16, 22, 28] : [10, 15, 20]), d0: D0[r], d3: phys(L, D0[r]), sp };
        if (okLayout(spec) && fitScale(spec) >= MINS) return spec;
      }
      throw RM.RETRY;
    });
    const vis = RM.flat(grid), ans = grid[2][2];
    const sub = (fn) => RM.grid3((r, c) => fn(grid[r][c]));

    /* 1. links: every transform (value map × dihedral position map) that fits must predict the same triple */
    const posPerms = [];
    for (let sh = 0; sh < nL; sh++) {
      posPerms.push(RM.range(nL).map((k) => (k + sh) % nL));
      posPerms.push(RM.range(nL).map((k) => RM.mod(sh - k, nL)));
    }
    const valMaps = [[0, 1, 2], [1, 2, 0], [2, 0, 1], [0, 2, 1], [2, 1, 0], [1, 0, 2]];
    const Lg = sub((p) => p.L);
    const tr = (L, pp, vm) => keyL(pp.map((k) => vm[L[k]]));
    const predsL = new Set();
    const tryHyp = (pairs, from, pp, vm) => {
      if (pairs.every(([a, b]) => tr(Lg[a[0]][a[1]], pp, vm) === keyL(Lg[b[0]][b[1]]))) predsL.add(tr(Lg[from[0]][from[1]], pp, vm));
    };
    for (const pp of posPerms)
      for (const vm of valMaps) {
        tryHyp([[[0, 0], [0, 1]], [[0, 1], [0, 2]], [[1, 0], [1, 1]], [[1, 1], [1, 2]], [[2, 0], [2, 1]]], [2, 1], pp, vm);
        tryHyp([[[0, 0], [0, 2]], [[1, 0], [1, 2]]], [2, 0], pp, vm);
        tryHyp([[[0, 0], [1, 0]], [[0, 1], [1, 1]], [[0, 2], [1, 2]], [[1, 0], [2, 0]], [[1, 1], [2, 1]]], [1, 2], pp, vm);
        tryHyp([[[0, 0], [2, 0]], [[0, 1], [2, 1]]], [0, 2], pp, vm);
      }
    RM.need(predsL.size === 1 && predsL.has(keyL(ans.L)));
    for (let k = 0; k < nL; k++) RM.needNoConflict(sub((p) => p.L[k]), ans.L[k], 'categorical');
    RM.needNoConflict(sub((p) => keyL(p.L)), keyL(ans.L), 'categorical');

    /* lookup shortcuts: "target is a function of feature X" fitted on the 8 visible panels */
    const lookupOK = (target, feats) =>
      feats.every((fe) => {
        const m = new Map();
        if (!vis.every((p, i) => {
          const k = fe(p, i), v = target(p);
          if (m.has(k) && m.get(k) !== v) return false;
          m.set(k, v);
          return true;
        })) return true;
        const k = fe(ans, 8);
        return !m.has(k) || m.get(k) === target(ans);
      });
    const feats = [(p, i) => i % 3, (p) => cnt(p.L, M), (p) => cnt(p.L, O), (p) => cnt(p.L, C)];

    /* 2. direction of the last wheel: the 8 "which link types reverse" readings + lookups */
    for (let S = 0; S < 8; S++) {
      const pr = (p) => p.d0 * ([M, O, C].reduce((a, t) => a + ((S >> t) & 1 ? cnt(p.L, t) : 0), 0) % 2 ? -1 : 1);
      if (vis.every((p) => pr(p) === p.d3)) RM.need(pr(ans) === ans.d3);
    }
    RM.need(lookupOK((p) => p.d3 * p.d0, feats));
    RM.need(lookupOK((p) => p.d3, feats));
    RM.needNoConflict(sub((p) => p.d3 * p.d0), ans.d3 * ans.d0, 'categorical');
    RM.needNoConflict(sub((p) => p.d3), ans.d3, 'categorical');

    /* 3. speed: every ratio of two wheel sizes (or max/min) that fits rows 1-2 must give the same answer */
    if (speed) {
      const spv = vis.map((p) => p.sp);
      RM.need(new Set(spv).size >= 2 && spv.includes(ans.sp));
      const vals = (p) => p.R.concat([Math.max(...p.R), Math.min(...p.R)]);
      const near = (q, v) => Math.abs(q / v - 1) <= 0.22;
      for (let a = 0; a <= nW; a++)
        for (let b = 0; b <= nW + 1; b++) {
          if (a === b || b === nW) continue;
          const fr = (p) => vals(p)[a] / vals(p)[b];
          if (vis.every((p) => near(fr(p), p.sp))) RM.need([1, 2, 3].every((v) => v === ans.sp || !near(fr(ans), v)));
        }
      RM.need(lookupOK((p) => p.sp, feats.concat([(p) => p.R[0], (p) => p.R[nW - 1], (p) => p.d3 * p.d0, (p) => p.d3])));
      RM.needNoConflict(spGrid, ans.sp, 'numeric');
    }

    /* options */
    const Lprev = grid[2][1].L, Lfirst = grid[2][0].L;
    const nM = cnt(ans.L, M), nC = cnt(ans.L, C), nR = nM + nC;
    const ratioTxt = ['', 'the first and last wheels are the same size', 'the first wheel is twice as wide as the last', 'the first wheel is three times as wide as the last'][ans.sp];
    const revTxt = (L) => plural(cnt(L, M), 'mesh') + ` + ${plural(cnt(L, C), 'crossed belt')} = ${plural(L.length - cnt(L, O), 'reversal')}`;
    const allRev = (L, d0) => d0 * (L.length % 2 ? -1 : 1);
    const meshRev = (L, d0) => d0 * (cnt(L, M) % 2 ? -1 : 1);
    const dirFlaw = (L, d0, d3) => {
      let t = `with these links the last wheel must turn ${dirWord(phys(L, d0))}: ${revTxt(L)}, ${(L.length - cnt(L, O)) % 2 ? 'so it turns against the first wheel' : 'so it turns like the first wheel'}`;
      if (allRev(L, d0) === d3 && cnt(L, O)) t += ' (an open belt does not reverse the rotation)';
      else if (meshRev(L, d0) === d3 && cnt(L, C)) t += ' (a crossed belt does reverse the rotation)';
      return t;
    };
    const spFlaw = (v) => `the last wheel must show ${strokes(ans.sp)}, not ${v}: ${ratioTxt}, so it turns ${ans.sp === 1 ? 'at the same speed' : ans.sp === 2 ? 'twice as fast' : 'three times as fast'} (the middle wheels do not matter)`;
    const firstFlaw = `the first wheel must turn ${dirWord(ans.d0)}, as in the other two panels of row 3`;
    const linkFlaw = (L) => {
      if (keyL(L) === keyL(Lprev)) return 'the links have not changed since the previous panel: each link must advance one step (' + cycleTxt + ')';
      if (keyL(L) === keyL(Lfirst)) return 'these are the links of the first panel of the row: each link must advance one step from the second panel (' + cycleTxt + ')';
      return RM.range(nL)
        .filter((k) => L[k] !== ans.L[k])
        .map((k) => `link ${k + 1} (wheels ${k + 1}–${k + 2}) must be a ${NAME[ans.L[k]]} (it follows the ${NAME[Lprev[k]]} of the previous panel), not a ${NAME[L[k]]}`)
        .join('; ');
    };
    const cands = [];
    const add = (ch, group, pri, flaws) => {
      const spec = Object.assign(RM.clone(ans), ch);
      cands.push({ spec, group, pri: pri + rng.next() * 3, flaws });
    };
    add({ d3: -ans.d3 }, 'a', 10, [dirFlaw(ans.L, ans.d0, -ans.d3)]);
    if (speed)
      [1, 2, 3].filter((v) => v !== ans.sp).forEach((v) => {
        add({ sp: v }, 'a', 7, [spFlaw(v)]);
        add({ sp: v, d3: -ans.d3 }, 'a', 4, [dirFlaw(ans.L, ans.d0, -ans.d3), spFlaw(v)]);
      });
    add({ d0: -ans.d0, d3: -ans.d3 }, 'a', 5, [firstFlaw]);
    add({ d0: -ans.d0 }, 'a', 3, [firstFlaw, 'and the last wheel does not even match this first wheel: ' + dirFlaw(ans.L, -ans.d0, ans.d3)]);
    const W = [Lprev, Lfirst];
    for (let k = 0; k < nL; k++)
      for (let t = 0; t < 3; t++)
        if (t !== ans.L[k]) {
          const L = ans.L.slice();
          L[k] = t;
          W.push(L);
        }
    W.push(ans.L.slice(1).concat([ans.L[0]]), [ans.L[nL - 1]].concat(ans.L.slice(0, nL - 1)), ans.L.slice().reverse());
    W.forEach((L, wi) => {
      if (keyL(L) === keyL(ans.L)) return;
      const pri = wi === 0 ? 9 : wi === 1 ? 6 : wi > W.length - 4 ? 5 : 6.5;
      const dp = phys(L, ans.d0);
      add({ L, d3: dp }, 'l', pri + 2, [linkFlaw(L)]);
      if (dp !== ans.d3) add({ L }, 'l', pri - 2, [linkFlaw(L), 'and even ' + dirFlaw(L, ans.d0, ans.d3)]);
      if (speed) {
        const v = rng.pick([1, 2, 3].filter((x) => x !== ans.sp));
        add({ L, d3: dp, sp: v }, 'l', pri - 3, [linkFlaw(L), spFlaw(v)]);
      }
    });
    const ak = key(ans), seen = new Set([ak]);
    const ok = cands
      .sort((x, y) => y.pri - x.pri)
      .filter((o) => {
        const k = key(o.spec);
        if (seen.has(k) || !okLayout(o.spec) || fitScale(o.spec) < MINS) return false;
        seen.add(k);
        return true;
      });
    const nA = speed ? 3 : 2;
    const pickA = ok.filter((o) => o.group === 'a').slice(0, nA);
    const pickL = ok.filter((o) => o.group === 'l').slice(0, 7 - pickA.length);
    const chosen = pickA.concat(pickL);
    RM.need(chosen.length === 7);
    const ds = chosen.map((o) => o.spec);
    RM.need(ds.some((s) => keyL(s.L) === keyL(ans.L)) && ds.some((s) => s.d3 === ans.d3) && ds.some((s) => s.d0 === ans.d0));
    if (speed) RM.need(ds.some((s) => s.sp === ans.sp) && ds.some((s) => s.sp !== ans.sp));

    const scale = Math.min(1.1, ...vis.concat([ans], ds).map(fitScale));
    RM.need(scale >= MINS);

    const rules = [
      {
        k: 'Three kinds of link',
        t: 'Each panel is a chain of wheels, read from left to right. A <b>mesh</b> (teeth touching) reverses the direction of rotation; an <b>open belt</b> (two straight belts side by side) keeps it; a <b>crossed belt</b> (the two belts form an X) reverses it.',
      },
      {
        k: 'The links change type',
        t: `From one panel to the next in a row, every link advances one step in the cycle <b>${cycleTxt}</b>. Row 3, panel 2: ${list(Lprev)} → missing panel: <b>${list(ans.L)}</b>.`,
      },
      {
        k: 'First wheel',
        t: `The first (leftmost) wheel turns the same way in the three panels of a row: in row 3 it turns <b>${dirWord(ans.d0)}</b>.`,
      },
      {
        k: 'Direction of the last wheel',
        t: `Count the reversals: ${revTxt(ans.L)} (open belts, wheel sizes and positions do not matter). ${nR % 2 ? 'An odd number: the last wheel turns against the first one' : 'An even number: the last wheel turns like the first one'} → <b>${dirWord(ans.d3)}</b>.`,
      },
    ];
    if (speed)
      rules.push({
        k: 'Speed of the last wheel',
        t: `A belt or a pair of teeth moves the rims of two linked wheels at the same speed, so a wheel k times smaller turns k times faster. Along the chain the middle wheels cancel out: speed of the last wheel = size of the first ÷ size of the last, drawn as the number of curved strokes around the last wheel (its arrow plus extra speed lines). Here ${ratioTxt} → <b>${strokes(ans.sp)}</b>.`,
      });
    rules.push({
      k: 'Answer',
      t: `Links <b>${list(ans.L)}</b>; first wheel ${dirWord(ans.d0)}; last wheel <b>${dirWord(ans.d3)}</b>${speed ? ' with <b>' + strokes(ans.sp) + '</b>' : ''}.`,
    });

    return {
      panels: vis,
      answer: ans,
      options: [{ spec: ans, flaws: [] }].concat(chosen.map((o) => ({ spec: o.spec, flaws: o.flaws }))),
      render: (sp) => draw(sp, scale),
      key,
      rules,
      hint: 'Watch how each link changes from panel to panel — and remember that a crossed belt is not an open belt.',
      difficulty: variant === 2 ? 6 : 7,
    };
  }
  function key(sp) {
    return JSON.stringify([sp.R, sp.L, sp.shape, sp.zig, sp.ang, sp.d0, sp.d3, sp.sp]);
  }

  RM.register({
    id: 'gear-train',
    name: 'Belts & gears',
    difficulty: 7,
    generate,
  });
})();
