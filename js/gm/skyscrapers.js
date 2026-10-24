/* Skyscrapers (grandmaster): each panel is a row of four towers (1-5 floors) seen from the front; the dots on the left and right count the towers
 * visible from that side (a tower is visible when taller than everything in front of it). From one panel to the next the towers change by a fixed
 * rule (+1 floor with 5 dropping to 1; or the row slides one place; or both; or +2), and the dots must be recomputed from the new heights. */
(function () {
  'use strict';
  const RM = window.RM;
  const N = 4;
  const OPS = {
    grow1: { el: (h) => (h % 5) + 1, sh: 0, d: '+1 floor, a 5-floor tower dropping to 1' },
    grow2: { el: (h) => ((h + 1) % 5) + 1, sh: 0, d: '+2 floors, wrapping past 5 (4 becomes 1, 5 becomes 2)' },
    sat1: { el: (h) => Math.min(h + 1, 5), sh: 0, d: '+1 floor with 5-floor towers staying at 5' },
    down1: { el: (h) => ((h + 3) % 5) + 1, sh: 0, d: '-1 floor (1 rising to 5)' },
    shR: { el: (h) => h, sh: 1, d: 'the row sliding one place to the right (the last tower re-entering on the left)' },
    shL: { el: (h) => h, sh: -1, d: 'the row sliding one place to the left (the first tower re-entering on the right)' },
    gR: { el: (h) => (h % 5) + 1, sh: 1, d: '+1 floor (5 dropping to 1) and the row sliding one place to the right' },
    gL: { el: (h) => (h % 5) + 1, sh: -1, d: '+1 floor (5 dropping to 1) and the row sliding one place to the left' },
    g2R: { el: (h) => ((h + 1) % 5) + 1, sh: 1, d: '+2 floors and the row sliding to the right' },
    rev: { el: (h) => h, sh: 2, d: 'the row being mirrored' },
    id: { el: (h) => h, sh: 0, d: 'no change at all' },
  };
  const apply = (op, a) => {
    const o = OPS[op];
    const b = a.map(o.el);
    if (o.sh === 1) return [b[3], b[0], b[1], b[2]];
    if (o.sh === -1) return [b[1], b[2], b[3], b[0]];
    if (o.sh === 2) return b.slice().reverse();
    return b;
  };
  const visL = (h) => { let m = 0; let c = 0; h.forEach((x) => { if (x > m) { m = x; c++; } }); return c; };
  const visR = (h) => visL(h.slice().reverse());
  const runs = (h) => { let m = 0; return h.filter((x) => (x > m ? ((m = x), true) : false)); };
  const spec = (h) => ({ h, l: visL(h), r: visR(h) });
  const eqA = (a, b) => a.every((v, i) => v === b[i]);
  const ORDN = ['1st', '2nd', '3rd', '4th'];

  RM.register({
    id: 'skyscrapers',
    name: 'Skyscrapers',
    difficulty: 8,
    generate(rng, variant) {
      const op = [['grow1'], ['shR', 'shL'], ['gR', 'gL'], ['grow2']][variant];
      const OP = rng.pick(op);
      const rows = [];
      for (let r = 0; r < 3; r++) {
        const h0 = rng.sample([1, 2, 3, 4, 5], N);
        const h1 = apply(OP, h0);
        rows.push([h0, h1, apply(OP, h1)]);
      }
      RM.need(new Set(rows.map((r) => r[0].join(''))).size === 3 && new Set(rows.map((r) => r[2].join(''))).size === 3);
      // alternative height rules must contradict rows 1-2
      Object.keys(OPS).forEach((k) => {
        if (k === OP) return;
        const c = [0, 1].every((r) => eqA(apply(k, rows[r][0]), rows[r][1]) && eqA(apply(k, rows[r][1]), rows[r][2]));
        RM.need(!c);
      });
      // wrapping must matter in the last row too
      const R = rows[2];
      const Hs = R[2];
      RM.need(OP.indexOf('sh') === 0 || OP === 'shR' || OP === 'shL' || !eqA(apply('sat1', R[1]), Hs));
      // dots must not follow a simple numeric rule of their own
      const Lg = RM.grid3((r, c) => visL(rows[r][c]));
      const Rg = RM.grid3((r, c) => visR(rows[r][c]));
      RM.needNoConflict(Lg, visL(Hs), 'numeric');
      RM.needNoConflict(Rg, visR(Hs), 'numeric');
      const L = visL(Hs);
      const Rr = visR(Hs);
      const A = { h: Hs, l: L, r: Rr };
      const aKey = JSON.stringify(A);
      const hOf = (s) => s.h.join('');
      const opDesc = OPS[OP].d;

      const dif = (h) => {
        const out = [];
        h.forEach((v, i) => { if (v !== Hs[i]) out.push('the ' + ORDN[i] + ' tower should have ' + Hs[i] + ' floor' + (Hs[i] > 1 ? 's' : '') + ', not ' + v); });
        return out;
      };
      const seen = new Set([aKey]);
      const B = []; // wrong heights, dots derived
      const Cc = []; // wrong heights, wrong dots
      const Aa = []; // right heights, wrong dots
      const addB = (h, text) => {
        const s = spec(h);
        const k = JSON.stringify(s);
        if (eqA(h, Hs) || seen.has(k)) return;
        seen.add(k);
        B.push({ spec: s, fl: [text, dif(h).slice(0, 2).join('; ') + (dif(h).length > 2 ? '; and ' + (dif(h).length - 2) + ' more' : '') + '.'] });
      };
      Object.keys(OPS).forEach((k) => {
        if (k === OP) return;
        addB(apply(k, R[1]), 'This applies the change "' + OPS[k].d + '" to the 2nd panel, but the rule of the rows is "' + opDesc + '".');
      });
      addB(R[0].slice(), 'The towers of the 1st panel were copied; they must change as they do in rows 1 and 2.');
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        const h = Hs.slice(); [h[i], h[j]] = [h[j], h[i]];
        addB(h, 'Two towers are exchanged.');
      }
      for (let i = 0; i < N; i++) [1, -1].forEach((d) => {
        const h = Hs.slice(); h[i] = ((h[i] - 1 + d + 5) % 5) + 1;
        addB(h, 'One tower has the wrong height.');
      });
      const dm = [];
      const addDm = (l, r, text) => { if (l >= 1 && l <= 4 && r >= 1 && r <= 4 && !(l === L && r === Rr)) dm.push({ l, r, text }); };
      addDm(visL(R[1]), visR(R[1]), 'The dots of the 2nd panel were copied; they must be recomputed for the new towers.');
      addDm(Rr, L, 'The left and right dots are interchanged.');
      addDm(L + 1, Rr, 'The left dots are wrong (one too many).');
      addDm(L - 1, Rr, 'The left dots are wrong (one too few).');
      addDm(L, Rr + 1, 'The right dots are wrong (one too many).');
      addDm(L, Rr - 1, 'The right dots are wrong (one too few).');
      addDm(L, L, 'The dots were counted from the left on both sides.');
      addDm(Rr, Rr, 'The dots were counted from the right on both sides.');
      const dotsFl = (h, d) => {
        const fl = [];
        if (!eqA(h, Hs)) {
          if (d.l !== visL(h) || d.r !== visR(h)) fl.push('the dots do not even match these towers (' + visL(h) + ' visible from the left, ' + visR(h) + ' from the right)');
        } else fl.push('with these towers ' + L + ' are visible from the left and ' + Rr + ' from the right, not ' + d.l + ' and ' + d.r);
        return fl;
      };
      dm.forEach((d) => {
        const s = { h: Hs, l: d.l, r: d.r };
        const k = JSON.stringify(s);
        if (seen.has(k)) return;
        seen.add(k);
        Aa.push({ spec: s, fl: [d.text].concat(dotsFl(Hs, d)) });
      });
      B.forEach((b) => {
        dm.forEach((d) => {
          if (d.l === b.spec.l && d.r === b.spec.r) return;
          Cc.push({ h: b.spec.h, d, b });
        });
      });
      let pick = null;
      for (let t = 0; t < 80 && !pick; t++) {
        const nA = rng.int(1, 2);
        const nB = rng.int(4, 5);
        const nC = 7 - nA - nB;
        if (nC < 0 || Aa.length < nA || B.length < nB + nC) continue;
        const a = rng.shuffle(Aa).slice(0, nA);
        const bs = rng.shuffle(B);
        const b = bs.slice(0, nB);
        const cs = [];
        bs.slice(nB).forEach((x) => { if (cs.length < nC) { const d = rng.pick(dm.filter((q) => !(q.l === x.spec.l && q.r === x.spec.r))); cs.push({ spec: { h: x.spec.h, l: d.l, r: d.r }, fl: [d.text, dif(x.spec.h).slice(0, 2).join('; ') + '.'].concat(dotsFl(x.spec.h, d)) }); } });
        if (cs.length < nC) continue;
        const sel = a.concat(b, cs);
        const cnt = {};
        sel.forEach((x) => { cnt[hOf(x.spec)] = (cnt[hOf(x.spec)] || 0) + 1; });
        if (Object.keys(cnt).some((k) => cnt[k] > (k === hOf(A) ? 2 : 2))) continue;
        if (new Set(sel.map((x) => JSON.stringify(x.spec))).size !== 7) continue;
        pick = sel;
      }
      RM.need(pick);
      const options = [{ spec: A, flaws: [] }].concat(pick.map((x) => ({ spec: x.spec, flaws: x.fl })));
      const panels = [];
      rows.forEach((r, i) => { panels.push(spec(r[0]), spec(r[1])); if (i < 2) panels.push(spec(r[2])); });

      const hs = (h) => h.join(', ');
      const how = OP.indexOf('grow') === 0 ? 'every tower grows by ' + (OP === 'grow2' ? 'two floors; a tower that would pass 5 wraps around (4 becomes 1, 5 becomes 2)' : 'one floor, and a tower of 5 floors drops back to 1') :
        'the whole row slides one place to the ' + (OP.slice(-1) === 'R' ? 'right' : 'left') + ' (the tower pushed out at one end re-enters at the other end)' + (OP[0] === 'g' ? (OP === 'gR' || OP === 'gL' ? ', and at the same time every tower grows by one floor (5 drops to 1)' : '') : '');
      return {
        panels,
        answer: A,
        options,
        render: draw,
        key: (s) => JSON.stringify(s),
        rules: [
          { k: 'Towers', t: 'Each panel shows four towers side by side, each made of 1 to 5 floors, seen from the front. The dots on the left (and on the right) tell how many towers can be seen when looking along the row from the left (from the right).' },
          { k: 'Visibility', t: 'A tower is visible from one side when it is <b>taller than every tower in front of it</b> on that side; a lower or equal tower is hidden behind a taller one. The number of dots is always <b>recomputed</b> from the towers of that panel: it is not a pattern of its own.' },
          { k: 'Change of heights', t: 'From one panel of a row to the next, ' + how + '. The same rule links the 1st to the 2nd and the 2nd to the 3rd panel.' },
          { k: 'Last row', t: 'Heights (left to right): ' + hs(R[0]) + ' then ' + hs(R[1]) + ', so the missing panel has <b>' + hs(Hs) + '</b>.' },
          { k: 'Dots', t: 'From the left the visible towers have ' + hs(runs(Hs)) + ' floors: <b>' + L + ' dot' + (L > 1 ? 's' : '') + '</b> on the left. From the right: ' + hs(runs(Hs.slice().reverse())) + ' floors: <b>' + Rr + ' dot' + (Rr > 1 ? 's' : '') + '</b> on the right.' },
        ],
        hint: 'The dots are not a separate pattern: update the towers first, then count again what each side can see.',
      };

      function draw(s) {
        const pic = new RM.Pic();
        const bot = 88;
        const fh = 12;
        const w = 14;
        const x0 = 17.5;
        s.h.forEach((h, i) => {
          const x = x0 + i * 17;
          for (let f = 0; f < h; f++) RM.polygon(pic, [[x, bot - (f + 1) * fh], [x + w, bot - (f + 1) * fh], [x + w, bot - f * fh], [x, bot - f * fh]], { fill: '#d6dae1', sw: 1.6 });
        });
        RM.line(pic, 12, bot, 88, bot, { sw: 2.2, cap: 'butt' });
        for (let k = 0; k < s.l; k++) RM.circle(pic, 7.5, bot - 6 - k * 8, 2.9, { fill: 'black', sw: 0.8 });
        for (let k = 0; k < s.r; k++) RM.circle(pic, 92.5, bot - 6 - k * 8, 2.9, { fill: 'black', sw: 0.8 });
        RM.polygon(pic, [[4.5, 14], [4.5, 22], [11, 18]], { fill: 'black', sw: 0.8 });
        RM.polygon(pic, [[95.5, 14], [95.5, 22], [89, 18]], { fill: 'black', sw: 0.8 });
        return pic.svg();
      }
    },
  });
})();
