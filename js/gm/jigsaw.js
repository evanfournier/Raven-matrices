/* Hole and piece (grandmaster): each row shows a board with an irregular hole, a loose polyomino piece in some
   orientation, and the board after the piece was turned (never required to be flipped) and inserted into the hole.
   The piece fits in exactly one placement over all positions and orientations. */
(function () {
  'use strict';
  const RM = window.RM;
  const N = 6;
  const rot = (c) => [c[1], -c[0]];            // clockwise quarter turn (row down, col right)
  const flp = (c) => [c[0], -c[1]];
  const norm = (cells) => {
    const mr = Math.min(...cells.map((c) => c[0])), mc = Math.min(...cells.map((c) => c[1]));
    return cells.map((c) => [c[0] - mr, c[1] - mc]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  };
  const ck = (cells) => cells.map((c) => c[0] * N + c[1]).sort((a, b) => a - b).join(',');
  const orient = (cells, f, k) => {
    let r = cells;
    if (f) r = r.map(flp);
    for (let i = 0; i < k; i++) r = r.map(rot);
    return norm(r);
  };
  const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  function polyomino(rng, n) {
    const s = [[0, 0]]; const seen = new Set(['0,0']);
    while (s.length < n) {
      const b = rng.pick(s), d = rng.pick(nb), c = [b[0] + d[0], b[1] + d[1]];
      if (seen.has(c + '')) continue;
      seen.add(c + ''); s.push(c);
    }
    return norm(s);
  }
  function placements(cells, H, all) {   // distinct placements (as key -> {cells,f,k}) of all orientations, anywhere on board
    const out = new Map(); const hs = H ? new Set(H) : null;
    for (let f = 0; f < 2; f++) for (let k = 0; k < 4; k++) {
      const o = orient(cells, f, k);
      const h = Math.max(...o.map((c) => c[0])), w = Math.max(...o.map((c) => c[1]));
      for (let r = 0; r + h < N; r++) for (let c = 0; c + w < N; c++) {
        const S = o.map((p) => (p[0] + r) * N + p[1] + c);
        if (!all && !S.every((x) => hs.has(x))) continue;
        const key = S.slice().sort((a, b) => a - b).join(',');
        if (!out.has(key)) out.set(key, { S: S.slice().sort((a, b) => a - b), f, k });
      }
    }
    return out;
  }
  function genRow(rng, flip) {
    for (let t = 0; t < 300; t++) {
      const n = rng.int(4, 5);
      const base = polyomino(rng, n);
      const h = Math.max(...base.map((c) => c[0])), w = Math.max(...base.map((c) => c[1]));
      if (h > 3 || w > 3) continue;
      const r0 = rng.int(0, N - 1 - h), c0 = rng.int(0, N - 1 - w);
      const S = base.map((p) => (p[0] + r0) * N + p[1] + c0);
      const H = new Set(S); const tgt = rng.int(Math.max(6, n + 2), 9);
      let g = 0;
      while (H.size < tgt && g++ < 80) {
        const b = rng.pick([...H]), d = rng.pick(nb);
        const r = Math.floor(b / N) + d[0], c = (b % N) + d[1];
        if (r >= 0 && r < N && c >= 0 && c < N) H.add(r * N + c);
      }
      if (H.size < 6) continue;
      const Hs = [...H].sort((a, b) => a - b);
      const pl = placements(base, Hs, false);
      if (pl.size !== 1) continue;
      // shown piece: transformed copy that does not fit by translation alone
      const f = flip ? 1 : 0, k = flip ? rng.int(0, 3) : rng.int(1, 3);
      const shown = orient(base, f, k);
      let tr = false;
      const sh = Math.max(...shown.map((c) => c[0])), sw = Math.max(...shown.map((c) => c[1]));
      for (let r = 0; r + sh < N && !tr; r++) for (let c = 0; c + sw < N && !tr; c++) {
        if (shown.every((p) => H.has((p[0] + r) * N + p[1] + c))) tr = true;
      }
      if (tr) continue;
      if (flip && ck(shown) === ck(orient(shown, 1, 0))) continue;   // symmetric piece: flip not needed
      if (flip && [0, 1, 2, 3].some((q) => ck(orient(shown, 0, q)) === ck(base))) continue; // reachable by rotation only
      return { H: Hs, S, shown, base };
    }
    return null;
  }
  const flatS = (s) => s.slice().sort((a, b) => a - b);

  RM.register({
    id: 'jigsaw',
    name: 'Hole and piece',
    difficulty: 7,
    generate(rng, variant) {
      const flip = variant === 1, ghost = variant === 3;
      const rows = [];
      for (let i = 0; i < 3; i++) { const r = genRow(rng, flip); RM.need(r); rows.push(r); }
      RM.need(new Set(rows.map((r) => ck(r.base.concat([[9, 9]])) )).size >= 2 || true);
      const mk = (r, last) => [{ t: 'board', H: r.H }, { t: 'piece', cells: r.shown }, last ? null : { t: 'res', H: r.H, S: r.S }];
      const panels = [];
      for (let i = 0; i < 3; i++) { const m = mk(rows[i], i === 2); panels.push(m[0], m[1]); if (i < 2) panels.push(m[2]); }
      const R = rows[2];
      const answer = { t: 'res', H: R.H, S: R.S };
      const vis = (sp) => (ghost ? sp.S.filter((x) => sp.H.includes(x)) : sp.S);
      const key = (sp) => sp.t + ':' + (sp.t === 'res' ? ck2(vis(sp)) + '|' + sp.H.join(',') : sp.cells + '');
      function ck2(a) { return flatS(a).join(','); }
      const Hs = new Set(R.H);
      // candidates
      const all = placements(R.base, null, true);
      const cand = [];
      const ansKey = ck2(vis(answer));
      const dir = (f, k) => (f ? 'mirror image of the piece (flipping is not allowed)' : 'wrong turn of the piece');
      for (const p of all.values()) {
        const sp = { t: 'res', H: R.H, S: p.S };
        if (ck2(vis(sp)) === ansKey) continue;
        const out = p.S.filter((x) => !Hs.has(x)).length;
        const ins = p.S.length - out;
        const fl = [];
        if (out > 0 && !ghost) fl.push('the piece sticks out of the hole over the grey board (' + out + ' cell' + (out > 1 ? 's' : '') + ' outside)');
        if (out > 0 && ghost) fl.push('the remaining hole is wrong: this shows a piece that does not fit inside the hole');
        if (out === 0) fl.push('the piece does not match the loose piece');
        if (p.f && !flip) fl.push('it uses the ' + dir(1, p.k) + ', which is not allowed');
        cand.push({ spec: sp, flaws: fl, w: ins + rng.next() * 1.5, out });
      }
      // moved-cell variants
      const free = R.H.filter((x) => !R.S.includes(x));
      const mv = [];
      for (const a of R.S) for (const b of free) {
        const S = R.S.filter((x) => x !== a).concat([b]);
        mv.push({ spec: { t: 'res', H: R.H, S }, flaws: ['one cell is in the wrong place: the black cells no longer form the loose piece'], w: 100 + rng.next(), out: 0 });
      }
      const mvp = rng.shuffle(mv).slice(0, 3);
      const rest = cand.sort((a, b) => b.w - a.w);
      const pool = [];
      const seen = new Set([key(answer)]);
      const take = (c) => { const k = key(c.spec); if (!seen.has(k)) { seen.add(k); pool.push(c); } };
      mvp.forEach(take);
      let so = 0;
      for (const c of rest) { if (pool.length >= 7) break; if (c.out > 0 && so >= 3) continue; if (c.out > 0) so++; take(c); }
      for (const c of rest) { if (pool.length >= 7) break; take(c); }
      for (const c of mv) { if (pool.length >= 7) break; take(c); }
      RM.need(pool.length >= 7);
      const options = [{ spec: answer, flaws: [] }].concat(pool.slice(0, 7).map((c) => ({ spec: c.spec, flaws: c.flaws })));
      // rule text
      const pc = (a) => 'row ' + (Math.floor(a / N) + 1) + ', column ' + ((a % N) + 1);
      let how = null;
      for (let f = 0; f < 2 && !how; f++) for (let k = 0; k < 4 && !how; k++) {
        if (ck(orient(R.shown, f, k)) === ck(norm(R.S.map((x) => [Math.floor(x / N), x % N])))) how = { f, k };
      }
      RM.need(how);
      const turn = how.k === 0 ? 'no turn' : how.k === 2 ? 'a half turn' : how.k === 1 ? 'a quarter turn clockwise' : 'a quarter turn anticlockwise';
      const sorted = flatS(R.S);
      const rem = R.H.filter((x) => !R.S.includes(x));
      return {
        panels, answer, options,
        render(sp) {
          const pic = new RM.Pic();
          const cs = 88 / N, o = 6;
          const cell = (r, c, fill, stroke) => pic.add('<rect x="' + RM.fmt(o + c * cs) + '" y="' + RM.fmt(o + r * cs) + '" width="' + RM.fmt(cs) + '" height="' + RM.fmt(cs) + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1"/>');
          if (sp.t === 'piece') {
            const h = Math.max(...sp.cells.map((c) => c[0])) + 1, w = Math.max(...sp.cells.map((c) => c[1])) + 1;
            const r0 = Math.floor((N - h) / 2), c0 = Math.floor((N - w) / 2);
            const on = new Set(sp.cells.map((p) => (p[0] + r0) * N + p[1] + c0));
            for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) cell(r, c, on.has(r * N + c) ? RM.INK : '#ffffff', on.has(r * N + c) ? '#ffffff' : '#d1d5db');
          } else {
            const hs = new Set(sp.H), bs = new Set(sp.t === 'res' ? sp.S : []);
            for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
              const i = r * N + c;
              if (bs.has(i)) cell(r, c, ghost ? (hs.has(i) ? '#9ca3af' : '#9ca3af') : RM.INK, '#ffffff');
              else if (hs.has(i)) cell(r, c, '#ffffff', '#6b7280');
              else cell(r, c, '#9ca3af', '#ffffff');
            }
            if (ghost && sp.t === 'res') {   // piece cells outside the hole cannot be told apart from the board
              for (const i of bs) if (!hs.has(i)) { /* same colour as board */ }
            }
          }
          return pic.svg();
        },
        key,
        rules: [
          { k: 'Board', t: 'Left column: a grey board with a white <b>hole</b>. Middle column: a loose piece made of black squares.' },
          { k: 'Fitting', t: 'The piece is turned (' + (flip ? 'flipping it over is allowed here' : '<b>never flipped</b>') + ') and inserted into the hole. It fits in exactly one position and must lie entirely inside the hole.' },
          { k: 'Right column', t: ghost
              ? 'The right panel shows only what remains of the hole: the inserted piece is drawn grey like the board, the remaining hole stays white.'
              : 'The right panel shows the board after insertion: the piece is black inside the hole and the rest of the hole stays white.' },
          { k: 'Bottom row', t: 'The loose piece needs ' + turn + (how.f ? ' after being flipped' : '') + ' to fit. It then covers (' + sorted.map(pc).join('; ') + '). <b>Remaining white cells: ' + (rem.length ? rem.map(pc).join('; ') : 'none') + '.</b>' },
        ],
        hint: flip ? 'Turn the piece in your head, and flipping is allowed.' : "Turn the piece in your head, but don't flip it.",
      };
    },
  });
})();
