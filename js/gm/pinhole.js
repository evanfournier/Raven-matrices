/* Camera obscura (grandmaster): side view of a pinhole camera. An arrow glyph (bar at the foot, head at the tip)
   stands left of a wall with a pinhole at distance do; the screen is at distance di right of the wall. The image is
   inverted and scaled by di/do (height and offset from the axis). Distances/height change by a column pattern. */
(function () {
  'use strict';
  const RM = window.RM;
  const rd = (v) => Math.round(v * 2) / 2;
  const ok2 = (v) => Math.abs(v * 2 - Math.round(v * 2)) < 1e-9;
  const X = (x, m) => (m ? 100 - x : x);
  const Y = (v) => 50 - v * 5;

  function mk(o, m) {
    const r = o.di / o.dd;
    return { dd: o.dd, di: o.di, H: o.H, y0: o.y0, fy: rd(-o.y0 * r), ty: rd(-(o.y0 + o.H) * r), m: m };
  }
  function valid(o) {
    if (o.dd < 1 || o.dd > 4 || o.di < 1 || o.di > 4 || o.H < 2 || o.H > 8) return false;
    if (o.y0 < -3 || o.y0 > 3 || o.y0 + o.H > 8) return false;
    const r = o.di / o.dd, a = -o.y0 * r, b = -(o.y0 + o.H) * r;
    if (!ok2(a) || !ok2(b) || Math.abs(a) > 8 || Math.abs(b) > 8) return false;
    return Math.abs(b - a) >= 2;
  }
  const keyOf = (s) => [s.m ? 1 : 0, s.dd, s.di, s.H, s.y0, s.fy, s.ty].join('|');

  function glyph(pic, x, fy, ty) {
    const y1 = Y(fy), y2 = Y(ty), len = Math.abs(y2 - y1), d = y2 > y1 ? 1 : -1, hl = Math.min(6.5, len * 0.6);
    const yb = y2 - d * hl;
    RM.line(pic, x, y1, x, yb, { sw: 2.6, color: RM.INK });
    RM.polygon(pic, [[x, y2], [x - 3.6, yb], [x + 3.6, yb]], { fill: RM.INK, sw: 1, stroke: RM.INK });
    RM.line(pic, x - 4.2, y1, x + 4.2, y1, { sw: 2.6, color: RM.INK });
  }
  function render(s) {
    const pic = new RM.Pic(), m = s.m;
    RM.line(pic, 5, 50, 95, 50, { sw: 1.2, color: RM.GRAY });
    for (let k = -4; k <= 4; k++) if (k) RM.line(pic, X(50 + k * 10, m), 46, X(50 + k * 10, m), 54, { sw: 1.3, color: RM.GRAY });
    const xo = X(50 - s.dd * 10, m), xs = X(50 + s.di * 10, m);
    for (let v = -8; v <= 8; v++) if (v) {
      RM.line(pic, xo - 3, Y(v), xo + 3, Y(v), { sw: 1.2, color: RM.GRAY });
      RM.line(pic, xs - 3.5, Y(v), xs + 3.5, Y(v), { sw: 1.2, color: RM.GRAY });
    }
    RM.line(pic, xs, 6, xs, 94, { sw: 2, color: RM.INK });
    RM.line(pic, X(50, m), 4, X(50, m), 46.5, { sw: 4.5, color: RM.DARK });
    RM.line(pic, X(50, m), 53.5, X(50, m), 96, { sw: 4.5, color: RM.DARK });
    glyph(pic, xo, s.y0, s.y0 + s.H);
    glyph(pic, xs, s.fy, s.ty);
    return pic.svg();
  }

  function stepTxt(n, a, b) {
    const f = (s) => (s === 0 ? 'stays the same' : (s > 0 ? 'increases by ' : 'decreases by ') + Math.abs(s));
    return n + ' ' + (a === b ? f(a) + ' at each column' : f(a) + ' from column 1 to 2, then ' + f(b) + ' from column 2 to 3');
  }

  RM.register({
    id: 'pinhole',
    name: 'Camera obscura',
    difficulty: 7,
    generate(rng, variant) {
      const m = variant === 3 || (variant === 2 && rng.chance(0.5));
      const off = variant === 1;
      const sp = () => rng.pick([-1, 0, 1, 1, -1]);
      const st = {
        dd: [sp(), sp()], di: [sp(), sp()],
        H: [rng.pick([-2, -1, 0, 1, 2]), rng.pick([-2, -1, 0, 1, 2])],
        y0: off && rng.chance(0.4) ? [rng.pick([-1, 1]), rng.pick([-1, 0, 1])] : [0, 0],
      };
      RM.need(st.dd[0] || st.dd[1] || st.di[0] || st.di[1]);
      RM.need(st.dd.some((v) => v) && st.di.some((v) => v) || variant === 0);
      RM.need(st.dd.join() !== st.di.join());
      const T = [];
      const seen = {};
      for (let r = 0; r < 3; r++) {
        let row = null;
        for (let t = 0; t < 80 && !row; t++) {
          let b = { dd: rng.int(1, 4), di: rng.int(1, 4), H: rng.int(2, 8), y0: off ? rng.pick([-3, -2, -1, 1, 2, 3]) : 0 };
          const cur = [b];
          for (let c = 1; c < 3; c++) {
            const p = cur[c - 1];
            cur.push({ dd: p.dd + st.dd[c - 1], di: p.di + st.di[c - 1], H: p.H + st.H[c - 1], y0: p.y0 + st.y0[c - 1] });
          }
          if (cur.every(valid) && !seen[b.dd + ',' + b.di + ',' + b.H + ',' + b.y0]) {
            row = cur; seen[b.dd + ',' + b.di + ',' + b.H + ',' + b.y0] = 1;
          }
        }
        RM.need(row);
        T.push(row);
      }
      const S = T.map((row) => row.map((o) => mk(o, m)));
      const ans = S[2][2], vis = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (r < 2 || c < 2) vis.push([T[r][c], S[r][c]]);
      // image-law hypotheses
      const scales = [(o) => o.di / o.dd, (o) => o.dd / o.di, () => 1, (o) => o.di / 2.5, (o) => 2 / o.dd];
      const laws = [];
      scales.forEach((f) => [1, -1].forEach((sg) => [true, false].forEach((sc) => laws.push((o) => {
        const s = f(o), a = sc ? sg * o.y0 * s : sg * o.y0;
        return [rd(a), rd(sc ? sg * (o.y0 + o.H) * s : a + sg * o.H * s)];
      }))));
      let good = 0;
      laws.forEach((L) => {
        if (vis.every(([o, s]) => { const p = L(o); return p[0] === s.fy && p[1] === s.ty; })) {
          const p = L(T[2][2]);
          RM.need(p[0] === ans.fy && p[1] === ans.ty);
          good++;
        }
      });
      RM.need(good >= 1);
      // arithmetic progressions on image length / tip position must not predict something else
      [(s) => s.ty - s.fy, (s) => s.ty].forEach((f) => {
        const d = [0, 1].map((r) => [f(S[r][1]) - f(S[r][0]), f(S[r][2]) - f(S[r][1])]);
        if (d.every((x) => x[0] === x[1])) RM.need(f(S[2][1]) + (f(S[2][1]) - f(S[2][0])) === f(ans));
      });

      // distractors
      const a = T[2][2], pv = T[2][1];
      const cand = [];
      const add = (s, why) => { if (s && keyOf(s) !== keyOf(ans) && ok2(s.fy) && ok2(s.ty) && Math.abs(s.fy) <= 8 && Math.abs(s.ty) <= 8) cand.push({ spec: s, flaws: [why] }); };
      const mod = (f) => Object.assign({}, ans, f);
      const up = (s) => mod({ fy: -ans.fy || 0, ty: -ans.ty });
      const r = a.di / a.dd;
      add(mod({ fy: rd(a.y0 * r), ty: rd((a.y0 + a.H) * r) }), 'The image of a pinhole camera is upside down; here it stands upright.');
      add(mod({ fy: rd(-a.y0 * a.dd / a.di), ty: rd(-(a.y0 + a.H) * a.dd / a.di) }), 'The image is scaled by object distance / screen distance instead of screen distance / object distance.');
      add(mod({ fy: rd(-a.y0), ty: rd(-(a.y0 + a.H)) }), 'The image should be scaled by ' + a.di + '/' + a.dd + ', not drawn at the object size.');
      if (a.y0) add(mod({ fy: rd(-a.y0), ty: rd(-a.y0 - a.H * r) }), 'The foot of the image sits at the wrong height: its offset from the axis must be scaled too.');
      const alt = (o, why) => { if (valid(o)) add(mk(o, m), why); };
      alt({ dd: a.dd + 1, di: a.di, H: a.H, y0: a.y0 }, 'Self-consistent picture, but the object should be at distance ' + a.dd + ' as the row pattern requires.');
      alt({ dd: a.dd - 1, di: a.di, H: a.H, y0: a.y0 }, 'Self-consistent picture, but the object should be at distance ' + a.dd + ' as the row pattern requires.');
      alt({ dd: a.dd, di: a.di + 1, H: a.H, y0: a.y0 }, 'Self-consistent picture, but the screen should be at distance ' + a.di + ' as the row pattern requires.');
      alt({ dd: a.dd, di: a.di - 1, H: a.H, y0: a.y0 }, 'Self-consistent picture, but the screen should be at distance ' + a.di + ' as the row pattern requires.');
      alt({ dd: a.dd, di: pv.di, H: a.H, y0: a.y0 }, 'The screen has not moved as the pattern requires (it stays where it was in the previous panel).');
      alt({ dd: pv.dd, di: a.di, H: a.H, y0: a.y0 }, 'The object has not moved as the pattern requires (it stays where it was in the previous panel).');
      alt({ dd: a.dd, di: a.di, H: a.H + 1, y0: a.y0 }, 'The object height should be ' + a.H + ' units following the pattern.');
      alt({ dd: a.dd, di: a.di, H: a.H - 1, y0: a.y0 }, 'The object height should be ' + a.H + ' units following the pattern.');
      alt({ dd: a.dd, di: a.di, H: pv.H, y0: a.y0 }, 'The object height has not changed as the pattern requires.');
      const seenK = { [keyOf(ans)]: 1 };
      const pool = [];
      cand.forEach((c) => { const k = keyOf(c.spec); if (!seenK[k]) { seenK[k] = 1; pool.push(c); } });
      RM.need(pool.length >= 7);
      const first = pool.slice(0, 4), rest = rng.shuffle(pool.slice(4));
      const opts = first.concat(rest).slice(0, 7);
      opts.push({ spec: ans, flaws: [] });

      const side = m ? 'right' : 'left', sd2 = m ? 'left' : 'right';
      const ht = (o) => o.y0 ? 'its foot is ' + Math.abs(o.y0) + (o.y0 > 0 ? ' above' : ' below') + ' the axis and its tip at height ' + (o.y0 + o.H) : 'standing on the axis, ' + o.H + ' units tall';
      const b = T[2][1];
      const rules = [
        { k: 'Layout', t: 'A pinhole camera in side view: the wall (thick, with the hole on the thin axis line) separates the arrow (' + side + ') from the screen (' + sd2 + '). Ticks on the axis count the distances from the wall; ticks on the arrow line and on the screen measure heights.' },
        { k: 'Image law', t: 'Light travels in straight lines through the hole, so the image on the screen is <b>upside down</b> and every height measured from the axis is multiplied by (screen distance) / (object distance).' + (off ? ' This also applies to the foot position: a foot above the axis lands below it, scaled the same way.' : '') },
        { k: 'Pattern', t: stepTxt('The object distance', st.dd[0], st.dd[1]) + '; ' + stepTxt('the screen distance', st.di[0], st.di[1]) + '; ' + stepTxt('the object height', st.H[0], st.H[1]) + (off ? '; ' + stepTxt('the foot offset', st.y0[0], st.y0[1]) : '') + '. These changes are the same in every row.' },
        { k: 'Missing panel', t: 'Previous panel in row 3: object distance ' + b.dd + ', screen distance ' + b.di + ', object height ' + b.H + '. Applying the pattern: object distance <b>' + a.dd + '</b>, screen distance <b>' + a.di + '</b>, object ' + ht(a) + '. Ratio = ' + a.di + '/' + a.dd + ' = ' + rd(r) + (ok2(r) ? '' : ' (approx.)') + '. The image is upside down and spans from height ' + ans.fy + ' to ' + ans.ty + ' on the screen (length ' + Math.abs(ans.ty - ans.fy) + ').' }
      ];
      return {
        panels: S.flat().slice(0, 8),
        answer: ans,
        options: opts,
        render, key: keyOf, rules,
        hint: 'Light travels in straight lines through a single hole.',
      };
    },
  });
})();
