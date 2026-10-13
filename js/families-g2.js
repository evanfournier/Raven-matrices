/* Elite families (g2): operator-key, toggle-grid, if-then — set G "Codes & conditions". */
(function () {
  'use strict';
  const RM = window.RM;
  const { nm } = RM;
  const bkey = (a) => a.map((x) => (x ? 1 : 0)).join('');

  /* ================================================================ Operator key */
  const deg = Math.PI / 180;
  function hexPts(cx, cy, R) {
    return RM.range(6).map((k) => [cx + R * Math.cos((60 * k - 90) * deg), cy + R * Math.sin((60 * k - 90) * deg)]);
  }
  const FLOWER = [[48, 55]].concat(RM.range(6).map((k) => [48 + 20.8 * Math.cos((60 * k - 30) * deg), 55 + 20.8 * Math.sin((60 * k - 30) * deg)]));
  const PATCH = [];
  for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) PATCH.push([20 + (r % 2) * 8.66 + i * 17.32, 37 + r * 15]);
  const KEYSYM = { triangle: '▲', circle: '●', square: '■' };
  RM.register({
    id: 'operator-key',
    name: 'Operator key',
    difficulty: 6,
    generate(rng, variant) {
      const v = variant % 4;
      const cells = v === 3 ? PATCH : FLOWER;
      const R = v === 3 ? 10 : 12;
      const N = cells.length;
      const opNames = [['xor', 'or'], ['xor', 'and'], ['or', 'andnot'], ['xor', 'and']][v];
      const keys = rng.sample(['triangle', 'circle', 'square'], 2);
      const ops = rng.shuffle(opNames);
      const k3 = rng.int(0, 1);
      const rowKey = [0, 1, k3];
      const rows = rowKey.map((ki) => {
        const f = RM.BOOL[ops[ki]].f;
        const A = RM.range(N).map(() => rng.chance(0.5));
        const B = RM.range(N).map(() => rng.chance(0.5));
        const C = A.map((x, i) => f(x, B[i]));
        RM.need(C.some(Boolean) && !C.every(Boolean) && bkey(C) !== bkey(A) && bkey(C) !== bkey(B));
        return [A, B, C];
      });
      // each of rows 1–2 shows every input combination, so its operation is fully determined
      [0, 1].forEach((r) => {
        const cls = new Set(rows[r][0].map((x, i) => (x ? 1 : 0) + 2 * (rows[r][1][i] ? 1 : 0)));
        RM.need(cls.size === 4);
      });
      // no single operation explains both rows (the key matters)
      RM.need(!RM.ALL_BOOL.some((f) => [0, 1].every((r) => rows[r][0].every((x, i) => f(x, rows[r][1][i]) === rows[r][2][i]))));
      const [A3, B3, C3] = rows[2];
      const otherOp = RM.BOOL[ops[1 - k3]].f;
      const alt = A3.map((x, i) => otherOp(x, B3[i]));
      RM.need(bkey(alt) !== bkey(C3));
      const only1 = RM.range(N).filter((i) => A3[i] && !B3[i]);
      const only2 = RM.range(N).filter((i) => !A3[i] && B3[i]);
      RM.need(only1.length && only2.length);
      const i1 = rng.pick(only1);
      const i2 = rng.pick(only2);
      const OPTXT = {
        xor: 'keep the cells that are black in <b>exactly one</b> of the two panels',
        or: 'keep <b>every</b> cell that is black in either panel',
        and: 'keep only the cells black in <b>both</b> panels',
        andnot: 'take the 1st panel and <b>remove</b> the cells that are black in the 2nd',
      };
      const mk = (on, key) => ({ on, key: key || null });
      return {
        difficulty: v === 3 ? 7 : 6,
        hint: 'the middle panels carry a small instruction.',
        panels: RM.flat(rows.map((r, ri) => [mk(r[0]), mk(r[1], keys[rowKey[ri]]), mk(r[2])])),
        answer: mk(C3),
        key: (s) => bkey(s.on) + (s.key || ''),
        render(sp) {
          const pic = new RM.Pic();
          cells.forEach(([x, y], i) => RM.polygon(pic, hexPts(x, y, R), { fill: sp.on[i] ? 'black' : 'white', sw: 1.6 }));
          if (sp.key) RM.shape(pic, sp.key, 88, 11, 5.5, { fill: 'black', sw: 0.8 });
          return pic.svg();
        },
        perturb: [
          { apply: (s) => ((s.on = alt.slice()), s), why: `this uses the operation of the other symbol (${KEYSYM[keys[1 - k3]]})` },
          { apply: (s) => ((s.on[i1] = !s.on[i1]), s), why: 'a cell that is black only in the 1st panel is handled wrongly' },
          { apply: (s) => ((s.on[i2] = !s.on[i2]), s), why: 'a cell that is black only in the 2nd panel is handled wrongly' },
        ],
        rules: [
          { k: 'Key', t: `the small symbol in the 2nd panel tells which operation builds the 3rd panel, cell by cell: ${KEYSYM[keys[0]]} = ${OPTXT[ops[0]]}; ${KEYSYM[keys[1]]} = ${OPTXT[ops[1]]}.` },
          { k: 'Answer', t: `row 3 shows <b>${KEYSYM[keys[k3]]}</b>, so ${OPTXT[ops[k3]]}.` },
        ],
      };
    },
  });

  /* ================================================================ Lights out */
  const PATTERNS = [
    { o: [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]], t: 'the pressed lamp and its 4 neighbours (up, down, left, right)', c: true },
    { o: [[0, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]], t: 'the pressed lamp and its 4 diagonal neighbours', c: true },
    { o: [[1, 0], [-1, 0], [0, 1], [0, -1]], t: 'the 4 neighbours of the pressed lamp (up, down, left, right) — but not the pressed lamp itself', c: false },
    { o: [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]], t: 'the whole 3×3 block around the pressed lamp', c: true },
  ];
  function press(on, ps, offs) {
    const out = on.slice();
    ps.forEach((p) => {
      const x = p % 5;
      const y = Math.floor(p / 5);
      offs.forEach(([dx, dy]) => {
        const X = x + dx;
        const Y = y + dy;
        if (X >= 0 && X < 5 && Y >= 0 && Y < 5) out[Y * 5 + X] = !out[Y * 5 + X];
      });
    });
    return out;
  }
  const ALL_OFF = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) ALL_OFF.push([dx, dy]);
  RM.register({
    id: 'toggle-grid',
    name: 'Lights out',
    difficulty: 6,
    generate(rng, variant) {
      const v = variant % 4;
      const P = PATTERNS[v];
      const rows = RM.range(3).map((r) => {
        const on = RM.range(25).map(() => rng.chance(0.4));
        const ps = rng.sample(RM.range(25), r < 2 ? rng.int(2, 3) : 2);
        const res = press(on, ps, P.o);
        RM.need(bkey(res) !== bkey(on));
        return { on, ps, res };
      });
      // every neighbourhood (subset of the 3×3 block) fitting rows 1–2 must agree on row 3
      const preds = new Set();
      for (let m = 1; m < 512; m++) {
        const offs = ALL_OFF.filter((_, i) => m & (1 << i));
        if ([0, 1].every((r) => bkey(press(rows[r].on, rows[r].ps, offs)) === bkey(rows[r].res))) preds.add(bkey(press(rows[2].on, rows[2].ps, offs)));
      }
      RM.need(preds.size === 1 && preds.has(bkey(rows[2].res)));
      const R3 = rows[2];
      const ans = R3.res;
      // mistake cells: A = the pressed lamps themselves, B = one neighbour of one press, C = an overlap (or any other lamp)
      const A = R3.ps.slice();
      const nb = [];
      R3.ps.forEach((p) =>
        P.o.forEach(([dx, dy]) => {
          if (!dx && !dy) return;
          const X = (p % 5) + dx;
          const Y = Math.floor(p / 5) + dy;
          if (X >= 0 && X < 5 && Y >= 0 && Y < 5 && !A.includes(Y * 5 + X)) nb.push(Y * 5 + X);
        })
      );
      RM.need(nb.length);
      const B = rng.pick(nb);
      const cover = {};
      nb.forEach((c) => (cover[c] = (cover[c] || 0) + 1));
      const overlaps = Object.keys(cover).filter((c) => cover[c] > 1 && +c !== B).map(Number);
      const rest = RM.range(25).filter((c) => !A.includes(c) && c !== B);
      const C = overlaps.length ? overlaps[0] : rng.pick(rest);
      const cWhy = overlaps.length ? 'a lamp switched by two presses should be switched twice (back to how it was)' : 'a lamp that no press reaches has changed';
      const L = (on) => ({ kind: 'L', on });
      return {
        difficulty: v === 3 ? 7 : 6,
        hint: 'the middle panel shows where someone pressed.',
        panels: RM.flat(rows.map((r) => [L(r.on), { kind: 'P', ps: r.ps }, L(r.res)])),
        answer: L(ans),
        key: (s) => (s.kind === 'L' ? bkey(s.on) : 'P' + s.ps.join(',')),
        render(sp) {
          const pic = new RM.Pic();
          const c = (i) => [18 + (i % 5) * 16, 18 + Math.floor(i / 5) * 16];
          if (sp.kind === 'L') {
            sp.on.forEach((on, i) => RM.circle(pic, c(i)[0], c(i)[1], 6, { fill: on ? 'black' : 'white', sw: 1.6 }));
          } else {
            RM.range(25).forEach((i) => RM.circle(pic, c(i)[0], c(i)[1], 1.6, { fill: 'gray', sw: 0 }));
            sp.ps.forEach((i) => {
              const [x, y] = c(i);
              RM.line(pic, x - 5.5, y - 5.5, x + 5.5, y + 5.5, { sw: 3.2 });
              RM.line(pic, x - 5.5, y + 5.5, x + 5.5, y - 5.5, { sw: 3.2 });
            });
          }
          return pic.svg();
        },
        perturb: [
          { apply: (s) => (A.forEach((i) => (s.on[i] = !s.on[i])), s), why: P.c ? 'the pressed lamps themselves should also switch' : 'the pressed lamps themselves should not change' },
          { apply: (s) => ((s.on[B] = !s.on[B]), s), why: 'one lamp next to a press was not switched' },
          { apply: (s) => ((s.on[C] = !s.on[C]), s), why: cWhy },
        ],
        rules: [
          { k: 'Pressing', t: `each × in the middle panel is a press. A press switches (on ↔ off) <b>${P.t}</b>.` },
          { k: 'Overlaps', t: 'a lamp reached by two presses is switched twice, so it ends as it started.' },
          { k: 'Answer', t: 'apply the presses of row 3 to its first panel.' },
        ],
      };
    },
  });

  /* ================================================================ If-then */
  const CONT = ['circle', 'square', 'triangle'];
  const effText = (e) => (e.t === 'add' ? (e.k > 0 ? `gain ${e.k}` : `lose ${-e.k}`) : e.t === 'mul' ? 'double' : 'are halved');
  const effApply = (e, n) => (e.t === 'add' ? n + e.k : e.t === 'mul' ? n * 2 : n % 2 ? null : n / 2);
  RM.register({
    id: 'if-then',
    name: 'If-then',
    difficulty: 6,
    generate(rng, variant) {
      const v = variant % 4;
      const pool = [1, 2, 3, -1, -2].map((k) => ({ t: 'add', k }));
      let effs = rng.sample(pool, 3);
      if (v === 3) effs = [{ t: 'mul' }].concat(rng.sample(pool, 2));
      effs = rng.shuffle(effs);
      const E = {};
      CONT.forEach((c, i) => (E[c] = effs[i]));
      let Cg;
      if (v === 2) {
        const starts = [rng.int(0, 2), rng.int(0, 2), rng.int(0, 2)];
        Cg = RM.grid3((r, c) => CONT[(starts[r] + c) % 3]);
      } else Cg = RM.latinGrid(rng, rng.shuffle(CONT));
      const Mk = RM.latinGrid(rng, rng.shuffle(['star4', 'diamond', 'cross']));
      const Ng = RM.range(3).map((r) => {
        const n = [rng.int(1, 6)];
        n.push(effApply(E[Cg[r][0]], n[0]));
        n.push(n[1] === null ? null : effApply(E[Cg[r][1]], n[1]));
        RM.need(n.every((x) => x !== null && x >= 1 && x <= 9));
        return n;
      });
      // hypotheses: the change depends on the source container / destination container / source mark /
      // destination mark / the column / nothing — each learned from the transitions of rows 1–2
      const F = [];
      for (let k = -4; k <= 4; k++) if (k) F.push((n) => n + k);
      F.push((n) => n * 2, (n) => n * 3, (n) => (n % 2 ? NaN : n / 2));
      const trans = [];
      [0, 1].forEach((r) => [0, 1].forEach((c) => trans.push({ r, c, src: Cg[r][c], dst: Cg[r][c + 1], ms: Mk[r][c], md: Mk[r][c + 1], a: Ng[r][c], b: Ng[r][c + 1] })));
      const q = { r: 2, c: 1, src: Cg[2][1], dst: Cg[2][2], ms: Mk[2][1], md: Mk[2][2], a: Ng[2][1] };
      const preds = new Set();
      let intended = null;
      [(x) => x.src, (x) => x.dst, (x) => x.ms, (x) => x.md, (x) => x.c, () => 0].forEach((kf, h) => {
        const groups = {};
        trans.forEach((x) => (groups[kf(x)] = groups[kf(x)] || []).push(x));
        const ok = Object.values(groups).every((g) => F.some((f) => g.every((x) => f(x.a) === x.b)));
        if (!ok) return;
        const g = groups[kf(q)];
        if (!g) return;
        const fits = F.filter((f) => g.every((x) => f(x.a) === x.b));
        const vals = new Set(fits.map((f) => f(q.a)));
        vals.forEach((x) => preds.add(x));
        if (h === 0) intended = vals;
      });
      const ans = Ng[2][2];
      RM.need(intended && intended.size === 1 && intended.has(ans) && preds.size === 1);
      RM.needNoConflict(Ng, ans, 'numeric');
      const altCands = CONT.filter((c) => c !== q.src).map((c) => effApply(E[c], q.a)).filter((x) => x !== null && x >= 1 && x <= 9 && x !== ans);
      RM.need(altCands.length);
      const altN = altCands[0];
      const bump = ans + 1 <= 9 ? 1 : -1;
      const altC = Cg[2][0] !== Cg[2][2] ? Cg[2][0] : Cg[2][1];
      const effList = CONT.map((c) => `in a ${c} the dots ${effText(E[c])}`).join('; ');
      return {
        difficulty: v === 3 ? 7 : 6,
        hint: 'the container decides what happens to its dots on the way to the next panel.',
        panels: RM.flat(RM.grid3((r, c) => ({ cont: Cg[r][c], n: Ng[r][c], m: Mk[r][c] }))),
        answer: { cont: Cg[2][2], n: ans, m: Mk[2][2] },
        render(sp) {
          const pic = new RM.Pic();
          RM.shape(pic, sp.cont, 50, 53, 36, { fill: 'white', sw: 2.2 });
          const cy = sp.cont === 'triangle' ? 64 : 53;
          const sc = sp.cont === 'triangle' ? 0.36 : 0.45;
          const L = RM.countLayout(sp.n);
          L.pts.forEach(([x, y]) => RM.circle(pic, 50 + (x - 50) * sc, cy + (y - 50) * sc, 3.4, { fill: 'black', sw: 0 }));
          RM.shape(pic, sp.m, 10, 10, 5, { fill: 'black', sw: 0.6 });
          return pic.svg();
        },
        perturb: [
          { apply: (s) => ((s.n = altN), s), why: `${altN} dots: the rule of another container was used` },
          { apply: (s) => (s.n + bump >= 1 && s.n + bump <= 9 ? ((s.n += bump), s) : null), why: 'one dot too many or too few' },
          { apply: (s) => ((s.cont = altC), s), why: `the container should be a ${Cg[2][2]}` },
        ],
        rules: [
          { k: 'Condition', t: `on the way to the next panel, what happens to the dots depends on the container they are in: ${effList}.` },
          { k: 'Containers', t: v === 2 ? 'the containers follow the cycle circle → square → triangle → circle along each row.' : 'each container appears once in every row and column.' },
          { k: 'Answer', t: `row 3: the 2nd panel has ${q.a} dots in a ${q.src}, so they ${effText(E[q.src])} → <b>${ans} dots</b> in a <b>${Cg[2][2]}</b>.` },
          { k: 'Corner mark', t: 'the small corner symbol only follows a distribution of three (each once per row and column).' },
        ],
      };
    },
  });
  void nm;
})();
