/* Robot arm (grandmaster): forward kinematics. Each joint turns by a fixed amount RELATIVE to the segment it is attached to,
   so turning the base joint also carries every later segment along. Columns apply the joint steps; rows are different start poses. */
(function () {
  'use strict';
  const RM = window.RM;
  const ang = (x) => (((x % 360) + 540) % 360) - 180;
  const D = Math.PI / 180;
  const NAMES3 = ['base joint', 'elbow', 'wrist'];
  const NAMES4 = ['base joint', 'shoulder', 'elbow', 'wrist'];
  const WIDTH = [4, 3.2, 2.4, 2], COLORS = [RM.INK, RM.DARK, RM.INK, RM.DARK];

  function pts(s) {
    let x = 50, y = 88, d = 0;
    const P = [[x, y]];
    for (let i = 0; i < s.r.length; i++) {
      d += s.r[i];
      x += s.L[i] * Math.sin(d * D); y -= s.L[i] * Math.cos(d * D);
      P.push([x, y]);
    }
    return { P, d };
  }
  function fingers(s) {
    const { P, d } = pts(s), t = P[P.length - 1], th = s.g ? 12 : 35, out = [];
    for (const sg of [-1, 1]) { const a = (d + sg * th) * D; out.push([t[0] + 6 * Math.sin(a), t[1] - 6 * Math.cos(a)]); }
    return { t, out };
  }
  function valid(s) {
    for (let i = 1; i < s.r.length; i++) if (Math.abs(ang(s.r[i])) >= 180) return false;
    const { P } = pts(s), f = fingers(s);
    for (const p of P.slice(1).concat(f.out)) if (p[0] < 7 || p[0] > 93 || p[1] < 7 || p[1] > 85) return false;
    return true;
  }
  const norm = (s) => ({ r: s.r.map(ang), L: s.L, g: s.g });
  const dirTxt = (d) => { d = ang(d); return d === 0 ? 'straight up' : d === 180 || d === -180 ? 'straight down' : Math.abs(d) + '° to the ' + (d > 0 ? 'right' : 'left') + ' of vertical'; };
  const turnTxt = (a) => { a = ang(a); return a === 0 ? 'does not move' : 'turns ' + Math.abs(a) + '° ' + (a > 0 ? 'clockwise' : 'anticlockwise'); };
  const worldDirs = (r) => { let d = 0; return r.map((x) => (d += x)); };
  const relFromWorld = (w) => w.map((x, i) => ang(x - (i ? w[i - 1] : 0)));

  RM.register({
    id: 'robot-arm',
    name: 'Robot arm',
    difficulty: 7,
    generate(rng, variant) {
      const n = variant === 3 ? 4 : 3, names = n === 4 ? NAMES4 : NAMES3;
      const L = n === 4 ? [24, 17, 12, 8] : [24, 18, 12];
      const grip = variant === 1, flipV = variant === 2;
      // joint steps
      const vals = [-90, -45, 0, 45, 90];
      const s1 = RM.range(n).map(() => rng.pick(vals));
      RM.need(s1[0] !== 0 && s1.filter((v) => v !== 0).length >= 2);
      const s2 = s1.slice();
      if (flipV) { const nz = RM.range(n).filter((i) => s1[i] !== 0); s2[rng.pick(nz)] *= -1; RM.need(s2.some((v, i) => v !== s1[i])); }
      // rows: start poses
      const rows = [];
      for (let y = 0; y < 3; y++) {
        let row = null;
        for (let t = 0; t < 40 && !row; t++) {
          const r0 = RM.range(n).map((i) => rng.pick(i === 0 ? [-90, -45, 0, 45, 90] : [-135, -90, -45, 0, 45, 90, 135]));
          const g0 = grip ? rng.int(0, 1) : 0;
          const cand = [0, 1, 2].map((c) => norm({ r: r0.map((v, i) => v + (c >= 1 ? s1[i] : 0) + (c >= 2 ? s2[i] : 0)), L, g: (g0 + c) % 2 }));
          if (cand.every(valid)) row = cand;
        }
        RM.need(row);
        rows.push(row);
      }
      const key = (s) => s.r.map(ang).join(',') + '|' + s.L.join(',') + '|' + s.g;
      const answer = rows[2][2];
      const seen = new Set();
      for (const r of rows) for (const p of r) { RM.need(!seen.has(key(p))); seen.add(key(p)); }
      for (let y = 0; y < 3; y++) RM.need(!rows[y][0].r.every((v, i) => rows[(y + 1) % 3][0].r[i] === v));
      // hypotheses: per joint (step1, step2) in 8 values; all consistent ones must predict the same final angle
      const H = [-135, -90, -45, 0, 45, 90, 135, 180];
      for (let i = 0; i < n; i++) {
        const pred = new Set();
        for (const p of H) for (const q of H) {
          let ok = true;
          for (let y = 0; y < 2 && ok; y++) ok = ang(rows[y][0].r[i] + p) === rows[y][1].r[i] && ang(rows[y][1].r[i] + q) === rows[y][2].r[i];
          if (ok && ang(rows[2][0].r[i] + p) === rows[2][1].r[i]) pred.add(ang(rows[2][1].r[i] + q));
        }
        RM.need(pred.size === 1 && pred.has(answer.r[i]));
      }
      // distractors
      const prev = rows[2][1], T = answer;
      const mk = (r, flaw, o) => ({ spec: norm({ r, L: (o && o.L) || L, g: o && o.g !== undefined ? o.g : T.g }), flaws: [flaw] });
      const A = [], B = [], C = [];
      {
        const w = worldDirs(prev.r).map((d, i) => d + s2[i]);
        A.push(mk(relFromWorld(w), 'The joint steps were applied to the absolute direction of each segment, ignoring that a segment is carried along by every joint before it.'));
      }
      A.push(mk(prev.r.map((v, i) => v + 2 * s2[i]), 'The step of the last column was applied twice.'));
      A.push(mk(prev.r.slice(), 'The arm did not move: this is the same pose as the panel on its left.'));
      for (let i = 0; i + 1 < n; i++) {
        const sw = s2.slice(); sw[i] = s2[i + 1]; sw[i + 1] = s2[i];
        A.push(mk(prev.r.map((v, k) => v + sw[k]), 'The steps of the ' + names[i] + ' and the ' + names[i + 1] + ' were swapped.'));
      }
      A.push(mk(T.r, 'The segments have the wrong lengths (the lengths never change in a puzzle).', { L: L.slice().reverse() }));
      A.push(mk(T.r, 'The segments have the wrong lengths (the lengths never change in a puzzle).', { L: [L[1], L[0]].concat(L.slice(2)) }));
      if (flipV) A.push(mk(prev.r.map((v, i) => v + s1[i]), 'The first column step was repeated; the step of the second column is different for one joint.'));
      if (grip) A.push(mk(T.r, 'The gripper has the wrong state: it alternates open/closed at every column.', { g: 1 - T.g }));
      for (let i = 0; i < n; i++) {
        const sg = s2.slice(); sg[i] = -sg[i];
        B.push(mk(prev.r.map((v, k) => v + sg[k]), 'The ' + names[i] + ' turns the wrong way.'));
        const ms = s2.slice(); ms[i] = 0;
        B.push(mk(prev.r.map((v, k) => v + ms[k]), 'The ' + names[i] + ' should have turned in this step.'));
        for (const e of [-45, 45]) C.push(mk(T.r.map((v, k) => (k === i ? v + e : v)), 'The ' + names[i] + ' is 45° off.'));
      }
      const picked = [], used = new Set([key(T)]);
      for (const grp of [rng.shuffle(A).concat(rng.shuffle(B)), rng.shuffle(C)]) {
        for (const o of grp) {
          if (picked.length >= 7) break;
          const k = key(o.spec);
          if (used.has(k) || !valid(o.spec)) continue;
          used.add(k); picked.push(o);
        }
      }
      RM.need(picked.length === 7);
      const options = picked.concat([{ spec: answer, flaws: [] }]);
      // rules text
      const wd = worldDirs(answer.r);
      const stepTxt = (s) => names.map((nm, i) => 'the ' + nm + ' ' + turnTxt(s[i])).join(', ');
      const rules = [
        { k: 'Relative joints', t: 'Each joint turns relative to the segment it is attached to, so when a joint turns it carries all the later segments with it (the wrist moves with the elbow, the elbow with the base joint).' },
        { k: 'Column steps', t: 'From column 1 to column 2: ' + stepTxt(s1) + '. ' + (flipV ? 'From column 2 to column 3 the steps are the same except for ' + RM.range(n).filter((i) => s2[i] !== s1[i]).map((i) => 'the ' + names[i] + ', which now ' + turnTxt(s2[i])).join(' and ') + '.' : 'The same steps are applied again from column 2 to column 3.') + (grip ? ' The gripper switches between open and closed at every column.' : '') },
        { k: 'Rows', t: 'Each row starts from a different pose; segment lengths never change.' },
        { k: 'Missing panel', t: 'Row 3, column 2 is the starting point. Applying ' + stepTxt(s2) + ' gives: ' + names.map((nm, i) => 'segment ' + (i + 1) + ' points <b>' + dirTxt(wd[i]) + '</b>').join(', ') + (grip ? '; the gripper is <b>' + (answer.g ? 'closed' : 'open') + '</b>' : '') + '.' },
      ];
      return {
        panels: [rows[0][0], rows[0][1], rows[0][2], rows[1][0], rows[1][1], rows[1][2], rows[2][0], rows[2][1]],
        answer, options, key, rules,
        hint: 'Each joint only knows the segment it is attached to.',
        render(s) {
          const pic = new RM.Pic();
          const { P } = pts(s), f = fingers(s);
          RM.line(pic, 10, 92, 90, 92, { sw: 1.6, color: RM.GRAY });
          RM.polygon(pic, [[38, 96], [62, 96], [62, 86], [38, 86]].map((p) => p), { fill: RM.DARK, sw: 1.5, stroke: RM.INK });
          for (let i = 0; i < n; i++) RM.line(pic, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1], { sw: WIDTH[i], color: COLORS[i], cap: 'round' });
          for (const o of f.out) RM.line(pic, f.t[0], f.t[1], o[0], o[1], { sw: 1.8, color: RM.INK, cap: 'round' });
          for (let i = 0; i < n; i++) RM.circle(pic, P[i][0], P[i][1], 2.8, { fill: RM.WHITE, sw: 1.3, stroke: RM.INK });
          return pic.svg();
        },
      };
    },
  });
})();
