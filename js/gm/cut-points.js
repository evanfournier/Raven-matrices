/* Weak points (grandmaster): a connected network of 6-7 nodes on fixed positions. Black nodes are the cut points (articulation points: removing
 * the node, with its links, leaves the rest in two or more pieces) - the colour is derived from the links. In every row the links of picture 3
 * are the exclusive-or of the links of pictures 1 and 2 (always connected). Rivals: degree >= 3, odd degree, next to a dead end, bridge ends... */
(function () {
  'use strict';
  const RM = window.RM;
  const LAYOUT = {
    7: { pos: [[50, 12], [82, 28], [88, 62], [68, 88], [32, 88], [12, 62], [18, 28]], names: ['top', 'upper right', 'right', 'lower right', 'lower left', 'left', 'upper left'] },
    6: { pos: [[50, 12], [84, 32], [80, 76], [46, 90], [14, 70], [16, 28]], names: ['top', 'upper right', 'lower right', 'bottom', 'lower left', 'upper left'] },
  };
  const pc = (m) => { let c = 0; while (m) { c += m & 1; m >>= 1; } return c; };
  function takeDiverse(rng, groups, k) {
    const gs = rng.shuffle(groups.map((g) => rng.shuffle(g))).filter((g) => g.length);
    const out = [];
    while (out.length < k && gs.some((g) => g.length)) for (const g of gs) if (g.length && out.length < k) out.push(g.shift());
    return out;
  }

  RM.register({
    id: 'cut-points',
    name: 'Weak points',
    difficulty: 8,
    generate(rng, variant) {
      const n = variant === 0 ? 7 : rng.pick([6, 7, 7]);
      const { pos, names } = LAYOUT[n];
      const PAIRS = [], IDX = RM.range(n).map(() => Array(n).fill(-1));
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { IDX[i][j] = IDX[j][i] = PAIRS.length; PAIRS.push([i, j]); }
      const NE = PAIRS.length, FULL = (1 << NE) - 1;
      const XT = new Uint8Array(NE * NE);
      PAIRS.forEach(([a, b], x) => PAIRS.forEach(([c, d], y) => {
        if (a === c || a === d || b === c || b === d) return;
        const inn = (v) => v > a && v < b;
        if (inn(c) !== inn(d)) XT[x * NE + y] = 1;
      }));
      const el = (m) => { const o = []; for (let k = 0; k < NE; k++) if ((m >> k) & 1) o.push(k); return o; };
      const adjOf = (m) => { const a = Array(n).fill(0); el(m).forEach((k) => { const [i, j] = PAIRS[k]; a[i] |= 1 << j; a[j] |= 1 << i; }); return a; };
      function comps(m, skip) {
        const adj = adjOf(m);
        const left = ((1 << n) - 1) & ~(skip >= 0 ? 1 << skip : 0);
        let rest = left;
        const out = [];
        while (rest) {
          let fr = rest & -rest, seen = fr;
          while (fr) { let nf = 0; for (let v = 0; v < n; v++) if ((fr >> v) & 1) nf |= adj[v]; fr = nf & left & ~seen; seen |= fr; }
          out.push(seen);
          rest &= ~seen;
        }
        return out;
      }
      const conn = (m) => comps(m, -1).length === 1;
      const art = (m) => RM.range(n).map((v) => (comps(m, v).length > 1 ? 1 : 0));
      const degs = (m) => { const a = adjOf(m); return a.map(pc); };
      const bridges = (m) => el(m).filter((k) => !conn(m & ~(1 << k)));
      const HYP = {
        deg3: ['nodes with 3 or more links', (m) => degs(m).map((d) => (d >= 3 ? 1 : 0))],
        odd: ['nodes with an odd number of links', (m) => degs(m).map((d) => d % 2)],
        even: ['nodes with an even number of links', (m) => degs(m).map((d) => 1 - (d % 2))],
        leafnb: ['nodes next to a dead end (a node with a single link)', (m) => { const d = degs(m), a = adjOf(m); return RM.range(n).map((v) => (RM.range(n).some((u) => (a[v] >> u) & 1 && d[u] === 1) ? 1 : 0)); }],
        bridgeEnd: ['nodes at the end of a bridge link', (m) => { const d = degs(m), r = Array(n).fill(0); bridges(m).forEach((k) => PAIRS[k].forEach((v) => { if (d[v] >= 2) r[v] = 1; })); return r; }],
        maxdeg: ['the nodes with the most links', (m) => { const d = degs(m), mx = Math.max.apply(null, d); return d.map((x) => (x === mx ? 1 : 0)); }],
        notOnLoop: ['nodes that lie on no loop', (m) => { const d = degs(m), b = bridges(m); return RM.range(n).map((v) => (d[v] >= 2 && el(m).filter((k) => PAIRS[k].includes(v)).every((k) => b.includes(k)) ? 1 : 0)); }],
      };
      const maxArt = n === 7 ? 3 : 2;
      function randConn(m) {
        const order = rng.shuffle(RM.range(n));
        let mask = 0;
        for (let i = 1; i < n; i++) mask |= 1 << IDX[order[i]][order[rng.int(0, i - 1)]];
        const extra = rng.shuffle(RM.range(NE).filter((k) => !((mask >> k) & 1)));
        for (let i = 0; mask === 0 || pc(mask) < m; i++) mask |= 1 << extra[i];
        return mask;
      }
      const okArt = (m) => { const a = art(m).reduce((x, y) => x + y, 0); return a >= 1 && a <= maxArt; };
      const rowsAbs = [];
      for (let r = 0; r < 3; r++) {
        let row = null;
        for (let t = 0; t < 400 && !row; t++) {
          const A = randConn(rng.int(n, n + 2)), B = randConn(rng.int(n, n + 2)), C = A ^ B;
          if (!conn(C) || pc(C) < n || pc(C) > n + 3) continue;
          if (!okArt(A) || !okArt(B) || !okArt(C)) continue;
          row = [A, B, C];
        }
        RM.need(row);
        rowsAbs.push(row);
      }
      // place the nodes (same relabelling for the three pictures of a row) to keep crossings low
      const crossCount = (m, p) => {
        const ks = el(m).map((k) => IDX[p[PAIRS[k][0]]][p[PAIRS[k][1]]]);
        let c = 0;
        for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) c += XT[ks[i] * NE + ks[j]];
        return c;
      };
      const mapMask = (m, p) => el(m).reduce((s, k) => s | (1 << IDX[p[PAIRS[k][0]]][p[PAIRS[k][1]]]), 0);
      const rows = rowsAbs.map((row) => {
        let best = null, bc = 1e9;
        for (let t = 0; t < 140; t++) {
          const p = rng.shuffle(RM.range(n));
          const c = row.reduce((s, m) => s + Math.max(crossCount(m, p) - 2, 0) * 4 + crossCount(m, p), 0);
          if (c < bc) { bc = c; best = p; }
        }
        return best && row.map((m) => mapMask(m, best));
      });
      const panelsAll = rows.map((r) => r.map((m) => ({ e: m, c: art(m) })));
      const vis = [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1]].map(([r, c]) => panelsAll[r][c]);
      const T = rows[2];
      const ans = panelsAll[2][2];
      // hypotheses
      let nf = 0;
      RM.ALL_BOOL.forEach((f) => {
        const pr = (A, B) => { let m = 0; for (let k = 0; k < NE; k++) if (f(!!((A >> k) & 1), !!((B >> k) & 1))) m |= 1 << k; return m; };
        if (rows.slice(0, 2).every((rw) => pr(rw[0], rw[1]) === rw[2])) { nf++; RM.need(pr(T[0], T[1]) === T[2]); }
      });
      RM.need(nf >= 1);
      Object.keys(HYP).forEach((h) => {
        const f = HYP[h][1];
        if (vis.every((p) => RM.sameArr(f(p.e), p.c))) RM.need(RM.sameArr(f(ans.e), ans.c));
      });
      // distractors
      const nm = (v) => names[v];
      const lk = (k) => `${nm(PAIRS[k][0])} and ${nm(PAIRS[k][1])} nodes`;
      const A3 = T[0], B3 = T[1];
      const cands = [];
      const add = (g, t, spec, flaws) => { if (spec.e === ans.e && RM.sameArr(spec.c, ans.c)) return; cands.push({ g, t, spec, flaws }); };
      const pieces = (m, v) => comps(m, v).map((s) => '{' + RM.range(n).filter((u) => (s >> u) & 1).map(nm).join(', ') + '}').join(' and ');
      const colFlaw = (c, lead) => {
        const v = RM.range(n).find((u) => c[u] !== ans.c[u]);
        if (c[v]) return `${lead}The ${nm(v)} node is black, but removing it leaves all the other nodes connected, so it is not a weak point.`;
        return `${lead}The ${nm(v)} node is white, but removing it separates ${pieces(ans.e, v)}, so it must be black.`;
      };
      Object.keys(HYP).forEach((h) => add('s', 'h' + h, { e: ans.e, c: HYP[h][1](ans.e) }, [colFlaw(HYP[h][1](ans.e), `Black was given to ${HYP[h][0]}, which is not the rule. `)]));
      for (let v = 0; v < n; v++) { const c = ans.c.slice(); c[v] ^= 1; add('s', 'flip', { e: ans.e, c }, [colFlaw(c, '')]); }
      [[2, 0, 'the left picture of this row'], [2, 1, 'the middle picture of this row'], [1, 2, 'the picture above'], [0, 2, 'the top-right picture']].forEach(([r, c, w]) => {
        const col = panelsAll[r][c].c;
        if (!RM.sameArr(col, ans.c)) add('s', 'copy', { e: ans.e, c: col.slice() }, [colFlaw(col, `The colours are copied from ${w} instead of being recomputed. `)]);
      });
      const edgeDiff = (m) => {
        const out = [];
        for (let k = 0; k < NE; k++) {
          const had = (ans.e >> k) & 1, has = (m >> k) & 1;
          if (had === has) continue;
          const ina = (A3 >> k) & 1, inb = (B3 >> k) & 1;
          out.push(has ? `has a link between the ${lk(k)} that should not exist (it is in ${ina && inb ? 'both' : 'neither'} of the first two pictures)` : `lacks the link between the ${lk(k)} (it is in exactly one of the first two pictures)`);
        }
        return out.length > 3 ? out.slice(0, 3).join('; ') + '; and more' : out.join('; ');
      };
      const dE = (m, t, lead) => {
        if (m === ans.e || !conn(m) || !okArt(m) || pc(m) < n - 1 || pc(m) > n + 5) return;
        add('d', t, { e: m, c: art(m) }, [`${lead}The picture ${edgeDiff(m)}.`]);
      };
      dE(A3 | B3, 'or', 'Links merged with OR instead of exclusive-or. ');
      dE(A3 & B3, 'and', 'Only common links kept (AND) instead of exclusive-or. ');
      dE(A3, 'cA', 'The links of the left picture were copied. ');
      dE(B3, 'cB', 'The links of the middle picture were copied. ');
      dE(~(A3 ^ B3) & FULL, 'xnor', 'Links drawn where the pictures agree (XNOR). ');
      for (let k = 0; k < NE; k++) dE(ans.e ^ (1 << k), 'tog', '');
      const byT = (g) => { const m = {}; cands.filter((c) => c.g === g).forEach((c) => { (m[c.t] = m[c.t] || []).push(c); }); return Object.values(m); };
      const sel = takeDiverse(rng, byT('s'), 3).concat(takeDiverse(rng, byT('d'), 4));
      RM.need(sel.length === 7);
      const keyOf = (s) => s.e + ':' + s.c.join('');
      RM.need(new Set(sel.map((c) => keyOf(c.spec)).concat(keyOf(ans))).size === 8);

      const lst = (m) => el(m).map((k) => `${nm(PAIRS[k][0])}–${nm(PAIRS[k][1])}`).join(', ');
      const blacks = RM.range(n).filter((v) => ans.c[v]);
      const whites = RM.range(n).filter((v) => !ans.c[v]);
      return {
        panels: vis,
        answer: ans,
        options: [{ spec: ans, flaws: [] }].concat(sel.map((c) => ({ spec: c.spec, flaws: c.flaws }))),
        render(s) {
          const pic = new RM.Pic();
          el(s.e).forEach((k) => { const [i, j] = PAIRS[k]; RM.line(pic, pos[i][0], pos[i][1], pos[j][0], pos[j][1], { sw: 2.3 }); });
          for (let v = 0; v < n; v++) RM.circle(pic, pos[v][0], pos[v][1], 6.6, { fill: s.c[v] ? 'black' : 'white', sw: 2.1 });
          return pic.svg();
        },
        key: keyOf,
        rules: [
          { k: 'Links', t: 'In every row, the third picture has a link between two nodes only if <b>exactly one</b> of the first two pictures has it (a link present in both cancels out). Every picture stays connected.' },
          { k: 'Black nodes', t: 'The colours are computed from the links. A node is <b>black</b> if it is a weak point: if you remove it together with its links, the remaining nodes fall apart into two or more separate groups. Otherwise it is white. (Not the nodes with many links, and not those with an odd number of links: check this on the examples.)' },
          { k: 'Links of the missing picture', t: `Left picture: ${lst(A3)}. Middle picture: ${lst(B3)}. Links in exactly one of them: <b>${lst(ans.e)}</b>.` },
          { k: 'Weak points', t: (blacks.length ? blacks.map((v) => `Removing the ${nm(v)} node splits ${pieces(ans.e, v)}, so it is <b>black</b>`).join('; ') + '. ' : '') + `Removing any of the ${whites.map(nm).join(', ')} node${whites.length > 1 ? 's' : ''} leaves the rest connected: <b>white</b>.` },
        ],
        hint: 'The colours follow from the links: ask what happens to the network if a node is taken away.',
      };
    },
  });
})();
