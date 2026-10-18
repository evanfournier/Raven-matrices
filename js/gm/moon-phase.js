/* Moon phases (grandmaster): the Moon orbits the Earth, the Sun direction changes; the inset phase is DERIVED from
   the geometry (angle Sun-Earth-Moon). Per column the Moon advances m positions and the Sun moves s positions. */
(function () {
  'use strict';
  const RM = window.RM;
  const F = RM.fmt;
  const EX = 48, EY = 52, OR = 25, SR = 36, IX = 86, IY = 14, IR = 7.5;
  const md = (a) => ((a % 8) + 8) % 8;
  const DIRN = ['east', 'north-east', 'north', 'north-west', 'west', 'south-west', 'south', 'south-east'];
  const PH = ['new moon (all dark)', 'thin crescent lit on the right', 'right half lit', 'gibbous lit on the right (more than half)', 'full moon (all lit)',
    'gibbous lit on the left (more than half)', 'left half lit', 'thin crescent lit on the left'];
  const ux = (k) => Math.cos(k * Math.PI / 4), uy = (k) => -Math.sin(k * Math.PI / 4);

  function inset(pic, cx, cy, r, ph) {
    const fill = ph === 0 ? RM.INK : RM.WHITE;
    RM.circle(pic, cx, cy, r, { fill, sw: 0 });
    if (ph !== 0 && ph !== 4) {
      const right = ph < 4, d = right ? ph : 8 - ph; // 1..3
      const rx = r * Math.abs(Math.cos(d * Math.PI / 4)), crescent = d === 1;
      // dark base, then lit region
      pic.add('<circle cx="' + F(cx) + '" cy="' + F(cy) + '" r="' + F(r) + '" fill="' + RM.INK + '"/>');
      const top = (cx) + ' ' + F(cy - r), bot = F(cx) + ' ' + F(cy + r);
      let back;
      if (d === 2) back = 'L ' + F(cx) + ' ' + F(cy - r);
      else {
        const sweep = right ? (crescent ? 0 : 1) : (crescent ? 1 : 0);
        back = 'A ' + F(rx) + ' ' + F(r) + ' 0 0 ' + sweep + ' ' + F(cx) + ' ' + F(cy - r);
      }
      pic.add('<path d="M ' + F(cx) + ' ' + F(cy - r) + ' A ' + F(r) + ' ' + F(r) + ' 0 0 ' + (right ? 1 : 0) + ' ' + bot + ' ' + back + ' Z" fill="' + RM.WHITE + '"/>');
    }
    RM.circle(pic, cx, cy, r, { fill: 'none', sw: 1.6 });
  }

  function render(s) {
    const pic = new RM.Pic();
    RM.circle(pic, EX, EY, OR, { fill: 'none', sw: 1.3, dash: '2 2.5', stroke: RM.GRAY });
    // Earth
    RM.circle(pic, EX, EY, 6, { fill: RM.WHITE, sw: 1.8 });
    RM.line(pic, EX - 3.6, EY, EX + 3.6, EY, { sw: 1.4 });
    RM.line(pic, EX, EY - 3.6, EX, EY + 3.6, { sw: 1.4 });
    // Sun + parallel rays
    const sx = ux(s.s), sy = uy(s.s);
    const cxS = EX + sx * SR, cyS = EY + sy * SR;
    RM.circle(pic, cxS, cyS, 3, { fill: RM.INK, sw: 0 });
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      RM.line(pic, cxS + Math.cos(a) * 3.9, cyS + Math.sin(a) * 3.9, cxS + Math.cos(a) * 5.2, cyS + Math.sin(a) * 5.2, { sw: 1.5 });
    }
    [-12, 12].forEach((o) => {
      const px = -sy, py = sx;
      const x1 = EX + sx * 41 + px * o, y1 = EY + sy * 41 + py * o, x2 = EX + sx * 33 + px * o, y2 = EY + sy * 33 + py * o;
      RM.line(pic, x1, y1, x2, y2, { sw: 1.5, color: RM.GRAY });
      const bx = x2 + sx * 3.2, by = y2 + sy * 3.2;
      RM.line(pic, x2, y2, bx + px * 2.2, by + py * 2.2, { sw: 1.5, color: RM.GRAY });
      RM.line(pic, x2, y2, bx - px * 2.2, by - py * 2.2, { sw: 1.5, color: RM.GRAY });
    });
    // Moon: lit half faces the Sun (or away when lf)
    const mx = EX + ux(s.m) * OR, my = EY + uy(s.m) * OR, r = 5;
    let dx = sx, dy = sy;
    if (s.lf) { dx = -dx; dy = -dy; }
    RM.circle(pic, mx, my, r, { fill: RM.WHITE, sw: 0 });
    const pxx = -dy, pyy = dx;
    pic.add('<path d="M ' + F(mx + pxx * r) + ' ' + F(my + pyy * r) + ' A ' + r + ' ' + r + ' 0 0 1 ' + F(mx - pxx * r) + ' ' + F(my - pyy * r) + ' Z" fill="' + RM.INK + '"/>');
    RM.circle(pic, mx, my, r, { fill: 'none', sw: 1.6 });
    // inset
    RM.circle(pic, IX, IY, IR + 2, { fill: RM.WHITE, sw: 1.2, stroke: RM.GRAY });
    inset(pic, IX, IY, IR, s.ph);
    return pic.svg();
  }

  const key = (s) => [s.m, s.s, s.ph, s.lf].join(',');
  const mirror = (p) => md(8 - p);

  function build(rng, variant) {
    const four = variant === 1;
    const dm = rng.int(1, 3);
    const dsU = four ? rng.pick([-1, 0, 1]) : rng.pick([-1, 0, 1, 2]);
    const unit = four ? 2 : 1, ds = dsU * unit;
    RM.need(md(dm - ds) !== 0);
    const m0 = rng.sample([0, 1, 2, 3, 4, 5, 6, 7], 3);
    const s0 = four ? rng.sample([0, 2, 4, 6], 3) : rng.sample([0, 1, 2, 3, 4, 5, 6, 7], 3);
    const cell = (r, c) => { const m = md(m0[r] + c * dm), s = md(s0[r] + c * ds); return { m, s, ph: md(m - s), lf: 0 }; };
    const G = [[], [], []];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) G[r][c] = cell(r, c);
    const ans = G[2][2];
    const vis = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (r < 2 || c < 2) vis.push(G[r][c]);
    RM.need(new Set(vis.map((v) => v.ph)).size >= 4);
    // phase-rule hypotheses: all but physics must be refuted by visible panels
    const hyp = [(v) => mirror(md(v.m - v.s)), (v) => md(v.m), (v) => md(v.s), (v) => md(v.m + v.s), (v) => md(v.s - v.m)];
    hyp.forEach((h) => RM.need(vis.some((v) => h(v) !== v.ph)));
    // decoy-attribute shortcuts must not conflict
    const gr = (f) => [0, 1, 2].map((r) => [0, 1, 2].map((c) => (r === 2 && c === 2 ? undefined : f(G[r][c]))));
    RM.needNoConflict(gr((v) => v.m), ans.m, 'numeric', 8);
    RM.needNoConflict(gr((v) => v.s), ans.s, 'numeric', 8);
    RM.needNoConflict(gr((v) => v.ph), ans.ph, 'numeric', 8);

    const prev = G[2][1];
    const cand = [];
    const add = (m, s, ph, lf, why) => cand.push({ spec: { m: md(m), s: md(s), ph: md(ph), lf }, flaws: [why] });
    add(ans.m, ans.s, mirror(ans.ph), 0, 'the positions are right but the inset is mirrored (waxing instead of waning, or the reverse): the Sun is ' + (ans.ph < 4 ? 'clockwise' : 'counter-clockwise') + ' from the Moon, so the lit side is on the other side');
    add(ans.m, ans.s, prev.ph, 0, 'the inset repeats the phase of the previous column instead of the phase that follows from the new positions');
    add(ans.m, ans.s, ans.ph + 4, 0, 'the inset shows the opposite phase (new and full, or crescent and gibbous, swapped): the Moon-Sun angle is misread');
    add(ans.m, ans.s, ans.ph + 1, 0, 'the inset is one phase step off from what the Sun-Earth-Moon angle gives');
    add(ans.m, ans.s, ans.ph - 1, 0, 'the inset is one phase step off from what the Sun-Earth-Moon angle gives');
    add(ans.m, ans.s, ans.m, 0, 'the inset follows the Moon position only and ignores the Sun direction');
    add(ans.m, ans.s, ans.ph, 1, 'the Moon\'s lit half faces away from the Sun, which is physically impossible');
    for (const dd of [1, -1, 2, -2]) {
      add(ans.m + dd, ans.s, md(ans.m + dd - ans.s), 0, 'the Moon advanced ' + (dm + dd) + ' positions instead of ' + dm + ' (phase correctly derived from that wrong position)');
      add(ans.m + dd, ans.s, ans.ph, 0, 'the Moon is on the wrong position (it should have advanced ' + dm + ' positions); the inset does not match it either');
    }
    if (ds !== 0) add(ans.m, prev.s, md(ans.m - prev.s), 0, 'the Sun did not move, but it should have moved ' + ds + ' positions per column');
    for (const dd of [unit, -unit]) {
      add(ans.m, ans.s + dd, md(ans.m - ans.s - dd), 0, 'the Sun moved ' + (ds + dd) + ' positions instead of ' + ds + ' (phase derived from that wrong direction)');
      add(ans.m + 1, ans.s + dd, md(ans.m + 1 - ans.s - dd), 0, 'Moon and Sun are both off their correct positions');
    }
    const seen = new Set([key(ans)]);
    const pool = [];
    rng.shuffle(cand).forEach((c) => { const k = key(c.spec); if (!seen.has(k)) { seen.add(k); pool.push(c); } });
    RM.need(pool.length >= 7);
    const wrong = pool.slice(0, 7);
    const options = wrong.concat([{ spec: ans, flaws: [] }]);

    const nm = (c) => (c === 1 ? 'one position' : c + ' positions');
    const sunTxt = ds === 0 ? 'The Sun stays in the same direction in every row (it does not move).' : 'The Sun turns by <b>' + Math.abs(ds) + '</b> position' + (Math.abs(ds) > 1 ? 's' : '') + ' (' + Math.abs(ds) * 45 + '&deg;) per column, ' + (ds > 0 ? 'counter-clockwise' : 'clockwise') + '.';
    const a = ans;
    const d = md(a.m - a.s);
    const rules = [
      { k: 'Positions', t: 'The 8 positions are 45&deg; apart (east, north-east, north, ...). In every row, from one panel to the next, the Moon moves <b>' + nm(dm) + ' counter-clockwise</b> around the Earth. ' + sunTxt + ' Rows only differ by their starting positions.' },
      { k: 'The Moon\'s lit half', t: 'The Sun always lights the half of the Moon that faces it (white), the other half is night (black).' },
      { k: 'Phase from Earth', t: 'The small framed disc shows the Moon as seen from the Earth. Take the angle between the Sun and the Moon as seen from the Earth: 0&deg; = new moon (all dark), 45&deg; = thin crescent, 90&deg; = half lit, 135&deg; = gibbous, 180&deg; = full moon. If the Sun is <b>clockwise</b> from the Moon (seen on the picture), the lit side is on the <b>right</b>, otherwise on the <b>left</b>.' },
      { k: 'Missing panel', t: 'Row 3 starts with the Moon ' + DIRN[G[2][0].m] + ' and the Sun ' + DIRN[G[2][0].s] + '. After two columns the Moon is <b>' + DIRN[a.m] + '</b> and the Sun <b>' + DIRN[a.s] + '</b>. The Moon is ' + d * 45 + '&deg; ' + (d === 0 ? '' : (d < 4 ? 'counter-clockwise ' : 'clockwise ')) + 'from the Sun' + (d === 0 || d === 4 ? '' : ', so the Sun is ' + (d < 4 ? 'clockwise' : 'counter-clockwise') + ' from the Moon') + ': the inset shows <b>' + PH[d] + '</b>.' },
    ];
    return {
      panels: [].concat(...G.map((row, r) => row.map((v) => v))).slice(0, 8),
      answer: ans,
      options,
      render,
      key,
      rules,
      hint: 'The Sun lights half of the Moon — which half do we see from the Earth?',
    };
  }

  RM.register({
    id: 'moon-phase',
    name: 'Moon phases',
    difficulty: 7,
    generate(rng, variant) { return build(rng, variant); },
  });
})();
