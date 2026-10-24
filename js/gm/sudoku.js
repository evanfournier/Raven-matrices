/* Big Latin square (grandmaster): every panel is a 2x2 block of symbols; the 9 panels together form a 6x6 grid in which
 * every big row and every big column holds each of the 6 symbols exactly once (panels themselves may repeat symbols).
 * The missing bottom-right block is forced by the lines crossing it; the generator solves the 4 missing cells by
 * enumeration and keeps only grids with exactly one completion, one cell that needs real elimination, and visible
 * panels that kill the "each panel has 4 different symbols" reading. Distractors: cells swapped / block mirrored or
 * turned, one or two symbols repeated in a big row or column. */
(function () {
  'use strict';
  const RM = window.RM;

  const SETS = [
    [['circle', 'black'], ['circle', 'white'], ['square', 'black'], ['square', 'white'], ['triangle', 'black'], ['triangle', 'white']],
    [['circle', 'white'], ['square', 'white'], ['triangle', 'white'], ['diamond', 'white'], ['star5', 'white'], ['cross', 'white']],
    [['circle', 'gray'], ['square', 'gray'], ['diamond', 'black'], ['star5', 'black'], ['triangle', 'white'], ['cross', 'white']],
    [['hexagon', 'black'], ['hexagon', 'white'], ['star5', 'black'], ['star5', 'white'], ['cross', 'black'], ['cross', 'white']],
  ];
  const FN = { black: 'black', white: 'white', gray: 'grey' };
  const SN = { star5: 'star' };
  const POS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
  const CX = [27, 73, 27, 73];
  const CY = [27, 27, 73, 73];
  const PERMS = [];
  (function mk(a, rest) {
    if (!rest.length) PERMS.push(a);
    else rest.forEach((x, i) => mk(a.concat(x), rest.filter((_, j) => j !== i)));
  })([], [0, 1, 2, 3]);
  const TAGS = {
    '1,0,3,2': 'the correct block mirrored left-right',
    '2,3,0,1': 'the correct block mirrored top-bottom',
    '3,2,1,0': 'the correct block turned upside down',
    '0,2,1,3': 'the correct block flipped along its main diagonal (top-right and bottom-left cells swapped)',
    '3,1,2,0': 'the correct block flipped along its other diagonal (top-left and bottom-right cells swapped)',
    '2,0,3,1': 'the correct block turned a quarter-turn clockwise',
    '1,3,0,2': 'the correct block turned a quarter-turn anticlockwise',
    '1,0,2,3': 'the correct block with its two top cells swapped',
    '0,1,3,2': 'the correct block with its two bottom cells swapped',
    '2,1,0,3': 'the correct block with its two left cells swapped',
    '0,3,2,1': 'the correct block with its two right cells swapped',
  };

  function latin(rng) {
    const g = RM.range(6).map(() => new Array(6).fill(-1));
    let steps = 0;
    const rec = (i) => {
      if (i === 36) return true;
      if (++steps > 4000) return false;
      const r = (i / 6) | 0;
      const c = i % 6;
      for (const s of rng.shuffle(RM.range(6))) {
        if (g[r].includes(s)) continue;
        let ok = true;
        for (let k = 0; k < r; k++) if (g[k][c] === s) ok = false;
        if (!ok) continue;
        g[r][c] = s;
        if (rec(i + 1)) return true;
        g[r][c] = -1;
      }
      return false;
    };
    RM.need(rec(0));
    return g;
  }

  RM.register({
    id: 'sudoku',
    name: 'Big Latin square',
    difficulty: 7,
    generate(rng, variant) {
      const set = SETS[variant % 4];
      const perm = rng.shuffle(RM.range(6));
      const sy = (i) => set[perm[i]];
      const nm = (i) => `${FN[sy(i)[1]]} ${SN[sy(i)[0]] || sy(i)[0]}`;
      const nb = (i) => `<b>${nm(i)}</b>`;
      const g = latin(rng);
      const blk = (pr, pc) => [g[2 * pr][2 * pc], g[2 * pr][2 * pc + 1], g[2 * pr + 1][2 * pc], g[2 * pr + 1][2 * pc + 1]];
      const panels = [];
      for (let pr = 0; pr < 3; pr++) for (let pc = 0; pc < 3; pc++) if (pr < 2 || pc < 2) panels.push({ c: blk(pr, pc) });
      const ans = blk(2, 2);

      /* the missing cells: candidates from their row and column, then exact solving */
      const R = [4, 5].map((r) => RM.range(6).filter((s) => !g[r].slice(0, 4).includes(s)));
      const C = [4, 5].map((c) => RM.range(6).filter((s) => ![0, 1, 2, 3].some((r) => g[r][c] === s)));
      const cand = [[R[0], C[0]], [R[0], C[1]], [R[1], C[0]], [R[1], C[1]]].map(([a, b]) => a.filter((s) => b.includes(s)));
      let nsol = 0;
      cand[0].forEach((a) => cand[1].forEach((b) => cand[2].forEach((c) => cand[3].forEach((d) => {
        if (a !== b && c !== d && a !== c && b !== d) nsol++;
      }))));
      RM.need(nsol === 1);
      RM.need(cand.some((c) => c.length === 2)); // at least one cell needs elimination
      /* the "4 different symbols in every panel" reading must be dead; no visible panel equals the answer */
      RM.need(panels.filter((p) => new Set(p.c).size < 4).length >= 3);
      RM.need(panels.every((p) => !RM.sameArr(p.c, ans)));

      /* distractors */
      const nv = (x) => {
        let n = 0;
        x.forEach((s, k) => {
          const r = 4 + (k >> 1);
          const c = 4 + (k & 1);
          if (g[r].slice(0, 4).includes(s) || x[k ^ 1] === s || [0, 1, 2, 3].some((rr) => g[rr][c] === s) || x[k ^ 2] === s) n++;
        });
        return n;
      };
      const why = (x) => {
        const out = [];
        x.forEach((s, k) => {
          const r = 4 + (k >> 1);
          const c = 4 + (k & 1);
          const j = g[r].slice(0, 4).indexOf(s);
          if (j >= 0) out.push(`the ${nm(s)} in the ${POS[k]} cell is already in big row ${r + 1} (column ${j + 1})`);
          else if (x[k ^ 1] === s && !(k & 1)) out.push(`the ${nm(s)} appears twice in big row ${r + 1}`);
          const i = [0, 1, 2, 3].find((rr) => g[rr][c] === s);
          if (i !== undefined) out.push(`the ${nm(s)} in the ${POS[k]} cell is already in big column ${c + 1} (row ${i + 1})`);
          else if (x[k ^ 2] === s && k < 2) out.push(`the ${nm(s)} appears twice in big column ${c + 1}`);
        });
        return out;
      };
      const pool = { P: [], S: [], D: [] };
      const seen = new Set([ans.join()]);
      PERMS.forEach((p) => {
        const x = p.map((i) => ans[i]);
        if (seen.has(x.join())) return;
        seen.add(x.join());
        pool.P.push({ x, tag: TAGS[p.join()] || 'the right symbols in the wrong cells' });
      });
      for (let k = 0; k < 4; k++)
        for (let s = 0; s < 6; s++) {
          if (s === ans[k]) continue;
          const x = ans.slice();
          x[k] = s;
          if (!seen.has(x.join())) { seen.add(x.join()); pool.S.push({ x }); }
        }
      for (let a = 0; a < 4; a++)
        for (let b = a + 1; b < 4; b++)
          for (let s = 0; s < 6; s++)
            for (let t = 0; t < 6; t++) {
              if (s === ans[a] || t === ans[b]) continue;
              const x = ans.slice();
              x[a] = s;
              x[b] = t;
              if (!seen.has(x.join())) { seen.add(x.join()); pool.D.push({ x }); }
            }
      pool.P = pool.P.filter((c) => nv(c.x) > 0);
      pool.S = pool.S.filter((c) => nv(c.x) > 0);
      pool.D = pool.D.filter((c) => nv(c.x) > 0 && nv(c.x) <= 3);
      RM.need(pool.P.length >= 5 && pool.S.length >= 8 && pool.D.length >= 8);
      let chosen = null;
      for (let t = 0; t < 40 && !chosen; t++) {
        const nP = rng.int(2, 3);
        const nS = rng.int(2, 3);
        const pick = rng.sample(pool.P, nP).concat(rng.sample(pool.S, nS), rng.sample(pool.D, 7 - nP - nS));
        const all = [ans].concat(pick.map((c) => c.x));
        const cnt = RM.range(4).map(() => ({}));
        all.forEach((o) => o.forEach((s, p) => (cnt[p][s] = (cnt[p][s] || 0) + 1)));
        const sc = all.map((o) => o.reduce((a, s, p) => a + cnt[p][s], 0));
        if (Math.max(...sc.slice(1)) >= sc[0]) chosen = pick; // the answer is not simply the "consensus" option
      }
      RM.need(chosen);

      const render = (sp) => {
        const pic = new RM.Pic();
        RM.line(pic, 50, 6, 50, 94, { sw: 1.2, color: RM.LIGHT, cap: 'butt' });
        RM.line(pic, 6, 50, 94, 50, { sw: 1.2, color: RM.LIGHT, cap: 'butt' });
        sp.c.forEach((s, k) => RM.shape(pic, sy(s)[0], CX[k], CY[k], 16, { fill: sy(s)[1], sw: 2 }));
        return pic.svg();
      };
      const key = (sp) => sp.c.join('');

      /* correction */
      const setTxt = (a) => a.map(nb).join(' and ');
      const cellN = ['(row 5, column 5)', '(row 5, column 6)', '(row 6, column 5)', '(row 6, column 6)'];
      const rules = [
        { k: 'Grid', t: 'put the 9 panels together: each panel is a <b>2×2 block</b>, so the matrix is one <b>6×6 grid</b>. The missing panel is the bottom-right block: big rows 5–6, big columns 5–6.' },
        { k: 'Rule', t: 'in the <b>big grid</b>, each of the 6 big rows and each of the 6 big columns contains each of the 6 symbols <b>exactly once</b> (a Latin square). Inside a single panel symbols may repeat — only the big lines count. Check it on the complete big rows 1–4.' },
        { k: 'What is missing', t: `big row 5 lacks ${setTxt(R[0])}; big row 6 lacks ${setTxt(R[1])}; big column 5 lacks ${setTxt(C[0])}; big column 6 lacks ${setTxt(C[1])}.` },
        {
          k: 'Cells',
          t: 'a cell needs a symbol missing from both its row and its column: ' +
            cand.map((c, k) => `${cellN[k]}: ${c.map(nb).join(' or ')}`).join('; ') +
            `. Only one choice makes the two rows and the two columns of the block complete, without repeating a symbol inside them.`,
        },
        { k: 'Answer', t: `top row of the block: ${nb(ans[0])}, ${nb(ans[1])}; bottom row: ${nb(ans[2])}, ${nb(ans[3])}.` },
      ];
      const opts = chosen.map((c) => ({
        spec: { c: c.x },
        flaws: (c.tag ? [`this is ${c.tag}, which breaks the rows/columns`] : []).concat(why(c.x).slice(0, 2)),
      }));
      return {
        difficulty: 7,
        hint: 'ignore the panel borders: only the long rows and columns of the 6×6 grid matter.',
        panels,
        answer: { c: ans },
        options: [{ spec: { c: ans }, flaws: [] }].concat(opts),
        render,
        key,
        rules,
      };
    },
  });
})();
