/* Gridlock (grandmaster): cars (2-cell, pointed front) advance one cell per step in a hidden priority order by fill; a car moves only if the cell ahead is free (no building, no car, inside the grid). Columns are 2 steps apart (variants change steps / edge rule). */
(function () {
  'use strict';
  const RM = window.RM;
  const N = 6, CS = 13, OX = 11;
  const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
  const FILL = ['black', 'white', 'hatch', 'dots'];
  const FNAME = ['black', 'white', 'hatched', 'dotted'];
  const DNAME = ['right', 'down', 'left', 'up'];
  const PERMS = [];
  (function p(a, rest) { if (!rest.length) { PERMS.push(a); return; } rest.forEach((x, i) => p(a.concat(x), rest.filter((_, j) => j !== i))); })([], [0, 1, 2, 3]);

  const inb = (r, c) => r >= 0 && c >= 0 && r < N && c < N;
  const norm = (cars) => cars.map((x) => x.slice()).sort((a, b) => a[0] - b[0]);
  const skey = (s) => JSON.stringify([s.b, norm(s.c)]);
  function cells(car) { return [[car[1], car[2]], [car[1] - DY[car[3]], car[2] - DX[car[3]]]]; }

  /* perm = order of fills (first moves first). mode 'seq' | 'sim'. */
  function step(st, perm, mode, edge, log) {
    const bset = new Set(st.b);
    let cars = st.c.map((x) => x.slice());
    const occ0 = new Set();
    cars.forEach((c) => cells(c).forEach(([r, q]) => occ0.add(r * N + q)));
    const claimed = new Set();
    const out = [];
    for (const f of perm) {
      const c = cars.find((x) => x[0] === f);
      if (!c) continue;
      const nr = c[1] + DY[c[3]], nc = c[2] + DX[c[3]];
      let why = null, leave = false;
      if (!inb(nr, nc)) { if (edge === 'leave') leave = true; else why = 'the edge of the grid'; }
      else if (bset.has(nr * N + nc)) why = 'a building';
      else {
        const occ = new Set();
        (mode === 'seq' ? cars.concat(out.filter(() => false)) : []).forEach(() => 0);
        if (mode === 'seq') cars.forEach((o) => { if (o !== c) cells(o).forEach(([r, q]) => occ.add(r * N + q)); });
        else { occ0.forEach((v) => occ.add(v)); cells(c).forEach(([r, q]) => occ.delete(r * N + q)); claimed.forEach((v) => occ.add(v)); }
        if (occ.has(nr * N + nc)) why = 'another car';
      }
      if (why) { if (log) log.push(FNAME[f] + ' car is blocked by ' + why); continue; }
      if (leave) { cars = cars.filter((x) => x !== c); if (log) log.push(FNAME[f] + ' car drives off the grid'); continue; }
      c[1] = nr; c[2] = nc; claimed.add(nr * N + nc);
      if (log) log.push(FNAME[f] + ' car moves ' + DNAME[c[3]]);
    }
    return { b: st.b, c: cars };
  }
  function run(st, k, perm, mode, edge, logs) {
    for (let i = 0; i < k; i++) { const l = logs ? [] : null; st = step(st, perm, mode, edge, l); if (logs) logs.push(l); }
    return st;
  }

  function randRow(rng) {
    const all = RM.range(N * N);
    const b = rng.sample(all, rng.int(3, 5)).sort((x, y) => x - y);
    const bs = new Set(b);
    const used = new Set(b);
    const c = [];
    for (let f = 0; f < 4; f++) {
      let ok = false;
      for (let t = 0; t < 30 && !ok; t++) {
        const d = rng.int(0, 3), r = rng.int(0, N - 1), q = rng.int(0, N - 1);
        const car = [f, r, q, d];
        const cl = cells(car);
        if (!cl.every(([a, z]) => inb(a, z) && !used.has(a * N + z))) continue;
        cl.forEach(([a, z]) => used.add(a * N + z));
        c.push(car); ok = true;
      }
      if (!ok) return null;
    }
    return { b, c };
  }

  RM.register({
    id: 'traffic-jam',
    name: 'Gridlock',
    difficulty: 7,
    generate(rng, variant) {
      const K = [2, 1, 2, 3][variant];
      const edge = variant === 2 ? 'leave' : 'blocked';
      const perm = rng.shuffle([0, 1, 2, 3]);
      const rows = [];
      for (let r = 0; r < 3; r++) {
        let row = null;
        for (let t = 0; t < 3000 && !row; t++) {
          const s0 = randRow(rng);
          if (!s0) continue;
          const s1 = run(s0, K, perm, 'seq', edge), s2 = run(s1, K, perm, 'seq', edge);
          if (skey(s0) === skey(s1) || skey(s1) === skey(s2)) continue;
          if (norm(s0.c).filter((x, i) => { const y = norm(s2.c).find((z) => z[0] === x[0]); return !y || y[1] !== x[1] || y[2] !== x[2]; }).length < 3) continue;
          if (s2.c.length < 3) continue;
          if (skey(run(s0, 2 * K, perm, 'sim', edge)) === skey(s2)) continue;
          let sens = 0;
          for (let i = 0; i < 3; i++) { const p = perm.slice(); p[i] = perm[i + 1]; p[i + 1] = perm[i]; if (skey(run(s0, 2 * K, p, 'seq', edge)) !== skey(s2)) sens++; }
          if (sens < 1) continue;
          row = [s0, s1, s2];
        }
        RM.need(row);
        rows.push(row);
      }
      if (edge === 'leave') RM.need(rows.some((r) => r[2].c.length < 4));
      const [R1, R2, R3] = rows;
      const ans = R3[2];
      /* priority must matter in row 3 and in rows 1-2 */
      const adj = [0, 1, 2].map((i) => { const p = perm.slice(); p[i] = perm[i + 1]; p[i + 1] = perm[i]; return p; });
      RM.need(adj.some((p) => skey(run(R3[1], K, p, 'seq', edge)) !== skey(ans)));
      const witness = [];
      adj.forEach((p, i) => {
        for (let r = 0; r < 2; r++) if (skey(run(rows[r][0], 2 * K, p, 'seq', edge)) !== skey(rows[r][2])) { witness.push([i, r]); break; }
      });
      RM.need(witness.length >= 1);
      /* hypotheses */
      const hyps = [];
      PERMS.forEach((p) => ['seq', 'sim'].forEach((m) => [1, 2, 3].forEach((k) => ['blocked', 'leave'].forEach((e) => hyps.push({ p, m, k, e })))));
      const good = [];
      const wrong = new Map();
      hyps.forEach((h) => {
        const okRow = (R, full) => skey(run(R[0], h.k, h.p, h.m, h.e)) === skey(R[1]) && (!full || skey(run(R[1], h.k, h.p, h.m, h.e)) === skey(R[2]));
        const cons = okRow(R1, true) && okRow(R2, true) && okRow(R3, false);
        const pred = run(R3[1], h.k, h.p, h.m, h.e);
        if (cons) { RM.need(skey(pred) === skey(ans)); good.push(h); }
        else { const k = skey(pred); if (k !== skey(ans) && !wrong.has(k)) wrong.set(k, { st: pred, h }); }
      });
      RM.need(good.length >= 1);
      /* distractors */
      const cand = new Map();
      const add = (st, flaw) => { const k = skey(st); if (k === skey(ans) || cand.has(k)) return; cand.set(k, { spec: { b: st.b, c: norm(st.c) }, flaws: [flaw] }); };
      const orderName = (p) => p.map((f) => FNAME[f]).join(' > ');
      wrong.forEach(({ st, h }) => {
        const fl = [];
        if (h.p.join() !== perm.join()) fl.push('this follows a different priority order (' + orderName(h.p) + ') instead of ' + orderName(perm));
        if (h.m === 'sim') fl.push('this lets all cars decide at the same time on the old picture, but a car must wait for the cars that go before it to move first');
        if (h.k !== K) fl.push('this shows ' + h.k + ' step(s) per column, but each column is ' + K + ' step(s) later');
        if (h.e !== edge) fl.push(edge === 'leave' ? 'cars at the edge leave the grid and disappear here; this option kept one blocked there' : 'cars never leave the grid; this option made a car disappear');
        add(st, fl.join('; '));
      });
      const pre = R3[1];
      norm(ans.c).forEach((car, i) => {
        const o = pre.c.find((x) => x[0] === car[0]);
        if (o && (o[1] !== car[1] || o[2] !== car[2])) {
          add({ b: ans.b, c: ans.c.map((x) => x[0] === car[0] ? o.slice() : x) }, 'the ' + FNAME[car[0]] + ' car should have moved, nothing blocks it');
        }
        const nr = car[1] + DY[car[3]], nc = car[2] + DX[car[3]];
        if (inb(nr, nc)) {
          const nc2 = ans.c.map((x) => x[0] === car[0] ? [x[0], nr, nc, x[3]] : x);
          const ov = new Set(); let bad = false;
          nc2.forEach((x) => cells(x).forEach(([a, z]) => { if (!inb(a, z) || ov.has(a * N + z)) bad = true; ov.add(a * N + z); }));
          if (!bad) add({ b: ans.b, c: nc2 }, 'the ' + FNAME[car[0]] + ' car is one cell too far: it ' + (ans.b.some((v) => v === nr * N + nc) ? 'drove into a building' : 'went beyond the steps it is allowed (it was blocked or out of steps)'));
        }
      });
      const score = (s) => { const m = new Map(ans.c.map((x) => [x[0], x.join()])); return s.spec.c.filter((x) => m.get(x[0]) !== x.join()).length + (s.spec.c.length !== ans.c.length ? 1 : 0); };
      const list = rng.shuffle([...cand.values()]).sort((a, b) => score(a) - score(b));
      RM.need(list.length >= 7);
      const options = list.slice(0, 7);
      options.push({ spec: { b: ans.b, c: norm(ans.c) }, flaws: [] });

      /* rules */
      const trace = [];
      run(R3[1], K, perm, 'seq', edge, trace);
      const tr = trace.map((l, i) => 'Step ' + (i + 1) + ': ' + (l.length ? l.join('; ') : 'nothing moves') + '.').join('<br>');
      const wit = witness.slice(0, 2).map(([i, r]) => 'row ' + (r + 1) + ' (the ' + FNAME[perm[i]] + ' car must go before the ' + FNAME[perm[i + 1]] + ' car)').join(' and ');
      const rules = [
        { k: 'Cars drive', t: 'Each car is two cells long and its pointed end is its front. It never turns. Between two panels of a row, ' + K + ' step' + (K > 1 ? 's' : '') + ' pass. In one step each car tries to advance one cell.' },
        { k: 'Blocking', t: 'A car advances only if the cell in front of its nose is free: no building, no other car' + (edge === 'leave' ? '. A car whose nose would leave the grid drives off and disappears.' : ', and inside the grid. Cars never leave the grid.') + ' A blocked car stays put for that step. Buildings stay the same within a row.' },
        { k: 'Priority', t: 'Cars move one after the other, always in the same hidden order given by their fill: <b>' + orderName(perm) + '</b>. A later car sees where earlier cars already are, so it may enter a cell just vacated. This is revealed by ' + wit + '.' },
        { k: 'Row 3', t: 'Start from the middle panel of row 3 and apply ' + K + ' step' + (K > 1 ? 's' : '') + ':<br>' + tr + '<br>The result is the <b>missing panel</b>.' },
      ];
      return {
        panels: [R1[0], R1[1], R1[2], R2[0], R2[1], R2[2], R3[0], R3[1]].map((s) => ({ b: s.b, c: norm(s.c) })),
        answer: { b: ans.b, c: norm(ans.c) },
        options,
        render(s) {
          const pic = new RM.Pic();
          for (let i = 0; i <= N; i++) {
            RM.line(pic, OX + i * CS, OX, OX + i * CS, OX + N * CS, { sw: 0.8, color: RM.LIGHT });
            RM.line(pic, OX, OX + i * CS, OX + N * CS, OX + i * CS, { sw: 0.8, color: RM.LIGHT });
          }
          s.b.forEach((v) => {
            const x = OX + (v % N) * CS, y = OX + Math.floor(v / N) * CS;
            RM.polygon(pic, [[x, y], [x + CS, y], [x + CS, y + CS], [x, y + CS]], { fill: 'gray', sw: 1.2 });
          });
          s.c.forEach((car) => {
            const [f, r, c, d] = car;
            const u = [DX[d], DY[d]], v = [-DY[d], DX[d]];
            const hx = OX + (c + 0.5) * CS, hy = OX + (r + 0.5) * CS;
            const mx = hx - u[0] * CS / 2, my = hy - u[1] * CS / 2;
            const h = 4.8, L = 11.5;
            const P = (a, b) => [mx + u[0] * a + v[0] * b, my + u[1] * a + v[1] * b];
            RM.polygon(pic, [P(-L, -h + 1), P(-L + 1, -h), P(L - 6, -h), P(L, 0), P(L - 6, h), P(-L + 1, h), P(-L, h - 1)], { fill: FILL[f], sw: 1.7 });
          });
          return pic.svg();
        },
        key: skey,
        rules,
        hint: 'Some drivers always go first.',
        difficulty: variant === 1 ? 6 : variant === 3 ? 8 : 7,
      };
    },
  });
})();
