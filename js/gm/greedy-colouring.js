/* Greedy colouring (grandmaster): in every row the links of picture 3 are the exclusive-or of the links of pictures 1 and 2.
 * The shade of every node is DERIVED from the links: nodes are coloured one at a time in a fixed spatial order and each takes
 * the first shade of a fixed list that none of its already-coloured neighbours wears. Variants hide the order / the shade list. */
(function () {
  'use strict';
  const RM = window.RM;
  const N = 6;
  const P = [[14, 46], [28, 20], [43, 84], [57, 14], [72, 80], [86, 54]];
  const PAIRS = [];
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) PAIRS.push([i, j]);
  const NE = PAIRS.length;
  const FULL = (1 << NE) - 1;
  const FILL = ['white', 'gray', 'black', 'lines:45:4:1.9'];
  const SN = ['white', 'gray', 'black', 'hatched'];
  const FROM = { LR: 'from the left', RL: 'from the right', TB: 'from the top', BT: 'from the bottom' };
  const DIR = { LR: 'left to right', RL: 'right to left', TB: 'top to bottom', BT: 'bottom to top' };
  const ORD = ['1st', '2nd', '3rd', '4th', '5th', '6th'];
  const PERMS = [];
  (function f(cur) {
    if (cur.length === 4) { PERMS.push(cur); return; }
    for (let s = 0; s < 4; s++) if (!cur.includes(s)) f(cur.concat(s));
  })([]);

  const pc = (m) => { let c = 0; while (m) { c += m & 1; m >>= 1; } return c; };
  function adjOf(mask) {
    const a = Array(N).fill(0);
    for (let k = 0; k < NE; k++) if ((mask >> k) & 1) { const [i, j] = PAIRS[k]; a[i] |= 1 << j; a[j] |= 1 << i; }
    return a;
  }
  function order(name, adj) {
    const idx = RM.range(N);
    if (name === 'DEG') return idx.sort((a, b) => pc(adj[b]) - pc(adj[a]) || P[a][0] - P[b][0]);
    const key = { LR: (v) => P[v][0], RL: (v) => -P[v][0], TB: (v) => P[v][1], BT: (v) => -P[v][1] }[name];
    return idx.sort((a, b) => key(a) - key(b));
  }
  function greedy(adj, ord, perm) {
    const col = Array(N).fill(-1);
    for (const v of ord) {
      let used = 0;
      for (let u = 0; u < N; u++) if ((adj[v] >> u) & 1 && col[u] >= 0) used |= 1 << col[u];
      let c = -1;
      for (const s of perm) if (!((used >> s) & 1)) { c = s; break; }
      if (c < 0) return null;
      col[v] = c;
    }
    return col;
  }
  function maskOf(rng, k) { let m = 0; rng.sample(RM.range(NE), k).forEach((x) => { m |= 1 << x; }); return m; }
  function takeDiverse(rng, groups, k) {
    const gs = rng.shuffle(groups.map((g) => rng.shuffle(g))).filter((g) => g.length);
    const out = [];
    while (out.length < k && gs.some((g) => g.length)) {
      for (const g of gs) if (g.length && out.length < k) out.push(g.shift());
    }
    return out;
  }

  RM.register({
    id: 'greedy-colouring',
    name: 'Greedy colouring',
    difficulty: 8,
    generate(rng, variant) {
      const on = variant >= 2 ? rng.pick(['LR', 'RL', 'TB', 'BT']) : 'LR';
      const perm = variant % 2 === 1 ? rng.shuffle([0, 1, 2, 3]) : [0, 1, 2, 3];
      const colour = (mask) => { const adj = adjOf(mask); return greedy(adj, order(on, adj), perm); };
      const rows = [];
      for (let r = 0; r < 3; r++) {
        let row = null;
        for (let t = 0; t < 80 && !row; t++) {
          const A = maskOf(rng, rng.int(5, 7)), B = maskOf(rng, rng.int(5, 7)), C = A ^ B;
          const n = pc(C);
          if (n < 5 || n > 9) continue;
          const c = [colour(A), colour(B), colour(C)];
          if (c.some((x) => !x)) continue;
          if (new Set(c[2]).size < 3) continue;
          row = { e: [A, B, C], c };
        }
        RM.need(row);
        rows.push(row);
      }
      const T = rows[2];
      const vis = [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1]].map(([r, c]) => ({ r, c, e: rows[r].e[c], col: rows[r].c[c] }));
      // link functions
      let nf = 0;
      RM.ALL_BOOL.forEach((f) => {
        const pr = (A, B) => { let m = 0; for (let k = 0; k < NE; k++) if (f(!!((A >> k) & 1), !!((B >> k) & 1))) m |= 1 << k; return m; };
        if (rows.slice(0, 2).every((rw) => pr(rw.e[0], rw.e[1]) === rw.e[2])) {
          nf++;
          RM.need(pr(T.e[0], T.e[1]) === T.e[2]);
        }
      });
      RM.need(nf >= 1);
      // colouring rules (order x shade list)
      const ansAdj = adjOf(T.e[2]);
      let nh = 0, truthOk = false;
      for (const on2 of ['LR', 'RL', 'TB', 'BT', 'DEG']) {
        for (const p2 of PERMS) {
          const ok = vis.every((p) => { const adj = adjOf(p.e); const c = greedy(adj, order(on2, adj), p2); return c && RM.sameArr(c, p.col); });
          if (!ok) continue;
          nh++;
          const c = greedy(ansAdj, order(on2, ansAdj), p2);
          RM.need(c && RM.sameArr(c, T.c[2]));
          if (on2 === on && RM.sameArr(p2, perm)) truthOk = true;
        }
      }
      RM.need(nh >= 1 && truthOk);

      const ans = { e: T.e[2], c: T.c[2] };
      const ord = order(on, ansAdj);
      const rk = (v) => ord.indexOf(v);
      const nm = (v) => `${ORD[rk(v)]} node ${FROM[on]}`;
      const lk = (k) => { const [a, b] = PAIRS[k].map(rk).sort((x, y) => x - y); return `${ORD[a]} and ${ORD[b]} node ${FROM[on]}`; };
      const A3 = T.e[0], B3 = T.e[1];
      const cands = [];
      const add = (g, t, spec, flaws) => { if (spec.e === ans.e && RM.sameArr(spec.c, ans.c)) return; cands.push({ g, t, spec, flaws }); };
      const plist = perm.map((s) => SN[s]).join(' → ');

      // same links, wrong shades
      ['LR', 'RL', 'TB', 'BT'].forEach((o2) => {
        if (o2 === on) return;
        const c = greedy(ansAdj, order(o2, ansAdj), perm);
        if (c) add('s', 'ord', { e: ans.e, c }, [`The nodes were coloured ${DIR[o2]}, but the examples colour them ${DIR[on]}.`]);
      });
      [[0, 1], [1, 2], [2, 3], [0, 2]].forEach(([i, j]) => {
        const p2 = perm.slice(); p2[i] = perm[j]; p2[j] = perm[i];
        const c = greedy(ansAdj, ord, p2);
        if (c) add('s', 'list', { e: ans.e, c }, [`The shades were tried in the order ${p2.map((s) => SN[s]).join(' → ')}; the examples use ${plist}.`]);
      });
      for (let v = 0; v < N; v++) {
        for (let s = 0; s < 4; s++) {
          if (s === ans.c[v] || perm.indexOf(s) < perm.indexOf(ans.c[v])) continue;
          let free = true;
          for (let u = 0; u < N; u++) if ((ansAdj[v] >> u) & 1 && ans.c[u] === s) free = false;
          if (!free) continue;
          const c = ans.c.slice(); c[v] = s;
          add('s', 'nongreedy', { e: ans.e, c }, [`The ${nm(v)} is ${SN[s]}, but it should be ${SN[ans.c[v]]}: that shade comes earlier in the list and none of its neighbours coloured before it wears it, so greedy colouring takes it.`]);
        }
        for (let u = 0; u < N; u++) {
          if (!((ansAdj[v] >> u) & 1)) continue;
          const c = ans.c.slice(); c[v] = ans.c[u];
          add('s', 'clash', { e: ans.e, c }, [`The ${nm(v)} and its neighbour, the ${nm(u)}, are both ${SN[ans.c[u]]}: linked nodes must never share a shade.`]);
        }
      }
      [[2, 0, 'the leftmost picture of this row'], [2, 1, 'the middle picture of this row'], [1, 2, 'the picture above'], [0, 2, 'the top-right picture']].forEach(([r, c, where]) => {
        const col = rows[r].c[c];
        let v = -1;
        for (let i = 0; i < N && v < 0; i++) if (col[ord[i]] !== ans.c[ord[i]]) v = ord[i];
        if (v >= 0) add('s', 'copy', { e: ans.e, c: col.slice() }, [`The shades are copied from ${where} instead of being recomputed for these links: the ${nm(v)} should be ${SN[ans.c[v]]}, not ${SN[col[v]]}.`]);
      });
      // wrong links, own greedy shades
      const edgeDiff = (mask) => {
        const out = [];
        for (let k = 0; k < NE; k++) {
          const had = (ans.e >> k) & 1, has = (mask >> k) & 1;
          if (had === has) continue;
          const ina = (A3 >> k) & 1, inb = (B3 >> k) & 1;
          if (has) out.push(`has a link between the ${lk(k)} that should not exist (it is in ${ina && inb ? 'both' : 'neither'} of the first two pictures)`);
          else out.push(`lacks the link between the ${lk(k)} (it is in exactly one of the first two pictures)`);
        }
        return out.length > 3 ? out.slice(0, 3).join('; ') + '; and more' : out.join('; ');
      };
      const dE = (mask, t, lead) => {
        if (mask === ans.e || pc(mask) < 3 || pc(mask) > 11) return;
        const c = colour(mask);
        if (c) add('d', t, { e: mask, c }, [`${lead}The picture ${edgeDiff(mask)}.`]);
      };
      dE(A3 | B3, 'or', 'Links merged with OR instead of exclusive-or. ');
      dE(A3 & B3, 'and', 'Only common links kept (AND) instead of exclusive-or. ');
      dE(A3, 'copyA', 'The links of the left picture were copied. ');
      dE(B3, 'copyB', 'The links of the middle picture were copied. ');
      dE(~(A3 ^ B3) & FULL, 'xnor', 'Links drawn where the pictures agree (XNOR). ');
      for (let k = 0; k < NE; k++) dE(ans.e ^ (1 << k), 'tog', '');
      const same = cands.filter((c) => c.g === 's'), diff = cands.filter((c) => c.g === 'd');
      const byT = (list) => { const m = {}; list.forEach((c) => { (m[c.t] = m[c.t] || []).push(c); }); return Object.values(m); };
      const sel = takeDiverse(rng, byT(same), 3).concat(takeDiverse(rng, byT(diff), 4));
      RM.need(sel.length === 7);
      const keyOf = (s) => s.e + ':' + s.c.join('');
      RM.need(new Set(sel.map((c) => keyOf(c.spec)).concat(keyOf(ans))).size === 8);

      // explanation
      const R = (v) => rk(v) + 1;
      const lst = (mask) => PAIRS.filter((_, k) => (mask >> k) & 1).map(([a, b]) => [R(a), R(b)].sort((x, y) => x - y)).sort((x, y) => x[0] - y[0] || x[1] - y[1]).map((p) => p.join('–')).join(', ');
      const steps = ord.map((v, t) => {
        const nb = ord.slice(0, t).filter((u) => (ansAdj[v] >> u) & 1);
        return `#${t + 1}: ` + (nb.length ? `touches ${nb.map((u) => `#${R(u)} (${SN[ans.c[u]]})`).join(', ')}` : 'no earlier neighbour') + ` → <b>${SN[ans.c[v]]}</b>`;
      });
      const xorM = (A3 ^ B3) | 0;
      return {
        panels: vis.map((p) => ({ e: p.e, c: p.col })),
        answer: ans,
        options: [{ spec: ans, flaws: [] }].concat(sel.map((c) => ({ spec: c.spec, flaws: c.flaws }))),
        render(s) {
          const pic = new RM.Pic();
          for (let k = 0; k < NE; k++) if ((s.e >> k) & 1) { const [i, j] = PAIRS[k]; RM.line(pic, P[i][0], P[i][1], P[j][0], P[j][1], { sw: 2.3 }); }
          for (let v = 0; v < N; v++) RM.circle(pic, P[v][0], P[v][1], 7, { fill: FILL[s.c[v]], sw: 2.2 });
          return pic.svg();
        },
        key: keyOf,
        rules: [
          { k: 'Links', t: 'In every row, the third picture has a link between two nodes only if <b>exactly one</b> of the first two pictures has it (a link present in both cancels out).' },
          { k: 'Shades', t: `The shades are not free: they are computed from the links. Nodes are coloured one at a time, <b>${DIR[on]}</b>, and each node takes the <b>first shade of the list ${plist}</b> that no already-coloured neighbour wears. (Check it on the examples: this is the only reading that explains all of them.)` },
          { k: 'Links of the missing picture', t: `Number the nodes 1–6 ${DIR[on]}. Left picture: ${lst(A3)}. Middle picture: ${lst(B3)}. Links in exactly one of them: <b>${lst(xorM)}</b>.` },
          { k: 'Colouring it', t: steps.join('; ') + '.' },
          { k: 'Result', t: `Nodes 1–6: <b>${ord.map((v) => SN[ans.c[v]]).join(', ')}</b>.` },
        ],
        hint: 'The shades of a picture follow from its links; find how the links combine, then colour the nodes one by one.',
      };
    },
  });
})();
