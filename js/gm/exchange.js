/* Exchanges (grandmaster): every panel shows two figures (left / right) that differ in shape, fill, size (and, in
 * the harder variants, outline). Between two neighbouring panels of a row the figures EXCHANGE exactly one attribute
 * (the others stay put). Which attribute is exchanged follows a short repeating cycle over the six steps of the
 * matrix in reading order (row 1 step 1, row 1 step 2, row 2 step 1 …). Because the figures always differ in every
 * attribute, each visible step shows unambiguously which attribute moved; all cycles of period 1–4 are checked. */
(function () {
  'use strict';
  const RM = window.RM;

  const SHP = ['circle', 'square', 'triangle', 'star5', 'cross', 'heart'];
  const SN = { circle: 'circle', square: 'square', triangle: 'triangle', star5: 'star', cross: 'cross', heart: 'heart' };
  const FIL = ['black', 'white', 'gray', 'hatch'];
  const FN = { black: 'black', white: 'white', gray: 'grey', hatch: 'hatched' };
  const SZ = [10, 16, 22];
  const ZN = { 10: 'small', 16: 'medium', 22: 'large' };
  const ATT = [
    { k: 'shape', n: 'shape', pool: SHP },
    { k: 'fill', n: 'fill', pool: FIL },
    { k: 'size', n: 'size', pool: SZ },
    { k: 'line', n: 'outline (solid / dashed)', pool: ['solid', 'dashed'] },
  ];
  const CFG = [
    { nA: 3, pat: 'perm3', diff: 7 },
    { nA: 3, pat: 'aab', diff: 7 },
    { nA: 4, pat: 'perm4', diff: 8 },
    { nA: 4, pat: 'perm3of4', diff: 8 },
  ];
  const ORD = ['1st', '2nd', '3rd', '4th', '5th', '6th'];

  const desc = (f) =>
    `${FN[f.fill]} ${ZN[f.size]} ${SN[f.shape]}${f.line === 'dashed' ? ' with dashed outline' : ''}`;

  RM.register({
    id: 'exchange',
    name: 'Exchanges',
    difficulty: 7,
    generate(rng, variant) {
      const cfg = CFG[variant % 4];
      const nA = cfg.nA;
      let pat;
      if (cfg.pat === 'perm3') pat = rng.shuffle([0, 1, 2]);
      else if (cfg.pat === 'aab') {
        const [a, b] = rng.sample([0, 1, 2], 2);
        pat = rng.shuffle([a, a, b]);
      } else if (cfg.pat === 'perm4') pat = rng.shuffle([0, 1, 2, 3]);
      else pat = rng.sample([0, 1, 2, 3], 3);
      const p = pat.length;
      const S = RM.range(6).map((t) => pat[t % p]);

      const vals = RM.range(3).map(() => RM.range(nA).map((i) => (ATT[i].k === 'line' ? rng.shuffle(ATT[i].pool) : rng.sample(ATT[i].pool, 2))));
      RM.need(!RM.sameArr(vals[0].map(String), vals[1].map(String)) && !RM.sameArr(vals[1].map(String), vals[2].map(String)) && !RM.sameArr(vals[0].map(String), vals[2].map(String)));
      const flip = (b, i) => b.map((x, j) => (j === i ? 1 - x : x));
      const st = RM.range(3).map((r) => {
        const b0 = RM.range(nA).map(() => rng.int(0, 1));
        const b1 = flip(b0, S[2 * r]);
        return [b0, b1, flip(b1, S[2 * r + 1])];
      });
      const ansBits = st[2][2];

      /* identifiability: every period 1..4 consistent with the visible steps predicts the same 6th step */
      const hyp = [];
      for (let q = 1; q <= 4; q++) {
        let ok = true;
        for (let t = q; t <= 4; t++) if (S[t] !== S[t - q]) ok = false;
        if (ok) hyp.push(S[5 - q]);
      }
      RM.need(hyp.length > 0 && hyp.every((x) => x === S[5]));
      RM.need(S.slice(0, 5).includes(S[5]));
      /* step-level readings: row-constant (same attribute twice per row) and column-Latin (3 attributes) */
      if (S[0] === S[1] && S[2] === S[3]) RM.need(S[4] === S[5]);
      if (nA === 3 && S[1] !== S[3]) RM.need(S[5] === 3 - S[1] - S[3]);
      const fig = (r, bits, side) => {
        const f = {};
        for (let i = 0; i < nA; i++) f[ATT[i].k] = vals[r][i][side === 'L' ? bits[i] : 1 - bits[i]];
        if (nA < 4) f.line = 'solid';
        return f;
      };
      const spec = (r, bits) => ({ L: fig(r, bits, 'L'), R: fig(r, bits, 'R') });
      const panels = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (!(r === 2 && c === 2)) panels.push(spec(r, st[r][c]));
      const answer = spec(2, ansBits);
      /* no whole-panel Raven rule may point elsewhere */
      RM.needNoConflict(RM.grid3((r, c) => (r === 2 && c === 2 ? undefined : JSON.stringify(spec(r, st[r][c])))), JSON.stringify(answer), 'categorical');

      /* distractors: every other combination of exchanges, the most tempting (nearest to the truth) first */
      const cands = [];
      for (let m = 0; m < 1 << nA; m++) {
        const bits = st[2][1].map((x, i) => (m & (1 << i) ? 1 - x : x));
        if (RM.sameArr(bits, ansBits)) continue;
        const diff = RM.range(nA).filter((i) => bits[i] !== ansBits[i]);
        cands.push({ bits, diff, w: diff.length + rng.next() * 0.5 });
      }
      cands.sort((a, b) => a.w - b.w);
      RM.need(cands.length >= 7);
      const chosen = cands.slice(0, 7);
      const options = [{ spec: answer, flaws: [] }].concat(
        chosen.map((c) => ({
          spec: spec(2, c.bits),
          flaws: c.diff.map((i) =>
            i === S[5]
              ? `the ${ATT[i].n.split(' ')[0]} has not been exchanged, but this step exchanges exactly the ${ATT[i].n.split(' ')[0]}`
              : `the ${ATT[i].n.split(' ')[0]} of the two figures has been exchanged here, but it stays where it was in the previous panel (this step exchanges the ${ATT[S[5]].n.split(' ')[0]} only)`
          ),
        }))
      );

      const render = (s) => {
        const pic = new RM.Pic();
        [['L', 26], ['R', 74]].forEach(([k, x]) => {
          const f = s[k];
          RM.shape(pic, f.shape, x, 50, f.size, { fill: f.fill, dash: f.line === 'dashed' ? 'dashed' : undefined, sw: 2.4 });
        });
        return pic.svg();
      };
      const key = (s) => JSON.stringify([s.L, s.R]);

      const nm = (i) => ATT[i].n.split(' ')[0];
      const seen = S.slice(0, 5).map((a, t) => `${ORD[t]}: <b>${nm(a)}</b>`).join(', ');
      const names = RM.range(nA).map(nm);
      const rules = [
        {
          k: 'Two figures',
          t: `each panel shows two figures (left and right) that differ in ${names.slice(0, -1).join(', ')} and ${names[nA - 1]}. Along each row, from one panel to the next, the two figures <b>exchange exactly one</b> attribute with each other; everything else stays on its figure.`,
        },
        {
          k: 'The cycle',
          t: `count the six steps in reading order (row 1: steps 1–2, row 2: steps 3–4, row 3: steps 5–6; the count does <b>not</b> restart in each row). The attributes exchanged in the five visible steps are — ${seen}. They repeat with a period of <b>${p}</b> (${pat.map(nm).join(' → ')} → …), so step 6 exchanges the <b>${nm(S[5])}</b>.`,
        },
        {
          k: 'Row 3',
          t: `panel 7 shows a ${desc(fig(2, st[2][1], 'L'))} on the left and a ${desc(fig(2, st[2][1], 'R'))} on the right. Exchanging only the ${nm(S[5])} gives: left <b>${desc(answer.L)}</b>, right <b>${desc(answer.R)}</b>.`,
        },
      ];
      return {
        difficulty: cfg.diff,
        hint: 'the two figures keep trading one thing at a time — and the order of trades does not restart with each row.',
        panels,
        answer,
        options,
        render,
        key,
        rules,
      };
    },
  });
})();
