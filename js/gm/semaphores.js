/* Semaphores (grandmaster): three signal posts, each arm repeats its own cycle of positions with its own period. */
(function () {
  'use strict';
  const RM = window.RM;
  const PX = [16, 44, 72], PY = 54, LEN = 17;
  const PLATE = ['square', 'disc', 'triangle'];
  const PNAME = ['square-plate', 'disc-plate', 'triangle-plate'];
  const VN = ['high (up 60°)', 'up 30°', 'horizontal', 'down 30°', 'low (down 60°)'];
  const POSN = ['left', 'middle', 'right'];

  function render(s) {
    const pic = new RM.Pic();
    RM.line(pic, 4, 90, 96, 90, { sw: 1.6, color: RM.GRAY });
    for (let j = 0; j < 3; j++) {
      const x = PX[j], top = PY - 24 - (j === 1 ? 4 : j === 2 ? 8 : 0);
      RM.line(pic, x, top, x, 90, { sw: 2.2, color: RM.INK });
      RM.polygon(pic, [[x - 8, 90], [x + 8, 90], [x + 5, 84], [x - 5, 84]], { fill: 'dark', sw: 1.2 });
      const th = (s.a[j] - 2) * Math.PI / 6;
      const ex = x + LEN * Math.cos(th), ey = PY + LEN * Math.sin(th);
      RM.line(pic, x, PY, ex, ey, { sw: 3.2, color: RM.INK, cap: 'round' });
      const f = s.c[j] ? 'black' : 'white';
      if (j === 0) RM.polygon(pic, [[ex - 6, ey - 6], [ex + 6, ey - 6], [ex + 6, ey + 6], [ex - 6, ey + 6]], { fill: f, sw: 1.8 });
      else if (j === 1) RM.circle(pic, ex, ey, 6.2, { fill: f, sw: 1.8 });
      else RM.shape(pic, 'triangle', ex, ey, 7.5, { fill: f, sw: 1.8 });
      RM.circle(pic, x, PY, 2.4, { fill: 'gray', sw: 1.2 });
    }
    return pic.svg();
  }

  RM.register({
    id: 'semaphores',
    name: 'Semaphores',
    difficulty: 7,
    generate(rng, variant) {
      const P = [[3, 4, 5], [2, 3, 5], [4, 5, 6], [3, 4, 5]][variant];
      const per = rng.shuffle(P);
      const plateAlt = variant === 3;
      const L = [], ph = [], cph = rng.int(0, 1);
      for (let j = 0; j < 3; j++) {
        const p = per[j];
        let l, tries = 0;
        for (;;) {
          l = []; for (let i = 0; i < p; i++) l.push(rng.int(0, 4));
          if (new Set(l).size >= Math.min(p, 3) && l[0] !== l[p - 1]) break;
          RM.need(++tries < 40);
        }
        L.push(l); ph.push(rng.int(0, p - 1));
      }
      const val = (j, t) => L[j][(t + ph[j]) % per[j]];
      const col = (t) => plateAlt ? (t + cph) % 2 : 1;
      const spec = (t) => ({ a: [0, 1, 2].map(j => val(j, t)), c: [col(t), col(t), col(t)].map((c, j) => plateAlt ? (t + cph + j) % 2 : 1) });
      const panels = []; for (let t = 0; t < 8; t++) panels.push(spec(t));
      const answer = spec(8);
      // identifiability: every period q consistent with the 8 observations must predict the same arm
      for (let j = 0; j < 3; j++) {
        const s = panels.map(p => p.a[j]);
        let ok = 0;
        for (let q = 1; q <= 7; q++) {
          let cons = true;
          for (let t = 0; t + q < 8; t++) if (s[t] !== s[t + q]) { cons = false; break; }
          if (cons) { RM.need(s[8 - q] === answer.a[j]); ok++; }
        }
        RM.need(ok >= 1);
        // rotation-continuation decoy must not coincide with the truth
        RM.need(Math.max(0, Math.min(4, 2 * s[7] - s[6])) !== answer.a[j] || s[7] === s[6]);
      }
      // distractor candidates
      const alts = [];
      for (let j = 0; j < 3; j++) {
        const p = per[j], s = panels.map(q => q.a[j]), o = [];
        const add = (v, why) => { if (v >= 0 && v <= 4 && v !== answer.a[j] && !o.some(x => x.a === v)) o.push({ a: v, c: answer.c[j], why }); };
        add(s[9 - p], 'the ' + POSN[j] + ' arm uses a period one step too short: it copies the panel ' + (9 - p + 1) + ' position instead of panel ' + (9 - p));
        add(s[7 - p], 'the ' + POSN[j] + ' arm uses a period one step too long (it shows the position of panel ' + (8 - p) + ')');
        add(Math.max(0, Math.min(4, 2 * s[7] - s[6])), 'the ' + POSN[j] + ' arm just continues its last rotation instead of following its cycle');
        add(s[7], 'the ' + POSN[j] + ' arm has not moved from panel 8, but its cycle says otherwise');
        if (plateAlt) o.push({ a: answer.a[j], c: 1 - answer.c[j], why: 'the ' + POSN[j] + ' plate has the wrong colour (plates alternate black/white every panel)' });
        alts.push(o);
      }
      const cands = [];
      const rec = (j, a, c, f) => {
        if (j === 3) { if (f.length) cands.push({ spec: { a: a.slice(), c: c.slice() }, flaws: f.slice() }); return; }
        rec(j + 1, a, c, f);
        for (const o of alts[j]) {
          const a2 = a.slice(), c2 = c.slice(); a2[j] = o.a; c2[j] = o.c;
          rec(j + 1, a2, c2, f.concat(o.why));
        }
      };
      rec(0, answer.a, answer.c, []);
      for (let i = 0; i < 3; i++) for (let k = i + 1; k < 3; k++) {
        const a = answer.a.slice(); a[i] = answer.a[k]; a[k] = answer.a[i];
        if (a[i] !== answer.a[i] || a[k] !== answer.a[k]) cands.push({ spec: { a, c: answer.c.slice() }, flaws: ['the arms of the ' + POSN[i] + ' and ' + POSN[k] + ' posts are exchanged'] });
      }
      const seen = new Set([JSON.stringify(answer)]);
      const buckets = [[], [], [], [], []];
      for (const c of rng.shuffle(cands)) {
        const k = JSON.stringify(c.spec); if (seen.has(k)) continue; seen.add(k);
        const n = c.spec.a.filter((v, j) => v !== answer.a[j]).length + c.spec.c.filter((v, j) => v !== answer.c[j]).length;
        buckets[Math.min(4, n)].push(c);
      }
      const order = [1, 2, 1, 2, 3, 1, 2, 3, 4, 2, 1, 3];
      const opts = [];
      for (let pass = 0; pass < 4 && opts.length < 7; pass++) for (const b of order) { if (opts.length < 7 && buckets[b].length) opts.push(buckets[b].pop()); }
      RM.need(opts.length === 7);
      opts.push({ spec: answer, flaws: [] });

      const rules = [
        { k: 'Three posts, three rhythms', t: 'Each post has its own cycle of arm positions that repeats forever; the panels are read in order 1 to 9, and the three posts do not share the same period. The plate (' + PNAME.join(', ') + ') tells the posts apart.' },
      ];
      for (let j = 0; j < 3; j++) {
        const seq = []; for (let t = 0; t < per[j]; t++) seq.push(VN[val(j, t)].split(' ')[0] + (VN[val(j, t)].indexOf('30') > 0 ? ' 30' : VN[val(j, t)].indexOf('60') > 0 ? ' 60' : ''));
        rules.push({ k: 'The ' + POSN[j] + ' post (' + PLATE[j] + ')', t: 'Its arm repeats every <b>' + per[j] + '</b> panels: panel ' + (9 - per[j]) + ' and panel 9 are the same, so panel 9 shows the arm <b>' + VN[answer.a[j]] + '</b> (as in panel ' + (9 - per[j]) + ').' });
      }
      if (plateAlt) rules.push({ k: 'Plates', t: 'The plates alternate black and white every panel, so panel 9 has the same plate colours as panel 7 (and panel 8 is the opposite).' });
      rules.push({ k: 'Answer', t: 'Combine the three arms: left <b>' + VN[answer.a[0]] + '</b>, middle <b>' + VN[answer.a[1]] + '</b>, right <b>' + VN[answer.a[2]] + '</b>.' });
      return {
        reading: 'sequence',
        panels, answer, options: opts, render,
        key: (s) => s.a.join('') + '/' + s.c.join(''),
        rules, hint: 'Three posts, three rhythms: follow each arm separately.',
      };
    },
  });
})();
