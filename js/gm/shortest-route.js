/* Shortest route (grandmaster): a road network on a 3x3 lattice; every road carries 1-6 ticks (its cost); S and G are marked and the
 * highlighted route is the unique cheapest S->G route. In every row the tick counts of picture 3 are the road-by-road SUM of pictures
 * 1 and 2. The missing picture needs the summed weights and the new cheapest route (not the fewest roads, not a previous route). */
(function () {
  'use strict';
  const RM = window.RM;
  const W = 3;
  const NN = W * W;
  const X = (v) => 14 + 36 * (v % W);
  const Y = (v) => 14 + 36 * Math.floor(v / W);
  const ED = [];
  const EI = RM.range(NN).map(() => Array(NN).fill(-1));
  for (let r = 0; r < W; r++) for (let c = 0; c < W; c++) {
    const v = r * W + c;
    if (c < W - 1) ED.push([v, v + 1]);
    if (r < W - 1) ED.push([v, v + W]);
  }
  ED.forEach(([a, b], k) => { EI[a][b] = EI[b][a] = k; });
  const NE = ED.length;
  const nodeTxt = (v) => `(${Math.floor(v / W) + 1},${(v % W) + 1})`;
  const roadTxt = (k) => `${nodeTxt(ED[k][0])}–${nodeTxt(ED[k][1])}`;

  function paths(roads, S, G) {
    const adj = RM.range(NN).map(() => []);
    ED.forEach(([a, b], k) => { if ((roads >> k) & 1) { adj[a].push([b, k]); adj[b].push([a, k]); } });
    const out = [];
    const nodes = [S], edges = [];
    (function dfs(v, seen) {
      if (v === G) { out.push({ nodes: nodes.slice(), edges: edges.slice() }); return; }
      for (const [u, k] of adj[v]) {
        if ((seen >> u) & 1) continue;
        nodes.push(u); edges.push(k);
        dfs(u, seen | (1 << u));
        nodes.pop(); edges.pop();
      }
    })(S, 1 << S);
    return out;
  }
  const costOf = (p, w) => p.edges.reduce((s, k) => s + w[k], 0);
  function rank(ps, w) { // sorted copy with costs
    return ps.map((p) => ({ p, c: costOf(p, w) })).sort((a, b) => a.c - b.c || a.p.edges.length - b.p.edges.length);
  }
  const uniqueBest = (rk) => rk.length >= 2 && rk[1].c > rk[0].c;
  const sameP = (a, b) => a.nodes.join('') === b.nodes.join('');
  function greedyWalk(roads, S, G, w) {
    const seen = new Set([S]);
    const nodes = [S], edges = [];
    let v = S;
    while (v !== G) {
      let best = null, tie = false;
      ED.forEach(([a, b], k) => {
        if (!((roads >> k) & 1)) return;
        const u = a === v ? b : b === v ? a : -1;
        if (u < 0 || seen.has(u)) return;
        if (!best || w[k] < best.c) { best = { u, k, c: w[k] }; tie = false; } else if (w[k] === best.c) tie = true;
      });
      if (!best || tie) return null;
      seen.add(best.u); nodes.push(best.u); edges.push(best.k); v = best.u;
    }
    return { nodes, edges };
  }
  function takeDiverse(rng, groups, k) {
    const gs = rng.shuffle(groups.map((g) => rng.shuffle(g))).filter((g) => g.length);
    const out = [];
    while (out.length < k && gs.some((g) => g.length)) for (const g of gs) if (g.length && out.length < k) out.push(g.shift());
    return out;
  }

  RM.register({
    id: 'shortest-route',
    name: 'Shortest route',
    difficulty: 7,
    generate(rng, variant) {
      const ALL = (1 << NE) - 1;
      function makeRow(last) {
        for (let t = 0; t < 400; t++) {
          const k = variant === 0 ? rng.int(0, 1) : rng.int(1, 3);
          let roads = ALL;
          rng.sample(RM.range(NE), k).forEach((e) => { roads &= ~(1 << e); });
          const S = rng.int(0, NN - 1);
          const far = RM.range(NN).filter((v) => Math.abs(S % W - v % W) + Math.abs(Math.floor(S / W) - Math.floor(v / W)) >= 3);
          if (!far.length) continue;
          const G = rng.pick(far);
          const ps = paths(roads, S, G);
          if (ps.length < 5) continue;
          const minHops = Math.min.apply(null, ps.map((p) => p.edges.length));
          const w1 = Array(NE).fill(0), w2 = Array(NE).fill(0);
          const detours = ps.filter((p) => p.edges.length > minHops);
          if (!detours.length) continue;
          const D = rng.pick(detours);
          const ov = (p, q) => p.edges.filter((e) => q.edges.includes(e)).length;
          const shorter = ps.filter((p) => p.edges.length < D.edges.length && ov(p, D) <= 1);
          if (shorter.length < 2) continue;
          const P1 = rng.pick(shorter), P2 = rng.pick(shorter);
          if (sameP(P1, P2)) continue;
          for (let e = 0; e < NE; e++) {
            if (!((roads >> e) & 1)) continue;
            if (D.edges.includes(e)) { w1[e] = 1; w2[e] = 1; }
            else if (P1.edges.includes(e) && P2.edges.includes(e)) { w1[e] = 2; w2[e] = 2; }
            else if (P1.edges.includes(e)) { w1[e] = 1; w2[e] = 3; }
            else if (P2.edges.includes(e)) { w1[e] = 3; w2[e] = 1; }
            else { w1[e] = rng.int(2, 3); w2[e] = rng.int(2, 3); }
          }
          const w3 = w1.map((x, i) => x + w2[i]);
          const r1 = rank(ps, w1), r2 = rank(ps, w2), r3 = rank(ps, w3);
          if (!uniqueBest(r1) || !uniqueBest(r2) || !uniqueBest(r3)) continue;
          const p1 = r1[0].p, p2 = r2[0].p, p3 = r3[0].p;
          if (sameP(p3, p1) || sameP(p3, p2)) continue;
          if (p3.edges.length <= minHops) continue;
          if (last && r3[1].c - r3[0].c > 2) continue;
          return { roads, S, G, w: [w1, w2, w3], path: [p1.nodes, p2.nodes, p3.nodes], ps, minHops };
        }
        return null;
      }
      const rows = [];
      for (let r = 0; r < 3; r++) { const row = makeRow(r === 2); RM.need(row); rows.push(row); }
      // hypotheses on the combination of weights
      const OPS = { sum: (a, b) => a + b, max: Math.max, min: Math.min, diff: (a, b) => Math.abs(a - b), a: (a) => a, b: (a, b) => b, prod: (a, b) => a * b };
      const okOps = Object.keys(OPS).filter((o) => rows.slice(0, 2).every((r) => RM.range(NE).every((e) => !((r.roads >> e) & 1) || OPS[o](r.w[0][e], r.w[1][e]) === r.w[2][e])));
      RM.need(okOps.length === 1 && okOps[0] === 'sum');

      const R = rows[2];
      const { roads, S, G, ps } = R;
      const w1 = R.w[0], w2 = R.w[1], w3 = R.w[2];
      const r3 = rank(ps, w3);
      const best = r3[0].p, bestC = r3[0].c;
      const mk = (w, path) => ({ roads, S, G, w, path: path.slice() });
      const routeTxt = (p, w) => p.nodes.map((v, i) => (i ? `→[${w[p.edges[i - 1]]}] ` : '') + nodeTxt(v)).join(' ');
      const cands = [];
      const add = (g, t, w, path, flaws) => cands.push({ g, t, spec: mk(w, path), flaws });
      // route errors with correct weights
      [[0, 'first'], [1, 'second']].forEach(([i, nm]) => {
        const pp = { nodes: R.path[i] };
        const p = ps.find((q) => sameP(q, pp));
        if (p && !sameP(p, best)) add('p', 'prev' + i, w3, p.nodes, [`The route shown is the cheapest one for the ${nm} picture's weights; with the summed weights it costs ${costOf(p, w3)}, while the cheapest route costs ${bestC}.`]);
      });
      const hopMin = ps.filter((p) => p.edges.length === R.minHops).map((p) => ({ p, c: costOf(p, w3) })).sort((a, b) => a.c - b.c)[0];
      if (hopMin && !sameP(hopMin.p, best)) add('p', 'hop', w3, hopMin.p.nodes, [`This route has the fewest roads (${R.minHops}), but it costs ${hopMin.c}; the cheapest route costs ${bestC} (it uses ${best.edges.length} roads).`]);
      [1, 2, 3].forEach((i) => { if (r3[i]) add('p', 'rank' + i, w3, r3[i].p.nodes, [`This route costs ${r3[i].c}, but a route costing only ${bestC} exists.`]); });
      const gw = greedyWalk(roads, S, G, w3);
      if (gw && !sameP(gw, best)) add('p', 'greedy', w3, gw.nodes, [`This route always takes the cheapest next road, a trap: it costs ${costOf(gw, w3)}, while the cheapest route costs ${bestC}.`]);
      // weight errors
      const tam = [];
      RM.range(NE).forEach((e) => {
        if (!((roads >> e) & 1)) return;
        [1, -1].forEach((dl) => {
          if (w3[e] + dl > 6 || w3[e] + dl < 1) return;
          const wt = w3.slice();
          wt[e] = w3[e] + dl;
          const flaw = `The road ${roadTxt(e)} shows ${wt[e]} tick${wt[e] === 1 ? '' : 's'}, but ${w1[e]} + ${w2[e]} = ${w3[e]}.`;
          const rk = rank(ps, wt);
          const alt = rk.filter((q) => q.c === rk[0].c && !sameP(q.p, best))[0];
          const A = { w: wt, path: best.nodes, flaws: [flaw], e, onPath: best.edges.includes(e) };
          const B = alt ? { w: wt, path: alt.p.nodes, flaws: [flaw + ' (The route drawn is a cheapest one for those wrong weights.)'], e, onPath: A.onPath } : null;
          tam.push({ A, B });
        });
      });
      const tOpts = [];
      const usedRoad = new Set();
      const both = rng.shuffle(tam.filter((x) => x.B)).sort((a, b) => (b.A.onPath ? 1 : 0) - (a.A.onPath ? 1 : 0));
      both.forEach((x) => { if (usedRoad.size < 2 && !usedRoad.has(x.A.e)) { usedRoad.add(x.A.e); tOpts.push(x.A, x.B); } });
      rng.shuffle(tam).sort((a, b) => (b.A.onPath ? 1 : 0) - (a.A.onPath ? 1 : 0)).forEach((x) => { if (tOpts.length < 4 && !usedRoad.has(x.A.e)) { usedRoad.add(x.A.e); tOpts.push(x.A); } });
      RM.need(tOpts.length === 4);
      tOpts.forEach((x) => add('t', 't' + x.e, x.w, x.path, x.flaws));
      const opc = [];
      [['max', 'larger'], ['min', 'smaller'], ['diff', 'difference']].forEach(([o, nm]) => {
        const wo = w1.map((x, i) => OPS[o](x, w2[i]));
        if (RM.range(NE).some((e) => ((roads >> e) & 1) && wo[e] === 0)) return;
        const rk = rank(ps, wo);
        if (!uniqueBest(rk)) return;
        const e0 = RM.range(NE).find((e) => ((roads >> e) & 1) && wo[e] !== w3[e]);
        opc.push({ w: wo, path: rk[0].p.nodes, flaws: [`Each road shows the ${nm} of the two pictures' ticks instead of their sum (e.g. ${roadTxt(e0)}: ${w1[e0]} and ${w2[e0]} give ${w3[e0]}, not ${wo[e0]}).`] });
      });
      RM.need(opc.length);
      const o1 = rng.pick(opc);
      add('o', 'op', o1.w, o1.path, o1.flaws);

      const byT = (g) => { const m = {}; cands.filter((c) => c.g === g).forEach((c) => { (m[c.t] = m[c.t] || []).push(c); }); return Object.values(m); };
      const sel = takeDiverse(rng, byT('p'), 2).concat(cands.filter((c) => c.g === 't' || c.g === 'o'));
      RM.need(sel.length === 7);
      const ans = mk(w3, best.nodes);
      const keyOf = (s) => s.w.join('') + '|' + s.path.join('');
      RM.need(new Set(sel.map((c) => keyOf(c.spec)).concat(keyOf(ans))).size === 8);

      const wl = RM.range(NE).filter((e) => (roads >> e) & 1).map((e) => `${roadTxt(e)}: ${w1[e]}+${w2[e]}=${w3[e]}`).join('; ');
      const second = r3[1];
      return {
        panels: rows.flatMap((r, i) => RM.range(i < 2 ? 3 : 2).map((c) => ({ roads: r.roads, S: r.S, G: r.G, w: r.w[c], path: r.path[c] }))),
        answer: ans,
        options: [{ spec: ans, flaws: [] }].concat(sel.map((c) => ({ spec: c.spec, flaws: c.flaws }))),
        render(s) {
          const pic = new RM.Pic();
          for (let i = 1; i < s.path.length; i++) {
            const a = s.path[i - 1], b = s.path[i];
            RM.line(pic, X(a), Y(a), X(b), Y(b), { sw: 9, color: '#a9b1bc' });
          }
          ED.forEach(([a, b], k) => {
            if (!((s.roads >> k) & 1)) return;
            RM.line(pic, X(a), Y(a), X(b), Y(b), { sw: 2 });
            const mx = (X(a) + X(b)) / 2, my = (Y(a) + Y(b)) / 2;
            const dx = X(b) - X(a), dy = Y(b) - Y(a), L = Math.hypot(dx, dy);
            const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
            for (let i = 0; i < s.w[k]; i++) {
              const t = (i - (s.w[k] - 1) / 2) * 3.9;
              RM.line(pic, mx + ux * t - nx * 4.6, my + uy * t - ny * 4.6, mx + ux * t + nx * 4.6, my + uy * t + ny * 4.6, { sw: 1.7, cap: 'butt' });
            }
          });
          for (let v = 0; v < NN; v++) {
            if (v === s.S || v === s.G) {
              RM.circle(pic, X(v), Y(v), 7, { fill: 'black', sw: 1.5 });
              pic.add(`<text x="${X(v)}" y="${Y(v) + 3.6}" font-size="10.5" font-weight="700" text-anchor="middle" fill="#ffffff" font-family="Arial,Helvetica,sans-serif">${v === s.S ? 'S' : 'G'}</text>`);
            } else RM.circle(pic, X(v), Y(v), 3.6, { fill: 'white', sw: 1.8 });
          }
          return pic.svg();
        },
        key: keyOf,
        rules: [
          { k: 'Weights', t: 'Each road costs as many <b>ticks</b> as it shows. In every row, the third picture shows, road by road, the <b>sum</b> of the ticks of the first two pictures (a road with 2 ticks in one and 3 in the other gets 5).' },
          { k: 'Route', t: 'The highlighted route in every picture is the <b>cheapest</b> way from S to G: the smallest total number of ticks (not the fewest roads, and never the route of another picture). It is unique. Junctions are named (row, column) from the top-left.' },
          { k: 'Row 3 weights', t: `Summed weights: ${wl}.` },
          { k: 'Cheapest route', t: `Comparing all routes, the cheapest is <b>${routeTxt(best, w3)}</b>, total <b>${bestC}</b>. The next best costs ${second.c}, the route with the fewest roads costs ${costOf(ps.filter((p) => p.edges.length === R.minHops).sort((a, b) => costOf(a, w3) - costOf(b, w3))[0], w3)}.` },
        ],
        hint: 'First combine the tick counts road by road, then compare complete routes by their total.',
      };
    },
  });
})();
