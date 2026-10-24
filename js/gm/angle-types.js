/* Angles (grandmaster): lattice polygons on a dotted lattice, built from a tilted rectilinear outline whose convex corners may be
 * chamfered (135 degree corners). Rule: the number of exact right angles (90 degree interior corners) is constant along each row;
 * the number of reflex (inward, > 180 degree) corners grows (or shrinks) by one per column. The number of sides and of obtuse
 * corners are decoys (needNoConflict). Distractors are polygons whose (right, reflex) counts are the 8 neighbours of the right pair. */
(function () {
  'use strict';
  const RM = window.RM;
  const BASES = [[2, 1], [1, 2], [2, -1], [1, -2]];
  const BW = 4;

  function outline(cells) {
    const has = (x, y) => cells.has(x + ',' + y);
    const next = new Map();
    let total = 0;
    let bad = false;
    const add = (a, b) => {
      const k = a.join(',');
      if (next.has(k)) bad = true;
      next.set(k, b);
      total++;
    };
    cells.forEach((k) => {
      const [x, y] = k.split(',').map(Number);
      if (!has(x, y - 1)) add([x, y], [x + 1, y]);
      if (!has(x + 1, y)) add([x + 1, y], [x + 1, y + 1]);
      if (!has(x, y + 1)) add([x + 1, y + 1], [x, y + 1]);
      if (!has(x - 1, y)) add([x, y + 1], [x, y]);
    });
    if (bad) return null;
    const start = next.keys().next().value;
    const pts = [];
    let cur = start;
    do {
      pts.push(cur.split(',').map(Number));
      cur = next.get(cur).join(',');
    } while (cur !== start && pts.length <= total);
    if (pts.length !== total) return null;
    const m = pts.length;
    return pts.filter((p, i) => {
      const a = pts[(i + m - 1) % m], b = pts[(i + 1) % m];
      return (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]) !== 0;
    });
  }

  function classify(pts) {
    const m = pts.length;
    const r = { right: 0, reflex: 0, acute: 0, obtuse: 0, n: m };
    for (let i = 0; i < m; i++) {
      const a = pts[(i + m - 1) % m], p = pts[i], b = pts[(i + 1) % m];
      const d1 = [p[0] - a[0], p[1] - a[1]], d2 = [b[0] - p[0], b[1] - p[1]];
      const cr = d1[0] * d2[1] - d1[1] * d2[0];
      const dt = d1[0] * d2[0] + d1[1] * d2[1];
      if (cr < 0) r.reflex++;
      else if (dt === 0) r.right++;
      else if (dt > 0) r.obtuse++;
      else r.acute++;
    }
    return r;
  }

  /* random simple rectilinear polygon (as a tilted lattice polygon) with R right angles and X reflex corners */
  function gen(rng, R, X, bi) {
    const k = 4 + X - R;
    if (k < 0 || R < 0) return null;
    const [a, b] = BASES[bi];
    for (let t = 0; t < 80; t++) {
      const cells = new Set([rng.int(0, BW - 1) + ',' + rng.int(0, BW - 1)]);
      const n = rng.int(4, 9);
      const bias = rng.pick([1, 2, 4]);
      while (cells.size < n) {
        const cand = [];
        for (let y = 0; y < BW; y++) for (let x = 0; x < BW; x++) {
          if (cells.has(x + ',' + y)) continue;
          let c = 0;
          [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { if (cells.has(x + dx + ',' + (y + dy))) c++; });
          if (c) cand.push([x + ',' + y, c === 1 ? bias : 1]);
        }
        if (!cand.length) break;
        let tot = 0;
        cand.forEach((c) => { tot += c[1]; });
        let r = rng.next() * tot;
        let pick = cand[0][0];
        for (const [q, w] of cand) { r -= w; if (r <= 0) { pick = q; break; } }
        cells.add(pick);
      }
      const o = outline(cells);
      if (!o) continue;
      const m = o.length;
      const info = o.map((p, i) => {
        const pr = o[(i + m - 1) % m], nx = o[(i + 1) % m];
        const lin = Math.abs(p[0] - pr[0]) + Math.abs(p[1] - pr[1]);
        const lout = Math.abs(nx[0] - p[0]) + Math.abs(nx[1] - p[1]);
        const cr = (p[0] - pr[0]) * (nx[1] - p[1]) - (p[1] - pr[1]) * (nx[0] - p[0]);
        return { p, lin, lout, cr, din: [Math.sign(p[0] - pr[0]), Math.sign(p[1] - pr[1])], dout: [Math.sign(nx[0] - p[0]), Math.sign(nx[1] - p[1])] };
      });
      if (info.filter((v) => v.cr < 0).length !== X) continue;
      const cuttable = [];
      info.forEach((v, i) => { if (v.cr > 0) cuttable.push(i); });
      if (cuttable.length < k) continue;
      let cuts = null;
      for (let tr = 0; tr < 12 && !cuts; tr++) {
        const sel = rng.sample(cuttable, k);
        const ok = sel.every((i) => !sel.includes((i + 1) % m) || info[i].lout >= 2);
        if (ok) cuts = new Set(sel);
      }
      if (!cuts) continue;
      const out = [];
      info.forEach((v, i) => {
        if (cuts.has(i)) {
          out.push([2 * v.p[0] - v.din[0], 2 * v.p[1] - v.din[1]]);
          out.push([2 * v.p[0] + v.dout[0], 2 * v.p[1] + v.dout[1]]);
        } else out.push([2 * v.p[0], 2 * v.p[1]]);
      });
      let pts = out.map(([i, j]) => [a * i - b * j, b * i + a * j]);
      const mx = Math.floor(Math.min(...pts.map((p) => p[0])) / 2) * 2, my = Math.floor(Math.min(...pts.map((p) => p[1])) / 2) * 2;
      pts = pts.map((p) => [p[0] - mx, p[1] - my]);
      const c = classify(pts);
      if (c.right !== R || c.reflex !== X || c.acute) continue;
      return pts;
    }
    return null;
  }

  RM.register({
    id: 'angle-types',
    name: 'Angles',
    difficulty: 7,
    generate(rng, variant) {
      const d = variant === 2 ? -1 : 1;
      const Rs = rng.sample([3, 4, 5], 3);
      const start = Rs.map((R) => {
        const lo = R === 5 ? 1 : 0;
        return d === 1 ? rng.int(lo, 1) : rng.int(2, 3);
      });
      const XG = RM.grid3((r, c) => start[r] + d * c);
      const RG = RM.grid3((r) => Rs[r]);
      RM.need(XG.every((row) => row.every((x, c) => x >= (Rs[XG.indexOf(row)] === 5 ? 1 : 0) && x <= 3)));
      RM.needUnique(XG, XG[2][2], 'numeric');
      RM.needUnique(RG, RG[2][2], 'numeric');
      const bi = rng.int(0, 3);
      const P = RM.grid3((r, c) => gen(rng, RG[r][c], XG[r][c], rng.int(0, 3)));
      RM.need(P.every((row) => row.every((p) => p)));
      const CL = RM.grid3((r, c) => classify(P[r][c]));
      RM.needNoConflict(RM.grid3((r, c) => CL[r][c].n), CL[2][2].n, 'numeric');
      RM.needNoConflict(RM.grid3((r, c) => CL[r][c].obtuse), CL[2][2].obtuse, 'numeric');
      RM.needNoConflict(RM.grid3((r, c) => CL[r][c].right + CL[r][c].reflex), CL[2][2].right + CL[2][2].reflex, 'numeric');
      const R0 = RG[2][2], X0 = XG[2][2];
      const key = (pts) => pts.map((p) => p.join(':')).join(',');
      const ansPts = P[2][2];
      const seen = new Set(P.flat().map(key));
      RM.need(seen.size === 9);
      const cands = [];
      for (let dr = -1; dr <= 1; dr++) for (let dx = -1; dx <= 1; dx++) {
        if (!dr && !dx) continue;
        const R = R0 + dr, X = X0 + dx;
        if (X < 0 || X > 3 || R < 1 || R > 5) continue;
        const pts = gen(rng, R, X, bi);
        if (pts && !seen.has(key(pts))) {
          seen.add(key(pts));
          cands.push(pts);
        }
      }
      RM.need(cands.length >= 7);
      const chosen = rng.sample(cands, 7);
      const flawOf = (pts) => {
        const c = classify(pts);
        const f = [];
        if (c.right !== R0) f.push(`it has ${c.right} right angle${c.right === 1 ? '' : 's'} (90° corners) instead of ${R0}`);
        if (c.reflex !== X0) f.push(`it has ${c.reflex} reflex (inward) corner${c.reflex === 1 ? '' : 's'} instead of ${X0}`);
        return f;
      };
      const options = [{ spec: ansPts, flaws: [] }].concat(chosen.map((pts) => ({ spec: pts, flaws: flawOf(pts) })));
      options.forEach((o) => { if (o.spec !== ansPts) RM.need(o.flaws.length > 0); });

      const render = (pts) => {
        const pic = new RM.Pic();
        const w = Math.max(...pts.map((p) => p[0])), h = Math.max(...pts.map((p) => p[1]));
        const u = Math.min(6, 78 / Math.max(w, h, 1));
        const ox = 50 - (w * u) / 2, oy = 50 - (h * u) / 2;
        let dots = '';
        for (let i = -24; i <= 48; i += 2) {
          for (let j = -24; j <= 48; j += 2) {
            const x = ox + i * u, y = oy + j * u;
            if (x > 3 && x < 97 && y > 3 && y < 97) dots += `<circle cx="${RM.fmt(x)}" cy="${RM.fmt(y)}" r="0.8"/>`;
          }
        }
        pic.add(`<g fill="#9ca3af">${dots}</g>`);
        const q = pts.map((p) => [ox + p[0] * u, oy + p[1] * u]);
        RM.polygon(pic, q, { fill: 'light', sw: 2.2 });
        q.forEach((p) => RM.circle(pic, p[0], p[1], 1.3, { fill: 'black', sw: 0.4 }));
        return pic.svg();
      };

      const rows = (f) => [0, 1].map((r) => f[r].join(', '));
      const rules = [
        { k: 'Corners', t: 'at every corner look at the <b>inside</b> angle of the polygon. A <b>right angle</b> is an inside angle of exactly 90° (on the dotted lattice, directions like 2 across/1 up and 1 across/2 up are exactly perpendicular); a <b>reflex corner</b> points inward (inside angle above 180°). A reflex corner is not a right angle.' },
        { k: 'Right angles', t: `the number of right angles is the <b>same along a whole row</b>: row 1 has ${RG[0][0]} each, row 2 has ${RG[1][0]} each, so row 3 has <b>${R0}</b>.` },
        { k: 'Reflex corners', t: `the number of reflex corners goes <b>${d === 1 ? 'up' : 'down'} by 1</b> per column: row 1: ${rows(XG)[0]}, ${XG[0][2]}; row 2: ${rows(XG)[1]}, ${XG[1][2]}. Row 3 starts ${XG[2][0]}, ${XG[2][1]} so the last polygon has <b>${X0}</b>.` },
        { k: 'Decoys', t: 'the number of sides and the number of obtuse (chamfered, 135°) corners follow no rule you can rely on; only right angles and reflex corners count.' },
        { k: 'Answer', t: `a polygon with <b>${R0} right angles</b> and <b>${X0} reflex corner${X0 === 1 ? '' : 's'}</b> (it has ${CL[2][2].n} sides).` },
      ];
      return {
        difficulty: 7,
        hint: 'count two kinds of corners separately; one count stays fixed along a row, the other changes.',
        panels: P.flat().slice(0, 8),
        answer: ansPts,
        options,
        render,
        key,
        rules,
      };
    },
  });
})();
