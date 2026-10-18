/* Fractal substitution (grandmaster): every cell is replaced by a secret 2x2 pattern that depends on its colour; applied twice (columns 1->2->3). */
(function () {
  'use strict';
  const RM = window.RM;
  const COL = ['#ffffff', '#1f2937', '#9ca3af'];
  const CH = ['□', '■', '▒'];
  const rot = (a) => [a[2], a[0], a[3], a[1]];
  const rotN = (a, d) => { let r = a; for (let i = 0; i < ((d % 4) + 4) % 4; i++) r = rot(r); return r; };
  const flipH = (a) => [a[1], a[0], a[3], a[2]];
  function sub(g, n, pats) {
    const m = 2 * n, o = new Array(m * m);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const p = pats[g[i * n + j]];
      for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) o[(2 * i + a) * m + 2 * j + b] = p[a * 2 + b];
    }
    return o;
  }
  function block(dst, n, i, j) { // dst is (2n)x(2n)
    const m = 2 * n, r = [];
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) r.push(dst[(2 * i + a) * m + 2 * j + b]);
    return r;
  }
  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const pstr = (p) => CH[p[0]] + CH[p[1]] + ' / ' + CH[p[2]] + CH[p[3]];
  const gstr = (g, n) => { const r = []; for (let i = 0; i < n; i++) r.push(g.slice(i * n, i * n + n).map((c) => CH[c]).join('')); return r.join('<br>'); };
  const cname = ['white', 'black', 'gray'];

  RM.register({
    id: 'fractal-sub',
    name: 'Fractal substitution',
    difficulty: 7,
    generate(rng, variant) {
      const K = variant === 2 ? 3 : 2;
      const dTrue = variant === 1 ? 1 : 0;
      const rp = () => [0, 0, 0, 0].map(() => rng.int(0, K - 1));
      const nonU = (p) => p.some((v) => v !== p[0]);
      let pats;
      for (let t = 0; t < 50; t++) {
        pats = [];
        for (let c = 0; c < K; c++) pats.push(rp());
        if (variant === 3) pats[0] = pats[1].map((v) => 1 - v);
        if (!pats.every(nonU)) continue;
        if (pats.some((p, i) => pats.some((q, j) => i < j && same(p, q)))) continue;
        break;
      }
      RM.need(pats.every(nonU) && !pats.some((p, i) => pats.some((q, j) => i < j && same(p, q))));
      const pats2 = pats.map((p) => rotN(p, dTrue));
      const seeds = [], g2 = [], g3 = [];
      for (let r = 0; r < 3; r++) {
        let s;
        for (let t = 0; t < 30; t++) {
          s = rp();
          if (new Set(s).size >= K && !seeds.some((q) => same(q, s))) break;
          s = null;
        }
        RM.need(s);
        seeds.push(s);
        g2.push(sub(s, 2, pats));
        g3.push(sub(g2[r], 4, pats2));
      }
      // uniqueness: all consistent (patterns, rotation) hypotheses predict the same answer
      const obs = [];
      for (let r = 0; r < 3; r++) {
        for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) obs.push({ c: seeds[r][i * 2 + j], b: block(g2[r], 2, i, j), gen: 1 });
        if (r < 2) for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) obs.push({ c: g2[r][i * 4 + j], b: block(g3[r], 4, i, j), gen: 2 });
      }
      const ans = g3[2];
      let okTrue = false;
      for (let d = 0; d < 4; d++) {
        const p = new Array(K).fill(null);
        let bad = false;
        for (const o of obs) {
          const q = o.gen === 1 ? o.b : rotN(o.b, 4 - d);
          if (p[o.c] === null) p[o.c] = q; else if (!same(p[o.c], q)) { bad = true; break; }
        }
        if (bad) continue;
        // gen1 pattern p[c], gen2 pattern rot^d p[c]
        if (g2[2].some((c) => p[c] === null)) RM.need(false);
        const pr = sub(g2[2], 4, p.map((q) => (q ? rotN(q, d) : [0, 0, 0, 0])));
        RM.need(same(pr, ans));
        if (d === dTrue) okTrue = true;
      }
      RM.need(okTrue);

      // distractors
      const cands = [];
      const add = (cells, why) => { if (!same(cells, ans)) cands.push({ cells, why }); };
      add(sub(g2[2], 4, pats.map((p) => p.map(() => 0)).map((_, c) => [c, c, c, c])).length ? (() => {
        const o = []; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) o.push(g2[2][((i >> 1) * 4) + (j >> 1)]); return o;
      })() : ans, 'only one substitution step was applied: this is the 4×4 figure simply enlarged, not the next generation.');
      const perm = K === 2 ? [1, 0] : [1, 2, 0];
      add(sub(g2[2], 4, pats2.map((_, c) => pats2[perm[c]])), 'the two patterns were swapped: each cell gets the pattern of the other colour.');
      add(sub(g2[2], 4, pats2.map(flipH)), 'the patterns are mirrored left-right, but they must be used exactly as in the first step.');
      add(sub(g2[2], 4, pats.map((p) => rotN(p, dTrue === 0 ? 1 : 0))), dTrue === 0 ? 'the patterns were rotated, but they are never rotated in this puzzle.' : 'the pattern is not rotated in the second step, but it must be rotated a quarter turn clockwise.');
      add(ans.map((c) => (K === 2 ? 1 - c : (c + 1) % 3)), 'the colours are inverted compared with the correct figure.');
      const tr = []; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) tr.push(ans[j * 8 + i]);
      add(tr, 'the figure is transposed (reflected along the diagonal).');
      const fl = []; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) fl.push(ans[i * 8 + 7 - j]);
      add(fl, 'the figure is mirrored left-right.');
      add(sub(g2[2], 4, pats2.map((p) => rotN(p, 2))), 'the patterns were turned upside down (half turn).');
      for (let t = 0; t < 8; t++) { // one 2x2 block wrong
        const c = ans.slice(), bi = rng.int(0, 3), bj = rng.int(0, 3);
        const wrong = pats2.filter((p) => !same(p, block(ans, 4, bi, bj)));
        const w = rng.pick(wrong);
        for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) c[(2 * bi + a) * 8 + 2 * bj + b] = w[a * 2 + b];
        add(c, 'one 2×2 block (row ' + (bi + 1) + ', column ' + (bj + 1) + ' of the blocks) uses the wrong pattern for its parent cell.');
      }
      for (let t = 0; t < 4; t++) {
        const c = ans.slice(), k = rng.int(0, 63); c[k] = (c[k] + 1) % K;
        add(c, 'one small cell has the wrong colour.');
      }
      const seen = new Set([ans.join('')]), opts = [];
      const keep = [];
      for (const c of cands) { const k = c.cells.join(''); if (!seen.has(k)) { seen.add(k); keep.push(c); } }
      RM.need(keep.length >= 7);
      const structured = keep.filter((c) => !/one small cell/.test(c.why) && !/one 2×2/.test(c.why));
      const blocks = rng.shuffle(keep.filter((c) => /one 2×2/.test(c.why)));
      const smalls = keep.filter((c) => /one small cell/.test(c.why));
      const chosen = structured.concat(blocks.slice(0, 2), smalls.slice(0, 1), blocks.slice(2), smalls.slice(1)).slice(0, 7);
      RM.need(chosen.length === 7);
      const spec = (cells) => ({ n: Math.round(Math.sqrt(cells.length)), c: cells });
      const options = chosen.map((c) => ({ spec: spec(c.cells), flaws: [c.why] }));
      options.push({ spec: spec(ans), flaws: [] });

      const panels = [];
      for (let r = 0; r < 3; r++) { panels.push(spec(seeds[r]), spec(g2[r])); if (r < 2) panels.push(spec(g3[r])); }

      const rotTxt = dTrue ? ' In the second step each pattern is first turned a quarter turn clockwise.' : '';
      const pl = pats.map((p, c) => 'a ' + cname[c] + ' cell becomes ' + pstr(p)).join('; ');
      const rules = [
        { k: 'Substitution', t: 'Every cell is replaced by a 2×2 block whose pattern depends only on the cell colour: ' + pl + '. The patterns are the same in all rows.' },
        { k: 'Two generations', t: 'Column 2 is the substitution of column 1 (2×2 → 4×4); column 3 is the substitution of column 2 (4×4 → 8×8).' + rotTxt },
        { k: 'Finding the patterns', t: 'Compare the first cells of any row: the pattern each colour produces can be read directly from the 2×2 → 4×4 step, and confirmed by the rows above.' },
        { k: 'Missing panel', t: 'Row 3 has the 4×4 figure:<br><code>' + gstr(g2[2], 4) + '</code><br>Replace each of its 16 cells by its pattern' + (dTrue ? ' (turned a quarter turn clockwise)' : '') + ' to get the 8×8 figure:<br><b><code>' + gstr(ans, 8) + '</code></b>' },
      ];
      return {
        panels, answer: spec(ans), options, rules,
        hint: 'Each square grows into four.',
        difficulty: variant === 1 || variant === 2 ? 8 : 7,
        render(s) {
          const pic = new RM.Pic(), n = s.n, w = 80 / n;
          let h = '';
          for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
            h += '<rect x="' + RM.fmt(10 + j * w) + '" y="' + RM.fmt(10 + i * w) + '" width="' + RM.fmt(w) + '" height="' + RM.fmt(w) + '" fill="' + COL[s.c[i * n + j]] + '" stroke="#6b7280" stroke-width="' + (n === 8 ? 0.35 : 0.5) + '"/>';
          }
          pic.add(h);
          pic.add('<rect x="10" y="10" width="80" height="80" fill="none" stroke="' + RM.INK + '" stroke-width="1.6"/>');
          return pic.svg();
        },
        key(s) { return s.n + ':' + s.c.join(''); },
      };
    },
  });
})();
