/* Alternating operations (grandmaster): read the 8 panels in order. The number of blocks (1..25, in a 5-wide grid)
 * obeys two operations that alternate (one multiplicative: x2, x3 or /2; one additive: +k or -k), e.g. x2 then -3 or
 * +4 then /2. A second attribute, the shade of the blocks, advances one place in the 3-cycle white > grey > black
 * only after a multiplicative step (x or /) and never changes after an additive one. Every reading that fits the
 * visible counts (all ordered pairs of alternating operations from {+k, -k, x2, x3, /2}, a single operation,
 * linear recurrences of order 2, periods 1-4) must predict the same count; the shade can not be read from the counts. */
(function () {
  'use strict';
  const RM = window.RM;

  const FILLS = ['white', 'gray', 'black'];
  const FNAME = ['white', 'grey', 'black'];
  const OPS = [];
  for (let k = 1; k <= 9; k++) OPS.push({ t: 'add', k, mult: false, s: '+' + k });
  for (let k = 1; k <= 9; k++) OPS.push({ t: 'sub', k, mult: false, s: '−' + k });
  OPS.push({ t: 'mul', k: 2, mult: true, s: '×2' }, { t: 'mul', k: 3, mult: true, s: '×3' }, { t: 'div', k: 2, mult: true, s: '÷2' });
  const ap = (o, v) => (o.t === 'add' ? v + o.k : o.t === 'sub' ? v - o.k : o.t === 'mul' ? v * o.k : v % o.k === 0 ? v / o.k : NaN);
  const okV = (v) => Number.isInteger(v) && v >= 1 && v <= 25;

  let SEQS = null;
  function seqs() {
    if (SEQS) return SEQS;
    SEQS = [];
    const mults = OPS.filter((o) => o.mult && o.t !== 'div');
    const divs = OPS.filter((o) => o.t === 'div');
    const adds = OPS.filter((o) => !o.mult);
    for (const m of mults.concat(divs))
      for (const a of adds)
        for (const first of [0, 1]) {
          const A = first ? m : a;
          const B = first ? a : m;
          for (let v1 = 1; v1 <= 16; v1++) {
            const v = [v1];
            for (let i = 0; i < 8 && okV(v[i]); i++) v.push(ap(i % 2 === 0 ? A : B, v[i]));
            if (v.length === 9 && okV(v[8]) && new Set(v).size >= 6 && Math.max(...v) - Math.min(...v) >= 5) SEQS.push({ A, B, v, multFirst: !!first });
          }
        }
    return SEQS;
  }

  function render(sp) {
    const pic = new RM.Pic();
    for (let i = 0; i < sp.n; i++) {
      const x = 14 + 18 * (i % 5) - 7;
      const y = 14 + 18 * Math.floor(i / 5) - 7;
      pic.add(`<rect x="${x}" y="${y}" width="14" height="14" rx="1.5" fill="${pic.paint(FILLS[sp.f])}" stroke="${RM.INK}" stroke-width="1.5"/>`);
    }
    return pic.svg();
  }
  const key = (sp) => sp.n + ':' + sp.f;

  RM.register({
    id: 'alternating-ops',
    name: 'Alternating operations',
    difficulty: 7,
    reading: 'sequence',
    generate(rng, variant) {
      const all = seqs();
      const pool0 = variant === 0 ? all.filter((s) => s.B.t === 'div' || s.A.t === 'div' || s.A.t === 'mul' || s.B.t === 'mul') : all;
      const S = rng.pick(pool0);
      const { A, B } = S;
      const v = S.v;
      const dir = rng.pick([1, 2]);
      const f0 = rng.int(0, 2);
      const fl = [f0];
      for (let i = 0; i < 8; i++) fl.push(RM.mod(fl[i] + ((i % 2 === 0 ? A : B).mult ? dir : 0), 3));
      const vis = v.slice(0, 8);
      const v9 = v[8];
      const f9 = fl[8];
      RM.need(new Set(fl.slice(0, 8)).size === 3);

      /* identifiability of the counts */
      const preds = [];
      for (const a of OPS)
        for (const b of OPS) {
          let ok = true;
          for (let i = 0; i < 7 && ok; i++) ok = ap(i % 2 === 0 ? a : b, vis[i]) === vis[i + 1];
          if (ok) preds.push(ap(b, vis[7]));
        }
      for (const a of OPS) {
        let ok = true;
        for (let i = 0; i < 7 && ok; i++) ok = ap(a, vis[i]) === vis[i + 1];
        if (ok) preds.push(ap(a, vis[7]));
      }
      for (let a = -2; a <= 2; a++)
        for (let b = -2; b <= 2; b++)
          for (let g = -6; g <= 6; g++) {
            let ok = true;
            for (let i = 0; i + 2 < 8 && ok; i++) ok = vis[i + 2] === a * vis[i + 1] + b * vis[i] + g;
            if (ok) preds.push(a * vis[7] + b * vis[6] + g);
          }
      for (let p = 1; p <= 4; p++) {
        let ok = true;
        for (let i = 0; i + p < 8 && ok; i++) ok = vis[i + p] === vis[i];
        if (ok) preds.push(vis[8 - p]);
      }
      RM.need(preds.includes(v9) && preds.every((x) => x === v9));
      /* shade must not be a function of the count */
      const hit = vis.indexOf(v9);
      if (hit >= 0) RM.need(fl[hit] === f9);

      /* distractors */
      const v8 = vis[7];
      const v7 = vis[6];
      const other = (o) => OPS.filter((p) => p.t === o.t && p.k !== o.k && Math.abs(p.k - o.k) <= 1 && p.k >= (o.mult ? 2 : 1));
      const cDef = [];
      const addCount = (n, sc, why) => okV(n) && n !== v9 && cDef.push({ n, sc, why });
      addCount(ap(A, v8), 1, `the operation <b>${A.s}</b> was applied again, but the two operations alternate and it is the turn of <b>${B.s}</b>`);
      addCount(v8 + (v8 - v7), 1, `the last change (${v8 - v7 > 0 ? '+' : '−'}${Math.abs(v8 - v7)}) was simply repeated, but the change alternates between two operations`);
      other(B).forEach((o) => addCount(ap(o, v8), 1.2, `${o.s} was used instead of ${B.s}`));
      [v9 - 1, v9 + 1].forEach((n) => addCount(n, 1.1, ''));
      [v9 - 2, v9 + 2].forEach((n) => addCount(n, 1.8, ''));
      addCount(v8, 2, 'the count did not change');
      addCount(v7, 2.2, 'this is the count of panel 7 again');
      const poolMap = new Map();
      const fText = (f) => {
        if (B.mult) return `the last step is <b>${B.s}</b>, a multiplicative step, so the shade must advance to ${FNAME[f9]}, not ${FNAME[f]}`;
        return `the last step is <b>${B.s}</b>, an additive step, and shades only change after × or ÷ steps: the shade must stay ${FNAME[f9]}, not ${FNAME[f]}`;
      };
      const put = (n, f, sc, why) => {
        if (n === v9 && f === f9) return;
        const flaws = [];
        if (n !== v9) flaws.push(`${n} blocks: ${v8} ${B.s} = ${v9}, not ${n}` + (why ? ' (' + why + ')' : ''));
        if (f !== f9) flaws.push(fText(f));
        const k = n + ':' + f;
        const score = sc + (f === f9 ? 0 : f === fl[7] ? 1 : 1.5) + rng.next() * 0.8;
        if (!poolMap.has(k) || poolMap.get(k).score > score) poolMap.set(k, { spec: { n, f }, flaws, score });
      };
      for (let f = 0; f < 3; f++) {
        put(v9, f, 0);
        cDef.forEach((c) => put(c.n, f, c.sc, c.why));
      }
      let chosen = null;
      for (let t = 0; t < 30 && !chosen; t++) {
        const list = [...poolMap.values()].map((o) => ({ o, r: o.score + rng.next() * 1.3 })).sort((a, b) => a.r - b.r).slice(0, 7).map((x) => x.o);
        const specs = list.map((o) => o.spec).concat([{ n: v9, f: f9 }]);
        const uniq = (g) => {
          const m = {};
          specs.forEach((sp) => (m[g(sp)] = (m[g(sp)] || 0) + 1));
          const a = m[g({ n: v9, f: f9 })];
          return Object.values(m).filter((x) => x >= a).length === 1;
        };
        if (!(uniq((s) => s.n) && uniq((s) => s.f)) && list.filter((o) => o.spec.n === v9).length >= 1 && list.filter((o) => o.spec.f === f9).length >= 2) chosen = list;
      }
      RM.need(chosen);

      /* correction */
      const chain = vis.map((c, i) => `<b>${c}</b>` + (i < 7 ? ` <small>(${(i % 2 === 0 ? A : B).s})</small> ` : '')).join('→ ');
      const shadeSeq = fl.slice(0, 8).map((f) => FNAME[f]).join(', ');
      const rules = [
        { k: 'Counts', t: `read the 8 panels as a sequence. The number of blocks goes ${chain}. Two different operations take <b>turns</b>: <b>${A.s}</b> (steps 1, 3, 5, 7) and <b>${B.s}</b> (steps 2, 4, 6). A single repeated operation or a constant difference does not fit.` },
        { k: 'Shade', t: `the shade of the blocks is a separate attribute following the cycle white → grey → black → white (${dir === 1 ? 'in this order' : 'read it backwards: white → black → grey → white'}). It advances one place <b>only after a multiplication or division step</b> (${(A.mult ? A : B).s}) and stays unchanged after an addition/subtraction step. The shades are: ${shadeSeq}.` },
        { k: 'Panel 9', t: `step 8 is <b>${B.s}</b> (the ${B.mult ? 'multiplicative' : 'additive'} operation): ${v8} ${B.s} = <b>${v9}</b> blocks. ${B.mult ? `Being a multiplicative step, the shade advances: ${FNAME[fl[7]]} → <b>${FNAME[f9]}</b>.` : `Being an additive step, the shade stays <b>${FNAME[f9]}</b>.`}` },
        { k: 'Answer', t: `<b>${v9} ${FNAME[f9]} blocks</b> in the 5-wide grid.` },
      ];
      const hint = 'two different operations take turns on the number of blocks; the shade reacts to only one of the two kinds.';
      return {
        difficulty: 7,
        hint,
        panels: vis.map((n, i) => ({ n, f: fl[i] })),
        answer: { n: v9, f: f9 },
        options: [{ spec: { n: v9, f: f9 }, flaws: [] }].concat(chosen.map((o) => ({ spec: o.spec, flaws: o.flaws }))),
        render,
        key,
        rules,
      };
    },
  });
})();
