/* Same network (grandmaster): every row shows ONE network (6 nodes) drawn three times on three different fixed dot arrangements
 * (one per column, nodes relabelled at random). The answer is the only option that is isomorphic to row 3's network, drawn on the
 * column-3 arrangement. Distractors are degree-preserving rewirings, moved links, and the networks of the other rows. */
(function () {
  'use strict';
  const RM = window.RM;
  const N = 6;
  const LAY = [
    [[50, 10], [86, 34], [76, 76], [44, 90], [14, 66], [18, 26]],
    [[50, 14], [86, 40], [72, 83], [28, 83], [14, 40], [50, 52]],
    [[12, 22], [50, 36], [88, 22], [12, 78], [50, 64], [88, 78]],
  ];
  const PAIRS = [];
  const IDX = [];
  for (let i = 0; i < N; i++) IDX.push(Array(N).fill(-1));
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { IDX[i][j] = IDX[j][i] = PAIRS.length; PAIRS.push([i, j]); }
  const NE = PAIRS.length;
  const PERMS = [];
  (function f(cur) {
    if (cur.length === N) { PERMS.push(cur); return; }
    for (let s = 0; s < N; s++) if (!cur.includes(s)) f(cur.concat(s));
  })([]);
  // crossing tables
  function cross(A, B, C, D) {
    const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
    return o(A, B, C) * o(A, B, D) < 0 && o(C, D, A) * o(C, D, B) < 0;
  }
  const XT = LAY.map((L) => {
    const t = new Uint8Array(NE * NE);
    for (let a = 0; a < NE; a++) for (let b = 0; b < NE; b++) {
      const [i, j] = PAIRS[a], [k, l] = PAIRS[b];
      if (i === k || i === l || j === k || j === l) continue;
      if (cross(L[i], L[j], L[k], L[l])) t[a * NE + b] = 1;
    }
    return t;
  });
  const edgesOf = (m) => PAIRS.filter((_, k) => (m >> k) & 1);
  const pc = (m) => { let c = 0; while (m) { c += m & 1; m >>= 1; } return c; };
  const connected = (m) => {
    const adj = Array(N).fill(0);
    edgesOf(m).forEach(([a, b]) => { adj[a] |= 1 << b; adj[b] |= 1 << a; });
    let seen = 1, fr = 1;
    while (fr) { let nf = 0; for (let v = 0; v < N; v++) if ((fr >> v) & 1) nf |= adj[v]; fr = nf & ~seen; seen |= nf; }
    return seen === (1 << N) - 1;
  };
  const canonCache = new Map();
  function canon(m) {
    if (canonCache.has(m)) return canonCache.get(m);
    const E = edgesOf(m);
    let best = Infinity;
    for (const p of PERMS) {
      let r = 0;
      for (const [a, b] of E) r |= 1 << IDX[p[a]][p[b]];
      if (r < best) best = r;
    }
    canonCache.set(m, best);
    return best;
  }
  function place(rng, m, l) {
    const E = edgesOf(m), X = XT[l];
    const sc = new Array(PERMS.length);
    let best = 1e9;
    PERMS.forEach((p, pi) => {
      const pe = E.map(([a, b]) => IDX[p[a]][p[b]]);
      let c = 0;
      for (let i = 0; i < pe.length; i++) for (let j = i + 1; j < pe.length; j++) c += X[pe[i] * NE + pe[j]];
      sc[pi] = c;
      if (c < best) best = c;
    });
    const ok = [];
    sc.forEach((c, pi) => { if (c <= best + 1) ok.push(pi); });
    const p = PERMS[rng.pick(ok)];
    let r = 0;
    for (const [a, b] of E) r |= 1 << IDX[p[a]][p[b]];
    return r;
  }
  function invs(m) {
    const deg = Array(N).fill(0), nb = RM.range(N).map(() => []);
    edgesOf(m).forEach(([a, b]) => { deg[a]++; deg[b]++; nb[a].push(b); nb[b].push(a); });
    let tri = 0;
    for (let a = 0; a < N; a++) for (let b = a + 1; b < N; b++) for (let c = b + 1; c < N; c++) if (nb[a].includes(b) && nb[a].includes(c) && nb[b].includes(c)) tri++;
    const prof = deg.map((d, v) => ({ d, n: nb[v].map((u) => deg[u]).sort((x, y) => y - x) }));
    const pk = prof.map((p) => p.d + ':' + p.n.join(','));
    return { deg, seq: deg.slice().sort((a, b) => b - a), tri, prof, pk };
  }
  const cnt = (arr, x) => arr.filter((y) => y === x).length;
  function whyNot(A, B) { // A = row-3 network, B = other; returns text or null
    const a = invs(A), b = invs(B);
    if (a.seq.join('') !== b.seq.join('')) return `its nodes have ${b.seq.join('-')} links each, row 3's network has ${a.seq.join('-')}`;
    if (a.tri !== b.tri) return `it contains ${b.tri} triangle${b.tri === 1 ? '' : 's'} (three nodes all linked to each other), row 3's network contains ${a.tri}`;
    for (const k of a.pk) {
      if (cnt(a.pk, k) !== cnt(b.pk, k)) {
        const [d, n] = k.split(':');
        return `row 3's network has ${cnt(a.pk, k)} node${cnt(a.pk, k) === 1 ? '' : 's'} with ${d} links whose neighbours have ${n.split(',').join(', ')} links, this one has ${cnt(b.pk, k)}`;
      }
    }
    return null;
  }
  function describe(m) {
    const v = invs(m);
    const top = v.prof.reduce((x, y) => (y.d > x.d ? y : x));
    return `${pc(m)} links; links per node ${v.seq.join('-')}; ${v.tri} triangle${v.tri === 1 ? '' : 's'}; a busiest node (${top.d} links) touches nodes with ${top.n.join(', ')} links`;
  }

  RM.register({
    id: 'isomorphic',
    name: 'Same network',
    difficulty: 8,
    generate(rng, variant) {
      const m = variant === 0 ? 8 : rng.pick([7, 8, 8, 9]);
      const G = [];
      for (let r = 0; r < 3; r++) {
        let g = 0;
        for (let t = 0; t < 40 && !g; t++) {
          let x = 0;
          rng.sample(RM.range(NE), m).forEach((k) => { x |= 1 << k; });
          if (!connected(x)) continue;
          const v = invs(x);
          if (v.seq[0] > 4 || new Set(v.seq).size < 3) continue;
          if (G.some((y) => canon(y) === canon(x))) continue;
          g = x;
        }
        RM.need(g);
        G.push(g);
      }
      const G3 = G[2], c3 = canon(G3);
      // candidate distractors
      const E3 = edgesOf(G3);
      const sw = [], mv = [];
      for (let i = 0; i < E3.length; i++) {
        for (let j = i + 1; j < E3.length; j++) {
          const [a, b] = E3[i], [c, d] = E3[j];
          if (new Set([a, b, c, d]).size < 4) continue;
          [[IDX[a][c], IDX[b][d]], [IDX[a][d], IDX[b][c]]].forEach(([x, y]) => {
            if ((G3 >> x) & 1 || (G3 >> y) & 1) return;
            const nm = (G3 & ~(1 << IDX[a][b]) & ~(1 << IDX[c][d])) | (1 << x) | (1 << y);
            sw.push(nm);
          });
        }
      }
      PAIRS.forEach((_, f) => {
        if ((G3 >> f) & 1) return;
        E3.forEach(([a, b]) => mv.push((G3 & ~(1 << IDX[a][b])) | (1 << f)));
      });
      const used = new Set([c3]);
      const out = [];
      const take = (list, k, mk) => {
        let got = 0;
        for (const x of rng.shuffle(list)) {
          if (got >= k) break;
          if (!connected(x)) continue;
          const c = canon(x);
          if (used.has(c)) continue;
          const why = whyNot(G3, x);
          if (!why) continue;
          used.add(c);
          out.push({ mask: x, flaws: [mk(why)] });
          got++;
        }
        return got;
      };
      const rowMasks = [0, 1].map((r) => ({ r, mask: G[r] }));
      rowMasks.forEach(({ r, mask }) => {
        const why = whyNot(G3, mask);
        RM.need(why);
        used.add(canon(mask));
        out.push({ mask, flaws: [`This is the network of row ${r + 1} (look at that row), not of row 3: ${why}.`] });
      });
      let got = take(sw, 3, (w) => `Same number of links, even the same number at each node, but a different network: ${w}.`);
      got += take(mv, 5 - got, (w) => `One link of row 3's network has been moved to another pair of nodes: ${w}.`);
      RM.need(got >= 5 && out.length === 7);
      // placements
      const vis = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (r < 2 || c < 2) vis.push({ l: c, e: place(rng, G[r], c) });
      const ans = { l: 2, e: place(rng, G3, 2) };
      const options = [{ spec: ans, flaws: [] }];
      out.forEach((o) => {
        let e = place(rng, o.mask, 2);
        if (o.mask === G[0] || o.mask === G[1]) {
          const r = o.mask === G[0] ? 0 : 1;
          for (let t = 0; t < 6 && e === vis[r * 3 + 2].e; t++) e = place(rng, o.mask, 2);
        }
        options.push({ spec: { l: 2, e }, flaws: o.flaws });
      });
      const dsc = describe(G3);
      return {
        panels: vis,
        answer: ans,
        options,
        render(s) {
          const pic = new RM.Pic();
          const L = LAY[s.l];
          for (let k = 0; k < NE; k++) if ((s.e >> k) & 1) { const [i, j] = PAIRS[k]; RM.line(pic, L[i][0], L[i][1], L[j][0], L[j][1], { sw: 2.3 }); }
          for (let v = 0; v < N; v++) RM.circle(pic, L[v][0], L[v][1], 5.4, { fill: 'black', sw: 1.4 });
          return pic.svg();
        },
        key: (s) => s.l + ':' + s.e,
        rules: [
          { k: 'Same network', t: 'Each row shows <b>one network</b> three times: the same nodes joined by the same pattern of links, but placed on a different fixed arrangement of dots in each column (and the nodes are shuffled between pictures). Only how the nodes are connected matters, never where they sit.' },
          { k: 'Fingerprints', t: 'To compare two drawings, use things that do not depend on the drawing: the number of links, how many links each node has, the triangles (three nodes all linked to each other), and what the busiest node is attached to.' },
          { k: 'Row 3', t: `The network of row 3 (read it in its first two pictures): ${dsc}.` },
          { k: 'The answer', t: `Exactly one option has all these fingerprints and can be matched node by node with row 3's network: <b>${dsc}</b>. Every other option has the same number of links (${m}) but differs in one of the fingerprints, or is the network of another row.` },
        ],
        hint: 'Ignore where the dots are: compare how many links each node has and who is linked to whom.',
      };
    },
  });
})();
