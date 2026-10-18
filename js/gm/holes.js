/* Holes (grandmaster): topology. Each panel is a gray blob with a number of bumps (lobes), true holes (closed white
 * islands) and notches (inlets connected to the outside, which only look like holes). Holes add/subtract along rows,
 * lobes follow a Latin square; notches are noise. */
(function () {
  'use strict';
  const RM = window.RM;
  const R0 = 34, AMP = 0.15, CX = 50, CY = 50;
  function lcg(s) { let x = (s * 2654435761 + 12345) >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; }
  function layout(sp) {
    const u = lcg(sp.s);
    const phase = u() * Math.PI * 2;
    const perm = [0, 1, 2, 3, 4, 5];
    for (let i = 5; i > 0; i--) { const j = Math.floor(u() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
    const base = u() * Math.PI * 2;
    const feats = perm.map((p) => base + p * Math.PI / 3 + (u() - 0.5) * 0.25);
    const hs = [0, 1, 2, 3, 4, 5].map(() => ({ rot: u() * 3, k: 0.8 + u() * 0.4 }));
    return { phase, feats, hs };
  }
  const rad = (sp, L, t) => R0 * (1 + AMP * Math.cos(sp.l * t + L.phase));
  function render(sp) {
    const pic = new RM.Pic();
    const L = layout(sp);
    const pts = [];
    for (let i = 0; i < 120; i++) { const t = i / 120 * Math.PI * 2; const r = rad(sp, L, t); pts.push([CX + r * Math.cos(t), CY + r * Math.sin(t)]); }
    RM.polygon(pic, pts, { fill: RM.GRAY, sw: 2.2, stroke: RM.INK });
    const clip = pic.def('b', (id) => `<clipPath id="${id}"><polygon points="${pts.map((p) => RM.fmt(p[0]) + ',' + RM.fmt(p[1])).join(' ')}"/></clipPath>`);
    for (let k = 0; k < sp.n; k++) {
      const a = L.feats[5 - k], ca = Math.cos(a), sa = Math.sin(a);
      const ex = CX + 36 * 1.3 * ca, ey = CY + 36 * 1.3 * sa;
      const ix = CX + 0.58 * R0 * ca, iy = CY + 0.58 * R0 * sa;
      pic.add(`<g clip-path="url(#${clip})">`);
      RM.line(pic, ix, iy, ex, ey, { sw: 8, color: RM.INK, cap: 'round' });
      RM.circle(pic, ix, iy, 8.2, { fill: RM.INK, sw: 0 });
      pic.add('</g>');
      RM.line(pic, ix, iy, ex, ey, { sw: 4.4, color: RM.WHITE, cap: 'butt' });
      RM.circle(pic, ix, iy, 5.6, { fill: 'white', sw: 0 });
    }
    for (let k = 0; k < sp.h; k++) {
      const a = L.feats[k], o = L.hs[k];
      const d = 0.4 * R0, hx = CX + d * Math.cos(a), hy = CY + d * Math.sin(a);
      const q = [];
      for (let i = 0; i < 24; i++) { const t = i / 24 * Math.PI * 2; const x = 5.6 * o.k * Math.cos(t), y = 4.4 / o.k * Math.sin(t); q.push([hx + x * Math.cos(o.rot) - y * Math.sin(o.rot), hy + x * Math.sin(o.rot) + y * Math.cos(o.rot)]); }
      RM.polygon(pic, q, { fill: 'white', sw: 1.8, stroke: RM.INK });
    }
    return pic.svg();
  }
  const key = (sp) => sp.l + '/' + sp.h + '/' + sp.n + '/' + sp.s;
  const pl = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

  RM.register({
    id: 'holes', name: 'Holes', difficulty: 6,
    generate(rng, variant) {
      const mode = variant === 1 ? 'diff' : variant === 3 ? 'lobesum' : 'sum';
      const lob = RM.grid3(() => 0), hol = RM.grid3(() => 0);
      let Lg, Hg;
      if (mode === 'lobesum') {
        const rh = [0, 1, 2].map(() => rng.int(0, 3));
        RM.need(new Set(rh).size >= 2);
        Hg = RM.grid3((r) => rh[r]);
        Lg = RM.grid3(() => 0);
        for (let r = 0; r < 3; r++) { Lg[r][0] = rng.int(2, 4); Lg[r][1] = rng.int(1, 2); Lg[r][2] = Lg[r][0] + Lg[r][1]; }
        RM.need(new Set(RM.flat(Lg)).size >= 4);
      } else {
        Lg = RM.latinGrid(rng, rng.shuffle([3, 4, 5]));
        Hg = RM.grid3(() => 0);
        for (let r = 0; r < 3; r++) {
          if (mode === 'sum') { Hg[r][0] = rng.int(0, 2); Hg[r][1] = rng.int(0, 2); Hg[r][2] = Hg[r][0] + Hg[r][1]; }
          else { Hg[r][0] = rng.int(1, 4); Hg[r][1] = rng.int(0, Math.min(2, Hg[r][0] - 1)); Hg[r][2] = Hg[r][0] - Hg[r][1]; }
        }
        RM.need(new Set(Hg.map((x) => x[2])).size >= 2 && new Set(RM.flat(Hg)).size >= 3);
      }
      const Ng = RM.grid3(() => rng.int(0, 2));
      RM.need(RM.flat(Ng).some((x) => x > 0));
      const T = RM.grid3((r, c) => Hg[r][c] + Ng[r][c]);
      RM.needUnique(Hg, Hg[2][2], 'numeric');
      RM.needUnique(Lg, Lg[2][2], 'numeric');
      RM.needNoConflict(Ng, Ng[2][2], 'numeric');
      RM.needNoConflict(T, T[2][2], 'numeric');
      RM.need(Hg.every((row, r) => row.every((h, c) => h + Ng[r][c] <= 6)));
      const sp = RM.grid3((r, c) => ({ l: Lg[r][c], h: Hg[r][c], n: Ng[r][c], s: rng.int(1, 99999) }));
      const A = sp[2][2];
      const panels = RM.flat(sp).slice(0, 8);
      const cands = [];
      const add = (l, h, n, why) => {
        if (l < 1 || l > 7 || h < 0 || n < 0 || h + n > 6) return;
        if (l === A.l && h === A.h) return;
        cands.push({ spec: { l, h, n, s: A.s }, flaws: why });
      };
      const { l, h, n } = A;
      const closed = 'a notch was taken for a hole: this panel has ' , opened = 'a hole was taken for a notch: ';
      add(l, h + 1, Math.max(n - 1, 0), ['one notch has been closed into a hole: it has ' + (h + 1) + ' holes instead of ' + h]);
      if (h > 0) add(l, h - 1, n + 1, ['one hole is opened to the outside (a notch): only ' + (h - 1) + ' true holes instead of ' + h]);
      if (n > 0) add(l, h + n, n, ['the notches were counted as holes: ' + (h + n) + ' holes instead of ' + h]);
      add(l + 1, h, n, ['one bump too many (' + (l + 1) + ' lobes instead of ' + l + ')']);
      add(l - 1, h, n, ['one bump too few (' + (l - 1) + ' lobes instead of ' + l + ')']);
      add(l, h + 1, n, ['one hole too many (' + (h + 1) + ' instead of ' + h + ')']);
      if (h > 0) add(l, h - 1, n, ['one hole too few (' + (h - 1) + ' instead of ' + h + ')']);
      add(l + 1, h + 1, Math.max(n - 1, 0), ['a notch closed into a hole (' + (h + 1) + ' holes) and ' + (l + 1) + ' lobes instead of ' + l]);
      if (h > 0) add(l - 1, h - 1, n + 1, ['a hole opened into a notch (' + (h - 1) + ' holes) and ' + (l - 1) + ' lobes instead of ' + l]);
      add(l - 1, h + 1, n, ['wrong holes (' + (h + 1) + ') and wrong lobes (' + (l - 1) + ')']);
      add(l + 1, h - 1, n, ['wrong holes (' + (h - 1) + ') and wrong lobes (' + (l + 1) + ')']);
      add(l, h + 2, n, ['two holes too many']);
      if (h > 1) add(l, h - 2, n, ['two holes too few']);
      add(l + 1, h + n, n, ['notches counted as holes and one lobe too many']);
      const seen = new Set([key(A)]), opts = [];
      for (const c of cands) { const k = key(c.spec); if (seen.has(k)) continue; seen.add(k); opts.push(c); if (opts.length === 7) break; }
      RM.need(opts.length === 7);
      opts.push({ spec: A, flaws: [] });
      const hr = (mode === 'sum') ? 'third holes = first + second' : mode === 'diff' ? 'third holes = first - second' : 'constant per row';
      const hrow = mode === 'sum' ? `In each row the number of holes of the 3rd panel is the <b>sum</b> of the holes in the first two. Row 3: ${Hg[2][0]} + ${Hg[2][1]} = <b>${A.h}</b> hole${A.h === 1 ? '' : 's'}.`
        : mode === 'diff' ? `In each row the 3rd panel has the holes of the 1st <b>minus</b> those of the 2nd. Row 3: ${Hg[2][0]} - ${Hg[2][1]} = <b>${A.h}</b> hole${A.h === 1 ? '' : 's'}.`
        : `The number of holes is <b>constant along a row</b>. Row 3 has <b>${A.h}</b> hole${A.h === 1 ? '' : 's'}.`;
      const lrow = mode === 'lobesum' ? `The number of bumps (lobes) of the 3rd panel is the <b>sum</b> of the first two. Row 3: ${Lg[2][0]} + ${Lg[2][1]} = <b>${A.l}</b> lobes.`
        : `Bumps on the outline form a <b>Latin square</b> (3, 4 and 5 once in every row and column). Row 3 already has ${Lg[2][0]} and ${Lg[2][1]}, so the missing panel has <b>${A.l}</b> lobes.`;
      return {
        panels, answer: A, options: opts, render, key, hint: 'Could you thread a string through it? Only what is closed all around counts.',
        rules: [
          { k: 'Hole or notch', t: 'A <b>hole</b> is a white island completely surrounded by gray. A <b>notch</b> is an inlet that is connected to the outside through a channel: it is not a hole, however closed it looks. The number of notches is random and carries no rule.' },
          { k: 'Holes', t: hrow },
          { k: 'Lobes', t: lrow },
          { k: 'Answer', t: `The missing panel has <b>${pl(A.h, 'hole')}</b> and <b>${pl(A.l, 'lobe')}</b>. The other options have a wrong number of holes (a notch counted as a hole or a hole counted as a notch) or of lobes.` },
        ],
      };
    },
  });
})();
