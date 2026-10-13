/* Elite families (e2): translations, seesaw, containers — set E "Hidden quantities".
 *
 * In all three families the quantity that obeys the rule is never drawn as
 * such: a number written in one of several "languages", token counts that
 * are read off two pans (with the beam's tilt derived from them), and side
 * counts that must balance between a container and its contents. */
(function () {
  'use strict';
  const RM = window.RM;
  const rad = Math.PI / 180;
  const fmt = RM.fmt;

  /* Regular polygon (first vertex straight up, rot in degrees clockwise). */
  function regPts(n, cx, cy, r, rot) {
    return RM.range(n).map((i) => {
      const a = ((rot || 0) - 90 + (360 * i) / n) * rad;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    });
  }
  /* Star with n points (outer radius r1, inner radius r2), first point up. */
  function starPts(n, cx, cy, r1, r2) {
    return RM.range(2 * n).map((i) => {
      const a = (-90 + (180 * i) / n) * rad;
      const rr = i % 2 ? r2 : r1;
      return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
    });
  }
  const POLY = { 3: 'triangle', 4: 'square', 5: 'pentagon', 6: 'hexagon', 7: 'heptagon', 8: 'octagon', 9: 'nonagon', 10: 'decagon' };
  const polyName = (n) => POLY[n] || n + '-sided polygon';
  const aOr = (w) => (/^([aeiou]|8|11-|18)/.test(w) ? 'an ' : 'a ') + w;

  /* ================================================================ E4 Translations */
  const TR_RANGE = { dots: [1, 9], polygon: [3, 8], bars: [1, 8], star: [3, 8] };
  const TR_INKS = ['black', 'gray', 'hatch'];
  const TR_INK_NAME = { black: 'black', gray: 'grey', hatch: 'hatched' };
  const TR_LANG_NAME = { dots: 'dots', polygon: 'a polygon (its number of sides)', bars: 'bars', star: 'a star (its number of points)' };
  const TR_LANG_SHORT = { dots: 'dots', polygon: 'a polygon', bars: 'bars', star: 'a star' };
  const DICE = {
    1: [4],
    2: [2, 6],
    3: [2, 4, 6],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
    7: [0, 2, 3, 4, 5, 6, 8],
    8: [0, 1, 2, 3, 5, 6, 7, 8],
    9: [0, 1, 2, 3, 4, 5, 6, 7, 8],
  };
  const STAR_IN = { 3: 0.3, 4: 0.36, 5: 0.42, 6: 0.47, 7: 0.52, 8: 0.56 };
  const trOk = (l, n) => Number.isInteger(n) && n >= TR_RANGE[l][0] && n <= TR_RANGE[l][1];
  function trSay(l, n) {
    if (l === 'dots') return RM.plural(n, 'dot');
    if (l === 'bars') return RM.plural(n, 'bar');
    if (l === 'polygon') return `${polyName(n)} (${n})`;
    return `${n}-pointed star (${n})`;
  }
  function trRender(sp) {
    const pic = new RM.Pic();
    const n = sp.v;
    // slightly denser hatching than the default so that small hatched figures never read as grey
    const ink = sp.ink === 'hatch' ? 'lines:45:3.4:1.25' : sp.ink;
    if (sp.l === 'dots') {
      DICE[n].forEach((k) => RM.circle(pic, 26 + (k % 3) * 24, 26 + Math.floor(k / 3) * 24, 8.8, { fill: ink, sw: 1.8 }));
    } else if (sp.l === 'bars') {
      const w = 6.6;
      const p = n <= 5 ? 13 : n <= 7 ? 11 : 10;
      const x0 = 50 - ((n - 1) * p + w) / 2;
      const fill = pic.paint(ink);
      for (let i = 0; i < n; i++)
        pic.add(`<rect x="${fmt(x0 + i * p)}" y="19" width="${w}" height="62" fill="${fill}" stroke="${RM.INK}" stroke-width="1.6"/>`);
    } else if (sp.l === 'polygon') {
      // flat bottom side; odd polygons are shifted down a little to look centred
      const R = 39;
      const rot = n % 2 ? 0 : 180 / n;
      const dy = n % 2 ? (R * (1 - Math.cos(Math.PI / n))) / 2 : 0;
      RM.polygon(pic, regPts(n, 50, 50 + dy, R, rot), { fill: ink, sw: 2.4 });
    } else {
      const R = 41;
      const dy = n % 2 ? (R * (1 - Math.cos(Math.PI / n))) / 2 : 0;
      RM.polygon(pic, starPts(n, 50, 50 + dy, R, R * STAR_IN[n]), { fill: ink, sw: 2.2 });
    }
    return pic.svg();
  }
  /* Alternative ways a solver might read the panels: a star could be read by
   * its number of edges (2n), and a polygon / star could be read as "one
   * object". Every simple rule that fits under such a reading must still point
   * to the drawn answer. */
  const TR_READINGS = [
    (l, n) => (l === 'star' ? 2 * n : n),
    (l, n) => (l === 'polygon' || l === 'star' ? 1 : n),
  ];

  RM.register({
    id: 'translations',
    name: 'Translations',
    difficulty: 6,
    generate(rng, variant) {
      const langs = variant === 2 ? ['dots', 'star', 'bars'] : ['dots', 'polygon', 'bars'];
      const op = ['add', 'sub', 'add', 'mul'][variant];
      const F = { add: (a, b) => a + b, sub: (a, b) => a - b, mul: (a, b) => a * b }[op];
      const sym = { add: '+', sub: '−', mul: '×' }[op];
      const a = rng.pick([1, 2]);
      const lp = rng.shuffle(langs);
      const lo = rng.int(0, 2);
      const Lg = RM.grid3((r, c) => lp[RM.latin(r, c, a, lo)]);
      const ip = rng.shuffle(TR_INKS);
      const io = rng.int(0, 2);
      const Ig = RM.grid3((r, c) => ip[RM.latin(r, c, 3 - a, io)]);
      const V = Lg.map((row) => {
        const cands = [];
        for (let x = 1; x <= 9; x++)
          for (let y = 1; y <= 9; y++) {
            if (!trOk(row[0], x) || !trOk(row[1], y)) continue;
            if (op === 'mul' && (x < 2 || y < 2)) continue;
            if (op !== 'mul' && x === y) continue;
            const z = F(x, y);
            if (trOk(row[2], z)) cands.push([x, y, z]);
          }
        RM.need(cands.length > 0);
        return rng.pick(cands);
      });
      RM.need(new Set(V.map((r) => r.join())).size === 3);
      RM.needUnique(V, V[2][2], 'numeric');
      RM.needUnique(Lg, Lg[2][2], 'categorical');
      RM.needUnique(Ig, Ig[2][2], 'categorical');
      // alternative readings of the figures
      const ansL = Lg[2][2];
      TR_READINGS.forEach((rd) => {
        const W = RM.grid3((r, c) => rd(Lg[r][c], V[r][c]));
        RM.preds.numeric(W).forEach(([, p]) => {
          const m = RM.range(10).filter((k) => trOk(ansL, k) && rd(ansL, k) === p);
          RM.need(m.length === 1 && m[0] === V[2][2]);
        });
      });

      const ans = { l: ansL, v: V[2][2], ink: Ig[2][2] };
      let pick = null;
      rng.shuffle([1, -1]).forEach((dv) =>
        rng.shuffle(langs.filter((l) => l !== ans.l)).forEach((L2) => {
          if (!pick && trOk(ans.l, ans.v + dv) && trOk(L2, ans.v) && trOk(L2, ans.v + dv)) pick = [dv, L2];
        })
      );
      RM.need(pick);
      const [dv, altL] = pick;
      const altInk = rng.pick(TR_INKS.filter((i) => i !== ans.ink));

      // exactly one of the 8 options follows all three rules
      const opts = [];
      for (let m = 0; m < 8; m++) opts.push({ l: m & 1 ? altL : ans.l, v: m & 2 ? ans.v + dv : ans.v, ink: m & 4 ? altInk : ans.ink });
      RM.need(opts.filter((o) => o.l === ans.l && o.v === ans.v && o.ink === ans.ink && trOk(o.l, o.v)).length === 1);
      RM.need(opts.every((o) => trOk(o.l, o.v)));

      const rowText = (r) => {
        const [x, y, z] = V[r];
        const res = r === 2 ? `<b>${z}</b>` : z;
        return `${trSay(Lg[r][0], x)} ${sym} ${trSay(Lg[r][1], y)} = ${res}${r === 2 ? '' : ' → ' + trSay(Lg[r][2], z)}`;
      };
      const opText = { add: '3rd = 1st + 2nd', sub: '3rd = 1st − 2nd', mul: '3rd = 1st × 2nd' }[op];
      const ansText = ans.l === 'polygon' ? `${aOr(TR_INK_NAME[ans.ink])} ${polyName(ans.v)} (${ans.v} sides)` : ans.l === 'star' ? `${aOr(TR_INK_NAME[ans.ink])} ${ans.v}-pointed star` : `${ans.v} ${TR_INK_NAME[ans.ink]} ${ans.l === 'dots' ? (ans.v === 1 ? 'dot' : 'dots') : ans.v === 1 ? 'bar' : 'bars'}`;
      return {
        difficulty: variant === 3 ? 7 : 6,
        hint: 'each panel is a number written in its own way.',
        panels: RM.flat(RM.grid3((r, c) => ({ l: Lg[r][c], v: V[r][c], ink: Ig[r][c] }))),
        answer: ans,
        key: (s) => [s.l, s.v, s.ink].join('|'),
        render: trRender,
        perturb: [
          { apply: (s) => ((s.l = altL), s), why: `the number must be written as ${TR_LANG_SHORT[ans.l]}, not as ${TR_LANG_SHORT[altL]} (each way of writing appears once per row and column)` },
          { apply: (s) => ((s.v = ans.v + dv), s), why: `it stands for ${ans.v + dv} instead of ${ans.v}` },
          { apply: (s) => ((s.ink = altInk), s), why: `the figure should be ${TR_INK_NAME[ans.ink]}, not ${TR_INK_NAME[altInk]}` },
        ],
        rules: [
          { k: 'Three ways to write a number', t: `every panel shows a number written in one of three “languages”: ${RM.list(langs.map((l) => TR_LANG_NAME[l]))}. Translate each panel into its number first.` },
          { k: 'Arithmetic', t: `in numbers, ${opText}. Row 1: ${rowText(0)}. Row 2: ${rowText(1)}. Row 3: ${rowText(2)}.` },
          { k: 'Language', t: `${RM.list(langs.map((l) => TR_LANG_SHORT[l]))} each appear once per row and column → the missing number is written as <b>${TR_LANG_SHORT[ans.l]}</b>.` },
          { k: 'Ink', t: `black, grey and hatched each appear once per row and column (a different pattern from the languages) → <b>${TR_INK_NAME[ans.ink]}</b>.` },
          { k: 'Answer', t: `<b>${ansText}</b>.` },
        ],
      };
    },
  });

  /* ================================================================ E5 Seesaws */
  /* inputs of a row: [L1, R1, L2, R2] */
  const SS_IN = ['left pan of the 1st', 'right pan of the 1st', 'left pan of the 2nd', 'right pan of the 2nd'];
  const SS_RULES = [
    { L: ['add', 0, 3], R: ['add', 1, 2] },
    { L: ['add', 0, 2], R: ['adiff', 1, 3] },
    { L: ['add', 1, 3], R: ['add', 0, 2] },
    { L: ['add', 0, 3], R: ['adiff', 1, 2] },
  ];
  const SS_F = {
    add: (a, b) => a + b,
    sub: (a, b) => a - b,
    adiff: (a, b) => Math.abs(a - b),
    max: Math.max,
    min: Math.min,
  };
  const SS_PILE = { 0: [], 1: [1], 2: [2], 3: [3], 4: [3, 1], 5: [3, 2], 6: [3, 3], 7: [3, 3, 1] };
  const SS_TOK = 6;
  const SS_TILT = 15;
  const sgn = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);
  const SS_TILT_TEXT = { '-1': 'down on the left', 0: 'level', 1: 'down on the right' };
  /* tokens stacked in rows of three, bottom up (a 7-pile = 3 + 3 + 1) */
  function ssPile(pic, cx, baseY, n, fill) {
    const rows = SS_PILE[n];
    const d = SS_TOK * 2 + 0.4;
    let y = baseY - SS_TOK - 0.9;
    rows.forEach((k, i) => {
      if (i > 0) y -= (rows[i - 1] - k) % 2 ? d * 0.88 : d;
      for (let j = 0; j < k; j++) RM.circle(pic, cx + (j - (k - 1) / 2) * d, y, SS_TOK, { fill, sw: 1.6 });
    });
  }
  function ssRender(sp) {
    const pic = new RM.Pic();
    const px = 50;
    const py = 67;
    const H = 26;
    // ground and pivot
    RM.line(pic, 32, 93, 68, 93, { sw: 2, color: RM.GRAY });
    RM.polygon(pic, [[px, py], [px - 11, 93], [px + 11, 93]], { fill: 'light', sw: 2 });
    const phi = sp.t * SS_TILT * rad;
    const ends = [
      [px - H * Math.cos(phi), py - H * Math.sin(phi)],
      [px + H * Math.cos(phi), py + H * Math.sin(phi)],
    ];
    RM.line(pic, ends[0][0], ends[0][1], ends[1][0], ends[1][1], { sw: 4.2, cap: 'round' });
    RM.circle(pic, px, py, 2.5, { fill: 'white', sw: 1.5 });
    ends.forEach(([x, y], side) => {
      const ty = y - 8;
      RM.line(pic, x, y, x, ty, { sw: 2.2 });
      RM.polyline(pic, [[x - 19.8, ty - 3.5], [x - 19, ty], [x + 19, ty], [x + 19.8, ty - 3.5]], { sw: 2.2 });
      ssPile(pic, x, ty - 1.1, side ? sp.R : sp.L, side ? 'white' : 'black');
    });
    return pic.svg();
  }
  function ssExpr(rule, inp, bold) {
    const [f, x, y] = rule;
    const v = SS_F[f](inp[x], inp[y]);
    const res = bold ? `<b>${v}</b>` : v;
    return f === 'adiff' ? `|${inp[x]} − ${inp[y]}| = ${res}` : `${inp[x]} + ${inp[y]} = ${res}`;
  }
  function ssRuleText(rule) {
    const [f, x, y] = rule;
    return f === 'adiff' ? `the difference between the ${SS_IN[x]} and the ${SS_IN[y]}` : `as many tokens as the ${SS_IN[x]} and the ${SS_IN[y]} together`;
  }
  const ssTok = (n, c) => `${n === 0 ? 'no' : n} ${c} token${n === 1 ? '' : 's'}`;
  const ssShould = (side, n, m) => (n === 0 ? `the ${side} pan should be empty, not hold ${RM.plural(m, 'token')}` : `the ${side} pan should hold ${RM.plural(n, 'token')}, not ${m}`);

  RM.register({
    id: 'seesaw',
    name: 'Seesaws',
    difficulty: 6,
    generate(rng, variant) {
      const rule = SS_RULES[variant];
      const rows = RM.range(3).map(() => {
        for (let t = 0; t < 60; t++) {
          const inp = [rng.int(0, 7), rng.int(0, 7), rng.int(0, 7), rng.int(0, 7)];
          const L3 = SS_F[rule.L[0]](inp[rule.L[1]], inp[rule.L[2]]);
          const R3 = SS_F[rule.R[0]](inp[rule.R[1]], inp[rule.R[2]]);
          if (L3 <= 7 && R3 <= 7) return { inp, L: [inp[0], inp[2], L3], R: [inp[1], inp[3], R3] };
        }
        throw RM.RETRY;
      });
      const Lg = rows.map((r) => r.L);
      const Rg = rows.map((r) => r.R);
      const Tg = RM.grid3((r, c) => sgn(Rg[r][c] - Lg[r][c]));
      const ans = { L: Lg[2][2], R: Rg[2][2], t: Tg[2][2] };
      // answer never level, so that ±1 on a pan can keep the same heavier side
      RM.need(ans.t !== 0);
      // visible panels demonstrate the physics: both directions and a level beam
      const vis = RM.flat(Tg);
      RM.need(vis.includes(-1) && vis.includes(1) && vis.includes(0));
      RM.need(new Set(rows.map((r) => r.inp.join())).size === 3);

      // --- pan counts. Hypotheses for each pan of the 3rd seesaw, over the pans of the first two
      // (L1, R1, L2, R2) and the other pan of the 3rd: x + k (copies and constant offsets), f(x, y)
      // for f in {+, −, |−|, max, min, ×} (any ordered pair, same pan included), x + y + z and
      // x + y − z, plus the simple grid rules. All that fit rows 1–2 must predict the answer.
      const sideOK = (side) => {
        const G = side === 'L' ? Lg : Rg;
        const other = side === 'L' ? Rg : Lg;
        const ext = (r) => rows[r].inp.concat([other[r][2]]);
        const E = [ext(0), ext(1), ext(2)];
        const preds = new Set();
        const test = (h) => {
          if (h(E[0]) === G[0][2] && h(E[1]) === G[1][2]) preds.add(h(E[2]));
        };
        const FF = Object.assign({ mul: (a, b) => a * b }, SS_F);
        for (let x = 0; x < 5; x++) {
          for (let k = -3; k <= 3; k++) test((e) => e[x] + k);
          for (let y = 0; y < 5; y++) Object.keys(FF).forEach((f) => test((e) => FF[f](e[x], e[y])));
        }
        for (let x = 0; x < 4; x++)
          for (let y = x + 1; y < 4; y++)
            for (let z = 0; z < 4; z++) {
              if (z === x || z === y) continue;
              test((e) => e[x] + e[y] - e[z]);
              if (z > y) test((e) => e[x] + e[y] + e[z]);
            }
        RM.preds.numeric(G).forEach((p) => preds.add(p[1]));
        return preds.size === 1 && preds.has(G[2][2]);
      };
      RM.need(sideOK('L') && sideOK('R'));
      // --- tilt: "heavier side down" with other relative weights of black/white tokens must not fit, or must agree
      const tiltPreds = new Set();
      [1 / 3, 1 / 2, 2 / 3, 1, 3 / 2, 2, 3].forEach((k) => {
        const tt = (L, R) => sgn(R - k * L);
        if (RM.range(8).every((i) => tt(Lg[Math.floor(i / 3)][i % 3], Rg[Math.floor(i / 3)][i % 3]) === Tg[Math.floor(i / 3)][i % 3])) tiltPreds.add(tt(ans.L, ans.R));
      });
      RM.need(tiltPreds.size === 1 && tiltPreds.has(ans.t));
      RM.needNoConflict(Tg, ans.t, 'categorical');
      // decoys: the total number of tokens and the difference between the pans
      RM.needNoConflict(RM.grid3((r, c) => Lg[r][c] + Rg[r][c]), ans.L + ans.R, 'numeric');
      RM.needNoConflict(RM.grid3((r, c) => Lg[r][c] - Rg[r][c]), ans.L - ans.R, 'numeric');

      // --- mistakes: ±1 on each pan without changing which side is heavier
      const dirs = [];
      [1, -1].forEach((dL) =>
        [1, -1].forEach((dR) => {
          const L2 = ans.L + dL;
          const R2 = ans.R + dR;
          if (L2 < 0 || L2 > 7 || R2 < 0 || R2 > 7) return;
          if (sgn(ans.R - L2) !== ans.t || sgn(R2 - ans.L) !== ans.t || sgn(R2 - L2) !== ans.t) return;
          dirs.push([dL, dR]);
        })
      );
      RM.need(dirs.length > 0);
      const [dL, dR] = rng.pick(dirs);
      const altT = rng.pick([0, -ans.t]);
      const opts = [];
      for (let m = 0; m < 8; m++) opts.push({ L: ans.L + (m & 2 ? dL : 0), R: ans.R + (m & 4 ? dR : 0), t: m & 1 ? altT : ans.t });
      RM.need(opts.filter((o) => o.L === ans.L && o.R === ans.R && o.t === sgn(o.R - o.L)).length === 1);
      // wrong tilt is always visibly inconsistent; wrong counts never are
      RM.need(opts.every((o, m) => (o.t === sgn(o.R - o.L)) === !(m & 1)));

      const rowLine = (r) => `${ssExpr(rule.L, rows[r].inp, r === 2)} and ${ssExpr(rule.R, rows[r].inp, r === 2)}`;
      return {
        difficulty: variant === 3 ? 7 : 6,
        hint: 'compare each pan of the third seesaw with both pans of the first two.',
        panels: RM.flat(RM.grid3((r, c) => ({ L: Lg[r][c], R: Rg[r][c], t: Tg[r][c] }))),
        answer: ans,
        key: (s) => [s.L, s.R, s.t].join('|'),
        render: ssRender,
        perturb: [
          { apply: (s) => ((s.t = altT), s), why: `wrong tilt: with ${ssTok(ans.L, 'black')} on the left and ${ssTok(ans.R, 'white')} on the right the beam must go ${SS_TILT_TEXT[ans.t]}` },
          { apply: (s) => ((s.L += dL), s), why: ssShould('left', ans.L, ans.L + dL) },
          { apply: (s) => ((s.R += dR), s), why: ssShould('right', ans.R, ans.R + dR) },
        ],
        rules: [
          { k: 'Left pan (black)', t: `in every row, the left pan of the 3rd seesaw holds ${ssRuleText(rule.L)}.` },
          { k: 'Right pan (white)', t: `the right pan of the 3rd seesaw holds ${ssRuleText(rule.R)}. (Black tokens always sit on the left, white on the right.)` },
          { k: 'Check', t: `row 1: ${rowLine(0)}. Row 2: ${rowLine(1)}. Row 3: ${rowLine(2)}.` },
          { k: 'Balance', t: `in every panel the beam goes down on the side with more tokens and stays level when both pans hold the same number (all tokens weigh the same). Row 3: ${ans.L} against ${ans.R} → <b>${SS_TILT_TEXT[ans.t]}</b>.` },
          { k: 'Answer', t: `<b>${ssTok(ans.L, 'black')}</b> on the left, <b>${ssTok(ans.R, 'white')}</b> on the right, beam <b>${SS_TILT_TEXT[ans.t]}</b>.` },
        ],
      };
    },
  });

  /* ================================================================ E6 Containers */
  const CT_OUT = 43;
  const CT_R = { 3: 16.5, 4: 15.5, 5: 15, 6: 15 };
  const CT_BOUND = 16.5;
  const CT_GAP = 1.5;
  function ctCombos(n) {
    const out = [];
    for (let a = 3; a <= 6; a++)
      for (let b = a; b <= 6; b++) {
        if (a + b === n) out.push([a, b]);
        for (let c = b; c <= 6; c++) if (a + b + c === n) out.push([a, b, c]);
      }
    return out;
  }
  /* k small polygons spread around the centre (random turn and jitter), each
   * inside the big polygon's inscribed circle and clear of the others. */
  function ctPlace(rng, nOuter, k) {
    const R = CT_OUT * Math.cos(Math.PI / nOuter) - CT_BOUND - CT_GAP;
    const a0 = rng.next() * 2 * Math.PI;
    for (let t = 0; t < 200; t++) {
      const pts = [];
      for (let i = 0; i < k; i++) {
        const rr = R * (k === 2 ? 0.7 + 0.3 * rng.next() : 0.86 + 0.14 * rng.next());
        const a = a0 + (2 * Math.PI * i) / k + (rng.next() - 0.5) * (k === 2 ? 0.7 : 0.4);
        pts.push([50 + rr * Math.cos(a), 50 + rr * Math.sin(a)]);
      }
      let ok = true;
      for (let i = 0; i < k && ok; i++) for (let j = i + 1; j < k; j++) if (Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]) < 2 * CT_BOUND + CT_GAP) ok = false;
      if (ok) return pts;
    }
    return null;
  }
  function ctRender(sp) {
    const pic = new RM.Pic();
    RM.polygon(pic, regPts(sp.n, 50, 50, CT_OUT, sp.rot), { fill: 'white', sw: 2 });
    sp.items.forEach((it) => RM.polygon(pic, regPts(it.s, it.x, it.y, CT_R[it.s], it.rot), { fill: it.f, sw: 1.8 }));
    return pic.svg();
  }
  const ctSay = (sides) => {
    const s = sides.slice().sort((a, b) => a - b);
    return s.map((x) => POLY[x]).join(' + ') + ' (' + s.join(' + ') + ')';
  };

  RM.register({
    id: 'containers',
    name: 'Containers',
    difficulty: 6,
    generate(rng, variant) {
      let O;
      if (variant === 3) O = RM.latinGrid(rng, rng.shuffle([6, 8, 10]));
      else {
        const d = [1, -1, 2][variant];
        const hi = variant === 2 ? 12 : 11;
        const starts = RM.range(13).filter((s) => [s, s + d, s + 2 * d].every((v) => v >= 6 && v <= hi));
        const st = rng.sample(starts, 3);
        O = RM.grid3((r, c) => st[r] + d * c);
      }
      RM.needUnique(O, O[2][2], 'numeric');
      const n = O[2][2];
      // 6 sides can only be two triangles: too easy for the answer
      RM.need(n >= 7);
      // contents of the small polygons: redraw until no decoy count (number of small polygons,
      // number of each kind) follows a simple rule that contradicts the answer
      const conflictFree = (g) => RM.unique(g, g[2][2], 'numeric', undefined, true);
      let S = null;
      for (let t = 0; t < 60 && !S; t++) {
        const T = RM.grid3((r, c) => rng.shuffle(rng.pick(ctCombos(O[r][c]))));
        const cnt = (f) => RM.grid3((r, c) => T[r][c].filter(f).length);
        if (new Set(RM.flat(T).map((x) => x.length)).size !== 2) continue;
        if (!conflictFree(cnt(() => true))) continue;
        if (![3, 4, 5, 6].every((k) => conflictFree(cnt((x) => x === k)))) continue;
        S = T;
      }
      RM.need(S);
      const ansSides = S[2][2];
      // sign of all three mistakes (same sign so they never cancel)
      const signs = [1, -1].filter((sg) => ansSides.filter((x) => x + sg >= 3 && x + sg <= 6).length >= 2);
      RM.need(signs.length);
      const s = rng.pick(signs);
      const [bi, ci] = rng.shuffle(RM.range(ansSides.length)).filter((i) => ansSides[i] + s >= 3 && ansSides[i] + s <= 6);
      // panel layouts (noise)
      const P = RM.grid3((r, c) => {
        const sides = S[r][c];
        const nMin = r === 2 && c === 2 ? Math.min(O[r][c], O[r][c] + s) : O[r][c];
        const pos = ctPlace(rng, nMin, sides.length);
        RM.need(pos);
        return {
          n: O[r][c],
          rot: rng.int(0, 359),
          items: sides.map((sd, i) => ({ s: sd, x: pos[i][0], y: pos[i][1], rot: rng.int(0, 359), f: rng.pick(['white', 'gray']) })),
        };
      });
      const vis = RM.flat(P);
      // a mix of 2 and 3 small polygons among the visible panels
      RM.need(new Set(vis.map((p) => p.items.length)).size === 2);
      // decoys: number of small polygons, number of each kind, number of grey ones
      const ans = P[2][2];
      const decoy = (f) => RM.needNoConflict(RM.grid3((r, c) => f(P[r][c])), f(ans), 'numeric');
      decoy((p) => p.items.length);
      decoy((p) => p.items.filter((i) => i.f === 'gray').length);
      [3, 4, 5, 6].forEach((k) => decoy((p) => p.items.filter((i) => i.s === k).length));

      // options of the cube and their check
      const opts = [];
      for (let m = 0; m < 8; m++) {
        const sides = ansSides.map((sd, i) => sd + ((m & 2 && i === bi) || (m & 4 && i === ci) ? s : 0));
        opts.push({ n: n + (m & 1 ? s : 0), sides });
      }
      const sum = (a) => a.reduce((x, y) => x + y, 0);
      RM.need(opts.filter((o) => o.n === n && sum(o.sides) === o.n).length === 1);
      // other "invariants" a solver might see (big = largest small + c, big = smallest small + c):
      // if one fits all 8 visible panels it must not pick a different option
      const invs = [];
      for (let c = 0; c <= 9; c++) {
        invs.push((nn, sd) => nn === Math.max(...sd) + c);
        invs.push((nn, sd) => nn === Math.min(...sd) + c);
      }
      invs.forEach((h) => {
        if (vis.every((p) => h(p.n, p.items.map((i) => i.s)))) RM.need(opts.filter((o) => o.n === n && h(o.n, o.sides)).length === 1 && h(n, ansSides));
      });

      const ruleText = {
        0: 'along each row the big polygon gains <b>one side</b> from each panel to the next',
        1: 'along each row the big polygon loses <b>one side</b> from each panel to the next',
        2: 'along each row the big polygon gains <b>two sides</b> from each panel to the next',
        3: 'big polygons with 6, 8 and 10 sides each appear <b>once per row and column</b>',
      }[variant];
      const rowO = (r) => O[r].map((v, c) => (r === 2 && c === 2 ? `<b>${v}</b>` : v)).join(' → ');
      const ex = (r) => O[r].map((v, c) => `${v} = ${S[r][c].slice().sort((a, b) => a - b).join(' + ')}`).join(', ');
      const bName = POLY[ansSides[bi]];
      const cName = POLY[ansSides[ci]];
      const sideWord = s > 0 ? 'gained' : 'lost';
      return {
        difficulty: variant === 2 ? 7 : 6,
        hint: 'count sides — inside and outside.',
        panels: vis,
        answer: ans,
        key: (sp) => sp.n + '|' + sp.items.map((i) => i.s).join(','),
        render: ctRender,
        perturb: [
          { apply: (sp) => ((sp.n += s), sp), why: `the big polygon should have ${n} sides, not ${n + s}` },
          { apply: (sp) => ((sp.items[bi].s += s), sp), why: `one small ${bName} ${sideWord} a side (it became ${aOr(POLY[ansSides[bi] + s])})` },
          { apply: (sp) => ((sp.items[ci].s += s), sp), why: `${ansSides[ci] === ansSides[bi] ? 'another' : 'one'} small ${cName} ${sideWord} a side (it became ${aOr(POLY[ansSides[ci] + s])})` },
        ],
        rules: [
          { k: 'Inside = outside', t: `in every panel the big polygon has exactly as many sides as all the small polygons inside it together. Row 1: ${ex(0)}.` },
          { k: 'Big polygon', t: `${ruleText}. ${variant === 3 ? `Row 3 already has ${O[2][0]} and ${O[2][1]} sides → <b>${n}</b>` : `Row 3: ${rowO(2)} sides`} → ${aOr(polyName(n))}.` },
          { k: 'Answer', t: `so the small polygons must total ${n} sides: <b>${ctSay(ansSides)}</b>. Positions, rotations and grey/white fills are noise.` },
        ],
      };
    },
  });
})();
