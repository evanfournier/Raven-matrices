/* Composed functions (grandmaster): every panel is the graph of a function on {0..n-1} (one dot above each x, joined
 * by a thin line). The 3rd graph of each row is a CHAIN of the first two: start at x, read the height of the dot of one
 * graph, use that height as the new x in the next graph, and so on. Variant 0 (showcase, ★8): x → 1st → 1st → 2nd
 * (the 1st graph is used twice); variant 1: x → 2nd → 1st (right-to-left order); variant 2: x → 1st → 2nd on
 * {0..5}; variant 3: x → 1st → 2nd → 2nd. Uniqueness is checked against every chain of length 1–4 of the two graphs,
 * a dozen point-by-point combinations (sum, difference, max, min, …), mirrors / shifts / inverses of either graph, all
 * of them read along rows and along columns, and the per-x Raven rules of the core checker. */
(function () {
  'use strict';
  const RM = window.RM;

  const ORD = ['1st', '2nd'];
  /* all chains (application order) of length 1..4 over the two graphs */
  const WORDS = [];
  for (let L = 1; L <= 4; L++) for (let m = 0; m < 1 << L; m++) WORDS.push(RM.range(L).map((i) => (m >> i) & 1));
  const wkey = (w) => w.join('');
  const compose = (w, a, b) => a.map((_, x) => w.reduce((y, i) => (i ? b : a)[y], x));
  const chainTxt = (w) => 'x → ' + w.map((i) => ORD[i]).join(' → ');
  const trace = (w, a, b, x) => {
    const out = [x];
    w.forEach((i) => out.push((i ? b : a)[out[out.length - 1]]));
    return out;
  };

  /* point-by-point combinations of the two graphs (null = undefined somewhere) */
  const PW = [
    ['sum-mod', (p, q, x, n) => (p + q) % n],
    ['diff-mod', (p, q, x, n) => RM.mod(p - q, n)],
    ['rdiff-mod', (p, q, x, n) => RM.mod(q - p, n)],
    ['max', (p, q) => Math.max(p, q)],
    ['min', (p, q) => Math.min(p, q)],
    ['absdiff', (p, q) => Math.abs(p - q)],
    ['sum', (p, q) => p + q],
    ['sum-x', (p, q, x) => p + q - x],
    ['prod-mod', (p, q, x, n) => (p * q) % n],
    ['prog', (p, q) => 2 * q - p],
    ['rprog', (p, q) => 2 * p - q],
    ['avg', (p, q) => ((p + q) % 2 ? -1 : (p + q) / 2)],
  ];
  const valid = (v, n) => v.every((y) => Number.isInteger(y) && y >= 0 && y < n);
  /* unary transforms of one graph */
  function unary(n) {
    const T = [
      ['mirror-x', (f) => f.map((_, x) => f[n - 1 - x])],
      ['mirror-y', (f) => f.map((y) => n - 1 - y)],
      ['rot180', (f) => f.map((_, x) => n - 1 - f[n - 1 - x])],
      ['sort-up', (f) => f.slice().sort((a, b) => a - b)],
      ['sort-down', (f) => f.slice().sort((a, b) => b - a)],
      [
        'inverse',
        (f) => {
          if (new Set(f).size !== n) return null;
          const g = [];
          f.forEach((y, x) => (g[y] = x));
          return g;
        },
      ],
    ];
    for (let k = 1; k < n; k++) {
      T.push(['up' + k, (f) => f.map((y) => (y + k) % n)]);
      T.push(['left' + k, (f) => f.map((_, x) => f[(x + k) % n])]);
    }
    return T;
  }
  function hypotheses(n) {
    const H = [];
    WORDS.forEach((w) => H.push({ id: 'w' + wkey(w), f: (a, b) => compose(w, a, b) }));
    PW.forEach(([id, op]) => H.push({ id, f: (a, b) => a.map((p, x) => op(p, b[x], x, n)) }));
    unary(n).forEach(([id, t]) => {
      H.push({ id: id + '(1st)', f: (a) => t(a) });
      H.push({ id: id + '(2nd)', f: (a, b) => t(b) });
    });
    return H.map((h) => ({ id: h.id, f: (a, b) => { const v = h.f(a, b); return v && valid(v, n) ? v : null; } }));
  }
  const HYP = { 5: hypotheses(5), 6: hypotheses(6) };
  const same = (a, b) => !!a && !!b && RM.sameArr(a, b);

  const CFG = [
    { word: [0, 0, 1], n: 5, diff: 8 },
    { word: [1, 0], n: 5, diff: 7 },
    { word: [0, 1], n: 6, diff: 7 },
    { word: [0, 1, 1], n: 5, diff: 8 },
  ];

  function randFn(rng, n) {
    for (;;) {
      const f = RM.range(n).map(() => rng.int(0, n - 1));
      const d = new Set(f).size;
      if (d < 3) continue; // no constant / two-level graphs: they make chains trivial
      if (f.every((y, x) => y === x)) continue;
      return f;
    }
  }

  function render(sp) {
    const v = sp.v;
    const n = v.length;
    const U = n === 5 ? 16 : 13;
    const ox = 17;
    const oy = 84;
    const X = (x) => ox + x * U;
    const Y = (y) => oy - y * U;
    const pic = new RM.Pic();
    const top = Y(n - 1);
    const right = X(n - 1);
    for (let i = 1; i < n; i++) {
      RM.line(pic, X(i), oy, X(i), top - 3, { sw: 0.8, color: RM.LIGHT, cap: 'butt' });
      RM.line(pic, ox, Y(i), right + 3, Y(i), { sw: 0.8, color: RM.LIGHT, cap: 'butt' });
    }
    RM.line(pic, ox, oy, right + 9, oy, { sw: 1.5, color: RM.DARK, cap: 'butt' });
    RM.line(pic, ox, oy, ox, top - 9, { sw: 1.5, color: RM.DARK, cap: 'butt' });
    RM.polygon(pic, [[right + 12, oy], [right + 7, oy - 2.6], [right + 7, oy + 2.6]], { fill: 'dark', sw: 0 });
    RM.polygon(pic, [[ox, top - 12], [ox - 2.6, top - 7], [ox + 2.6, top - 7]], { fill: 'dark', sw: 0 });
    const txt = (x, y, s) =>
      pic.add(`<text x="${RM.fmt(x)}" y="${RM.fmt(y)}" font-family="Arial, Helvetica, sans-serif" font-size="8.5" fill="${RM.DARK}" text-anchor="middle">${s}</text>`);
    for (let i = 0; i < n; i++) {
      RM.line(pic, X(i), oy, X(i), oy + 2.5, { sw: 1.2, color: RM.DARK, cap: 'butt' });
      RM.line(pic, ox - 2.5, Y(i), ox, Y(i), { sw: 1.2, color: RM.DARK, cap: 'butt' });
      txt(X(i), oy + 10.5, i);
      txt(ox - 8, Y(i) + 3, i);
    }
    const pts = v.map((y, x) => [X(x), Y(y)]);
    RM.polyline(pic, pts, { sw: 1.5, color: RM.INK });
    pts.forEach(([x, y]) => RM.circle(pic, x, y, 3.2, { fill: 'black', sw: 0 }));
    return pic.svg();
  }

  RM.register({
    id: 'plot-compose',
    name: 'Composed functions',
    difficulty: 8,
    generate(rng, variant) {
      const cfg = CFG[variant % 4];
      const W = cfg.word;
      const n = cfg.n;
      const H = HYP[n];
      const hid = 'w' + wkey(W);

      /* ---- rows */
      const F = RM.range(3).map((r) => {
        for (let t = 0; t < 200; t++) {
          const a = randFn(rng, n);
          const b = randFn(rng, n);
          const c = compose(W, a, b);
          if (new Set(c).size < (r === 2 ? 3 : 2)) continue;
          return [a, b, c];
        }
        throw RM.RETRY;
      });
      const ans = F[2][2];
      /* all nine graphs distinct (no copy / constant / Latin-square reading of whole graphs) */
      const all = [].concat(...F).map((f) => f.join(''));
      RM.need(new Set(all).size === 9);

      /* ---- uniqueness: row-wise, the intended chain must be the ONLY fitting hypothesis; column-wise none fits */
      H.forEach((h) => {
        const rowFit = [0, 1].every((r) => same(h.f(F[r][0], F[r][1]), F[r][2]));
        if (h.id === hid) RM.need(rowFit && same(h.f(F[2][0], F[2][1]), ans));
        else RM.need(!rowFit);
        const colFit = [0, 1].every((c) => same(h.f(F[0][c], F[1][c]), F[2][c]));
        RM.need(!colFit);
      });
      /* other chain relations between the three panels of a row (e.g. 2nd = 3rd ∘ 1st) must not hold in rows 1–2 */
      [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0]].forEach(([i, j, k]) =>
        WORDS.forEach((w) => {
          if (w.length > 1 && w.length < 4) RM.need(![0, 1].every((r) => RM.sameArr(compose(w, F[r][j], F[r][k]), F[r][i])));
        })
      );
      /* per-x Raven rules (sum, progression, Latin square, …) that fit at every x at once must not exist */
      [undefined, n].forEach((m) => {
        let names = null;
        const predAt = [];
        for (let x = 0; x < n; x++) {
          const g = RM.grid3((r, c) => (r === 2 && c === 2 ? undefined : F[r][c][x]));
          const P = {};
          RM.preds.numeric(g, m).forEach(([nm, val]) => (P[nm] = val));
          predAt.push(P);
          const ks = Object.keys(P);
          names = names === null ? ks : names.filter((k) => ks.indexOf(k) >= 0);
        }
        names.forEach((nm) => RM.need(predAt.every((P, x) => P[nm] === (m ? RM.mod(ans[x], m) : ans[x]))));
      });

      /* ---- worked check (row 1) and counter-examples for the simpler chains */
      const [p, q] = F[2];
      const exs = RM.range(n).filter((x) => new Set(trace(W, F[0][0], F[0][1], x)).size >= W.length);
      RM.need(exs.length > 0);
      const ex = rng.pick(exs);
      const exTr = trace(W, F[0][0], F[0][1], ex);
      const counter = [];
      [[0, 1], [1, 0]].forEach((w) => {
        if (wkey(w) === wkey(W)) return;
        for (const r of [0, 1]) {
          const xs = RM.range(n).filter((x) => compose(w, F[r][0], F[r][1])[x] !== F[r][2][x]);
          if (xs.length) {
            const x = xs[0];
            const tr = trace(w, F[r][0], F[r][1], x);
            counter.push(`${chainTxt(w)} does not fit: in row ${r + 1}, above x = ${x} it gives ${tr.join(' → ')}, but the 3rd graph is at height ${F[r][2][x]}.`);
            break;
          }
        }
      });

      /* ---- distractors */
      const cands = [];
      const ansK = ans.join('');
      const firstDiff = (v) => RM.range(n).find((x) => v[x] !== ans[x]);
      const add = (v, pri, why) => {
        if (!v || !valid(v, n) || v.join('') === ansK) return;
        cands.push({ v, pri, why });
      };
      const wTxt = (w) => {
        const v = compose(w, p, q);
        const x = firstDiff(v);
        return v.every((y, i) => y === ans[i])
          ? ''
          : `it chains ${chainTxt(w)} instead of ${chainTxt(W)}: above x = ${x} that gives ${trace(w, p, q, x).join(' → ')} (height ${v[x]}) instead of ${trace(W, p, q, x).join(' → ')} (height ${ans[x]})`;
      };
      const near = new Set();
      [[0, 1], [1, 0]].forEach((w) => near.add(wkey(w)));
      // one-edit neighbours of the intended chain: drop / insert / change one step, swap two steps, reverse
      for (let i = 0; i < W.length; i++) {
        near.add(wkey(W.slice(0, i).concat(W.slice(i + 1))));
        near.add(wkey(W.slice(0, i).concat([1 - W[i]], W.slice(i + 1))));
        if (i + 1 < W.length) near.add(wkey(W.slice(0, i).concat([W[i + 1], W[i]], W.slice(i + 2))));
      }
      for (let i = 0; i <= W.length; i++) [0, 1].forEach((s) => near.add(wkey(W.slice(0, i).concat([s], W.slice(i)))));
      near.add(wkey(W.slice().reverse()));
      WORDS.forEach((w) => {
        const k = wkey(w);
        if (k === wkey(W) || w.length === 1) return;
        const pri = k === '01' || k === '10' ? 0 : near.has(k) ? 1 : 4;
        add(compose(w, p, q), pri, wTxt(w));
      });
      add(p.slice(), 3, 'it is simply a copy of the 1st graph of row 3');
      add(q.slice(), 3, 'it is simply a copy of the 2nd graph of row 3');
      add(p.map((y, x) => (y + q[x]) % n), 3, `it adds the heights of the two graphs at each x (wrapping past ${n - 1}) instead of chaining them`);
      add(p.map((y, x) => Math.max(y, q[x])), 3, 'it keeps the higher of the two dots at each x instead of chaining the graphs');
      add(p.map((y, x) => Math.min(y, q[x])), 3, 'it keeps the lower of the two dots at each x instead of chaining the graphs');
      add(p.map((y, x) => Math.abs(y - q[x])), 4, 'it takes the difference of the two heights at each x instead of chaining the graphs');
      // slips: the last lookup read one column off
      const last = W[W.length - 1] ? q : p;
      rng.shuffle(RM.range(n)).forEach((x) => {
        const tr = trace(W, p, q, x);
        const t = tr[tr.length - 2];
        [-1, 1].forEach((d) => {
          const t2 = t + d;
          if (t2 < 0 || t2 >= n || last[t2] === ans[x]) return;
          const v = ans.slice();
          v[x] = last[t2];
          add(v, 2, `above x = ${x} the dot should be at height ${ans[x]} (${tr.join(' → ')}); here the last step was read above ${t2} instead of ${t}, giving ${last[t2]}`);
        });
      });
      // dedupe (keep the most tempting reason)
      cands.sort((A, B) => A.pri - B.pri);
      const uniq = [];
      const seen = new Set();
      cands.forEach((c) => {
        const k = c.v.join('');
        if (!seen.has(k) && c.why) {
          seen.add(k);
          uniq.push(c);
        }
      });
      const byPri = (lo, hi) => rng.shuffle(uniq.filter((c) => c.pri >= lo && c.pri <= hi));
      const agree = (a, b) => a.reduce((s, y, x) => s + (y === b[x] ? 1 : 0), 0);
      let chosen = null;
      for (let t = 0; t < 30 && !chosen; t++) {
        const nSlip = t < 15 ? 2 : 1;
        const pick = [];
        const take = (arr, k) => arr.forEach((c) => pick.length < 7 && k > 0 && pick.indexOf(c) < 0 && (pick.push(c), k--));
        const A0 = byPri(0, 0);
        take(A0, 2);
        take(byPri(1, 1), 4 - pick.length);
        take(byPri(2, 2), nSlip);
        take(byPri(3, 3), 7 - pick.length);
        take(byPri(0, 4), 7 - pick.length);
        if (pick.length < 7) break;
        const vs = [ans].concat(pick.map((c) => c.v));
        // every height of the answer also appears (at the same x) in some distractor
        if (!RM.range(n).every((x) => pick.some((c) => c.v[x] === ans[x]))) continue;
        // the answer must not be the "average" option (most agreements with the others)
        const score = vs.map((a, i) => vs.reduce((s, b, j) => s + (i === j ? 0 : agree(a, b)), 0));
        if (Math.max(...score.slice(1)) < score[0]) continue;
        // ... nor the option closest to the per-x majority vote
        const modal = RM.range(n).map((x) => {
          const cnt = {};
          vs.forEach((v) => (cnt[v[x]] = (cnt[v[x]] || 0) + 1));
          const mx = Math.max(...Object.values(cnt));
          return Object.keys(cnt).filter((k) => cnt[k] === mx).map(Number);
        });
        const vote = vs.map((v) => v.filter((y, x) => modal[x].indexOf(y) >= 0).length);
        if (Math.max(...vote.slice(1)) < vote[0]) continue;
        chosen = pick;
      }
      RM.need(chosen);

      const opts = [{ spec: { v: ans }, flaws: [] }].concat(chosen.map((c) => ({ spec: { v: c.v }, flaws: [c.why] })));
      const xs = RM.range(n);
      const twice = W.length === 3 ? (W[0] === W[1] ? 'the 1st graph is used <b>twice</b>, then the 2nd' : 'the 1st graph once, then the 2nd graph <b>twice</b>') : '';
      const orderTxt = {
        '001': `start at x, read the height of the 1st graph above x, use that height as the new x in the <b>1st graph again</b>, then use the result as x in the 2nd graph: ${chainTxt(W)} (${twice}).`,
        '10': `start at x, read the height of the <b>2nd</b> graph above x, then use that height as the new x in the <b>1st</b> graph: ${chainTxt(W)} (the row is chained from right to left).`,
        '01': `start at x, read the height of the 1st graph above x, then use that height as the new x in the 2nd graph: ${chainTxt(W)}.`,
        '011': `start at x, read the height of the 1st graph above x, use that height as the new x in the 2nd graph, and the result as x in the <b>2nd graph again</b>: ${chainTxt(W)} (${twice}).`,
      }[wkey(W)];
      const rules = [
        {
          k: 'Graphs',
          t: `each panel is the graph of a function: above every x = 0…${n - 1} there is exactly one dot, at a height between 0 and ${n - 1} (the thin line only joins the dots).`,
        },
        { k: 'Chaining', t: `the 3rd graph of each row is the first two graphs <b>chained</b> (composed): ${orderTxt} The last height read is the height of the 3rd graph above x.` },
        {
          k: 'Check',
          t: `row 1, x = ${ex}: ${exTr.join(' → ')}, and the 3rd graph of row 1 is indeed at height ${F[0][2][ex]} above ${ex}. Every other x of rows 1 and 2 checks out the same way.`,
        },
      ];
      if (counter.length) rules.push({ k: 'Simpler readings fail', t: counter.join(' ') + ' Point-by-point sums, maxima, minima or mirrored copies do not fit either.' });
      rules.push({
        k: 'Answer',
        t: `row 3, chain ${chainTxt(W)}: ${xs.map((x) => trace(W, p, q, x).slice(0, -1).join(' → ') + ' → <b>' + ans[x] + '</b>').join('; ')}. The missing graph has heights <b>${ans.join(', ')}</b> above x = ${xs.join(', ')}.`,
      });

      return {
        difficulty: cfg.diff,
        hint: W.length === 3 ? 'the output of one graph becomes the input of the next — and a graph may be used more than once.' : 'the output of one graph becomes the input of the next.',
        panels: RM.flat(F.map((row) => row.map((v) => ({ v })))),
        answer: { v: ans },
        options: opts,
        key: (s) => s.v.join(','),
        render,
        rules,
      };
    },
  });
})();
