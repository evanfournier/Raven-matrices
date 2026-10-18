/* Look and say (grandmaster): each panel describes the previous one in a row (Conway's look-and-say):
   runs of equal tokens are written as (count, token). Column 2 = description of column 1, column 3 = of column 2. */
(function () {
  'use strict';
  const RM = window.RM;
  const WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];

  function runsOf(s) {
    const r = [];
    for (const d of s) { if (r.length && r[r.length - 1][1] === d) r[r.length - 1][0]++; else r.push([1, d]); }
    return r;
  }
  function describe(s, o) { // o: {fmt:'cs'|'sc', dir:'ltr'|'rtl', mode:'runs'|'first'|'sorted'}
    const t = o.dir === 'rtl' ? s.slice().reverse() : s;
    let pairs;
    if (o.mode === 'runs') pairs = runsOf(t);
    else {
      const cnt = new Map();
      for (const d of t) cnt.set(d, (cnt.get(d) || 0) + 1);
      let ks = [...cnt.keys()];
      if (o.mode === 'sorted') ks.sort((a, b) => a - b);
      pairs = ks.map((d) => [cnt.get(d), d]);
    }
    const out = [];
    for (const [c, d] of pairs) { if (o.fmt === 'cs') out.push(c, d); else out.push(d, c); }
    return out;
  }
  const HYP = [];
  for (const fmt of ['cs', 'sc']) for (const dir of ['ltr', 'rtl']) for (const mode of ['runs', 'first', 'sorted']) HYP.push({ fmt, dir, mode });
  const eq = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

  function seed(rng, S) {
    for (let i = 0; i < 50; i++) {
      const n = rng.int(2, 4), s = [];
      for (let j = 0; j < n; j++) s.push(rng.int(1, S));
      if (runsOf(s).every((r) => r[0] <= 3)) return s;
    }
    return [1, 2];
  }

  const DOTS = {
    1: [[0, 0]], 2: [[0, -5.5], [0, 5.5]], 3: [[0, -8], [0, 0], [0, 8]],
    4: [[-2.4, -5.5], [2.4, -5.5], [-2.4, 5.5], [2.4, 5.5]],
  };
  function token(pic, cx, cy, k, dots) {
    RM.polygon(pic, [[cx - 5.5, cy - 13], [cx + 5.5, cy - 13], [cx + 5.5, cy + 13], [cx - 5.5, cy + 13]], { fill: RM.WHITE, sw: 1.2 });
    if (dots) for (const [dx, dy] of DOTS[k]) RM.circle(pic, cx + dx, cy + dy, 1.6, { fill: 'black' });
    else {
      const xs = { 1: [0], 2: [-2, 2], 3: [-3.3, 0, 3.3] }[k];
      for (const dx of xs) RM.line(pic, cx + dx, cy - 9.5, cx + dx, cy + 9.5, { sw: 1.4 });
    }
  }

  RM.register({
    id: 'look-and-say',
    name: 'Look and say',
    difficulty: 8,
    generate(rng, variant) {
      const S = variant === 2 ? 4 : 3;
      const dots = variant === 2;
      const op = { fmt: variant === 1 ? 'sc' : 'cs', dir: variant === 3 ? 'rtl' : 'ltr', mode: 'runs' };
      const f = (s) => describe(s, op);
      const seeds = [seed(rng, S), seed(rng, S), seed(rng, S)];
      RM.need(new Set(seeds.map((s) => s.join())).size === 3);
      const col2 = seeds.map(f), col3 = col2.map(f);
      RM.need(col3.every((s) => s.length <= 14));
      RM.need(col3.every((s) => Math.max(...s) <= S) && col2.every((s) => Math.max(...s) <= S));
      RM.need(col3.every((s) => s.length >= 5));
      // hypotheses consistent with the visible transitions
      const trans = [[seeds[0], col2[0]], [col2[0], col3[0]], [seeds[1], col2[1]], [col2[1], col3[1]], [seeds[2], col2[2]]];
      const cons = HYP.filter((h) => trans.every(([a, b]) => eq(describe(a, h), b)));
      const ans = col3[2];
      RM.need(cons.length > 0 && cons.every((h) => eq(describe(col2[2], h), ans)));

      const s2 = col2[2], s1 = seeds[2];
      const cand = [];
      const add = (a) => { if (a && a.length >= 1 && a.length <= 14 && Math.max(...a) <= (dots ? 4 : 3)) cand.push(a); };
      const pairs = (arr) => { const p = []; for (let i = 0; i + 1 < arr.length; i += 2) p.push([arr[i], arr[i + 1]]); return p; };
      const flat = (p) => [].concat(...p);
      const P = pairs(ans);
      add(flat(P.map(([a, b]) => [b, a])));
      P.forEach((_, i) => { const q = P.map((x) => x.slice()); q[i][0] += (q[i][0] > 1 && rng.chance(0.5)) ? -1 : 1; add(flat(q)); });
      P.forEach((_, i) => { const q = P.map((x) => x.slice()); q[i][1] = (q[i][1] % S) + 1; add(flat(q)); });
      P.forEach((_, i) => { const q = P.map((x) => x.slice()); q[i][0] = q[i][0] > 1 ? q[i][0] - 1 : q[i][0] + 1; add(flat(q)); });
      for (const m of ['first', 'sorted']) for (const dir of ['ltr', 'rtl']) add(describe(s2, { fmt: op.fmt, dir, mode: m }));
      add(describe(s2, { fmt: op.fmt === 'cs' ? 'sc' : 'cs', dir: op.dir, mode: 'runs' }));
      add(describe(s2, { fmt: op.fmt, dir: op.dir === 'ltr' ? 'rtl' : 'ltr', mode: 'runs' }));
      add(describe(s1, op).slice());
      add(ans.slice(0, -2));
      add(ans.slice(2));
      add(ans.slice().reverse());
      add(describe(describe(s1, op), { fmt: op.fmt, dir: op.dir, mode: 'first' }));
      add(P.length > 2 ? flat([P[1], P[0]].concat(P.slice(2))) : null);
      // merged-run slip: merge equal adjacent description tokens as one run
      add(flat(runsOf(s2).slice(0, -1).map((r) => (op.fmt === 'cs' ? [r[0], r[1]] : [r[1], r[0]]))));
      const seen = new Set([ans.join()]), opts = [];
      for (const a of rng.shuffle(cand)) {
        const k = a.join();
        if (seen.has(k)) continue;
        if (cons.some((h) => eq(describe(s2, h), a))) continue;
        seen.add(k);
        opts.push(a);
      }
      RM.need(opts.length >= 7);
      const flawOf = (a) => {
        const f = [];
        if (eq(a, describe(s1, op))) f.push('this just repeats the middle panel instead of describing it');
        if (eq(a, ans.slice(0, -2))) f.push('the last pair (the final run) is missing');
        if (eq(a, ans.slice(2))) f.push('the first pair (the first run) is missing');
        if (eq(a, ans.slice().reverse())) f.push('the description is written backwards');
        if (eq(a, flat(P.map(([x, y]) => [y, x])))) f.push('every pair is written in the wrong order (' + (op.fmt === 'cs' ? 'token first, then count' : 'count first, then token') + ')');
        for (const m of ['first', 'sorted']) for (const d of ['ltr', 'rtl'])
          if (eq(a, describe(s2, { fmt: op.fmt, dir: d, mode: m }))) f.push('it counts the total of each token over the whole panel instead of describing consecutive runs');
        if (eq(a, describe(s2, { fmt: op.fmt === 'cs' ? 'sc' : 'cs', dir: op.dir, mode: 'runs' }))) f.push('the pairs are in the wrong order');
        if (eq(a, describe(s2, { fmt: op.fmt, dir: op.dir === 'ltr' ? 'rtl' : 'ltr', mode: 'runs' }))) f.push('the middle panel is read in the wrong direction');
        if (!f.length) f.push('at least one run is miscounted or misnamed, so it does not match the middle panel read aloud');
        return f;
      };
      const options = [{ spec: ans, flaws: [] }].concat(rng.sample(opts, 7).map((a) => ({ spec: a, flaws: flawOf(a) })));

      const sx = (n) => (n > 7 ? 7 : n);
      const tok = (s) => s.join(' ');
      const rd = (s) => runsOf(op.dir === 'rtl' ? s.slice().reverse() : s)
        .map(([c, d]) => WORDS[c] + ' ' + d + (c > 1 ? 's' : ''));
      const unit = dots ? 'dots' : 'bars';
      const rules = [
        { k: 'Tokens', t: 'Each panel is a string of tokens. A token is a box with 1, 2, ' + (dots ? '3 or 4 dots' : 'or 3 bars') + ', so it stands for a number. Strings are read left to right, top line first.' },
        { k: 'Look and say', t: 'In every row the middle panel <b>describes</b> the left one, and the right panel describes the middle one: ' +
          (op.dir === 'rtl' ? 'read the previous panel <b>from right to left</b>, ' : 'read the previous panel from left to right, ') +
          'cut it into runs of identical tokens, and write each run as ' +
          (op.fmt === 'cs' ? '<b>(how many, which token)</b>' : '<b>(which token, how many)</b> - the token first, then its count') + '.' },
        { k: 'Check', t: 'Row 1: ' + tok(seeds[0]) + ' gives ' + tok(col2[0]) + ', which gives ' + tok(col3[0]) + '. Row 2: ' + tok(seeds[1]) + ' gives ' + tok(col2[1]) + ', which gives ' + tok(col3[1]) + '.' },
        { k: 'Row 3', t: 'The middle panel is ' + tok(s2) + (op.dir === 'rtl' ? ' (read backwards: ' + tok(s2.slice().reverse()) + ')' : '') + ' = ' + rd(s2).join(', ') + '. Written as pairs, this gives <b>' + tok(ans) + '</b>.' },
        { k: 'Traps', t: 'Counting the total of each token over the whole panel, swapping the order inside the pairs, or describing the left panel again all give a different string.' },
      ];
      return {
        panels: [seeds[0], col2[0], col3[0], seeds[1], col2[1], col3[1], seeds[2], col2[2]],
        answer: ans,
        options,
        render(spec) {
          const pic = new RM.Pic();
          const n = spec.length;
          const lines = n > 7 ? [spec.slice(0, 7), spec.slice(7)] : [spec];
          lines.forEach((ln, li) => {
            const y = lines.length === 1 ? 50 : (li ? 71 : 29);
            const x0 = 50 - (ln.length - 1) * 6.6;
            ln.forEach((k, i) => token(pic, x0 + i * 13.2, y, k, dots));
          });
          return pic.svg();
        },
        key: (spec) => spec.join(','),
        rules,
        hint: 'Say out loud what you see in each panel.',
      };
    },
  });
})();
