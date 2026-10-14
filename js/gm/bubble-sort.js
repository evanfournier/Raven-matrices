/* Sorting passes (grandmaster): six towers of 1–6 stacked pebbles stand in six slots. Each row starts from a
 * jumbled line (column 1); column 2 shows it after ONE step of a sorting method and column 3 after TWO steps. The
 * method is fixed for the whole puzzle and must be recognised from the moves: bubble pass left→right or right→left,
 * shaker sort (passes alternating in direction), selection (the extreme remaining tower swaps into the next slot from
 * one end), insertion (the next tower slides into the ordered part at one end) or odd–even transposition (fixed pairs
 * of neighbours, the pairing alternating every step) — sorting towards "shortest on the left" or "tallest on the left".
 * Uniqueness is checked against every method above, their mirror images and order directions, "stable" selection
 * (shift instead of swap), insertion from an empty prefix, fixed-phase odd–even, single-inversion swaps, 2 or 3 steps
 * per column, step counts continuing from row to row, and "column 3 is fully sorted". */
(function () {
  'use strict';
  const RM = window.RM;
  const N = 6;
  const FILLS = [null, 'white', 'light', 'hatch', 'gray', 'dark', 'black']; // fill of a tower, by its height
  const X0 = 11.5;
  const DX = 15.4;
  const BASE = 85;
  const RX = 6.1;
  const RY = 4.05;
  const STEP = 8.1;

  /* ---------------------------------------------------------------- sorting steps
   * asc = true: final order "shortest on the left"; asc = false: "tallest on the left".
   * bef(x, y): tower x belongs to the left of tower y. */
  const bef = (x, y, asc) => (asc ? x < y : x > y);
  const sw = (a, i, j) => {
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  };
  function fwd(a0, asc) {
    const a = a0.slice();
    for (let i = 0; i < N - 1; i++) if (bef(a[i + 1], a[i], asc)) sw(a, i, i + 1);
    return a;
  }
  function bwd(a0, asc) {
    const a = a0.slice();
    for (let i = N - 2; i >= 0; i--) if (bef(a[i + 1], a[i], asc)) sw(a, i, i + 1);
    return a;
  }
  function selFrontIdx(a, asc, k) {
    let m = k;
    for (let j = k + 1; j < N; j++) if (bef(a[j], a[m], asc)) m = j;
    return m;
  }
  function selBackIdx(a, asc, p) {
    let m = p;
    for (let j = p - 1; j >= 0; j--) if (bef(a[m], a[j], asc)) m = j;
    return m;
  }
  function selF(a0, asc, k, shift) {
    const a = a0.slice();
    if (k >= N - 1) return a;
    const m = selFrontIdx(a, asc, k);
    if (shift) a.splice(k, 0, a.splice(m, 1)[0]);
    else sw(a, k, m);
    return a;
  }
  function selB(a0, asc, k, shift) {
    const a = a0.slice();
    const p = N - 1 - k;
    if (p <= 0) return a;
    const m = selBackIdx(a, asc, p);
    if (shift) a.splice(p, 0, a.splice(m, 1)[0]);
    else sw(a, p, m);
    return a;
  }
  function insL(a0, asc, k) {
    const a = a0.slice();
    if (k <= 0 || k >= N) return a;
    for (let j = k; j > 0 && bef(a[j], a[j - 1], asc); j--) sw(a, j, j - 1);
    return a;
  }
  function insR(a0, asc, k) {
    const a = a0.slice();
    const s = N - 1 - k;
    if (s < 0 || s >= N - 1) return a;
    for (let j = s; j < N - 1 && bef(a[j + 1], a[j], asc); j++) sw(a, j, j + 1);
    return a;
  }
  function oe(a0, asc, ph) {
    const a = a0.slice();
    for (let i = ph; i + 1 < N; i += 2) if (bef(a[i + 1], a[i], asc)) sw(a, i, i + 1);
    return a;
  }
  function invL(a0, asc) {
    const a = a0.slice();
    for (let i = 0; i < N - 1; i++)
      if (bef(a[i + 1], a[i], asc)) {
        sw(a, i, i + 1);
        break;
      }
    return a;
  }
  function invR(a0, asc) {
    const a = a0.slice();
    for (let i = N - 2; i >= 0; i--)
      if (bef(a[i + 1], a[i], asc)) {
        sw(a, i, i + 1);
        break;
      }
    return a;
  }

  /* Every method a solver could reasonably consider; step(a, asc, t) applies step number t (0-based). */
  const ALGS = {
    bubbleL: (a, asc) => fwd(a, asc),
    bubbleR: (a, asc) => bwd(a, asc),
    shakerL: (a, asc, t) => (t % 2 ? bwd(a, asc) : fwd(a, asc)),
    shakerR: (a, asc, t) => (t % 2 ? fwd(a, asc) : bwd(a, asc)),
    selF: (a, asc, t) => selF(a, asc, t, false),
    selB: (a, asc, t) => selB(a, asc, t, false),
    selFs: (a, asc, t) => selF(a, asc, t, true),
    selBs: (a, asc, t) => selB(a, asc, t, true),
    insL: (a, asc, t) => insL(a, asc, t + 1),
    insR: (a, asc, t) => insR(a, asc, t + 1),
    insL0: (a, asc, t) => insL(a, asc, t),
    insR0: (a, asc, t) => insR(a, asc, t),
    oe0: (a, asc, t) => oe(a, asc, t % 2),
    oe1: (a, asc, t) => oe(a, asc, (t + 1) % 2),
    oeC0: (a, asc) => oe(a, asc, 0),
    oeC1: (a, asc) => oe(a, asc, 1),
    invL: (a, asc) => invL(a, asc),
    invR: (a, asc) => invR(a, asc),
  };
  const ALG_IDS = Object.keys(ALGS);
  const PATTERNS = [
    [1, 2],
    [2, 4],
    [1, 3],
  ];
  const HYPS = [];
  ALG_IDS.forEach((alg) =>
    [true, false].forEach((asc) =>
      PATTERNS.forEach((pat) => [false, true].forEach((cont) => HYPS.push({ alg, asc, pat, cont })))
    )
  );
  const run = (alg, asc, a, n, off) => {
    let s = a;
    for (let t = off; t < off + n; t++) s = ALGS[alg](s, asc, t);
    return s;
  };
  const K = (a) => a.join('');
  const sortedAsc = (a) => a.slice().sort((x, y) => x - y);
  const isSorted = (a) => K(a) === '123456' || K(a) === '654321';

  /* ---------------------------------------------------------------- words */
  const seq = (a) => a.join('&thinsp;');
  const slotList = (ix) => {
    const s = ix.map((i) => i + 1);
    return s.length === 1 ? 'slot ' + s[0] : 'slots ' + s.slice(0, -1).join(', ') + ' and ' + s[s.length - 1];
  };
  /* Short name of step t of a method, for flaws. */
  function stepName(alg, asc, t) {
    const lt = asc ? 'tallest' : 'shortest';
    const fs = asc ? 'shortest' : 'tallest';
    const dir = asc ? '' : ' (ordering tallest-first)';
    const fwdN = `a left→right bubble pass carrying the ${lt} tower to the right end${dir}`;
    const bwdN = `a right→left bubble pass carrying the ${fs} tower to the left end${dir}`;
    switch (alg) {
      case 'bubbleL':
        return fwdN;
      case 'bubbleR':
        return bwdN;
      case 'shakerL':
        return t % 2 ? bwdN : fwdN;
      case 'shakerR':
        return t % 2 ? fwdN : bwdN;
      case 'selF':
        return `a selection swap putting the ${fs} remaining tower into slot ${t + 1}${dir}`;
      case 'selB':
        return `a selection swap putting the ${lt} remaining tower into slot ${N - t}${dir}`;
      case 'selFs':
        return `moving the ${fs} remaining tower into slot ${t + 1} and shifting the others right (instead of swapping two towers)${dir}`;
      case 'selBs':
        return `moving the ${lt} remaining tower into slot ${N - t} and shifting the others left (instead of swapping two towers)${dir}`;
      case 'insL':
        return `inserting the tower of slot ${t + 2} into the ordered towers on its left${dir}`;
      case 'insR':
        return `inserting the tower of slot ${N - t - 1} into the ordered towers on its right${dir}`;
      case 'insL0':
        return `inserting the tower of slot ${t + 1} into the ordered towers on its left${dir}`;
      case 'insR0':
        return `inserting the tower of slot ${N - t} into the ordered towers on its right${dir}`;
      case 'oe0':
      case 'oe1':
      case 'oeC0':
      case 'oeC1': {
        const ph = alg === 'oe0' ? t % 2 : alg === 'oe1' ? (t + 1) % 2 : alg === 'oeC0' ? 0 : 1;
        return `comparing the neighbour pairs ${ph ? '2–3 and 4–5' : '1–2, 3–4 and 5–6'}${dir}`;
      }
      case 'invL':
        return `swapping only the leftmost pair of neighbours that is out of order${dir}`;
      case 'invR':
        return `swapping only the rightmost pair of neighbours that is out of order${dir}`;
    }
    return alg;
  }

  /* ---------------------------------------------------------------- drawing */
  function render(sp) {
    const pic = new RM.Pic();
    RM.line(pic, 4.5, BASE + 1.4, 95.5, BASE + 1.4, { sw: 1.8 });
    sp.a.forEach((h, i) => {
      const x = X0 + i * DX;
      const fill = pic.paint(FILLS[h]);
      for (let k = 0; k < h; k++) {
        const y = BASE - RY - k * STEP;
        pic.add(
          `<ellipse cx="${RM.fmt(x)}" cy="${RM.fmt(y)}" rx="${RX}" ry="${RY}" fill="${fill}" stroke="${RM.INK}" stroke-width="1.5"/>`
        );
      }
    });
    return pic.svg();
  }

  /* ---------------------------------------------------------------- generation */
  const POOLS = [
    ['bubbleL', 'bubbleR', 'shakerL', 'shakerR', 'selF', 'selB', 'insL', 'insR', 'oe0', 'oe1'],
    ['bubbleL', 'bubbleR', 'shakerL', 'shakerR'],
    ['selF', 'selB', 'insL', 'insR'],
    ['oe0', 'oe1', 'shakerL', 'shakerR'],
  ];
  const DIFF = [7, 6, 7, 8];

  function perm(rng) {
    return rng.shuffle([1, 2, 3, 4, 5, 6]);
  }

  /* All hypotheses consistent with the visible panels, and their predictions for the missing one. */
  function predictions(rows) {
    const preds = new Map();
    for (const h of HYPS) {
      let ok = true;
      for (let r = 0; r < 3 && ok; r++) {
        const off = h.cont ? r * h.pat[1] : 0;
        const p2 = run(h.alg, h.asc, rows[r][0], h.pat[0], off);
        if (K(p2) !== K(rows[r][1])) ok = false;
        else if (r < 2) {
          const p3 = run(h.alg, h.asc, p2, h.pat[1] - h.pat[0], off + h.pat[0]);
          if (K(p3) !== K(rows[r][2])) ok = false;
        }
      }
      if (!ok) continue;
      const off = h.cont ? 2 * h.pat[1] : 0;
      const pr = run(h.alg, h.asc, rows[2][1], h.pat[1] - h.pat[0], off + h.pat[0]);
      preds.set(K(pr), (preds.get(K(pr)) || 0) + 1);
    }
    // shortcut: "column 3 is the fully sorted line"
    [true, false].forEach((asc) => {
      const srt = (a) => (asc ? sortedAsc(a) : sortedAsc(a).reverse());
      if ([0, 1].every((r) => K(srt(rows[r][0])) === K(rows[r][2]))) preds.set(K(srt(rows[2][0])), 1);
    });
    return preds;
  }

  function generate(rng, variant) {
    const v = variant % 4;
    const alg = rng.pick(POOLS[v]);
    const asc = rng.chance(0.5);
    const step = (a, t) => ALGS[alg](a, asc, t);

    let rows = null;
    for (let tries = 0; tries < 40 && !rows; tries++) {
      const cand = [];
      const seen = new Set();
      for (let r = 0; r < 3; r++) {
        let row = null;
        for (let k = 0; k < 40 && !row; k++) {
          const s = perm(rng);
          if (seen.has(K(s)) || isSorted(s)) continue;
          const b = step(s, 0);
          const c = step(b, 1);
          if (K(b) === K(s) || K(c) === K(b) || K(c) === K(s)) continue;
          if (r === 2 && isSorted(c)) continue;
          row = [s, b, c];
        }
        if (!row) break;
        seen.add(K(row[0]));
        cand.push(row);
      }
      if (cand.length < 3) continue;
      const preds = predictions(cand);
      if (preds.size !== 1 || !preds.has(K(cand[2][2]))) continue;
      rows = cand;
    }
    RM.need(rows);
    const S = rows[2][0];
    const C2 = rows[2][1];
    const A = rows[2][2];

    // No simple Raven rule on a single slot (its height) or a single tower (its slot) may predict something else.
    for (let i = 0; i < N; i++) {
      RM.needNoConflict(RM.grid3((r, c) => rows[r][c][i]), A[i], 'numeric');
      const h = i + 1;
      RM.needNoConflict(RM.grid3((r, c) => rows[r][c].indexOf(h)), A.indexOf(h), 'numeric');
    }

    /* ------------------------------------------------ distractors */
    const cands = [];
    const add = (a, tier, why, tag) => cands.push({ a, tier, why, tag });
    const ansName = stepName(alg, asc, 1);
    // the natural misreadings: another kind of step applied to panel (3,2)
    ALG_IDS.forEach((a2) =>
      [asc, !asc].forEach((o2) =>
        [1, 0].forEach((t) => {
          if (a2 === alg && o2 === asc && t === 1) return;
          const x = ALGS[a2](C2, o2, t);
          const close = o2 === asc && POOLS[0].indexOf(a2) >= 0;
          add(x, close ? 0 : 2, `this is panel (3,2) after ${stepName(a2, o2, t)} — but the second step of this method is ${ansName}.`);
        })
      )
    );
    add(C2, 1, 'this is panel (3,2) itself: the second step of the method has not been applied.');
    add(step(A, 2), 1, 'one step too many: this is the row after a third step of the method.', 'extra');
    add(step(step(A, 2), 3), 3, 'two steps too many: the row has been sorted further than column 3 allows.');
    add(asc ? sortedAsc(S) : sortedAsc(S).reverse(), 2, 'this is the completely sorted line, but two steps of the method do not finish the job here.');
    add(S, 3, 'this is the starting line of row 3 (panel (3,1)): nothing has been sorted.');
    // wrong method from the very start of row 3 (ignores the visible middle panel)
    ALG_IDS.forEach((a2) =>
      [asc, !asc].forEach((o2) => {
        if (a2 === alg && o2 === asc) return;
        add(run(a2, o2, S, 2, 0), 3, `this is panel (3,1) after two steps of the wrong method (${stepName(a2, o2, 0)}, …) — it does not even pass through panel (3,2).`);
      })
    );
    // right towers, two of them swapped
    for (let i = 0; i < N - 1; i++) {
      const x = A.slice();
      sw(x, i, i + 1);
      add(x, 1, `two neighbouring towers (the ${A[i]} and the ${A[i + 1]} in ${slotList([i, i + 1])}) are swapped compared with the correct result.`, 'swap');
    }
    const E = step(A, 2);
    for (let i = 0; i < N - 1; i++) {
      const x = E.slice();
      sw(x, i, i + 1);
      add(x, 3, 'a third step was applied, and two neighbouring towers are out of place as well.', 'swap2');
    }

    const diffText = (x) => {
      const ix = RM.range(N).filter((i) => x[i] !== A[i]);
      return `${RM.cap(slotList(ix))} should hold the ${ix.map((i) => A[i]).join(', ')}-pebble tower${ix.length > 1 ? 's' : ''} (left to right), not ${ix.map((i) => x[i]).join(', ')}.`;
    };
    // dedupe (keep the most tempting reading of each picture), drop anything that is the answer
    const byKey = new Map();
    cands.forEach((c) => {
      const k = K(c.a);
      if (k === K(A)) return;
      const o = byKey.get(k);
      if (!o || c.tier < o.tier) byKey.set(k, c);
    });
    const pool = Array.from(byKey.values());
    RM.need(pool.length >= 7);
    let chosen = null;
    for (let tries = 0; tries < 30 && !chosen; tries++) {
      const order = rng.shuffle(pool).sort((p, q) => p.tier + (p.tag === 'swap' ? 0.5 : 0) - (q.tier + (q.tag === 'swap' ? 0.5 : 0)));
      const pick = [];
      let swaps = 0;
      const noise = rng.next() < 0.5 ? 1 : 0;
      for (const c of order) {
        if (pick.length >= 7) break;
        if (c.tag === 'swap' && swaps >= 2) continue;
        if (c.tier === 0 && pick.filter((p) => p.tier === 0).length >= 4 - noise) continue;
        if (c.tag === 'swap') swaps++;
        pick.push(c);
      }
      if (pick.length < 7) {
        for (const c of order) if (pick.length < 7 && pick.indexOf(c) < 0) pick.push(c);
      }
      // the answer must not be the "centre" of the options (most slots shared with the others)
      const all = [A].concat(pick.map((p) => p.a));
      const score = all.map((x, i) => all.reduce((s, y, j) => s + (i === j ? 0 : x.filter((v, q) => v === y[q]).length), 0));
      if (score.slice(1).some((s) => s >= score[0])) chosen = pick;
    }
    RM.need(chosen);

    /* ------------------------------------------------ correction text */
    const lt = asc ? 'tallest' : 'shortest';
    const fs = asc ? 'shortest' : 'tallest';
    const lt2 = asc ? 'taller' : 'shorter';
    const goal = asc ? 'shortest on the left, tallest on the right' : 'tallest on the left, shortest on the right';
    const lastV = asc ? 6 : 1;
    const firstV = asc ? 1 : 6;
    const METHOD = {
      bubbleL: `each step is one <b>bubble pass from left to right</b>: compare the towers in slots 1–2, then 2–3, … up to 5–6, and swap the two whenever the left one is ${lt2}. The ${lt} tower is thus carried all the way to the right end.`,
      bubbleR: `each step is one <b>bubble pass from right to left</b>: compare the towers in slots 5–6, then 4–5, … down to 1–2, and swap the two whenever the left one is ${lt2}. The ${fs} tower is thus carried all the way to the left end.`,
      shakerL: `a <b>shaker sort</b>: bubble passes whose direction alternates. Column 2 = a pass from <b>left to right</b> (compare slots 1–2, 2–3, … 5–6, swap when the left tower is ${lt2}: the ${lt} tower is carried to the right end); column 3 = a pass from <b>right to left</b> (slots 5–6, 4–5, … 1–2: the ${fs} tower is carried to the left end).`,
      shakerR: `a <b>shaker sort</b>: bubble passes whose direction alternates. Column 2 = a pass from <b>right to left</b> (compare slots 5–6, 4–5, … 1–2, swap when the left tower is ${lt2}: the ${fs} tower is carried to the left end); column 3 = a pass from <b>left to right</b> (slots 1–2, 2–3, … 5–6: the ${lt} tower is carried to the right end).`,
      selF: `a <b>selection sort</b>: step 1 finds the ${fs} tower of the whole line and swaps it with the tower in slot 1; step 2 finds the ${fs} tower among slots 2–6 and swaps it with the tower in slot 2. Only two towers trade places at each step.`,
      selB: `a <b>selection sort from the right</b>: step 1 finds the ${lt} tower of the whole line and swaps it with the tower in slot 6; step 2 finds the ${lt} tower among slots 1–5 and swaps it with the tower in slot 5. Only two towers trade places at each step.`,
      insL: `an <b>insertion sort</b>: the towers on the left are kept in order and grow by one each step. Step 1 takes the tower in slot 2 and slides it left past every ${lt2} tower; step 2 does the same with the tower in slot 3. Towers further right do not move yet.`,
      insR: `an <b>insertion sort from the right</b>: the towers on the right are kept in order and grow by one each step. Step 1 takes the tower in slot 5 and slides it right past every tower that should come before it (every ${asc ? 'shorter' : 'taller'} one); step 2 does the same with the tower in slot 4. Towers further left do not move yet.`,
      oe0: `an <b>odd–even transposition sort</b>: towers are compared in fixed pairs of neighbours and each pair whose left tower is ${lt2} is swapped. Step 1 uses the pairs of slots 1–2, 3–4, 5–6; step 2 uses the pairs 2–3 and 4–5 (slots 1 and 6 sit out). The pairing alternates every step.`,
      oe1: `an <b>odd–even transposition sort</b>: towers are compared in fixed pairs of neighbours and each pair whose left tower is ${lt2} is swapped. Step 1 uses the pairs of slots 2–3 and 4–5 (slots 1 and 6 sit out); step 2 uses the pairs 1–2, 3–4, 5–6. The pairing alternates every step.`,
    };
    const second = asc ? 5 : 2;
    const secondF = asc ? 2 : 5;
    const CLUE = {
      bubbleL: `in column 2 the ${lastV} has reached the right end, in column 3 the ${second} stands next to it, and every tower that moved left moved exactly one slot — the mark of neighbour swaps sweeping from left to right. A selection or insertion step would move only one or two towers.`,
      bubbleR: `in column 2 the ${firstV} has reached the left end, in column 3 the ${secondF} stands next to it, and every tower that moved right moved exactly one slot — the mark of neighbour swaps sweeping from right to left.`,
      shakerL: `from column 1 to 2 the ${lastV} is carried to the right end and the towers it passes step one slot left; from column 2 to 3 it is the ${firstV} that is carried to the left end while the others step one slot right. A second left→right pass would bring the ${second} next to the ${lastV} instead.`,
      shakerR: `from column 1 to 2 the ${firstV} is carried to the left end and the towers it passes step one slot right; from column 2 to 3 it is the ${lastV} that is carried to the right end while the others step one slot left. A second right→left pass would bring the ${secondF} next to the ${firstV} instead.`,
      selF: `between two columns exactly two towers trade places: in column 2 the ${firstV} has come to slot 1, in column 3 the ${secondF} has come to slot 2; every other tower stays where it was.`,
      selB: `between two columns exactly two towers trade places: in column 2 the ${lastV} has come to slot 6, in column 3 the ${second} has come to slot 5; every other tower stays where it was.`,
      insL: `only the left of each row changes: in column 2 the first two towers are in order, in column 3 the first three; the towers in slots 4–6 never move, and the towers that make room shift one slot right.`,
      insR: `only the right of each row changes: in column 2 the last two towers are in order, in column 3 the last three; the towers in slots 1–3 never move, and the towers that make room shift one slot left.`,
      oe0: `no tower ever moves more than one slot per column, and swaps happen only inside the pairs 1–2, 3–4, 5–6 in column 2 and inside the pairs 2–3, 4–5 in column 3 — several pairs at once.`,
      oe1: `no tower ever moves more than one slot per column, and swaps happen only inside the pairs 2–3, 4–5 in column 2 and inside the pairs 1–2, 3–4, 5–6 in column 3 — several pairs at once.`,
    };
    // trace of step 2 (t = 1) from panel (3,2)
    function trace(a0) {
      const a = a0.slice();
      const pairs = [];
      const doPass = (idx) => {
        idx.forEach((i) => {
          const s = bef(a[i + 1], a[i], asc);
          pairs.push(`${a[i]}·${a[i + 1]} ${s ? '<b>swap</b>' : 'keep'}`);
          if (s) sw(a, i, i + 1);
        });
      };
      const F = [0, 1, 2, 3, 4];
      const B = [4, 3, 2, 1, 0];
      if (alg === 'bubbleL' || alg === 'shakerR') {
        doPass(F);
        return `left to right: ${pairs.join(', ')}`;
      }
      if (alg === 'bubbleR' || alg === 'shakerL') {
        doPass(B);
        return `right to left: ${pairs.join(', ')}`;
      }
      if (alg === 'oe0' || alg === 'oe1') {
        const ph = alg === 'oe0' ? 1 : 0;
        doPass(ph ? [1, 3] : [0, 2, 4]);
        return `pairs ${ph ? '2–3, 4–5' : '1–2, 3–4, 5–6'}: ${pairs.join(', ')}`;
      }
      if (alg === 'selF') {
        const m = selFrontIdx(a, asc, 1);
        return `the ${fs} tower among slots 2–6 is the ${a[m]} in slot ${m + 1}; it trades places with the ${a[1]} in slot 2`;
      }
      if (alg === 'selB') {
        const m = selBackIdx(a, asc, 4);
        return `the ${lt} tower among slots 1–5 is the ${a[m]} in slot ${m + 1}; it trades places with the ${a[4]} in slot 5`;
      }
      if (alg === 'insL') {
        const x = a[2];
        const past = [];
        for (let j = 2; j > 0 && bef(a[j], a[j - 1], asc); j--) {
          past.push(a[j - 1]);
          sw(a, j, j - 1);
        }
        return `the ${x} in slot 3 slides left past the ${past.join(' and the ')} (they shift one slot right)`;
      }
      if (alg === 'insR') {
        const x = a[3];
        const past = [];
        for (let j = 3; j < N - 1 && bef(a[j + 1], a[j], asc); j++) {
          past.push(a[j + 1]);
          sw(a, j, j + 1);
        }
        return `the ${x} in slot 4 slides right past the ${past.join(' and the ')} (they shift one slot left)`;
      }
      return '';
    }
    const STEP1 = {
      bubbleL: 'one left→right pass',
      bubbleR: 'one right→left pass',
      shakerL: 'the left→right pass',
      shakerR: 'the right→left pass',
      selF: `the ${fs} tower swapped into slot 1`,
      selB: `the ${lt} tower swapped into slot 6`,
      insL: 'the tower of slot 2 inserted on its left',
      insR: 'the tower of slot 5 inserted on its right',
      oe0: 'the pairs 1–2, 3–4, 5–6 compared',
      oe1: 'the pairs 2–3 and 4–5 compared',
    };
    const NAME = {
      bubbleL: 'Bubble pass',
      bubbleR: 'Bubble pass',
      shakerL: 'Shaker sort',
      shakerR: 'Shaker sort',
      selF: 'Selection sort',
      selB: 'Selection sort',
      insL: 'Insertion sort',
      insR: 'Insertion sort',
      oe0: 'Odd–even sort',
      oe1: 'Odd–even sort',
    };
    const r1 = rows[0];

    return {
      panels: RM.flat(RM.grid3((r, c) => ({ a: rows[r][c] }))),
      answer: { a: A },
      options: [{ spec: { a: A }, flaws: [] }].concat(chosen.map((c) => ({ spec: { a: c.a }, flaws: [c.why, diffText(c.a)] }))),
      render,
      key: (sp) => K(sp.a),
      difficulty: DIFF[v],
      hint: 'The towers are being put in order — but by which method? Compare carefully which towers move, and how far, from one column to the next.',
      rules: [
        {
          k: 'Reading the panels',
          t: `every panel shows the same six towers of 1 to 6 pebbles; read a panel as the list of tower heights from left to right (e.g. row 1, panel 1 = ${seq(r1[0])}). Each row starts from a jumbled line in column 1; column 2 is that line after <b>one step</b> of a sorting method and column 3 after <b>two steps</b>. The method, and the target order (${goal}), are the same in every row.`,
        },
        { k: NAME[alg], t: RM.cap(METHOD[alg]) },
        {
          k: 'How to recognise it',
          t: `row 1: ${seq(r1[0])} → ${seq(r1[1])} → ${seq(r1[2])}; row 2: ${seq(rows[1][0])} → ${seq(rows[1][1])} → ${seq(rows[1][2])}. ${RM.cap(CLUE[alg])}`,
        },
        {
          k: 'Missing panel',
          t: `row 3 starts from ${seq(S)}; panel (3,2) = ${seq(C2)} is indeed ${STEP1[alg]}. Now apply step 2 to ${seq(C2)} — ${trace(C2)} → <b>${seq(A)}</b>.`,
        },
      ],
    };
  }

  RM.register({
    id: 'bubble-sort',
    name: 'Sorting passes',
    difficulty: 7,
    generate,
  });
})();
