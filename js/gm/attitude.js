/* Flight instruments (grandmaster): the attitude (bank, pitch) of an aircraft changes by a constant step per column
   and is shown alternately on an attitude indicator (the horizon tilts opposite to the bank, drops when the nose
   rises) and in an outside view from behind the aircraft. The solver must translate between the two views. */
(function () {
  'use strict';
  const RM = window.RM;
  const KI = 1.4; // instrument: px per degree of pitch
  const KO = 1.2; // outside: px per degree of pitch
  const rad = Math.PI / 180;
  const bd = (b) => (b === 0 ? 'level (0°)' : Math.abs(b) + '° ' + (b > 0 ? 'right' : 'left'));
  const pd = (p) => (p === 0 ? 'level (0°)' : Math.abs(p) + '° nose ' + (p > 0 ? 'up' : 'down'));
  const att = (b, p) => 'bank ' + bd(b) + ', pitch ' + pd(p);
  const vname = (v) => (v === 'I' ? 'instrument' : 'outside view');
  const pt = (R, th) => [50 + R * Math.sin(th * rad), 50 - R * Math.cos(th * rad)];

  function instrument(s) {
    const pic = new RM.Pic();
    const cid = pic.def('clip', (id) => `<clipPath id="${id}"><circle cx="50" cy="50" r="36"/></clipPath>`);
    const hy = 50 + KI * s.p;
    let g = `<g clip-path="url(#${cid})"><g transform="rotate(${-s.b} 50 50)">`;
    g += `<rect x="-80" y="${RM.fmt(hy)}" width="260" height="260" fill="${RM.GRAY}"/>`;
    g += `<line x1="-80" y1="${RM.fmt(hy)}" x2="180" y2="${RM.fmt(hy)}" stroke="${RM.INK}" stroke-width="2.2"/>`;
    for (const j of [-15, -10, -5, 5, 10, 15]) {
      const y = hy - KI * j;
      const w = Math.abs(j) === 10 ? 13 : 7;
      g += `<line x1="${50 - w}" y1="${RM.fmt(y)}" x2="${50 + w}" y2="${RM.fmt(y)}" stroke="${RM.INK}" stroke-width="1.5"/>`;
    }
    g += '</g></g>';
    pic.add(g);
    RM.circle(pic, 50, 50, 36, { sw: 2.2 });
    for (const th of [-60, -30, 30, 60]) {
      const a = pt(37.5, th), b = pt(43, th);
      RM.line(pic, a[0], a[1], b[0], b[1], { sw: 1.8, cap: 'butt' });
    }
    RM.polygon(pic, [[50, 38.5], [46.5, 44.5], [53.5, 44.5]], { fill: 'black', sw: 1 });
    // rotating sky pointer
    pic.add(`<g transform="rotate(${-s.b} 50 50)"><polygon points="50,14.5 45.5,23 54.5,23" fill="${RM.WHITE}" stroke="${RM.INK}" stroke-width="1.6" stroke-linejoin="round"/></g>`);
    // fixed aircraft symbol
    RM.line(pic, 22, 52, 39, 52, { sw: 3.4, cap: 'butt' });
    RM.line(pic, 61, 52, 78, 52, { sw: 3.4, cap: 'butt' });
    RM.line(pic, 39, 52, 39, 58, { sw: 3.4, cap: 'butt' });
    RM.line(pic, 61, 52, 61, 58, { sw: 3.4, cap: 'butt' });
    RM.circle(pic, 50, 52, 3, { fill: 'black', sw: 0.8 });
    return pic.svg();
  }

  function outside(s) {
    const pic = new RM.Pic();
    RM.polygon(pic, [[3, 88], [97, 88], [97, 96], [3, 96]], { fill: 'gray', sw: 1.6 });
    RM.line(pic, 6, 46, 94, 46, { sw: 1.5, color: RM.GRAY, dash: 'dashed', cap: 'butt' });
    const cy = 46 - KO * s.p;
    pic.add(
      `<g transform="translate(50 ${RM.fmt(cy)}) rotate(${s.b})">` +
        `<polygon points="-22,0 -5,-3 5,-3 22,0 5,3 -5,3" fill="${RM.DARK}" stroke="${RM.INK}" stroke-width="1.6" stroke-linejoin="round"/>` +
        `<polygon points="-3,-3 3,-3 1.8,-15 -1.8,-15" fill="${RM.INK}" stroke="${RM.INK}" stroke-width="1.2" stroke-linejoin="round"/>` +
        `<circle r="5" fill="${RM.INK}"/></g>`
    );
    if (s.p !== 0) {
      const y2 = 46 - KO * s.p, up = s.p > 0, h = up ? 4 : -4;
      RM.line(pic, 90, 46, 90, y2 + h * 0.6, { sw: 1.8, cap: 'butt' });
      RM.polygon(pic, [[90, y2], [86, y2 + h], [94, y2 + h]], { fill: 'black', sw: 1 });
    }
    return pic.svg();
  }

  RM.register({
    id: 'attitude',
    name: 'Flight instruments',
    difficulty: 7,
    generate(rng, variant) {
      const views = [['I', 'O', 'I'], ['I', 'O', 'I'], ['I', 'I', 'O'], ['O', 'I', 'O']][variant];
      const db = rng.pick(variant === 3 ? [-30, -15, 15, 30] : [-30, -15, 15, 30]);
      const dp = variant === 1 ? 0 : variant === 2 ? rng.pick([0, -10, -5, 5, 10]) : rng.pick([-10, -5, 5, 10]);
      const bs = RM.range(9).map((i) => -60 + 15 * i).filter((b) => Math.abs(b + 2 * db) <= 60);
      const ps = [-15, -10, -5, 0, 5, 10, 15].filter((p) => Math.abs(p + 2 * dp) <= 15);
      const b0s = rng.sample(bs, 3);
      const rows = b0s.map((b0) => {
        const p0 = rng.pick(ps);
        return RM.range(3).map((c) => ({ b: b0 + c * db, p: p0 + c * dp }));
      });
      RM.need(new Set(rows.map((r) => r[0].p)).size >= 2 || dp !== 0);
      RM.need(rows.some((r) => r[0].p !== 0 || r[1].p !== 0));
      // hypotheses: how the instrument is read (bank sign, pitch sign)
      const consistent = [];
      for (const sb of [1, -1]) for (const sp of [1, -1]) {
        let ok = true;
        for (let r = 0; r < 2; r++) {
          const a = rows[r].map((x, c) => (views[c] === 'I' ? { b: sb * x.b, p: sp * x.p } : x));
          if (a[2].b - a[1].b !== a[1].b - a[0].b || a[2].p - a[1].p !== a[1].p - a[0].p) ok = false;
        }
        if (ok) consistent.push(sb + ',' + sp);
      }
      RM.need(consistent.length === 1 && consistent[0] === '1,1');

      const mk = (b, p) => ({ t: views[2], b, p });
      const sp = (c, r) => ({ t: views[c], b: rows[r][c].b, p: rows[r][c].p });
      const panels = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (r * 3 + c < 8) panels.push(sp(c, r));
      const A = rows[2][2], a1 = rows[2][1], a0 = rows[2][0];
      const answer = mk(A.b, A.p);
      const ok = (b, p) => Math.abs(b) <= 75 && Math.abs(p) <= 20;
      const key = (s) => s.t + ':' + s.b + ':' + s.p;
      const seen = new Set([key(answer)]);
      const diffs = (b, p) => {
        const d = [];
        if (b !== A.b) d.push('bank ' + bd(b) + ' instead of ' + bd(A.b));
        if (p !== A.p) d.push('pitch ' + pd(p) + ' instead of ' + pd(A.p));
        return ' (' + d.join('; ') + ')';
      };
      const t1 = [
        [-A.b, A.p, 'classic mirror error: the bank is read the wrong way round'],
        [A.b, -A.p, 'pitch sign inverted (nose up and nose down swapped)'],
        [-A.b, -A.p, 'both bank and pitch read the wrong way round'],
        [a1.b, a1.p, 'the step was applied only once (this is the middle panel again)'],
        [a0.b + 3 * db, a0.p + 3 * dp, 'the step was applied three times'],
        [a0.b, a0.p, 'the step was applied in the wrong direction (back to the first panel)'],
        [A.b, a1.p, 'bank correct but the pitch did not change'],
        [a1.b, A.p, 'pitch correct but the bank did not change'],
      ];
      const t2 = [];
      for (const d of [-30, -15, 15, 30]) t2.push([A.b + d, A.p, 'pitch correct but the bank is wrong']);
      for (const d of [-10, -5, 5, 10]) t2.push([A.b, A.p + d, 'bank correct but the pitch is wrong']);
      const wrong = [];
      for (const lst of [t1, rng.shuffle(t2)]) {
        for (const [b, p, why] of lst) {
          const s = mk(b, p);
          if (!ok(b, p) || seen.has(key(s))) continue;
          seen.add(key(s));
          wrong.push({ spec: s, flaws: [why.charAt(0).toUpperCase() + why.slice(1) + diffs(b, p) + '.'] });
        }
      }
      RM.need(wrong.length >= 7);
      const options = [{ spec: answer, flaws: [] }].concat(wrong.slice(0, 7));

      const R = (r) => rows[r].map((x, c) => att(x.b, x.p));
      const dtxt = 'bank ' + (db > 0 ? '+' : '') + db + '°, pitch ' + (dp > 0 ? '+' : '') + dp + '°';
      const rules = [
        {
          k: 'Reading the instrument',
          t: 'On the instrument the white half is sky and the gray half is ground. You see the <i>world</i> from the cockpit, so it moves opposite to the aircraft: if the aircraft banks right, the horizon turns counter-clockwise (its left end drops); banked left, it turns clockwise. When the nose rises, the horizon sinks below the fixed aircraft symbol; nose down, it climbs. The small pointer turns with the sky and points at the bank scale (ticks at 0, 30, 60).',
        },
        {
          k: 'Reading the outside view',
          t: 'Seen from behind, the fin points to the top of the aircraft: tilted clockwise = bank right, counter-clockwise = bank left. Above the dashed reference line (arrow up) = nose up, below it (arrow down) = nose down; the ground stays level.',
        },
        {
          k: 'The rule',
          t: 'From one column to the next, the attitude changes by the same step in every row: <b>' + dtxt + '</b>. The first picture of each row is on the ' + vname(views[0]) + ', the second on the ' + vname(views[1]) + ', the third on the ' + vname(views[2]) + '.',
        },
        {
          k: 'Check on rows 1 and 2',
          t: 'Row 1: ' + R(0).join(' &rarr; ') + '. Row 2: ' + R(1).join(' &rarr; ') + '. Each time the step is the same.',
        },
        {
          k: 'The missing panel',
          t: 'Row 3 starts at ' + att(a0.b, a0.p) + ' and reaches ' + att(a1.b, a1.p) + ' in the middle. Applying the step once more gives <b>' + att(A.b, A.p) + '</b>, shown on the ' + vname(views[2]) + '.',
        },
      ];
      return {
        panels,
        answer,
        options,
        render: (s) => (s.t === 'I' ? instrument(s) : outside(s)),
        key,
        rules,
        hint: 'In the cockpit, it is the world that seems to tilt.',
        difficulty: variant === 1 ? 6 : 7,
      };
    },
  });
})();
