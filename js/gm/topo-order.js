/* Dependency order (grandmaster): panels 1 and 2 of each row are two sets of arrows ("X must come before Y") between the same symbols placed
 * on a circle; panel 3 lists the symbols in a row, left to right, in the ONE order that satisfies the arrows of both panels together. */
(function () {
  'use strict';
  const RM = window.RM;
  const SYMS = [
    ['circle', 'white', 'white circle'],
    ['square', 'black', 'black square'],
    ['triangle', 'gray', 'grey triangle'],
    ['star5', 'white', 'white star'],
    ['hexagon', 'dark', 'dark hexagon'],
    ['diamond', 'light', 'light diamond'],
  ];
  const PERMS = {};
  function perms(n) {
    if (PERMS[n]) return PERMS[n];
    const out = [];
    const rec = (cur, rest) => {
      if (!rest.length) { out.push(cur); return; }
      rest.forEach((x, i) => rec(cur.concat([x]), rest.slice(0, i).concat(rest.slice(i + 1))));
    };
    rec([], RM.range(n));
    return (PERMS[n] = out);
  }
  const posOf = (ord) => { const p = []; ord.forEach((s, i) => (p[s] = i)); return p; };
  const viol = (ord, edges) => { const p = posOf(ord); return edges.filter((e) => p[e[0]] > p[e[1]]); };
  const kendall = (a, b) => {
    const pa = posOf(a);
    const pb = posOf(b);
    let d = 0;
    for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if ((pa[i] - pa[j]) * (pb[i] - pb[j]) < 0) d++;
    return d;
  };
  const same = (a, b) => a.every((v, i) => v === b[i]);

  function hyps(n, e1, e2) {
    const u = e1.concat(e2);
    const all = perms(n);
    const v1 = all.filter((o) => !viol(o, e1).length);
    const v2 = all.filter((o) => !viol(o, e2).length);
    const od = RM.range(n).map((s) => u.filter((e) => e[0] === s).length);
    const id = RM.range(n).map((s) => u.filter((e) => e[1] === s).length);
    const srt = (f) => RM.range(n).sort((a, b) => f(a) - f(b) || a - b);
    return {
      lexmin1: v1[0], lexmax1: v1[v1.length - 1], lexmin2: v2[0], lexmax2: v2[v2.length - 1],
      out: srt((s) => -od[s]), in: srt((s) => id[s]), net: srt((s) => id[s] - od[s]),
      id: RM.range(n), idrev: RM.range(n).reverse(),
    };
  }

  RM.register({
    id: 'topo-order',
    name: 'Dependency order',
    difficulty: 7,
    generate(rng, variant) {
      const n = variant >= 2 ? 6 : 5;
      const SP = n === 5 ? 18 : 15;
      const symIdx = rng.sample(RM.range(SYMS.length), n);
      const sym = (s) => SYMS[symIdx[s]];
      const rows = [];
      for (let r = 0; r < 3; r++) {
        let row = null;
        for (let t = 0; t < 200 && !row; t++) {
          const ord = rng.shuffle(RM.range(n));
          const chain = RM.range(n - 1).map((i) => [ord[i], ord[i + 1]]);
          const skips = [];
          for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) skips.push([ord[i], ord[j]]);
          const edges = chain.concat(rng.sample(skips, variant === 1 || variant === 3 ? rng.int(1, 2) : rng.int(0, 1)));
          const sh = rng.shuffle(edges);
          const k = rng.int(2, sh.length - 2);
          const e1 = sh.slice(0, k);
          const e2 = sh.slice(k);
          if (e1.length > 4 || e2.length > 4) continue;
          row = { ord, e1, e2 };
        }
        RM.need(row);
        rows.push(row);
      }
      RM.need(new Set(rows.map((r) => r.ord.join(''))).size === 3);
      RM.need(new Set(rows.map((r) => r.e1.map((e) => e.join('')).sort().join())).size === 3);
      // alternative readings must fail on rows 1-2 (at least once each)
      const H = rows.map((r) => hyps(n, r.e1, r.e2));
      Object.keys(H[0]).forEach((k) => RM.need(!(same(H[0][k], rows[0].ord) && same(H[1][k], rows[1].ord))));
      const R = rows[2];
      const U = R.e1.concat(R.e2);
      const A = R.ord;
      const ownerOf = (e) => (R.e1.some((x) => x[0] === e[0] && x[1] === e[1]) ? 1 : 2);
      const nameOf = (s) => sym(s)[2];
      const all = perms(n);
      // candidate distractors
      const cands = [];
      const seen = new Set([A.join('')]);
      const add = (ord, type, text) => {
        const k = ord.join('');
        if (seen.has(k) || !viol(ord, U).length) return;
        seen.add(k);
        const v = viol(ord, U);
        const fl = [text];
        fl.push(v.slice(0, 2).map((e) => 'the arrow ' + nameOf(e[0]) + ' → ' + nameOf(e[1]) + ' (panel ' + ownerOf(e) + ') is broken: the ' + nameOf(e[1]) + ' stands before the ' + nameOf(e[0])).join('; ') + (v.length > 2 ? '; ' + (v.length - 2) + ' more arrow(s) are broken too' : '') + '.');
        cands.push({ spec: { o: ord }, type, fl, d: kendall(ord, A) });
      };
      const near = (e, other) => {
        const c = all.filter((o) => !viol(o, e).length && viol(o, other).length);
        const m = Math.min.apply(null, c.map((o) => kendall(o, A)));
        return rng.pick(c.filter((o) => kendall(o, A) === m));
      };
      add(near(R.e1, R.e2), 'p1', 'This order respects the arrows of panel 1 only and ignores those of panel 2.');
      add(near(R.e2, R.e1), 'p2', 'This order respects the arrows of panel 2 only and ignores those of panel 1.');
      const HH = H[2];
      add(HH.out, 'deg', 'Symbols were sorted by how many arrows leave them, which is not what the arrows demand.');
      add(HH.in, 'deg', 'Symbols were sorted by how few arrows enter them, which is not what the arrows demand.');
      add(A.slice().reverse(), 'rev', 'The order is reversed: arrows must point from left to right.');
      for (let i = 0; i < n - 1; i++) { const o = A.slice(); [o[i], o[i + 1]] = [o[i + 1], o[i]]; add(o, 'adj', 'Two neighbouring symbols are swapped.'); }
      for (let i = 0; i < n - 2; i++) { const o = A.slice(); [o[i], o[i + 2]] = [o[i + 2], o[i]]; add(o, 'sw2', 'Two symbols are exchanged.'); }
      add(A.slice(1).concat([A[0]]), 'rot', 'The first symbol was moved to the end.');
      add([A[n - 1]].concat(A.slice(0, n - 1)), 'rot', 'The last symbol was moved to the front.');
      const typed = cands.filter((c) => c.type !== 'adj' && c.type !== 'sw2' && c.type !== 'rot');
      let pick = null;
      for (let t = 0; t < 80 && !pick; t++) {
        const must = typed.filter((c) => c.type === 'p1' || c.type === 'p2');
        const rest = rng.shuffle(cands.filter((c) => must.indexOf(c) < 0));
        const sel = must.concat(rest).slice(0, 7);
        if (sel.length < 7) break;
        const opts = [A].concat(sel.map((c) => c.spec.o));
        const sum = (o) => opts.reduce((s, q) => s + kendall(o, q), 0);
        const sa = sum(A);
        if (opts.some((o) => o !== A && sum(o) <= sa) && sel.some((c) => c.d >= 4)) pick = sel;
      }
      RM.need(pick);
      const options = [{ spec: { o: A }, flaws: [] }].concat(pick.map((c) => ({ spec: c.spec, flaws: c.fl })));
      const panels = [];
      rows.forEach((r, i) => { panels.push({ e: r.e1 }, { e: r.e2 }); if (i < 2) panels.push({ o: r.ord }); });

      // explanation (Kahn elimination)
      const steps = [];
      let rem = RM.range(n);
      let left = U.slice();
      while (rem.length) {
        const free = rem.filter((s) => !left.some((e) => e[1] === s));
        const s = free[0];
        steps.push(nameOf(s));
        rem = rem.filter((x) => x !== s);
        left = left.filter((e) => e[0] !== s);
      }
      const el = (E) => E.map((e) => nameOf(e[0]) + ' → ' + nameOf(e[1])).join('; ');
      return {
        panels,
        answer: { o: A },
        options,
        render: (s) => (s.o ? renderOrder(s.o) : renderGraph(s.e)),
        key: (s) => JSON.stringify(s),
        rules: [
          { k: 'Arrows', t: 'In the first two panels of a row, an arrow X → Y means "<b>X must come before Y</b>". Both panels use the same symbols, always at the same place on the circle.' },
          { k: 'Third panel', t: 'The third panel lists the five (or six) symbols from left to right in the order that respects <b>all arrows of both panels at once</b>. Only one order does: the arrows of the two panels together form a chain through all symbols.' },
          { k: 'Not one panel alone', t: 'Each panel alone leaves several orders possible, so using only one panel, sorting by number of arrows, or reversing the order contradicts rows 1 and 2.' },
          { k: 'Last row', t: 'Panel 1: ' + el(R.e1) + '. Panel 2: ' + el(R.e2) + '.<br>Repeatedly take the symbol that no remaining symbol points to (there is always exactly one): ' + steps.join(' &rarr; ') + '.' },
          { k: 'Answer', t: 'From left to right: <b>' + A.map(nameOf).join(', ') + '</b>.' },
        ],
        hint: 'Read every arrow as "this one first, that one later", and merge the arrows of both panels: who can nobody precede?',
      };

      function renderGraph(edges) {
        const pic = new RM.Pic();
        const rr = n === 5 ? 8.2 : 7.2;
        const R0 = n === 5 ? 31 : 33;
        const P = RM.range(n).map((i) => [50 + R0 * Math.cos(((-90 + (360 * i) / n) * Math.PI) / 180), 50 + R0 * Math.sin(((-90 + (360 * i) / n) * Math.PI) / 180)]);
        edges.forEach((e) => {
          const a = P[e[0]];
          const b = P[e[1]];
          const dx = b[0] - a[0];
          const dy = b[1] - a[1];
          const L = Math.hypot(dx, dy);
          const ux = dx / L;
          const uy = dy / L;
          const s = [a[0] + ux * (rr + 2), a[1] + uy * (rr + 2)];
          const t = [b[0] - ux * (rr + 2.2), b[1] - uy * (rr + 2.2)];
          RM.line(pic, s[0], s[1], t[0] - ux * 4, t[1] - uy * 4, { sw: 2.2, cap: 'butt' });
          RM.polygon(pic, [[t[0], t[1]], [t[0] - ux * 7.5 - uy * 3.6, t[1] - uy * 7.5 + ux * 3.6], [t[0] - ux * 7.5 + uy * 3.6, t[1] - uy * 7.5 - ux * 3.6]], { fill: 'black', sw: 0.8 });
        });
        for (let i = 0; i < n; i++) RM.shape(pic, sym(i)[0], P[i][0], P[i][1], rr, { fill: sym(i)[1], sw: 1.8 });
        return pic.svg();
      }
      function renderOrder(ord) {
        const pic = new RM.Pic();
        const rr = n === 5 ? 8 : 6.9;
        ord.forEach((s, i) => RM.shape(pic, sym(s)[0], 50 + (i - (n - 1) / 2) * SP, 42, rr, { fill: sym(s)[1], sw: 1.8 }));
        RM.line(pic, 12, 72, 80, 72, { sw: 2, cap: 'butt' });
        RM.polygon(pic, [[90, 72], [80, 67.5], [80, 76.5]], { fill: 'black', sw: 0.8 });
        return pic.svg();
      }
    },
  });
})();
