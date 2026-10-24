/* Rainwater (grandmaster): a row of 8 bars per panel. The third panel of a row is built bar by bar from the first two
 * (sum capped at 6 / taller / difference); in every panel rain then fills the pools: over each bar the water stands as
 * high as the lower of the tallest bar to its left and the tallest bar to its right. */
(function () {
  'use strict';
  const RM = window.RM;
  const N = 8, X0 = 10, CELL = 10, BASE = 88;

  const sumK = (k) => (a, b) => Math.min(k, a + b);
  const OPS = {
    sum: {
      f: sumK(6),
      txt: 'the <b>sum</b> of the two bars above each other (but never taller than 6)',
      ex: (a, b) => (a + b > 6 ? `${a} + ${b} = ${a + b}, capped at 6` : `${a} + ${b}`),
    },
    max: { f: Math.max, txt: 'the <b>taller</b> of the two bars', ex: (a, b) => `the taller of ${a} and ${b}` },
    diff: {
      f: (a, b) => Math.abs(a - b),
      txt: 'the <b>difference</b> of the two bars (taller minus shorter)',
      ex: (a, b) => `|${a} − ${b}|`,
    },
  };
  const HYP = [4, 5, 6, 7, 8, 9, 10]
    .map(sumK)
    .concat([
      Math.max,
      Math.min,
      (a, b) => Math.abs(a - b),
      (a, b) => Math.max(0, a - b),
      (a, b) => Math.max(0, b - a),
      (a, b) => (a + b) % 6,
      (a, b) => (a + b) % 7,
      (a, b) => a ^ b,
      (a, b) => Math.min(6, a * b),
    ]);

  function water(h, mode) {
    const n = h.length, w = [];
    for (let i = 0; i < n; i++) {
      let L = 0, R = 0;
      for (let j = 0; j <= i; j++) L = Math.max(L, h[j]);
      for (let j = i; j < n; j++) R = Math.max(R, h[j]);
      let lev;
      if (mode === 'min') lev = Math.min(L, R);
      else if (mode === 'max') lev = Math.max(L, R);
      else lev = i > 0 && i < n - 1 ? Math.min(h[i - 1], h[i + 1]) : 0;
      w.push(Math.max(0, lev - h[i]));
    }
    return w;
  }
  const vol = (w) => w.reduce((s, x) => s + x, 0);
  function runs(w) {
    const r = [];
    let s = -1;
    for (let i = 0; i <= w.length; i++) {
      const on = i < w.length && w[i] > 0;
      if (on && s < 0) s = i;
      if (!on && s >= 0) {
        r.push([s, i - 1]);
        s = -1;
      }
    }
    return r;
  }
  const keyOf = (s) => s.h.join('') + '|' + s.w.join('');
  const dist = (a, b) => a.h.reduce((s, x, i) => s + Math.abs(x - b.h[i]) + Math.abs(a.w[i] - b.w[i]), 0);

  function pick7(rng, ans, cands) {
    const seen = new Set([ans.key]), pool = [];
    for (const c of cands) if (!seen.has(c.key)) { seen.add(c.key); pool.push(c); }
    RM.need(pool.length >= 7);
    for (let t = 0; t < 40; t++) {
      const by = {};
      rng.shuffle(pool).forEach((c) => (by[c.tag] = by[c.tag] || []).push(c));
      const tags = rng.shuffle(Object.keys(by)), out = [];
      for (let i = 0; out.length < 7 && i < 12; i++) for (const tg of tags) if (by[tg][i] && out.length < 7) out.push(by[tg][i]);
      if (out.length < 7) continue;
      const all = [ans].concat(out), sums = all.map((a) => all.reduce((s, b) => s + dist(a.spec, b.spec), 0));
      const o = sums.slice(1);
      if (sums[0] > Math.min(...o) && sums[0] < Math.max(...o)) return out;
    }
    RM.need(false);
  }

  RM.register({
    id: 'rain-trap',
    name: 'Rainwater',
    difficulty: 7,
    generate(rng, variant) {
      const opn = ['sum', 'max', 'diff', 'sum'][variant], op = OPS[opn], hi = opn === 'diff' ? 5 : 4;
      const rows = [];
      for (let r = 0; r < 3; r++) {
        let row = null;
        for (let t = 0; t < 120 && !row; t++) {
          const a = RM.range(N).map(() => rng.int(0, hi));
          const b = RM.range(N).map(() => rng.int(0, hi));
          const c = a.map((x, i) => op.f(x, b[i]));
          const wa = water(a, 'min'), wb = water(b, 'min'), wc = water(c, 'min');
          if (vol(wa) < 2 || vol(wb) < 2 || vol(wc) < 2) continue;
          if (RM.sameArr(c, a) || RM.sameArr(c, b)) continue;
          if (r === 2 && (runs(wc).length < 2 || vol(wc) < 3 || RM.sameArr(water(c, 'max'), wc))) continue;
          row = { a, b, c };
        }
        RM.need(row);
        rows.push(row);
      }
      const r3 = rows[2], vis = [rows[0], rows[1]];
      const T = r3.c, W = water(T, 'min');
      // terrain hypotheses
      const okT = HYP.filter((H) => vis.every((r) => r.a.every((x, i) => H(x, r.b[i]) === r.c[i])));
      RM.need(okT.length > 0);
      RM.need(okT.every((H) => RM.sameArr(r3.a.map((x, i) => H(x, r3.b[i])), T)));
      // water hypotheses
      const panels = [rows[0].a, rows[0].b, rows[0].c, rows[1].a, rows[1].b, rows[1].c, r3.a, r3.b];
      const okW = ['min', 'max', 'adj'].filter((m) => panels.every((t) => RM.sameArr(water(t, m), water(t, 'min'))));
      RM.need(okW.length === 1);

      const tflaw = (Tp) => {
        const d = [];
        Tp.forEach((x, i) => { if (x !== T[i]) d.push(i); });
        const s = d.slice(0, 2).map((i) => `column ${i + 1} should be ${T[i]} (${op.ex(r3.a[i], r3.b[i])}), not ${Tp[i]}`);
        return 'The skyline is wrong: ' + s.join('; ') + (d.length > 2 ? '; and more' : '') + '.';
      };
      const spillTxt = 'The water is filled up to the higher wall of the pools; it can only stand as high as the LOWER wall, the rest spills over.';
      const cands = [];
      const mk = (h, w, tag, flaws) => {
        const spec = { h, w };
        cands.push({ spec, key: keyOf(spec), tag, flaws });
      };
      mk(T, water(T, 'max'), 'spill', [spillTxt]);
      mk(T, water(T, 'adj'), 'adj', ['The water level is set by the two neighbouring bars only; it must be set by the tallest bar anywhere to the left and to the right.']);
      runs(W).forEach(([s, e]) => {
        const lab = s === e ? `column ${s + 1}` : `columns ${s + 1}–${e + 1}`;
        const dry = W.slice(), low = W.slice(), high = W.slice();
        for (let i = s; i <= e; i++) { dry[i] = 0; low[i] = Math.max(0, W[i] - 1); high[i] = W[i] + 1; }
        mk(T, dry, 'dry', [`The pool over ${lab} is missing: both of its walls are higher than its floor, so it holds water.`]);
        mk(T, low, 'low', [`The pool over ${lab} is one unit too shallow: it must be filled right up to its lower wall.`]);
        mk(T, high, 'high', [`The pool over ${lab} is filled one unit too high: the water would spill over its lower wall.`]);
      });
      HYP.forEach((H) => {
        const Tp = r3.a.map((x, i) => H(x, r3.b[i]));
        if (Tp.some((v) => v > 8) || RM.sameArr(Tp, T)) return;
        mk(Tp, water(Tp, 'min'), 'op', [tflaw(Tp)]);
      });
      [r3.a, r3.b, T.slice().reverse()].forEach((Tp) => {
        if (!RM.sameArr(Tp, T)) mk(Tp, water(Tp, 'min'), 'copy', [tflaw(Tp)]);
      });
      for (let i = 0; i < N; i++)
        for (const d of [-1, 1]) {
          const Tp = T.slice();
          Tp[i] += d;
          if (Tp[i] < 0 || Tp[i] > 8) continue;
          mk(Tp, water(Tp, 'min'), 'bar', [tflaw(Tp)]);
          const wm = water(Tp, 'max');
          if (!RM.sameArr(wm, water(Tp, 'min'))) mk(Tp, wm, 'mix', [tflaw(Tp), spillTxt]);
        }
      const ans = { spec: { h: T, w: W }, key: keyOf({ h: T, w: W }) };
      const out = pick7(rng, ans, cands);

      const wtxt = W.join(', ');
      return {
        panels: [rows[0].a, rows[0].b, rows[0].c, rows[1].a, rows[1].b, rows[1].c, r3.a, r3.b].map((h) => ({ h, w: water(h, 'min') })),
        answer: ans.spec,
        options: [{ spec: ans.spec, flaws: [] }].concat(out.map((c) => ({ spec: c.spec, flaws: c.flaws }))),
        render(s) {
          const pic = new RM.Pic();
          const cell = (x, y, fill, st) =>
            pic.add(`<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" fill="${fill}" stroke="${st}" stroke-width="0.9"/>`);
          for (let i = 0; i < N; i++) {
            for (let k = 0; k < s.h[i]; k++) cell(X0 + i * CELL, BASE - (k + 1) * CELL, '#3b3b3b', '#ffffff');
            for (let k = 0; k < s.w[i]; k++) cell(X0 + i * CELL, BASE - (s.h[i] + k + 1) * CELL, '#cfcfcf', '#8a8a8a');
          }
          RM.line(pic, 6, BASE, 94, BASE, { sw: 2.4 });
          return pic.svg();
        },
        key: keyOf,
        rules: [
          { k: 'Skyline', t: 'Every panel is a row of 8 bars (columns 1–8 from the left), each 0 to 6 units high; the white background is empty air.' },
          { k: 'Third panel', t: `In every row the third skyline is built <b>column by column</b> from the first two: each bar of the third panel is ${op.txt}.` },
          { k: 'Rain', t: 'Rain then fills every skyline (the light cells). Above a bar the water stands as high as the <b>lower</b> of the two tallest bars found to its left and to its right (the bar itself counts as a wall). Anything higher would spill over the lower wall, and water at an open end runs off.' },
          {
            k: 'Last row',
            t: `First panel: ${r3.a.join(' ')}; second panel: ${r3.b.join(' ')}. Third panel: ${T.map((x, i) => `${op.ex(r3.a[i], r3.b[i])} = ${x}`).join('; ')}.`,
          },
          {
            k: 'Water',
            t: `Water units above columns 1–8: ${wtxt} (${runs(W).length} pool${runs(W).length > 1 ? 's' : ''}, ${vol(W)} units). <b>Answer: bars ${T.join(' ')}, water ${wtxt}.</b>`,
          },
        ],
        hint: 'The third skyline is computed from the first two; the water is computed from each skyline.',
      };
    },
  });
})();
