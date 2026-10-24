/* Hidden invariant (grandmaster): every panel holds 3–9 shapes (circle / square / triangle, black / white / grey,
 * large / small) scattered on a 3×3 field. Two numbers are linked in EVERY panel: count(A) = count(B) + k for two
 * classes A, B (k in −2..2) — this relation is the hidden invariant. The total number of shapes follows its own row
 * rule (progression per column, col 1 + col 2 = col 3, or a Latin square of totals). Checked: among all relations
 * count(A) − count(B) = k (every pair of classes, k −2..2) and all constants count(A) = c, exactly ONE holds in the 8
 * visible panels; the total rule is unique (needUnique). The correct option has the right total AND the relation;
 * every distractor breaks the relation (right total) or has the wrong total (relation holds) or both. */
(function () {
  'use strict';
  const RM = window.RM;

  const SHN = ['circle', 'square', 'triangle'];
  const FLN = ['black', 'white', 'grey'];
  const FILL = ['black', 'white', 'gray'];
  const SZN = ['large', 'small'];
  const CL = [
    'circles', 'squares', 'triangles', 'black shapes', 'white shapes', 'grey shapes', 'large shapes', 'small shapes',
  ];
  const counts = (items) => {
    const c = new Array(8).fill(0);
    items.forEach((it) => {
      c[it.sh]++;
      c[3 + it.fl]++;
      c[6 + it.sz]++;
    });
    return c;
  };
  const SLOT = [[22, 22], [50, 22], [78, 22], [22, 50], [50, 50], [78, 50], [22, 78], [50, 78], [78, 78]];

  RM.register({
    id: 'invariant',
    name: 'Hidden invariant',
    difficulty: 8,
    generate(rng, variant) {
      /* ---- intended relation count(A) − count(B) = k */
      let A, B, k;
      do {
        [A, B] = rng.sample(RM.range(8), 2);
        k = rng.pick([-2, -1, 1, 2, 0, 1, -1]);
      } while ((A >= 6 && B >= 6) || (variant === 0 && k === 0));
      const holds = (c) => c[A] - c[B] === k;
      /* normalised wording: count(P) = count(Q) + kk, kk >= 0 */
      const [P, Q, kk] = k >= 0 ? [A, B, k] : [B, A, -k];
      const relText = `the number of <b>${CL[P]}</b> is always the number of <b>${CL[Q]}</b>${kk ? ' plus ' + kk : ''}`;
      const relShort = `${CL[P]} = ${CL[Q]}${kk ? ' + ' + kk : ''}`;

      /* ---- totals */
      const rule = rng.pick(['prog', 'sum', 'latin']);
      let TG;
      let s = 0;
      let vals = null;
      if (rule === 'prog') {
        s = rng.pick([1, 2, -1, -2, 1, -1]);
        const lo = s > 0 ? 3 : 3 - 2 * s;
        const hi = s > 0 ? 9 - 2 * s : 9;
        const st = rng.sample(RM.range(hi - lo + 1).map((i) => lo + i), 3);
        TG = RM.grid3((r, c) => st[r] + s * c);
      } else if (rule === 'sum') {
        const pr = [];
        while (pr.length < 3) {
          const a = rng.int(2, 5);
          const b = rng.int(2, 5);
          if (a + b <= 9 && !pr.some((p) => p[0] === a && p[1] === b)) pr.push([a, b]);
        }
        TG = RM.grid3((r, c) => (c < 2 ? pr[r][c] : pr[r][0] + pr[r][1]));
        RM.need(new Set([0, 1, 2].map((r) => TG[r][2])).size >= 2);
      } else {
        vals = rng.sample([3, 4, 5, 6, 7, 8, 9], 3).sort((a, b) => a - b);
        TG = RM.latinGrid(rng, vals);
      }
      const T = TG[2][2];
      RM.need(T >= 3 && T <= 9);
      RM.needUnique(TG, T, 'numeric');

      /* ---- panels */
      const mk = (total, pred) => {
        for (let t = 0; t < 500; t++) {
          const items = RM.range(total).map(() => ({ sh: rng.int(0, 2), fl: rng.int(0, 2), sz: rng.int(0, 1) }));
          if (pred(counts(items))) return items;
        }
        return null;
      };
      const place = (items) => {
        const slots = rng.sample(RM.range(9), items.length);
        return items.map((it, i) => Object.assign({}, it, { s: slots[i], jx: rng.int(-3, 3), jy: rng.int(-3, 3) }));
      };
      const mkP = (total, pred) => {
        const it = mk(total, pred);
        RM.need(it);
        return place(it);
      };
      const PG = RM.grid3((r, c) => (r === 2 && c === 2 ? null : mkP(TG[r][c], holds)));
      /* simple rules on a class count that fit the visible panels fix that count in the answer (no misleading rule) */
      const wantC = [];
      for (let x = 0; x < 8; x++) {
        const g = RM.grid3((r, c) => (r === 2 && c === 2 ? undefined : counts(PG[r][c])[x]));
        const ps = new Set(RM.preds.numeric(g).map((p) => p[1]));
        RM.need(ps.size <= 1);
        wantC.push(ps.size ? [...ps][0] : null);
      }
      const ans = mkP(T, (c) => holds(c) && wantC.every((w, x) => w === null || c[x] === w));
      PG[2][2] = ans;
      const vis = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (r < 2 || c < 2) vis.push(counts(PG[r][c]));
      /* every relation count(X) − count(Y) = j and every constant must be checked */
      let surv = 0;
      for (let x = 0; x < 8; x++) {
        for (let c0 = 0; c0 <= 6; c0++) if (vis.every((cv) => cv[x] === c0)) surv++;
        for (let y = x + 1; y < 8; y++) for (let j = -2; j <= 2; j++) if (vis.every((cv) => cv[x] - cv[y] === j)) surv++;
      }
      RM.need(surv === 1);
      RM.need(new Set(vis.map((cv) => cv[A])).size >= 3 && new Set(vis.map((cv) => cv[B])).size >= 3);
      /* no simple rule on any class count may point elsewhere */
      const ac = counts(ans);
      for (let x = 0; x < 8; x++) RM.needNoConflict(RM.grid3((r, c) => counts(PG[r][c])[x]), ac[x], 'numeric');

      /* ---- distractors */
      const sp = (items) => ({ items });
      const key = (sp0) => sp0.items.map((i) => `${i.sh}${i.fl}${i.sz}@${i.s}.${i.jx}.${i.jy}`).sort().join('|');
      const brokenFlaw = (c) =>
        `the relation is broken: ${c[P]} ${CL[P]} against ${c[Q]} ${CL[Q]}${kk ? ' (+' + kk + ' = ' + (c[Q] + kk) + ')' : ''}`;
      const totalFlaw = (t) => `the relation holds, but it has ${t} shapes instead of ${T}`;
      const cands = [];
      const add = (items, flaws, tier) => items && cands.push({ items: place(items), flaws, tier });
      const want = (d) => (c) => c[A] - c[B] === k + d;
      // right total, relation off by 1 / 2 / mirrored
      for (const d of [1, -1, 1, -1, 2, -2]) {
        const it = mk(T, want(d));
        if (it) add(it, [brokenFlaw(counts(it))], 1);
      }
      if (k !== 0) {
        const it = mk(T, (c) => c[A] - c[B] === -k);
        if (it) add(it, [brokenFlaw(counts(it)) + ' — the sign of the difference is reversed'], 1);
      }
      // relation holds, wrong total
      const wt = [T - 2, T - 1, T + 1, T + 2].concat(rule === 'prog' ? [TG[2][1]] : [TG[2][0], TG[2][1]]).filter((t) => t >= 2 && t <= 9 && t !== T);
      wt.forEach((t) => {
        const it = mk(t, holds);
        if (it) add(it, [totalFlaw(t)], 2);
        const it2 = mk(t, holds);
        if (it2) add(it2, [totalFlaw(t)], 2);
      });
      // both wrong
      [T - 1, T + 1].filter((t) => t >= 2 && t <= 9).forEach((t) => {
        const it = mk(t, want(rng.pick([-1, 1])));
        if (it) add(it, [brokenFlaw(counts(it)), `it has ${t} shapes instead of ${T}`], 3);
      });
      const ak = key(sp(ans));
      const seen = new Set([ak]);
      const by = { 1: [], 2: [], 3: [] };
      rng.shuffle(cands).forEach((c) => {
        const kk2 = key(sp(c.items));
        if (seen.has(kk2)) return;
        seen.add(kk2);
        const cc = counts(c.items);
        // safety: a distractor must not satisfy relation AND total
        if (c.items.length === T && holds(cc)) return;
        by[c.tier].push(c);
      });
      const chosen = by[1].splice(0, 3).concat(by[2].splice(0, 3));
      const rest = by[1].concat(by[2], by[3]);
      while (chosen.length < 7 && rest.length) chosen.push(rest.shift());
      RM.need(chosen.length === 7 && chosen.filter((c) => c.tier === 1).length >= 2 && chosen.filter((c) => c.tier === 2).length >= 2);

      /* ---- drawing */
      const render = (spec) => {
        const pic = new RM.Pic();
        spec.items.forEach((it) => {
          const [x, y] = SLOT[it.s];
          const r = it.sz === 0 ? 10.5 : 6;
          const o = { fill: FILL[it.fl], sw: 2 };
          const cx = x + it.jx;
          const cy = y + it.jy;
          if (it.sh === 0) RM.shape(pic, 'circle', cx, cy, r, o);
          else if (it.sh === 1) RM.shape(pic, 'square', cx, cy, r * 1.12, o);
          else RM.shape(pic, 'triangle', cx, cy + (it.sz === 0 ? 1 : 0.5), r * 1.18, o);
        });
        return pic.svg();
      };

      /* ---- correction */
      const cc = (r, c) => counts(PG[r][c]);
      const ex = [[0, 0], [1, 1]].map(([r, c]) => `panel ${r * 3 + c + 1} has ${cc(r, c)[P]} ${CL[P]} and ${cc(r, c)[Q]} ${CL[Q]}`).join(', ');
      const T0 = TG.map((row) => row.join(', '));
      let totalTxt;
      if (rule === 'prog')
        totalTxt = `the total number of shapes changes by <b>${s > 0 ? '+' : '−'}${Math.abs(s)}</b> from one column to the next (rows: ${T0[0]} / ${T0[1]} / ${TG[2][0]}, ${TG[2][1]}, …). Row 3 therefore ends with ${TG[2][1]} ${s > 0 ? '+' : '−'} ${Math.abs(s)} = <b>${T}</b>.`;
      else if (rule === 'sum')
        totalTxt = `in every row the total of column 1 plus the total of column 2 gives the total of column 3 (${TG[0][0]} + ${TG[0][1]} = ${TG[0][2]}, ${TG[1][0]} + ${TG[1][1]} = ${TG[1][2]}). Row 3: ${TG[2][0]} + ${TG[2][1]} = <b>${T}</b>.`;
      else
        totalTxt = `the three totals ${vals.join(', ')} appear once in every row and every column (Latin square). Row 3 has ${TG[2][0]} and ${TG[2][1]}, so the last total is <b>${T}</b>.`;
      const rules = [
        {
          k: 'Hidden relation',
          t: `in every one of the 8 panels ${relText}. (For instance ${ex}.) No other relation between two counts (and no constant count) holds in all panels.`,
        },
        { k: 'Total', t: totalTxt },
        {
          k: 'Answer',
          t: `the missing panel needs exactly <b>${T} shapes</b> and ${relText}; the correct option has ${ac[P]} ${CL[P]} and ${ac[Q]} ${CL[Q]}${kk ? ' (' + ac[Q] + ' + ' + kk + ')' : ''}. Every other option either breaks the relation or has the wrong number of shapes.`,
        },
      ];

      const panels = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (r < 2 || c < 2) panels.push(sp(PG[r][c]));
      return {
        difficulty: 8,
        hint: 'count the shapes by kind (shape, colour, size): two of those counts are linked in every panel.',
        panels,
        answer: sp(ans),
        options: [{ spec: sp(ans), flaws: [] }].concat(chosen.map((c) => ({ spec: sp(c.items), flaws: c.flaws }))),
        render,
        key,
        rules,
      };
    },
  });
})();
