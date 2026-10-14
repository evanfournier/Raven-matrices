/* Ladder lottery (grandmaster): every row is an amidakuji ("ghost leg"). Column 1 is a row of 4–5 distinct
 * symbols standing on the rails of the ladder drawn in column 2 (same x positions); each symbol travels along its
 * rail and must take every intact rung it meets (cross to the neighbouring rail, carry on); broken rungs (with a
 * gap) cannot be crossed. Column 3 shows the symbols in the order in which they arrive at the other end.
 * Variant 0: symbols slide DOWN, broken rungs must be ignored (showcase, ★7). Variant 1: no visual cue — rows 1–2
 * show that the symbols CLIMB from the bottom (inverse permutation), broken rungs too (★8). Variant 2: 4 rails, the
 * ladder is gone down TWICE (★8). Variant 3: the symbols are drawn at the bottom of column 1 and at the top of
 * column 3 — they climb up; broken rungs (★7). Every alternative reading (direction, broken rungs taken or not,
 * one / two / three passes, rungs taken column by column, a fixed reordering, a fixed shift…) is checked against
 * rows 1–2; every reading that survives must give the same answer. */
(function () {
  'use strict';
  const RM = window.RM;

  const SHP = ['circle', 'square', 'triangle', 'diamond', 'star5', 'cross', 'heart', 'hourglass'];
  const SNAME = { circle: 'circle', square: 'square', triangle: 'triangle', diamond: 'diamond', star5: 'star', cross: 'cross', heart: 'heart', hourglass: 'hourglass' };
  const FNAME = { black: 'black', white: 'white', gray: 'grey' };
  const ORDN = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'];
  const LV = 9; // rung levels
  const Y0 = 18;
  const DY = 8;
  const XS = { 4: [20, 40, 60, 80], 5: [15, 32.5, 50, 67.5, 85] };

  /* rung = { lv: level 0..8 (top→bottom), g: gap (between rail g and g+1, 0-based), br: broken? } */
  const SORT = {
    down: (a, b) => a.lv - b.lv,
    up: (a, b) => b.lv - a.lv,
    lr: (a, b) => a.g - b.g || a.lv - b.lv,
    rl: (a, b) => b.g - a.g || a.lv - b.lv,
  };
  const SETS = { solid: (r) => !r.br, all: () => true, broken: (r) => r.br };
  const swapAll = (arr, seq, times) => {
    const a = arr.slice();
    for (let t = 0; t < times; t++)
      for (const r of seq) {
        const x = a[r.g];
        a[r.g] = a[r.g + 1];
        a[r.g + 1] = x;
      }
    return a;
  };
  const seqRun = (arr, list, ord, times) => swapAll(arr, list.slice().sort(SORT[ord]), times);
  const run = (arr, rungs, ord, set, times) => seqRun(arr, rungs.filter(SETS[set]), ord, times);

  function ladderOk(n, rungs) {
    for (let g = 0; g < n - 1; g++) if (!rungs.some((r) => r.g === g)) return false;
    for (const a of rungs) for (const b of rungs) if (a !== b && a.g === b.g && Math.abs(a.lv - b.lv) === 1) return false;
    // two solid rungs in the same gap with nothing touching their rails in between cancel out: avoid
    const sol = rungs.filter((r) => !r.br);
    for (let i = 0; i < sol.length; i++)
      for (let j = i + 1; j < sol.length; j++) {
        if (sol[j].g !== sol[i].g) continue;
        if (!sol.slice(i + 1, j).some((r) => Math.abs(r.g - sol[i].g) === 1)) return false;
        break;
      }
    const p = run(RM.range(n), rungs, 'down', 'solid', 1);
    return p.filter((v, i) => v === i).length <= 1;
  }
  function makeLadder(rng, n, nS, nB) {
    for (let t = 0; t < 300; t++) {
      const lvs = rng.sample(RM.range(LV), nS + nB).sort((a, b) => a - b);
      const rungs = lvs.map((lv) => ({ lv, g: rng.int(0, n - 2), br: false }));
      rng.sample(RM.range(rungs.length), nB).forEach((i) => (rungs[i].br = true));
      if (ladderOk(n, rungs)) return rungs;
    }
    throw RM.RETRY;
  }

  const CFG = [
    { n: 5, dir: 'down', times: 1, cue: 'down', rows: [[[5, 1], [5, 2], [6, 1]], [[5, 1], [5, 2], [6, 1]], [[5, 2], [6, 1]]], diff: 7 },
    { n: 5, dir: 'up', times: 1, cue: 'none', rows: [[[5, 1], [6, 1]], [[5, 1], [6, 1]], [[6, 1]]], diff: 8 },
    { n: 4, dir: 'down', times: 2, cue: 'down', rows: [[[4, 0], [5, 0]], [[4, 0], [5, 0]], [[5, 0]]], diff: 8 },
    { n: 5, dir: 'up', times: 1, cue: 'up', rows: [[[5, 1], [5, 2], [6, 1]], [[5, 1], [5, 2], [6, 1]], [[5, 2], [6, 1]]], diff: 7 },
  ];

  RM.register({
    id: 'ghost-leg',
    name: 'Ladder lottery',
    difficulty: 7,
    generate(rng, variant) {
      const v = variant % 4;
      const cfg = CFG[v];
      const n = cfg.n;
      const T = cfg.times;
      const dir = cfg.dir;
      const other = dir === 'down' ? 'up' : 'down';

      /* symbols: distinct shapes, mixed fills */
      const shapes = rng.sample(SHP, n);
      let fills;
      do fills = shapes.map(() => rng.pick(['black', 'white', 'gray']));
      while (new Set(fills).size < 2 || fills.filter((f) => f === 'black').length > 3);
      const SYM = shapes.map((s, i) => ({ s, f: fills[i] }));
      const sym = (i) => `${FNAME[SYM[i].f]} ${SNAME[SYM[i].s]}`;
      const symB = (i) => `<b>${sym(i)}</b>`;
      const listOf = (o) => o.map(sym).join(', ');

      /* rows */
      const starts = [];
      while (starts.length < 3) {
        const o = rng.shuffle(RM.range(n));
        if (!starts.some((x) => RM.sameArr(x, o))) starts.push(o);
      }
      const ladders = [0, 1, 2].map((r) => {
        const [nS, nB] = rng.pick(cfg.rows[r]);
        return makeLadder(rng, n, nS, nB);
      });
      const ends = [0, 1, 2].map((r) => run(starts[r], ladders[r], dir, 'solid', T));
      const ans = ends[2];
      const same = (a, b) => !!a && !!b && RM.sameArr(a, b);

      /* quality: nothing trivial, no copy of a visible panel */
      [0, 1, 2].forEach((r) => RM.need(!same(ends[r], starts[r])));
      RM.need(!same(ends[0], ends[1]));
      RM.need(starts.every((s) => !same(s, ans)) && !same(ans, ends[0]) && !same(ans, ends[1]));
      RM.need(ans.filter((s, p) => starts[2][p] === s).length <= 1);

      /* rule identifiability: every reading that fits rows 1–2 must predict the same row 3 */
      const hyps = [];
      Object.keys(SORT).forEach((o) =>
        Object.keys(SETS).forEach((s) => [1, 2, 3].forEach((t) => hyps.push({ id: o + '/' + s + '/' + t, f: (r) => run(starts[r], ladders[r], o, s, t) })))
      );
      hyps.push({ id: 'none', f: (r) => starts[r].slice() });
      hyps.push({ id: 'reverse', f: (r) => starts[r].slice().reverse() });
      const m1 = ends[0].map((s) => starts[0].indexOf(s)); // same reordering of positions as row 1
      hyps.push({ id: 'samepos', f: (r) => m1.map((i) => starts[r][i]) });
      const mv = (cyc) => (r) => {
        const out = new Array(n).fill(-1);
        for (let s = 0; s < n; s++) {
          let p = starts[r].indexOf(s) + ends[0].indexOf(s) - starts[0].indexOf(s);
          if (cyc) p = RM.mod(p, n);
          if (p < 0 || p >= n || out[p] !== -1) return null;
          out[p] = s;
        }
        return out;
      };
      hyps.push({ id: 'samemove', f: mv(false) });
      hyps.push({ id: 'samemove-cyclic', f: mv(true) });
      const m2 = ends[1].map((s) => starts[1].indexOf(s)); // reorderings compose along the column
      hyps.push({ id: 'compose', f: (r) => (r < 2 ? ends[r] : m2.map((i) => starts[2][m1[i]])) });
      const fits = hyps.filter((h) => h.id !== 'compose' && same(h.f(0), ends[0]) && same(h.f(1), ends[1]));
      RM.need(fits.some((h) => h.id === dir + '/solid/' + T));
      RM.need(fits.every((h) => same(h.f(2), ans)));
      // decoy: a symbol that keeps its place in rows 1 and 2 must keep it in row 3 too
      for (let p = 0; p < n; p++) if (starts[0][p] === ends[0][p] && starts[1][p] === ends[1][p]) RM.need(starts[2][p] === ans[p]);
      /* one-symbol shortcuts: whenever rows 1–2 agree on one of these, row 3 must agree too (or the reading is void)
       *  - a symbol moves by the same number of places in rows 1 and 2;  - a symbol arrives at the same place in
       *  rows 1 and 2;  - the symbol arriving at place q came from the same start place in rows 1 and 2. */
      const at = (o, s) => o.indexOf(s);
      for (let s = 0; s < n; s++) {
        const d0 = at(ends[0], s) - at(starts[0], s);
        if (d0 === at(ends[1], s) - at(starts[1], s)) {
          const q = at(starts[2], s) + d0;
          if (q >= 0 && q < n) RM.need(ans[q] === s);
        }
        if (at(ends[0], s) === at(ends[1], s)) RM.need(at(ans, s) === at(ends[0], s));
      }
      for (let q = 0; q < n; q++) if (m1[q] === at(starts[1], ends[1][q])) RM.need(ans[q] === starts[2][m1[q]]);

      /* ---------------------------------------------------------- wording helpers */
      const S3 = starts[2];
      const LD = ladders[2];
      const solid = LD.filter((r) => !r.br);
      const broken = LD.filter((r) => r.br);
      const rails = (g) => `rails ${g + 1} and ${g + 2}`;
      const rungDesc = (rg, ld) => {
        const inGap = ld.filter((r) => r.g === rg.g).sort(SORT.down);
        const kind = inGap.filter((r) => r.br === rg.br);
        if (inGap.length === 1) return `the rung between ${rails(rg.g)}`;
        if (kind.length === 1) return `the ${rg.br ? 'broken' : 'solid'} rung between ${rails(rg.g)}`;
        const i = inGap.indexOf(rg);
        const pos = inGap.length === 2 ? ['upper', 'lower'][i] : inGap.length === 3 ? ['top', 'middle', 'bottom'][i] : ORDN[i] + ' (from the top)';
        return `the ${pos} rung between ${rails(rg.g)}`;
      };
      const goWord = dir === 'down' ? 'going down' : 'climbing up';
      const tripWord = dir === 'down' ? 'trip down the ladder' : 'climb up the ladder';

      /* ---------------------------------------------------------- distractors */
      const cands = [];
      const add = (order, flaws, tier) => cands.push({ order, flaws, tier });
      const fDir =
        dir === 'down'
          ? 'this is the order you get by climbing the ladder from the bottom up, but the symbols slide down'
          : 'this is the order you get by sliding down the ladder, but the symbols climb from the bottom up';
      const fBroken = (b) => `${rungDesc(b, LD)} was crossed, but a broken rung cannot be crossed`;
      const fMiss = (k) => `${rungDesc(k, LD)} was missed: every solid rung must be crossed`;
      const fTimes = T === 1 ? `this is the result of going through the ladder twice; one ${tripWord} is enough` : 'this is the order after only one trip down the ladder; column 3 shows the order after two trips';
      add(seqRun(S3, solid, other, T), [fDir], 1);
      broken.forEach((b) => add(seqRun(S3, solid.concat([b]), dir, T), [fBroken(b)], 1));
      if (broken.length > 1) add(seqRun(S3, LD, dir, T), ['the broken rungs were crossed, but a broken rung cannot be crossed'], 1);
      add(seqRun(S3, solid, dir, 3 - T), [fTimes], 1);
      // two consecutive rungs that share a rail taken in the wrong order
      const ordered = solid.slice().sort(SORT[dir]);
      for (let i = 0; i + 1 < ordered.length; i++) {
        const a = ordered[i];
        const b = ordered[i + 1];
        if (Math.abs(a.g - b.g) !== 1) continue;
        const seq = ordered.slice();
        seq[i] = b;
        seq[i + 1] = a;
        add(swapAll(S3, seq, T), [`${rungDesc(a, LD)} and ${rungDesc(b, LD)} were taken in the wrong order: ${goWord}, the one between ${rails(a.g)} comes first`], 1);
      }
      [0, 1].forEach((r) => {
        const m = ends[r].map((s) => starts[r].indexOf(s));
        add(m.map((i) => S3[i]), [`this moves the symbols exactly as in row ${r + 1}, but row 3 has its own ladder`], 1);
      });
      add(seqRun(S3, solid, 'lr', T), [`the rungs were taken rail pair by rail pair from left to right, instead of in the order the symbols meet them ${goWord}`], 2);
      solid.forEach((k) => add(seqRun(S3, solid.filter((r) => r !== k), dir, T), [fMiss(k)], 2));
      if (T === 2) solid.forEach((k) => add(swapAll(seqRun(S3, solid, dir, 1), solid.filter((r) => r !== k).sort(SORT[dir]), 1), [`${rungDesc(k, LD)} was missed on the second trip`], 2));
      broken.forEach((b) => add(seqRun(S3, solid.concat([b]), other, T), [fDir, fBroken(b)], 2));
      solid.forEach((k) => add(seqRun(S3, solid.filter((r) => r !== k), other, T), [fDir, fMiss(k)], 3));
      broken.forEach((b) => solid.forEach((k) => add(seqRun(S3, solid.filter((r) => r !== k).concat([b]), dir, T), [fBroken(b), fMiss(k)], 3)));
      add(S3.slice(), ['the symbols have not moved at all: the rungs were ignored'], 3);
      add(ans.slice().reverse(), ['this is the right order mirrored (read from right to left)'], 3);
      for (let p = 0; p + 1 < n; p++) {
        const o = ans.slice();
        o[p] = ans[p + 1];
        o[p + 1] = ans[p];
        add(o, [`the ${sym(ans[p])} and the ${sym(ans[p + 1])} are swapped: the ${sym(ans[p])} arrives ${ORDN[p]}, the ${sym(ans[p + 1])} ${ORDN[p + 1]}`], 3);
      }

      const seen = new Set([ans.join(',')]);
      const pool = [];
      [1, 2, 3].forEach((t) =>
        rng.shuffle(cands.filter((c) => c.tier === t)).forEach((c) => {
          const k = c.order.join(',');
          if (seen.has(k)) return;
          seen.add(k);
          pool.push(c);
        })
      );
      RM.need(pool.length >= 7);
      /* the answer must not be the "average" option (most frequent symbol at each place) */
      const centred = (pick) => {
        const all = [ans].concat(pick.map((c) => c.order));
        const cnt = RM.range(n).map(() => ({}));
        all.forEach((o) => o.forEach((s, p) => (cnt[p][s] = (cnt[p][s] || 0) + 1)));
        const sc = all.map((o) => o.reduce((a, s, p) => a + cnt[p][s], 0));
        const modal = ans.filter((s, p) => Object.keys(cnt[p]).every((k) => +k === s || cnt[p][k] < cnt[p][s])).length;
        return Math.max(...sc.slice(1)) < sc[0] || modal > n - 2;
      };
      let chosen = null;
      for (let t = 0; t < 120 && !chosen; t++) {
        const pick = t === 0 ? pool.slice(0, 7) : rng.sample(pool.slice(0, Math.min(pool.length, 9 + (t >> 3))), 7);
        if (pick.filter((c) => c.tier === 1).length >= Math.min(4, pool.filter((c) => c.tier === 1).length) && !centred(pick)) chosen = pick;
      }
      RM.need(chosen);

      /* ---------------------------------------------------------- rendering */
      const X = XS[n];
      const RAD = n === 5 ? 7.4 : 8.4;
      const drawRow = (pic, order, role) => {
        let y = 50;
        let y1 = 4;
        let y2 = 96;
        if (cfg.cue !== 'none') {
          const top = (role === 'start') === (cfg.cue === 'down');
          y = top ? 27 : 73;
          if (top) y1 = y;
          else y2 = y;
        }
        X.forEach((x) => RM.line(pic, x, y1, x, y2, { sw: 1.6, color: RM.LIGHT, cap: 'butt' }));
        order.forEach((si, p) => RM.shape(pic, SYM[si].s, X[p], y, RAD, { fill: SYM[si].f, sw: 1.7 }));
      };
      const drawLadder = (pic, rungs) => {
        X.forEach((x) => RM.line(pic, x, 8, x, 92, { sw: 2.2 }));
        rungs.forEach((r) => {
          const y = Y0 + DY * r.lv;
          const a = X[r.g];
          const b = X[r.g + 1];
          if (!r.br) RM.line(pic, a, y, b, y, { sw: 2.8 });
          else {
            const st = (b - a - 7.5) / 2;
            RM.line(pic, a, y, a + st, y, { sw: 2.8 });
            RM.line(pic, b - st, y, b, y, { sw: 2.8 });
          }
        });
      };
      const render = (sp) => {
        const pic = new RM.Pic();
        if (sp.t === 'lad') drawLadder(pic, sp.r);
        else drawRow(pic, sp.o, sp.role);
        return pic.svg();
      };
      const key = (sp) => (sp.t === 'lad' ? 'L' + sp.r.map((r) => r.lv + ':' + r.g + (r.br ? 'b' : '')).join('|') : sp.role + ':' + sp.o.join(','));

      /* ---------------------------------------------------------- correction */
      const path = (start, seq) => {
        let p = start;
        const out = [p];
        for (const r of seq) {
          if (r.g === p) p++;
          else if (r.g === p - 1) p--;
          else continue;
          out.push(p);
        }
        return out;
      };
      const rl = (arr) => arr.map((x) => x + 1).join(' → ');
      const seq3 = solid.slice().sort(SORT[dir]);
      const startWord = dir === 'down' ? 'top' : 'bottom';
      const endWord = dir === 'down' ? 'bottom' : 'top';
      let trace;
      if (T === 1) {
        trace = S3.map((s, i) => {
          const pth = path(i, seq3);
          return `${symB(s)} rail ${rl(pth)} (arrives ${ORDN[pth[pth.length - 1]]})`;
        }).join('; ');
        trace = `start each symbol at the ${startWord} of its rail and take the solid rungs in the order you meet them: ${trace}.`;
      } else {
        const mid = seqRun(S3, solid, dir, 1);
        const t1 = S3.map((s, i) => `${symB(s)} ${rl(path(i, seq3))}`).join('; ');
        const t2 = mid.map((s, i) => {
          const pth = path(i, seq3);
          return `${symB(s)} ${rl(pth)} (${ORDN[pth[pth.length - 1]]})`;
        }).join('; ');
        trace = `1st trip — ${t1}; order after the 1st trip: ${listOf(mid)}. 2nd trip on the same ladder — ${t2}.`;
      }
      // evidence from rows 1–2
      const firstDiff = (f) => [0, 1].find((r) => !same(f(r), ends[r]));
      const evid = (f, what) => {
        const r = firstDiff(f);
        return r === undefined ? '' : ` (${what} would give ${listOf(f(r))} in row ${r + 1}, not the order shown.)`;
      };
      const rules = [];
      if (cfg.cue === 'down')
        rules.push({
          k: 'Ladder',
          t: `each row is a <b>ladder lottery</b> (amidakuji). The symbols of column 1 stand on top of the rails of the ladder in column 2 (same left-to-right places); each one slides <b>down</b> its rail and column 3 shows the order in which they arrive at the bottom.${evid((r) => run(starts[r], ladders[r], 'up', 'solid', T), 'Climbing up from the bottom instead')}`,
        });
      else if (cfg.cue === 'up')
        rules.push({
          k: 'Ladder',
          t: `each row is a <b>ladder lottery</b> (amidakuji). The symbols of column 1 stand at the <b>bottom</b> of the rails of the ladder in column 2 (same left-to-right places — they are drawn low, those of column 3 high); each one climbs <b>up</b> its rail and column 3 shows the order in which they arrive at the top.${evid((r) => run(starts[r], ladders[r], 'down', 'solid', T), 'Sliding down from the top instead')}`,
        });
      else
        rules.push({
          k: 'Ladder',
          t: `each row is a <b>ladder lottery</b> (amidakuji) on the ladder of column 2. The symbols do <b>not</b> slide down: put each symbol of column 1 at the <b>bottom</b> of the rail in the same place and let it climb <b>up</b>; column 3 shows the order in which they arrive at the top.${evid((r) => run(starts[r], ladders[r], 'down', 'solid', T), 'Sliding down from the top')}`,
        });
      rules.push({
        k: 'Rungs',
        t:
          `every <b>solid rung</b> a symbol meets is a crossing it must take: it moves to the neighbouring rail and carries on ${dir === 'down' ? 'downwards' : 'upwards'}.` +
          (ladders.some((l) => l.some((r) => r.br))
            ? ` A <b>broken rung</b> (with a gap in the middle) cannot be crossed — ignore it.${evid((r) => run(starts[r], ladders[r], dir, 'all', T), 'Crossing the broken rungs too')}`
            : ''),
      });
      if (T === 2)
        rules.push({
          k: 'Twice',
          t: `column 3 is the order after going down the ladder <b>twice</b>: after the first trip the symbols are put back on top of the same ladder in their new order and go down again.${evid((r) => run(starts[r], ladders[r], dir, 'solid', 1), 'A single trip')}`,
        });
      rules.push({ k: 'Row 3', t: trace });
      rules.push({ k: 'Answer', t: `from left to right: <b>${listOf(ans)}</b>.` });

      const hint = [
        'every intact rung is a crossing that must be taken.',
        'follow each symbol along the ladder — but check from which end it starts.',
        'every rung is a crossing that must be taken — and one trip may not be enough.',
        'every intact rung is a crossing — and look where the symbols are drawn.',
      ][v];

      const row = (o, role) => ({ t: 'row', o, role });
      const panels = [];
      for (let r = 0; r < 3; r++) {
        panels.push(row(starts[r], 'start'), { t: 'lad', r: ladders[r] });
        if (r < 2) panels.push(row(ends[r], 'end'));
      }
      return {
        difficulty: cfg.diff,
        hint,
        panels,
        answer: row(ans, 'end'),
        options: [{ spec: row(ans, 'end'), flaws: [] }].concat(chosen.map((c) => ({ spec: row(c.order, 'end'), flaws: c.flaws }))),
        render,
        key,
        rules,
      };
    },
  });
})();
