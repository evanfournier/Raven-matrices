/* Intersection (grandmaster): column 1 and column 2 each show one convex shape placed in the same frame; column 3
 * shows what the two shapes have in common, drawn as one black region. Variant 0/1: the common region (A ∩ B, a
 * convex polygon computed by clipping; 3–5 resp. 5–7 sided shapes). Variant 2: the part of the first shape NOT
 * covered by the second (A − B). Variant 3: everything covered by exactly one of them (symmetric difference).
 * Every operation (∩, ∪, A−B, B−A, △) is compared with rows 1–2 on a pixel mask; all must be pairwise distinct so
 * that exactly one fits. Distractors: other operations, the overlap of shapes from other rows, and the right
 * operation with one corner displaced, a corner cut off or the cut-out shifted. */
(function () {
  'use strict';
  const RM = window.RM;

  const R1 = (v) => Math.round(v * 10) / 10;
  const area = (P) => {
    let s = 0;
    for (let i = 0; i < P.length; i++) {
      const a = P[i];
      const b = P[(i + 1) % P.length];
      s += a[0] * b[1] - b[0] * a[1];
    }
    return s / 2;
  };
  const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const convex = (P) => {
    let sg = 0;
    for (let i = 0; i < P.length; i++) {
      const c = cross(P[i], P[(i + 1) % P.length], P[(i + 2) % P.length]);
      if (Math.abs(c) < 20) return false;
      if (sg && Math.sign(c) !== sg) return false;
      sg = Math.sign(c);
    }
    return true;
  };
  const edgesOk = (P, lo) => P.every((p, i) => Math.hypot(p[0] - P[(i + 1) % P.length][0], p[1] - P[(i + 1) % P.length][1]) >= lo);
  const inside = (P) => P.every((p) => p[0] >= 8 && p[0] <= 92 && p[1] >= 8 && p[1] <= 92);
  const pip = (P, x, y) => {
    let c = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++)
      if (P[i][1] > y !== P[j][1] > y && x < ((P[j][0] - P[i][0]) * (y - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) c = !c;
    return c;
  };
  const clip = (S, C) => {
    const sg = Math.sign(area(C));
    let out = S;
    for (let i = 0; i < C.length && out.length; i++) {
      const a = C[i];
      const b = C[(i + 1) % C.length];
      const inn = (p) => cross(a, b, p) * sg >= 0;
      const inp = out;
      out = [];
      for (let j = 0; j < inp.length; j++) {
        const p = inp[j];
        const q = inp[(j + 1) % inp.length];
        const ip = inn(p);
        const iq = inn(q);
        if (ip !== iq) {
          const d1 = cross(a, b, p);
          const d2 = cross(a, b, q);
          const t = d1 / (d1 - d2);
          out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
        }
        if (iq) out.push(q);
      }
    }
    return out.map((p) => [R1(p[0]), R1(p[1])]);
  };
  const GS = [];
  for (let y = 5; y < 96; y += 2) for (let x = 5; x < 96; x += 2) GS.push([x, y]);
  const maskOf = (P) => GS.map(([x, y]) => (pip(P, x, y) ? 1 : 0));
  const OPS = {
    and: (a, b) => a && b,
    or: (a, b) => a || b,
    amb: (a, b) => a && !b,
    bma: (a, b) => !a && b,
    xor: (a, b) => a !== b,
  };
  const opMask = (op, mA, mB) => mA.map((a, i) => (OPS[op](a, mB[i]) ? 1 : 0));
  const dist = (m, n) => {
    let d = 0;
    for (let i = 0; i < m.length; i++) if (m[i] !== n[i]) d++;
    return d;
  };
  const sum = (m) => m.reduce((a, b) => a + b, 0);

  function genPoly(rng, kind, nlo, nhi) {
    const cx = rng.int(32, 68);
    const cy = rng.int(32, 68);
    let P;
    if (kind === 'rect') {
      const w = rng.int(30, 56) / 2;
      const h = rng.int(20, 44) / 2;
      const a = rng.chance(0.35) ? 0 : (rng.int(10, 80) * Math.PI) / 180;
      P = [[-w, -h], [w, -h], [w, h], [-w, h]].map(([x, y]) => [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)]);
    } else if (kind === 'sq') {
      const s = rng.int(17, 28);
      const a = (rng.int(15, 75) * Math.PI) / 180;
      P = [0, 1, 2, 3].map((i) => [cx + s * Math.cos(a + (i * Math.PI) / 2), cy + s * Math.sin(a + (i * Math.PI) / 2)]);
    } else if (kind === 'tri') {
      const t0 = rng.next() * 6.283;
      const d1 = (rng.int(85, 150) * Math.PI) / 180;
      const d2 = (rng.int(85, 150) * Math.PI) / 180;
      const th = [t0, t0 + d1, t0 + d1 + d2];
      P = th.map((t) => {
        const r = rng.int(24, 40);
        return [cx + r * Math.cos(t), cy + r * Math.sin(t)];
      });
    } else {
      const n = rng.int(nlo, nhi);
      const t0 = rng.next() * 6.283;
      P = RM.range(n).map((i) => {
        const t = t0 + ((i + (rng.next() - 0.5) * 0.45) * 2 * Math.PI) / n;
        const r = rng.int(22, 38);
        return [cx + r * Math.cos(t), cy + r * Math.sin(t)];
      });
    }
    P = P.map((p) => [R1(p[0]), R1(p[1])]);
    RM.need(convex(P) && edgesOk(P, 9) && inside(P));
    return P;
  }

  const CFG = [
    { op: 'and', kinds: ['rect', 'sq', 'tri', 'poly'], n: [5, 5], diff: 7 },
    { op: 'and', kinds: ['poly'], n: [6, 7], diff: 8 },
    { op: 'amb', kinds: ['rect', 'sq', 'tri', 'poly'], n: [5, 6], diff: 7 },
    { op: 'xor', kinds: ['rect', 'sq', 'tri', 'poly'], n: [5, 6], diff: 8 },
  ];
  const OPTXT = {
    and: 'the part <b>covered by both</b> shapes',
    or: 'everything covered by <b>either</b> shape (the union)',
    amb: 'the part of the <b>first</b> shape that is <b>not</b> covered by the second',
    bma: 'the part of the <b>second</b> shape that is <b>not</b> covered by the first',
    xor: 'everything covered by <b>exactly one</b> of the two shapes',
  };
  const OPFLAW = {
    and: 'this is the part the two shapes have in common, but the rule asks for something else',
    or: 'this is the union of the two shapes (everything covered by either one), not only the part they share',
    amb: 'this is the first shape with the second one cut away (the part NOT shared), not the common part',
    bma: 'this is the second shape with the first one cut away (the part NOT shared), not the common part',
    xor: 'this is everything covered by exactly one of the shapes (the shared part is missing), not the common part',
  };

  RM.register({
    id: 'intersection',
    name: 'Intersection',
    difficulty: 7,
    generate(rng, variant) {
      const cfg = CFG[variant % 4];
      const op = cfg.op;
      const A = [];
      const B = [];
      for (let r = 0; r < 3; r++) {
        A.push(genPoly(rng, rng.pick(cfg.kinds), cfg.n[0], cfg.n[1]));
        B.push(genPoly(rng, rng.pick(cfg.kinds), cfg.n[0], cfg.n[1]));
      }
      const mA = A.map(maskOf);
      const mB = B.map(maskOf);
      const full = Object.keys(OPS);
      const M = [0, 1, 2].map((r) => {
        const o = {};
        full.forEach((k) => (o[k] = opMask(k, mA[r], mB[r])));
        return o;
      });
      /* all operations pairwise distinct in every row, and the shapes properly overlap */
      for (let r = 0; r < 3; r++) {
        for (let i = 0; i < full.length; i++) for (let j = i + 1; j < full.length; j++) RM.need(dist(M[r][full[i]], M[r][full[j]]) >= 150);
        const ar = sum(M[r].and);
        RM.need(ar >= 110 && ar <= 0.7 * Math.min(sum(mA[r]), sum(mB[r])));
        if (op === 'and') RM.need(clip(B[r], A[r]).length >= 3);
      }
      /* the result of each row, its spec */
      const resSpec = (r) => (op === 'and' ? { t: 'poly', P: clip(B[r], A[r]) } : { t: 'op', op, A: A[r], B: B[r] });
      const resMask = (s) => (s.t === 'poly' ? maskOf(s.P) : opMask(s.op, maskOf(s.A), maskOf(s.B)));
      const truth = resSpec(2);
      const tm = M[2][op];
      if (op === 'and') RM.need(dist(maskOf(truth.P), tm) <= 12);
      /* rule identifiability: only the intended operation fits rows 1–2 */
      const fit = full.filter((k) => [0, 1].every((r) => dist(M[r][k], resMask(resSpec(r))) <= 40));
      RM.need(fit.length === 1 && fit[0] === op);

      /* distractor candidates */
      const cands = [];
      const push = (grp, spec, flaw) => {
        if (spec.t === 'poly' && (spec.P.length < 3 || Math.abs(area(spec.P)) < 80)) return;
        cands.push({ grp, spec, flaw, m: resMask(spec) });
      };
      full.filter((k) => k !== op).forEach((k) => push('op', op === 'and' ? { t: 'op', op: k, A: A[2], B: B[2] } : { t: 'op', op: k, A: A[2], B: B[2] }, OPFLAW[k]));
      /* the right operation applied to shapes of different rows */
      [[0, 2], [1, 2], [2, 0], [2, 1]].forEach(([i, j]) => {
        const a = A[i];
        const b = B[j];
        const flaw = `this is built from the first shape of row ${i + 1} and the second shape of row ${j + 1}; only the two shapes of the same row (row 3) belong together`;
        if (op === 'and') push('pair', { t: 'poly', P: clip(b, a) }, flaw);
        else push('pair', { t: 'op', op, A: a, B: b }, flaw);
      });
      if (op === 'and') {
        const P = truth.P;
        const cen = [P.reduce((s, p) => s + p[0], 0) / P.length, P.reduce((s, p) => s + p[1], 0) / P.length];
        P.forEach((p, i) => {
          for (let t = 0; t < 2; t++) {
            const a = rng.next() * 6.283;
            const d = rng.int(6, 10);
            const q = [R1(p[0] + d * Math.cos(a)), R1(p[1] + d * Math.sin(a))];
            const Q = P.map((z, j) => (j === i ? q : z));
            if (Math.abs(area(Q)) < 80) continue;
            // keep the polygon simple (no crossing edges): a convex-ish check on the signed areas of the fan
            if (Q.some((z, j) => Math.sign(cross(Q[j], Q[(j + 1) % Q.length], Q[(j + 2) % Q.length])) !== Math.sign(area(Q)))) continue;
            push('vertex', { t: 'poly', P: Q }, '');
          }
        });
        if (P.length >= 4)
          P.forEach((p, i) => push('cut', { t: 'poly', P: P.filter((_, j) => j !== i) }, ''));
        [1.28, 0.74].forEach((f) => push('scale', { t: 'poly', P: P.map((p) => [R1(cen[0] + (p[0] - cen[0]) * f), R1(cen[1] + (p[1] - cen[1]) * f)]) }, ''));
      } else {
        for (let t = 0; t < 10; t++) {
          const a = rng.next() * 6.283;
          const d = rng.int(6, 11);
          const B2 = B[2].map((p) => [R1(p[0] + d * Math.cos(a)), R1(p[1] + d * Math.sin(a))]);
          if (!inside(B2)) continue;
          push('shift', { t: 'op', op, A: A[2], B: B2 }, `the second shape was moved by about ${d} units (${Math.abs(Math.cos(a)) > Math.abs(Math.sin(a)) ? (Math.cos(a) > 0 ? 'to the right' : 'to the left') : Math.sin(a) > 0 ? 'down' : 'up'}) before the operation, so the boundary of the result is in the wrong place`);
        }
      }
      /* generic, exact flaw text for polygon distractors, computed from the masks */
      cands.forEach((c) => {
        if (c.flaw) return;
        const outA = c.m.filter((v, i) => v && !mA[2][i]).length;
        const outB = c.m.filter((v, i) => v && !mB[2][i]).length;
        const miss = tm.filter((v, i) => v && !c.m[i]).length;
        const parts = [];
        if (outA > 8) parts.push('part of it lies outside the first shape');
        if (outB > 8) parts.push('part of it lies outside the second shape');
        if (miss > 8) parts.push('part of the common region is missing');
        c.flaw = `its outline is not the common region of the two shapes of row 3 — ${parts.join(' and ') || 'a corner is displaced'}`;
      });
      /* pick 7: pairwise clearly different, mixed groups */
      const pool = rng.shuffle(cands.filter((c) => dist(c.m, tm) >= 60));
      const order = op === 'and' ? ['op', 'op', 'op', 'pair', 'vertex', 'vertex', 'cut', 'scale', 'pair', 'op'] : ['op', 'op', 'op', 'op', 'pair', 'pair', 'shift', 'shift', 'shift', 'pair'];
      const chosen = [];
      const ok = (c) => !chosen.includes(c) && chosen.every((d) => dist(c.m, d.m) >= 60);
      order.forEach((g) => {
        if (chosen.length >= 7) return;
        const c = pool.find((x) => x.grp === g && ok(x));
        if (c) chosen.push(c);
      });
      pool.forEach((c) => {
        if (chosen.length < 7 && ok(c)) chosen.push(c);
      });
      RM.need(chosen.length === 7);
      const options = [{ spec: truth, flaws: [] }].concat(chosen.map((c) => ({ spec: c.spec, flaws: [c.flaw] })));

      const render = (s) => {
        const pic = new RM.Pic();
        pic.add('<rect x="4" y="4" width="92" height="92" fill="#fff"/>');
        for (let v = 16; v < 96; v += 12) {
          RM.line(pic, v, 4, v, 96, { sw: 0.6, color: RM.LIGHT });
          RM.line(pic, 4, v, 96, v, { sw: 0.6, color: RM.LIGHT });
        }
        const pts = (P) => P.map((p) => p[0] + ',' + p[1]).join(' ');
        if (s.t === 'one') pic.add(`<polygon points="${pts(s.P)}" fill="${pic.paint('gray')}" stroke="${RM.INK}" stroke-width="2.2" stroke-linejoin="round"/>`);
        else if (s.t === 'poly') pic.add(`<polygon points="${pts(s.P)}" fill="${RM.INK}"/>`);
        else {
          const mk = (nm, white, black) =>
            pic.def(nm, (id) => `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100"><polygon points="${pts(white)}" fill="#fff"/><polygon points="${pts(black)}" fill="#000"/></mask>`);
          const sub = (P, Q, nm) => pic.add(`<polygon points="${pts(P)}" fill="${RM.INK}" mask="url(#${mk(nm, P, Q)})"/>`);
          if (s.op === 'or') pic.add(`<polygon points="${pts(s.A)}" fill="${RM.INK}"/><polygon points="${pts(s.B)}" fill="${RM.INK}"/>`);
          else if (s.op === 'amb') sub(s.A, s.B, 'ab');
          else if (s.op === 'bma') sub(s.B, s.A, 'ba');
          else if (s.op === 'xor') {
            sub(s.A, s.B, 'ab');
            sub(s.B, s.A, 'ba');
          } else {
            const cid = pic.def('cl', (id) => `<clipPath id="${id}"><polygon points="${pts(s.A)}"/></clipPath>`);
            pic.add(`<polygon points="${pts(s.B)}" fill="${RM.INK}" clip-path="url(#${cid})"/>`);
          }
        }
        pic.add(`<rect x="4" y="4" width="92" height="92" fill="none" stroke="${RM.INK}" stroke-width="1.6"/>`);
        return pic.svg();
      };
      const key = (s) => JSON.stringify(s);

      /* explanation */
      const PA = A[2];
      const PB = B[2];
      const cornersIn = (P, Q) => P.filter((p) => pip(Q, p[0], p[1])).length;
      const rules = [];
      rules.push({
        k: 'The two shapes',
        t: `column 1 and column 2 show one shape each, placed in the <b>same frame</b> (the faint grid helps to compare positions). Column 3 shows, in black, ${OPTXT[op]} when the two shapes of the row are laid on top of each other.`,
      });
      const wrong = full.filter((k) => k !== op).map((k) => {
        const r = [0, 1].find((q) => dist(M[q][k], M[q][op]) >= 150);
        return `${OPTXT[k].replace(/<\/?b>/g, '')} would look quite different in row ${r + 1}`;
      });
      rules.push({ k: 'Which operation', t: `rows 1–2 settle it: ${wrong.join('; ')}. Only the chosen operation fits both rows.` });
      if (op === 'and') {
        const nA = cornersIn(PA, PB);
        const nB = cornersIn(PB, PA);
        const nX = truth.P.length - nA - nB;
        rules.push({
          k: 'Row 3',
          t: `overlay the two shapes of row 3. The common region is bounded by pieces of both outlines: it has <b>${truth.P.length} corners</b> — ${RM.plural(nA, 'corner')} of the first shape lying inside the second, ${RM.plural(nB, 'corner')} of the second lying inside the first, and ${RM.plural(nX, 'crossing point')} where an edge of one shape meets an edge of the other. Draw this ${truth.P.length}-sided region in black (nothing outside the overlap, nothing of the overlap left out): <b>${truth.P.length}-sided common region</b>.`,
        });
      } else if (op === 'amb') {
        rules.push({
          k: 'Row 3',
          t: `overlay the two shapes of row 3, then remove from the first shape everything the second one covers: the black part is the first shape's outline cut by the edges of the second shape — <b>first shape minus second shape</b> (the part of the second shape outside the first is not drawn).`,
        });
      } else {
        rules.push({
          k: 'Row 3',
          t: `overlay the two shapes of row 3 and keep what only one of them covers, removing the shared part: <b>both shapes without their common region</b> (the common region is white, the rest of each shape is black).`,
        });
      }
      const panels = [];
      for (let r = 0; r < 3; r++) {
        panels.push({ t: 'one', P: A[r] }, { t: 'one', P: B[r] });
        if (r < 2) panels.push(resSpec(r));
      }
      return {
        difficulty: cfg.diff,
        hint: op === 'and' ? 'put the two shapes of the row on top of each other — what do they share?' : 'put the two shapes of the row on top of each other and think about which parts are kept.',
        panels,
        answer: truth,
        options,
        render,
        key,
        rules,
      };
    },
  });
})();
