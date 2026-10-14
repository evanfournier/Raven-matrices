/* Langton's ant (grandmaster): each row follows one "ant" (a triangle pointing the way it faces) on a 6×6 board of
 * coloured cells. At every step the ant looks at the colour of its cell, turns a quarter turn (right on white, left on
 * black), flips the colour of the cell it is leaving and moves one cell forward; every panel shows the board a fixed
 * number of steps after the previous one (2 steps; 3 steps in variant 1). Variant 2 is the mirrored ant (left on white,
 * right on black); variant 3 a three-colour ant (cells cycle white → grey → black → white; turns right, right, left).
 * The rule, the step count and the bookkeeping are checked against 768 (two colours) / 5120 (three colours) rival
 * hypotheses: every turn table (relative or absolute), flipping the cell left / entered / nothing, turn-then-move or
 * move-then-turn, 1–4 steps per panel. */
(function () {
  'use strict';
  const RM = window.RM;
  const N = 6; // board size
  const C = 13; // cell size
  const O = 11; // board offset (board spans 11..89)
  const DX = [0, 1, 0, -1];
  const DY = [-1, 0, 1, 0];
  const DIRN = ['up', 'right', 'down', 'left'];
  const TN = ['straight on', 'right', 'round', 'left'];
  const cname = (i) => 'ABCDEF'[i % N] + (Math.floor(i / N) + 1);
  const skey = (s) => s.g.join('') + '|' + s.x + ',' + s.y + ',' + s.h;
  const same = (a, b) => a.x === b.x && a.y === b.y && a.h === b.h && a.g.every((v, i) => v === b.g[i]);
  const inside = (x, y) => x >= 0 && x < N && y >= 0 && y < N;

  /* A hypothesis H = { abs, t: turn per colour, flip: 'L' (cell left) | 'E' (cell entered) | 'N', cyc: ±1, order: 'TM'
   * (turn then move) | 'MT' (move then turn), k: steps per panel }. Relative turn codes: 0 straight, 1 right, 2 U-turn,
   * 3 left; absolute codes: the heading the ant takes. */
  function stepH(st, H, nc, log) {
    const g = st.g;
    const i0 = st.y * N + st.x;
    const h0 = st.h;
    let c;
    let i1;
    if (H.order === 'TM') {
      c = g[i0];
      st.h = H.abs ? H.t[c] : (h0 + H.t[c]) & 3;
      if (H.flip === 'L') g[i0] = (c + H.cyc + nc) % nc;
      st.x += DX[st.h];
      st.y += DY[st.h];
      if (!inside(st.x, st.y)) return false;
      i1 = st.y * N + st.x;
      if (H.flip === 'E') g[i1] = (g[i1] + H.cyc + nc) % nc;
    } else {
      st.x += DX[h0];
      st.y += DY[h0];
      if (!inside(st.x, st.y)) return false;
      i1 = st.y * N + st.x;
      c = g[i1];
      st.h = H.abs ? H.t[c] : (h0 + H.t[c]) & 3;
      if (H.flip === 'L') g[i0] = (g[i0] + H.cyc + nc) % nc;
      if (H.flip === 'E') g[i1] = (c + H.cyc + nc) % nc;
    }
    if (log) log.push({ from: i0, to: i1, c, h0, h: st.h });
    return true;
  }
  /* run one hypothesis per step (Hs = array); null if the ant walks off the board */
  function run(s, Hs, nc, log) {
    const st = { g: s.g.slice(), x: s.x, y: s.y, h: s.h };
    for (let i = 0; i < Hs.length; i++) if (!stepH(st, Hs[i], nc, log)) return null;
    return st;
  }
  const rep = (H, k) => RM.range(k).map(() => H);

  const HYP = {};
  function hypotheses(nc) {
    if (HYP[nc]) return HYP[nc];
    const tables = [];
    const rec = (pre) => {
      if (pre.length === nc) tables.push(pre);
      else for (let t = 0; t < 4; t++) rec(pre.concat([t]));
    };
    rec([]);
    const flips = nc === 2 ? [['L', 1], ['E', 1], ['N', 1]] : [['L', 1], ['L', -1], ['E', 1], ['E', -1], ['N', 1]];
    const out = [];
    for (const abs of [false, true])
      for (const t of tables)
        for (const [flip, cyc] of flips)
          for (const order of ['TM', 'MT'])
            for (let k = 1; k <= 4; k++) {
              const H = { abs, t, flip, cyc, order, k };
              H.seq = rep(H, k);
              out.push(H);
            }
    return (HYP[nc] = out);
  }

  RM.register({
    id: 'langton',
    name: "Langton's ant",
    difficulty: 7,
    generate(rng, variant) {
      const v = variant % 4;
      const nc = v === 3 ? 3 : 2;
      const k = v === 1 ? 3 : 2;
      const T = [[1, 3], [1, 3], [3, 1], [1, 1, 3]][v];
      const CN = nc === 2 ? ['white', 'black'] : ['white', 'grey', 'black'];
      const R0 = { abs: false, t: T, flip: 'L', cyc: 1, order: 'TM', k };
      const seqK = rep(R0, k);

      /* ---------------------------------------------------------------- rows */
      const makeRow = (ri) => {
        for (let tries = 0; tries < 300; tries++) {
          const x = rng.int(1, 4);
          const y = rng.int(1, 4);
          const h = rng.int(0, 3);
          const g = new Array(N * N).fill(0);
          const rad = k === 3 ? 3 : 2;
          const near = RM.range(N * N).filter((i) => Math.abs((i % N) - x) <= rad && Math.abs(Math.floor(i / N) - y) <= rad);
          const nb = nc === 2 ? rng.int(4, 9) : rng.int(6, 10);
          rng.sample(near, nb).forEach((i) => (g[i] = nc === 2 ? 1 : rng.int(1, 2)));
          const s0 = { g, x, y, h };
          const l1 = [];
          const l2 = [];
          const s1 = run(s0, seqK, nc, l1);
          if (!s1) continue;
          const s2 = run(s1, seqK, nc, l2);
          if (!s2) continue;
          const c1 = new Set(l1.map((l) => l.c));
          const c2 = new Set(l2.map((l) => l.c));
          const all = new Set([...c1, ...c2]);
          if (ri < 2 && all.size < 2) continue;
          if (ri === 2 && c2.size < 2) continue; // the hidden steps use at least two colours
          return { p: [s0, s1, s2], logs: [l1, l2] };
        }
        throw RM.RETRY;
      };
      const rows = [0, 1, 2].map(makeRow);
      if (nc === 3) {
        // rows 1–2 together show the ant on all three colours
        const seen = new Set();
        [0, 1].forEach((r) => rows[r].logs.forEach((L) => L.forEach((l) => seen.add(l.c))));
        RM.need(seen.size === 3);
      }
      const P = rows.map((r) => r.p);
      const S = P[2][1];
      const ans = P[2][2];
      const hidLog = rows[2].logs[1];
      const ansKey = skey(ans);

      /* ---------------------------------------------------------------- uniqueness */
      const trans = [[P[0][0], P[0][1]], [P[0][1], P[0][2]], [P[1][0], P[1][1]], [P[1][1], P[1][2]], [P[2][0], P[2][1]]];
      const preds = new Set();
      let intended = false;
      for (const H of hypotheses(nc)) {
        let ok = true;
        for (let i = 0; i < trans.length && ok; i++) {
          const r = run(trans[i][0], H.seq, nc);
          ok = !!r && same(r, trans[i][1]);
        }
        if (!ok) continue;
        const p = run(S, H.seq, nc);
        preds.add(p ? skey(p) : 'off');
        if (!H.abs && H.flip === 'L' && H.cyc === 1 && H.order === 'TM' && H.k === k && RM.sameArr(H.t, T)) intended = true;
        if (preds.size > 1) break;
      }
      RM.need(intended && preds.size === 1 && preds.has(ansKey));

      /* ---------------------------------------------------------------- no accidental shortcuts */
      const grid = (f) => RM.grid3((r, c) => f(P[r][c]));
      const cnt = (val) => (s) => s.g.filter((q) => q === val).length;
      for (let val = 1; val < nc; val++) RM.needNoConflict(grid(cnt(val)), cnt(val)(ans), 'numeric');
      RM.needNoConflict(grid((s) => s.h), ans.h, 'categorical');
      RM.needNoConflict(grid((s) => s.x), ans.x, 'numeric');
      RM.needNoConflict(grid((s) => s.y), ans.y, 'numeric');
      RM.needNoConflict(grid((s) => s.g[s.y * N + s.x]), ans.g[ans.y * N + ans.x], 'categorical');

      /* ---------------------------------------------------------------- distractors */
      const pos = (s) => cname(s.y * N + s.x);
      const where = (s) => `${pos(s)} facing ${DIRN[s.h]}`;
      const poseTxt = (o) =>
        o.x === ans.x && o.y === ans.y ? `the ant should face ${DIRN[ans.h]}, not ${DIRN[o.h]}` : `the ant should end on ${where(ans)}, not on ${where(o)}`;
      const gridTxt = (o) => {
        const d = RM.range(N * N).filter((i) => o.g[i] !== ans.g[i]);
        return d.length ? d.map((i) => `${cname(i)} should be ${CN[ans.g[i]]}`).join(', ') : '';
      };
      const concrete = (o) => {
        const out = [];
        if (o.x !== ans.x || o.y !== ans.y || o.h !== ans.h) out.push(poseTxt(o));
        const gt = gridTxt(o);
        if (gt) out.push(gt);
        return out;
      };
      const mirrorT = T.map((t) => (4 - t) & 3);
      const H = (o) => Object.assign({}, R0, o);
      // "centres": complete walks under a misunderstood rule
      const centres = [];
      const addCentre = (Hs, why, walk) => {
        const log = [];
        const s = run(S, Hs, nc, log);
        if (s) centres.push({ s, log, walk, flaws: [why].concat(concrete(s)) });
      };
      hidLog.forEach((l, j) => {
        const wrong = mirrorT[l.c];
        addCentre(seqK.map((q, i) => (i === j ? H({ t: mirrorT }) : q)), `at step ${j + 1} the ant is on a ${CN[l.c]} cell and must turn ${TN[T[l.c]]}, not ${TN[wrong]}`, true);
        addCentre(seqK.map((q, i) => (i === j ? H({ t: T.map(() => 0) }) : q)), `at step ${j + 1} the ant must turn ${TN[T[l.c]]} — it never goes straight on`, true);
      });
      const ruleTxt = (t) => t.map((q, c) => `${TN[q]} on ${CN[c]}`).join(', ');
      addCentre(rep(H({ t: mirrorT }), k), `the turns are mirrored: the ant turns ${ruleTxt(T)}`, true);
      addCentre(rep(R0, k - 1), `between two panels the ant takes ${k} steps, not ${k - 1}`, true);
      addCentre(rep(R0, k + 1), `between two panels the ant takes ${k} steps, not ${k + 1}`, true);
      addCentre(rep(H({ flip: 'E' }), k), 'the ant flips the cell it leaves, not the cell it steps onto', false);
      addCentre(rep(H({ order: 'MT' }), k), 'the ant turns on its own cell and then moves — it does not move first and turn on the new cell', false);
      if (nc === 3) addCentre(rep(H({ cyc: -1 }), k), 'a cell the ant leaves goes white → grey → black → white, not the other way round', true);
      // single slips on top of a walk (the answer's own walk or a centre's)
      const slips = (cen, isAns) => {
        const out = [];
        const s = cen.s;
        const log = cen.log;
        const pre = (cen.flaws || []).slice(0, 1);
        const mk = (o, why) => out.push({ s: o, flaws: isAns ? [why] : pre.concat(['besides, ' + why]) });
        const here = s.g[s.y * N + s.x];
        const hp = (s.h + T[here]) & 3;
        mk(Object.assign({}, s, { h: hp }), isAns ? `the ant has already turned for its next step: it should still face ${DIRN[s.h]}, the way it last moved` : 'the ant must not turn again on arrival — it faces the way it last moved');
        mk(Object.assign({}, s, { h: (s.h + 2) & 3 }), isAns ? `the ant faces the way it last moved (${DIRN[s.h]}), not back where it came from` : 'the ant faces the way it last moved, not back where it came from');
        const froms = log.map((l) => l.from);
        if (new Set(froms).size === froms.length) {
          log.forEach((l, j) => {
            const g = s.g.slice();
            g[l.from] = S.g[l.from];
            mk(Object.assign({}, s, { g }), isAns ? `${cname(l.from)} should be ${CN[s.g[l.from]]}: the ant flips every cell it leaves (step ${j + 1})` : `every cell the ant leaves changes colour — here ${cname(l.from)} was left unchanged`);
          });
          const tos = log.map((l) => l.to);
          if (new Set(tos.concat(froms)).size === froms.length + 1) {
            const g = S.g.slice();
            tos.forEach((i) => (g[i] = (g[i] + 1) % nc));
            mk(Object.assign({}, s, { g }), isAns ? `the cells that change colour are the ones the ant leaves (${froms.map(cname).join(', ')}), not the ones it enters (${tos.map(cname).join(', ')})` : 'the colour change belongs to the cells the ant leaves, not to the cells it enters');
          }
        }
        return out;
      };
      const ansSlips = slips({ s: ans, log: hidLog }, true);
      const centreSlips = centres.map((c) => (c.walk ? slips(c, false) : []));

      // pick 7: several wrong walks + slips, so that the answer is not the "average" option
      const feats = (s) => [s.x * 10 + s.y, s.h].concat(s.g);
      const score = (set) => {
        const F = set.map(feats);
        return F.map((f, i) => F.reduce((acc, f2, j) => (j === i ? acc : acc + f.reduce((a, val, q) => a + (val === f2[q] ? 1 : 0), 0)), 0));
      };
      let best = null;
      for (let t = 0; t < 250 && !(best && best.ok); t++) {
        const walkIdx = centres.map((c, i) => i).filter((i) => centres[i].walk);
        const otherIdx = centres.map((c, i) => i).filter((i) => !centres[i].walk);
        const nW = Math.min(walkIdx.length, rng.int(2, 3));
        const ci = rng.sample(walkIdx, nW).concat(rng.sample(otherIdx, rng.int(0, Math.min(1, otherIdx.length))));
        const fill = ansSlips.concat(...ci.map((i) => centreSlips[i]));
        const picks = ci.map((i) => centres[i]).concat(rng.sample(fill, 7 - ci.length));
        if (picks.length !== 7) continue;
        const keys = new Set([ansKey].concat(picks.map((p) => skey(p.s))));
        if (keys.size !== 8) continue;
        const nAns = picks.filter((p) => ansSlips.includes(p)).length;
        if (nAns < 1) continue;
        const sc = score([ans].concat(picks.map((p) => p.s)));
        const ge = sc.slice(1).filter((q) => q >= sc[0]).length;
        // every feature of the answer also appears in some distractor
        const fa = feats(ans);
        const fd = picks.map((p) => feats(p.s));
        const shared = fa.every((val, q) => fd.some((f) => f[q] === val));
        const val = (ge >= 2 ? 100 : ge * 30) + (shared ? 50 : 0) + nW;
        if (!best || val > best.val) best = { val, picks, ok: ge >= 2 && shared };
      }
      RM.need(best && best.ok);

      /* ---------------------------------------------------------------- correction */
      const turnRule =
        nc === 2
          ? `on a <b>white</b> cell it turns a quarter turn <b>${TN[T[0]]}</b>, on a <b>black</b> cell a quarter turn <b>${TN[T[1]]}</b>; it then flips the colour of that cell (white ↔ black) and moves one cell forward`
          : `on a <b>white</b> cell it turns a quarter turn <b>${TN[T[0]]}</b>, on a <b>grey</b> cell <b>${TN[T[1]]}</b>, on a <b>black</b> cell <b>${TN[T[2]]}</b>; the cell it leaves moves one shade on along the cycle <b>white → grey → black → white</b>; then the ant moves one cell forward`;
      const r1 = rows[0].logs[0];
      const stepTxt = (l, j) =>
        `step ${j + 1}: ${cname(l.from)} is ${CN[l.c]} → the ant turns ${TN[T[l.c]]} and now faces ${DIRN[l.h]}; ${cname(l.from)} becomes ${CN[(l.c + 1) % nc]}; the ant moves to ${cname(l.to)}`;
      const changed = hidLog.map((l) => `${cname(l.from)} now ${CN[ans.g[l.from]]}`);
      return {
        difficulty: v === 1 || v === 3 ? 8 : 7,
        hint: 'what the ant does depends on the colour under its feet — and it leaves a trace.',
        panels: RM.flat(P),
        answer: ans,
        key: skey,
        options: [{ spec: ans, flaws: [] }].concat(best.picks.map((p) => ({ spec: p.s, flaws: p.flaws }))),
        render(sp) {
          const pic = new RM.Pic();
          const PAL = nc === 2 ? ['#ffffff', RM.INK] : ['#ffffff', RM.GRAY, RM.INK];
          pic.add(`<rect x="${O}" y="${O}" width="${C * N}" height="${C * N}" fill="#fff"/>`);
          for (let i = 0; i < N * N; i++) {
            if (sp.g[i]) pic.add(`<rect x="${O + (i % N) * C}" y="${O + Math.floor(i / N) * C}" width="${C}" height="${C}" fill="${PAL[sp.g[i]]}"/>`);
          }
          for (let j = 1; j < N; j++) {
            RM.line(pic, O + j * C, O, O + j * C, O + N * C, { sw: 0.9, color: '#b4bac3', cap: 'butt' });
            RM.line(pic, O, O + j * C, O + N * C, O + j * C, { sw: 0.9, color: '#b4bac3', cap: 'butt' });
          }
          pic.add(`<rect x="${O}" y="${O}" width="${C * N}" height="${C * N}" fill="none" stroke="${RM.INK}" stroke-width="1.6"/>`);
          const cx = O + (sp.x + 0.5) * C;
          const cy = O + (sp.y + 0.5) * C;
          const dx = DX[sp.h];
          const dy = DY[sp.h];
          const px = -dy;
          const py = dx;
          const pts = [
            [cx + 5.2 * dx, cy + 5.2 * dy],
            [cx - 4.2 * dx + 4.4 * px, cy - 4.2 * dy + 4.4 * py],
            [cx - 4.2 * dx - 4.4 * px, cy - 4.2 * dy - 4.4 * py],
          ];
          const dark = sp.g[sp.y * N + sp.x] === nc - 1;
          RM.polygon(pic, pts, { fill: dark ? 'white' : 'black', sw: 1, stroke: dark ? '#ffffff' : RM.INK });
          return pic.svg();
        },
        rules: [
          {
            k: 'Board',
            t: 'each panel is a 6×6 board (columns A–F from left to right, rows 1–6 from top to bottom). The triangle is an <b>ant</b> pointing the way it faces. Each row follows one ant: every panel shows the board a fixed number of steps after the previous panel.',
          },
          { k: 'One step', t: `the ant looks at the colour of its own cell: ${turnRule}. After a step it faces the way it has just moved.` },
          {
            k: 'Rhythm',
            t: `between two neighbouring panels the ant takes exactly <b>${k} steps</b>, so ${k} cells change colour (the cells it left). E.g. row 1, panel 1 → 2: the ant goes from ${pos(P[0][0])} to ${pos(P[0][1])} and ${r1.map((l) => cname(l.from)).join(', ')} change colour.`,
          },
          { k: 'Row 3', t: `start from the middle panel: the ant is on ${where(S)}. ${hidLog.map(stepTxt).join('. ')}.` },
          { k: 'Answer', t: `<b>the ant on ${where(ans)}, with ${changed.join(' and ')}</b> — every other cell as in the middle panel.` },
        ],
      };
    },
  });
})();
