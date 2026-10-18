/* Carroll diagram (grandmaster): every panel is a Carroll diagram — a square cut into four boxes by a cross, with a
 * header bar over the left column and a header dot beside the top row — in which ONE figure is filed. The figure
 * itself obeys ordinary matrix rules (shape and fill are two orthogonal Latin squares, the third feature is constant
 * along rows or columns). The box it is filed in is decided by hidden yes/no questions about the figure, the same for
 * all nine panels: one question picks the column, another the row ("is it black?", "is it large?"). Variant 1 asks
 * compound questions ("black or large?", "…but not both?"), variant 2 adds a third question answered by Lewis
 * Carroll's central square (2×2×2 diagram), variant 3 replaces the size by an inner mark. Uniqueness: every yes/no
 * question about one feature or one matrix line (and, in variant 1, every AND/OR/XOR of two such questions) that fits
 * the eight visible panels must file the missing figure in the same box. */
(function () {
  'use strict';
  const RM = window.RM;

  /* The 9 cells of the matrix (i = 3r + c, the missing one is i = 8) fall into four families of parallel lines:
   * rows, columns, ↙ diagonals and ↘ diagonals (wrapping). Every feature of the figure is a function of one family. */
  const LINE = [(r, c) => r, (r, c) => c, (r, c) => (r + c) % 3, (r, c) => (c - r + 3) % 3];
  const lineOf = (t, i) => LINE[t](Math.floor(i / 3), i % 3);
  const LIT = [0, 1, 2, 3].map((t) => [0, 1, 2].map((v) => RM.range(9).reduce((m, i) => m | (lineOf(t, i) === v ? 1 << i : 0), 0)));
  const litMask = (t, S) => [0, 1, 2].reduce((m, v) => m | (S & (1 << v) ? LIT[t][v] : 0), 0);
  // Hypotheses = 9-bit masks "which cells answer yes". Polarity (which side is "yes") is free, see predict().
  const singles = new Set();
  for (let t = 0; t < 4; t++) for (let S = 1; S < 7; S++) singles.add(litMask(t, S));
  const H_SINGLE = Array.from(singles);
  const combos = new Set(singles);
  for (let t1 = 0; t1 < 4; t1++)
    for (let t2 = t1 + 1; t2 < 4; t2++)
      for (let S1 = 1; S1 < 7; S1++)
        for (let S2 = 1; S2 < 7; S2++) {
          combos.add(litMask(t1, S1) & litMask(t2, S2)); // AND (OR = AND of the negations, other polarity)
          combos.add(litMask(t1, S1) ^ litMask(t2, S2)); // XOR
        }
  const H_COMBO = Array.from(combos);
  // set of bits predicted for the missing cell by every hypothesis that fits the 8 visible cells
  function predict(H, bits) {
    const want = bits & 0xff;
    const anti = ~bits & 0xff;
    const out = new Set();
    for (const h of H) {
      const hv = h & 0xff;
      if (hv === want) out.add((h >> 8) & 1);
      else if (hv === anti) out.add(1 - ((h >> 8) & 1));
    }
    return out;
  }

  const SIZE_WORD = ['small', 'medium', 'large'];
  const FILL_WORD = { white: 'white', gray: 'grey', black: 'black' };
  const art = (w) => (/^[aeiou]/.test(w) ? 'an ' : 'a ') + w;
  const ATTR = {
    s: { name: 'shape', word: (v) => RM.NAMES[v], is: (v) => art(RM.NAMES[v]), short: (v) => RM.NAMES[v] },
    f: { name: 'fill', word: (v) => FILL_WORD[v], is: (v) => FILL_WORD[v], short: (v) => FILL_WORD[v] },
    z: { name: 'size', word: (v) => SIZE_WORD[v], is: (v) => ['small', 'medium-sized', 'large'][v], short: (v) => SIZE_WORD[v] },
    m: {
      name: 'inner mark',
      word: (v) => (v === 'none' ? 'no mark' : 'a ' + v),
      is: (v) => (v === 'none' ? 'plain (no inner mark)' : 'marked with a ' + v),
      short: (v) => (v === 'none' ? 'plain' : v),
    },
  };
  const DIR_TEXT = [
    'is the same all along each row',
    'is the same all down each column',
    'forms a Latin square (one of each in every row and column; it repeats along the ↙ diagonals)',
    'forms a Latin square (one of each in every row and column; it repeats along the ↘ diagonals)',
  ];
  const BAD = ['square|diamond', 'circle|hexagon', 'pentagon|hexagon', 'circle|pentagon', 'diamond|cross'];
  const POOL = [
    ['circle', 'triangle', 'square', 'diamond', 'hexagon', 'star5', 'cross'],
    ['circle', 'triangle', 'square', 'diamond', 'hexagon', 'star5', 'cross'],
    ['circle', 'triangle', 'square', 'cross', 'diamond'],
    ['circle', 'triangle', 'square', 'hexagon', 'diamond', 'pentagon', 'cross'],
  ];
  const CYC = [0, 1, 3, 2]; // box index (TL, TR, BL, BR) → clockwise order
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const listP = (idx) => idx.map((i) => i + 1).join(', ');

  RM.register({
    id: 'carroll',
    name: 'Carroll diagram',
    difficulty: 7,
    generate(rng, variant) {
      const V2 = variant === 2;
      const V3 = variant === 3;
      const COMBO = variant === 1;
      const attrs = V3 ? ['s', 'f', 'm'] : ['s', 'f', 'z'];

      // ---- the figures (ordinary matrix rules)
      let shapes;
      for (let k = 0; k < 50; k++) {
        shapes = rng.sample(POOL[variant], 3);
        const ok = BAD.every((p) => {
          const [a, b] = p.split('|');
          return !(shapes.includes(a) && shapes.includes(b));
        });
        if (ok) break;
      }
      const VALS = { s: shapes, f: ['white', 'gray', 'black'], z: [0, 1, 2], m: ['none', 'dot', 'bar'] };
      const dg = rng.shuffle([2, 3]);
      const DIR = { s: dg[0], f: dg[1] };
      DIR[attrs[2]] = rng.pick([0, 1]);
      const PERM = {};
      attrs.forEach((a) => (PERM[a] = rng.shuffle(VALS[a])));
      const tok = RM.range(9).map((i) => {
        const t = { s: '', f: '', z: 2, m: 'none' };
        attrs.forEach((a) => (t[a] = PERM[a][lineOf(DIR[a], i)]));
        return t;
      });
      attrs.forEach((a) => {
        const num = a === 'z';
        const g = RM.grid3((r, c) => (num ? tok[3 * r + c].z + 1 : tok[3 * r + c][a]));
        RM.needUnique(g, num ? tok[8].z + 1 : tok[8][a], num ? 'numeric' : 'categorical');
      });

      // ---- the hidden questions
      const mkLit = (a) => ({ a, v: rng.pick(VALS[a]) });
      let Qs;
      if (V2) Qs = rng.shuffle(attrs).map((a) => ({ op: 'one', L: [mkLit(a)], yes: rng.int(0, 1) }));
      else if (COMBO)
        Qs = [0, 1].map(() => ({ op: rng.pick(['or', 'or', 'xor']), L: rng.sample(attrs, 2).map(mkLit), yes: rng.int(0, 1) }));
      else Qs = rng.sample(attrs, 2).map((a) => ({ op: 'one', L: [mkLit(a)], yes: rng.int(0, 1) }));
      const litT = (Q, t) => Q.L.map((l) => t[l.a] === l.v);
      const evalQ = (Q, t) => {
        const b = litT(Q, t);
        return Q.op === 'or' ? b[0] || b[1] : Q.op === 'xor' ? b[0] !== b[1] : b[0];
      };
      const bitOf = (Q, t) => (evalQ(Q, t) ? Q.yes : 1 - Q.yes);
      const cellOf = (t) => Qs.reduce((c, Q, k) => c | (bitOf(Q, t) << k), 0);
      const cells = tok.map(cellOf);

      // ---- uniqueness of the filing
      const H = COMBO ? H_COMBO : H_SINGLE;
      Qs.forEach((Q, k) => {
        const bits = cells.reduce((m, c, i) => m | (((c >> k) & 1) << i), 0);
        const vis = bits & 0xff;
        RM.need(vis !== 0 && vis !== 0xff);
        const P = predict(H, bits);
        RM.need(P.size === 1 && P.has((bits >> 8) & 1));
      });
      const seen = new Set(cells.slice(0, 8));
      RM.need(V2 ? seen.size >= 5 : seen.size === 4);
      // no movement / Latin pattern of the boxes themselves may suggest another box
      const G = (f) => RM.grid3((r, c) => f(cells[3 * r + c]));
      for (let k = 0; k < Qs.length; k++) RM.needNoConflict(G((c) => (c >> k) & 1), (cells[8] >> k) & 1, 'categorical');
      RM.needNoConflict(G((c) => c), cells[8], 'categorical');
      if (!V2) {
        RM.needNoConflict(G((c) => CYC[c]), CYC[cells[8]], 'numeric', 4);
        const seq = cells.slice(0, 8).map((c) => CYC[c]);
        const d = (seq[1] - seq[0] + 4) % 4;
        if (seq.every((x, i) => i === 0 || (x - seq[i - 1] + 4) % 4 === d)) RM.need((seq[7] + d) % 4 === CYC[cells[8]]);
      }

      // ---- texts
      const desc = (t) =>
        [V3 ? null : SIZE_WORD[t.z], FILL_WORD[t.f], RM.NAMES[t.s]].filter(Boolean).join(' ') +
        (V3 ? (t.m === 'none' ? ' without mark' : ' with a ' + t.m) : '');
      const question = (Q) => {
        const w = Q.L.map((l) => ATTR[l.a].is(l.v));
        if (Q.op === 'one') return 'is it ' + w[0] + '?';
        if (Q.op === 'or') return 'is it ' + w[0] + ' or ' + w[1] + '?';
        return 'is it ' + w[0] + ' or ' + w[1] + ', but not both?';
      };
      const SIDE = [
        ['left column', 'right column'],
        ['top row', 'bottom row'],
        ['outer part (outside the central square)', 'central square'],
      ];
      const boxName = (cell) =>
        ['top', 'bottom'][(cell >> 1) & 1] + '-' + ['left', 'right'][cell & 1] + ' box' +
        (V2 ? ((cell >> 2) & 1 ? ', inside the central square' : ', outside the central square') : '');
      const sameAs = {};
      attrs.forEach((a) => {
        const idx = RM.range(8).filter((i) => lineOf(DIR[a], i) === lineOf(DIR[a], 8));
        sameAs[a] = 'like panels ' + idx.map((i) => i + 1).join(' and ');
      });
      const ans = Object.assign({}, tok[8], { cell: cells[8] });

      const flawsOf = (spec) => {
        const fl = [];
        attrs.forEach((a) => {
          if (spec[a] !== ans[a])
            fl.push(`the ${ATTR[a].name} should be ${ATTR[a].word(ans[a])} (${sameAs[a]}), not ${ATTR[a].word(spec[a])}`);
        });
        const own = cellOf(spec);
        const right = attrs.every((a) => spec[a] === ans[a]);
        Qs.forEach((Q, k) => {
          const b = (spec.cell >> k) & 1;
          const ob = (own >> k) & 1;
          if (b !== ob)
            fl.push(
              `${right && fl.length === 0 ? 'right figure, wrong box: ' : ''}“${question(Q)}” — ${evalQ(Q, spec) ? 'yes' : 'no'} for a ${desc(spec)}, so it belongs in the ${SIDE[k][ob]}, not in the ${SIDE[k][b]}`
            );
        });
        return fl;
      };

      // ---- options: the right figure in the right box and in 3 neighbouring boxes; 4 wrong figures, one per box
      const slots = [cells[8]].concat((V2 ? [1, 2, 4] : [1, 2, 3]).map((x) => cells[8] ^ x));
      const wrong = [];
      attrs.forEach((a) =>
        VALS[a].forEach((v) => {
          if (v === tok[8][a]) return;
          const t = Object.assign({}, tok[8], { [a]: v });
          wrong.push({ t, a, own: cellOf(t) });
        })
      );
      let best = null;
      let bestScore = -1;
      const n = wrong.length;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++)
          for (let k = 0; k < n; k++)
            for (let l = 0; l < n; l++) {
              const pick = [i, j, k, l];
              if (new Set(pick).size < 4) continue;
              const ws = pick.map((x) => wrong[x]);
              let sc = 3 * new Set(ws.map((w) => w.a)).size + rng.next();
              ws.forEach((w, s) => {
                if (s > 0 && w.own === slots[s]) sc += 2;
              });
              if (sc > bestScore) {
                bestScore = sc;
                best = ws;
              }
            }
      const specs = [ans].concat(
        slots.slice(1).map((c) => Object.assign({}, tok[8], { cell: c })),
        best.map((w, s) => Object.assign({}, w.t, { cell: slots[s] }))
      );
      const options = specs.map((spec) => ({ spec, flaws: flawsOf(spec) }));
      RM.need(options.filter((o) => o.flaws.length === 0).length === 1);

      // ---- drawing
      const sq = (a, b) => [[a, a], [b, a], [b, b], [a, b]];
      const render = (spec) => {
        const pic = new RM.Pic();
        const col = spec.cell & 1;
        const row = (spec.cell >> 1) & 1;
        let cx;
        let cy;
        if (V2) {
          RM.polygon(pic, sq(5, 95), { fill: 'white', sw: 1.6 });
          RM.line(pic, 50, 5, 50, 95, { sw: 1.6 });
          RM.line(pic, 5, 50, 95, 50, { sw: 1.6 });
          RM.polygon(pic, sq(27.5, 72.5), { fill: 'none', sw: 1.6 });
          const inner = (spec.cell >> 2) & 1;
          const pos = (b) => (inner ? (b ? 61.25 : 38.75) : b ? 83.75 : 16.25);
          cx = pos(col);
          cy = pos(row);
        } else {
          RM.polygon(pic, sq(11, 95), { fill: 'white', sw: 1.6 });
          RM.line(pic, 53, 11, 53, 95, { sw: 1.6 });
          RM.line(pic, 11, 53, 95, 53, { sw: 1.6 });
          RM.line(pic, 21, 6, 43, 6, { sw: 2.6 });
          RM.circle(pic, 6, 32, 2.3, { fill: 'black', sw: 0 });
          cx = col ? 74 : 32;
          cy = row ? 74 : 32;
        }
        const r = V2 ? [4.6, 6.8, 9][spec.z] : V3 ? 14 : [7, 10.5, 14.5][spec.z];
        RM.shape(pic, spec.s, cx, cy, r, { fill: spec.f, sw: V2 ? 1.5 : 1.8 });
        if (spec.m !== 'none') {
          const color = pic.paint(spec.f === 'black' ? 'white' : 'black');
          const my = cy + (spec.s === 'triangle' ? 0.14 * r : 0);
          if (spec.m === 'dot') RM.circle(pic, cx, my, 2.8, { fill: spec.f === 'black' ? 'white' : 'black', sw: 0 });
          else RM.line(pic, cx - 5.5, my, cx + 5.5, my, { sw: 2.8, color, cap: 'butt' });
        }
        return pic.svg();
      };

      // ---- correction
      const rules = [];
      rules.push({
        k: 'The figure',
        t:
          'Number the panels 1–8 in reading order. The figure itself follows ordinary matrix rules. ' +
          attrs
            .map((a) => `<b>${cap(ATTR[a].name)}</b> ${DIR_TEXT[DIR[a]]}: the missing one is ${sameAs[a]} → ${ATTR[a].word(ans[a])}.`)
            .join(' ') +
          ` So the missing figure is a <b>${desc(ans)}</b>.`,
      });
      Qs.forEach((Q, k) => {
        const yes = RM.range(8).filter((i) => evalQ(Q, tok[i]));
        const no = RM.range(8).filter((i) => !evalQ(Q, tok[i]));
        const why = (i) => {
          if (Q.op === 'one') return String(i + 1);
          const b = litT(Q, tok[i]);
          const w = Q.L.filter((l, x) => b[x]).map((l) => ATTR[l.a].short(l.v));
          return `${i + 1} (${w.length ? w.join(' + ') : 'neither'})`;
        };
        rules.push({
          k: cap(['columns', 'rows', 'central square'][k]),
          t:
            `Hidden question ${k + 1}: <i>${question(Q)}</i> “Yes” figures are filed in the <b>${SIDE[k][Q.yes]}</b>, ` +
            `“no” figures in the <b>${SIDE[k][1 - Q.yes]}</b>. Check: yes → panels ${yes.map(why).join(', ')}; ` +
            `no → panels ${no.map(why).join(', ')}. No other single ${COMBO ? 'or two-feature ' : ''}question fits all eight panels and files the missing figure differently.`,
        });
      });
      rules.push({
        k: 'Filing the missing figure',
        t:
          `The ${desc(ans)}: ` +
          Qs.map((Q, k) => `<i>${question(Q)}</i> ${evalQ(Q, ans) ? 'yes' : 'no'} → ${SIDE[k][(ans.cell >> k) & 1]}`).join('; ') +
          `. Answer: <b>the ${desc(ans)} in the ${boxName(ans.cell)}</b>. The positions alone follow no movement pattern — only the questions explain them.`,
      });

      return {
        panels: RM.range(8).map((i) => Object.assign({}, tok[i], { cell: cells[i] })),
        answer: ans,
        options,
        render,
        key: (s) => [s.s, s.f, s.z, s.m, s.cell].join('|'),
        rules,
        hint: V2
          ? 'Three hidden yes/no questions about the figure decide where each figure is filed.'
          : COMBO
          ? 'Two hidden questions decide where each figure is filed — and each question may ask about two features at once.'
          : 'Two hidden questions decide where each figure is filed.',
        difficulty: COMBO || V2 ? 8 : 7,
      };
    },
  });
})();
