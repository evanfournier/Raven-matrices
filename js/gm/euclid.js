/* Squaring off (grandmaster): a rectangle on a unit grid. Each column is one Euclid step: along the longer side cut off,
 * from the top / left end, ALL squares (side = shorter side) that fit; only the leftover rectangle is drawn (grid, at the
 * far end), with a dashed ghost outline of the ORIGINAL rectangle. Column 2 = after one step, column 3 = after two. */
(function () {
  'use strict';
  const RM = window.RM;
  const U = 6.2;

  const kOf = (r, mode) => {
    const w = r[2], h = r[3];
    if (w === h) return 0;
    return mode === 'one' ? 1 : w > h ? Math.floor(w / h) : Math.floor(h / w);
  };
  function cut(r, k, hE, vE) {
    const [x, y, w, h] = r;
    if (k < 1 || w === h) return null;
    if (w > h) {
      const nw = w - k * h;
      return nw > 0 ? [hE === 'near' ? x + k * h : x, y, nw, h] : null;
    }
    const nh = h - k * w;
    return nh > 0 ? [x, vE === 'near' ? y + k * w : y, w, nh] : null;
  }
  const step = (r, mode, hE, vE) => cut(r, kOf(r, mode), hE, vE);
  const HY = [];
  for (const m of ['all', 'one']) for (const h of ['near', 'far']) for (const v of ['near', 'far']) HY.push([m, h, v]);

  function genRow(rng, land) {
    for (let t = 0; t < 200; t++) {
      const S = rng.int(3, 9), L = rng.int(S + 2, 13);
      const r1 = L % S;
      if (r1 < 1) continue;
      if (S % r1 < 1) continue;
      return land ? { W: L, H: S } : { W: S, H: L };
    }
    return null;
  }
  const keyOf = (s) => [s.W, s.H].concat(s.g, s.r).join(',');
  const dist = (a, b) => a.g.reduce((s, x, i) => s + Math.abs(x - b.g[i]), 0) + a.r.reduce((s, x, i) => s + Math.abs(x - b.r[i]), 0);

  function pick7(rng, ans, cands) {
    const seen = new Set([ans.key]), pool = [];
    for (const c of cands) if (!seen.has(c.key)) { seen.add(c.key); pool.push(c); }
    RM.need(pool.length >= 7);
    for (let t = 0; t < 40; t++) {
      const by = {};
      rng.shuffle(pool).forEach((c) => (by[c.tag] = by[c.tag] || []).push(c));
      const tags = rng.shuffle(Object.keys(by)), out = [];
      for (let i = 0; out.length < 7 && i < 12; i++) for (const tg of tags) if (by[tg][i] && out.length < 7) out.push(by[tg][i]);
      if (out.length < 7) continue;
      const all = [ans].concat(out), sums = all.map((a) => all.reduce((s, b) => s + dist(a.spec, b.spec), 0));
      const o = sums.slice(1);
      if (sums[0] > Math.min(...o) && sums[0] < Math.max(...o)) return out;
    }
    RM.need(false);
  }

  function say(R, Nn) {
    const w = R[2], h = R[3];
    if (w > h) {
      const k = Math.floor(w / h);
      return `the longer side is the width, ${w}; squares of side ${h} fit ${k} time${k > 1 ? 's' : ''} (${w} = ${k} × ${h} + ${Nn[2]}), so cut ${k} square${k > 1 ? 's' : ''} off the <b>left</b> end. What is left is ${Nn[2]} wide and ${h} tall, at the right end`;
    }
    const k = Math.floor(h / w);
    return `the longer side is the height, ${h}; squares of side ${w} fit ${k} time${k > 1 ? 's' : ''} (${h} = ${k} × ${w} + ${Nn[3]}), so cut ${k} square${k > 1 ? 's' : ''} off the <b>top</b>. What is left is ${w} wide and ${Nn[3]} tall, at the bottom end`;
  }

  RM.register({
    id: 'euclid',
    name: 'Squaring off',
    difficulty: 7,
    generate(rng, variant) {
      const o0 = rng.chance(0.5), lands = [o0, !o0, rng.chance(0.5)];
      const rows = [];
      for (let r = 0; r < 3; r++) {
        const d = genRow(rng, lands[r]);
        RM.need(d);
        const R0 = [0, 0, d.W, d.H], R1 = step(R0, 'all', 'near', 'near'), R2 = step(R1, 'all', 'near', 'near');
        rows.push({ W: d.W, H: d.H, R0, R1, R2 });
      }
      const [a, b, c] = rows;
      const ok = HY.filter((hy) => {
        const f = (R) => (R ? step(R, hy[0], hy[1], hy[2]) : null);
        return [a, b].every((r) => {
          const p1 = f(r.R0), p2 = f(p1);
          return p1 && p2 && RM.sameArr(p1, r.R1) && RM.sameArr(p2, r.R2);
        }) && (() => { const p1 = f(c.R0); return p1 && RM.sameArr(p1, c.R1); })();
      });
      RM.need(ok.length > 0);
      RM.need(ok.every((hy) => { const p2 = step(step(c.R0, hy[0], hy[1], hy[2]), hy[0], hy[1], hy[2]); return p2 && RM.sameArr(p2, c.R2); }));
      RM.need(ok.length === 1);

      const { W, H, R0, R1, R2 } = c;
      const sp = (g, r) => ({ W, H, g, r });
      const inside = (r, o) => r[0] >= o[0] && r[1] >= o[1] && r[0] + r[2] <= o[0] + o[2] && r[1] + r[3] <= o[1] + o[3];
      const k2 = kOf(R1, 'all'), side1 = R1[2] > R1[3] ? 'width' : 'height';
      const cands = [];
      const mk = (g, r, tag, flaw) => {
        if (!r || r.some((v) => v < 0) || r[2] < 1 || r[3] < 1 || !inside(r, R0)) return;
        const spec = sp(g, r);
        cands.push({ spec, key: keyOf(spec), tag, flaws: [flaw] });
      };
      const land1 = R1[2] > R1[3];
      mk(R0, step(R1, 'one', 'near', 'near'), 'one', `Only one square was cut off; Euclid's step cuts off ALL the squares of side ${land1 ? R1[3] : R1[2]} that fit (${k2} of them).`);
      mk(R0, step(R1, 'all', 'far', 'far'), 'far', `The squares are cut off from the ${land1 ? 'left' : 'top'} end, so the leftover must lie at the ${land1 ? 'right' : 'bottom'} end of the previous rectangle, not at the ${land1 ? 'left' : 'top'} end.`);
      mk(R0, R1, 'same', 'Nothing has been cut off: this is just the previous rectangle again, but the step must be applied once more.');
      mk(R0, step(R2, 'all', 'near', 'near'), 'next', 'One step too many: this is what remains after a third cut, not after the second.');
      mk(R0, [R2[0], R2[1], R2[3], R2[2]], 'turn', `The leftover is turned through a right angle: it must be ${R2[2]} wide and ${R2[3]} tall.`);
      if (k2 >= 2) mk(R0, cut(R1, k2 - 1, 'near', 'near'), 'few', `Only ${k2 - 1} square${k2 > 2 ? 's' : ''} cut off instead of ${k2}: a further square of side ${land1 ? R1[3] : R1[2]} still fits and must be removed.`);
      mk(R0, land1 ? [R1[0], R1[1], k2 * R1[3], R1[3]] : [R1[0], R1[1], R1[2], k2 * R1[2]], 'cutoff', 'This is the part that was cut away (the squares), not the leftover that remains.');
      [[0, 0], [W - R2[2], 0], [0, H - R2[3]], [W - R2[2], H - R2[3]]].forEach((p) => {
        const r = [p[0], p[1], R2[2], R2[3]];
        if (!inside(r, R1)) mk(R0, r, 'out', 'The leftover must lie inside the previous rectangle (it is a piece of it); this one sticks out of it.');
      });
      const ans = { spec: sp(R0, R2) };
      ans.key = keyOf(ans.spec);
      const out = pick7(rng, ans, cands);

      const s1 = say(R0, R1), s2 = say(R1, R2);
      return {
        panels: [a, b].reduce((p, r) => p.concat([sp(r.R0, r.R0), sp(r.R0, r.R1), sp(r.R0, r.R2)].map((s) => Object.assign(s, { W: r.W, H: r.H }))), []).concat([Object.assign(sp(R0, R0)), sp(R0, R1)]),
        answer: ans.spec,
        options: [{ spec: ans.spec, flaws: [] }].concat(out.map((x) => ({ spec: x.spec, flaws: x.flaws }))),
        render(s) {
          const pic = new RM.Pic();
          const ox = 50 - (s.W * U) / 2, oy = 50 - (s.H * U) / 2;
          const X = (v) => ox + v * U, Y = (v) => oy + v * U;
          const grid = (r, col, sw) => {
            for (let i = 1; i < r[2]; i++) RM.line(pic, X(r[0] + i), Y(r[1]), X(r[0] + i), Y(r[1] + r[3]), { sw, color: col, cap: 'butt' });
            for (let j = 1; j < r[3]; j++) RM.line(pic, X(r[0]), Y(r[1] + j), X(r[0] + r[2]), Y(r[1] + j), { sw, color: col, cap: 'butt' });
          };
          const g = s.g, r = s.r;
          grid(g, '#e3e3e3', 0.6);
          pic.add(`<rect x="${X(g[0])}" y="${Y(g[1])}" width="${g[2] * U}" height="${g[3] * U}" fill="none" stroke="#8a8a8a" stroke-width="1.5" stroke-dasharray="3.2 2.6"/>`);
          pic.add(`<rect x="${X(r[0])}" y="${Y(r[1])}" width="${r[2] * U}" height="${r[3] * U}" fill="#d2d2d2"/>`);
          grid(r, '#8f8f8f', 0.7);
          pic.add(`<rect x="${X(r[0])}" y="${Y(r[1])}" width="${r[2] * U}" height="${r[3] * U}" fill="none" stroke="${RM.INK}" stroke-width="2.2" stroke-linejoin="round"/>`);
          return pic.svg();
        },
        key: keyOf,
        rules: [
          { k: 'Rectangle', t: 'Each panel shows a rectangle on a unit grid (shaded) inside a dashed outline. The dashed outline is always the <b>original</b> rectangle of that row (first panel).' },
          { k: 'Euclid step', t: 'Each column is one step of Euclid\'s algorithm: take the <b>longer side</b>, and cut off from its top / left end <b>all</b> the squares (side = the shorter side) that fit. Only the leftover rectangle is kept, where it was left (at the far end).' },
          { k: 'Columns', t: 'The second panel is the original after one step, the third panel after two steps (the second step uses the leftover as its new rectangle).' },
          { k: 'Last row', t: `Original ${R0[2]} wide × ${R0[3]} tall. Step 1: ${s1}. Step 2: ${s2}.` },
          { k: 'Answer', t: `<b>Leftover ${R2[2]} wide × ${R2[3]} tall, placed ${R2[0] + R2[2] === W ? 'against the right edge' : 'against the left edge'} and ${R2[1] + R2[3] === H ? 'the bottom edge' : 'the top edge'} of the dashed outline.</b>` },
        ],
        hint: 'Find which side is longer, and how many squares fit along it.',
      };
    },
  });
})();
