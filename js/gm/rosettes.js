/* Rosettes (grandmaster): petals are a decoy. A rosette has m petals coloured by a repeating pattern; its true
 * symmetry (rotational order = how many turns map it onto itself, mirror axes = 0 when petals carry hooks) is the rule. */
(function () {
  'use strict';
  const RM = window.RM;
  const MS = [4, 6, 8, 9, 10, 12];
  const COL = ['white', 'gray', 'black'];
  const CN = { white: 'white', gray: 'gray', black: 'black' };

  function period(cols) {
    const m = cols.length;
    for (let d = 1; d <= m; d++) {
      if (m % d) continue;
      let ok = true;
      for (let i = 0; i < m && ok; i++) if (cols[(i + d) % m] !== cols[i]) ok = false;
      if (ok) return d;
    }
    return m;
  }
  function props(s) {
    const m = s.m, p = period(s.cols);
    let axes = 0;
    if (!s.hook) {
      for (let k = 0; k < m; k++) {
        let ok = true;
        for (let i = 0; i < m && ok; i++) if (s.cols[((k - i) % m + m) % m] !== s.cols[i]) ok = false;
        if (ok) axes++;
      }
    }
    return { m, p, order: m / p, axes };
  }
  function mk(m, cols, hook) {
    const p = cols.length, full = [];
    for (let i = 0; i < m; i++) full.push(cols[i % p]);
    const s = { m, cols: full, hook: hook ? 1 : 0 };
    s.k = s.m + (s.hook ? 'h' : 'n') + full.join('').replace(/white/g, 'w').replace(/gray/g, 'g').replace(/black/g, 'b');
    return s;
  }
  function randSpec(rng, hookP) {
    const m = rng.pick(MS);
    const ps = [1, 2, 3].filter((p) => m % p === 0);
    const p = rng.pick(ps);
    const cols = [];
    for (let i = 0; i < p; i++) cols.push(rng.pick(COL));
    return mk(m, cols, rng.chance(hookP));
  }
  function render(s) {
    const pic = new RM.Pic();
    const m = s.m;
    const Rc = 24.5, w = Math.min(8, 0.42 * 2 * Math.PI * Rc / m);
    const f = m >= 10 ? 0.7 : 1;
    for (let i = 0; i < m; i++) {
      const a = (360 * i) / m;
      let g = `<g transform="rotate(${RM.fmt(a)} 50 50)">`;
      g += `<ellipse cx="50" cy="${50 - Rc}" rx="${RM.fmt(w)}" ry="13.5" fill="${pic.paint(s.cols[i])}" stroke="${RM.INK}" stroke-width="1.7"/>`;
      if (s.hook) g += `<path d="M50 12 C ${RM.fmt(50 + 7 * f)} ${RM.fmt(12 - 5 * f)}, ${RM.fmt(50 + 14 * f)} ${RM.fmt(12 + 1 * f)}, ${RM.fmt(50 + 11 * f)} ${RM.fmt(12 + 9 * f)}" fill="none" stroke="${RM.INK}" stroke-width="2.6" stroke-linecap="round"/>`;
      pic.add(g + '</g>');
    }
    RM.circle(pic, 50, 50, 7, { fill: 'white', sw: 1.7 });
    return pic.svg();
  }

  RM.register({
    id: 'rosettes',
    name: 'Rosettes',
    difficulty: 7,
    generate(rng, variant) {
      const hookP = variant === 1 ? 0.5 : 0.4;
      const pool = [];
      for (let i = 0; i < 160; i++) { const s = randSpec(rng, hookP); s.P = props(s); pool.push(s); }
      const fn = variant === 1 ? (s) => s.P.axes : (s) => s.P.order;
      const ach = [2, 3, 4, 5, 6, 8, 9, 10, 12];
      let T; // target grid of values
      if (variant === 0) {
        const R = rng.sample([2, 3, 4, 6], 3);
        T = RM.grid3((r) => R[r]);
      } else if (variant === 1) {
        const R = rng.sample([0, 2, 3, 4, 6], 3);
        T = RM.grid3((r) => R[r]);
      } else if (variant === 2) {
        const a = rng.pick([2, 3, 4]), b = rng.pick([2, 3, 4, 5]);
        RM.need(ach.indexOf(a + b) >= 0);
        const c1 = rng.pick([2, 3, 4, 5]), c2 = rng.pick([2, 3, 4]);
        RM.need(ach.indexOf(c1 + c2) >= 0);
        const d1 = rng.pick([2, 3, 4, 5]), d2 = rng.pick([2, 3, 4]);
        RM.need(ach.indexOf(d1 + d2) >= 0);
        const rows = [[a, b], [c1, c2], [d1, d2]];
        T = RM.grid3((r, c) => (c < 2 ? rows[r][c] : rows[r][0] + rows[r][1]));
      } else {
        const L = RM.latinGrid(rng, rng.sample([2, 3, 4, 6], 3));
        T = L;
      }
      const used = {};
      const spec = RM.grid3((r, c) => {
        const cand = pool.filter((s) => fn(s) === T[r][c] && !used[s.k]);
        RM.need(cand.length > 0);
        const s = rng.pick(cand);
        used[s.k] = 1;
        return s;
      });
      const ans = spec[2][2];
      const vg = RM.grid3((r, c) => fn(spec[r][c]));
      RM.needUnique(vg, vg[2][2], 'numeric');
      if (variant === 1) RM.needNoConflict(RM.grid3((r, c) => spec[r][c].P.order), ans.P.order, 'numeric');
      RM.needNoConflict(RM.grid3((r, c) => spec[r][c].m), ans.m, 'numeric');
      RM.needNoConflict(RM.grid3((r, c) => spec[r][c].hook), ans.hook, 'numeric');
      const want = fn(ans);

      /* distractor candidates */
      const cands = [];
      const add = (s, sc) => { s.P = s.P || props(s); if (fn(s) !== want) cands.push({ s, sc }); };
      for (let i = 0; i < 40; i++) {
        const p = rng.pick([1, 2, 3].filter((q) => ans.m % q === 0));
        const cols = []; for (let j = 0; j < p; j++) cols.push(rng.pick(COL));
        add(mk(ans.m, cols, ans.hook), 4);
        add(mk(ans.m, cols, !ans.hook), 3);
      }
      for (let i = 0; i < 30; i++) {
        const m = rng.pick(MS), p = ans.P.p <= 3 && m % ans.P.p === 0 ? ans.P.p : 1;
        add(mk(m, ans.cols.slice(0, p), ans.hook), 3);
        add(mk(m, ans.cols.slice(0, p), !ans.hook), 2);
      }
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
        const o = spec[r][c];
        add(mk(o.m, o.cols.slice(0, o.P.p), ans.hook), 2);
        add(o, 2);
      }
      pool.forEach((s) => add(s, 0));
      const seen = {}; seen[ans.k] = 1;
      const list = [];
      rng.shuffle(cands).sort((a, b) => b.sc - a.sc).forEach((x) => {
        if (seen[x.s.k] || list.length >= 7) return;
        seen[x.s.k] = 1; list.push(x.s);
      });
      RM.need(list.length === 7);
      const desc = (s) => {
        const P = s.P;
        let t = `${s.m} petals, colours repeat every ${P.p} (rotational order ${P.order})`;
        if (variant === 1) t = `${s.m} petals, ${s.hook ? 'hooked, so no mirror axis' : P.axes + ' mirror axes'}`;
        return t;
      };
      const label = variant === 1 ? 'mirror axes' : 'rotational symmetry order';
      const options = list.map((s) => ({
        spec: s,
        flaws: [`${desc(s)}: its ${label} is ${fn(s)}, not ${want}.`],
      }));
      options.push({ spec: ans, flaws: [] });

      const vals = (r) => [0, 1, 2].map((c) => fn(spec[r][c]));
      const how = variant === 1
        ? 'Count the <b>mirror axes</b>: lines along which the rosette is its own reflection. Hooks (curls all on the same side) destroy every mirror axis, and an uneven colour pattern can too. Petal count and rotation do not matter.'
        : 'Find the <b>rotational symmetry order</b>: how many of the turns (360° divided into m equal steps) bring the rosette back onto itself exactly, colours included. It equals the petal count divided by the length of the repeating colour pattern. Hooks do not change it.';
      const rules = [{ k: 'What counts', t: how }];
      if (variant === 0) rules.push({ k: 'Rule', t: `Along every row the ${label} is the same: rows 1 and 2 give <b>${vals(0)[0]}</b> and <b>${vals(1)[0]}</b>; petal counts, hooks and colours vary as decoys.` });
      else if (variant === 1) rules.push({ k: 'Rule', t: `Along every row the number of mirror axes is the same: rows 1 and 2 give <b>${vals(0)[0]}</b> and <b>${vals(1)[0]}</b>. Petal counts and rotational orders vary as decoys.` });
      else if (variant === 2) rules.push({ k: 'Rule', t: `In each row the order of the 3rd rosette is the order of the 1st plus the order of the 2nd: ${vals(0).join(', ')} in row 1 (${vals(0)[0]}+${vals(0)[1]}=${vals(0)[2]}), ${vals(1).join(', ')} in row 2.` });
      else rules.push({ k: 'Rule', t: `Each row and column contains the orders ${[...new Set(RM.flat(vg))].join(', ')} once (Latin square). Row 1: ${vals(0).join(', ')}; row 2: ${vals(1).join(', ')}.` });
      rules.push({ k: 'Missing panel', t: `Row 3 shows ${vals(2).slice(0, 2).join(' and ')}, so the missing rosette needs ${label} <b>${want}</b>: <b>${desc(ans)}</b>.` });
      return {
        panels: RM.flat(spec).slice(0, 8),
        answer: ans,
        options,
        render,
        key: (s) => s.k,
        rules,
        hint: "Don't count the petals; count the ways each rosette fits onto itself.",
      };
    },
  });
})();
