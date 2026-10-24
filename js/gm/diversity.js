/* Variety (grandmaster): every panel is a scatter of 4-7 shapes in several shades. The rules only concern META
 * attributes, never what the shapes are: the number of DIFFERENT shapes is the same in every panel of a row (a different
 * number per row), the number of DIFFERENT shades grows by one along each row, and the TOTAL number of shapes is a Latin
 * square (each total once per row and column). Checked: the three meta grids each have a unique listed reading
 * (RM.needUnique), and none of the raw counts (each shape, each shade, distinct shape+shade pairs, highest repeat)
 * follows a listed rule that predicts something other than what the answer panel contains. */
(function () {
  'use strict';
  const RM = window.RM;

  const SHP = ['circle', 'square', 'triangle', 'cross', 'star5'];
  const FIL = ['white', 'gray', 'black', 'hatch'];
  const FN = { white: 'white', gray: 'grey', black: 'black', hatch: 'hatched' };
  const POS = [22, 50, 78];

  RM.register({
    id: 'diversity',
    name: 'Variety',
    difficulty: 8,
    generate(rng, variant) {
      const lo = rng.pick([4, 5]);
      const vals = [lo, lo + 1, lo + 2];
      const N = RM.latinGrid(rng, vals);
      const dR = rng.sample([1, 2, 3, 4], 3);
      const s0 = rng.int(1, 2);
      const sR = [s0, 3 - s0, rng.int(1, 2)];
      
      const DS = RM.grid3((r) => dR[r]);
      const DF = RM.grid3((r, c) => sR[r] + c);
      RM.need(RM.grid3((r, c) => N[r][c] >= Math.max(DS[r][c], DF[r][c])).flat().every((x) => x));
      RM.needUnique(N, N[2][2], 'categorical');
      RM.needUnique(DS, DS[2][2], 'numeric');
      RM.needUnique(DF, DF[2][2], 'numeric');
      const n3 = N[2][2];
      const d3 = DS[2][2];
      const f3 = DF[2][2];

      const mix = (arr, n) => {
        const base = arr.slice();
        while (base.length < n) base.push(rng.pick(arr));
        return rng.shuffle(base);
      };
      const compose = (n, ds, df) => {
        const sh = mix(rng.sample(SHP, ds), n);
        const fl = mix(rng.sample(FIL, df), n);
        const cells = rng.sample([0, 1, 2, 3, 4, 5, 6, 7, 8], n).sort((a, b) => a - b);
        return { it: cells.map((p, i) => ({ s: sh[i], f: fl[i], p })) };
      };
      const FNS = [];
      SHP.forEach((s) => FNS.push((pn) => pn.it.filter((i) => i.s === s).length));
      FIL.forEach((f) => FNS.push((pn) => pn.it.filter((i) => i.f === f).length));
      FNS.push((pn) => new Set(pn.it.map((i) => i.s + i.f)).size);
      FNS.push((pn) => {
        const m = {};
        pn.it.forEach((i) => (m[i.s + i.f] = (m[i.s + i.f] || 0) + 1));
        return Math.max(...Object.values(m));
      });

      let vis = null;
      let ans = null;
      for (let tr = 0; tr < 40 && !ans; tr++) {
        const gr = [];
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (r < 2 || c < 2) gr.push(compose(N[r][c], DS[r][c], DF[r][c]));
        const req = [];
        let ok = true;
        for (let k = 0; ok && k < FNS.length; k++) {
          const m = RM.grid3((r, c) => (r === 2 && c === 2 ? undefined : FNS[k](gr[r * 3 + c])));
          const P = RM.preds.numeric(m);
          if (!P.length) continue;
          if (new Set(P.map((x) => x[1])).size === 1) req.push([k, P[0][1]]);
        }
        if (!ok) continue;
        for (let tj = 0; tj < 200 && !ans; tj++) {
          const a = compose(n3, d3, f3);
          if (req.every((q) => FNS[q[0]](a) === q[1])) {
            ans = a;
            vis = gr;
          }
        }
      }
      RM.need(ans);

      /* distractors: (total, different shapes, different shades) */
      const pool = [];
      const tN = new Set([lo, lo + 1, lo + 2, n3 - 1, n3 + 1]);
      const tD = new Set([dR[0], dR[1], dR[2], d3 - 1, d3 + 1]);
      const tF = new Set([DF[2][1], DF[2][0], f3 - 1, f3 + 1]);
      for (let n = 3; n <= 8; n++)
        for (let ds = 1; ds <= 5; ds++)
          for (let df = 1; df <= 4; df++) {
            if (ds > n || df > n || (n === n3 && ds === d3 && df === f3)) continue;
            const wrong = (n !== n3) + (ds !== d3) + (df !== f3);
            if (wrong > 2) continue;
            const sc = (n !== n3 && tN.has(n) ? 1 : 0) + (ds !== d3 && tD.has(ds) ? 1 : 0) + (df !== f3 && tF.has(df) ? 1 : 0) + (wrong === 1 ? 1 : 0) + rng.next() * 1.2;
            pool.push({ n, ds, df, wrong, sc });
          }
      pool.sort((a, b) => b.sc - a.sc);
      const chosen = [];
      const take = (f, k) => {
        for (const x of pool) if (k > 0 && !chosen.includes(x) && f(x)) (chosen.push(x), k--);
      };
      take((x) => x.wrong === 1 && x.n !== n3, 2);
      take((x) => x.wrong === 1 && x.ds !== d3, 2);
      take((x) => x.wrong === 1 && x.df !== f3, 2);
      take((x) => x.wrong === 2, 1);
      take(() => true, 7 - chosen.length);
      RM.need(chosen.length === 7);
      const pl = (k, w) => `${k} ${w}${k === 1 ? '' : 's'}`;
      const flawsOf = (x) => {
        const fl = [];
        if (x.n !== n3) fl.push(`it has ${x.n} shapes, but the totals form a Latin square and the last panel must have ${n3}`);
        if (x.ds !== d3) fl.push(`it has ${pl(x.ds, 'different shape')}, but every panel of row 3 has ${d3}`);
        if (x.df !== f3) fl.push(`it has ${pl(x.df, 'different shade')}, but row 3 goes ${DF[2][0]}, ${DF[2][1]}, so the third panel must have ${f3}`);
        return fl;
      };
      const options = [{ spec: ans, flaws: [] }].concat(chosen.map((x) => ({ spec: compose(x.n, x.ds, x.df), flaws: flawsOf(x) })));

      const row = (G, r) => G[r].map((v) => v).join(', ');
      const rules = [
        { k: 'Different shapes', t: `count how many <b>different kinds</b> of shape a panel contains (not how many shapes): it is the same for the three panels of a row — ${dR[0]} in row 1, ${dR[1]} in row 2, ${dR[2]} in row 3.` },
        { k: 'Different shades', t: `count the <b>different shades</b> (white, grey, black, hatched): it goes up by <b>one</b> along each row — row 1: ${row(DF, 0)}; row 2: ${row(DF, 1)}; row 3 so far: ${DF[2][0]}, ${DF[2][1]}.` },
        { k: 'Total', t: `the <b>total</b> number of shapes is a Latin square: ${vals.join(', ')} each appear once in every row and every column. Row 1: ${row(N, 0)}; row 2: ${row(N, 1)}; row 3 so far: ${N[2][0]}, ${N[2][1]}, so the missing total is ${n3}.` },
        { k: 'Answer', t: `<b>${n3} shapes, ${pl(d3, 'different kind')} of shape and ${pl(f3, 'different shade')}</b>. Which shapes and shades exactly is free, and counting one particular shape or shade gives no usable rule.` },
      ];
      const panels = vis;
      return {
        difficulty: 8,
        hint: 'Do not look at which shapes there are, but at how many different kinds and shades each panel contains.',
        panels,
        answer: ans,
        options,
        rules,
        key: (s) => JSON.stringify(s.it.map((i) => [i.s, i.f, i.p])),
        render(s) {
          const pic = new RM.Pic();
          for (const it of s.it) RM.shape(pic, it.s, POS[it.p % 3], POS[Math.floor(it.p / 3)], 10, { fill: it.f, sw: 2 });
          return pic.svg();
        },
      };
    },
  });
})();
