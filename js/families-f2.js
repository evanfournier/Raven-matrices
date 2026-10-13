/* Elite families (f2): paper-fold, laser, slide-puzzle — set F "Panel physics". */
(function () {
  'use strict';
  const RM = window.RM;

  /* ================================================================ Punch & unfold
   * Sheet 12..88 divided into a 6×6 grid of hole positions. A hole = {x, y, s, rot, fx, fy}.
   * Mirroring an already-transformed shape: left↔right → (rot→−rot, fx→−fx); top↔bottom → (rot→−rot, fy→−fy). */
  const HS = { circle: 'circle', tri: 'triangle', flag: 'flag', lsh: 'lshape', arrow: 'arrow' };
  const C6 = 76 / 6;
  const hx = (x) => 12 + (x + 0.5) * C6;
  const mirH = (h) => Object.assign({}, h, { x: 5 - h.x, rot: -h.rot, fx: -h.fx });
  const mirV = (h) => Object.assign({}, h, { y: 5 - h.y, rot: -h.rot, fy: -h.fy });
  const trH = (h) => Object.assign({}, h, { x: h.x < 3 ? h.x + 3 : h.x - 3 });
  const trV = (h) => Object.assign({}, h, { y: h.y < 3 ? h.y + 3 : h.y - 3 });
  const r180 = (h) => Object.assign({}, h, { x: 5 - h.x, y: 5 - h.y, rot: h.rot + 180 });
  function hkey(h) {
    if (h.s === 'circle') return `${h.x},${h.y},c`;
    const pts = RM.SHAPES[HS[h.s]].pts.map(([px, py]) => {
      const X = px * h.fx;
      const Y = py * h.fy;
      const a = (h.rot * Math.PI) / 180;
      return [Math.round((X * Math.cos(a) - Y * Math.sin(a)) * 20), Math.round((X * Math.sin(a) + Y * Math.cos(a)) * 20)].join(':');
    });
    return `${h.x},${h.y},${h.s},${pts.sort().join(';')}`;
  }
  const setKey = (hs) => hs.map(hkey).sort().join('|');
  RM.register({
    id: 'paper-fold',
    name: 'Punch & unfold',
    difficulty: 6,
    generate(rng, variant) {
      const v = variant % 4;
      // quadrant (qx,qy in {0,1}) and unfolding order; the 1st unfold opens across ax1, the 2nd across ax2
      const scheme = [
        { q: [0, 0], ax: ['V', 'H'] },
        { q: [1, 1], ax: ['H', 'V'] },
        { q: [1, 0], ax: ['H', 'V'] },
        { q: [0, 0], ax: ['V', 'H'], forward: true },
      ][v];
      // 'V' = vertical fold line (mirror left↔right), 'H' = horizontal fold line (mirror top↔bottom)
      const mir = (ax) => (ax === 'V' ? mirH : mirV);
      const shapes = v === 0 ? ['circle', 'tri', 'circle'] : ['tri', 'flag', 'lsh', 'arrow', 'circle'];
      const nh = v === 2 ? 3 : rng.int(2, 3);
      const quadHoles = () => {
        const cells = rng.sample(RM.range(9), nh);
        return cells.map((k) => ({
          x: scheme.q[0] * 3 + (k % 3),
          y: scheme.q[1] * 3 + Math.floor(k / 3),
          s: rng.pick(shapes),
          rot: rng.pick([0, 90, 180, 270]),
          fx: 1,
          fy: 1,
        }));
      };
      const unfold = (hs, ax) => hs.concat(hs.map(mir(ax)));
      // regions: which part of the sheet is visible (paper outline) and which edges are fold edges
      const qx = scheme.q[0];
      const qy = scheme.q[1];
      const region1 = { x: qx * 38, y: qy * 38, w: 38, h: 38 };
      const region2 = scheme.ax[0] === 'V' ? { x: 0, y: qy * 38, w: 76, h: 38 } : { x: qx * 38, y: 0, w: 38, h: 76 };
      const full = { x: 0, y: 0, w: 76, h: 76 };
      const rows = RM.range(3).map(() => {
        if (scheme.forward) {
          // forward folding: full sheet → folded once → folded twice
          const hs = [];
          const used = new Set();
          for (let i = 0; i < rng.int(3, 4); i++) {
            const h = { x: rng.int(0, 5), y: rng.int(0, 5), s: rng.pick(shapes), rot: rng.pick([0, 90, 180, 270]), fx: 1, fy: 1 };
            if (used.has(h.x + ',' + h.y)) continue;
            used.add(h.x + ',' + h.y);
            hs.push(h);
          }
          const fold = (list, ax) => {
            // the half that is NOT kept is folded over: its holes land mirrored on the kept half
            const keep = ax === 'V' ? (h) => (qx === 0 ? h.x < 3 : h.x >= 3) : (h) => (qy === 0 ? h.y < 3 : h.y >= 3);
            const out = list.filter(keep).concat(list.filter((h) => !keep(h)).map(mir(ax)));
            const k = new Set();
            return out.filter((h) => {
              const id = h.x + ',' + h.y;
              if (k.has(id)) return false;
              k.add(id);
              return true;
            });
          };
          const b = fold(hs, scheme.ax[0]);
          const c = fold(b, scheme.ax[1]);
          RM.need(b.length === hs.length && c.length === b.length);
          return [hs, b, c];
        }
        const a = quadHoles();
        const b = unfold(a, scheme.ax[0]);
        return [a, b, unfold(b, scheme.ax[1])];
      });
      RM.need(rows.every((r) => r[0].some((h) => h.s !== 'circle')));
      // hypotheses per step: mirror / translate / half-turn across either axis
      const ops = { mirV: mirV, mirH: mirH, trH: trH, trV: trV, r180: r180 };
      const preds = new Set();
      if (!scheme.forward) {
        const step = (hs, op) => hs.concat(hs.map(ops[op]));
        Object.keys(ops).forEach((o2) => {
          if ([0, 1].every((r) => setKey(step(rows[r][1], o2)) === setKey(rows[r][2]))) preds.add(setKey(step(rows[2][1], o2)));
        });
        RM.need([0, 1].some((r) => setKey(step(rows[r][0], scheme.ax[0] === 'V' ? 'trH' : 'trV')) !== setKey(rows[r][1])));
      } else preds.add(setKey(rows[2][2]));
      RM.need(preds.size === 1 && preds.has(setKey(rows[2][2])));
      const ans = rows[2][2];
      // mistakes target holes created by the last unfold (or folded-over holes)
      const created = ans.map((h, i) => i).filter((i) => (scheme.forward ? !rows[2][1].some((g) => hkey(g) === hkey(ans[i])) : i >= ans.length / 2));
      RM.need(created.length >= 2);
      const src = (i) => (scheme.forward ? null : ans[i - ans.length / 2]);
      const asym = created.filter((i) => ans[i].s !== 'circle');
      const iC = asym.length ? asym[0] : -1;
      const rest = created.filter((i) => i !== iC);
      RM.need(rest.length >= 2 || (iC < 0 && rest.length >= 2));
      const iA = rest[0];
      const iB = rest[1];
      const lastAx = scheme.ax[1];
      const translateOf = (i) => (lastAx === 'V' ? trH : trV)(scheme.forward ? mir(lastAx)(ans[i]) : src(i));
      const unflipped = (i) => {
        const s0 = scheme.forward ? mir(lastAx)(ans[i]) : src(i);
        return Object.assign({}, ans[i], { rot: s0.rot, fx: s0.fx, fy: s0.fy });
      };
      RM.need(hkey(translateOf(iA)) !== hkey(ans[iA]));
      RM.need(!ans.some((h) => h.x === translateOf(iA).x && h.y === translateOf(iA).y));
      if (iC >= 0) RM.need(hkey(unflipped(iC)) !== hkey(ans[iC]));
      const free = [];
      for (let x = 0; x < 6; x++) for (let y = 0; y < 6; y++) if (!ans.some((h) => h.x === x && h.y === y)) free.push([x, y]);
      const extra = rng.pick(free);
      const regionOf = (c) => (c === 0 ? region1 : c === 1 ? region2 : full);
      const regionF2 = scheme.ax[0] === 'V' ? { x: qx * 38, y: 0, w: 38, h: 76 } : { x: 0, y: qy * 38, w: 76, h: 38 };
      const fwdRegion = (c) => (c === 0 ? full : c === 1 ? regionF2 : region1);
      const pan = (hs, c) => ({ h: hs, reg: scheme.forward ? fwdRegion(c) : regionOf(c) });
      const AX = { V: 'the vertical fold line (left ↔ right)', H: 'the horizontal fold line (top ↔ bottom)' };
      return {
        difficulty: scheme.forward ? 7 : 6,
        hint: 'this paper has been folded.',
        panels: RM.flat(rows.map((r) => r.map(pan))),
        answer: pan(ans, 2),
        key: (s) => Array.from(new Set(s.h.filter(Boolean).map(hkey))).sort().join('|') + JSON.stringify(s.reg),
        render(sp) {
          const pic = new RM.Pic();
          pic.add(`<rect x="12" y="12" width="76" height="76" fill="none" stroke="${RM.FAINT}" stroke-width="1" stroke-dasharray="2 2"/>`);
          const r = sp.reg;
          pic.add(`<rect x="${12 + r.x}" y="${12 + r.y}" width="${r.w}" height="${r.h}" fill="#fff" stroke="${RM.INK}" stroke-width="1.8"/>`);
          // fold edges: edges of the visible paper lying on the centre lines of the sheet
          const fe = [];
          if (r.w === 38) fe.push(r.x === 0 ? [[50, 12 + r.y], [50, 12 + r.y + r.h]] : [[50, 12 + r.y], [50, 12 + r.y + r.h]]);
          if (r.h === 38) fe.push([[12 + r.x, 50], [12 + r.x + r.w, 50]]);
          fe.forEach(([p, q]) => RM.line(pic, p[0], p[1], q[0], q[1], { sw: 2, dash: 'dashed', cap: 'butt' }));
          sp.h.filter(Boolean).forEach((h) => RM.shape(pic, HS[h.s], hx(h.x), hx(h.y), 4.4, { fill: 'gray', rot: h.rot, fx: h.fx, fy: h.fy, sw: 1.2 }));
          return pic.svg();
        },
        perturb: [
          { apply: (s) => ((s.h[iA] = translateOf(iA)), s), why: 'one hole was slid across instead of being mirrored' },
          { apply: (s) => ((s.h[iB] = null), s), why: 'a mirrored hole is missing' },
          iC >= 0
            ? { apply: (s) => (s.h[iC] ? ((s.h[iC] = unflipped(iC)), s) : null), why: 'a hole is in the right place but its shape was not mirrored' }
            : { apply: (s) => (s.h.push({ x: extra[0], y: extra[1], s: 'circle', rot: 0, fx: 1, fy: 1 }), s), why: 'there is an extra hole that no fold explains' },
        ],
        rules: scheme.forward
          ? [
              { k: 'Folding', t: `panel 1 is the open sheet. Panel 2: it is folded across ${AX[scheme.ax[0]]}; holes on the folded half land, mirrored, on the half that stays. Panel 3: it is folded again across ${AX[scheme.ax[1]]}.` },
              { k: 'Mirroring', t: 'a folded-over hole is reflected — its position and its shape (a triangle pointing right ends up pointing left, a flag changes side…).' },
            ]
          : [
              { k: 'Unfolding', t: `panel 1 shows the paper folded twice (dashed edges = folds) with holes punched through all layers. Panel 2: unfolded across ${AX[scheme.ax[0]]}. Panel 3: unfolded across ${AX[scheme.ax[1]]}.` },
              { k: 'Mirroring', t: 'each unfold adds the reflection of every hole across the fold line — the hole\'s shape is reflected too (a triangle pointing right becomes one pointing left).' },
              { k: 'Answer', t: `the full sheet of row 3 has <b>${ans.length} holes</b>.` },
            ],
      };
    },
  });

  /* ================================================================ Laser mirrors */
  const flipM = (a) => (a ? 3 - a : 0);
  function beam(m, e, mode) {
    // returns {pts: [[x,y]...] in cell coordinates (centres), exit, refl}
    let x = 0;
    let y = e;
    let dx = 1;
    let dy = 0;
    const pts = [[-0.9, e]];
    let refl = 0;
    let skipped = mode !== 'skip1';
    for (let k = 0; k < 40; k++) {
      if (x < 0 || x > 3 || y < 0 || y > 3) {
        pts.push([x - dx * 0.1, y - dy * 0.1]);
        return { pts, refl, exit: [x, y] };
      }
      pts.push([x, y]);
      const s = m[y * 4 + x];
      if (s) {
        if (!skipped) skipped = true;
        else {
          refl++;
          if (s === 1) [dx, dy] = [-dy, -dx];
          else [dx, dy] = [dy, dx];
        }
      }
      x += dx;
      y += dy;
    }
    return { pts, refl, exit: [x, y] };
  }
  const TABLES = {
    cancel: (a, b) => (a && b ? 0 : a || b),
    flip: (a, b) => (a ? (b ? flipM(a) : a) : b),
    keep1: (a, b) => a || b,
    keep2: (a, b) => b || a,
    sum3: (a, b) => (a + b) % 3,
    and: (a, b) => (a && b ? a : 0),
  };
  RM.register({
    id: 'laser',
    name: 'Laser mirrors',
    difficulty: 6,
    generate(rng, variant) {
      const v = variant % 4;
      const tab = v === 1 ? 'flip' : 'cancel';
      const rotM = (m) => {
        const r = RM.tgrid(m, 4, 'r90');
        return r.map(flipM);
      };
      const rows = RM.range(3).map((r) => {
        const e0 = rng.int(0, 3);
        const E = v === 3 ? [e0, (e0 + 1) % 4, (e0 + 2) % 4] : [e0, e0, e0];
        const rand = () => RM.range(16).map(() => (rng.chance(0.38) ? rng.int(1, 2) : 0));
        let ms;
        if (v === 2) {
          const a = rand();
          ms = [a, rotM(a), rotM(rotM(a))];
        } else {
          const a = rand();
          const b = rand();
          ms = [a, b, a.map((x, i) => TABLES[tab](x, b[i]))];
        }
        return ms.map((m, c) => ({ m, e: E[c] }));
      });
      // learnability and uniqueness of the mirror rule
      const mk = (p) => p.m.join('');
      if (v === 2) {
        const preds = new Set();
        ['id', 'r90', 'r180', 'r270', 'fh', 'fv', 'tr', 'at'].forEach((t) =>
          [false, true].forEach((fl) => {
            const H = (m) => RM.tgrid(m, 4, t).map((x) => (fl ? flipM(x) : x));
            if ([0, 1].every((r) => H(rows[r][0].m).join('') === mk(rows[r][1]) && H(rows[r][1].m).join('') === mk(rows[r][2]))) preds.add(H(rows[2][1].m).join(''));
          })
        );
        RM.need(preds.size === 1 && preds.has(mk(rows[2][2])));
      } else {
        const seen = new Set();
        [0, 1].forEach((r) => rows[r][0].m.forEach((a, i) => seen.add(a + ',' + rows[r][1].m[i])));
        RM.need(rows[2][0].m.every((a, i) => seen.has(a + ',' + rows[2][1].m[i])));
        RM.need(seen.has('1,2') || seen.has('2,1') || seen.has('1,1') || seen.has('2,2'));
        const preds = new Set();
        Object.values(TABLES).forEach((f) => {
          if ([0, 1].every((r) => rows[r][0].m.every((a, i) => f(a, rows[r][1].m[i]) === rows[r][2].m[i]))) preds.add(rows[2][0].m.map((a, i) => f(a, rows[2][1].m[i])).join(''));
        });
        RM.need(preds.size === 1 && preds.has(mk(rows[2][2])));
      }
      if (v === 3) {
        const E = rows.map((r) => r.map((p) => p.e));
        RM.needUnique(E, E[2][2], 'numeric', 4);
      }
      rows.forEach((r) => r.forEach((p) => RM.need(beam(p.m, p.e).refl >= 1)));
      const ans = rows[2][2];
      const b0 = beam(ans.m, ans.e);
      RM.need(b0.refl >= 2);
      // mirrors hit by the correct beam
      const hit = b0.pts.slice(1, -1).map(([x, y]) => y * 4 + x).filter((i) => ans.m[i]);
      RM.need(hit.length >= 2);
      const iA = hit[hit.length - 1];
      const others = ans.m.map((x, i) => (x && i !== iA ? i : -1)).filter((i) => i >= 0);
      RM.need(others.length >= 1);
      const iC = others.includes(hit[0]) && hit[0] !== iA ? hit[0] : rng.pick(others);
      const C = 16;
      const cx = (x) => 18 + (x + 0.5) * C;
      return {
        difficulty: v === 2 ? 7 : 6,
        hint: 'work out the mirrors first; the beam takes care of itself.',
        panels: RM.flat(rows),
        answer: Object.assign({ mode: 'normal' }, ans),
        key: (s) => s.m.join('') + '|' + s.e + '|' + JSON.stringify(beam(s.m, s.e, s.mode).pts),
        render(sp) {
          const pic = new RM.Pic();
          for (let k = 0; k <= 4; k++) {
            RM.line(pic, 18 + k * C, 18, 18 + k * C, 82, { sw: 0.7, color: RM.LIGHT, cap: 'butt' });
            RM.line(pic, 18, 18 + k * C, 82, 18 + k * C, { sw: 0.7, color: RM.LIGHT, cap: 'butt' });
          }
          const b = beam(sp.m, sp.e, sp.mode);
          RM.polyline(pic, b.pts.map(([x, y]) => [cx(x), cx(y)]), { sw: 3.4, color: RM.GRAY });
          sp.m.forEach((s, i) => {
            if (!s) return;
            const x = 18 + (i % 4) * C;
            const y = 18 + Math.floor(i / 4) * C;
            if (s === 1) RM.line(pic, x + 2.5, y + C - 2.5, x + C - 2.5, y + 2.5, { sw: 3.2 });
            else RM.line(pic, x + 2.5, y + 2.5, x + C - 2.5, y + C - 2.5, { sw: 3.2 });
          });
          const ey = cx(sp.e);
          RM.polygon(pic, [[7, ey - 5], [14, ey], [7, ey + 5]], { fill: 'black', sw: 1 });
          const last = b.pts[b.pts.length - 1];
          RM.circle(pic, cx(last[0]), cx(last[1]), 3, { fill: 'black', sw: 0 });
          return pic.svg();
        },
        perturb: [
          { apply: (s) => (s.m[iA] ? ((s.m[iA] = flipM(s.m[iA])), s) : null), why: 'one mirror on the beam\'s path is tilted the wrong way' },
          { apply: (s) => ((s.mode = 'skip1'), s), why: 'the beam goes straight through a mirror instead of bouncing off it' },
          { apply: (s) => ((s.m[iC] = 0), s), why: 'a mirror is missing' },
        ],
        rules: [
          v === 2
            ? { k: 'Mirrors', t: 'from one panel to the next the whole grid is turned 90° clockwise — and turning a mirror by 90° changes / into \\ and \\ into /.' }
            : v === 1
              ? { k: 'Mirrors', t: 'cell by cell: a mirror of panel 1 stays as it is, unless panel 2 also has a mirror in that cell — then it is <b>flipped</b> (/ ↔ \\). Where panel 1 is empty, panel 2\'s mirror is copied.' }
              : { k: 'Mirrors', t: 'cell by cell: the mirrors of panels 1 and 2 are put together, but a cell holding a mirror in <b>both</b> panels ends up empty.' },
          v === 3
            ? { k: 'Laser', t: 'the laser (black triangle) moves down one row at every step (back to the top after the bottom).' }
            : { k: 'Laser', t: 'the laser (black triangle) stays on the same row along a row of the matrix.' },
          { k: 'Beam', t: `the grey beam always obeys the mirrors: it bounces 90° on each mirror it meets and leaves the grid at the black dot. In the answer it bounces <b>${b0.refl} times</b>.` },
        ],
      };
    },
  });

  /* ================================================================ Sliding tiles */
  const SYM = [
    ['circle', 'black'], ['triangle', 'white'], ['square', 'gray'], ['star5', 'black'],
    ['diamond', 'white'], ['cross', 'black'], ['heart', 'white'], ['hexagon', 'gray'],
  ];
  const MV = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const MNAME = ['up', 'right', 'down', 'left'];
  function move(a, d) {
    const b = a.indexOf(0);
    const x = (b % 3) + MV[d][0];
    const y = Math.floor(b / 3) + MV[d][1];
    if (x < 0 || x > 2 || y < 0 || y > 2) return null;
    const out = a.slice();
    out[b] = out[y * 3 + x];
    out[y * 3 + x] = 0;
    return out;
  }
  const apply = (a, seq) => seq.reduce((s, d) => (s ? move(s, d) : null), a);
  const RING = [0, 1, 2, 5, 8, 7, 6, 3];
  RM.register({
    id: 'slide-puzzle',
    name: 'Sliding tiles',
    difficulty: 6,
    generate(rng, variant) {
      const v = variant % 4;
      const rnd = (n) => {
        const s = [rng.int(0, 3)];
        while (s.length < n) {
          const d = rng.int(0, 3);
          if ((d + 2) % 4 !== s[s.length - 1]) s.push(d);
        }
        return s;
      };
      const s1 = v === 0 ? rnd(1) : v === 3 ? rnd(3) : rnd(2);
      const s2 = v === 2 ? rnd(2) : s1;
      RM.need(v !== 2 || s2.join() !== s1.join());
      // blank start cells from which both steps are legal
      const okStart = RM.range(9).filter((b0) => {
        const t = RM.range(9).map((i) => (i === b0 ? 0 : 1));
        const b = apply(t, s1);
        return b && apply(b, s2);
      });
      RM.need(okStart.length > 0);
      const rows = RM.range(3).map(() => {
        const b0 = rng.pick(okStart);
        const tiles = rng.shuffle(RM.range(8).map((i) => i + 1));
        const a = RM.range(9).map((i) => (i === b0 ? 0 : tiles.pop()));
        const b = apply(a, s1);
        const c = apply(b, s2);
        return [a, b, c];
      });
      RM.need(rows[0][0].indexOf(0) !== rows[1][0].indexOf(0) || rows[0][0].join() !== rows[1][0].join());
      // hypotheses for each step: blank-move sequences of length 1–3, any swap of two tiles, ring rotations
      const H = [];
      const seqs = [];
      for (let a = 0; a < 4; a++) {
        seqs.push([a]);
        for (let b = 0; b < 4; b++) {
          seqs.push([a, b]);
          for (let c = 0; c < 4; c++) seqs.push([a, b, c]);
        }
      }
      seqs.forEach((s) => H.push((x) => apply(x, s)));
      for (let i = 0; i < 9; i++)
        for (let j = i + 1; j < 9; j++)
          H.push((x) => {
            const y = x.slice();
            [y[i], y[j]] = [y[j], y[i]];
            return y;
          });
      for (let k = 1; k < 8; k++)
        H.push((x) => {
          const y = x.slice();
          RING.forEach((p, i) => (y[RING[(i + k) % 8]] = x[p]));
          return y;
        });
      const preds = new Set();
      H.forEach((h) => {
        if ([0, 1].every((r) => {
          const y = h(rows[r][1]);
          return y && y.join() === rows[r][2].join();
        })) {
          const y = h(rows[2][1]);
          preds.add(y ? y.join() : 'none');
        }
      });
      RM.need(preds.size === 1 && preds.has(rows[2][2].join()));
      const src = rows[2][1];
      const ans = rows[2][2];
      const altSeq = s2.length > 1 ? s2.slice().reverse() : [(s2[0] + 2) % 4];
      const altA = apply(src, altSeq);
      const tiles = RM.range(9).filter((i) => ans[i]);
      const [p, q] = rng.sample(tiles, 2);
      const extraDirs = rng.shuffle([0, 1, 2, 3]).filter((d) => d !== (s2[s2.length - 1] + 2) % 4);
      return {
        difficulty: v === 3 ? 7 : 6,
        hint: 'follow the empty square.',
        panels: RM.flat(rows.map((r) => r.map((a) => ({ a })))),
        answer: { a: ans },
        key: (s) => s.a.join(','),
        render(sp) {
          const pic = new RM.Pic();
          pic.add(`<rect x="7" y="7" width="86" height="86" rx="5" fill="${RM.FAINT}" stroke="${RM.INK}" stroke-width="2.2"/>`);
          sp.a.forEach((t, i) => {
            if (!t) return;
            const x = 10 + (i % 3) * 27;
            const y = 10 + Math.floor(i / 3) * 27;
            pic.add(`<rect x="${x}" y="${y}" width="26" height="26" rx="4" fill="#fff" stroke="${RM.INK}" stroke-width="1.6"/>`);
            RM.shape(pic, SYM[t - 1][0], x + 13, y + 13, 7.5, { fill: SYM[t - 1][1], sw: 1.5 });
          });
          return pic.svg();
        },
        perturb: [
          { apply: (s) => (altA && altA.join() !== ans.join() ? ((s.a = altA), s) : null), why: s2.length > 1 ? 'the moves were made in the wrong order' : 'the empty square moved the wrong way' },
          {
            apply: (s) => {
              [s.a[p], s.a[q]] = [s.a[q], s.a[p]];
              return s;
            },
            why: 'two tiles are swapped',
          },
          {
            apply: (s) => {
              for (const d of extraDirs) {
                const y = move(s.a, d);
                if (y) {
                  s.a = y;
                  return s;
                }
              }
              return null;
            },
            why: 'the empty square made one move too many',
          },
        ],
        rules: [
          { k: 'Moves', t: 'a tile can only slide into the empty square. Describe each step by where the empty square goes.' },
          v === 2
            ? { k: 'Steps', t: `panel 1 → 2: the empty square moves <b>${s1.map((d) => MNAME[d]).join(', then ')}</b>; panel 2 → 3: <b>${s2.map((d) => MNAME[d]).join(', then ')}</b> — the same in every row.` }
            : { k: 'Steps', t: `at every step the empty square moves <b>${s1.map((d) => MNAME[d]).join(', then ')}</b> (the tiles in its way slide into it).` },
          { k: 'Answer', t: 'apply the second step to the middle panel of row 3.' },
        ],
      };
    },
  });
})();
