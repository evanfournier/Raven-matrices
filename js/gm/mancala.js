/* Mancala (grandmaster): a ring of 8 pits drawn as 2 rows of 4, seeds = dots. Each column is one move: all seeds are
 * taken from one pit and sown one per pit along the ring (v0: pit with the MOST seeds, counter-clockwise, starting
 * with the next pit; v1: pit with the FEWEST seeds (not empty), clockwise; v2: most seeds, counter-clockwise, the
 * first seed goes back into the emptied pit; v3: most seeds, clockwise, first seed back into the emptied pit).
 * Panel 2 = 1 move, panel 3 = 2 moves. The generator avoids ties and laps, and checks 12 x 6 x 2 readings (pit choice:
 * most / fewest / second most / relay from the last pit / fixed pit; six orders of the pits; sowing from the next or
 * the same pit) against the visible moves: all readings that fit must predict the same last panel. */
(function () {
  'use strict';
  const RM = window.RM;
  /* sowing orders as grid indices (g = row*4 + col, row 0 = top) */
  const CCW = [4, 5, 6, 7, 3, 2, 1, 0];
  const ORD = {
    ccw: CCW,
    cw: CCW.slice().reverse(),
    row: [0, 1, 2, 3, 4, 5, 6, 7],
    rowr: [7, 6, 5, 4, 3, 2, 1, 0],
    col: [0, 4, 1, 5, 2, 6, 3, 7],
    colr: [7, 3, 6, 2, 5, 1, 4, 0],
  };
  const CFG = [
    { pit: 'most', ord: 'ccw', start: 'next', diff: 7 },
    { pit: 'fewest', ord: 'cw', start: 'next', diff: 7 },
    { pit: 'most', ord: 'ccw', start: 'same', diff: 8 },
    { pit: 'most', ord: 'cw', start: 'same', diff: 8 },
  ];
  const pn = (g) => `${g < 4 ? 'top' : 'bottom'} row, pit ${(g % 4) + 1}`;
  const OPP = { ccw: 'cw', cw: 'ccw' };
  const DIRW = { ccw: 'counter-clockwise', cw: 'clockwise' };

  /* the 8-slot ring layouts of seeds in a pit */
  const LAY = (() => {
    const ring = (n, r, centre) => {
      const a = [];
      for (let i = 0; i < n; i++) a.push([r * Math.cos((2 * Math.PI * i) / n - Math.PI / 2), r * Math.sin((2 * Math.PI * i) / n - Math.PI / 2)]);
      if (centre) a.push([0, 0]);
      return a;
    };
    return [
      [],
      [[0, 0]],
      [[-3.4, -3.4], [3.4, 3.4]],
      [[-4.4, -4.4], [0, 0], [4.4, 4.4]],
      [[-3.6, -3.6], [3.6, -3.6], [-3.6, 3.6], [3.6, 3.6]],
      [[-4.2, -4.2], [4.2, -4.2], [-4.2, 4.2], [4.2, 4.2], [0, 0]],
      ring(6, 5.2),
      ring(6, 5.4, true),
      ring(8, 6.3),
      ring(8, 6.3, true),
    ];
  })();

  /* a state = { c: counts by grid index, last: pit where the last seed fell (or -1) } */
  function choices(H, st) {
    const c = st.c;
    const ne = [];
    for (let g = 0; g < 8; g++) if (c[g] > 0) ne.push(g);
    if (!ne.length) return [];
    const mx = Math.max(...ne.map((g) => c[g]));
    const mn = Math.min(...ne.map((g) => c[g]));
    if (H.pit === 'most') return ne.filter((g) => c[g] === mx);
    if (H.pit === 'fewest') return ne.filter((g) => c[g] === mn);
    if (H.pit === 'second') {
      const rest = ne.filter((g) => c[g] < mx);
      if (!rest.length) return [];
      const m2 = Math.max(...rest.map((g) => c[g]));
      return rest.filter((g) => c[g] === m2);
    }
    if (H.pit === 'relay') return st.last < 0 ? ne.filter((g) => c[g] === mx) : c[st.last] > 0 ? [st.last] : [];
    return c[H.pit] > 0 ? [H.pit] : []; // fixed pit
  }
  function sow(H, st, pit) {
    const o = ORD[H.ord];
    const c = st.c.slice();
    const n = c[pit];
    c[pit] = 0;
    const i0 = o.indexOf(pit) + (H.start === 'same' ? 0 : 1) + (H.skip || 0);
    let last = pit;
    let k = 0;
    let j = 0;
    while (k < n) {
      const g = o[(i0 + j + (H.jump && k === n - 1 ? 1 : 0)) % 8];
      j++;
      if (H.skipEmpty && c[g] === 0 && g !== pit) continue;
      c[g]++;
      last = g;
      k++;
      if (j > 40) break;
    }
    return { c, last };
  }
  const moves = (H, st) => choices(H, st).map((p) => sow(H, st, p));
  const eqc = (a, b) => a.c.every((v, i) => v === b.c[i]);

  RM.register({
    id: 'mancala',
    name: 'Mancala',
    difficulty: 7,
    generate(rng, variant) {
      const cfg = CFG[variant % 4];
      const H = { pit: cfg.pit, ord: cfg.ord, start: cfg.start };
      const unique = (st) => choices(H, st).length === 1;
      const maxSeeds = 7;

      const genRow = () => {
        for (let t = 0; t < 300; t++) {
          const c = RM.range(8).map(() => rng.int(0, 6));
          const tot = c.reduce((a, b) => a + b, 0);
          if (tot < 14 || tot > 19) continue;
          let st = { c, last: -1 };
          const S = [st];
          let ok = true;
          for (let m = 0; m < 2 && ok; m++) {
            if (!unique(st)) { ok = false; break; }
            const p = choices(H, st)[0];
            if (st.c[p] < (H.pit === 'most' ? 3 : 1) || st.c[p] > maxSeeds) { ok = false; break; }
            st = sow(H, st, p);
            S.push(st);
          }
          if (!ok || S[1].c.join() === S[0].c.join() || S[2].c.join() === S[1].c.join() || S[2].c.join() === S[0].c.join()) continue;
          if (S.some((s) => Math.max(...s.c) > maxSeeds + 1)) continue;
          if (H.pit !== 'most' && S[0].c.reduce((a, v, i) => a + Math.abs(v - S[2].c[i]), 0) < 8) continue;
          return S;
        }
        throw RM.RETRY;
      };
      const rows = [genRow(), genRow(), genRow()];
      RM.need(new Set(rows.map((r) => r[0].c.join())).size === 3);
      const ans = rows[2][2];
      const vis = [];
      rows.forEach((r, i) => r.forEach((s, j) => { if (i < 2 || j < 2) vis.push(s); }));
      RM.need(vis.every((s) => !eqc(s, ans)));

      /* identifiability */
      const HS = [];
      const pits = ['most', 'fewest', 'second', 'relay'].concat(RM.range(8));
      pits.forEach((pit) => Object.keys(ORD).forEach((ord) => ['next', 'same'].forEach((start) => HS.push({ pit, ord, start }))));
      let intended = false;
      for (const h of HS) {
        let ok = true;
        for (let r = 0; r < 2 && ok; r++) {
          let cur = [rows[r][0]];
          for (let m = 1; m <= 2 && cur.length; m++) {
            const nx = [];
            cur.forEach((s) => moves(h, s).forEach((x) => { if (eqc(x, rows[r][m])) nx.push(x); }));
            cur = nx;
          }
          if (!cur.length) ok = false;
        }
        if (!ok) continue;
        const f = moves(h, rows[2][0]).filter((x) => eqc(x, rows[2][1]));
        if (!f.length) continue;
        if (h.pit === H.pit && h.ord === H.ord && h.start === H.start) intended = true;
        f.forEach((s) => moves(h, s).forEach((x) => RM.need(eqc(x, ans))));
        RM.need(f.every((s) => moves(h, s).length > 0));
      }
      RM.need(intended);

      /* distractors: one or two wrong rules / slips, all conserving the seeds, applied to the panel before the answer */
      const s1 = rows[2][1];
      const pitTxt = {
        fewest: (p) => `the seeds were taken from the pit with the <i>fewest</i> seeds (${pn(p)})`,
        most: (p) => `the seeds were taken from the pit with the <i>most</i> seeds (${pn(p)})`,
        second: (p) => `the seeds were taken from the pit with the second-most seeds (${pn(p)})`,
        relay: (p) => `the seeds were taken from the pit where the last seed fell (${pn(p)})`,
      };
      const goal = pn(choices(H, s1)[0]);
      const right = H.pit === 'most' ? `the pit with the most seeds (${goal})` : `the pit with the fewest seeds (${goal})`;
      const oth = H.start === 'next' ? 'same' : 'next';
      const P = ['fewest', 'second', 'relay', 'most'].filter((q) => q !== H.pit).map((q) => ({ h: { pit: q }, tx: (pit) => `${pitTxt[q](pit)}, but the rule takes ${right}` }));
      const O = [
        { h: { ord: OPP[H.ord] }, tx: () => `the seeds were sown ${DIRW[OPP[H.ord]]}, but they travel ${DIRW[H.ord]}` },
        { h: { ord: 'row' }, tx: () => 'the seeds were sown along the rows in reading order instead of around the ring' },
        { h: { ord: 'col' }, tx: () => 'the seeds were sown column by column instead of around the ring' },
      ];
      const S = [{ h: { start: oth }, tx: () => (H.start === 'next' ? 'the first seed was dropped back into the emptied pit, but sowing starts in the next pit' : 'the first seed went into the pit after the emptied one, but the first seed goes back into the emptied pit itself') }];
      const X = [
        { h: { skip: 1 }, tx: () => 'one pit was skipped at the start of the sowing' },
        { h: { jump: true }, tx: () => 'the last seed jumped over a pit, but the seeds go into consecutive pits' },
        { h: { skipEmpty: true }, tx: () => 'empty pits were skipped while sowing, but every pit on the way receives a seed' },
      ];
      const combos = [].concat(P.map((a) => [a]), O.map((a) => [a]), S.map((a) => [a]), X.map((a) => [a]));
      P.forEach((a) => O.slice(0, 1).concat(S).forEach((b) => combos.push([a, b])));
      O.forEach((a) => S.forEach((b) => combos.push([a, b])));
      const cand = new Map();
      const addC = (st, flaw, tier) => {
        if (eqc(st, ans)) return;
        const k = st.c.join();
        if (!cand.has(k)) cand.set(k, { c: st.c, flaws: [], tier });
        const x = cand.get(k);
        if (!x.flaws.includes(flaw)) x.flaws.push(flaw);
      };
      combos.forEach((cb) => {
        const h = Object.assign({}, H);
        cb.forEach((d) => Object.assign(h, d.h));
        choices(h, s1).forEach((pit) => addC(sow(h, s1, pit), cb.map((d) => d.tx(pit)).join('; '), 1));
      });
      addC(s1, 'no move was made: this is the previous panel; one move is played between two panels', 2);
      const list = Array.from(cand.values()).filter((x) => x.c.every((v) => v >= 0));
      RM.need(list.length >= 7);
      let chosen = null;
      for (let t = 0; t < 40 && !chosen; t++) {
        const pick = rng.sample(list, 7);
        const all = [ans.c].concat(pick.map((x) => x.c));
        const cnt = RM.range(8).map(() => ({}));
        all.forEach((o) => o.forEach((v, p) => (cnt[p][v] = (cnt[p][v] || 0) + 1)));
        const sc = all.map((o) => o.reduce((a, v, p) => a + cnt[p][v], 0));
        if (Math.max(...sc.slice(1)) >= sc[0] && pick.filter((x) => x.tier === 1).length >= 5) chosen = pick;
      }
      RM.need(chosen);

      /* drawing */
      const render = (sp) => {
        const pic = new RM.Pic();
        pic.add(`<rect x="3" y="12" width="94" height="76" rx="16" fill="${pic.paint('faint')}" stroke="${RM.LIGHT}" stroke-width="1.5"/>`);
        sp.c.forEach((n, g) => {
          const x = 14 + 24 * (g % 4);
          const y = g < 4 ? 33 : 67;
          RM.circle(pic, x, y, 10.8, { fill: 'white', sw: 1.9 });
          (LAY[Math.min(n, 9)] || []).forEach((d) => RM.circle(pic, x + d[0], y + d[1], 1.95, { fill: 'black', sw: 0.3 }));
        });
        return pic.svg();
      };
      const key = (sp) => sp.c.join(',');

      /* correction */
      const sd = (n) => (n === 1 ? '1 seed' : n + ' seeds');
      const show = (c) => `top row ${c.slice(0, 4).join(' ')} / bottom row ${c.slice(4).join(' ')}`;
      const pit1 = choices(H, s1)[0];
      const n1 = s1.c[pit1];
      const o = ORD[H.ord];
      const i0 = o.indexOf(pit1) + (H.start === 'same' ? 0 : 1);
      const tgt = RM.range(n1).map((k) => o[(i0 + k) % 8]);
      const ex = rows[0];
      const ep = choices(H, ex[0])[0];
      const ei = o.indexOf(ep) + (H.start === 'same' ? 0 : 1);
      const rules = [
        { k: 'Ring', t: `the 8 pits form a <b>ring</b> and the seeds travel <b>${DIRW[H.ord]}</b>: ${H.ord === 'ccw' ? 'along the bottom row to the right, up on the right, along the top row to the left, down on the left' : 'along the top row to the right, down on the right, along the bottom row to the left, up on the left'}. The dots are the seeds.` },
        {
          k: 'A move',
          t: `take <b>all</b> the seeds of the pit with the <b>${H.pit === 'most' ? 'most' : 'fewest (but at least one)'}</b> seeds (it is never a tie) and sow them <b>one per pit</b> ${H.start === 'next' ? 'into the pits that follow it' : 'starting in the <b>same</b> pit — the first seed goes back into the emptied pit — and continuing into the pits that follow'}. Example, row 1: the ${sd(ex[0].c[ep])} of ${pn(ep)} are sown ${H.start === 'next' ? 'from the next pit on' : 'beginning with that pit'}, ending in ${pn(o[(ei + ex[0].c[ep] - 1) % 8])}.`,
        },
        { k: 'Panels', t: 'panel 2 shows the position after <b>1 move</b> from panel 1, panel 3 after a second move.' },
        { k: 'Row 3', t: `position of panel 2: ${show(s1.c)}. The pit with the ${H.pit === 'most' ? 'most' : 'fewest'} seeds is the ${pn(pit1)} (${n1}). Empty it and sow its ${sd(n1)} ${H.start === 'next' ? 'into the next' : 'starting with itself into the'} ${n1} pits: ${tgt.map(pn).join('; ')}.` },
        { k: 'Answer', t: `<b>${show(ans.c)}</b> (check: the total number of seeds does not change).` },
      ];
      return {
        difficulty: cfg.diff,
        hint: 'the seeds are only moved, never added or removed — find which pit is emptied and where its seeds go.',
        panels: vis.map((s) => ({ c: s.c })),
        answer: { c: ans.c },
        options: [{ spec: { c: ans.c }, flaws: [] }].concat(chosen.map((x) => ({ spec: { c: x.c }, flaws: x.flaws.slice(0, 2) }))),
        render,
        key,
        rules,
      };
    },
  });
})();
