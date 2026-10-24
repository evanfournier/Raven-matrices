/* Edge matching (grandmaster): every panel is a square cut by its diagonals into 4 triangles (top, right, bottom, left),
 * each with one of 4 fills. Neighbouring tiles must match edge to edge (right triangle = left triangle of the tile on
 * its right, bottom = top of the tile below). A hidden rule fixes the outer border of the whole matrix: the matrix
 * wraps around like a torus (v0), or every side has its own constant fill (v1), or one frame fill runs all round and
 * never appears inside (v2), or left/right wrap while top and bottom are constant (v3). The missing corner tile gets
 * left/top from its neighbours and right/bottom from the border rule. For each axis every border reading (constant
 * side, wrap-around, one frame fill) that fits the visible tiles must predict the same fill. */
(function () {
  'use strict';
  const RM = window.RM;
  const FILL = ['black', 'white', 'gray', 'lines:45:5:1.6'];
  const FN = ['black', 'white', 'grey', 'striped'];
  const SIDE = ['top', 'right', 'bottom', 'left'];
  const CFG = [
    { h: 'wrap', v: 'wrap' },
    { h: 'const', v: 'const' },
    { h: 'frame', v: 'frame' },
    { h: 'wrap', v: 'const' },
  ];
  const ROT = {
    '1,2,3,0': 'turned a quarter-turn anticlockwise',
    '3,0,1,2': 'turned a quarter-turn clockwise',
    '2,3,0,1': 'turned upside down',
    '0,3,2,1': 'mirrored left-right',
    '2,1,0,3': 'mirrored top-bottom',
  };

  RM.register({
    id: 'wang-tiles',
    name: 'Edge matching',
    difficulty: 7,
    generate(rng, variant) {
      const cfg = CFG[variant % 4];
      const fn = (i) => `<b>${FN[i]}</b>`;
      const F = rng.int(0, 3);
      const nin = (n) => (cfg.h === 'frame' ? rng.pick([0, 1, 2, 3].filter((x) => x !== F)) : rng.int(0, n));
      /* edges: h[r][c] = vertical edge left of column c (c = 0..3), v[c][r] = horizontal edge above row r */
      const sides = [0, 1, 2, 3].map(() => rng.int(0, 3));
      if (cfg.v === 'const') RM.need(sides[2] !== sides[3]);
      if (cfg.h === 'const' || cfg.v === 'const') RM.need(new Set(sides).size >= 3 || cfg.h !== cfg.v);
      const h = RM.range(3).map(() => {
        const e = [0, 1, 2, 3].map(() => nin(3));
        if (cfg.h === 'wrap') e[3] = e[0];
        else if (cfg.h === 'const') { e[0] = sides[0]; e[3] = sides[1]; } else { e[0] = F; e[3] = F; }
        return e;
      });
      const v = RM.range(3).map(() => {
        const e = [0, 1, 2, 3].map(() => nin(3));
        if (cfg.v === 'wrap') e[3] = e[0];
        else if (cfg.v === 'const') { e[0] = sides[2]; e[3] = sides[3]; } else { e[0] = F; e[3] = F; }
        return e;
      });
      const T = RM.range(3).map((r) => RM.range(3).map((c) => [v[c][r], h[r][c + 1], v[c][r + 1], h[r][c]]));
      const ans = T[2][2];
      const vis = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (r < 2 || c < 2) vis.push(T[r][c]);

      /* ---- identifiability: every border reading consistent with the visible tiles predicts the same fill ---- */
      const eq = (a) => a.every((x) => x === a[0]);
      const bord = [T[0][0][0], T[0][1][0], T[0][2][0], T[0][0][3], T[1][0][3], T[2][0][3], T[0][2][1], T[1][2][1], T[2][0][2], T[2][1][2]];
      const frameOk = eq(bord);
      const R = [];
      const B = [];
      if (eq([T[0][2][1], T[1][2][1]])) R.push(T[0][2][1]);
      if (T[0][2][1] === T[0][0][3] && T[1][2][1] === T[1][0][3]) R.push(T[2][0][3]);
      if (frameOk) R.push(bord[0]);
      if (eq([T[2][0][2], T[2][1][2]])) B.push(T[2][0][2]);
      if (T[2][0][2] === T[0][0][0] && T[2][1][2] === T[0][1][0]) B.push(T[0][2][0]);
      if (frameOk) B.push(bord[0]);
      RM.need(R.length && B.length && R.every((x) => x === ans[1]) && B.every((x) => x === ans[2]));
      /* quality: left/top neighbours alone leave the answer open; answer is no copy of a visible tile; tile shortcuts */
      RM.need(vis.every((t) => !RM.sameArr(t, ans)));
      const nd = (t) => new Set(t).size;
      if (eq(vis.map(nd))) RM.need(nd(ans) === nd(vis[0]));
      RM.need(nd(ans) >= 2);
      RM.need(new Set(T.flat().map((t) => t.join())).size >= 7);

      /* ---- distractors ---- */
      const hr = {
        wrap: `its right triangle sits on the right border, where the matrix wraps around: it must equal the left triangle of the first tile of this row (${fn(ans[1])})`,
        const: `its right triangle sits on the right border of the matrix, which is ${fn(ans[1])} all along`,
        frame: `its right triangle sits on the border of the matrix, which is ${fn(F)} all round`,
      };
      const vr = {
        wrap: `its bottom triangle sits on the bottom border, where the matrix wraps around: it must equal the top triangle of the first tile of this column (${fn(ans[2])})`,
        const: `its bottom triangle sits on the bottom border of the matrix, which is ${fn(ans[2])} all along`,
        frame: `its bottom triangle sits on the border of the matrix, which is ${fn(F)} all round`,
      };
      const why = (x) => {
        const out = [];
        if (x[3] !== ans[3]) out.push(`its left triangle is ${FN[x[3]]}, but the tile on its left ends with ${fn(ans[3])} on its right edge`);
        if (x[0] !== ans[0]) out.push(`its top triangle is ${FN[x[0]]}, but the tile above ends with ${fn(ans[0])} on its bottom edge`);
        if (x[1] !== ans[1]) out.push(hr[cfg.h]);
        if (x[2] !== ans[2]) out.push(vr[cfg.v]);
        return out;
      };
      const pool = { one: [], rot: [], two: [] };
      const seen = new Set([ans.join()]);
      Object.keys(ROT).forEach((k) => {
        const x = k.split(',').map((i) => ans[+i]);
        if (seen.has(x.join())) return;
        seen.add(x.join());
        pool.rot.push({ x, tag: ROT[k] });
      });
      for (let a = 0; a < 256; a++) {
        const x = [a & 3, (a >> 2) & 3, (a >> 4) & 3, (a >> 6) & 3];
        if (seen.has(x.join())) continue;
        const d = x.filter((s, i) => s !== ans[i]).length;
        if (d === 1) pool.one.push({ x });
        else if (d === 2) pool.two.push({ x });
      }
      RM.need(pool.one.length >= 6);
      let chosen = null;
      for (let t = 0; t < 40 && !chosen; t++) {
        const nr = Math.min(pool.rot.length, rng.int(1, 2));
        const no = Math.min(pool.one.length, rng.int(4, 5));
        const pick = rng.sample(pool.rot, nr).concat(rng.sample(pool.one, no), rng.sample(pool.two, 7 - nr - no));
        const all = [ans].concat(pick.map((c) => c.x));
        if (new Set(all.map((o) => o.join())).size < 8) continue;
        const cnt = RM.range(4).map(() => ({}));
        all.forEach((o) => o.forEach((s, p) => (cnt[p][s] = (cnt[p][s] || 0) + 1)));
        const sc = all.map((o) => o.reduce((a, s, p) => a + cnt[p][s], 0));
        // the border sides and the neighbour sides must both be tempting to break
        const wrongB = pick.filter((c) => c.x[0] === ans[0] && c.x[3] === ans[3]).length;
        const wrongN = pick.filter((c) => c.x[1] === ans[1] && c.x[2] === ans[2]).length;
        if (Math.max(...sc.slice(1)) >= sc[0] && wrongB >= 1 && wrongN >= 1) chosen = pick;
      }
      RM.need(chosen);

      const render = (sp) => {
        const pic = new RM.Pic();
        const P = [[4, 4], [96, 4], [96, 96], [4, 96]];
        const M = [50, 50];
        for (let i = 0; i < 4; i++) {
          // side i: top = P0-P1, right = P1-P2, bottom = P3-P2, left = P0-P3
          const [a, b] = [[P[0], P[1]], [P[1], P[2]], [P[3], P[2]], [P[0], P[3]]][i];
          RM.polygon(pic, [a, b, M], { fill: FILL[sp.t[i]], sw: 1.8 });
        }
        pic.add(`<rect x="4" y="4" width="92" height="92" fill="none" stroke="${RM.INK}" stroke-width="3"/>`);
        return pic.svg();
      };
      const key = (sp) => sp.t.join('');

      /* ---- correction ---- */
      const tn = (r, c) => `tile ${r + 1}.${c + 1}`;
      const ev = {
        wrap: (axis) => axis === 'h'
          ? `the matrix <b>wraps around</b> left-right: the right triangle of the last tile of a row equals the left triangle of the first tile of the same row (row 1: ${fn(T[0][0][3])} on both ends, row 2: ${fn(T[1][0][3])} on both ends)`
          : `the matrix <b>wraps around</b> top-bottom: the bottom triangle of the last tile of a column equals the top triangle of the first tile of the same column (column 1: ${fn(T[0][0][0])} at both ends, column 2: ${fn(T[0][1][0])} at both ends)`,
        const: (axis) => axis === 'h'
          ? `every triangle on the <b>right border</b> has the same fill (${fn(T[0][2][1])} in rows 1 and 2) and every triangle on the left border has its own constant fill (${fn(T[0][0][3])})`
          : `every triangle on the <b>bottom border</b> has the same fill (${fn(T[2][0][2])} in columns 1 and 2) and every triangle on the top border has its own constant fill (${fn(T[0][0][0])})`,
        frame: () => `the whole outer border of the matrix is one single fill, ${fn(F)}, and that fill is used nowhere inside`,
      };
      const rules = [
        { k: 'Tiles', t: 'each panel is a square cut by its two diagonals into <b>4 triangles</b> (top, right, bottom, left), each with one of 4 fills: black, white, grey, striped.' },
        { k: 'Matching', t: 'tiles touch like dominoes: the <b>right triangle</b> of a tile has the same fill as the <b>left triangle</b> of the tile on its right, and the <b>bottom triangle</b> has the same fill as the <b>top triangle</b> of the tile below (check any pair in the grid).' },
        {
          k: 'Border',
          t: cfg.h === 'frame'
            ? `the outer edge of the matrix follows a hidden rule: ${ev.frame()}.`
            : `the outer edge of the matrix follows a hidden rule — ${ev[cfg.h]('h')}; ${ev[cfg.v]('v')}.`,
        },
        { k: 'Left and top', t: `the missing tile touches ${tn(2, 1)} on its left, which ends with ${fn(ans[3])} on its right edge, and ${tn(1, 2)} above it, which ends with ${fn(ans[0])} at its bottom: so its <b>left triangle is ${FN[ans[3]]}</b> and its <b>top triangle is ${FN[ans[0]]}</b>.` },
        {
          k: 'Right and bottom',
          t: `its right and bottom sides lie on the outer border: ` +
            (cfg.h === 'wrap' ? `right = left triangle of ${tn(2, 0)} = ${fn(ans[1])}` : cfg.h === 'const' ? `right border = ${fn(ans[1])}` : `border = ${fn(F)}`) + '; ' +
            (cfg.v === 'wrap' ? `bottom = top triangle of ${tn(0, 2)} = ${fn(ans[2])}` : cfg.v === 'const' ? `bottom border = ${fn(ans[2])}` : `border = ${fn(F)}`) + '.',
        },
        { k: 'Answer', t: `top <b>${FN[ans[0]]}</b>, right <b>${FN[ans[1]]}</b>, bottom <b>${FN[ans[2]]}</b>, left <b>${FN[ans[3]]}</b>.` },
      ];
      return {
        difficulty: 7,
        hint: 'tiles must match their neighbours; for the outer edge, look at how the rows and columns begin and end.',
        panels: vis.map((t) => ({ t })),
        answer: { t: ans },
        options: [{ spec: { t: ans }, flaws: [] }].concat(
          chosen.map((c) => ({ spec: { t: c.x }, flaws: (c.tag ? [`this is the correct tile ${c.tag}`] : []).concat(why(c.x)) }))
        ),
        render,
        key,
        rules,
      };
    },
  });
})();
