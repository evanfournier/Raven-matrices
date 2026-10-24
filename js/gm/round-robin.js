/* Round robin (grandmaster): every row is a tournament of six players (distinct shapes) — one in the centre, five round
 * the table (irregularly spaced). A panel is one round: three lines = three matches, built by the circle method: the
 * centre player faces the outer player P, the two neighbours of P face each other, and the two players beyond them face
 * each other. From round to round P moves on by a fixed number of seats (variant 0/3: one seat, variant 1: two seats,
 * variant 2: the step grows: 1 seat, then 2 seats …), clockwise or counter-clockwise. Hypotheses checked: every
 * matching of the six seats as the pattern (15), every pair of steps (round 1→2, round 2→3), every starting seat;
 * all surviving hypotheses must predict the same round for the last row. Distractors: other matchings (a repeated
 * round, the wrong direction, a step repeated, centre facing the wrong player, pairs that already met …). */
(function () {
  'use strict';
  const RM = window.RM;

  const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star5', 'cross'];
  const SN = { circle: 'circle', square: 'square', triangle: 'triangle', diamond: 'diamond', star5: 'star', cross: 'cross' };
  const STEP = { 1: 'one seat clockwise', 2: 'two seats clockwise', 3: 'two seats counter-clockwise', 4: 'one seat counter-clockwise' };
  const R = 38, SR = 5.8;
  const mkey = (pairs) => pairs.map((p) => Math.min(p[0], p[1]) + '-' + Math.max(p[0], p[1])).sort().join(',');
  // player index: 0 = centre, 1..5 = seats 0..4 (clockwise)
  const atSeat = (s) => [[0, (s % 5) + 1], [((s + 1) % 5) + 1, ((s + 4) % 5) + 1], [((s + 2) % 5) + 1, ((s + 3) % 5) + 1]];
  // all matchings of {-1 (centre), 0..4} as relative offsets
  const MATCHINGS = [];
  (function rec(items, acc) {
    if (!items.length) { MATCHINGS.push(acc); return; }
    const a = items[0];
    for (let i = 1; i < items.length; i++) rec(items.filter((_, j) => j && j !== i), acc.concat([[a, items[i]]]));
  })([-1, 0, 1, 2, 3, 4], []);
  const applyM = (T, s) => T.map((p) => p.map((o) => (o < 0 ? 0 : ((o + s) % 5) + 1)));

  function distSeg(px, py, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    return Math.abs(dx * (py - a[1]) - dy * (px - a[0])) / Math.hypot(dx, dy);
  }
  function makeLayout(rng, id) {
    for (let t = 0; t < 400; t++) {
      const raw = RM.range(5).map(() => 72 + rng.int(-9, 9));
      const sum = raw.reduce((a, b) => a + b, 0);
      let a = rng.int(0, 359);
      const pts = [[50, 50]];
      for (let k = 0; k < 5; k++) {
        pts.push([50 + R * Math.cos((a * Math.PI) / 180), 50 + R * Math.sin((a * Math.PI) / 180)]);
        a += (raw[k] * 360) / sum;
      }
      let ok = true;
      for (let i = 1; i <= 5 && ok; i++) for (let j = i + 1; j <= 5; j++) if (distSeg(50, 50, pts[i], pts[j]) < 10.6) { ok = false; break; }
      if (ok) return { id, pts, sh: rng.shuffle(SHAPES) };
    }
    return null;
  }

  RM.register({
    id: 'round-robin',
    name: 'Round robin',
    difficulty: 7,
    generate(rng, variant) {
      const a = variant === 1 ? rng.pick([2, 3]) : rng.pick([1, 4]);
      const accel = variant === 2;
      const offs = [0, a, accel ? (3 * a) % 5 : (2 * a) % 5];
      const lays = [], seats = [];
      for (let r = 0; r < 3; r++) {
        const l = makeLayout(rng, 'L' + r + rng.int(0, 99999));
        RM.need(l);
        lays.push(l);
        seats.push(rng.int(0, 4));
      }
      const truthPairs = (r, t) => atSeat(seats[r] + offs[t]);
      const obs = (r, t) => mkey(truthPairs(r, t));
      const answerPairs = truthPairs(2, 2);
      const ansK = mkey(answerPairs);
      // ---- hypotheses: pattern T, steps (x, y) for rounds 1→2, 2→3, start seat free per row
      const OBS = [0, 1, 2].map((r) => [0, 1, 2].map((t) => obs(r, t)));
      const preds = new Set();
      for (const T of MATCHINGS) {
        const S = [0, 1, 2].map((r) => RM.range(5).map((s) => mkey(applyM(T, s))));
        for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) {
          const o = [0, x, (x + y) % 5];
          const okRow = (r, nT) => RM.range(5).filter((s0) => RM.range(nT).every((t) => S[r][(s0 + o[t]) % 5] === OBS[r][t]));
          if (!okRow(0, 3).length || !okRow(1, 3).length) continue;
          for (const s0 of okRow(2, 2)) preds.add(S[2][(s0 + o[2]) % 5]);
        }
      }
      RM.need(preds.size === 1 && preds.has(ansK));

      // ---- options: all other matchings of the six players
      const L3 = lays[2];
      const nm = (i) => SN[L3.sh[i]];
      const all = [];
      (function rec(items, acc) {
        if (!items.length) { all.push(acc); return; }
        for (let i = 1; i < items.length; i++) rec(items.filter((_, j) => j && j !== i), acc.concat([[items[0], items[i]]]));
      })([0, 1, 2, 3, 4, 5], []);
      const centreOf = (pairs) => pairs.find((p) => p.includes(0)).find((x) => x !== 0);
      const pairTxt = (p) => `${nm(p[0])}–${nm(p[1])}`;
      const played = [truthPairs(2, 0), truthPairs(2, 1)].map((ps) => ps.map((p) => mkey([p])));
      const cAns = centreOf(answerPairs);
      const chordsAns = answerPairs.filter((p) => !p.includes(0));
      const stepTxt = accel ? `by ${STEP[a]} and then by ${STEP[(2 * a) % 5]}` : `by ${STEP[a]} each round`;
      const flawOf = (pairs) => {
        const f = [];
        const c = centreOf(pairs);
        if (c !== cAns) f.push(`The centre player must face the ${nm(cAns)} in this round (the opponent of the centre moves on ${stepTxt}); here it faces the ${nm(c)}.`);
        else {
          const ch = pairs.filter((p) => !p.includes(0));
          f.push(`The other four must pair up symmetrically around the ${nm(cAns)} (${chordsAns.map(pairTxt).join(' and ')}), but this picture pairs ${ch.map(pairTxt).join(' and ')}.`);
        }
        pairs.forEach((p) => {
          const k = mkey([p]);
          [0, 1].forEach((t) => { if (played[t].includes(k)) f.push(`${pairTxt(p)} was already played in round ${t + 1}; in a round robin nobody meets twice.`); });
        });
        return f;
      };
      const sKey = (s) => mkey(atSeat(s));
      const wanted = [
        sKey((seats[2] + offs[1] - (offs[2] - offs[1]) + 10) % 5),
        sKey((seats[2] + offs[1] + (offs[1] - offs[0]) + 10) % 5),
        sKey((seats[2] + offs[1]) % 5),
        sKey((seats[2] + offs[0]) % 5),
      ];
      const shared = (pairs) => pairs.filter((p) => answerPairs.some((q) => mkey([p]) === mkey([q]))).length;
      const cand = all.filter((p) => mkey(p) !== ansK).map((p) => ({ p, k: mkey(p), s: shared(p) + rng.next() * 0.9 }));
      const chosen = [];
      for (const w of wanted) { const c = cand.find((x) => x.k === w); if (c && !chosen.includes(c) && chosen.length < 3) chosen.push(c); }
      for (const c of cand.sort((x, y) => y.s - x.s)) if (chosen.length < 7 && !chosen.includes(c)) chosen.push(c);
      RM.need(chosen.length === 7);

      // ---- rules
      const cw = (s) => nm(s + 1);
      const row1 = [0, 1, 2].map((t) => { const ps = truthPairs(0, t); const c = ps.find((p) => p.includes(0)).find((x) => x !== 0); return SN[lays[0].sh[c]]; });
      const s3 = [0, 1, 2].map((t) => (seats[2] + offs[t]) % 5);
      const ch = atSeat(s3[2]).slice(1);
      const rules = [
        { k: 'Tournament', t: 'each row is a round-robin tournament of six players (one shape each): one sits in the <b>centre</b>, five round the table. A panel is one round and the three lines are its three matches.' },
        { k: 'A round', t: 'in every round the centre player faces one player P at the table; the two players sitting <b>next to P</b> (one on each side) face each other, and the two players <b>beyond them</b> face each other: the pairs are symmetrical around P.' },
        { k: 'Next round', t: `from one round to the next, P (the opponent of the centre) moves on <b>${accel ? `${STEP[a]}, then ${STEP[(2 * a) % 5]}` : STEP[a]}</b> along the table${accel ? ' (the step grows each round)' : ''}, and the other pairs follow. In row 1 the centre faces the ${row1[0]}, then the ${row1[1]}, then the ${row1[2]}.` },
        { k: 'Row 3', t: `round 1: centre vs ${cw(s3[0])}; round 2: centre vs ${cw(s3[1])}; so round 3: the centre player (${nm(0)}) faces the <b>${cw(s3[2])}</b>; its two neighbours at the table (${ch[0].map((i) => nm(i)).join(' and ')}) face each other, and the other two (${ch[1].map((i) => nm(i)).join(' and ')}) face each other.` },
      ];

      const spec = (lay, pairs) => ({ lay, pairs });
      const panels = [];
      for (let r = 0; r < 3; r++) {
        panels.push(spec(lays[r], truthPairs(r, 0)), spec(lays[r], truthPairs(r, 1)));
        if (r < 2) panels.push(spec(lays[r], truthPairs(r, 2)));
      }
      const render = (s) => {
        const pic = new RM.Pic();
        RM.circle(pic, 50, 50, R, { stroke: RM.LIGHT, sw: 1 });
        for (const [i, j] of s.pairs) RM.line(pic, s.lay.pts[i][0], s.lay.pts[i][1], s.lay.pts[j][0], s.lay.pts[j][1], { sw: 2.4, cap: 'butt' });
        s.lay.pts.forEach((p, i) => RM.shape(pic, s.lay.sh[i], p[0], p[1], SR, { fill: 'white', sw: 1.8 }));
        return pic.svg();
      };
      return {
        difficulty: variant === 1 || variant === 2 ? 8 : 7,
        hint: 'in a round robin nobody meets twice — and the pairs of a round are symmetrical around one player.',
        panels,
        answer: spec(L3, answerPairs),
        options: [{ spec: spec(L3, answerPairs), flaws: [] }].concat(chosen.map((c) => ({ spec: spec(L3, c.p), flaws: flawOf(c.p) }))),
        render,
        key: (s) => s.lay.id + '|' + mkey(s.pairs),
        rules,
      };
    },
  });
})();
