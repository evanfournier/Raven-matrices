/* Spanning tree (grandmaster): six nodes sit on a 5x5 lattice (same in every picture). Pictures 1 and 2 of a row are edge sets; picture 3 is the
 * minimum spanning tree (Euclidean lengths, all distinct inside a row) of their union. Distractors: longer trees (1 or 2 swaps), a loop kept,
 * a link dropped, the longest tree, the whole union, and a tree using a link that exists in neither picture. */
(function () {
  'use strict';
  const RM = window.RM;
  const N = 6;
  const px = (c) => 14 + 18 * c;
  const pc = (m) => { let c = 0; while (m) { c += m & 1; m >>= 1; } return c; };
  const sqrtTxt = (d) => { const s = Math.sqrt(d); return Number.isInteger(s) ? String(s) : `√${d} ≈ ${s.toFixed(2)}`; };

  RM.register({
    id: 'spanning-tree',
    name: 'Spanning tree',
    difficulty: 8,
    generate(rng, variant) {
      // ---- node set
      let S = null;
      for (let t = 0; t < 80 && !S; t++) {
        const cells = rng.sample(RM.range(25), N).map((x) => [x % 5, Math.floor(x / 5)]);
        const pairs = [];
        for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) pairs.push([i, j]);
        const d2 = pairs.map(([i, j]) => (cells[i][0] - cells[j][0]) ** 2 + (cells[i][1] - cells[j][1]) ** 2);
        const usable = [];
        pairs.forEach(([i, j], k) => {
          const [ax, ay] = cells[i], [bx, by] = cells[j];
          for (let w = 0; w < N; w++) {
            if (w === i || w === j) continue;
            const [cx, cy] = cells[w];
            const cr = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
            const dt = (cx - ax) * (bx - ax) + (cy - ay) * (by - ay);
            if (cr === 0 && dt > 0 && dt < d2[k]) return;
          }
          usable.push(k);
        });
        if (usable.length < 11 || new Set(usable.map((k) => d2[k])).size < 10) continue;
        if (RM.range(N).some((v) => usable.filter((k) => pairs[k].includes(v)).length < 3)) continue;
        S = { cells, pairs, d2, usable };
      }
      RM.need(S);
      const { cells, pairs, d2, usable } = S;
      const NE = pairs.length;
      const xy = (v) => [px(cells[v][0]), px(cells[v][1])];
      const el = (m) => RM.range(NE).filter((k) => (m >> k) & 1);
      const mk = (ks) => ks.reduce((a, k) => a | (1 << k), 0);
      const find = (p, x) => { while (p[x] !== x) x = p[x] = p[p[x]]; return x; };
      function kruskal(mask, desc) {
        const ks = el(mask).sort((a, b) => (desc ? d2[b] - d2[a] : d2[a] - d2[b]));
        const p = RM.range(N);
        let out = 0, n = 0;
        for (const k of ks) {
          const a = find(p, pairs[k][0]), b = find(p, pairs[k][1]);
          if (a !== b) { p[a] = b; out |= 1 << k; n++; }
        }
        return n === N - 1 ? out : null;
      }
      const isTree = (m) => { if (pc(m) !== N - 1) return false; return kruskal(m) === m; };
      const total = (m) => el(m).reduce((s, k) => s + Math.sqrt(d2[k]), 0);
      function cr(m) {
        const ks = el(m);
        let c = 0;
        for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) {
          const [a, b] = pairs[ks[i]], [e, f] = pairs[ks[j]];
          if (a === e || a === f || b === e || b === f) continue;
          const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
          const A = cells[a], B = cells[b], C = cells[e], D = cells[f];
          if (o(A, B, C) * o(A, B, D) < 0 && o(C, D, A) * o(C, D, B) < 0) c++;
        }
        return c;
      }
      function makeRow() {
        for (let t = 0; t < 250; t++) {
          const k = rng.int(7, 9);
          const Uk = rng.sample(usable, k);
          if (new Set(Uk.map((x) => d2[x])).size < k) continue;
          const U = mk(Uk);
          const T = kruskal(U);
          if (!T) continue;
          let A = 0, B = 0;
          Uk.forEach((x) => { const q = rng.next(); if (q < 0.4) A |= 1 << x; else if (q < 0.8) B |= 1 << x; else { A |= 1 << x; B |= 1 << x; } });
          if (pc(A) < 3 || pc(A) > 6 || pc(B) < 3 || pc(B) > 6) continue;
          if (!(T & A & ~B) || !(T & B & ~A)) continue;
          if (cr(A) > 2 || cr(B) > 2 || cr(T) > 1) continue;
          return { A, B, T, U };
        }
        return null;
      }
      const rows = [];
      for (let r = 0; r < 3; r++) { const row = makeRow(); RM.need(row); rows.push(row); }
      const R3 = rows[2];
      // ---- hypotheses
      const bits = (m) => m;
      const H = [
        (A, B) => kruskal(A | B),
        (A, B) => kruskal(A | B, true),
        (A, B) => A | B, (A, B) => A & B, (A, B) => A ^ B, (A, B) => A & ~B, (A, B) => B & ~A, (A) => A, (A, B) => B,
        (A) => kruskal(A), (A, B) => kruskal(B),
        (A, B) => { const ks = el(A | B).sort((a, b) => d2[a] - d2[b]).slice(0, N - 1); return mk(ks); },
      ];
      H.forEach((h) => {
        const ok = rows.slice(0, 2).every((r) => { const v = h(bits(r.A), bits(r.B)); return v !== null && v === r.T; });
        if (ok) RM.need(h(R3.A, R3.B) === R3.T);
      });
      RM.need(H[0](R3.A, R3.B) === R3.T);
      // ---- distractors
      const T = R3.T, U = R3.U, A3 = R3.A, B3 = R3.B;
      const pt = (v) => `(${cells[v][0] + 1},${cells[v][1] + 1})`;
      const ed = (k) => `${pt(pairs[k][0])}–${pt(pairs[k][1])}`;
      const tot = total(T);
      const path = (m, a, b) => { // edges of the tree path a->b
        const adj = RM.range(N).map(() => []);
        el(m).forEach((k) => { adj[pairs[k][0]].push([pairs[k][1], k]); adj[pairs[k][1]].push([pairs[k][0], k]); });
        const prev = Array(N).fill(null);
        const st = [a]; prev[a] = [-1, -1];
        while (st.length) { const v = st.pop(); for (const [u, k] of adj[v]) if (!prev[u]) { prev[u] = [v, k]; st.push(u); } }
        const out = [];
        let v = b;
        while (v !== a) { out.push(prev[v][1]); v = prev[v][0]; }
        return out;
      };
      const swaps = (m, pool) => {
        const out = [];
        el(pool & ~m).forEach((f) => path(m, pairs[f][0], pairs[f][1]).forEach((e) => out.push((m & ~(1 << e)) | (1 << f))));
        return out;
      };
      const diffTxt = (m) => {
        const ex = el(m & ~T), mi = el(T & ~m);
        return `it uses ${ex.map((k) => `${ed(k)} (length ${sqrtTxt(d2[k])})`).join(' and ')} instead of ${mi.map((k) => `${ed(k)} (length ${sqrtTxt(d2[k])})`).join(' and ')}; total length ${total(m).toFixed(2)} against ${tot.toFixed(2)}`;
      };
      const s1 = swaps(T, U).filter((m) => m !== T);
      const s2 = [];
      s1.forEach((m1) => swaps(m1, U).forEach((m2) => { if (m2 !== T && !s1.includes(m2) && isTree(m2) && pc(m2 & ~T) === 2) s2.push(m2); }));
      const loops = el(U & ~T).map((f) => ({ m: T | (1 << f), f }));
      const dis = el(T).map((e) => ({ m: T & ~(1 << e), e }));
      const mx = kruskal(U, true);
      const other = [];
      if (mx && mx !== T) other.push({ m: mx, t: 'max', flaws: [`This is the <i>longest</i> spanning tree of the merged links (total ${total(mx).toFixed(2)} against ${tot.toFixed(2)}), the opposite of what is wanted.`] });
      if (pc(U) >= 7) other.push({ m: U, t: 'union', flaws: ['All the links of both pictures are drawn: the loops have not been broken (the longest link of every loop must go).'] });
      el(T).forEach((e) => {
        const m0 = T & ~(1 << e);
        // components of T - e
        const p = RM.range(N);
        el(m0).forEach((k) => { p[find(p, pairs[k][0])] = find(p, pairs[k][1]); });
        usable.forEach((g) => {
          if ((U >> g) & 1) return;
          if (find(p, pairs[g][0]) === find(p, pairs[g][1])) return;
          other.push({ m: m0 | (1 << g), t: 'nonU', flaws: [`It uses the link ${ed(g)}, which exists in neither of the first two pictures: only links already drawn can be used.`] });
        });
      });
      const dist = (a, b) => pc(a ^ b);
      let sel = null;
      for (let t = 0; t < 30 && !sel; t++) {
        const pick = [];
        const used = new Set([T]);
        const push = (m, flaws) => { if (used.has(m)) return false; used.add(m); pick.push({ m, flaws }); return true; };
        rng.shuffle(s1).slice(0, 6).some((m) => { push(m, [`It is a tree, but not the shortest one: ${diffTxt(m)}.`]); return pick.length >= 2; });
        let n2 = 0;
        rng.shuffle(s2).some((m) => { if (push(m, [`It is a tree, but not the shortest one: ${diffTxt(m)}.`])) n2++; return n2 >= 1; });
        const lp = rng.pick(loops);
        if (lp) push(lp.m, [`It keeps the link ${ed(lp.f)}, which closes a loop (its two nodes are already connected through shorter links), so it is not a tree.`]);
        const ds = rng.pick(dis);
        push(ds.m, [`The link ${ed(ds.e)} is missing: the nodes fall into two separate groups, so the picture is not connected.`]);
        const ot = rng.shuffle(other);
        const seen = {};
        for (const o of ot) { if (pick.length >= 7) break; if (seen[o.t] >= (o.t === 'nonU' ? 2 : 1)) continue; if (push(o.m, o.flaws)) seen[o.t] = (seen[o.t] || 0) + 1; }
        for (const m of rng.shuffle(s1)) { if (pick.length >= 7) break; push(m, [`It is a tree, but not the shortest one: ${diffTxt(m)}.`]); }
        if (pick.length !== 7) continue;
        const all = [T].concat(pick.map((p) => p.m));
        const D = all.map((a) => all.reduce((s, b) => s + dist(a, b), 0));
        if (D[0] <= Math.min.apply(null, D.slice(1))) continue; // answer must not be the "centre" of the options
        sel = pick;
      }
      RM.need(sel);
      // ---- explanation
      const sorted = el(U).sort((a, b) => d2[a] - d2[b]);
      const p = RM.range(N);
      const steps = sorted.map((k) => {
        const a = find(p, pairs[k][0]), b = find(p, pairs[k][1]);
        if (a !== b) { p[a] = b; return `${ed(k)} (${sqrtTxt(d2[k])}) → keep`; }
        return `${ed(k)} (${sqrtTxt(d2[k])}) → skip, it would close a loop`;
      });
      const keys = (m) => m;
      return {
        panels: rows.flatMap((r, i) => (i < 2 ? [r.A, r.B, r.T] : [r.A, r.B])).map(keys),
        answer: T,
        options: [{ spec: T, flaws: [] }].concat(sel.map((x) => ({ spec: x.m, flaws: x.flaws }))),
        render(m) {
          const pic = new RM.Pic();
          for (let c = 0; c < 5; c++) for (let r = 0; r < 5; r++) pic.add(`<circle cx="${px(c)}" cy="${px(r)}" r="1.4" fill="#aeb5c0"/>`);
          el(m).forEach((k) => { const a = xy(pairs[k][0]), b = xy(pairs[k][1]); RM.line(pic, a[0], a[1], b[0], b[1], { sw: 2.5 }); });
          for (let v = 0; v < N; v++) { const q = xy(v); RM.circle(pic, q[0], q[1], 5, { fill: 'black', sw: 1.4 }); }
          return pic.svg();
        },
        key: (m) => String(m),
        rules: [
          { k: 'Merge', t: 'In every row, the third picture is the <b>shortest spanning tree</b> of the links of the first two pictures taken together: just enough of those links to connect all six nodes, with no loop, and the smallest possible total length.' },
          { k: 'Lengths', t: 'Length is measured on the lattice of small dots: a link that goes <i>a</i> dots across and <i>b</i> dots down has length √(a²+b²). Inside a row no two links have the same length, so the shortest tree is unique. Dots are written (column, row) from the top-left (1,1).' },
          { k: 'Method', t: 'Take the merged links from shortest to longest and keep each one unless it would close a loop; stop when all nodes are connected (5 links).' },
          { k: 'Row 3', t: `Merged links, shortest first: ${steps.join('; ')}.` },
          { k: 'Result', t: `The tree is <b>${el(T).sort((a, b) => d2[a] - d2[b]).map(ed).join(', ')}</b> (total length ${tot.toFixed(2)}).` },
        ],
        hint: 'Merge the links of the first two pictures, then keep the shortest ones that connect everything without a loop.',
      };
    },
  });
})();
