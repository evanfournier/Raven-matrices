/* Shutters (grandmaster): a house whose 4 windows (open/shuttered) count in a reflected Gray code, one shutter
   changing per step; the door colour cycles with period 3 (variant 2 adds chimney smoke with period 4). */
(function () {
  'use strict';
  const RM = window.RM;
  const WN = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
  const DN = ['white', 'gray', 'black'];
  const PERMS = [];
  (function mk(a, rest) { if (!rest.length) PERMS.push(a); else rest.forEach((x, i) => mk(a.concat(x), rest.filter((_, j) => j !== i))); })([], [0, 1, 2, 3]);
  const gray = (t) => (t ^ (t >> 1)) & 15;
  const wins = (code, perm, pol) => { const w = [0, 0, 0, 0]; for (let b = 0; b < 4; b++) w[perm[b]] = (((code >> b) & 1) === pol) ? 1 : 0; return w; };
  const key = (s) => s.w.join('') + s.d + '/' + s.p;
  const diff = (a, b) => { const r = []; for (let i = 0; i < 4; i++) if (a[i] !== b[i]) r.push(i); return r; };

  function render(s) {
    const pic = new RM.Pic();
    const ink = { sw: 2, stroke: RM.INK };
    RM.polygon(pic, [[66, 26], [76, 26], [76, 44], [66, 44]], Object.assign({ fill: 'light' }, ink));
    for (let i = 0; i < s.p; i++) RM.circle(pic, 71 + 7 * i, 19 - 5 * i, 3.6, { fill: 'light', sw: 1.6, stroke: RM.INK });
    RM.polygon(pic, [[8, 43], [50, 22], [92, 43]], Object.assign({ fill: 'gray' }, ink));
    RM.polygon(pic, [[12, 43], [88, 43], [88, 94], [12, 94]], Object.assign({ fill: 'white' }, ink));
    for (let i = 0; i < 4; i++) {
      const x = 16 + (i % 2) * 22, y = 48 + Math.floor(i / 2) * 22;
      RM.polygon(pic, [[x, y], [x + 17, y], [x + 17, y + 17], [x, y + 17]], Object.assign({ fill: s.w[i] ? 'white' : 'dark' }, ink));
      if (s.w[i]) {
        RM.line(pic, x + 8.5, y, x + 8.5, y + 17, { sw: 1.6, color: RM.INK });
        RM.line(pic, x, y + 8.5, x + 17, y + 8.5, { sw: 1.6, color: RM.INK });
      } else {
        for (let k = 1; k <= 3; k++) RM.line(pic, x + 1, y + 4.25 * k, x + 16, y + 4.25 * k, { sw: 1.6, color: RM.WHITE });
      }
    }
    RM.polygon(pic, [[62, 62], [82, 62], [82, 94], [62, 94]], Object.assign({ fill: ['white', 'gray', 'black'][s.d] }, ink));
    RM.circle(pic, 77, 79, 2.2, { fill: s.d === 2 ? 'white' : 'black', sw: 1, stroke: RM.INK });
    return pic.svg();
  }

  RM.register({
    id: 'gray-code',
    name: 'Shutters',
    difficulty: 7,
    generate(rng, variant) {
      const dir = variant === 1 ? -1 : variant === 3 ? (rng.chance(0.5) ? 1 : -1) : 1;
      const smoke = variant === 2;
      const perm = rng.shuffle([0, 1, 2, 3]), pol = rng.int(0, 1), t0 = rng.int(0, 15);
      const dord = rng.shuffle([0, 1, 2]), pord = rng.shuffle([0, 1, 2, 3]);
      const specs = [];
      for (let s = 0; s < 9; s++) {
        const t = RM.mod(t0 + dir * s, 16);
        specs.push({ w: wins(gray(t), perm, pol), d: dord[s % 3], p: smoke ? pord[s % 4] : 0 });
      }
      const vis = specs.slice(0, 8), ans = specs[8], prev = specs[7];
      // hypotheses: Gray / binary counting, up/down, any permutation, polarity, offset
      for (let kind = 0; kind < 2; kind++) for (let dh = -1; dh <= 1; dh += 2) for (let t = 0; t < 16; t++) for (let pl = 0; pl < 2; pl++) for (const pm of PERMS) {
        const f = (s) => { const u = RM.mod(t + dh * s, 16); return wins(kind ? u : gray(u), pm, pl); };
        let ok = true;
        for (let s = 0; s < 8 && ok; s++) if (f(s).join('') !== vis[s].w.join('')) ok = false;
        if (ok) RM.need(f(8).join('') === ans.w.join(''));
      }
      // fixed flip cycle of period <= 4
      const fl = []; for (let s = 1; s < 8; s++) fl.push(diff(vis[s].w, vis[s - 1].w)[0]);
      const tf = diff(prev.w, ans.w)[0];
      for (let p = 1; p <= 4; p++) {
        let ok = true; for (let i = p; i < 7; i++) if (fl[i] !== fl[i - p]) ok = false;
        if (ok) RM.need(fl[7 - p] === tf);
      }
      // door / smoke periods
      for (let p = 1; p <= 4; p++) {
        let okd = true, okp = true;
        for (let i = p; i < 8; i++) { if (vis[i].d !== vis[i - p].d) okd = false; if (vis[i].p !== vis[i - p].p) okp = false; }
        if (okd) RM.need(vis[8 - p].d === ans.d);
        if (okp) RM.need(vis[8 - p].p === ans.p);
      }
      // options
      const mk = (w, d, p, flaws) => ({ spec: { w, d, p }, flaws });
      const tog = (w, js) => w.map((v, i) => (js.indexOf(i) >= 0 ? 1 - v : v));
      const others = [0, 1, 2, 3].filter((j) => j !== tf);
      const single = rng.shuffle(others).map((j) => mk(tog(prev.w, [j]), ans.d, ans.p,
        [`the ${WN[j]} window changed, but this step it is the ${WN[tf]} window that must change`]));
      const none = [mk(prev.w.slice(), ans.d, ans.p, ['no window changed, but exactly one shutter changes at every step'])];
      const two = rng.shuffle(others).map((j) => mk(tog(prev.w, [tf, j]), ans.d, ans.p,
        [`two windows (${WN[tf]} and ${WN[j]}) changed at once; in a Gray code only one changes per step`]));
      const dws = rng.shuffle([0, 1, 2].filter((d) => d !== ans.d)).map((d) => mk(ans.w.slice(), d, ans.p,
        [`the door should be ${DN[ans.d]} (the door repeats every 3 houses), not ${DN[d]}`]));
      const pws = smoke ? rng.shuffle([0, 1, 2, 3].filter((p) => p !== ans.p)).map((p) => mk(ans.w.slice(), ans.d, p,
        [`the chimney should show ${ans.p} puff(s) (cycle of 4), not ${p}`])) : [];
      const mixed = rng.shuffle(others).map((j) => mk(tog(prev.w, [j]), rng.pick([0, 1, 2].filter((d) => d !== ans.d)), ans.p,
        [`the ${WN[j]} window changed instead of the ${WN[tf]} window, and the door colour is wrong too`]));
      const order = smoke
        ? [].concat(single, dws.slice(0, 1), pws.slice(0, 1), two.slice(0, 1), none, dws.slice(1), pws.slice(1), two.slice(1), mixed)
        : [].concat(single, dws, two.slice(0, 1), none, two.slice(1), mixed);
      const seen = {}; seen[key(ans)] = 1;
      const opts = [];
      for (const o of order) { const k = key(o.spec); if (!seen[k]) { seen[k] = 1; opts.push(o); } }
      RM.need(opts.length >= 7);
      const options = opts.slice(0, 7);
      options.push({ spec: ans, flaws: [] });
      // text
      const fseq = fl.map((j) => WN[j]);
      const rules = [
        { k: 'Windows: one change per step', t: `Reading the panels in order (left to right, row by row), exactly one window changes between two consecutive houses; the others stay as they were. The 7 changes seen are: ${fseq.join(', ')}.` },
        { k: 'Which window changes', t: `The changing window follows the Gray-code rhythm: one window changes every second step (here the ${WN[fl[0]]} window), another every fourth step, another every eighth, and so on, each time at the moment the others leave room for it. Counting the changes seen, the ${WN[tf]} window is next in turn.` },
        { k: 'Door', t: `The door colour repeats every 3 houses in the order ${DN[dord[0]]}, ${DN[dord[1]]}, ${DN[dord[2]]}. Panel 9 is house number 9, so its door is <b>${DN[ans.d]}</b>.` },
      ];
      if (smoke) rules.push({ k: 'Smoke', t: `The number of smoke puffs repeats every 4 houses (${pord.join(', ')}), so house 9 has <b>${ans.p}</b> puff(s).` });
      rules.push({ k: 'Answer', t: `From the 8th house, the ${WN[tf]} window ${prev.w[tf] ? 'closes' : 'opens'} and nothing else changes among the windows, giving <b>open: ${ans.w.map((v, i) => v ? WN[i] : null).filter(Boolean).join(', ') || 'none'}</b> with a <b>${DN[ans.d]}</b> door${smoke ? ` and ${ans.p} puff(s)` : ''}.` });
      return {
        panels: vis, answer: ans, options, render, key, reading: 'sequence',
        difficulty: smoke ? 8 : 7, rules,
        hint: 'One change at a time, but which window\'s turn is it?',
      };
    },
  });
})();
