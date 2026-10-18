/* Circuits (grandmaster): switch states of column 3 = f(column 1, column 2) per switch; bulbs light according to
   real current flow in a series/parallel network (closed switch in parallel with a bulb short-circuits it). */
(function () {
  'use strict';
  const RM = window.RM;
  const TPL = [
    ['S', 's', ['P', 'b', 's'], ['P', 'b', 's'], ['P', 'b', 's']],
    ['S', ['P', 'b', ['S', 's', 'b']], 's', ['P', 'b', 's'], 's'],
    ['S', ['P', ['S', 'b', 's'], 'b'], 's', ['P', 'b', ['S', 's', 's']]],
    ['S', ['P', 'b', 's'], ['P', 'b', 's'], 'b', 's', 's'],
    ['S', 's', ['P', 'b', ['S', 's', 'b']], ['P', 'b', 's'], 's'],
  ];
  const LET = 'ABCD';
  const FS = [
    { n: 'xor', f: (a, b) => a !== b, t: 'a switch is <b>closed</b> in the third panel when it is closed in exactly one of the first two panels (open when both panels show it in the same state)' },
    { n: 'or', f: (a, b) => a || b, t: 'a switch is <b>closed</b> in the third panel when it is closed in at least one of the first two panels (open only if open in both)' },
    { n: 'and', f: (a, b) => a && b, t: 'a switch is <b>closed</b> in the third panel only when it is closed in both of the first two panels' },
    { n: 'andnot', f: (a, b) => a && !b, t: 'a switch is <b>closed</b> in the third panel only when it is closed in the first panel and open in the second' },
    { n: 'xnor', f: (a, b) => a === b, t: 'a switch is <b>closed</b> in the third panel when it has the same state in the first two panels (both closed or both open), and open otherwise' },
  ];
  function compile(t) {
    let nb = 0, ns = 0;
    const rec = (x) => {
      if (x === 'b') return { k: 'b', i: nb++ };
      if (x === 's') return { k: 's', i: ns++ };
      return { k: x[0], kids: x.slice(1).map(rec) };
    };
    const root = rec(t);
    const w = (n) => (n.k === 'b' || n.k === 's' ? 1 : n.k === 'S' ? n.kids.reduce((a, c) => a + w(c), 0) : Math.max(...n.kids.map(w)));
    const setw = (n) => { n.w = w(n); if (n.kids) n.kids.forEach(setw); };
    setw(root);
    return root;
  }
  const NET = TPL.map(compile);
  function R(n, sw) {
    if (n.k === 'b') return 1;
    if (n.k === 's') return sw[n.i] ? 0 : Infinity;
    if (n.k === 'S') return n.kids.reduce((a, c) => a + R(c, sw), 0);
    let g = 0;
    for (const c of n.kids) { const r = R(c, sw); if (r === 0) return 0; g += r === Infinity ? 0 : 1 / r; }
    return g === 0 ? Infinity : 1 / g;
  }
  function cur(n, I, sw, lit) {
    if (n.k === 'b') { lit[n.i] = I > 1e-9; return; }
    if (n.k === 's') return;
    if (n.k === 'S') { n.kids.forEach((c) => cur(c, I, sw, lit)); return; }
    const rs = n.kids.map((c) => R(c, sw));
    const z = rs.filter((r) => r === 0).length;
    let tot = 0;
    rs.forEach((r) => { if (r !== Infinity && r !== 0) tot += 1 / r; });
    n.kids.forEach((c, j) => {
      const r = rs[j];
      cur(c, z ? (r === 0 ? I / z : 0) : (r === Infinity || !tot ? 0 : I * (1 / r) / tot), sw, lit);
    });
  }
  function physics(net, sw) {
    const r = R(net, sw);
    if (r === 0) return null;
    const lit = [false, false, false];
    cur(net, r === Infinity ? 0 : 1 / r, sw, lit);
    return lit;
  }
  function cond(n, sw) {
    if (n.k === 'b') return true;
    if (n.k === 's') return !!sw[n.i];
    return n.k === 'S' ? n.kids.every((c) => cond(c, sw)) : n.kids.some((c) => cond(c, sw));
  }
  function naive(net, sw) {
    const lit = [false, false, false];
    const act = (n, fl) => {
      if (n.k === 'b') { lit[n.i] = fl; return; }
      if (n.k === 's') return;
      if (n.k === 'S') { const f2 = fl && cond(n, sw); n.kids.forEach((c) => act(c, f2)); } else n.kids.forEach((c) => act(c, fl && cond(c, sw)));
    };
    act(net, cond(net, sw));
    return lit;
  }
  function allOn(net, sw) { const c = cond(net, sw); return [c, c, c]; }
  function leaves(n, k, out) { if (n.k === k) out.push(n); else if (n.kids) n.kids.forEach((c) => leaves(c, k, out)); return out; }
  function why(net, sw, bi) {
    let n = net;
    for (;;) {
      if (n.k === 'b') return 'current flows through it';
      const kid = n.kids.find((c) => leaves(c, 'b', []).some((b) => b.i === bi));
      if (n.k === 'S') {
        const bad = n.kids.find((c) => R(c, sw) === Infinity);
        if (bad) return 'no current flows at all, because the loop is broken by the open switch ' + leaves(bad, 's', []).filter((s) => !sw[s.i]).map((s) => LET[s.i]).join(' and ');
      } else {
        if (R(kid, sw) === Infinity) return 'its branch is cut by the open switch ' + leaves(kid, 's', []).filter((s) => !sw[s.i]).map((s) => LET[s.i]).join(' and ');
        const z = n.kids.find((c) => R(c, sw) === 0);
        if (z) return 'it is short-circuited: the closed switch ' + leaves(z, 's', []).map((s) => LET[s.i]).join(' and ') + ' lets the current bypass it';
      }
      n = kid;
    }
  }
  const sname = (v) => (v ? 'closed' : 'open');
  const key = (s) => s.t + ':' + s.sw.map(Number).join('') + ':' + s.lit.map(Number).join('');

  function render(s) {
    const pic = new RM.Pic();
    const net = NET[s.t];
    const Y0 = 30, DY = 28, YB = 86, X0 = 19, X1 = 87;
    const W = (a, b, y, o) => RM.line(pic, a, y, b, y, o);
    const wo = { sw: 1.6, color: RM.INK };
    const dot = (x, y) => RM.circle(pic, x, y, 1.9, { fill: RM.INK, stroke: RM.INK, sw: 0.4 });
    const label = (x, y, t) => pic.add('<text x="' + RM.fmt(x) + '" y="' + RM.fmt(y) + '" font-size="8.5" font-weight="700" text-anchor="middle" font-family="Arial,sans-serif" fill="#4b5563">' + t + '</text>');
    const elem = (n, x0, x1, y) => {
      const cx = (x0 + x1) / 2;
      W(x0, x1, y, wo);
      if (n.k === 'b') {
        const lit = s.lit[n.i];
        if (lit) for (const a of [45, 135, 225, 315]) {
          const r = a * Math.PI / 180;
          RM.line(pic, cx + 6.4 * Math.cos(r), y + 6.4 * Math.sin(r), cx + 9 * Math.cos(r), y + 9 * Math.sin(r), { sw: 1.7, color: RM.INK, cap: 'round' });
        }
        RM.circle(pic, cx, y, 4.8, { fill: lit ? RM.LIGHT : RM.WHITE, sw: 1.7, stroke: RM.INK });
        RM.line(pic, cx - 3, y - 3, cx + 3, y + 3, { sw: 1.4, color: RM.INK });
        RM.line(pic, cx - 3, y + 3, cx + 3, y - 3, { sw: 1.4, color: RM.INK });
        label(cx, y - 12, n.i + 1);
      } else {
        const a = cx - 4.6, b = cx + 4.6;
        if (s.sw[n.i]) RM.line(pic, a, y, b, y, { sw: 2, color: RM.INK });
        else RM.line(pic, a, y, a + 9 * Math.cos(Math.PI / 6), y - 9 * Math.sin(Math.PI / 6), { sw: 2, color: RM.INK, cap: 'round' });
        dot(a, y); dot(b, y);
        label(cx, y - 9, LET[n.i]);
      }
    };
    const draw = (n, x0, x1, y) => {
      if (n.k === 'b' || n.k === 's') return elem(n, x0, x1, y);
      if (n.k === 'S') {
        const u = (x1 - x0) / n.w;
        let x = x0;
        n.kids.forEach((c) => { draw(c, x, x + u * c.w, y); x += u * c.w; });
        return;
      }
      const m = n.kids.length;
      RM.line(pic, x0, y, x0, y + DY * (m - 1), wo);
      RM.line(pic, x1, y, x1, y + DY * (m - 1), wo);
      n.kids.forEach((c, j) => { draw(c, x0, x1, y + DY * j); dot(x0, y + DY * j); dot(x1, y + DY * j); });
    };
    W(10, X0, Y0, wo); W(X1, 91, Y0, wo);
    RM.line(pic, 91, Y0, 91, YB, wo); W(10, 91, YB, wo);
    RM.line(pic, 10, Y0, 10, 52, wo); RM.line(pic, 10, 60, 10, YB, wo);
    RM.line(pic, 3, 52, 17, 52, { sw: 2.6, color: RM.INK }); RM.line(pic, 6.5, 60, 13.5, 60, { sw: 2.6, color: RM.INK });
    draw(net, X0, X1, Y0);
    return pic.svg();
  }

  RM.register({
    id: 'circuit',
    name: 'Circuits',
    difficulty: 7,
    generate(rng, variant) {
      const fd = rng.pick(FS);
      const same = variant % 2 === 1;
      const ts = same ? [0, 0, 0].map(() => 0) : [];
      const t0 = rng.int(0, TPL.length - 1);
      const tl = same ? [t0, t0, t0] : rng.sample(RM.range(TPL.length), 3);
      const rows = [];
      for (let r = 0; r < 3; r++) {
        const net = NET[tl[r]];
        let ok = null;
        for (let k = 0; k < 40 && !ok; k++) {
          const a = RM.range(4).map(() => rng.chance(0.5)), b = RM.range(4).map(() => rng.chance(0.5));
          const c = a.map((x, i) => fd.f(x, b[i]));
          const la = physics(net, a), lb = physics(net, b), lc = physics(net, c);
          if (la && lb && lc && la.some(Boolean) && lb.some(Boolean) && lc.some(Boolean) && !(la.every(Boolean) && lb.every(Boolean))) ok = { a, b, c, la, lb, lc, t: tl[r] };
        }
        RM.need(ok);
        rows.push(ok);
      }
      void ts;
      // switch rule uniqueness
      const cons = RM.ALL_BOOL.filter((g) => [0, 1].every((r) => rows[r].a.every((x, i) => g(x, rows[r].b[i]) === rows[r].c[i])));
      RM.need(cons.length > 0);
      cons.forEach((g) => rows[2].a.forEach((x, i) => RM.need(g(x, rows[2].b[i]) === rows[2].c[i])));
      // bulb rule uniqueness: naive hypotheses must be refuted by visible panels
      const vis = [];
      rows.forEach((r, i) => { vis.push([r.t, r.a, r.la], [r.t, r.b, r.lb]); if (i < 2) vis.push([r.t, r.c, r.lc]); });
      [naive, allOn].forEach((h) => RM.need(vis.some(([t, sw, lit]) => h(NET[t], sw).some((v, i) => v !== lit[i]))));
      const r3 = rows[2], net3 = NET[r3.t];
      const ans = { t: r3.t, sw: r3.c, lit: r3.lc };
      RM.need(naive(net3, r3.c).some((v, i) => v !== r3.lc[i]));
      const mk = (sw, lit, fl) => ({ spec: { t: r3.t, sw, lit }, flaws: fl });
      const dl = (cl, pl) => {
        const o = [];
        cl.forEach((v, i) => { if (v && !pl[i]) o.push('bulb ' + (i + 1) + ' is drawn lit but no current flows through it'); else if (!v && pl[i]) o.push('bulb ' + (i + 1) + ' should be lit, current flows through it'); });
        return o;
      };
      const cats = [[], [], [], [], [], []];
      cats[0].push(mk(r3.c, naive(net3, r3.c), ['the bulbs are drawn as if short circuits did not exist: ' + dl(naive(net3, r3.c), r3.lc).join('; ')]));
      cats[1].push(mk(r3.c, allOn(net3, r3.c), ['all bulbs are lit as soon as the loop is closed; ' + dl(allOn(net3, r3.c), r3.lc).join('; ')]));
      RM.ALL_BOOL.forEach((g) => {
        const sw = r3.a.map((x, i) => g(x, r3.b[i]));
        const l = physics(net3, sw);
        if (l && sw.some((v, i) => v !== r3.c[i])) cats[2].push(mk(sw, l, ['the switches do not follow the column rule (switch ' + sw.map((v, i) => v !== r3.c[i] ? LET[i] : '').join('') + ' has the wrong state); the bulbs match its own switches']));
      });
      for (let i = 0; i < 3; i++) {
        const l = r3.lc.slice(); l[i] = !l[i];
        cats[3].push(mk(r3.c, l, ['bulb ' + (i + 1) + ' is ' + (l[i] ? 'lit' : 'dark') + ' but the circuit says the opposite: ' + why(net3, r3.c, i)]));
      }
      for (let i = 0; i < 4; i++) {
        const sw = r3.c.slice(); sw[i] = !sw[i];
        const f1 = 'switch ' + LET[i] + ' should be ' + sname(r3.c[i]) + ' according to the column rule';
        cats[4].push(mk(sw, r3.lc, [f1, 'the bulbs do not match these switch positions']));
        const l = physics(net3, sw);
        if (l) cats[5].push(mk(sw, l, [f1]));
      }
      cats.forEach((c, i) => { cats[i] = rng.shuffle(c); });
      const opts = [], seen = { [key(ans)]: 1 };
      for (let round = 0; opts.length < 7 && round < 12; round++) {
        for (const c of cats) {
          if (opts.length >= 7) break;
          while (c.length) {
            const o = c.shift(), k = key(o.spec);
            if (!seen[k]) { seen[k] = 1; opts.push(o); break; }
          }
        }
      }
      RM.need(opts.length === 7);
      opts.push({ spec: ans, flaws: [] });

      const sh = (sw) => sw.map((v, i) => LET[i] + ' ' + sname(v));
      const calc = LET.split('').map((L, i) => L + ': ' + sname(r3.a[i]) + ' + ' + sname(r3.b[i]) + ' → <b>' + sname(r3.c[i]) + '</b>').join('; ');
      const bl = r3.lc.map((v, i) => 'bulb ' + (i + 1) + ' ' + (v ? '<b>lit</b>' : '<b>dark</b>') + ' (' + why(net3, r3.c, i) + ')').join('; ');
      void sh;
      return {
        panels: [].concat(...rows.slice(0, 2).map((r) => [{ t: r.t, sw: r.a, lit: r.la }, { t: r.t, sw: r.b, lit: r.lb }, { t: r.t, sw: r.c, lit: r.lc }]), [{ t: r3.t, sw: r3.a, lit: r3.la }, { t: r3.t, sw: r3.b, lit: r3.lb }]),
        answer: ans,
        options: opts,
        render,
        key,
        rules: [
          { k: 'Switches', t: 'Each row is one circuit (battery with the long and short plates on the left). Closed = flat lever, open = raised lever. Switch by switch, ' + fd.t + '.' },
          { k: 'Bulbs', t: 'A bulb lights (grey with rays) only if current really flows through it. An open switch in the loop stops everything. A bulb in parallel with a closed switch is short-circuited: the current takes the easy way through the switch and the bulb goes out. Bulbs that are not bypassed share the current and light.' },
          { k: 'Row 3 switches', t: 'Applying the column rule to the last row: ' + calc + '.' },
          { k: 'Row 3 bulbs', t: 'With these switches: ' + bl + '. The answer is the panel with exactly these switches and bulbs.' },
        ],
        hint: 'Electricity always takes the easy way.',
      };
    },
  });
})();
