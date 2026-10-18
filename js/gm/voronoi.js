/* Territories (grandmaster): each panel is a 7×7 map with three (or four) capitals. Every square belongs to its
 * nearest capital and wears that capital's texture; squares equally far from their nearest capitals are borders and
 * stay white. Capitals move by a constant rule from column to column (own vector per capital, or a cycle of places
 * plus a common drift); the solver must find the motion, then work out the distance metric and the border rule from
 * the visible maps and redraw the whole map for the missing panel. */
(function () {
  'use strict';
  const RM = window.RM;
  const N = 7;
  const X0 = 8;
  const CS = 12;
  const NAMES = ['disc', 'triangle', 'ring', 'cross'];
  const TEX = ['hatched', 'dotted', 'gray', 'striped'];
  const METRICS = {
    L1: (dx, dy) => dx + dy,
    Linf: (dx, dy) => Math.max(dx, dy),
    L2: (dx, dy) => dx * dx + dy * dy,
    oct: (dx, dy) => 2 * Math.max(dx, dy) + Math.min(dx, dy),
  };
  const D4V = [
    (v) => v,
    (v) => [-v[1], v[0]],
    (v) => [-v[0], -v[1]],
    (v) => [v[1], -v[0]],
    (v) => [-v[0], v[1]],
    (v) => [v[0], -v[1]],
    (v) => [v[1], v[0]],
    (v) => [-v[1], -v[0]],
  ];
  function perms(a) {
    if (a.length <= 1) return [a.slice()];
    const out = [];
    a.forEach((x, i) => perms(a.slice(0, i).concat(a.slice(i + 1))).forEach((p) => out.push([x].concat(p))));
    return out;
  }
  const PERMS = { 3: perms([0, 1, 2]), 4: perms([0, 1, 2, 3]) };
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const eqv = (a, b) => a[0] === b[0] && a[1] === b[1];
  const samePos = (A, B) => A.every((p, i) => eqv(p, B[i]));
  const inside = (p) => p[0] >= 0 && p[0] < N && p[1] >= 0 && p[1] < N;
  const okPanel = (A) => A.every(inside) && A.every((p, i) => A.every((q, j) => j <= i || Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) >= 2));
  const sameArr = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

  /* tie: {} → ties among the nearest are white; {band:k} → white when the runner-up is at most k farther;
   * {prio:[..]} → a tie goes to the earliest capital in the list; {anyw:1} → white if any two capitals tie. */
  function mapOf(caps, metric, tie) {
    const f = METRICS[metric];
    const out = new Array(N * N);
    const d = new Array(caps.length);
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        let m = Infinity;
        for (let i = 0; i < caps.length; i++) {
          d[i] = f(Math.abs(caps[i][0] - x), Math.abs(caps[i][1] - y));
          if (d[i] < m) m = d[i];
        }
        let lab = -1;
        let cnt = 0;
        for (let i = 0; i < caps.length; i++) if (d[i] === m) (cnt++, (lab = i));
        if (cnt > 1) {
          lab = -1;
          if (tie.prio) lab = tie.prio.find((i) => d[i] === m);
        } else if (tie.band) {
          for (let i = 0; i < caps.length; i++) if (i !== lab && d[i] - m <= tie.band) lab = -1;
        } else if (tie.anyw) {
          for (let i = 0; i < caps.length; i++) for (let j = i + 1; j < caps.length; j++) if (d[i] === d[j]) lab = -1;
        }
        out[y * N + x] = lab;
      }
    return out;
  }

  const cellName = (x, y) => `R${y + 1}C${x + 1}`;
  const posName = (p) => cellName(p[0], p[1]);
  function vecTxt(v) {
    const p = [];
    if (v[0]) p.push(`${Math.abs(v[0])} ${v[0] > 0 ? 'right' : 'left'}`);
    if (v[1]) p.push(`${Math.abs(v[1])} ${v[1] > 0 ? 'down' : 'up'}`);
    return p.length ? p.join(' and ') : 'no move';
  }
  function listTxt(a) {
    return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  }

  /* ------------------------------------------------------------ drawing */
  function render(spec) {
    const pic = new RM.Pic();
    const dots = pic.def('tdots', (id) => `<pattern id="${id}" patternUnits="userSpaceOnUse" width="4" height="4"><rect width="4" height="4" fill="#fff"/><circle cx="2" cy="2" r="1.2" fill="${RM.INK}"/></pattern>`);
    const stripes = pic.def('tstr', (id) => `<pattern id="${id}" patternUnits="userSpaceOnUse" width="4" height="4"><rect width="4" height="4" fill="#fff"/><rect x="1.4" y="0" width="1.2" height="4" fill="${RM.INK}"/></pattern>`);
    const fills = [pic.paint('lines:45:3.6:1.2'), `url(#${dots})`, RM.GRAY, `url(#${stripes})`];
    pic.add(`<rect x="${X0}" y="${X0}" width="${N * CS}" height="${N * CS}" fill="#fff"/>`);
    for (let l = 0; l < spec.caps.length; l++) {
      let d = '';
      spec.map.forEach((v, i) => {
        if (v === l) d += `M${X0 + CS * (i % N)} ${X0 + CS * Math.floor(i / N)}h${CS}v${CS}h-${CS}z`;
      });
      if (d) pic.add(`<path d="${d}" fill="${fills[l]}"/>`);
    }
    let g = '';
    for (let i = 1; i < N; i++) g += `M${X0 + CS * i} ${X0}V${X0 + N * CS}M${X0} ${X0 + CS * i}H${X0 + N * CS}`;
    pic.add(`<path d="${g}" fill="none" stroke="${RM.DARK}" stroke-width="0.6"/>`);
    pic.add(`<rect x="${X0}" y="${X0}" width="${N * CS}" height="${N * CS}" fill="none" stroke="${RM.INK}" stroke-width="1.5"/>`);
    spec.caps.forEach((p, i) => {
      const cx = X0 + CS * p[0] + CS / 2;
      const cy = X0 + CS * p[1] + CS / 2;
      RM.circle(pic, cx, cy, 4.9, { fill: 'white', sw: 0, stroke: 'none' });
      if (i === 0) RM.circle(pic, cx, cy, 3.4, { fill: 'black', sw: 0, stroke: 'none' });
      else if (i === 1) RM.polygon(pic, [[cx, cy - 4.1], [cx + 4, cy + 3.1], [cx - 4, cy + 3.1]], { fill: 'black', sw: 0, stroke: 'none' });
      else if (i === 2) RM.circle(pic, cx, cy, 2.9, { fill: 'white', sw: 1.8 });
      else {
        RM.line(pic, cx - 3.6, cy, cx + 3.6, cy, { sw: 2.1, cap: 'butt' });
        RM.line(pic, cx, cy - 3.6, cx, cy + 3.6, { sw: 2.1, cap: 'butt' });
      }
    });
    return pic.svg();
  }
  const keyOf = (s) => s.caps.map((p) => p.join(',')).join(';') + '|' + s.map.join(',');

  /* ------------------------------------------------------------ hypotheses */
  /* Every motion reading a solver could hold, fitted on the visible panels; returns the predicted row-3 positions. */
  function motionPreds(P, n) {
    const out = [];
    const rowsFull = [P[0], P[1]];
    const rowPart = [P[2][0], P[2][1]];
    const colsFull = [0, 1].map((c) => [P[0][c], P[1][c], P[2][c]]);
    const colPart = [P[0][2], P[1][2]];
    for (const [full, part] of [[rowsFull, rowPart], [colsFull, colPart]]) {
      // each capital: second step = fixed transform (identity, rotation, mirror) of the first step
      for (const T of D4V) {
        const ok = full.every((sq) => sq[0].every((_, i) => eqv(sub(sq[2][i], sq[1][i]), T(sub(sq[1][i], sq[0][i])))));
        if (ok) out.push(part[1].map((p, i) => add(p, T(sub(p, part[0][i])))));
      }
      // capitals exchange places (any permutation) and the group drifts (shift may differ per sequence)
      for (const sg of PERMS[n]) {
        const st = (A, s) => A.map((_, i) => add(A[sg[i]], s));
        const ok = full.every((sq) => {
          const s = sub(sq[1][0], sq[0][sg[0]]);
          return samePos(st(sq[0], s), sq[1]) && samePos(st(sq[1], s), sq[2]);
        });
        const s3 = sub(part[1][0], part[0][sg[0]]);
        if (ok && samePos(st(part[0], s3), part[1])) out.push(st(part[1], s3));
      }
    }
    return out;
  }
  function mapHyps(n) {
    const ties = [{}, { band: 1 }, { anyw: 1 }].concat(PERMS[n].map((p) => ({ prio: p })));
    const H = [];
    for (const m of Object.keys(METRICS))
      for (const t of ties) {
        if (t.band && (m === 'L2' || m === 'oct')) continue;
        H.push([m, t]);
      }
    return H;
  }
  const HYPS = { 3: mapHyps(3), 4: mapHyps(4) };

  RM.register({
    id: 'voronoi',
    name: 'Territories',
    difficulty: 7,
    generate(rng, variant) {
      const n = variant === 2 ? 4 : 3;
      const metric = variant === 1 ? 'Linf' : 'L1';
      const cyc = variant === 3;
      const W = {};
      const unit = metric === 'L1' ? 'steps' : 'king moves';
      let vecs = null;
      let sigma = null;
      let drift = null;
      if (!cyc) {
        vecs = [];
        for (let t = 0; t < 60 && vecs.length < n; t++) {
          const v = [rng.int(-2, 2), rng.int(-2, 2)];
          if ((v[0] || v[1]) && !vecs.some((w) => eqv(w, v))) vecs.push(v);
        }
        RM.need(vecs.length === n && vecs.filter((v) => v[0] && v[1]).length >= 1);
      } else {
        sigma = rng.pick([[1, 2, 0], [2, 0, 1]]);
        drift = rng.pick([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1], [2, 0], [0, 2], [-2, 0], [0, -2], [2, 1], [1, 2], [-1, 2], [2, -1]]);
      }
      const stepBy = (A, sg, s) => A.map((_, i) => add(A[sg[i]], s));
      const step = (A) => (cyc ? stepBy(A, sigma, drift) : A.map((p, i) => add(p, vecs[i])));

      /* ---- positions */
      const P = [];
      for (let r = 0; r < 3; r++) {
        let row = null;
        for (let t = 0; t < 60 && !row; t++) {
          const A = [];
          for (let i = 0; i < n; i++) {
            if (cyc) A.push([rng.int(0, N - 1), rng.int(0, N - 1)]);
            else {
              const v = vecs[i];
              A.push([rng.int(Math.max(0, -2 * v[0]), Math.min(N - 1, N - 1 - 2 * v[0])), rng.int(Math.max(0, -2 * v[1]), Math.min(N - 1, N - 1 - 2 * v[1]))]);
            }
          }
          const B = step(A);
          const C = step(B);
          if (okPanel(A) && okPanel(B) && okPanel(C) && !P.some((q) => samePos(q[0], A))) row = [A, B, C];
        }
        RM.need(row);
        P.push(row);
      }
      const M = P.map((row) => row.map((A) => mapOf(A, metric, W)));
      const ans = { caps: P[2][2], map: M[2][2] };
      const visible = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (r < 2 || c < 2) visible.push([r, c]);

      /* ---- quality: borders present, real territories */
      const whites = (m) => m.filter((v) => v < 0).length;
      const wAns = whites(ans.map);
      RM.need(wAns >= 1 && wAns <= (n === 4 ? 12 : 10));
      RM.need(visible.reduce((s, [r, c]) => s + whites(M[r][c]), 0) >= 5);
      for (let i = 0; i < n; i++) RM.need(ans.map.filter((v) => v === i).length >= 3);
      const altMetric = metric === 'L1' ? 'Linf' : 'L1';
      const altMap = mapOf(ans.caps, altMetric, W);
      RM.need(altMap.filter((v, i) => v !== ans.map[i]).length >= 2);

      /* ---- uniqueness: motion readings */
      const mp = motionPreds(P, n);
      RM.need(mp.length > 0 && mp.every((A) => samePos(A, ans.caps)));
      /* ---- uniqueness: metric × border readings, plus "map drawn for the previous positions" */
      const predMaps = [];
      for (const [m, t] of HYPS[n]) {
        if (visible.every(([r, c]) => sameArr(mapOf(P[r][c], m, t), M[r][c]))) predMaps.push(mapOf(ans.caps, m, t));
      }
      RM.need(predMaps.length > 0 && predMaps.every((m) => sameArr(m, ans.map)));
      const lag = [[0, 1], [0, 2], [1, 1], [1, 2], [2, 1]].every(([r, c]) => sameArr(M[r][c], mapOf(P[r][c - 1], metric, W)));
      RM.need(!lag);

      /* ---- no shortcut through simple Raven rules on decoy attributes */
      const G = (f) => RM.grid3((r, c) => (r === 2 && c === 2 ? undefined : f(r, c)));
      RM.needNoConflict(G((r, c) => whites(M[r][c])), wAns, 'numeric');
      for (let i = 0; i < n; i++) {
        RM.needNoConflict(G((r, c) => M[r][c].filter((v) => v === i).length), ans.map.filter((v) => v === i).length, 'numeric');
      }

      /* ---- explanations */
      const distTxt = (caps, x, y) => {
        const ds = caps.map((p, i) => `${METRICS[metric](Math.abs(p[0] - x), Math.abs(p[1] - y))} from the ${NAMES[i]}`);
        return listTxt(ds);
      };
      const ownerTxt = (l) => (l < 0 ? 'white (border)' : `${TEX[l]} (${NAMES[l]})`);
      const prev = P[2][1];
      const moveTxt = (i) =>
        cyc
          ? `it takes the place of the ${NAMES[sigma[i]]} (${posName(prev[sigma[i]])}) and moves ${vecTxt(drift)}`
          : `it moves ${vecTxt(vecs[i])} from ${posName(prev[i])}`;
      const capWhy = (caps) =>
        caps
          .map((p, i) => (eqv(p, ans.caps[i]) ? null : `the ${NAMES[i]} should be at ${posName(ans.caps[i])} (${moveTxt(i)}), not at ${posName(p)}`))
          .filter(Boolean);
      const mapWhy = (map, lead) => {
        const diffs = [];
        map.forEach((v, i) => v !== ans.map[i] && diffs.push(i));
        const i = diffs[0];
        const x = i % N;
        const y = Math.floor(i / N);
        return `${lead}: ${cellName(x, y)} is ${distTxt(ans.caps, x, y)} (${unit}), so it must be ${ownerTxt(ans.map[i])}, not ${ownerTxt(map[i])}${diffs.length > 1 ? ` — ${diffs.length} squares are wrong in all` : ''}`;
      };

      /* ---- distractors */
      const cands = [];
      const push = (type, caps, map, flaws) => cands.push({ type, spec: { caps, map: map || mapOf(caps, metric, W) }, flaws });
      const C = ans.caps;
      const metricLead =
        metric === 'L1'
          ? 'the territories are measured in king moves (a diagonal step counted as one)'
          : 'the territories are measured in steps along rows and columns, but here a diagonal step counts as a single king move';
      const am = altMap;
      push('metric', C, am, [mapWhy(am, metricLead)]);
      const e2 = mapOf(C, 'L2', W);
      push('euclid', C, e2, [mapWhy(e2, 'the territories are measured as the crow flies (straight-line distance)')]);
      const pr = rng.pick(PERMS[n]);
      const tm = mapOf(C, metric, { prio: pr });
      push('ties', C, tm, [mapWhy(tm, 'border squares (equally far from two capitals) were given to a capital instead of staying white')]);
      const bm = mapOf(C, metric, { band: 1 });
      push('band', C, bm, [mapWhy(bm, 'squares only one step closer to one capital were left white — only exact ties are borders')]);
      push('stale', C, M[2][1], [mapWhy(M[2][1], 'the capitals moved but the territories are still those of panel (3,2)')]);
      push('copy32', prev, M[2][1], ['this is panel (3,2) unchanged — the capitals have not moved'].concat(capWhy(prev).slice(0, 1)));
      // one-square slips
      const slips = [];
      ans.map.forEach((v, i) => {
        const x = i % N;
        const y = Math.floor(i / N);
        if (C.some((p) => p[0] === x && p[1] === y)) return;
        if (v < 0) {
          const ds = C.map((p) => METRICS[metric](Math.abs(p[0] - x), Math.abs(p[1] - y)));
          const m = Math.min(...ds);
          ds.forEach((d, j) => d === m && slips.push([i, j]));
        } else {
          const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => inside([x + a, y + b]) && ans.map[(y + b) * N + x + a] < 0);
          if (nb) slips.push([i, -1]);
        }
      });
      rng.shuffle(slips).slice(0, 3).forEach(([i, l]) => {
        const m = ans.map.slice();
        m[i] = l;
        push('slip', C, m, [mapWhy(m, 'one square is wrong')]);
      });
      // motion mistakes
      const wrongCaps = [];
      if (!cyc) {
        for (let i = 0; i < n; i++) {
          const v = vecs[i];
          const alts = [[0, 0], [-v[0], -v[1]], [v[0], v[1]], [-v[1], v[0]], [v[1], -v[0]]];
          vecs.forEach((w, j) => j !== i && alts.push(w));
          alts.forEach((a, k) => {
            const caps = C.slice();
            caps[i] = k === 0 ? prev[i] : k === 2 ? add(C[i], v) : add(prev[i], a);
            if (k === 1) caps[i] = sub(prev[i], v);
            wrongCaps.push(caps);
          });
        }
      } else {
        const inv = [0, 1, 2].map((i) => sigma.indexOf(i));
        [[inv, drift], [sigma, [0, 0]], [[0, 1, 2], drift], [sigma, [2 * drift[0], 2 * drift[1]]], [sigma, [-drift[0], -drift[1]]], [inv, [0, 0]]].forEach(([sg, s]) =>
          wrongCaps.push(stepBy(prev, sg, s))
        );
      }
      rng.shuffle(wrongCaps).forEach((caps) => {
        if (!okPanel(caps)) return;
        push('move', caps, null, capWhy(caps));
      });
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++) {
          const caps = C.slice();
          caps[i] = C[j];
          caps[j] = C[i];
          const sw = `the ${NAMES[i]} and the ${NAMES[j]} have exchanged places: the ${NAMES[i]} belongs at ${posName(C[i])}, the ${NAMES[j]} at ${posName(C[j])}`;
          push('swap', caps, null, [sw]);
          push('swapglyph', caps, ans.map, [sw + ' (each now sits in the other one’s territory)']);
        }
      for (let i = 0; i < n; i++)
        rng.shuffle([[1, 0], [-1, 0], [0, 1], [0, -1]]).forEach((d) => {
          const caps = C.slice();
          caps[i] = add(C[i], d);
          if (!okPanel(caps)) return;
          push('disp', caps, ans.map, capWhy(caps).map((t) => t + ' — the territories drawn here do not fit this position'));
        });

      const ak = keyOf(ans);
      const seen = new Set([ak]);
      const options = [{ spec: ans, flaws: [] }];
      const take = (c) => {
        const k = keyOf(c.spec);
        if (seen.has(k) || options.length >= 8) return false;
        seen.add(k);
        options.push({ spec: c.spec, flaws: c.flaws });
        return true;
      };
      const byType = (t) => cands.filter((c) => c.type === t);
      rng.shuffle(['metric', 'ties', 'move', 'swap', 'disp', 'stale', 'slip']).forEach((t) => byType(t).some(take));
      ['move', 'euclid', 'band', 'slip', 'swapglyph', 'copy32', 'disp', 'move', 'swap'].forEach((t) => byType(t).some(take));
      rng.shuffle(cands).forEach(take);
      RM.need(options.length === 8);
      RM.need(options.slice(1).every((o) => o.flaws.length > 0));

      /* ---- correction */
      const names = NAMES.slice(0, n);
      const texList = listTxt(names.map((nm, i) => `${nm} → ${TEX[i]}`));
      let ev = null;
      for (const [r, c] of visible) {
        const i = M[r][c].indexOf(-1);
        if (i >= 0 && r < 2) {
          ev = `In panel (${r + 1},${c + 1}), for example, ${cellName(i % N, Math.floor(i / N))} is white: it is ${distTxt(P[r][c], i % N, Math.floor(i / N))}.`;
          break;
        }
      }
      const rules = [];
      rules.push({
        k: 'Maps',
        t: `Each panel is a 7 × 7 map (squares named R<i>row</i>C<i>column</i> from the top-left) with ${n} capitals. Every square belongs to the capital <b>nearest</b> to it and takes its texture: ${texList}.`,
      });
      rules.push({
        k: 'Distance & borders',
        t:
          (metric === 'L1'
            ? 'Distance is counted in <b>steps along rows and columns</b> (a diagonal costs two steps). '
            : 'Distance is counted in <b>king moves</b>: a diagonal step costs one, so the distance is the larger of the row gap and the column gap. ') +
          `A square equally far from its two (or more) nearest capitals is a border and stays <b>white</b>. ${ev || ''}`,
      });
      if (!cyc)
        rules.push({
          k: 'Movement',
          t: `From one column to the next each capital moves by its own constant step, the same in all rows: ${listTxt(names.map((nm, i) => `${nm} ${vecTxt(vecs[i])}`))}.`,
        });
      else
        rules.push({
          k: 'Movement',
          t: `From one column to the next the capitals change places in a cycle — ${listTxt(names.map((nm, i) => `the ${nm} goes where the ${NAMES[sigma[i]]} was`))} — and then the whole group moves ${vecTxt(drift)}.`,
        });
      rules.push({
        k: 'Missing capitals',
        t: `From panel (3,2): ${listTxt(names.map((nm, i) => `${nm} ${posName(prev[cyc ? sigma[i] : i])} → <b>${posName(C[i])}</b>`))}${cyc ? ` (place taken, then ${vecTxt(drift)})` : ''}.`,
      });
      const wl = [];
      ans.map.forEach((v, i) => v < 0 && wl.push(`${cellName(i % N, Math.floor(i / N))} (${distTxt(C, i % N, Math.floor(i / N))})`));
      rules.push({
        k: 'Missing map',
        t: `Measuring every square from these positions: ${listTxt(names.map((nm, i) => `${nm} ${ans.map.filter((v) => v === i).length} squares`))}, and ${wAns} white border square${wAns > 1 ? 's' : ''}: ${wl.join('; ')}. <b>Answer: ${listTxt(names.map((nm, i) => `${nm} at ${posName(C[i])}`))}, with ${wAns} white square${wAns > 1 ? 's' : ''} (${wl.map((t) => t.split(' ')[0]).join(', ')}).</b>`,
      });

      return {
        panels: visible.map(([r, c]) => ({ caps: P[r][c], map: M[r][c] })),
        answer: ans,
        options,
        render,
        key: keyOf,
        rules,
        hint: cyc
          ? 'Watch whose place each capital takes, and where the whole group drifts; then let every square choose its nearest capital.'
          : 'Every square belongs to its nearest capital; the white squares tell you how distance is counted.',
        difficulty: variant === 2 ? 8 : 7,
      };
    },
  });
})();
