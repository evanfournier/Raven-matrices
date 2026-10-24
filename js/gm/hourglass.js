/* Hourglasses (grandmaster, sequence): two hourglasses (small and large, sand = unit blocks). Each panel is one time unit later:
 * one block falls in every glass that still has sand on top. A secret turn-over policy fires when a glass runs out (turn itself /
 * turn the OTHER glass / turn both), either at once or one time unit later. All 32 policies (3 actions + "nothing" per glass, now /
 * later) are simulated: those matching the 8 visible panels must all predict the same 9th panel. Options = product of two wrong
 * states per glass (balanced, so the answer is not the "most typical" picture). */
(function () {
  'use strict';
  const RM = window.RM;
  const CAPS = [[3, 5], [3, 5], [2, 5], [3, 5]];
  const ACT = ['nothing is turned', 'that glass is turned over', 'the other glass is turned over', 'both glasses are turned over'];

  RM.register({
    id: 'hourglass',
    name: 'Hourglasses',
    difficulty: 7,
    generate(rng, variant) {
      const [Ca, Cb] = CAPS[variant % 4];
      const step = (S, pol) => {
        let { ta, tb, pa, pb } = S;
        let special = false;
        if (pa) { ta = Ca - ta; pa = false; special = true; }
        if (pb) { tb = Cb - tb; pb = false; special = true; }
        const wa = ta > 0, wb = tb > 0;
        if (wa) ta--;
        if (wb) tb--;
        const ea = wa && ta === 0, eb = wb && tb === 0;
        let fa = false, fb = false;
        if (ea) { special = true; if (pol.a === 1 || pol.a === 3) fa = !fa; if (pol.a === 2 || pol.a === 3) fb = !fb; }
        if (eb) { special = true; if (pol.b === 1 || pol.b === 3) fb = !fb; if (pol.b === 2 || pol.b === 3) fa = !fa; }
        if (pol.later) { pa = fa; pb = fb; } else { if (fa) ta = Ca - ta; if (fb) tb = Cb - tb; }
        return { ta, tb, pa, pb, special, ev: (ea ? 1 : 0) + (eb ? 1 : 0) };
      };
      const run = (S1, pol) => {
        const seq = [{ ta: S1.ta, tb: S1.tb, pa: false, pb: false }];
        const sp = [];
        for (let i = 0; i < 8; i++) {
          const n = step(seq[i], pol);
          seq.push(n);
          sp.push(n);
        }
        return { seq, sp };
      };
      const pols = [];
      for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) for (let l = 0; l < 2; l++) pols.push({ a, b, later: !!l });
      const pText = (p) => `when the small glass runs out ${ACT[p.a]}; when the large glass runs out ${ACT[p.b]}; this happens ${p.later ? 'at the start of the next time unit (before the next blocks fall)' : 'at once, in the same time unit'}`;
      const later = variant % 2 === 1;
      let found = null;
      for (let t = 0; t < 400 && !found; t++) {
        const pol = { a: rng.int(1, 3), b: rng.int(1, 3), later };
        if (pol.a === 1 && pol.b === 1) continue;
        const S1 = { ta: rng.int(1, Ca), tb: rng.int(1, Cb) };
        const { seq, sp } = run(S1, pol);
        if (sp.some((s) => s.ev > 1) || !sp[7].special) continue;
        const ks = seq.map((s) => s.ta + '.' + s.tb);
        if (new Set(ks).size !== 9) continue;
        const preds = pols.map((p) => ({ p, r: run(S1, p) }));
        const ok = preds.filter((x) => x.r.seq.slice(0, 8).every((s, i) => s.ta === seq[i].ta && s.tb === seq[i].tb));
        if (!ok.every((x) => x.r.seq[8].ta === seq[8].ta && x.r.seq[8].tb === seq[8].tb)) continue;
        const naive = run(S1, { a: 1, b: 1, later: false }).seq[8];
        if (naive.ta === seq[8].ta && naive.tb === seq[8].tb) continue;
        found = { pol, S1, seq, sp, preds };
      }
      RM.need(found);
      const { pol, seq, sp, preds } = found;
      const vis = seq.slice(0, 8);
      const ans = { ta: seq[8].ta, tb: seq[8].tb };
      const mismatch = (x) => 1 + x.r.seq.findIndex((s, i) => i < 8 && (s.ta !== seq[i].ta || s.tb !== seq[i].tb));
      /* wrong states per glass, preferring those predicted by tempting wrong hypotheses */
      const wrongs = (isA) => {
        const C = isA ? Ca : Cb;
        const cor = isA ? ans.ta : ans.tb;
        const cnt = {};
        preds.forEach((x) => {
          const v = isA ? x.r.seq[8].ta : x.r.seq[8].tb;
          if (v !== cor && mismatch(x) > 0 && mismatch(x) <= 8) (cnt[v] = cnt[v] || []).push(x);
        });
        const vals = rng.shuffle(RM.range(C + 1).filter((v) => v !== cor)).sort((p, q) => (cnt[q] ? cnt[q].length : 0) - (cnt[p] ? cnt[p].length : 0));
        return vals.slice(0, 2).map((v) => ({ v, hyp: cnt[v] ? cnt[v][0] : null }));
      };
      const wa = wrongs(true), wb = wrongs(false);
      RM.need(wa.length === 2 && wb.length === 2);
      const flawFor = (isA, w, C, cor) => {
        const nm = isA ? 'small' : 'large';
        let t = `the ${nm} glass should have ${cor} block${cor === 1 ? '' : 's'} on top and ${C - cor} below, but here it has ${w.v} on top and ${C - w.v} below`;
        if (w.v === C - cor) t += ' (it is upside down)';
        if (w.hyp) t += `; this is what you would get if ${pText(w.hyp.p)}, but panel ${mismatch(w.hyp)} already contradicts that`;
        return t;
      };
      const combos = [];
      [null, wa[0], wa[1]].forEach((x, i) => [null, wb[0], wb[1]].forEach((y, j) => { if (i || j) combos.push([x, y]); }));
      const picked = rng.shuffle(combos).slice(0, 7);
      const options = [{ spec: ans, flaws: [] }].concat(picked.map(([x, y]) => ({
        spec: { ta: x ? x.v : ans.ta, tb: y ? y.v : ans.tb },
        flaws: (x ? [flawFor(true, x, Ca, ans.ta)] : []).concat(y ? [flawFor(false, y, Cb, ans.tb)] : []),
      })));

      const bs = 7, f = 4, W = 15;
      const drawGlass = (pic, cx, C, top) => {
        const H = 2 * (C * bs + f);
        const y0 = 92 - H;
        const ym = y0 + C * bs + f;
        const pts = [[cx - W / 2, y0], [cx + W / 2, y0], [cx + W / 2, y0 + C * bs], [cx + 1.6, ym], [cx + W / 2, ym + f], [cx + W / 2, 92], [cx - W / 2, 92], [cx - W / 2, ym + f], [cx - 1.6, ym], [cx - W / 2, y0 + C * bs]];
        for (let i = 0; i < top; i++) pic.add(`<rect x="${RM.fmt(cx - 5)}" y="${RM.fmt(y0 + C * bs - (i + 1) * bs + 0.9)}" width="10" height="${bs - 1.8}" fill="${RM.INK}"/>`);
        for (let i = 0; i < C - top; i++) pic.add(`<rect x="${RM.fmt(cx - 5)}" y="${RM.fmt(92 - (i + 1) * bs + 0.9)}" width="10" height="${bs - 1.8}" fill="${RM.INK}"/>`);
        RM.polygon(pic, pts, { fill: 'none', sw: 2 });
        RM.line(pic, cx - W / 2 - 2, y0, cx + W / 2 + 2, y0, { sw: 2.6, cap: 'butt' });
        RM.line(pic, cx - W / 2 - 2, 92, cx + W / 2 + 2, 92, { sw: 2.6, cap: 'butt' });
      };
      const render = (s) => {
        const pic = new RM.Pic();
        drawGlass(pic, 30, Ca, s.ta);
        drawGlass(pic, 70, Cb, s.tb);
        return pic.svg();
      };

      const st = (s) => `small ${s.ta}/${Ca - s.ta}, large ${s.tb}/${Cb - s.tb}`;
      const rules = [
        { k: 'Time', t: `each panel is <b>one time unit later</b> (read the 9 panels in order). In every time unit one block falls from the top bulb to the bottom bulb of each glass that still has blocks on top. The small glass holds ${Ca} blocks, the large one ${Cb}.` },
        { k: 'Turning', t: `a glass that has just run out of blocks on top triggers a turn-over: <b>${pText(pol)}</b>. Turning a glass swaps its top and bottom blocks.` },
        { k: 'Evidence', t: `panels 1–8 (top/bottom blocks): ${vis.map((s, i) => `${i + 1}: ${st(s)}`).join('; ')}. The turn-overs seen there rule out the other readings (turning only itself, turning both, delayed or immediate).` },
        { k: 'Answer', t: `from panel 8 (${st(vis[7])}) one more time unit gives <b>${st(seq[8])}</b>.` },
      ];
      return {
        difficulty: 7,
        hint: 'watch what is turned over, and when, each time a glass runs out of sand.',
        reading: 'sequence',
        panels: vis.map((s) => ({ ta: s.ta, tb: s.tb })),
        answer: ans,
        options,
        render,
        key: (s) => s.ta + '.' + s.tb,
        rules,
      };
    },
  });
})();
