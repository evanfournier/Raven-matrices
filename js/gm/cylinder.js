/* Turning cylinder (grandmaster): a band of 8 distinct symbols circles a cylinder; only the 4 front symbols are seen.
   The cylinder turns by a fixed number of eighths per column (rows start at different rotations). */
(function () {
  'use strict';
  const RM = window.RM;
  const SH = ['triangle', 'star5', 'cross', 'circle'];
  const SN = ['triangle', 'star', 'cross', 'circle'];
  const name = (id) => (id % 2 ? 'white ' : 'black ') + SN[id >> 1];
  const ANG = [-67.5, -22.5, 22.5, 67.5];
  const R = 36;

  function render(spec) {
    const pic = new RM.Pic();
    pic.add('<rect x="14" y="20" width="72" height="64" fill="#f3f4f6" stroke="none"/>');
    pic.add('<ellipse cx="50" cy="84" rx="36" ry="7" fill="#f3f4f6" stroke="none"/>');
    pic.add('<rect x="14" y="20" width="9" height="64" fill="#d1d5db"/><rect x="77" y="20" width="9" height="64" fill="#d1d5db"/>');
    pic.add('<path d="M14 84 A36 7 0 0 0 86 84" fill="none" stroke="' + RM.INK + '" stroke-width="2"/>');
    RM.line(pic, 14, 20, 14, 84, { sw: 2 });
    RM.line(pic, 86, 20, 86, 84, { sw: 2 });
    pic.add('<ellipse cx="50" cy="20" rx="36" ry="7" fill="#e5e7eb" stroke="' + RM.INK + '" stroke-width="2"/>');
    spec.forEach((id, j) => {
      const th = ANG[j] * Math.PI / 180, x = 50 + R * Math.sin(th), c = Math.cos(th), y = 53;
      pic.add('<g transform="translate(' + RM.fmt(x) + ' ' + y + ') scale(' + RM.fmt(c) + ' 1) translate(' + (-RM.fmt(x)) + ' ' + (-y) + ')">');
      RM.shape(pic, SH[id >> 1], x, y, 10, { fill: id % 2 ? 'white' : 'black', sw: 2.4 });
      pic.add('</g>');
    });
    return pic.svg();
  }

  function win(band, s) { return [0, 1, 2, 3].map((j) => band[RM.mod(s + j, 8)]); }
  const key = (spec) => spec.join(',');

  RM.register({
    id: 'cylinder', name: 'Turning cylinder', difficulty: 7,
    generate(rng, variant) {
      const kk = rng.pick([1, 2, 3]), dir = rng.chance(0.5) ? 1 : -1, step = RM.mod(dir * kk, 8);
      const band = rng.shuffle([0, 1, 2, 3, 4, 5, 6, 7]);
      const s = [rng.int(0, 7), rng.int(0, 7), rng.int(0, 7)];
      const starts = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (r * 3 + c < 8) starts.push(RM.mod(s[r] + c * step, 8));
      const panels = starts.map((p) => win(band, p));
      const pa = RM.mod(s[2] + 2 * step, 8), answer = win(band, pa);
      RM.need(new Set(starts).size >= 6);
      // pinned: all answer positions seen
      const seen = new Set(); starts.forEach((p) => { for (let j = 0; j < 4; j++) seen.add(RM.mod(p + j, 8)); });
      for (let j = 0; j < 4; j++) RM.need(seen.has(RM.mod(pa + j, 8)));
      // hypotheses: any step k', row offsets p2,p3 -> band reconstructed from views; all must agree
      for (let k = 0; k < 8; k++) for (let p2 = 0; p2 < 8; p2++) for (let p3 = 0; p3 < 8; p3++) {
        const b = new Array(8).fill(null), pos = {}; let ok = true; const off = [0, p2, p3];
        for (let i = 0; i < 8 && ok; i++) {
          const r = Math.floor(i / 3), c = i % 3;
          for (let j = 0; j < 4 && ok; j++) {
            const q = RM.mod(off[r] + c * k + j, 8), v = panels[i][j];
            if (b[q] !== null && b[q] !== v) ok = false;
            else if (pos[v] !== undefined && pos[v] !== q) ok = false;
            else { b[q] = v; pos[v] = q; }
          }
        }
        if (!ok) continue;
        const pred = [0, 1, 2, 3].map((j) => b[RM.mod(p3 + 2 * k + j, 8)]);
        RM.need(pred.every((v) => v !== null && v === answer[j0(pred, v)]) && key(pred) === key(answer));
      }
      function j0(a, v) { return a.indexOf(v); }
      // distractors
      const C = [];
      const add = (spec, why) => { if (spec.every((v) => v !== undefined)) C.push({ spec, flaws: [why] }); };
      add(win(band, RM.mod(s[2] - 2 * step, 8)), 'the cylinder turned the wrong way in this column');
      add(answer.slice().reverse(), 'the compression is on the wrong sides: this is the same four symbols seen in mirror order');
      add(win(band, RM.mod(pa + 1, 8)), 'turned one eighth too little or too much (the window is shifted by one symbol)');
      add(win(band, RM.mod(pa - 1, 8)), 'turned one eighth too little or too much (the window is shifted by one symbol)');
      add(win(band, RM.mod(s[2] + step, 8)), 'the cylinder has not turned in this column: it is the same as the panel to the left');
      add([answer[0], answer[2], answer[1], answer[3]], 'the two front symbols are swapped');
      add(win(band, RM.mod(pa + 2, 8)), 'turned two eighths too far');
      add(win(band, RM.mod(pa - 2, 8)), 'turned two eighths too little');
      add([band[RM.mod(pa - 1, 8)], answer[1], answer[2], answer[3]], 'the left symbol is its band neighbour instead of the right one');
      add([answer[0], answer[1], answer[2], band[RM.mod(pa + 4, 8)]], 'the right symbol is its band neighbour instead of the right one');
      add(win(band, RM.mod(s[2] + 3 * step, 8)), 'turned three steps instead of two');
      add(win(band, s[2]), 'the cylinder is shown in its starting position');
      const used = new Set([key(answer)]), opts = [];
      for (const c of C) { if (used.has(key(c.spec)) || opts.length >= 7) continue; used.add(key(c.spec)); opts.push(c); }
      RM.need(opts.length === 7);
      opts.push({ spec: answer, flaws: [] });
      const ord = [0, 1, 2, 3].map((j) => name(band[RM.mod(s[0] + j, 8)])).join(', ');
      const full = []; for (let i = 0; i < 8; i++) full.push(name(band[RM.mod(pa + i, 8)]));
      const dtxt = dir > 0 ? 'left' : 'right';
      return {
        panels, answer, options: opts, render, key,
        rules: [
          { k: 'One cylinder', t: 'All panels show the same cylinder with a band of 8 different symbols (4 shapes, black or white). You only see the 4 front ones; the other 4 are hidden behind.' },
          { k: 'Turning', t: 'From one column to the next, every row turns the cylinder by <b>' + kk + ' eighth' + (kk > 1 ? 's' : '') + ' to the ' + dtxt + '</b>: ' + (dir > 0 ? 'the symbols slide left and new ones arrive from the right.' : 'the symbols slide right and new ones arrive from the left.') + ' The rows start at different rotations.' },
          { k: 'Rebuilding the band', t: 'Combining the overlapping views gives the full band, in the order seen from the front at the start of the answer view: <b>' + full.join(' - ') + '</b> (then back to the start).' },
          { k: 'Missing panel', t: 'Starting from the two visible panels of row 3, turning once more (' + (2 * kk) + ' eighths in total from the first panel, to the ' + dtxt + ') gives, from left to right: <b>' + answer.map(name).join(', ') + '</b>.' },
        ],
        hint: 'You only ever see half of it - the other half is in the other panels.',
      };
    },
  });
})();
