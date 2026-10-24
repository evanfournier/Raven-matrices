/* Pursuit (grandmaster): 7x7 board, a cat (black) and a mouse (white). Every row is one chase: panel 1 = start, panel 2
 * = after one round, panel 3 = after two rounds (v3: a panel is two rounds apart). In a round the mouse moves one cell
 * in its own fixed direction (straight or diagonal, learnt from its first move in the row; at a wall it bounces: the
 * blocked component reverses), then the cat makes one king step toward the mouse (v1: the cat moves first, v2: the cat
 * may only step along a row or column). All readings (who chases, order, cat step type, wrap / stop / bounce, 1 or 2
 * rounds per panel, a fleeing mouse) are simulated against the visible panels; the ones that fit must predict the same
 * last panel. Distractors come from single wrong rules and typical slips. */
(function () {
  'use strict';
  const RM = window.RM;
  const N = 7;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const sg = Math.sign;
  const cl = (v) => Math.max(0, Math.min(N - 1, v));
  const eqp = (a, b) => a[0] === b[0] && a[1] === b[1];
  const eqS = (s, t) => eqp(s.b, t.b) && eqp(s.w, t.w);
  const cheb = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
  const inb = (p) => p[0] >= 0 && p[0] < N && p[1] >= 0 && p[1] < N;
  const pos = (p) => `(col ${p[0] + 1}, row ${p[1] + 1})`;
  const dirWord = (d) => (d[1] ? (d[1] > 0 ? 'down' : 'up') : '') + (d[1] && d[0] ? '-' : '') + (d[0] ? (d[0] > 0 ? 'right' : 'left') : '');
  const BASE = { chaser: 'b', order: 'mouse', cat: 'king', bnd: 'bounce', rounds: 1, flee: false };
  const CFG = [
    { H: BASE, diff: 7, b3: 1 },
    { H: Object.assign({}, BASE, { order: 'cat' }), diff: 7, b3: 0.5 },
    { H: Object.assign({}, BASE, { cat: 'orthB' }), diff: 7, b3: 0.5 },
    { H: Object.assign({}, BASE, { rounds: 2 }), diff: 8, b3: 0.5 },
  ];

  function mover(H, s, ev) {
    if (H.skipMouse) return s;
    const mv = H.chaser === 'b' ? 'w' : 'b';
    const c = s[H.chaser];
    let m = s[mv];
    let d = H.oppDir ? s.d.map((v) => -v) : s.d.slice();
    const hit = [];
    for (let k = 0; k < (H.mouseTwice ? 2 : 1); k++) {
      const from = m;
      if (H.flee) m = [cl(m[0] + sg(m[0] - c[0])), cl(m[1] + sg(m[1] - c[1]))];
      else {
        const nm = m.slice();
        d = d.slice();
        for (let i = 0; i < 2; i++) {
          if (!d[i]) continue;
          let n = m[i] + d[i];
          if (n < 0 || n >= N) {
            hit.push([i, d[i]]);
            if (H.bnd === 'bounce') { d[i] = -d[i]; n = m[i] + d[i]; }
            else if (H.bnd === 'wrap') n = (n + N) % N;
            else n = m[i];
          }
          nm[i] = n;
        }
        m = nm;
      }
      if (ev) ev.push({ k: 'm', from, to: m, hit: H.bnd === 'bounce' ? hit : [] });
    }
    const r = Object.assign({}, s, { [mv]: m, d: H.oppDir ? s.d : d });
    if (eqp(r.b, r.w)) r.bad = true;
    return r;
  }
  function chase(H, s, ev) {
    if (H.skipCat) return s;
    const mv = H.chaser === 'b' ? 'w' : 'b';
    let c = s[H.chaser];
    const m = s[mv];
    for (let k = 0; k < (H.catTwice ? 2 : 1); k++) {
      const ex = m[0] - c[0];
      const ey = m[1] - c[1];
      let sx = sg(ex);
      let sy = sg(ey);
      const ax = Math.abs(ex);
      const ay = Math.abs(ey);
      if (H.cat === 'orthB') { if (ax >= ay) sy = 0; else sx = 0; }
      else if (H.cat === 'orthV') { if (ax > ay) sy = 0; else sx = 0; }
      else if (H.cat === 'orthX') { if (sx) sy = 0; }
      else if (H.cat === 'orthY') { if (sy) sx = 0; }
      if (H.catAway) { sx = -sx; sy = -sy; }
      const nc = [c[0] + sx, c[1] + sy];
      if (ev) ev.push({ k: 'c', from: c, to: nc, st: [sx, sy] });
      c = nc;
    }
    const r = Object.assign({}, s, { [H.chaser]: c });
    if (eqp(r.b, r.w)) r.bad = true;
    return r;
  }
  const round = (H, s, ev) => (H.order === 'mouse' ? chase(H, mover(H, s, ev), ev) : mover(H, chase(H, s, ev), ev));
  function sim(H, s, n, ev) {
    for (let i = 0; i < n; i++) {
      s = round(H, s, ev);
      if (s.bad) return s;
    }
    return s;
  }

  const HS = [];
  ['b', 'w'].forEach((chaser) =>
    ['mouse', 'cat'].forEach((order) =>
      ['king', 'orthB', 'orthV', 'orthX', 'orthY'].forEach((cat) =>
        [1, 2].forEach((rounds) => {
          HS.push({ chaser, order, cat, rounds, flee: true, bnd: 'bounce' });
          ['bounce', 'wrap', 'stop'].forEach((bnd) => HS.push({ chaser, order, cat, rounds, flee: false, bnd }));
        })
      )
    )
  );

  RM.register({
    id: 'pursuit',
    name: 'Pursuit',
    difficulty: 7,
    generate(rng, variant) {
      const cfg = CFG[variant % 4];
      const H = cfg.H;
      const R = H.rounds;

      /* rows: random starts, own direction each; constraints on bounces */
      const genRow = (needB2) => {
        for (let t = 0; t < 400; t++) {
          const b = [rng.int(0, N - 1), rng.int(0, N - 1)];
          const w = [rng.int(0, N - 1), rng.int(0, N - 1)];
          if (cheb(b, w) < 3) continue;
          const s0 = { b, w, d: rng.pick(DIRS) };
          const e1 = [];
          const e2 = [];
          const s1 = sim(H, s0, R, e1);
          if (s1.bad) continue;
          const s2 = sim(H, s1, R, e2);
          if (s2.bad) continue;
          const bn2 = e2.some((e) => e.hit && e.hit.length);
          if (needB2 === true && !bn2) continue;
          if (needB2 === false && bn2) continue;
          if ([s0, s1, s2].some((s) => cheb(s.b, s.w) < 2)) continue;
          if (eqS(s0, s1) || eqS(s1, s2) || eqS(s0, s2)) continue;
          return { S: [s0, s1, s2], ev: [e1, e2] };
        }
        throw RM.RETRY;
      };
      const rows = [genRow(true), genRow(null), genRow(rng.chance(cfg.b3))];
      const ans = rows[2].S[2];
      RM.need(rows.every((r, i) => i === 0 || !eqS(r.S[0], rows[0].S[0])));
      const vis = [];
      rows.forEach((r, i) => r.S.forEach((s, j) => { if (i < 2 || j < 2) vis.push(s); }));
      RM.need(vis.every((s) => !eqS(s, ans)));

      /* identifiability: every reading consistent with the visible panels predicts the same answer */
      const dirsOf = (h) => (h.flee ? [[0, 0]] : DIRS);
      const fit = (h, row, upto) => {
        const out = [];
        for (const d of dirsOf(h)) {
          let s = { b: row.S[0].b, w: row.S[0].w, d };
          let ok = true;
          for (let k = 1; k <= upto && ok; k++) {
            s = sim(h, s, h.rounds);
            if (s.bad || !eqS(s, row.S[k])) ok = false;
          }
          if (ok) out.push(d);
        }
        return out;
      };
      let intended = false;
      for (const h of HS) {
        if (!fit(h, rows[0], 2).length || !fit(h, rows[1], 2).length) continue;
        const d3 = fit(h, rows[2], 1);
        if (!d3.length) continue;
        if (h.chaser === 'b' && h.order === H.order && h.cat === H.cat && h.rounds === R && !h.flee && h.bnd === 'bounce') intended = true;
        for (const d of d3) {
          const p = sim(h, { b: rows[2].S[0].b, w: rows[2].S[0].w, d }, 2 * h.rounds);
          RM.need(!p.bad && eqS(p, ans));
        }
      }
      RM.need(intended);

      /* distractors */
      const st1 = sim(H, rows[2].S[0], R);
      const mods = [
        { m: { order: H.order === 'mouse' ? 'cat' : 'mouse' }, t: H.order === 'mouse' ? 'the cat moved first (towards the square where the mouse still stood) and the mouse second; the mouse moves first and the cat chases its new square' : 'the mouse moved first and the cat second; the cat moves first, towards the square where the mouse still stands', a: 1 },
        { m: { cat: H.cat === 'king' ? 'orthB' : 'king' }, t: H.cat === 'king' ? 'the cat stepped only along a row or column; it moves like a king, diagonally when the mouse is off both its row and its column' : 'the cat stepped diagonally; the cat only ever steps along a row or a column', a: 1 },
        { m: { cat: H.cat === 'orthB' ? 'orthV' : 'orthY' }, t: H.cat === 'king' ? 'the cat stepped only along a row or column; it moves like a king, diagonally when the mouse is off both its row and its column' : 'the cat chose the wrong axis; it steps along the axis in which the mouse is farther away (horizontally if the gaps are equal)', a: 1 },
        { m: { bnd: 'wrap' }, t: 'the mouse wrapped round to the opposite side; at a wall it bounces back', a: 1 },
        { m: { bnd: 'stop' }, t: 'the mouse stopped at the wall; at a wall it bounces back and keeps moving', a: 1 },
        { m: { rounds: R === 1 ? 2 : 1 }, t: R === 1 ? 'two rounds were played; between two panels there is exactly one round' : 'only one round was played; between two panels there are two rounds', a: 1 },
        { m: { flee: true }, t: 'the mouse ran away from the cat; the mouse keeps its own fixed direction', a: 1 },
        { m: { skipCat: true }, t: 'the cat did not move; it steps towards the mouse every round', a: 0 },
        { m: { skipMouse: true }, t: 'the mouse did not move; it moves one cell every round', a: 0 },
        { m: { catTwice: true }, t: 'the cat made two steps in one round; it makes just one', a: 0 },
        { m: { mouseTwice: true }, t: 'the mouse moved two cells in one round; it moves just one', a: 0 },
        { m: { oppDir: true }, t: 'the mouse went the opposite way to its previous move; it keeps its direction (it only turns at a wall)', a: 0 },
        { m: { catAway: true }, t: 'the cat stepped away from the mouse; it steps towards it', a: 0 },
      ];
      const cands = new Map();
      const keyS = (s) => s.b.join() + '|' + s.w.join();
      const addC = (s, t, a) => {
        if (s.bad || !inb(s.b) || !inb(s.w) || eqp(s.b, s.w) || eqS(s, ans)) return;
        const k = keyS(s);
        if (!cands.has(k)) cands.set(k, { s, flaws: [], a });
        const c = cands.get(k);
        if (!c.flaws.includes(t)) c.flaws.push(t);
        c.a = Math.max(c.a, a);
      };
      mods.forEach((md) => {
        const h = Object.assign({}, H, md.m);
        addC(sim(h, st1, h.rounds), 'this is what you get if ' + md.t, md.a || 0.5);
      });
      addC({ b: ans.w, w: ans.b }, 'the colours are swapped: black is the cat and must be at ' + pos(ans.b) + ', white is the mouse and must be at ' + pos(ans.w), 0.6);
      addC({ b: st1.b, w: st1.w }, 'nothing has moved: this is the previous panel; both pieces move in every round', 0.4);
      for (const dd of DIRS) {
        addC({ b: [ans.b[0] + dd[0], ans.b[1] + dd[1]], w: ans.w }, 'the cat should be at ' + pos(ans.b) + ', not one cell away from it', 0.3);
        addC({ b: ans.b, w: [ans.w[0] + dd[0], ans.w[1] + dd[1]] }, 'the mouse should be at ' + pos(ans.w) + ', not one cell away from it', 0.3);
      }
      const list = Array.from(cands.values());
      const A = list.filter((c) => c.a >= 0.5);
      const Bp = list.filter((c) => c.a < 0.5);
      RM.need(A.length + Bp.length >= 7 && A.length >= 3);
      let chosen = null;
      for (let t = 0; t < 40 && !chosen; t++) {
        const nA = Math.min(A.length, rng.int(4, 6));
        const pick = rng.sample(A, nA);
        const rest = rng.shuffle(Bp.concat(A.filter((c) => !pick.includes(c))));
        const all = pick.concat(rest.slice(0, 7 - nA));
        if (all.length < 7) continue;
        const sets = [ans].concat(all.map((c) => c.s));
        const sc = sets.map((s) => sets.filter((o) => eqp(o.b, s.b)).length + sets.filter((o) => eqp(o.w, s.w)).length);
        if (Math.max(...sc.slice(1)) >= sc[0]) chosen = all;
      }
      RM.need(chosen);

      /* drawing */
      const render = (sp) => {
        const pic = new RM.Pic();
        const u = 88 / N;
        const cx = (i) => 6 + u * (i + 0.5);
        for (let i = 1; i < N; i++) {
          RM.line(pic, 6 + u * i, 6, 6 + u * i, 94, { sw: 0.8, color: RM.LIGHT, cap: 'butt' });
          RM.line(pic, 6, 6 + u * i, 94, 6 + u * i, { sw: 0.8, color: RM.LIGHT, cap: 'butt' });
        }
        pic.add(`<rect x="6" y="6" width="88" height="88" fill="none" stroke="${RM.INK}" stroke-width="2"/>`);
        RM.circle(pic, cx(sp.w[0]), cx(sp.w[1]), 4.7, { fill: 'white', sw: 1.9 });
        RM.circle(pic, cx(sp.b[0]), cx(sp.b[1]), 5.5, { fill: 'black', sw: 1.2 });
        return pic.svg();
      };
      const key = (sp) => keyS(sp);

      /* correction */
      const wallName = (h) => (h[0] === 0 ? (h[1] > 0 ? 'right wall' : 'left wall') : h[1] > 0 ? 'bottom wall' : 'top wall');
      const evText = (ev) =>
        ev.map((e) => {
          if (e.k === 'm') {
            const mv = [e.to[0] - e.from[0], e.to[1] - e.from[1]];
            return `the mouse (white) at ${pos(e.from)} ` + (e.hit.length ? `hits the ${e.hit.map(wallName).join(' and ')}, bounces and moves ${dirWord(mv)} to ${pos(e.to)}` : `moves ${dirWord(mv)} to ${pos(e.to)}`);
          }
          return `the cat (black) at ${pos(e.from)} steps ${dirWord(e.st)} to ${pos(e.to)}`;
        }).join(', then ');
      const e3 = [];
      sim(H, st1, R, e3);
      const bounceRow = [0, 1].find((r) => rows[r].ev[1].some((e) => e.hit && e.hit.length));
      const bounceEv = rows[bounceRow].ev[1].find((e) => e.hit && e.hit.length);
      const diagRow = [0, 1].find((r) => rows[r].ev.some((l) => l.some((e) => e.k === 'c' && e.st[0] && e.st[1])));
      const catTxt = {
        king: 'the cat makes one <b>king step</b> towards the mouse: one cell, diagonally when the mouse is off both the cat\'s row and column, straight otherwise' + (diagRow !== undefined ? ` (see the diagonal steps in row ${diagRow + 1})` : ''),
        orthB: 'the cat makes one step <b>along a row or a column</b> (never diagonally) towards the mouse, along the direction in which they are farther apart — horizontally when the gaps are equal',
      }[H.cat];
      const rules = [
        { k: 'Pieces', t: `each row is one chase on a 7×7 board: the <b>black</b> piece is the cat, the <b>white</b> piece the mouse (the cat is the one that comes closer). Panel 1 is the start; each following panel is ${R === 1 ? '<b>one round</b>' : '<b>two rounds</b>'} later.` },
        {
          k: 'Mouse',
          t: `in each round the mouse moves <b>one cell in a fixed direction</b> of its own (straight or diagonal): read it from its first move in the row. At a wall it <b>bounces</b>: the part of its direction that points at the wall reverses and the mouse steps back inside (row ${bounceRow + 1}: ${evText([bounceEv])}). It never wraps round or stops.`,
        },
        { k: 'Cat', t: H.order === 'mouse' ? `in each round the mouse moves first; then ${catTxt}.` : `in each round the <b>cat moves first</b>, then the mouse. The cat's step: ${catTxt}; it aims at the square where the mouse stands <i>before</i> the mouse moves.` },
        { k: 'Row 3', t: `in the second panel the mouse is at ${pos(st1.w)} and the cat at ${pos(st1.b)}; the mouse is travelling <b>${dirWord(st1.d)}</b>. ${R === 2 ? 'Two rounds: ' : 'One round: '}${evText(e3)}.` },
        { k: 'Answer', t: `black cat at <b>${pos(ans.b)}</b>, white mouse at <b>${pos(ans.w)}</b>.` },
      ];
      const opts = chosen.map((c) => {
        const sys = c.flaws.filter((f) => f.indexOf('should be at') < 0 || f.indexOf('colours') >= 0);
        return { spec: c.s, flaws: (sys.length ? sys : c.flaws).slice(0, 3) };
      });
      return {
        difficulty: cfg.diff,
        hint: 'one piece chases the other; the fleeing piece keeps its own direction, read from its first move in the row.',
        panels: vis.map((s) => ({ b: s.b, w: s.w })),
        answer: { b: ans.b, w: ans.w },
        options: [{ spec: { b: ans.b, w: ans.w }, flaws: [] }].concat(opts.map((o) => ({ spec: { b: o.spec.b, w: o.spec.w }, flaws: o.flaws }))),
        render,
        key,
        rules,
      };
    },
  });
})();
