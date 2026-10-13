/* Elite families (e1) — set E "Hidden quantities": secret-values, abacus, crossings.
 *
 * In all three families the quantity that obeys the row rule is never drawn
 * directly: hidden token values, numbers written in an unknown base on an
 * abacus, and the number of points where lines cross. Every generator builds
 * its 8 options as a balanced cube of three mistakes (all subsets), but writes
 * the flaw text of each option itself so that the stated values are exact. */
(function () {
  'use strict';
  const RM = window.RM;

  /* ================================================================ shared helpers */
  const total = (a) => a.reduce((x, y) => x + y, 0);
  const dot = (a, b) => {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  };
  const vsub = (a, b) => a.map((v, i) => v - b[i]);
  const vlin = (vs, cs) => vs[0].map((_, i) => vs.reduce((s, v, j) => s + cs[j] * v[i], 0));
  const gcd = (a, b) => {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      const t = a % b;
      a = b;
      b = t;
    }
    return a;
  };
  const prim = (w) => {
    const g = w.reduce(gcd, 0) || 1;
    return w.map((v) => v / g);
  };
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  /* The 8 options as every subset of three mutations (mask bit i = mutation i).
   * Returns null when a mutation is impossible for some subset. */
  function cube(ans, muts) {
    const out = [];
    for (let mask = 0; mask < 8; mask++) {
      let s = RM.clone(ans);
      for (let i = 0; i < 3 && s; i++) if (mask & (1 << i)) s = muts[i](s);
      if (!s) return null;
      out.push({ spec: s, mask });
    }
    return out;
  }

  /* Decoy attributes (things a solver might count instead of the real
   * quantity): no simple rule on a decoy grid may contradict the answer, and
   * the decoys together must not single out the answer (no shortcut that
   * avoids the real rule). opts[0] must be the answer. */
  function decoysOk(decoys, opts) {
    const alive = opts.map(() => true);
    for (const d of decoys) {
      const want = d.val(opts[0].spec);
      const g = d.grid.map((r) => r.slice());
      g[2][2] = want;
      for (const p of RM.preds.numeric(g)) {
        if (p[1] !== want) return false;
        opts.forEach((o, i) => {
          if (d.val(o.spec) !== want) alive[i] = false;
        });
      }
    }
    return alive.filter(Boolean).length > 1;
  }

  /* Null space of a small integer matrix (rows = linear constraints on a
   * k-vector). Returns {rank, ray}: ray = the primitive integer generator when
   * the null space is one-dimensional. */
  function nullspace(cons, k) {
    const M = cons.filter((r) => r.some((v) => v)).map((r) => r.slice());
    const piv = [];
    let row = 0;
    for (let c = 0; c < k && row < M.length; c++) {
      let p = -1;
      let best = 1e-9;
      for (let i = row; i < M.length; i++)
        if (Math.abs(M[i][c]) > best) {
          best = Math.abs(M[i][c]);
          p = i;
        }
      if (p < 0) continue;
      const t = M[row];
      M[row] = M[p];
      M[p] = t;
      const pv = M[row][c];
      M[row] = M[row].map((v) => v / pv);
      for (let i = 0; i < M.length; i++)
        if (i !== row && M[i][c]) {
          const f = M[i][c];
          M[i] = M[i].map((v, j) => v - f * M[row][j]);
        }
      piv.push(c);
      row++;
    }
    const res = { rank: piv.length, ray: null };
    if (piv.length !== k - 1) return res;
    const free = RM.range(k).find((c) => !piv.includes(c));
    const x = new Array(k).fill(0);
    x[free] = 1;
    piv.forEach((c, i) => (x[c] = -M[i][free]));
    for (let m = 1; m <= 5040; m++) {
      if (x.every((v) => Math.abs(m * v - Math.round(m * v)) < 1e-7)) {
        res.ray = prim(x.map((v) => Math.round(m * v)));
        break;
      }
    }
    return res;
  }

  /* ================================================================ E1 Secret values */
  const TOKEN_GROUPS = [
    [
      { s: 'circle', f: 'black', r: 8.8, n: 'black disc', p: 'black discs' },
      { s: 'diamond', f: 'black', r: 10.2, n: 'black diamond', p: 'black diamonds' },
    ],
    [
      { s: 'triangle', f: 'white', r: 10.6, n: 'white triangle', p: 'white triangles' },
      { s: 'star5', f: 'white', r: 11, n: 'white star', p: 'white stars' },
    ],
    [
      { s: 'square', f: 'gray', r: 9.6, n: 'grey square', p: 'grey squares' },
      { s: 'cross', f: 'gray', r: 10.2, n: 'grey cross', p: 'grey crosses' },
    ],
  ];
  const MS_CACHE = {};
  /* all count vectors (k token kinds) with 2..7 tokens */
  function countVectors(k) {
    if (MS_CACHE[k]) return MS_CACHE[k];
    const out = [];
    const rec = (i, left, cur) => {
      if (i === k) {
        const t = total(cur);
        if (t >= 2 && t <= 7) out.push(cur.slice());
        return;
      }
      for (let c = 0; c <= left; c++) {
        cur.push(c);
        rec(i + 1, left - c, cur);
        cur.pop();
      }
    };
    rec(0, 7, []);
    MS_CACHE[k] = out;
    return out;
  }
  /* Row/column relations between three panel values x, y, z. Each returns the
   * list of vectors that must be orthogonal to the value vector w. */
  const REL = {
    equal: (x, y, z) => [vsub(x, y), vsub(y, z)],
    sum: (x, y, z) => [vlin([z, x, y], [1, -1, -1])],
    diff: (x, y, z) => [vlin([z, x, y], [1, -1, 1])],
    rdiff: (x, y, z) => [vlin([z, x, y], [1, 1, -1])],
    prog: (x, y, z) => [vlin([x, y, z], [1, -2, 1])],
  };
  /* Hypothesis families: a relation (or "equal totals") read along rows or
   * columns, with unknown token values w. */
  function svFamilies(P) {
    const fams = [];
    const lines = [
      { k: 'row', T: [[P[0], P[1], P[2]], [P[3], P[4], P[5]]], X: [P[6], P[7]] },
      { k: 'col', T: [[P[0], P[3], P[6]], [P[1], P[4], P[7]]], X: [P[2], P[5]] },
    ];
    lines.forEach((l) => {
      Object.keys(REL).forEach((name) => {
        const f = REL[name];
        const cons = f(...l.T[0]).concat(f(...l.T[1]));
        if (name === 'equal') cons.push(vsub(l.X[0], l.X[1]));
        fams.push({ id: l.k + '-' + name, cons, acc: (o) => f(l.X[0], l.X[1], o) });
      });
      const S0 = vlin(l.T[0], [1, 1, 1]);
      const S1 = vlin(l.T[1], [1, 1, 1]);
      fams.push({ id: l.k + '-total', cons: [vsub(S0, S1)], acc: (o) => [vsub(vlin([l.X[0], l.X[1], o], [1, 1, 1]), S0)] });
    });
    return fams;
  }

  RM.register({
    id: 'secret-values',
    name: 'Secret values',
    difficulty: 6,
    generate(rng, variant) {
      const v = variant % 4;
      const k = v === 2 ? 4 : 3;
      const mode = ['equal', 'sum', 'equal', 'diff'][v];
      const groups = rng.shuffle(TOKEN_GROUPS);
      let types = groups.map((g) => rng.pick(g));
      if (k === 4) {
        const g = rng.pick(groups);
        types.push(g.find((t) => !types.includes(t)));
      }
      types = rng.shuffle(types);
      const w = rng.sample([1, 2, 3, 4, 5, 6], k);
      const u = prim(w);
      const V = (n) => dot(n, u);
      const all = countVectors(k);
      const by = new Map();
      all.forEach((n) => {
        const t = V(n);
        if (!by.has(t)) by.set(t, []);
        by.get(t).push(n);
      });
      const small = all.filter((n) => total(n) <= 4);
      const same = (a, b) => a.join() === b.join();
      let rows;
      if (mode === 'equal') {
        const Ts = Array.from(by.keys()).filter((t) => by.get(t).length >= 5);
        RM.need(Ts.length >= 3);
        rows = rng.sample(Ts, 3).map((T, r) => {
          const c = rng.sample(by.get(T), 3);
          if (r === 2) {
            const fit = by.get(T).filter((n) => total(n) <= 6 && !same(n, c[0]) && !same(n, c[1]));
            RM.need(fit.length > 0);
            c[2] = rng.pick(fit);
          }
          return c;
        });
      } else {
        rows = [0, 1, 2].map(() => {
          const x = rng.pick(small);
          const y = rng.pick(small);
          const T = V(x) + V(y);
          const un = vlin([x, y], [1, 1]);
          const cand = (by.get(T) || []).filter((z) => !same(z, un));
          RM.need(cand.length > 0);
          const z = rng.pick(cand);
          // sum: tray 3 = tray 1 + tray 2; diff: tray 1 = tray 2 + tray 3
          return mode === 'sum' ? [x, y, z] : [z, x, y];
        });
      }
      const P = RM.flat(rows);
      const ans = rows[2][2];
      RM.need(total(ans) >= 2 && total(ans) <= 6);
      rows.forEach((r) => RM.need(!same(r[0], r[1]) && !same(r[0], r[2]) && !same(r[1], r[2])));
      // every kind of token appears in rows 1–2
      RM.need(RM.range(k).every((t) => P.slice(0, 6).some((n) => n[t] > 0)));
      // the number of tokens is not what is constant / added
      if (mode === 'equal') [0, 1].forEach((r) => RM.need(new Set(rows[r].map(total)).size > 1));

      // ---- decoys: number of tokens and number of each kind of token
      const decoys = [{ grid: RM.grid3((r, c) => total(rows[r][c])), val: (s) => total(s.n) }].concat(
        RM.range(k).map((t) => ({ grid: RM.grid3((r, c) => rows[r][c][t]), val: (s) => s.n[t] }))
      );

      // ---- the intended relation must fix the values up to a common factor
      const fams = svFamilies(P);
      const fid = { equal: 'row-equal', sum: 'row-sum', diff: 'row-diff' }[mode];
      const ns = nullspace(fams.find((f) => f.id === fid).cons, k);
      RM.need(ns.rank === k - 1 && ns.ray && same(ns.ray, u));

      // ---- every hypothesis (relation along rows/columns × values) consistent
      // with the visible panels. A relation that fixes the values (1-D null
      // space) gives exactly one valuation; an under-determined one is only
      // considered with "natural" valuations (count everything, count one kind,
      // the true values).
      const ones = new Array(k).fill(1);
      const natural = [ones, u].concat(RM.range(k).map((t) => RM.range(k).map((j) => (j === t ? 1 : 0))));
      const hyps = [];
      fams.forEach((F) => {
        const r = nullspace(F.cons, k);
        if (r.rank === k) return;
        if (r.rank === k - 1) {
          if (!r.ray) return;
          let ray = r.ray;
          if (ray.every((x) => x <= 0)) ray = ray.map((x) => -x);
          if (ray.some((x) => x < 0)) return; // no non-negative valuation
          hyps.push({ F, w: ray });
        } else natural.forEach((wv) => F.cons.every((c) => dot(c, wv) === 0) && hyps.push({ F, w: wv }));
      });
      const degenerate = (wv) => wv.some((x) => x === 0) || wv.every((x) => x === wv[0]);
      const accepts = (h, n) => h.F.acc(n).every((c) => dot(c, h.w) === 0);

      // ---- mistakes: X→Y swapped, one extra Z, one V removed
      const combos = [];
      RM.range(k).forEach((X) => {
        if (!ans[X]) return;
        RM.range(k).forEach((Y) => {
          if (Y === X) return;
          RM.range(k).forEach((Z) => {
            if (Z === X) return;
            RM.range(k).forEach((Vt) => {
              if (Vt === Y || Vt === Z) return;
              if (ans[Vt] - (Vt === X ? 1 : 0) < 1) return; // V must still be there after A
              // no subset of the three changes may cancel out (value or content)
              const dA = u[Y] - u[X];
              const dB = u[Z];
              const dC = -u[Vt];
              if (!dA || !(dA + dB) || !(dA + dC) || !(dB + dC) || !(dA + dB + dC)) return;
              combos.push([X, Y, Z, Vt]);
            });
          });
        });
      });
      let opts = null;
      let mis = null;
      for (const cmb of rng.shuffle(combos)) {
        const [X, Y, Z, Vt] = cmb;
        const o = cube({ n: ans.slice(), seed: rng.seed() }, [
          (s) => (s.n[X] ? ((s.n[X]--, s.n[Y]++), s) : null),
          (s) => (s.n[Z]++, s),
          (s) => (s.n[Vt] ? (s.n[Vt]--, s) : null),
        ]);
        if (!o) continue;
        if (o.some((x) => total(x.spec.n) < 1 || total(x.spec.n) > 8)) continue;
        if (new Set(o.map((x) => x.spec.n.join())).size !== 8) continue;
        let ok = true;
        for (const h of hyps) {
          const acc = o.map((x, i) => (accepts(h, x.spec.n) ? i : -1)).filter((i) => i >= 0);
          if (h.F.id === fid && same(h.w, u)) ok = ok && acc.length === 1 && acc[0] === 0;
          else if (degenerate(h.w)) ok = ok && (acc.length === 0 || (acc.includes(0) && acc.length >= 2));
          else ok = ok && acc.every((i) => i === 0);
          if (!ok) break;
        }
        if (!ok || !decoysOk(decoys, o)) continue;
        opts = o;
        mis = cmb;
        break;
      }
      RM.need(!!opts);
      RM.need(hyps.some((h) => h.F.id === fid && same(h.w, u)));

      // ---- texts
      const tokens = (n) =>
        RM.list(n.map((c, t) => (c ? plural(c, types[t].n, types[t].p) : null)).filter(Boolean));
      const side = (n) =>
        n
          .map((c, t) => (c ? plural(c, types[t].n, types[t].p) : null))
          .filter(Boolean)
          .join(' + ');
      const worth = (n) =>
        n
          .map((c, t) => (c ? (c > 1 ? `${c}×${u[t]}` : `${u[t]}`) : null))
          .filter(Boolean)
          .join(' + ') +
        ' = ' +
        V(n);
      // the simplest independent equations that fix the values
      const cands = [];
      if (mode === 'equal') {
        [0, 1, 2].forEach((r) =>
          [[0, 1], [0, 2], [1, 2]].forEach(([i, j]) => {
            if (r === 2 && j === 2) return;
            cands.push({ d: vsub(rows[r][i], rows[r][j]), t: `row ${r + 1}, trays ${i + 1} and ${j + 1} are worth the same` });
          })
        );
      } else
        [0, 1].forEach((r) => {
          const R = rows[r];
          if (mode === 'sum') cands.push({ d: vlin(R, [-1, -1, 1]), t: `row ${r + 1}, tray 3 is worth trays 1 and 2 together` });
          else cands.push({ d: vlin(R, [1, -1, -1]), t: `row ${r + 1}, tray 1 is worth trays 2 and 3 together` });
        });
      cands.sort((a, b) => total(a.d.map(Math.abs)) - total(b.d.map(Math.abs)));
      const eqs = [];
      cands.forEach((c) => {
        if (eqs.length >= k - 1) return;
        if (nullspace(eqs.map((e) => e.d).concat([c.d]), k).rank > eqs.length) eqs.push(c);
      });
      const eqText = eqs
        .map((e) => {
          const pos = e.d.map((x) => Math.max(x, 0));
          const neg = e.d.map((x) => Math.max(-x, 0));
          return `${e.t} — cancel the tokens they share: <i>${side(pos)} = ${side(neg)}</i>`;
        })
        .join('; ');
      const tv = rows.map((r) => r.map(V));
      const T = tv[2][2];
      let ruleText;
      let ansText;
      if (mode === 'equal') {
        ruleText = `the three trays of a row are worth the same: row 1 → ${tv[0].join(' · ')}, row 2 → ${tv[1].join(' · ')}.`;
        ansText = `row 3: tray 1 = ${worth(rows[2][0])}, tray 2 = ${worth(rows[2][1])}, so the missing tray must be worth ${T} as well: <b>${tokens(ans)}</b> (${worth(ans)}).`;
      } else if (mode === 'sum') {
        ruleText = `tray 3 is worth tray 1 + tray 2: row 1: ${tv[0][0]} + ${tv[0][1]} = ${tv[0][2]}; row 2: ${tv[1][0]} + ${tv[1][1]} = ${tv[1][2]}.`;
        ansText = `row 3: tray 1 = ${worth(rows[2][0])}, tray 2 = ${worth(rows[2][1])}, so the missing tray must be worth ${tv[2][0]} + ${tv[2][1]} = ${T}: <b>${tokens(ans)}</b> (${worth(ans)}).`;
      } else {
        ruleText = `tray 3 is worth tray 1 − tray 2: row 1: ${tv[0][0]} − ${tv[0][1]} = ${tv[0][2]}; row 2: ${tv[1][0]} − ${tv[1][1]} = ${tv[1][2]}.`;
        ansText = `row 3: tray 1 = ${worth(rows[2][0])}, tray 2 = ${worth(rows[2][1])}, so the missing tray must be worth ${tv[2][0]} − ${tv[2][1]} = ${T}: <b>${tokens(ans)}</b> (${worth(ans)}).`;
      }
      const options = opts.map((o) => ({
        spec: o.spec,
        flaws: o.mask ? [`this tray is worth ${worth(o.spec.n)}, not ${T}`] : [],
      }));
      void mis;
      return {
        difficulty: k === 4 ? 7 : 6,
        hint: 'each kind of token is worth a fixed, hidden amount.',
        panels: P.map((n) => ({ n, seed: rng.seed() })),
        answer: options[0].spec,
        options,
        key: (s) => s.n.join(','),
        render(sp) {
          const pic = new RM.Pic();
          pic.add(`<rect x="8" y="8" width="84" height="84" rx="10" fill="#eef0f3" stroke="${RM.GRAY}" stroke-width="1.6"/>`);
          const r = RM.rng(sp.seed);
          const items = [];
          sp.n.forEach((c, t) => {
            for (let i = 0; i < c; i++) items.push(t);
          });
          const slots = r.sample(RM.range(9), items.length);
          r.shuffle(items).forEach((t, i) => {
            const T2 = types[t];
            RM.shape(pic, T2.s, 25 + (slots[i] % 3) * 25, 25 + Math.floor(slots[i] / 3) * 25, T2.r, { fill: T2.f, sw: 1.8 });
          });
          return pic.svg();
        },
        rules: [
          {
            k: 'Hidden values',
            t: `each kind of token is worth a fixed number of points; how many tokens a tray holds and where they lie does not matter. Values that work: ${types
              .map((t, i) => `${t.n} = <b>${u[i]}</b>`)
              .join(', ')} (any common multiple works just as well).`,
          },
          { k: 'Finding them', t: eqText + '.' },
          { k: 'Row rule', t: ruleText },
          { k: 'Answer', t: ansText },
        ],
      };
    },
  });

  /* ================================================================ E2 Abacus */
  const SUBD = '₀₁₂₃₄₅₆₇₈₉';
  const ORN = ['circle', 'triangle', 'square'];
  RM.register({
    id: 'abacus',
    name: 'Abacus',
    difficulty: 6,
    generate(rng, variant) {
      const v = variant % 4;
      const B = [4, 3, 5, 4][v];
      const sub = v === 3;
      const N = B * B * B;
      const dig = (x) => [Math.floor(x / (B * B)), Math.floor(x / B) % B, x % B];
      // number of carries (or borrows) between rods for x ± y
      const nCarry = (x, y) => {
        const a = dig(x);
        const b = dig(y);
        let c = 0;
        let n = 0;
        for (let i = 2; i >= 1; i--) {
          const s = sub ? a[i] - b[i] - c : a[i] + b[i] + c;
          c = sub ? (s < 0 ? 1 : 0) : s >= B ? 1 : 0;
          n += c;
        }
        return n;
      };
      const rows = [0, 1, 2].map(() => {
        for (let t = 0; t < 60; t++) {
          let x;
          let y;
          if (!sub) {
            x = rng.int(1, N - 2);
            y = rng.int(1, N - 1 - x);
          } else {
            x = rng.int(2, N - 1);
            y = rng.int(1, x - 1);
          }
          const z = sub ? x - y : x + y;
          const beads = (n) => total(dig(n));
          if (x !== y && z !== y && nCarry(x, y) >= 1 && beads(x) >= 2 && beads(y) >= 2) return [x, y, z];
        }
        throw RM.RETRY;
      });
      RM.need(new Set(rows.map((r) => r.join())).size === 3);
      const D = rows.map((r) => r.map(dig));
      const vis = RM.flat(D);
      const maxD = Math.max(...[].concat(...vis));
      const ansD = D[2][2];
      // every rod shows beads somewhere, and the number is not trivially readable
      [0, 1, 2].forEach((i) => RM.need(vis.some((d) => d[i] > 0)));

      // ---- hypotheses: (base, reading direction, operation) and rod-wise rules
      const same = (a, b) => !!a && !!b && a.join() === b.join();
      const hyps = [];
      for (let b = maxD + 1; b <= 10; b++)
        for (const le of [false, true]) {
          const val = (d) => (le ? d[2] * b * b + d[1] * b + d[0] : d[0] * b * b + d[1] * b + d[2]);
          const toD = (x) => {
            if (x < 0 || x >= b * b * b) return null;
            const d = [Math.floor(x / (b * b)), Math.floor(x / b) % b, x % b];
            return le ? d.reverse() : d;
          };
          hyps.push({ id: `b${b}${le ? 'le' : ''}-add`, f: (p, q) => toD(val(p) + val(q)) });
          hyps.push({ id: `b${b}${le ? 'le' : ''}-sub`, f: (p, q) => toD(val(p) - val(q)) });
          hyps.push({ id: `b${b}${le ? 'le' : ''}-rsub`, f: (p, q) => toD(val(q) - val(p)) });
          if (!le) {
            hyps.push({ id: `b${b}-modadd`, f: (p, q) => p.map((x, i) => (x + q[i]) % b) });
            hyps.push({ id: `b${b}-modsub`, f: (p, q) => p.map((x, i) => RM.mod(x - q[i], b)) });
            hyps.push({ id: `b${b}-modrsub`, f: (p, q) => p.map((x, i) => RM.mod(q[i] - x, b)) });
          }
        }
      hyps.push({ id: 'rodsum', f: (p, q) => p.map((x, i) => x + q[i]) });
      hyps.push({ id: 'rodabs', f: (p, q) => p.map((x, i) => Math.abs(x - q[i])) });
      hyps.push({ id: 'roddiff', f: (p, q) => (p.every((x, i) => x >= q[i]) ? p.map((x, i) => x - q[i]) : null) });
      hyps.push({ id: 'rodrdiff', f: (p, q) => (p.every((x, i) => x <= q[i]) ? p.map((x, i) => q[i] - x) : null) });
      hyps.push({ id: 'rodmax', f: (p, q) => p.map((x, i) => Math.max(x, q[i])) });
      hyps.push({ id: 'rodmin', f: (p, q) => p.map((x, i) => Math.min(x, q[i])) });
      const preds = new Set();
      let intended = false;
      hyps.forEach((h) => {
        if (![0, 1].every((r) => same(h.f(D[r][0], D[r][1]), D[r][2]))) return;
        const p = h.f(D[2][0], D[2][1]);
        if (!p) return; // the hypothesis cannot produce a row-3 panel at all
        preds.add(p.join());
        if (h.id === `b${B}-${sub ? 'sub' : 'add'}`) intended = true;
      });
      RM.need(intended && preds.size === 1 && preds.has(ansD.join()));

      // ---- ornament: Latin square
      const orn = RM.latinGrid(rng, ORN);
      RM.needUnique(orn, orn[2][2], 'categorical');

      // ---- mistakes: carry/borrow dropped, ±1 bead on the units rod, wrong ornament
      const noCarry = D[2][0].map((x, i) => RM.mod(sub ? x - D[2][1][i] : x + D[2][1][i], B));
      RM.need(!same(noCarry, ansD) && noCarry[2] === ansD[2]);
      const delta = ansD[2] === B - 1 ? -1 : ansD[2] === 0 ? 1 : rng.pick([1, -1]);
      const otherOrn = rng.pick(ORN.filter((o) => o !== orn[2][2]));
      const ans = { d: ansD.slice(), o: orn[2][2] };
      const opts = cube(ans, [(s) => ((s.d = noCarry.slice()), s), (s) => ((s.d[2] += delta), s), (s) => ((s.o = otherOrn), s)]);
      RM.need(!!opts && new Set(opts.map((o) => o.spec.d.join() + o.spec.o)).size === 8);
      // ---- decoys: each rod read as an independent count, and the total number of beads
      const decoys = [0, 1, 2]
        .map((i) => ({ grid: RM.grid3((r, c) => D[r][c][i]), val: (s) => s.d[i] }))
        .concat([{ grid: RM.grid3((r, c) => total(D[r][c])), val: (s) => total(s.d) }]);
      // only digits matter for the shortcut test: drop the ornament half of the cube
      RM.need(decoysOk(decoys, opts.filter((o) => !(o.mask & 4))));

      // ---- texts
      const num = (d) => d.join('') + SUBD[B];
      const ROD = ['left', 'middle', 'right'];
      const place = [`${B * B}s`, `${B}s`, 'units'];
      const op = sub ? '−' : '+';
      const steps = [];
      {
        const a = D[2][0];
        const b = D[2][1];
        let c = 0;
        for (let i = 2; i >= 0; i--) {
          if (!sub) {
            const s = a[i] + b[i] + c;
            steps.push(`${ROD[i]} rod: ${a[i]} + ${b[i]}${c ? ' + 1 carried' : ''} = ${s}${s >= B ? ` → ${s - B} bead${s - B === 1 ? '' : 's'}, carry 1 to the left` : ''}`);
            c = s >= B ? 1 : 0;
          } else {
            const s = a[i] - b[i] - c;
            const lhs = `${a[i]} − ${b[i]}${c ? ' − 1' : ''}`;
            const note = c ? ' (1 was lent to the right rod)' : '';
            steps.push(`${ROD[i]} rod: ${lhs}${note} ${s < 0 ? `is negative → borrow from the left rod (+${B}): ${B} + ${lhs} = ${s + B}` : `= ${s}`}`);
            c = s < 0 ? 1 : 0;
          }
        }
      }
      const rowEq = (r) => `${num(D[r][0])} ${op} ${num(D[r][1])} = ${num(D[r][2])} (${rows[r][0]} ${op} ${rows[r][1]} = ${rows[r][2]})`;
      const options = opts.map((o) => {
        const fl = [];
        if (o.mask & 3) {
          const why = [];
          if (o.mask & 1) why.push(sub ? 'a borrow was not taken from the next rod' : 'a carry was not passed to the next rod');
          if (o.mask & 2) why.push(`the right rod has one bead too ${delta > 0 ? 'many' : 'few'}`);
          fl.push(`the rods read ${num(o.spec.d)} instead of ${num(ansD)} (${why.join(' and ')})`);
        }
        if (o.mask & 4) fl.push(`the symbol on top should be a ${orn[2][2]}, not a ${o.spec.o}`);
        return { spec: o.spec, flaws: fl };
      });
      return {
        difficulty: sub ? 7 : 6,
        hint: 'each abacus is a number — but not necessarily in base ten.',
        panels: RM.flat(RM.grid3((r, c) => ({ d: D[r][c], o: orn[r][c] }))),
        answer: ans,
        options,
        key: (s) => s.d.join(',') + s.o,
        render(sp) {
          const pic = new RM.Pic();
          RM.shape(pic, sp.o, 50, 11.5, 5.6, { fill: 'white', sw: 1.8 });
          pic.add(`<rect x="13" y="21" width="74" height="72" rx="3" fill="#f7f7f8" stroke="${RM.INK}" stroke-width="2.4"/>`);
          [28, 50, 72].forEach((x, i) => {
            RM.line(pic, x, 22.2, x, 91.8, { sw: 1.6, color: RM.GRAY, cap: 'butt' });
            for (let j = 0; j < sp.d[i]; j++) RM.circle(pic, x, 92 - 7.2 - j * 13.2, 6, { fill: 'black', sw: 0 });
          });
          return pic.svg();
        },
        rules: [
          {
            k: 'Numbers',
            t: `each abacus is a 3-digit number in <b>base ${B}</b>: the left rod counts ${place[0]}, the middle rod ${place[1]}, the right rod units. A rod never holds more than ${B - 1} beads — ${B} beads on one rod are exchanged for 1 bead on the rod to its left.`,
          },
          { k: 'Row rule', t: `panel 3 = panel 1 ${op} panel 2. Row 1: ${rowEq(0)}; row 2: ${rowEq(1)}.` },
          { k: 'Row 3', t: `${num(D[2][0])} ${op} ${num(D[2][1])}, rod by rod from the right: ${steps.join('; ')} → <b>${num(ansD)}</b> (${rows[2][0]} ${op} ${rows[2][1]} = ${rows[2][2]}): ${ansD.join(', ')} beads from left to right.` },
          { k: 'Top symbol', t: `circle, triangle and square appear once in every row and every column → <b>${orn[2][2]}</b>.` },
        ],
      };
    },
  });

  /* ================================================================ E3 Crossings */
  const rad = Math.PI / 180;
  function lineX(p1, p2, q1, q2) {
    const d1x = p2[0] - p1[0];
    const d1y = p2[1] - p1[1];
    const d2x = q2[0] - q1[0];
    const d2y = q2[1] - q1[1];
    const den = d1x * d2y - d1y * d2x;
    if (Math.abs(den) < 1e-9) return null;
    const t = ((q1[0] - p1[0]) * d2y - (q1[1] - p1[1]) * d2x) / den;
    return [p1[0] + t * d1x, p1[1] + t * d1y];
  }
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  function segDist(p, a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  }

  /* ---- two families of nearly parallel lines spanning the frame 6..94 */
  const LAY = new Map();
  function family(r, n, steep) {
    if (!n) return [];
    const s = n > 1 ? Math.min(13, 60 / (n - 1)) : 0;
    const span = s * (n - 1);
    const shift = (r.next() * 2 - 1) * Math.max(0, (60 - span) / 2);
    const th0 = (r.next() * 2 - 1) * 11;
    const jit = n >= 6 ? 2.5 : 5;
    const gap = Math.min(6.5, s * 0.72);
    const L = [];
    for (let i = 0; i < n; i++) {
      const c = 50 + shift + (i - (n - 1) / 2) * s + (r.next() * 2 - 1) * s * 0.18;
      const t = Math.tan((th0 + (r.next() * 2 - 1) * jit) * rad) * 44;
      const e1 = c - t;
      const e2 = c + t;
      if (e1 < 14 || e1 > 86 || e2 < 14 || e2 > 86) return null;
      L.push([e1, e2]);
    }
    for (let i = 1; i < n; i++) if (L[i][0] - L[i - 1][0] < gap || L[i][1] - L[i - 1][1] < gap) return null;
    return L.map(([e1, e2]) => (steep ? [[e1, 6], [e2, 94]] : [[6, e1], [94, e2]]));
  }
  /* deterministic layout of a shallow-ish family (a lines) and a steep-ish
   * family (b lines); swp exchanges which family is steep. null if impossible. */
  function lineLayout(a, b, seed, swp) {
    const key = a + ',' + b + ',' + seed + ',' + (swp ? 1 : 0);
    if (LAY.has(key)) return LAY.get(key);
    const r = RM.rng(seed);
    let res = null;
    for (let t = 0; t < 150 && !res; t++) {
      const A = family(r, a, !!swp);
      const Bl = family(r, b, !swp);
      if (!A || !Bl) continue;
      const pts = [];
      let ok = true;
      for (const l of A)
        for (const m of Bl) {
          const p = lineX(l[0], l[1], m[0], m[1]);
          if (!p || p[0] < 12 || p[0] > 88 || p[1] < 12 || p[1] > 88) ok = false;
          else pts.push(p);
        }
      for (let i = 0; ok && i < pts.length; i++) for (let j = i + 1; ok && j < pts.length; j++) if (dist(pts[i], pts[j]) < 5.5) ok = false;
      if (ok) res = { A, B: Bl };
    }
    if (LAY.size > 4000) LAY.clear();
    LAY.set(key, res);
    return res;
  }

  /* ---- chords of a circle */
  const CR = 40;
  const cpt = (deg) => [50 + CR * Math.sin(deg * rad), 50 - CR * Math.cos(deg * rad)];
  const between = (x, a, b) => (a < b ? x > a && x < b : x > a || x < b);
  const crosses = (c, d) => between(d.a, c.a, c.b) !== between(d.b, c.a, c.b);
  function chordCount(ch) {
    let n = 0;
    for (let i = 0; i < ch.length; i++) for (let j = i + 1; j < ch.length; j++) if (crosses(ch[i], ch[j])) n++;
    return n;
  }
  const arcGap = (x, y) => {
    const d = Math.abs(x - y) % 360;
    return d < 180 ? d : 360 - d;
  };
  /* general position: distinct well-separated endpoints, crossings well inside
   * the circle, well apart, at clear angles and away from other chords */
  function chordsOk(ch) {
    const ang = [];
    ch.forEach((c) => ang.push(c.a, c.b));
    for (let i = 0; i < ang.length; i++) for (let j = i + 1; j < ang.length; j++) if (arcGap(ang[i], ang[j]) < 12) return false;
    if (ch.some((c) => arcGap(c.a, c.b) < 54)) return false;
    const seg = ch.map((c) => [cpt(c.a), cpt(c.b)]);
    const X = [];
    for (let i = 0; i < ch.length; i++)
      for (let j = i + 1; j < ch.length; j++) {
        if (crosses(ch[i], ch[j])) {
          const p = lineX(seg[i][0], seg[i][1], seg[j][0], seg[j][1]);
          if (!p || dist(p, [50, 50]) > CR - 4.5) return false;
          const u1 = [seg[i][1][0] - seg[i][0][0], seg[i][1][1] - seg[i][0][1]];
          const u2 = [seg[j][1][0] - seg[j][0][0], seg[j][1][1] - seg[j][0][1]];
          const cs = Math.abs(dot(u1, u2)) / (Math.hypot(...u1) * Math.hypot(...u2));
          if (cs > Math.cos(22 * rad)) return false;
          X.push({ p, i, j });
        } else {
          const dmin = Math.min(segDist(seg[i][0], seg[j][0], seg[j][1]), segDist(seg[i][1], seg[j][0], seg[j][1]), segDist(seg[j][0], seg[i][0], seg[i][1]), segDist(seg[j][1], seg[i][0], seg[i][1]));
          if (dmin < 4) return false;
        }
      }
    for (let a = 0; a < X.length; a++) {
      for (let b = a + 1; b < X.length; b++) if (dist(X[a].p, X[b].p) < 5.5) return false;
      for (let m = 0; m < ch.length; m++) if (m !== X[a].i && m !== X[a].j && segDist(X[a].p, seg[m][0], seg[m][1]) < 4) return false;
    }
    return true;
  }
  /* all perfect matchings of 2n points on a circle, bucketed by their number
   * of crossing pairs (computed once per n) */
  const MATCH = {};
  function matchings(n) {
    if (MATCH[n]) return MATCH[n];
    const out = {};
    const rec = (free, cur) => {
      if (!free.length) {
        let x = 0;
        for (let i = 0; i < cur.length; i++)
          for (let j = i + 1; j < cur.length; j++) {
            const [a, b] = cur[i];
            const [c, d] = cur[j];
            if ((a < c && c < b && b < d) || (c < a && a < d && d < b)) x++;
          }
        // no chord joins two neighbouring endpoints (it would be a tiny sliver)
        if (cur.every(([a, b]) => b - a >= 2 && 2 * n - (b - a) >= 2)) (out[x] = out[x] || []).push(cur.slice());
        return;
      }
      const a = free[0];
      for (let k = 1; k < free.length; k++) {
        cur.push([a, free[k]]);
        rec(free.filter((_, i) => i !== 0 && i !== k), cur);
        cur.pop();
      }
    };
    rec(RM.range(2 * n), []);
    MATCH[n] = out;
    return out;
  }
  /* 2n endpoint angles spread around the circle (jittered), sorted */
  function randAngles(r, n) {
    const st = 360 / (2 * n);
    const off = r.next() * 360;
    return RM.range(2 * n)
      .map((k) => Math.round(off + k * st + (r.next() * 2 - 1) * st * 0.3) % 360)
      .sort((x, y) => x - y);
  }
  function chordPanel(rng, n, T) {
    const bucket = matchings(n)[T];
    if (!bucket) return null;
    for (let t = 0; t < 80; t++) {
      const ang = randAngles(rng, n);
      const ch = rng.pick(bucket).map(([i, j], id) => ({ id, a: ang[i], b: ang[j] }));
      if (chordCount(ch) === T && chordsOk(ch)) return ch;
    }
    return null;
  }
  const chordKey = (ch) =>
    ch
      .map((c) => c.a + '-' + c.b)
      .sort()
      .join(',');

  RM.register({
    id: 'crossings',
    name: 'Crossings',
    difficulty: 6,
    generate(rng, variant) {
      const v = variant % 4;
      const hint = 'don’t count the lines — count what they create.';
      if (v === 2) return chordPuzzle(rng, hint);
      const ident = v === 3;
      const PAIRS = [];
      for (let a = 1; a <= 8; a++) for (let b = 1; b <= 8; b++) PAIRS.push([a, b]);
      const prod = (p) => p[0] * p[1];
      let rows;
      if (v === 0) {
        const Ts = [4, 6, 8, 12, 16, 24];
        rows = rng.sample(Ts, 3).map((T) => rng.sample(PAIRS.filter((p) => prod(p) === T), 3));
      } else {
        rows = [0, 1, 2].map(() => {
          const x = rng.pick(PAIRS.filter((p) => p[0] <= 7 && p[1] <= 7 && prod(p) <= 20));
          const y = rng.pick(PAIRS.filter((p) => p[0] <= 7 && p[1] <= 7 && prod(p) <= 20));
          const T = prod(x) + prod(y);
          RM.need(T <= 30);
          const cand = PAIRS.filter((p) => p[0] <= 7 && p[1] <= 7 && prod(p) === T);
          RM.need(cand.length > 0);
          return [x, y, rng.pick(cand)];
        });
      }
      const ans = rows[2][2];
      RM.need(ans[0] <= 7 && ans[1] <= 7);
      const keyP = (p) => (ident ? Math.min(p[0], p[1]) + 'x' + Math.max(p[0], p[1]) : p[0] + 'x' + p[1]);
      rows.forEach((r) => RM.need(new Set(r.map(keyP)).size === 3));
      const X = RM.grid3((r, c) => prod(rows[r][c]));
      const T = X[2][2];
      RM.needUnique(X, T, 'numeric');

      const spec = (p) => ({ a: p[0], b: p[1], seed: rng.seed(), sw: ident && rng.chance(0.5) ? 1 : 0 });
      const panels = RM.flat(rows).map(spec);
      panels.forEach((s) => RM.need(!!lineLayout(s.a, s.b, s.seed, s.sw)));

      // ---- decoys: line counts of each family (or the smaller / larger group), all lines, regions
      const g = (f) => RM.grid3((r, c) => f({ a: rows[r][c][0], b: rows[r][c][1] }));
      const fns = ident
        ? [(s) => Math.min(s.a, s.b), (s) => Math.max(s.a, s.b), (s) => s.a + s.b, (s) => (s.a + 1) * (s.b + 1)]
        : [(s) => s.a, (s) => s.b, (s) => s.a + s.b, (s) => (s.a + 1) * (s.b + 1)];
      const decoys = fns.map((f) => ({ grid: g(f), val: f }));

      // ---- mistakes: +1 line in one family, −1 line in the other, a different split
      const tries = [];
      ['a', 'b'].forEach((F) => [-3, -2, 2, 3].forEach((dx) => tries.push([F, dx])));
      let opts = null;
      for (const [F, dx] of rng.shuffle(tries)) {
        const G = F === 'a' ? 'b' : 'a';
        const o = cube(spec(ans), [
          (s) => ((s[F] += 1), s),
          (s) => ((s[G] -= 1), s),
          (s) => ((s.a += dx), (s.b -= dx), s),
        ]);
        if (!o) continue;
        if (o.some((x) => x.spec.a < 1 || x.spec.b < 1 || x.spec.a > 9 || x.spec.b > 9)) continue;
        if (new Set(o.map((x) => keyP([x.spec.a, x.spec.b]))).size !== 8) continue;
        if (o.some((x) => x.mask && x.spec.a * x.spec.b === T)) continue;
        if (!decoysOk(decoys, o)) continue;
        o.forEach((x) => {
          x.spec.seed = rng.seed();
          x.spec.sw = ident && rng.chance(0.5) ? 1 : 0;
        });
        if (o.some((x) => !lineLayout(x.spec.a, x.spec.b, x.spec.seed, x.spec.sw))) continue;
        opts = o;
        break;
      }
      RM.need(!!opts);

      const pr = (p) => `${p[0]}×${p[1]} = ${prod(p)}`;
      const rowTxt = (r) => rows[r].map(pr).join(', ');
      const ansTxt = ident
        ? `<b>${ans[0]} lines one way × ${ans[1]} the other = ${T} crossings</b>`
        : `<b>${plural(ans[0], 'black line', 'black lines')} × ${plural(ans[1], 'grey line', 'grey lines')} = ${T} crossings</b>`;
      const rules = [
        {
          k: 'Crossings',
          t: ident
            ? 'the lines come in two directions (one nearly horizontal, one nearly vertical — which is which does not matter). Every line crosses every line of the other direction exactly once, so a panel has <b>(lines one way) × (lines the other way)</b> crossing points. The number of lines itself is not what counts.'
            : 'every black line crosses every grey line exactly once, so a panel has <b>(black lines) × (grey lines)</b> crossing points. The number of lines itself is not what counts.',
        },
      ];
      if (v === 0)
        rules.push(
          { k: 'Row rule', t: `the three panels of a row have the same number of crossings. Row 1: ${rowTxt(0)}; row 2: ${rowTxt(1)}.` },
          { k: 'Answer', t: `row 3: ${pr(rows[2][0])} and ${pr(rows[2][1])}, so the missing panel needs ${T} crossings as well: ${ansTxt}.` }
        );
      else
        rules.push(
          { k: 'Row rule', t: `crossings in panel 3 = crossings in panel 1 + crossings in panel 2. Row 1: ${rows[0].slice(0, 2).map(pr).join(' and ')}, ${prod(rows[0][0])} + ${prod(rows[0][1])} = ${pr(rows[0][2])}; row 2: ${rows[1].slice(0, 2).map(pr).join(' and ')}, ${prod(rows[1][0])} + ${prod(rows[1][1])} = ${pr(rows[1][2])}.` },
          { k: 'Answer', t: `row 3: ${pr(rows[2][0])} and ${pr(rows[2][1])} → ${prod(rows[2][0])} + ${prod(rows[2][1])} = ${T} crossings: ${ansTxt}.` }
        );
      const options = opts.map((o) => ({
        spec: o.spec,
        flaws: o.mask
          ? [
              ident
                ? `${o.spec.a} × ${o.spec.b} lines give ${o.spec.a * o.spec.b} crossing${o.spec.a * o.spec.b === 1 ? '' : 's'}, not ${T}`
                : `${plural(o.spec.a, 'black line', 'black lines')} × ${plural(o.spec.b, 'grey line', 'grey lines')} give ${o.spec.a * o.spec.b} crossing${o.spec.a * o.spec.b === 1 ? '' : 's'}, not ${T}`,
            ]
          : [],
      }));
      return {
        difficulty: ident ? 7 : 6,
        hint,
        panels,
        answer: options[0].spec,
        options,
        key: (s) => keyP([s.a, s.b]),
        render(sp) {
          const pic = new RM.Pic();
          pic.add(`<rect x="6" y="6" width="88" height="88" rx="3" fill="none" stroke="${RM.LIGHT}" stroke-width="1.2"/>`);
          const L = lineLayout(sp.a, sp.b, sp.seed, sp.sw);
          L.B.forEach((l) => RM.line(pic, l[0][0], l[0][1], l[1][0], l[1][1], { sw: ident ? 2.2 : 2.6, color: ident ? RM.INK : RM.GRAY, cap: 'butt' }));
          L.A.forEach((l) => RM.line(pic, l[0][0], l[0][1], l[1][0], l[1][1], { sw: 2.2, color: RM.INK, cap: 'butt' }));
          return pic.svg();
        },
        rules,
      };
    },
  });

  /* v2 of crossings: chords of a circle, constant number of crossings per row */
  function chordPuzzle(rng, hint) {
    const ALLOWED = { 3: [4, 5, 6], 4: [4, 5, 6], 5: [4, 5, 6], 6: [5, 6], 7: [5, 6] };
    const Ts = rng.sample([3, 4, 5, 6, 7], 3);
    const rows = Ts.map((T) => {
      let ns;
      do ns = [0, 1, 2].map(() => rng.pick(ALLOWED[T]));
      while (new Set(ns).size < 2);
      return ns.map((n) => {
        const ch = chordPanel(rng, n, T);
        RM.need(!!ch);
        return ch;
      });
    });
    const X = RM.grid3((r, c) => chordCount(rows[r][c]));
    const T = Ts[2];
    RM.needUnique(X, T, 'numeric');
    const ans = rows[2][2];
    const decoys = [
      { grid: RM.grid3((r, c) => rows[r][c].length), val: (s) => s.ch.length },
      { grid: RM.grid3((r, c) => 1 + rows[r][c].length + X[r][c]), val: (s) => 1 + s.ch.length + chordCount(s.ch) },
    ];
    let opts = null;
    const used = [];
    ans.forEach((c) => used.push(c.a, c.b));
    const free = RM.range(60)
      .map((i) => i * 6)
      .filter((p) => used.every((q) => arcGap(p, q) >= 12));
    const nX = (c, list) => list.filter((d) => d.id !== c.id && crosses(c, d)).length;
    // single mistakes that each change the count and keep the figure clean
    const adds = [];
    free.forEach((p1, i) =>
      free.slice(i + 1).forEach((p2) => {
        if (arcGap(p1, p2) < 60) return;
        const c = { id: 99, a: p1, b: p2 };
        const k = nX(c, ans);
        if (k) adds.push({ c, k });
      })
    );
    const rms = ans.map((c) => ({ id: c.id, k: nX(c, ans) })).filter((r) => r.k > 0);
    const moves = [];
    ans.forEach((c) =>
      ['a', 'b'].forEach((end) =>
        free.forEach((p) => {
          const keep = end === 'a' ? c.b : c.a;
          const m = { id: c.id, a: Math.min(keep, p), b: Math.max(keep, p) };
          if (arcGap(m.a, m.b) < 54) return;
          const list = ans.map((d) => (d.id === c.id ? m : d));
          const k = chordCount(list) - T;
          if (k) moves.push({ m, k });
        })
      )
    );
    for (let t = 0; t < 80 && !opts && adds.length && rms.length && moves.length; t++) {
      const A = rng.pick(adds);
      const Bm = rng.pick(rms);
      const C = rng.pick(moves.filter((mv) => mv.m.id !== Bm.id));
      if (!C || A.k === Bm.k) continue;
      const o = cube({ ch: ans }, [
        (s) => (s.ch.push(A.c), s),
        (s) => ((s.ch = s.ch.filter((c) => c.id !== Bm.id)), s),
        (s) => ((s.ch = s.ch.map((c) => (c.id === C.m.id ? C.m : c))), s),
      ]);
      if (!o) continue;
      if (new Set(o.map((x) => chordKey(x.spec.ch))).size !== 8) continue;
      if (o.some((x) => x.mask && chordCount(x.spec.ch) === T)) continue;
      if (!decoysOk(decoys, o)) continue;
      if (o.some((x) => x.spec.ch.length < 2 || !chordsOk(x.spec.ch))) continue;
      opts = o;
    }
    RM.need(!!opts);
    const options = opts.map((o) => {
      const n = chordCount(o.spec.ch);
      return { spec: o.spec, flaws: o.mask ? [`its chords cross ${n === 1 ? 'once' : n + ' times'}, not ${T} times`] : [] };
    });
    const rowTxt = (r) => `${X[r].join(' · ')} crossings (with ${rows[r].map((c) => c.length).join(', ')} chords)`;
    return {
      difficulty: 7,
      hint,
      panels: RM.flat(rows).map((ch) => ({ ch })),
      answer: options[0].spec,
      options,
      key: (s) => chordKey(s.ch),
      render(sp) {
        const pic = new RM.Pic();
        RM.circle(pic, 50, 50, CR, { sw: 1.4, stroke: RM.LIGHT });
        sp.ch.forEach((c) => {
          const p = cpt(c.a);
          const q = cpt(c.b);
          RM.line(pic, p[0], p[1], q[0], q[1], { sw: 2.2, cap: 'round' });
        });
        return pic.svg();
      },
      rules: [
        { k: 'Crossings', t: 'count the points where two chords cross inside the circle. The number of chords varies freely and does not matter.' },
        { k: 'Row rule', t: `the three panels of a row have the same number of crossings. Row 1: ${rowTxt(0)}; row 2: ${rowTxt(1)}.` },
        { k: 'Answer', t: `row 3: ${X[2][0]} and ${X[2][1]} crossings, so the missing panel needs <b>${T} crossings</b> — the correct figure has ${ans.length} chords that cross ${T} times.` },
      ],
    };
  }
})();
