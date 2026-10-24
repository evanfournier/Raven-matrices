/* Turns (grandmaster): every panel is an open path on a lattice (start dot, arrow at the end). Its turn balance is
 * T = (number of right turns) − (number of left turns). Variant 0/3: T(col 3) = T(col 1) + T(col 2) (variant 3 with
 * larger balances); variant 1: T is constant along each row; variant 2: T(col 3) = T(col 1) − T(col 2). Segment
 * number, total length and the right / left counts are random decoys (needNoConflict); T mod 4 (the final heading
 * relative to the start) is checked as an alternative reading, so the correct balance is always odd (±1, ±3) and
 * no distractor has a balance congruent to it mod 4. Distractors: mirror image, one turn flipped, a turn removed or
 * added, only right turns counted, total turns counted, difference instead of sum, copies of a neighbour's balance. */
(function () {
  'use strict';
  const RM = window.RM;
  const SP = 15.2;
  const OR = 12;
  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]]; // E S W N : +1 = right turn (clockwise on the screen)

  function build(S, lens, h0, st) {
    let [x, y] = st;
    let h = h0;
    const pts = [[x, y]];
    const seen = new Set([x * 8 + y]);
    for (let i = 0; i <= S.length; i++) {
      for (let s = 0; s < lens[i]; s++) {
        x += DIRS[h][0];
        y += DIRS[h][1];
        if (x < 0 || y < 0 || x > 5 || y > 5 || seen.has(x * 8 + y)) return null;
        seen.add(x * 8 + y);
      }
      pts.push([x, y]);
      if (i < S.length) h = RM.mod(h + S[i], 4);
    }
    return pts;
  }
  function stats(pts) {
    let R = 0;
    let L = 0;
    let len = 0;
    for (let i = 1; i < pts.length; i++) {
      len += Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]);
      if (i < pts.length - 1) {
        const a = [pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]];
        const b = [pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]];
        const c = a[0] * b[1] - a[1] * b[0];
        if (c > 0) R++;
        else if (c < 0) L++;
      }
    }
    return { R, L, T: R - L, segs: pts.length - 1, len };
  }
  function seqFor(rng, R, L) {
    return rng.shuffle(RM.range(R + L).map((i) => (i < R ? 1 : -1)));
  }
  function genPath(rng, T, nt) {
    const turns = nt === undefined ? rng.pick(Math.abs(T) === 0 ? [2, 4] : Math.abs(T) === 1 ? [1, 3, 3, 5] : Math.abs(T) === 2 ? [2, 4, 4, 6] : [3, 5, 5]) : nt;
    RM.need((turns + T) % 2 === 0 && turns >= Math.abs(T));
    const R = (turns + T) / 2;
    const L = turns - R;
    for (let t = 0; t < 120; t++) {
      const S = seqFor(rng, R, L);
      const lens = RM.range(turns + 1).map(() => rng.pick([1, 1, 2, 2, 3]));
      const h0 = rng.int(0, 3);
      const st = [rng.int(0, 5), rng.int(0, 5)];
      const pts = build(S, lens, h0, st);
      if (pts) return { pts, S, lens, h0, st };
    }
    return null;
  }

  const CFG = [
    { rule: 'sum', amp: 2, diff: 7 },
    { rule: 'const', amp: 3, diff: 7 },
    { rule: 'diff', amp: 2, diff: 8 },
    { rule: 'sum', amp: 3, diff: 8 },
  ];
  const sgn = (v) => (v > 0 ? '+' + v : v < 0 ? '−' + -v : '0');

  RM.register({
    id: 'turn-count',
    name: 'Turns',
    difficulty: 7,
    generate(rng, variant) {
      const cfg = CFG[variant % 4];
      let rows = null;
      for (let t = 0; t < 400 && !rows; t++) {
        const cand = [];
        for (let r = 0; r < 3; r++) {
          let a;
          let b;
          let c;
          if (cfg.rule === 'const') a = b = c = rng.int(-cfg.amp, cfg.amp);
          else {
            a = rng.int(-cfg.amp, cfg.amp);
            b = rng.int(-cfg.amp, cfg.amp);
            c = cfg.rule === 'sum' ? a + b : a - b;
          }
          cand.push([a, b, c]);
        }
        if (cand.some((q) => Math.abs(q[2]) > 3) || Math.abs(cand[2][2]) % 2 !== 1) continue;
        if (new Set(cand.map((q) => q.join())).size !== 3) continue;
        if (!cand.slice(0, 2).some((q) => q.some((v) => v % 2 === 0))) continue;
        const g = RM.grid3((r, c) => cand[r][c]);
        if (RM.unique(g, cand[2][2], 'numeric') && RM.unique(g, cand[2][2], 'numeric', 4)) rows = cand;
      }
      RM.need(rows);
      const T3 = rows[2][2];
      /* the eight visible paths and the correct answer */
      let paths = null;
      let st = null;
      for (let t = 0; t < 60 && !paths; t++) {
        const ps = [];
        for (let r = 0; r < 3; r++)
          for (let c = 0; c < 3; c++) {
            const p = genPath(rng, rows[r][c]);
            RM.need(p);
            ps.push(p);
          }
        const ss = ps.map((p) => stats(p.pts));
        if (!ss.every((s, i) => s.T === rows[Math.floor(i / 3)][i % 3] && s.segs >= 2)) continue;
        if (new Set(ps.map((p) => JSON.stringify(p.pts))).size !== 9) continue;
        /* decoy attributes must not hand over the answer */
        if (!['segs', 'len', 'R', 'L'].every((k) => RM.unique(RM.grid3((r, c) => ss[r * 3 + c][k]), ss[8][k], 'numeric', undefined, true))) continue;
        paths = ps;
        st = ss;
      }
      RM.need(paths);
      const ans = paths[8];

      /* distractors */
      const cands = [];
      const T3m = RM.mod(T3, 4);
      const addPath = (grp, pts, note) => {
        if (!pts) return;
        const s = stats(pts);
        if (s.T === T3 || RM.mod(s.T, 4) === T3m || s.segs < 2) return;
        cands.push({ grp, pts, s, note });
      };
      // mirror image (left–right)
      addPath('mirror', ans.pts.map(([x, y]) => [5 - x, y]), 'this is the mirror image of the correct path: every right turn became a left turn and vice versa');
      // one turn flipped
      ans.S.forEach((_, i) => addPath('flip', build(ans.S.map((v, j) => (j === i ? -v : v)), ans.lens, ans.h0, ans.st), `it has the same number of segments as the correct path, but one turn goes the other way`));
      // one turn removed / added
      ans.S.forEach((_, i) => addPath('drop', build(ans.S.filter((__, j) => j !== i), ans.lens.filter((__, j) => j !== i + 1), ans.h0, ans.st), 'it has one turn too few'));
      for (let t = 0; t < 6; t++) {
        const i = rng.int(0, ans.S.length);
        const v = rng.pick([1, -1]);
        const S2 = ans.S.slice();
        S2.splice(i, 0, v);
        const l2 = ans.lens.slice();
        l2.splice(i + 1, 0, rng.pick([1, 2]));
        addPath('add', build(S2, l2, ans.h0, ans.st), 'it has one turn too many');
      }
      // balance replaced by those of other readings
      const wants = [
        ['rightonly', st[6].R + st[7].R, 'its balance equals the sum of the right turns of panels 6 and 7 (left turns were ignored)'],
        ['total', st[6].R + st[6].L + st[7].R + st[7].L, 'its balance equals the total number of turns of panels 6 and 7 (their direction was ignored)'],
        ['copy', rows[2][0], 'its balance is just that of panel 6'],
        ['copy', rows[2][1], 'its balance is just that of panel 7'],
        ['diff', cfg.rule === 'diff' ? rows[2][0] + rows[2][1] : rows[2][0] - rows[2][1], 'it uses the wrong operation on the balances of panels 6 and 7'],
        ['neg', -T3, 'its balance has the wrong sign'],
        ['other', T3 + 2, 'its balance is off by two'],
        ['other', T3 - 2, 'its balance is off by two'],
        ['other', T3 + 1, 'its balance is off by one'],
        ['other', T3 - 1, 'its balance is off by one'],
      ];
      wants.forEach(([g, T, note]) => {
        if (Math.abs(T) > 4) return;
        for (let k = 0; k < 3; k++) {
          const nt = Math.abs(T) + 2 * rng.int(0, 2);
          const p = nt >= 1 && nt <= 6 ? genPath(rng, T, nt) : null;
          if (p) addPath(g, p.pts, note);
        }
      });
      const seen = new Set([JSON.stringify(ans.pts)]);
      const uniq = rng.shuffle(cands).filter((c) => (seen.has(JSON.stringify(c.pts)) ? false : (seen.add(JSON.stringify(c.pts)), true)));
      const order = ['mirror', 'flip', 'flip', 'drop', 'add', 'rightonly', 'total', 'diff', 'copy', 'other'];
      const chosen = [];
      order.forEach((g) => {
        if (chosen.length >= 7) return;
        const c = uniq.find((x) => x.grp === g && !chosen.includes(x));
        if (c) chosen.push(c);
      });
      uniq.forEach((c) => {
        if (chosen.length < 7 && !chosen.includes(c)) chosen.push(c);
      });
      RM.need(chosen.length === 7);
      const P = (pts) => ({ pts });
      const options = [{ spec: P(ans.pts), flaws: [] }].concat(
        chosen.map((c) => ({
          spec: P(c.pts),
          flaws: [`${c.note}: it turns right ${c.s.R} time${c.s.R === 1 ? '' : 's'} and left ${c.s.L} time${c.s.L === 1 ? '' : 's'}, a balance of ${sgn(c.s.T)} instead of ${sgn(T3)}`],
        }))
      );

      const render = (s) => {
        const pic = new RM.Pic();
        const X = (p) => OR + p[0] * SP;
        const Y = (p) => OR + p[1] * SP;
        for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) RM.circle(pic, OR + i * SP, OR + j * SP, 1.1, { fill: RM.LIGHT, stroke: RM.LIGHT, sw: 0.2 });
        const pts = s.pts;
        const n = pts.length;
        const lastD = [Math.sign(pts[n - 1][0] - pts[n - 2][0]), Math.sign(pts[n - 1][1] - pts[n - 2][1])];
        const end = [X(pts[n - 1]) - lastD[0] * 5.5, Y(pts[n - 1]) - lastD[1] * 5.5];
        const poly = pts.map((p, i) => (i === n - 1 ? end : [X(p), Y(p)]));
        RM.polyline(pic, poly, { sw: 3 });
        const tip = [X(pts[n - 1]), Y(pts[n - 1])];
        const nx = -lastD[1];
        const ny = lastD[0];
        RM.polygon(pic, [tip, [tip[0] - lastD[0] * 10 + nx * 5.2, tip[1] - lastD[1] * 10 + ny * 5.2], [tip[0] - lastD[0] * 10 - nx * 5.2, tip[1] - lastD[1] * 10 - ny * 5.2]], { fill: 'black', sw: 1, stroke: RM.INK });
        RM.circle(pic, X(pts[0]), Y(pts[0]), 4.2, { fill: 'black', sw: 1 });
        return pic.svg();
      };
      const key = (s) => JSON.stringify(s.pts);

      /* explanation */
      const seqTxt = (p) => {
        const t = p.S.map((v) => (v > 0 ? 'R' : 'L')).join(' ');
        const s = stats(p.pts);
        return `${t || 'no turn'} → ${s.R} right − ${s.L} left = <b>${sgn(s.T)}</b>`;
      };
      const ruleText = {
        sum: 'in every row the balance of column 3 is the <b>sum</b> of the balances of columns 1 and 2',
        const: 'the balance is the <b>same</b> for the three paths of a row (it changes from row to row)',
        diff: 'in every row the balance of column 3 is the balance of column 1 <b>minus</b> the balance of column 2',
      }[cfg.rule];
      const rowTxt = [0, 1]
        .map((r) => `row ${r + 1}: ${rows[r].map(sgn).join(', ')}`)
        .join('; ');
      const rules = [
        {
          k: 'Turn balance',
          t: `walk along each path from the dot to the arrow and count the turns: every <b>right turn is +1</b>, every <b>left turn is −1</b> (seen from the walker). The balance of a path is right turns minus left turns. Length, number of segments and the plain number of turns are distractions.`,
        },
        {
          k: 'The rule',
          t: `${ruleText}. Balances in rows 1–2 (columns 1, 2, 3): ${rowTxt}.`,
        },
        {
          k: 'Row 3',
          t: `panel 6: ${seqTxt(paths[6])}; panel 7: ${seqTxt(paths[7])}. ${cfg.rule === 'sum' ? `(${sgn(rows[2][0])}) + (${sgn(rows[2][1])})` : cfg.rule === 'diff' ? `${sgn(rows[2][0])} − (${sgn(rows[2][1])})` : `the row keeps ${sgn(T3)}`} = ${sgn(T3)}, so panel 8 is a path with <b>right turns minus left turns = ${sgn(T3)}</b> (the correct option: ${ans.S.map((v) => (v > 0 ? 'R' : 'L')).join(' ')}); no other option has this balance.`,
        },
      ];
      const panels = paths.slice(0, 8).map((p) => P(p.pts));
      return {
        difficulty: cfg.diff,
        hint: 'walk along the paths and keep a running count of turns — right and left do not count the same way.',
        panels,
        answer: P(ans.pts),
        options,
        render,
        key,
        rules,
      };
    },
  });
})();
