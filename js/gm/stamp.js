/* Stamp (grandmaster): every row shows a set of marked cells (column 1, black dots) and a 3×3 stamp (column 2; the
 * ringed cell is its anchor). Column 3 = the stamp pressed onto the grid with its anchor on EVERY marked cell; where
 * stamp cells overlap they cancel in pairs (a cell ends black only if it is covered an ODD number of times); parts
 * of the stamp outside the grid are ignored. Hypotheses enforced against rows 1–2 (all consistent ones must give the
 * same row 3): union / odd / overlap-only / exactly-once, the 8 turns and flips of the stamp, the 9 possible anchor
 * cells, and edges ignored vs wrapped around. */
(function () {
  'use strict';
  const RM = window.RM;

  const TF = {
    id: (s, i, j) => s[i][j],
    r90: (s, i, j) => s[2 - j][i],
    r180: (s, i, j) => s[2 - i][2 - j],
    r270: (s, i, j) => s[j][2 - i],
    fh: (s, i, j) => s[i][2 - j],
    fv: (s, i, j) => s[2 - i][j],
    tr: (s, i, j) => s[j][i],
    at: (s, i, j) => s[2 - j][2 - i],
  };
  const TKEYS = Object.keys(TF);
  const tf = (s, k) => [0, 1, 2].map((i) => [0, 1, 2].map((j) => TF[k](s, i, j)));
  const PRED = { or: (v) => v >= 1, xor: (v) => v % 2 === 1, and: (v) => v >= 2, once: (v) => v === 1 };
  const PK = Object.keys(PRED);

  function counts(N, marks, st, an, edge) {
    const c = new Array(N * N).fill(0);
    for (const [r, q] of marks)
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++) {
          if (!st[i][j]) continue;
          let y = r + i - an[0];
          let x = q + j - an[1];
          if (edge === 'wrap') {
            y = RM.mod(y, N);
            x = RM.mod(x, N);
          } else if (y < 0 || x < 0 || y >= N || x >= N) continue;
          c[y * N + x]++;
        }
    return c;
  }
  const bits = (c, p) => c.map((v) => (PRED[p](v) ? '1' : '0')).join('');
  const cell = (N, k) => `row ${Math.floor(k / N) + 1}, column ${(k % N) + 1}`;

  const CFG = [
    { N: 7, anchor: 'centre', marks: [4, 5], cells: [4, 6], diff: 8 },
    { N: 7, anchor: 'centre', marks: [5, 6], cells: [5, 6], diff: 8 },
    { N: 7, anchor: 'free', marks: [4, 5], cells: [4, 6], diff: 8 },
    { N: 6, anchor: 'free', marks: [4, 5], cells: [4, 5], diff: 8 },
  ];

  RM.register({
    id: 'stamp',
    name: 'Stamp',
    difficulty: 8,
    generate(rng, variant) {
      const cfg = CFG[variant % 4];
      const N = cfg.N;
      const an = cfg.anchor === 'centre' ? [1, 1] : [rng.int(0, 2), rng.int(0, 2)];

      /* three stamps with no symmetry (all 8 turns/flips different) */
      const stamps = [];
      for (let r = 0; r < 3; r++) {
        let st = null;
        for (let t = 0; t < 60 && !st; t++) {
          const n = rng.int(cfg.cells[0], cfg.cells[1]);
          const on = rng.sample(RM.range(9), n);
          const s = [0, 1, 2].map((i) => [0, 1, 2].map((j) => (on.includes(i * 3 + j) ? 1 : 0)));
          if (!s[an[0]][an[1]] && cfg.anchor === 'centre' && rng.chance(0.4)) continue;
          if (new Set(TKEYS.map((k) => JSON.stringify(tf(s, k)))).size === 8 && stamps.every((o) => JSON.stringify(o) !== JSON.stringify(s))) st = s;
        }
        RM.need(st);
        stamps.push(st);
      }
      const genMarks = () => {
        const k = rng.int(cfg.marks[0], cfg.marks[1]);
        const m = [[rng.int(0, N - 1), rng.int(0, N - 1)]];
        let guard = 0;
        while (m.length < k && guard++ < 80) {
          const p = rng.chance(0.75) ? m[rng.int(0, m.length - 1)] : [rng.int(0, N - 1), rng.int(0, N - 1)];
          const q = rng.chance(0.75) ? [p[0] + rng.int(-2, 2), p[1] + rng.int(-2, 2)] : p;
          if (q[0] < 0 || q[1] < 0 || q[0] >= N || q[1] >= N) continue;
          if (m.some((z) => z[0] === q[0] && z[1] === q[1])) continue;
          m.push(q);
        }
        RM.need(m.length === k);
        return m;
      };
      const marks = [genMarks(), genMarks(), genMarks()];
      const cnt = marks.map((m, r) => counts(N, m, stamps[r], an, 'ignore'));
      const res = cnt.map((c) => bits(c, 'xor'));
      const ones = (s) => s.split('').filter((x) => x === '1').length;
      res.forEach((s) => RM.need(ones(s) >= 6 && ones(s) <= Math.round(N * N * 0.55)));
      /* overlaps (so that union differs from odd) in every row, and a stamp crossing the edge somewhere in rows 1–2 */
      cnt.forEach((c) => RM.need(c.some((v) => v >= 2) && bits(c, 'or') !== bits(c, 'xor')));
      RM.need([0, 1].some((r) => counts(N, marks[r], stamps[r], an, 'wrap').join() !== cnt[r].join()));
      RM.need(bits(cnt[2], 'and') !== res[2] && bits(cnt[2], 'once') !== res[2]);
      RM.need(new Set(res).size === 3);

      /* rule identifiability */
      let consistent = 0;
      for (const p of PK)
        for (const k of TKEYS)
          for (let ai = 0; ai < 3; ai++)
            for (let aj = 0; aj < 3; aj++)
              for (const e of ['ignore', 'wrap']) {
                let ok = true;
                for (let r = 0; r < 2 && ok; r++) ok = bits(counts(N, marks[r], tf(stamps[r], k), [ai, aj], e), p) === res[r];
                if (!ok) continue;
                consistent++;
                RM.need(bits(counts(N, marks[2], tf(stamps[2], k), [ai, aj], e), p) === res[2]);
              }
      RM.need(consistent >= 1);

      /* distractor candidates */
      const cands = [];
      const add = (grp, bs, flaw) => {
        if (bs !== res[2]) cands.push({ grp, bs, flaw });
      };
      const truth = res[2];
      const c3 = cnt[2];
      add('or', bits(c3, 'or'), 'the stamps were merged (union): where two stamp cells overlap, the cell must cancel and stay empty — a cell is black only if it is covered an odd number of times');
      add('and', bits(c3, 'and'), 'only the overlaps were drawn: a cell covered once by the stamps must be black, and a cell covered twice must be empty (the pair cancels)');
      add('once', bits(c3, 'once'), 'cells covered three times were blanked: cancelling is in pairs, so a cell covered an odd number of times stays black');
      const TN = { r90: 'turned a quarter turn clockwise', r180: 'turned upside down (half turn)', r270: 'turned a quarter turn anticlockwise', fh: 'mirrored left–right', fv: 'mirrored top–bottom', tr: 'reflected along its main diagonal', at: 'reflected along its other diagonal' };
      TKEYS.filter((k) => k !== 'id').forEach((k) => add('tf', bits(counts(N, marks[2], tf(stamps[2], k), an, 'ignore'), 'xor'), `the stamp was used ${TN[k]}, but it must be pressed down exactly as drawn`));
      marks[2].forEach((m, i) => {
        const rest = marks[2].filter((_, j) => j !== i);
        add('drop', bits(counts(N, rest, stamps[2], an, 'ignore'), 'xor'), `the stamp of the mark in row ${m[0] + 1}, column ${m[1] + 1} is missing: every marked cell gets a stamp`);
      });
      if (stamps[2][an[0]][an[1]]) {
        const s2 = stamps[2].map((r) => r.slice());
        s2[an[0]][an[1]] = 0;
        add('anchor', bits(counts(N, marks[2], s2, an, 'ignore'), 'xor'), 'the anchor cell of the stamp (the ringed one) was left out although it is black in the stamp');
      }
      add('wrap', bits(counts(N, marks[2], stamps[2], an, 'wrap'), 'xor'), 'the parts of the stamp that stick out of the grid were wrapped around to the opposite side: they must simply be ignored');
      [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dy, dx]) => {
        const a2 = [an[0] + dy, an[1] + dx];
        if (a2[0] < 0 || a2[1] < 0 || a2[0] > 2 || a2[1] > 2) return;
        add('shift', bits(counts(N, marks[2], stamps[2], a2, 'ignore'), 'xor'), 'the stamp was shifted by one cell: its ringed cell must sit exactly on the marked cell');
      });
      for (let t = 0; t < 8; t++) {
        const k = rng.int(0, N * N - 1);
        const a = truth.split('');
        a[k] = a[k] === '1' ? '0' : '1';
        const want = a[k] === '1';
        add('cell', a.join(''), `the cell in ${cell(N, k)} should be ${want ? 'empty' : 'black'}: it is covered ${c3[k]} time${c3[k] === 1 ? '' : 's'}`.replace(/should be (empty|black)/, want ? 'should be empty' : 'should be black'));
      }
      /* dedupe, then one candidate per group in a random order, then fill */
      const seen = new Set();
      const uniq = rng.shuffle(cands).filter((c) => (seen.has(c.bs) ? false : (seen.add(c.bs), true)));
      const order = ['or', 'tf', 'drop', 'anchor', 'wrap', 'shift', 'and', 'once', 'cell'];
      const chosen = [];
      order.forEach((g) => {
        const c = uniq.find((x) => x.grp === g && !chosen.includes(x));
        if (c) chosen.push(c);
      });
      uniq.forEach((c) => {
        if (chosen.length < 7 && !chosen.includes(c)) chosen.push(c);
      });
      RM.need(chosen.length >= 7);
      const pick = chosen.slice(0, 7);
      // keep cell-level distractors honest: a cell distractor differs from the truth in exactly one cell
      const R = (b) => ({ t: 'res', N, b });
      const options = [{ spec: R(truth), flaws: [] }].concat(pick.map((c) => ({ spec: R(c.bs), flaws: [c.flaw] })));

      /* drawing */
      const render = (s) => {
        const pic = new RM.Pic();
        if (s.t === 'stamp') {
          const sz = 22;
          const o = (100 - 3 * sz) / 2;
          for (let i = 0; i < 3; i++)
            for (let j = 0; j < 3; j++) {
              const on = s.st[i][j];
              pic.add(`<rect x="${o + j * sz}" y="${o + i * sz}" width="${sz}" height="${sz}" fill="${on ? RM.INK : '#fff'}" stroke="${RM.GRAY}" stroke-width="1"/>`);
            }
          const on = s.st[s.an[0]][s.an[1]];
          RM.circle(pic, o + (s.an[1] + 0.5) * sz, o + (s.an[0] + 0.5) * sz, 6.2, { stroke: on ? '#fff' : RM.INK, sw: 2.6, fill: 'none' });
          return pic.svg();
        }
        const n = s.N;
        const u = 84 / n;
        const o = 8;
        pic.add(`<rect x="${o}" y="${o}" width="${84}" height="${84}" fill="#fff" stroke="${RM.INK}" stroke-width="1.8"/>`);
        for (let i = 1; i < n; i++) {
          RM.line(pic, o + i * u, o, o + i * u, o + 84, { sw: 0.8, color: RM.LIGHT });
          RM.line(pic, o, o + i * u, o + 84, o + i * u, { sw: 0.8, color: RM.LIGHT });
        }
        if (s.t === 'marks') for (const [r, c] of s.m) RM.circle(pic, o + (c + 0.5) * u, o + (r + 0.5) * u, u * 0.36, { fill: 'black', sw: 0.8 });
        else for (let k = 0; k < n * n; k++) if (s.b[k] === '1') pic.add(`<rect x="${o + (k % n) * u + 0.6}" y="${o + Math.floor(k / n) * u + 0.6}" width="${u - 1.2}" height="${u - 1.2}" fill="${RM.INK}"/>`);
        return pic.svg();
      };
      const key = (s) => (s.t === 'res' ? 'r' + s.b : JSON.stringify(s));

      /* explanation */
      const pos = (m) => `r${m[0] + 1}c${m[1] + 1}`;
      const lst = (ks) => ks.map((k) => `r${Math.floor(k / N) + 1}c${(k % N) + 1}`).join(', ');
      const evid = [0, 1].map((r) => {
        const k = cnt[r].findIndex((v) => v >= 2);
        return `row ${r + 1}: the cell ${lst([k])} is covered ${cnt[r][k]} times and is empty in the result`;
      });
      const ex = RM.range(N * N).filter((k) => [0, 1].some((r) => counts(N, marks[r], stamps[r], an, 'wrap')[k] !== cnt[r][k]));
      const rules = [
        {
          k: 'Marks and stamp',
          t: `column 1 shows <b>marked cells</b> (black dots); column 2 shows a 3×3 <b>stamp</b> (black squares) with one <b>ringed anchor cell</b>${cfg.anchor === 'centre' ? ' (its centre)' : ' (not necessarily the centre)'}. Each row has its own stamp, drawn the way it must be used (no turning, no mirroring).`,
        },
        {
          k: 'Stamping',
          t: `column 3 is the grid after the stamp has been pressed down <b>once on every marked cell</b>, with the <b>anchor cell exactly on the mark</b>: the black squares of the stamp land on the neighbouring cells accordingly. Parts of a stamp that fall outside the grid are simply ignored${ex.length ? ' (they are not wrapped around to the other side — see the stamps at the edge in rows 1–2)' : ''}.`,
        },
        {
          k: 'Overlaps',
          t: `where stamps overlap, black squares <b>cancel in pairs</b>: a cell is black only if it is covered an <b>odd</b> number of times, and empty when covered 0 or 2 times. Evidence — ${evid.join('; ')}, so the stamps are not simply merged.`,
        },
        {
          k: 'Row 3',
          t: `marked cells (row, column): ${marks[2].map(pos).join(', ')}. Pressing the stamp on each (anchor on the mark) and counting: ${lst(RM.range(N * N).filter((k) => c3[k] % 2 === 1))} are covered an odd number of times (black)${RM.range(N * N).some((k) => c3[k] >= 2 && c3[k] % 2 === 0) ? `; ${lst(RM.range(N * N).filter((k) => c3[k] >= 2 && c3[k] % 2 === 0))} are covered an even number of times (cancelled, empty)` : ''}${RM.range(N * N).some((k) => c3[k] >= 3) ? `; ${lst(RM.range(N * N).filter((k) => c3[k] >= 3))} are covered three or more times` : ''}. Result: <b>${ones(truth)} black cells at ${lst(RM.range(N * N).filter((k) => truth[k] === '1'))}</b> (r = row, c = column, counted from the top-left corner).`,
        },
      ];

      const panels = [];
      for (let r = 0; r < 3; r++) {
        panels.push({ t: 'marks', N, m: marks[r] }, { t: 'stamp', st: stamps[r], an });
        if (r < 2) panels.push(R(res[r]));
      }
      return {
        difficulty: cfg.diff,
        hint: 'press the stamp on every marked cell — and think about what happens where two stamps meet.',
        panels,
        answer: R(truth),
        options,
        render,
        key,
        rules,
      };
    },
  });
})();
