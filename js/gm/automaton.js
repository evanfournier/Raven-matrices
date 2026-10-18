/* Cellular automaton (grandmaster): each panel is a strip of 9 lamps; the next column is the strip after one (or two)
   steps of an elementary 1-D cellular automaton (Wolfram rule), with white / wrapping edges. */
(function () {
  'use strict';
  const RM = window.RM;
  const N = 9;
  const step = (s, rule, b) => s.map((c, i) => {
    const g = (j) => (j < 0 || j >= N) ? (b === 2 ? s[(j + N) % N] : b) : s[j];
    return (rule >> (g(i - 1) * 4 + c * 2 + g(i + 1))) & 1;
  });
  const evolve = (s, rule, b, k) => { for (let i = 0; i < k; i++) s = step(s, rule, b); return s; };
  const str = (s) => s.join('');
  const glyph = (n) => [n >> 2 & 1, n >> 1 & 1, n & 1].map((v) => v ? '■' : '□').join('');
  const nbh = (s, i, b) => {
    const g = (j) => (j < 0 || j >= N) ? (b === 2 ? s[(j + N) % N] : b) : s[j];
    return g(i - 1) * 4 + s[i] * 2 + g(i + 1);
  };
  const BN = ['white', 'black', 'wrapping'];

  function interesting(rule) {
    let d = 0;
    const o = (n) => (rule >> n) & 1;
    for (let n = 0; n < 8; n++) if (o(n) !== ((n >> 1) & 1)) d++;
    if (d < 3) return false;
    const fs = [(n) => n >> 2 & 1, (n) => n & 1, (n) => 0, (n) => 1];
    for (const f of fs) for (const inv of [0, 1]) {
      let same = true;
      for (let n = 0; n < 8; n++) if (o(n) !== (f(n) ^ inv)) same = false;
      if (same) return false;
    }
    return true;
  }

  RM.register({
    id: 'automaton',
    name: 'Cellular automaton',
    difficulty: 7,
    generate(rng, variant) {
      const bnd = (variant === 1 || variant === 3) ? 2 : 0;
      const k = variant === 3 ? 2 : 1;
      const rule = rng.int(1, 254);
      RM.need(interesting(rule));
      const rows = [];
      for (let r = 0; r < 3; r++) {
        const a = [];
        for (let i = 0; i < N; i++) a.push(rng.chance(0.5) ? 1 : 0);
        const b = evolve(a, rule, bnd, k), c = evolve(b, rule, bnd, k);
        rows.push([a, b, c]);
      }
      // distinct, non-trivial strips
      const all = rows.flat();
      RM.need(new Set(all.map(str)).size === 9);
      for (const s of all) { const t = s.reduce((x, y) => x + y, 0); RM.need(t >= 2 && t <= 7); }
      const ans = rows[2][2];
      // hypotheses
      const trans = [[rows[0][0], rows[0][1]], [rows[0][1], rows[0][2]], [rows[1][0], rows[1][1]],
        [rows[1][1], rows[1][2]], [rows[2][0], rows[2][1]]];
      let ok = 0;
      for (let r = 0; r < 256; r++) for (let b = 0; b < 3; b++) for (let kk = 1; kk <= 2; kk++) {
        if (!trans.every(([x, y]) => str(evolve(x, r, b, kk)) === str(y))) continue;
        ok++;
        RM.need(str(evolve(rows[2][1], r, b, kk)) === str(ans));
      }
      RM.need(ok >= 1);
      // the intended hypothesis must be informative: all 8 neighbourhoods seen is not required, but the answer must
      // use only neighbourhoods seen in rows 1-2 (so the rule is discoverable)
      const seen = new Set();
      const obsPairs = [[rows[0][0], k === 1 ? null : evolve(rows[0][0], rule, bnd, 1)],
        [rows[1][0], k === 1 ? null : evolve(rows[1][0], rule, bnd, 1)]];
      const srcs = k === 1 ? [rows[0][0], rows[0][1], rows[1][0], rows[1][1]]
        : [rows[0][0], rows[0][0] && evolve(rows[0][0], rule, bnd, 1), rows[0][1], evolve(rows[0][1], rule, bnd, 1),
          rows[1][0], evolve(rows[1][0], rule, bnd, 1), rows[1][1], evolve(rows[1][1], rule, bnd, 1)];
      for (const s of srcs) for (let i = 0; i < N; i++) seen.add(nbh(s, i, bnd));
      const mid = k === 2 ? evolve(rows[2][1], rule, bnd, 1) : null;
      const last = k === 2 ? mid : rows[2][1];
      void obsPairs;
      // distractors
      const p = rows[2][1];
      const cand = [];
      const add = (s, why) => { if (s && str(s) !== str(ans)) cand.push({ s, why }); };
      for (let n = 0; n < 8; n++) {
        const r2 = rule ^ (1 << n);
        add(evolve(p, r2, bnd, k), 'Applies the right idea with one neighbourhood (' + glyph(n) + ') giving the wrong result.');
      }
      for (let b = 0; b < 3; b++) if (b !== bnd) add(evolve(p, rule, b, k), 'The edge cells are treated as ' + BN[b] + ' neighbours, but the edge is ' + BN[bnd] + '.');
      add(evolve(p, rule, bnd, 3 - k), k === 1 ? 'Two steps were applied instead of one.' : 'Only one step was applied instead of two.');
      add(p, 'This is the previous strip of the row, unchanged.');
      add(ans.slice().reverse(), 'This is the mirror image of the correct strip.');
      add(evolve(p, rule, bnd, k + 1), 'One step too many.');
      for (let i = 0; i < N; i++) { const t = ans.slice(); t[i] ^= 1; add(t, 'Cell ' + (i + 1) + ' (counting from the left) has the wrong colour.'); }
      const seenK = new Set(), opts = [];
      seenK.add(str(ans));
      for (const c of rng.shuffle(cand.slice(0, cand.length - N)).concat(rng.shuffle(cand.slice(cand.length - N)))) {
        if (seenK.has(str(c.s))) continue;
        seenK.add(str(c.s)); opts.push({ spec: c.s, flaws: [c.why] });
        if (opts.length === 7) break;
      }
      RM.need(opts.length === 7);
      opts.push({ spec: ans, flaws: [] });

      // rules text
      const tab = [];
      for (let n = 7; n >= 0; n--) tab.push(glyph(n) + ' → ' + ((rule >> n) & 1 ? '■' : '□') + (seen.has(n) ? '' : ' (not seen)'));
      const edge = bnd === 2 ? 'The strip wraps around: the left neighbour of the first lamp is the last lamp and vice versa.'
        : 'Outside the strip every cell is white.';
      const cells = [];
      for (let i = 0; i < N; i++) {
        const n = nbh(last, i, bnd);
        cells.push((i + 1) + ': ' + glyph(n) + ' → ' + ((rule >> n) & 1 ? '■' : '□'));
      }
      const rules = [
        { k: 'Cell rule', t: 'Each lamp’s colour in the next panel depends only on itself and its two neighbours (■ = black, □ = white). ' + (k === 2 ? 'Each column is <b>two</b> such steps after the previous one.' : 'Each column is one such step after the previous one.') },
        { k: 'The table', t: 'Rows 1–2 show the table: ' + tab.join('; ') + '.' },
        { k: 'Edges', t: edge },
        { k: 'Last panel', t: (k === 2 ? 'Step 1 from panel (3,2) gives ' + mid.map((v) => v ? '■' : '□').join('') + '; step 2: ' : 'Apply it to panel (3,2), cell by cell: ') + cells.join('; ') + '. Result: <b>' + ans.map((v) => v ? '■' : '□').join('') + '</b>.' },
      ];
      if (k === 2) rules[3].t = 'Step 1 from panel (3,2) gives ' + mid.map((v) => v ? '■' : '□').join('') + '. Step 2, cell by cell: ' + cells.join('; ') + '. Result: <b>' + ans.map((v) => v ? '■' : '□').join('') + '</b>.';

      return {
        panels: [rows[0][0], rows[0][1], rows[0][2], rows[1][0], rows[1][1], rows[1][2], rows[2][0], rows[2][1]],
        answer: ans,
        options: opts,
        difficulty: variant === 3 ? 8 : 7,
        render(s) {
          const pic = new RM.Pic();
          RM.polygon(pic, [[3, 34], [97, 34], [97, 66], [3, 66]], { fill: RM.FAINT, sw: 1.5 });
          const w = 9.5, x0 = 50 - w * N / 2;
          for (let i = 0; i < N; i++) {
            const x = x0 + i * w;
            RM.polygon(pic, [[x, 40], [x + w, 40], [x + w, 60], [x, 60]], { fill: s[i] ? RM.INK : RM.WHITE, sw: 1.5 });
          }
          return pic.svg();
        },
        key: (s) => str(s),
        rules,
        hint: 'Each cell only looks at itself and its two neighbours.',
      };
    },
  });
})();
