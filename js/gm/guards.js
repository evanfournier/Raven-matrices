/* Gallery guards (grandmaster): each column every guard steps forward (blocked by wall/edge/guard -> turns); hatched = cells seen. */
(function () {
  'use strict';
  const RM = window.RM;
  const N = 6, CS = 13, OX = 11, OY = 11;
  const DR = [-1, 0, 1, 0], DC = [0, 1, 0, -1];
  const DN = ['up', 'right', 'down', 'left'];
  const FILL = ['black', 'white', 'gray'];
  const MODES = ['cw', 'ccw', '180', 'stay'];
  const MTXT = { cw: 'turned clockwise', ccw: 'turned counter-clockwise', '180': 'turned around', stay: 'stayed facing the same way' };
  const VIS = ['f', 'fb', 'all', 'thru'];

  function edge(r, c, d) { // wall key of the edge crossed when leaving (r,c) in direction d
    return d === 0 ? 'h' + r + ',' + c : d === 2 ? 'h' + (r + 1) + ',' + c : d === 3 ? 'v' + r + ',' + c : 'v' + r + ',' + (c + 1);
  }
  function inb(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }
  function wallBlocked(W, r, c, d) { return !inb(r + DR[d], c + DC[d]) || W.has(edge(r, c, d)); }
  function turnDir(d, m) { return m === 'cw' ? (d + 1) % 4 : m === 'ccw' ? (d + 3) % 4 : m === '180' ? (d + 2) % 4 : d; }

  // one column step; returns {g, turned:[bool]}
  function step(W, gs, mode, steps) {
    const cur = gs.map((x) => Object.assign({}, x));
    const turned = cur.map(() => false);
    cur.forEach((a, i) => {
      for (let k = 0; k < steps; k++) {
        const nr = a.r + DR[a.d], nc = a.c + DC[a.d];
        const occ = cur.some((b, j) => j !== i && b.r === nr && b.c === nc);
        if (wallBlocked(W, a.r, a.c, a.d) || occ) { a.d = turnDir(a.d, mode); turned[i] = true; break; }
        a.r = nr; a.c = nc;
      }
    });
    return { g: cur, turned };
  }
  function rays(W, a, d, thru) {
    const out = [];
    let r = a.r, c = a.c;
    for (;;) {
      if (!thru && wallBlocked(W, r, c, d)) break;
      r += DR[d]; c += DC[d];
      if (!inb(r, c)) break;
      out.push([r, c]);
    }
    return out;
  }
  function seenSet(W, gs, vis, one) {
    const s = new Set();
    gs.forEach((a, i) => {
      if (one !== undefined && one !== i) return;
      const ds = vis === 'f' || vis === 'thru' ? [a.d] : vis === 'fb' ? [a.d, (a.d + 2) % 4] : [0, 1, 2, 3];
      ds.forEach((d) => rays(W, a, d, vis === 'thru').forEach((p) => s.add(p[0] * N + p[1])));
    });
    return s;
  }
  function gsKey(gs) { return gs.map((a) => a.r + '' + a.c + a.d).join('.'); }
  function mk(W, gs, vis, hide) {
    const seen = seenSet(W, gs, vis);
    (hide || []).forEach((x) => seen.delete(x));
    return { gs, seen: [...seen].sort((a, b) => a - b), W: [...W] };
  }
  const specKey = (s) => gsKey(s.gs) + '|' + s.seen.join(',') + '|' + s.W.join(';');
  const wset = (s) => new Set(s.W);

  function genWalls(rng) {
    const W = new Set();
    const n = rng.int(5, 6);
    for (let i = 0; i < n; i++) {
      const hor = rng.chance(0.5), len = rng.int(1, 2), a = rng.int(1, N - 1), b = rng.int(0, N - len);
      for (let k = 0; k < len; k++) W.add((hor ? 'h' + a + ',' : 'v') + (hor ? b + k : b + k + ',' + a).toString());
    }
    return W;
  }
  function genGuards(rng, k) {
    const gs = [];
    while (gs.length < k) {
      const r = rng.int(0, N - 1), c = rng.int(0, N - 1);
      if (gs.some((a) => a.r === r && a.c === c)) continue;
      gs.push({ r, c, d: rng.int(0, 3), f: gs.length });
    }
    return gs;
  }
  // build one row: [state0,state1,state2] specs; need a turn
  function genRow(rng, k, mode, vis) {
    for (let t = 0; t < 60; t++) {
      const W = genWalls(rng), g0 = genGuards(rng, k);
      const s1 = step(W, g0, mode, 1), s2 = step(W, s1.g, mode, 1);
      if (!s1.turned.some((x) => x) && !s2.turned.some((x) => x)) continue;
      const row = [g0, s1.g, s2.g].map((g) => mk(W, g, vis));
      if (specKey(row[1]) === specKey(row[2]) || specKey(row[0]) === specKey(row[1])) continue;
      return { W, row, t1: s1, t2: s2 };
    }
    return null;
  }

  function sameGuards(a, b) { return gsKey(a) === gsKey(b); }

  function render(s) {
    const pic = new RM.Pic();
    const W = wset(s);
    const x = (c) => OX + c * CS, y = (r) => OY + r * CS;
    s.seen.forEach((v) => {
      const r = Math.floor(v / N), c = v % N;
      pic.add(`<rect x="${x(c)}" y="${y(r)}" width="${CS}" height="${CS}" fill="${pic.paint('hatch')}"/>`);
    });
    for (let i = 0; i <= N; i++) {
      RM.line(pic, x(i), OY, x(i), OY + N * CS, { sw: 0.5, color: RM.LIGHT, cap: 'butt' });
      RM.line(pic, OX, y(i), OX + N * CS, y(i), { sw: 0.5, color: RM.LIGHT, cap: 'butt' });
    }
    W.forEach((e) => {
      const hor = e[0] === 'h', p = e.slice(1).split(',').map(Number);
      if (hor) RM.line(pic, x(p[1]), y(p[0]), x(p[1] + 1), y(p[0]), { sw: 3.2, cap: 'square' });
      else RM.line(pic, x(p[1]), y(p[0]), x(p[1]), y(p[0] + 1), { sw: 3.2, cap: 'square' });
    });
    pic.add(`<rect x="${OX}" y="${OY}" width="${N * CS}" height="${N * CS}" fill="none" stroke="${RM.INK}" stroke-width="3.6"/>`);
    s.gs.forEach((a) => {
      const cx = x(a.c) + CS / 2, cy = y(a.r) + CS / 2, dx = DC[a.d], dy = DR[a.d], px = -dy, py = dx;
      RM.polygon(pic, [[cx + dx * 7, cy + dy * 7], [cx + dx * 2.6 + px * 2.8, cy + dy * 2.6 + py * 2.8], [cx + dx * 2.6 - px * 2.8, cy + dy * 2.6 - py * 2.8]], { fill: 'black', sw: 1 });
      RM.circle(pic, cx, cy, 4.3, { fill: a.f === 0 ? 'black' : a.f === 1 ? 'white' : 'gray', sw: 1.6 });
    });
    return pic.svg();
  }

  const cell = (v) => 'row ' + (Math.floor(v / N) + 1) + ', column ' + ((v % N) + 1);
  const pos = (a) => 'row ' + (a.r + 1) + ', column ' + (a.c + 1);

  RM.register({
    id: 'guards',
    name: 'Gallery guards',
    difficulty: 7,
    generate(rng, variant) {
      const mode = ['cw', 'ccw', '180', 'cw'][variant];
      const vis = variant === 3 ? 'fb' : 'f';
      const k = rng.int(2, 3);
      const rows = [];
      for (let i = 0; i < 3; i++) { const r = genRow(rng, k, mode, vis); RM.need(r); rows.push(r); }
      // fixed fill order shared: guard index = fill
      const R3 = rows[2];
      const ans = R3.row[2];
      RM.need(specKey(ans) !== specKey(R3.row[1]));
      // hypotheses
      const hyps = [];
      MODES.forEach((m) => [1, 2].forEach((st) => VIS.forEach((v) => hyps.push({ m, st, v }))));
      const pairs = [];
      for (let i = 0; i < 2; i++) { pairs.push([rows[i].W, rows[i].row[0], rows[i].row[1]], [rows[i].W, rows[i].row[1], rows[i].row[2]]); }
      pairs.push([R3.W, R3.row[0], R3.row[1]]);
      const vp = [rows[0], rows[1]].flatMap((r) => r.row.map((s) => [r.W, s])).concat([[R3.W, R3.row[0]], [R3.W, R3.row[1]]]);
      const ok = hyps.filter((h) =>
        pairs.every((p) => sameGuards(step(p[0], p[1].gs, h.m, h.st).g, p[2].gs)) &&
        vp.every((p) => mk(p[0], p[1].gs, h.v).seen.join() === p[1].seen.join()));
      RM.need(ok.some((h) => h.m === mode && h.st === 1 && h.v === vis));
      const pred = (h) => specKey(mk(R3.W, step(R3.W, R3.row[1].gs, h.m, h.st).g, h.v));
      ok.forEach((h) => RM.need(pred(h) === specKey(ans)));
      // distractors
      const cands = new Map();
      const add = (spec, why, pri) => {
        const kk = specKey(spec);
        if (kk === specKey(ans)) return;
        if (!cands.has(kk)) cands.set(kk, { spec, flaws: [why], pri });
      };
      const base = R3.row[1].gs, W3 = R3.W;
      const trueG = ans.gs;
      MODES.filter((m) => m !== mode).forEach((m) => {
        const alt = step(W3, base, m, 1).g;
        alt.forEach((a, i) => {
          if (gsKey([a]) === gsKey([trueG[i]])) return;
          const g = trueG.map((x, j) => (j === i ? a : x));
          const blocked = R3.t2.turned[i];
          add(mk(W3, g, vis), blocked ? 'The ' + FILL[i] + ' guard is blocked and should have ' + MTXT[mode] + '; here it ' + MTXT[m] + ' (or ended elsewhere).' : 'The ' + FILL[i] + ' guard ended on the wrong cell or facing the wrong way.', 1);
        });
        add(mk(W3, alt, vis), 'The guards\' blocked behaviour is wrong: they ' + MTXT[m] + ' instead of ' + MTXT[mode] + '.', 2);
      });
      [2].forEach((st) => {
        const alt = step(W3, base, mode, st).g;
        add(mk(W3, alt, vis), 'Guards moved two cells in one column; they only step one cell.', 2);
        alt.forEach((a, i) => { if (gsKey([a]) !== gsKey([trueG[i]])) add(mk(W3, trueG.map((x, j) => (j === i ? a : x)), vis), 'The ' + FILL[i] + ' guard moved two cells instead of one.', 1); });
      });
      // moved through wall / no turn
      trueG.forEach((t, i) => {
        if (!R3.t2.turned[i]) return;
        const a = Object.assign({}, base[i]);
        const nr = a.r + DR[a.d], nc = a.c + DC[a.d];
        if (inb(nr, nc) && !trueG.some((b, j) => j !== i && b.r === nr && b.c === nc)) { a.r = nr; a.c = nc; add(mk(W3, trueG.map((x, j) => (j === i ? a : x)), vis), 'The ' + FILL[i] + ' guard walked through a wall (or another guard) instead of turning.', 1); }
        const b2 = Object.assign({}, base[i]); add(mk(W3, trueG.map((x, j) => (j === i ? b2 : x)), vis), 'The ' + FILL[i] + ' guard did not move or turn at all.', 1);
      });
      add(mk(W3, base, vis), 'This is the previous panel again: the guards did not step.', 2);
      // vision mistakes
      ['thru', 'all', variant === 3 ? 'f' : 'fb'].forEach((v) => {
        if (v === vis) return;
        add(mk(W3, trueG, v), v === 'thru' ? 'Some guard\'s view passes through a wall.' : v === 'all' ? 'Guards see in all four directions here, but only along their facing direction' + (vis === 'fb' ? ' and the opposite one' : '') + '.' : vis === 'f' ? 'Guards also see backwards, which they do not.' : 'Guards see backwards as well as forwards here: one direction is missing.', 2);
      });
      const full = [...seenSet(W3, trueG, vis)];
      full.forEach((v) => add(mk(W3, trueG, vis, [v]), 'The cell at ' + cell(v) + ' should be seen but is not hatched.', 1));
      const unseen = [];
      for (let v = 0; v < N * N; v++) if (!full.includes(v)) unseen.push(v);
      unseen.slice(0, 40).forEach((v) => { if (rng.chance(0.15)) { const s = mk(W3, trueG, vis); s.seen = [...s.seen, v].sort((a, b) => a - b); add(s, 'The cell at ' + cell(v) + ' is hatched but no guard sees it.', 3); } });
      // view of guard from the stale panel
      add(mk(W3, trueG.map((x, j) => Object.assign({}, x, { d: base[j].d })), vis), 'The guards\' facing directions were not updated.', 2);
      const list = [...cands.values()];
      RM.need(list.length >= 7);
      const pr = (p) => list.filter((c) => c.pri === p);
      const chosen = rng.shuffle(pr(1)).slice(0, 4).concat(rng.shuffle(pr(2))).concat(rng.shuffle(pr(3))).concat(rng.shuffle(pr(1)).slice(4));
      const opts = chosen.slice(0, 7).map((c) => ({ spec: c.spec, flaws: c.flaws }));
      opts.push({ spec: ans, flaws: [] });

      const mname = { cw: 'turns 90 degrees clockwise (to its right)', ccw: 'turns 90 degrees counter-clockwise (to its left)', '180': 'turns around (180 degrees)' }[mode];
      const trace = base.map((a, i) => {
        const b = trueG[i];
        return 'the <b>' + FILL[i] + '</b> guard at ' + pos(a) + ' facing ' + DN[a.d] + (R3.t2.turned[i] ? ' is blocked, so it stays and faces ' + DN[b.d] : ' steps to ' + pos(b) + ', still facing ' + DN[b.d]);
      }).join('; ');
      const g = {
        panels: [].concat(rows[0].row, rows[1].row, [R3.row[0], R3.row[1]]),
        answer: ans,
        options: opts,
        render,
        key: specKey,
        hint: 'A guard looks straight ahead' + (vis === 'fb' ? ' and straight behind' : '') + ' - until something blocks the view.',
        rules: [
          { k: 'Floor plan', t: 'Each panel is the same gallery seen from above (6 x 6 cells). The thick lines are walls; they are the same within a row, and each row is a different gallery. The guards are circles with a pointed nose showing the way they face.' },
          { k: 'Column step', t: 'From one column to the next, every guard (taken in the order black, white' + (k === 3 ? ', gray' : '') + ') moves <b>one cell</b> forward. If a wall, the outer edge or another guard is in the way, it does not move and instead ' + mname + '.' },
          { k: 'What is seen', t: 'Hatched cells are the cells seen by a guard: ' + (vis === 'fb' ? 'every cell straight ahead <b>and straight behind</b> it' : 'every cell straight ahead of it') + ', up to the first wall or the edge (the guard\'s own cell is not hatched; guards do not block the view; overlapping views stay hatched).' },
          { k: 'Missing panel', t: 'Start from the middle panel of the bottom row: ' + trace + '. Then hatch what each guard sees from its new cell; the hatched cells are ' + (ans.seen.map(cell).join('; ') || 'none') + '.' },
        ],
      };
      return g;
    },
  });
})();
