/* Slowing down (grandmaster): the 8 panels are read in order as a sequence. The number of dots (<= 16, laid out in a
 * compact 4-wide grid) changes by a different amount at every step: the first differences themselves shrink by 1 each
 * time (5, 4, 3, 2, 1, 0, -1, -2 ...; or grow by 1 in the mirrored variants), i.e. a constant second difference. The
 * dot SHAPE follows its own cycle of period 4. Every reading (linear recurrences of order 2 incl. polynomial degree
 * <= 2, affine steps, constant step, periods 1-4) that fits the visible counts must predict the same count. */
(function () {
  'use strict';
  const RM = window.RM;

  const SHAPES = ['circle', 'square', 'triangle', 'star5', 'cross', 'hexagon', 'heart', 'pentagon'];
  const SNAME = { circle: 'circle', square: 'square', triangle: 'triangle', star5: 'star', cross: 'cross', hexagon: 'hexagon', heart: 'heart', pentagon: 'pentagon' };
  const sgn = (d) => (d > 0 ? '+' + d : d < 0 ? '−' + -d : '0');

  function render(sp) {
    const pic = new RM.Pic();
    for (let i = 0; i < sp.n; i++) {
      const x = 17 + 22 * (i % 4);
      const y = 17 + 22 * Math.floor(i / 4);
      RM.shape(pic, sp.sh, x, y, sp.sh === 'cross' || sp.sh === 'star5' ? 9.5 : 8.5, { fill: 'black', sw: 1.5 });
    }
    return pic.svg();
  }
  const key = (sp) => sp.n + ':' + sp.sh;

  RM.register({
    id: 'slowdown',
    name: 'Slowing down',
    difficulty: 7,
    reading: 'sequence',
    generate(rng, variant) {
      /* counts: differences d_k = d1 - (k-1) (k = 1..8); mirrored (sigma = -1) when variant is odd or by chance */
      const d1 = variant === 0 ? 5 : rng.int(3, 6);
      const sigma = variant === 0 ? 1 : rng.chance(0.5) ? -1 : 1;
      const base = [];
      let s = 0;
      base.push(0);
      for (let k = 1; k <= 8; k++) {
        s += d1 - (k - 1);
        base.push(s);
      }
      const lo = Math.min(...base);
      const hi = Math.max(...base);
      const span = hi - lo;
      RM.need(span <= 15);
      const off = rng.int(1, 16 - span) - lo; // all counts in 1..16
      const cs = base.map((v) => (sigma > 0 ? v + off : 17 - (v + off)));
      RM.need(cs.every((c) => c >= 1 && c <= 16));
      const vis = cs.slice(0, 8);
      const c9 = cs[8];
      const diffs = [];
      for (let k = 1; k <= 8; k++) diffs.push(cs[k] - cs[k - 1]);
      const d8 = diffs[7];
      const dd = sigma > 0 ? -1 : 1; // second difference

      /* shape cycle of period 4 */
      const cyc = rng.sample(SHAPES, 4);
      const shapeAt = (k) => cyc[(k - 1) % 4]; // panel k (1-based)
      const s9 = shapeAt(9);

      /* identifiability of the counts */
      const hyps = [];
      for (let a = -2; a <= 2; a++)
        for (let b = -2; b <= 2; b++)
          for (let g = -6; g <= 6; g++) hyps.push({ id: `rec ${a} ${b} ${g}`, ok: (v) => { for (let i = 0; i + 2 < v.length; i++) if (v[i + 2] !== a * v[i + 1] + b * v[i] + g) return false; return true; }, f: (v) => a * v[v.length - 1] + b * v[v.length - 2] + g });
      for (let a = -2; a <= 3; a++)
        for (let g = -8; g <= 8; g++) hyps.push({ id: `aff ${a} ${g}`, ok: (v) => { for (let i = 0; i + 1 < v.length; i++) if (v[i + 1] !== a * v[i] + g) return false; return true; }, f: (v) => a * v[v.length - 1] + g });
      for (let p = 1; p <= 4; p++) hyps.push({ id: 'period ' + p, ok: (v) => { for (let i = 0; i + p < v.length; i++) if (v[i + p] !== v[i]) return false; return true; }, f: (v) => v[v.length - p] });
      const fits = hyps.filter((h) => h.ok(vis));
      RM.need(fits.length > 0 && fits.every((h) => h.f(vis) === c9));
      RM.need(new Set(vis).size >= 5 && c9 !== cs[7]);
      /* constant-step continuation must differ from the answer and must be a genuine alternative */
      const constStep = cs[7] + (cs[7] - cs[6]);

      /* distractors: (count, shape) pairs ranked by how tempting they are */
      const pool = new Map();
      const sh8 = shapeAt(8);
      const nm = (sh) => SNAME[sh];
      const addC = (n, sh, cScore, sScore) => {
        if (n < 1 || n > 16 || (n === c9 && sh === s9)) return;
        const k = n + ':' + sh;
        const flaws = [];
        if (n !== c9) {
          let t = `${n} dots: that is a change of ${sgn(n - cs[7])} from panel 8, but the change must be ${sgn(d8)} (every change is ${dd < 0 ? '1 smaller' : '1 larger'} than the previous one), giving ${c9} dots`;
          if (n === constStep) t += ' (this just repeats the previous change of ' + sgn(cs[7] - cs[6]) + ')';
          else if (n === cs[7]) t += ' (this repeats the count of panel 8)';
          flaws.push(t);
        }
        if (sh !== s9) flaws.push(`the dots should be ${nm(s9)}s (the shape cycle has period 4, so panel 9 repeats panel 5 and panel 1), not ${nm(sh)}s${sh === sh8 ? ' (that is just the shape of panel 8: the cycle has to advance)' : ''}`);
        const score = cScore + sScore + rng.next() * 0.8;
        if (!pool.has(k) || pool.get(k).score > score) pool.set(k, { spec: { n, sh }, flaws, score });
      };
      const cDelta = [[c9 - 1, 1], [c9 + 1, 1], [c9 - 2, 2], [c9 + 2, 2], [constStep, 1], [cs[7], 2], [cs[6], 3], [c9 + 3, 3], [c9 - 3, 3]];
      const shs = cyc.concat(SHAPES.filter((x) => !cyc.includes(x)).slice(0, 0));
      for (const sh of shs) {
        const sScore = sh === s9 ? 0 : sh === sh8 ? 1 : 1.6;
        addC(c9, sh, 0, sScore);
        for (const [n, cSc] of cDelta) addC(n, sh, cSc, sScore);
      }
      let chosen = null;
      for (let t = 0; t < 30 && !chosen; t++) {
        const list = [...pool.values()].map((o) => ({ o, r: o.score + rng.next() * 1.2 })).sort((a, b) => a.r - b.r).slice(0, 7).map((x) => x.o);
        const all = list.map((o) => o.spec).concat([{ n: c9, sh: s9 }]);
        const mode = (f) => {
          const m = {};
          all.forEach((sp) => (m[f(sp)] = (m[f(sp)] || 0) + 1));
          const ans = m[f({ n: c9, sh: s9 })];
          return Object.values(m).filter((v) => v >= ans).length === 1;
        };
        if (!(mode((sp) => sp.n) && mode((sp) => sp.sh)) && list.filter((o) => o.spec.n === c9).length >= 1 && list.filter((o) => o.spec.sh === s9).length >= 2) chosen = list;
      }
      RM.need(chosen);

      /* correction */
      const seqTxt = vis.map((c, i) => `<b>${c}</b>`).join(', ');
      const dtxt = diffs.slice(0, 7).map(sgn).join(', ');
      const shTxt = cyc.map((x) => nm(x) + 's').join(' → ');
      const rules = [
        { k: 'Counts', t: `read the 8 panels as a sequence. The numbers of dots are ${seqTxt}. The steps between consecutive panels are ${dtxt}: they are <b>not constant</b>, but each step is ${dd < 0 ? '<b>1 smaller</b>' : '<b>1 larger</b>'} than the one before (the change itself changes at a constant rate).` },
        { k: 'Next step', t: `the step after ${sgn(diffs[6])} is <b>${sgn(d8)}</b>. Continuing the last step (${sgn(diffs[6])}) as if it were constant would give ${cs[7] + diffs[6]} dots, which is wrong. Panel 9: ${cs[7]} ${d8 < 0 ? '− ' + -d8 : '+ ' + d8} = <b>${c9}</b> dots.` },
        { k: 'Shape', t: `the shape of the dots has nothing to do with the count: it cycles with period 4 (${shTxt}, then it starts again). Panel 5 is a ${nm(shapeAt(5))} like panel 1, so panel 9 is again <b>${nm(s9)}s</b>.` },
        { k: 'Answer', t: `<b>${c9} ${nm(s9)}s</b>, arranged row by row in the 4-wide grid.` },
      ];
      const hint = 'look at how much the number of dots changes at each step, and how that change changes. The shape is a separate story.';
      return {
        difficulty: 7,
        hint,
        panels: vis.map((n, i) => ({ n, sh: shapeAt(i + 1) })),
        answer: { n: c9, sh: s9 },
        options: [{ spec: { n: c9, sh: s9 }, flaws: [] }].concat(chosen.map((o) => ({ spec: o.spec, flaws: o.flaws }))),
        render,
        key,
        rules,
      };
    },
  });
})();
