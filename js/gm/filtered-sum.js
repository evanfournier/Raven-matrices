/* What counts (grandmaster): every panel holds a mixed collection of items (3 shapes x black/white x small/large). Only ONE
 * class of items "counts" (a single attribute value such as "black", or a pair such as "large triangles"): in every row the
 * number of such items in panel 1 plus (variants 0, 1) or minus (variants 2, 3) the number in panel 2 equals the number in
 * panel 3. Everything else follows a separate rule: every panel of a row holds the same number of non-counting items
 * (a different number in each row). Checked in code: over all 23 single / pair classes, the "all items" class and the
 * complement of each, exactly one (class, sum/difference/reverse difference) fits rows 1-2, and no other listed numeric
 * rule fits any class count grid and predicts a count that differs from the answer panel. */
(function () {
  'use strict';
  const RM = window.RM;

  const SHAPES = ['circle', 'square', 'triangle', 'diamond'];
  const VALS = { s: null, f: ['black', 'white'], z: ['small', 'large'] };
  const KEYS = ['s', 'f', 'z'];
  const PLUR = { circle: 'circles', square: 'squares', triangle: 'triangles', diamond: 'diamonds' };
  const POS = [22, 50, 78];
  const OPF = { sum: (a, b) => a + b, diff: (a, b) => a - b, rdiff: (b, a) => a - b };

  RM.register({
    id: 'filtered-sum',
    name: 'What counts',
    difficulty: 8,
    generate(rng, variant) {
      const shapes = rng.sample(SHAPES, 3);
      const V = { s: shapes, f: VALS.f, z: VALS.z };
      const types = [];
      for (const s of shapes) for (const f of V.f) for (const z of V.z) types.push({ s, f, z });
      const match = (K, it) => Object.keys(K.a).every((k) => it[k] === K.a[k]);

      const classes = [];
      for (const k of KEYS) for (const v of V[k]) classes.push({ a: { [k]: v } });
      for (let i = 0; i < 3; i++)
        for (let j = i + 1; j < 3; j++) for (const v1 of V[KEYS[i]]) for (const v2 of V[KEYS[j]]) classes.push({ a: { [KEYS[i]]: v1, [KEYS[j]]: v2 } });
      classes.push({ a: {} });

      const dbl = variant === 1 || variant === 3;
      const op = variant >= 2 ? 'diff' : 'sum';
      let K0;
      if (dbl) {
        const ks = rng.sample(KEYS, 2).sort();
        K0 = { a: { [ks[0]]: rng.pick(V[ks[0]]), [ks[1]]: rng.pick(V[ks[1]]) } };
      } else {
        const k = rng.pick(KEYS);
        K0 = { a: { [k]: rng.pick(V[k]) } };
      }
      const k0i = classes.findIndex((K) => JSON.stringify(K.a) === JSON.stringify(K0.a));
      const noun = (K) => {
        const a = K.a;
        return (a.z ? a.z + ' ' : '') + (a.f ? a.f + ' ' : '') + (a.s ? PLUR[a.s] : 'items');
      };
      const nm = noun(K0);
      const IN = types.filter((t) => match(K0, t));
      const OUT = types.filter((t) => !match(K0, t));

      /* counting-class counts per row and non-counting counts */
      const rows = [];
      let guard = 0;
      while (rows.length < 3 && guard++ < 50) {
        let a, b, c;
        if (op === 'sum') {
          a = rng.int(1, 3);
          b = rng.int(1, 3);
          c = a + b;
        } else {
          b = rng.int(1, 2);
          c = rng.int(1, 3);
          a = b + c;
        }
        if (rows.some((r) => r[0] === a && r[1] === b)) continue;
        rows.push([a, b, c]);
      }
      RM.need(rows.length === 3);
      const ks = rng.shuffle([1, 2, 3, 4]).slice(0, 3);
      RM.need(rows.every((r, i) => Math.max(...r) + ks[i] <= 8));

      const compose = (cnt, kk) => {
        const its = [];
        const draw = (arr, n) => {
          let bag = [];
          while (bag.length < n) bag = bag.concat(rng.shuffle(arr));
          return bag.slice(0, n);
        };
        draw(IN, cnt).forEach((t) => its.push(Object.assign({}, t)));
        draw(OUT, kk).forEach((t) => its.push(Object.assign({}, t)));
        const cells = rng.sample([0, 1, 2, 3, 4, 5, 6, 7, 8], its.length).sort((x, y) => x - y);
        const sh = rng.shuffle(its);
        sh.forEach((it, i) => (it.p = cells[i]));
        return { it: sh };
      };

      const nz = (K) => {
        const ks = Object.keys(K.a);
        return ks.length === 2 || (ks.length === 1 && ks[0] === 's');
      };
      const compRow = (r) => [0, 1, 2].map((c) => compose(rows[r][c], ks[r]));
      const cntOf = (sp) =>
        classes.map((K) => {
          const n = sp.it.filter((it) => match(K, it)).length;
          return [n, sp.it.length - n];
        });
      const rowFit = (row) => {
        const cn = row.map(cntOf);
        const set = new Set();
        classes.forEach((K, i) =>
          [0, 1].forEach((cm) => {
            if (cm && !nz(K)) return;
            const m = cn.map((x) => x[i][cm]);
            for (const o of Object.keys(OPF)) if (OPF[o](m[0], m[1]) === m[2]) set.add(i + ':' + cm + ':' + o);
          })
        );
        return set;
      };
      const want = k0i + ':0:' + op;
      let best = null;
      for (let t = 0; t < 30; t++) {
        const row = compRow(0);
        const f = rowFit(row);
        if (f.has(want) && (!best || f.size < best.f.size)) best = { row, f };
      }
      RM.need(best);
      let row1 = null;
      for (let t = 0; t < 150 && !row1; t++) {
        const row = compRow(1);
        const f = rowFit(row);
        if (f.has(want) && [...f].every((x) => x === want || !best.f.has(x))) row1 = row;
      }
      RM.need(row1);
      let grid = null;
      for (let tr = 0; tr < 10 && !grid; tr++) {
        const r2 = compRow(2);
        for (let tj = 0; tj < 250 && !grid; tj++) {
          const gr = [best.row, row1, [r2[0], r2[1], compose(rows[2][2], ks[2])]];
          const cn = gr.map((row) => row.map(cntOf));
          let ok = true;
          for (let i = 0; ok && i < classes.length; i++)
            for (let cm = 0; cm < 2 && ok; cm++) {
              if (cm && !nz(classes[i])) continue;
              const m = cn.map((row) => row.map((x) => x[i][cm]));
              const w2 = m[2][2];
              m[2][2] = undefined;
              if (!RM.unique(m, w2, 'numeric', undefined, true)) ok = false;
            }
          if (ok) grid = gr;
        }
      }
      RM.need(grid);

      const panels = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (r < 2 || c < 2) panels.push(grid[r][c]);
      const answer = grid[2][2];
      const [a2, b2, cc] = rows[2];
      const kk = ks[2];
      const formula = op === 'sum' ? `${a2} + ${b2} = ${cc}` : `${a2} − ${b2} = ${cc}`;

      /* distractors: (count of the counting class, count of the others) */
      const pool = [];
      const tempC = new Set([a2, b2, a2 + b2, Math.abs(a2 - b2), rows[0][2], rows[1][2]]);
      const tempK = new Set([ks[0], ks[1], kk - 1, kk + 1]);
      for (let c = 0; c <= 6; c++)
        for (let k = 0; k <= 5; k++) {
          if (c + k > 8 || c + k < 2 || (c === cc && k === kk)) continue;
          const sc = (tempC.has(c) ? 2 : 0) + (tempK.has(k) ? 2 : 0) + (Math.abs(c - cc) + Math.abs(k - kk) <= 2 ? 1 : 0) + rng.next() * 1.5;
          pool.push({ c, k, sc });
        }
      pool.sort((x, y) => y.sc - x.sc);
      const chosen = [];
      const takeFrom = (f, n) => {
        for (const x of pool) if (n > 0 && !chosen.includes(x) && f(x)) (chosen.push(x), n--);
      };
      takeFrom((x) => x.k === kk, 2);
      takeFrom((x) => x.c === cc, 2);
      takeFrom(() => true, 7 - chosen.length);
      RM.need(chosen.length === 7);
      const flawsOf = (c, k) => {
        const fl = [];
        if (c !== cc) fl.push(`it has ${c} ${nm}; the counting rule gives ${cc} for this panel (${formula})`);
        if (k !== kk) fl.push(`it has ${k} other items (not ${nm}); every panel of row 3 holds exactly ${kk} of them`);
        return fl;
      };
      const options = [{ spec: answer, flaws: [] }].concat(chosen.map((x) => ({ spec: compose(x.c, x.k), flaws: flawsOf(x.c, x.k) })));

      const opTxt = op === 'sum' ? 'the number in the 1st panel <b>plus</b> the number in the 2nd panel equals the number in the 3rd' : 'the number in the 1st panel <b>minus</b> the number in the 2nd panel equals the number in the 3rd';
      const rowTxt = (r) => (op === 'sum' ? `${rows[r][0]} + ${rows[r][1]} = ${rows[r][2]}` : `${rows[r][0]} − ${rows[r][1]} = ${rows[r][2]}`);
      const rules = [
        { k: 'What counts', t: `only one kind of item takes part in the arithmetic: <b>${nm}</b>. In every row, ${opTxt}. Row 1: ${rowTxt(0)}. Row 2: ${rowTxt(1)}. Counting every other kind (colour, size, shape, or any combination) gives no consistent rule.` },
        { k: 'The rest', t: `all items that are <b>not</b> ${nm} follow a separate rule: every panel of a row contains the <b>same number</b> of them — ${ks[0]} in row 1, ${ks[1]} in row 2, ${ks[2]} in row 3 (see the first two panels).` },
        { k: 'Row 3', t: `the first two panels hold ${a2} and ${b2} ${nm}, so the last one holds ${formula.split(' = ')[0]} = <b>${cc}</b> ${nm}, plus ${kk} other items.` },
        { k: 'Answer', t: `<b>${cc} ${nm} and ${kk} other items (${cc + kk} items in all)</b>. Which exact other items they are is free; only these two counts matter.` },
      ];
      const SZ = { small: 6.5, large: 11 };
      return {
        difficulty: 8,
        hint: 'Only one kind of item is added (or subtracted) across a row; the others obey something much simpler.',
        panels,
        answer,
        options,
        rules,
        key: (s) => JSON.stringify(s.it.map((i) => [i.s, i.f, i.z, i.p])),
        render(s) {
          const pic = new RM.Pic();
          for (const it of s.it) RM.shape(pic, it.s, POS[it.p % 3], POS[Math.floor(it.p / 3)], SZ[it.z], { fill: it.f, sw: 2 });
          return pic.svg();
        },
      };
    },
  });
})();
