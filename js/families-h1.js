/* Elite families (h1): graph-parity, contagion, flipflop — set H "Networks & paths". */
(function () {
  'use strict';
  const RM = window.RM;
  const bkey = (a) => a.map((x) => (x ? 1 : 0)).join('');
  const polar = (cx, cy, r, a) => [cx + r * Math.sin((a * Math.PI) / 180), cy - r * Math.cos((a * Math.PI) / 180)];

  /* ================================================================ Odd nodes */
  RM.register({
    id: 'graph-parity',
    name: 'Odd nodes',
    difficulty: 6,
    generate(rng, variant) {
      const v = variant % 4;
      const centre = v === 3;
      const P = RM.range(6).map((k) => polar(50, 50, 36, k * 60));
      if (centre) P.push([50, 50]);
      const E = [];
      for (let k = 0; k < 6; k++) E.push([k, (k + 1) % 6]);
      if (centre) for (let k = 0; k < 6; k++) E.push([k, 6]);
      else for (let k = 0; k < 6; k++) E.push([k, (k + 2) % 6]);
      const fname = ['xor', 'or', 'andnot', 'xor'][v];
      const f = RM.BOOL[fname].f;
      const nn = P.length;
      const odd = (on) => RM.range(nn).map((n) => E.filter((e, i) => on[i] && (e[0] === n || e[1] === n)).length % 2 === 1);
      const rows = RM.range(3).map(() => {
        const A = E.map(() => rng.chance(0.45));
        const B = E.map(() => rng.chance(0.45));
        const C = A.map((x, i) => f(x, B[i]));
        RM.need(C.filter(Boolean).length >= 3 && bkey(C) !== bkey(A) && bkey(C) !== bkey(B));
        return [A, B, C];
      });
      // edges: every boolean rule fitting rows 1–2 must agree
      const pe = new Set();
      RM.ALL_BOOL.forEach((g) => {
        if ([0, 1].every((r) => rows[r][0].every((x, i) => g(x, rows[r][1][i]) === rows[r][2][i]))) pe.add(bkey(rows[2][0].map((x, i) => g(x, rows[2][1][i]))));
      });
      RM.need(pe.size === 1 && pe.has(bkey(rows[2][2])));
      // node colours: no boolean rule on the colours alone may suggest a different answer colouring
      const cols = rows.map((r) => r.map(odd));
      const ansCol = cols[2][2];
      RM.need(ansCol.some(Boolean));
      RM.ALL_BOOL.forEach((g) => {
        if ([0, 1].every((r) => cols[r][0].every((x, i) => g(x, cols[r][1][i]) === cols[r][2][i]))) RM.need(bkey(cols[2][0].map((x, i) => g(x, cols[2][1][i]))) === bkey(ansCol));
      });
      const ans = { on: rows[2][2], col: ansCol };
      const [e1, e2] = rng.sample(RM.range(E.length), 2);
      const ends = new Set([...E[e1], ...E[e2]]);
      const free = RM.range(nn).filter((n) => !ends.has(n));
      RM.need(free.length);
      const nA = rng.pick(free);
      const toggleEdge = (s, e) => {
        s.on[e] = !s.on[e];
        E[e].forEach((n) => (s.col[n] = !s.col[n]));
        return s;
      };
      return {
        difficulty: v === 1 || v === 2 ? 7 : 6,
        hint: 'count the lines that meet at each black node.',
        panels: RM.flat(rows.map((r, ri) => r.map((on, c) => ({ on, col: cols[ri][c] })))),
        answer: ans,
        key: (s) => bkey(s.on) + '/' + bkey(s.col),
        render(sp) {
          const pic = new RM.Pic();
          E.forEach(([a, b], i) => sp.on[i] && RM.line(pic, P[a][0], P[a][1], P[b][0], P[b][1], { sw: 2.4 }));
          P.forEach(([x, y], n) => RM.circle(pic, x, y, 6.2, { fill: sp.col[n] ? 'black' : 'white', sw: 2 }));
          return pic.svg();
        },
        perturb: [
          { apply: (s) => ((s.col[nA] = !s.col[nA]), s), why: 'one node has the wrong colour for the number of lines meeting there' },
          { apply: (s) => toggleEdge(s, e1), why: 'one line is wrong (present/absent)' },
          { apply: (s) => toggleEdge(s, e2), why: 'another line is wrong (present/absent)' },
        ],
        rules: [
          { k: 'Lines', t: `line by line: ${RM.BOOL[fname].text}.` },
          { k: 'Nodes', t: 'the dots are not free: a dot is <b>black when an odd number</b> of lines meet there (1, 3, 5…) and white when the number is even (0, 2, 4…). This holds in every panel.' },
          { k: 'Answer', t: `combine the lines of row 3, then colour each dot by counting its lines → <b>${ansCol.filter(Boolean).length} black dots</b>.` },
        ],
      };
    },
  });

  /* ================================================================ Contagion */
  const LAYOUT = [[20, 20], [50, 13], [80, 20], [32, 48], [68, 48], [18, 80], [50, 86], [82, 80]];
  RM.register({
    id: 'contagion',
    name: 'Contagion',
    difficulty: 6,
    generate(rng, variant) {
      const v = variant % 4;
      const P = LAYOUT.map(([x, y]) => [x + rng.int(-3, 3), y + rng.int(-3, 3)]);
      const N = P.length;
      const shape = v === 3 ? RM.range(N).map(() => (rng.chance(0.5) ? 'square' : 'circle')) : RM.range(N).map(() => 'circle');
      const cand = [];
      for (let a = 0; a < N; a++) for (let b = a + 1; b < N; b++) if (Math.hypot(P[a][0] - P[b][0], P[a][1] - P[b][1]) < 46) cand.push([a, b]);
      // model: thresholds per shape, SIR flag
      const intended = v === 0 ? { tc: 1, ts: 1, sir: false } : v === 1 ? { tc: 2, ts: 2, sir: false } : v === 2 ? { tc: 1, ts: 1, sir: true } : { tc: 1, ts: 2, sir: false };
      const step = (E, s, m) => {
        const nb = RM.range(N).map(() => []);
        E.forEach(([a, b]) => {
          nb[a].push(b);
          nb[b].push(a);
        });
        return s.map((x, n) => {
          if (x === 1) return m.sir ? 2 : 1;
          if (x === 2) return 2;
          const inf = nb[n].filter((j) => s[j] === 1 || (m.recCount && s[j] === 2)).length;
          if (m.maj) return inf * 2 > nb[n].length && inf > 0 ? 1 : 0;
          return inf >= (shape[n] === 'square' ? m.ts : m.tc) ? 1 : 0;
        });
      };
      const rows = RM.range(3).map(() => {
        const E = rng.sample(cand, rng.int(9, 12));
        const s0 = RM.range(N).map(() => 0);
        rng.sample(RM.range(N), v === 1 ? 3 : 2).forEach((n) => (s0[n] = 1));
        const s1 = step(E, s0, intended);
        const s2 = step(E, s1, intended);
        RM.need(s1.join() !== s0.join() && s2.join() !== s1.join() && s2.some((x) => x === 0));
        return { E, s: [s0, s1, s2] };
      });
      const models = [];
      [1, 2, 3].forEach((tc) => [1, 2, 3].forEach((ts) => [false, true].forEach((sir) => [false, true].forEach((rc) => models.push({ tc, ts, sir, recCount: rc })))));
      models.push({ maj: true, sir: false }, { maj: true, sir: true });
      const preds = new Set();
      models.forEach((m) => {
        if ([0, 1].every((r) => [0, 1].every((c) => step(rows[r].E, rows[r].s[c], m).join() === rows[r].s[c + 1].join()))) preds.add(step(rows[2].E, rows[2].s[1], m).join());
      });
      RM.need(preds.size === 1 && preds.has(rows[2].s[2].join()));
      const R = rows[2];
      const ans = R.s[2];
      const prev = R.s[1];
      // plausible wrong states for three different nodes
      const nb = RM.range(N).map(() => []);
      R.E.forEach(([a, b]) => {
        nb[a].push(b);
        nb[b].push(a);
      });
      const cands = [];
      RM.range(N).forEach((n) => {
        if (ans[n] === 0 && nb[n].length) cands.push({ n, s: 1, why: 'a node became infected although it does not have enough infected neighbours' });
        if (ans[n] === 1 && prev[n] === 0) cands.push({ n, s: 0, why: 'a node that should have caught the infection is still healthy' });
        if (ans[n] === 2) cands.push({ n, s: 1, why: 'an infected node should have recovered (grey)' });
        if (ans[n] === 1 && prev[n] === 1 && v !== 2) cands.push({ n, s: 0, why: 'an infected node never heals' });
      });
      const picked = [];
      rng.shuffle(cands).forEach((c) => {
        if (picked.length < 3 && !picked.some((p) => p.n === c.n)) picked.push(c);
      });
      RM.need(picked.length === 3);
      const FILL = ['white', 'black', 'gray'];
      const ruleText = {
        0: 'a healthy (white) node with <b>at least one</b> infected (black) neighbour becomes infected; infected nodes stay infected',
        1: 'a healthy node becomes infected only if <b>at least two</b> of its neighbours are infected; infected nodes stay infected',
        2: 'a healthy node with at least one infected neighbour becomes infected, and an infected node <b>recovers</b> (grey) at the next step; grey nodes are immune and never infect',
        3: 'a healthy <b>round</b> node needs one infected neighbour to catch it, a healthy <b>square</b> node needs <b>two</b>; infected nodes stay infected',
      }[v];
      const newly = ans.filter((x, n) => x === 1 && prev[n] !== 1).length;
      return {
        difficulty: v === 3 ? 7 : 6,
        hint: 'black spreads along the lines.',
        panels: RM.flat(rows.map((r) => r.s.map((s) => ({ E: r.E, s })))),
        answer: { E: R.E, s: ans },
        key: (sp) => sp.s.join(''),
        render(sp) {
          const pic = new RM.Pic();
          sp.E.forEach(([a, b]) => RM.line(pic, P[a][0], P[a][1], P[b][0], P[b][1], { sw: 2 }));
          sp.s.forEach((x, n) => RM.shape(pic, shape[n], P[n][0], P[n][1], shape[n] === 'square' ? 7.5 : 7, { fill: FILL[x], sw: 2 }));
          return pic.svg();
        },
        perturb: picked.map((c) => ({ apply: (s) => ((s.s[c.n] = c.s), s), why: c.why })),
        rules: [
          { k: 'Network', t: 'each row has its own network of lines; it does not change along the row.' },
          { k: 'Spreading', t: `at every step ${ruleText}.` },
          { k: 'Answer', t: `in row 3, ${newly} node${newly === 1 ? '' : 's'} catch${newly === 1 ? 'es' : ''} the infection at the last step.` },
        ],
      };
    },
  });

  /* ================================================================ Flip-flop board */
  const SW = [[50, 15], [30, 34], [70, 34], [19, 54], [41, 54], [59, 54], [81, 54]];
  const BX = RM.range(8).map((k) => 13 + k * 10.6);
  function path(s) {
    const p = [];
    let i = 0;
    while (i < 7) {
      p.push(i);
      i = 2 * i + 1 + s[i];
    }
    return { p, bin: i - 7 };
  }
  const RULES = {
    path: (s, p) => s.map((x, i) => (p.includes(i) ? 1 - x : x)),
    all: (s) => s.map((x) => 1 - x),
    nonpath: (s, p) => s.map((x, i) => (p.includes(i) ? x : 1 - x)),
    root: (s) => s.map((x, i) => (i === 0 ? 1 - x : x)),
    last: (s, p) => s.map((x, i) => (i === p[p.length - 1] ? 1 - x : x)),
    pathNoRoot: (s, p) => s.map((x, i) => (i && p.includes(i) ? 1 - x : x)),
    none: (s) => s.slice(),
  };
  RM.register({
    id: 'flipflop',
    name: 'Flip-flop board',
    difficulty: 6,
    generate(rng, variant) {
      const v = variant % 4;
      const rule = ['path', 'last', 'pathNoRoot', 'nonpath'][v];
      const next = (s) => RULES[rule](s, path(s).p);
      const rows = RM.range(3).map(() => {
        const s0 = RM.range(7).map(() => rng.int(0, 1));
        const s1 = next(s0);
        return [s0, s1, next(s1)];
      });
      RM.need(new Set(rows.map((r) => r[0].join())).size === 3);
      const preds = new Set();
      Object.keys(RULES).forEach((k) => {
        const H = (s) => RULES[k](s, path(s).p);
        if ([0, 1].every((r) => [0, 1].every((c) => H(rows[r][c]).join() === rows[r][c + 1].join()))) preds.add(H(rows[2][1]).join());
      });
      RM.need(preds.size === 1 && preds.has(rows[2][2].join()));
      const src = rows[2][1];
      const ans = rows[2][2];
      const altRules = Object.keys(RULES).filter((k) => k !== rule && k !== 'none').map((k) => RULES[k](src, path(src).p)).filter((s) => s.join() !== ans.join());
      RM.need(altRules.length);
      const altS = rng.pick(altRules);
      const offPath = RM.range(7).filter((i) => !path(ans).p.includes(i));
      const cSw = rng.pick(offPath);
      const mk = (s) => ({ s, ball: path(s).bin });
      const RTXT = {
        path: 'every switch the ball touched flips',
        last: 'only the last switch the ball touched (just above the bin) flips',
        pathNoRoot: 'every switch the ball touched flips, except the top one',
        nonpath: 'every switch the ball did <i>not</i> touch flips',
      };
      const dirs = (s) => path(s).p.map((i) => (s[i] ? 'right' : 'left')).join(', ');
      return {
        difficulty: v === 3 ? 7 : 6,
        hint: 'follow the ball, then compare the switches with the next panel.',
        panels: RM.flat(rows.map((r) => r.map(mk))),
        answer: mk(ans),
        key: (sp) => sp.s.join('') + '/' + sp.ball,
        render(sp) {
          const pic = new RM.Pic();
          for (let i = 0; i < 3; i++) [1, 2].forEach((d) => RM.line(pic, SW[i][0], SW[i][1], SW[2 * i + d][0], SW[2 * i + d][1], { sw: 1, color: RM.GRAY }));
          for (let i = 3; i < 7; i++) [0, 1].forEach((d) => RM.line(pic, SW[i][0], SW[i][1], BX[(i - 3) * 2 + d], 78, { sw: 1, color: RM.GRAY }));
          BX.forEach((x) => RM.polyline(pic, [[x - 4.5, 78], [x - 4.5, 91], [x + 4.5, 91], [x + 4.5, 78]], { sw: 1.6 }));
          SW.forEach(([x, y], i) => {
            RM.circle(pic, x, y, 2, { fill: 'gray', sw: 0 });
            const d = sp.s[i] ? 1 : -1;
            RM.line(pic, x - 6 * d, y - 5, x + 6 * d, y + 5, { sw: 3.4 });
          });
          RM.circle(pic, BX[sp.ball], 86, 3.6, { fill: 'black', sw: 0 });
          return pic.svg();
        },
        perturb: [
          { apply: (s) => ((s.s = altS.slice()), (s.ball = path(altS).bin), s), why: 'the switches were flipped by the wrong rule' },
          { apply: (s) => ((s.ball = s.ball === 7 ? 6 : s.ball + 1), s), why: 'the ball is not in the bin the switches lead to' },
          { apply: (s) => ((s.s[cSw] = 1 - s.s[cSw]), s), why: 'one switch is set the wrong way' },
        ],
        rules: [
          { k: 'Ball', t: 'in every panel a ball drops from the top and follows the switches (each bar sends it left or right); it lands in the bin shown.' },
          { k: 'Flipping', t: `from one panel to the next, <b>${RTXT[rule]}</b>.` },
          { k: 'Answer', t: `in the 2nd panel of row 3 the ball goes ${dirs(src)}; apply the flips, then the new ball goes ${dirs(ans)} → bin ${path(ans).bin + 1} from the left.` },
        ],
      };
    },
  });
})();
