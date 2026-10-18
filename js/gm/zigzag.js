/* Reading order (grandmaster): every panel shows the same sailboat, only turned by multiples of 45°, with a white,
 * gray or black sail. The nine cells form ONE sequence, but not in book order: they are visited along a hidden path
 * (snake, spiral, zigzag along the diagonals, diagonal by diagonal…, starting from any corner). Along that path each
 * boat is the previous one turned by a constant angle and the sail colours repeat in a cycle of three. The missing
 * bottom-right cell is the first, the last or the middle cell of the path. Variant 3 puts two boats in each panel,
 * each with its own turning step. Uniqueness is checked against every reading order a solver could hold (all named
 * orders from every corner in both directions, every rook path, every "ring + centre" order) and against simple
 * row/column/diagonal and counting shortcuts. */
(function () {
  'use strict';
  const RM = window.RM;

  const DIR = ['right', 'down-right', 'down', 'down-left', 'left', 'up-left', 'up', 'up-right'];
  const CELL = ['top-left', 'top-middle', 'top-right', 'middle-left', 'centre', 'middle-right', 'bottom-left', 'bottom-middle', 'bottom-right'];
  const COLS = ['white', 'gray', 'black'];
  const STEPS = [1, 7, 3, 5, 2, 6];

  const rc = (i) => [(i / 3) | 0, i % 3];
  const mapT = (f) => (i) => {
    const [r, c] = rc(i);
    const [r2, c2] = f(r, c);
    return r2 * 3 + c2;
  };
  const D4 = [
    (r, c) => [r, c],
    (r, c) => [c, 2 - r],
    (r, c) => [2 - r, 2 - c],
    (r, c) => [2 - c, r],
    (r, c) => [r, 2 - c],
    (r, c) => [2 - r, c],
    (r, c) => [c, r],
    (r, c) => [2 - c, 2 - r],
  ].map(mapT);
  const BASE = {
    row: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    snake: [0, 1, 2, 5, 4, 3, 6, 7, 8],
    spiral: [0, 1, 2, 5, 8, 7, 6, 3, 4],
    zigzag: [0, 1, 3, 6, 4, 2, 5, 7, 8],
    diag: [0, 1, 3, 2, 4, 6, 5, 7, 8],
  };

  let NAMED = null;
  let HYP = null;
  function init() {
    if (HYP) return;
    NAMED = {};
    const seen = new Set();
    HYP = [];
    const addH = (s) => {
      const k = s.join('');
      if (!seen.has(k)) {
        seen.add(k);
        HYP.push(s);
      }
    };
    Object.keys(BASE).forEach((type) => {
      const loc = new Set();
      NAMED[type] = [];
      D4.forEach((t) =>
        [false, true].forEach((rev) => {
          let s = BASE[type].map(t);
          if (rev) s = s.slice().reverse();
          const k = s.join('');
          if (loc.has(k)) return;
          loc.add(k);
          NAMED[type].push({ type, seq: s });
          addH(s);
        })
      );
    });
    // every rook-move path through the nine cells (snakes, spirals and all their cousins)
    const adj = RM.range(9).map((i) =>
      RM.range(9).filter((j) => {
        const [r, c] = rc(i);
        const [r2, c2] = rc(j);
        return Math.abs(r - r2) + Math.abs(c - c2) === 1;
      })
    );
    const path = [];
    const used = new Array(9).fill(false);
    const dfs = (i) => {
      path.push(i);
      used[i] = true;
      if (path.length === 9) addH(path.slice());
      else adj[i].forEach((j) => !used[j] && dfs(j));
      path.pop();
      used[i] = false;
    };
    for (let i = 0; i < 9; i++) dfs(i);
    // the outer ring read from any cell in either direction, centre first or last
    const ring = [0, 1, 2, 5, 8, 7, 6, 3];
    for (let s = 0; s < 8; s++)
      for (const dir of [1, -1]) {
        const rs = RM.range(8).map((k) => ring[RM.mod(s + dir * k, 8)]);
        addH([4].concat(rs));
        addH(rs.concat([4]));
      }
  }

  /* ---- hypothesis checkers (cell 8 = bottom-right is treated as unknown) ---- */
  function stepPreds(vals, seq) {
    const p = seq.indexOf(8);
    const ref = p === 0 ? 1 : 0;
    const hr = vals[seq[ref]];
    const out = [];
    for (let d = 0; d < 8; d++) {
      let ok = true;
      for (let i = 0; i < 9 && ok; i++) if (i !== p && RM.mod(hr + d * (i - ref), 8) !== vals[seq[i]]) ok = false;
      if (ok) out.push(RM.mod(hr + d * (p - ref), 8));
    }
    return out;
  }
  function cyclePred(cols, seq) {
    const p = seq.indexOf(8);
    const cls = [null, null, null];
    for (let i = 0; i < 9; i++) {
      if (i === p) continue;
      const m = i % 3;
      if (cls[m] === null) cls[m] = cols[seq[i]];
      else if (cls[m] !== cols[seq[i]]) return null;
    }
    return cls[p % 3];
  }
  function affinePreds(vals) {
    const out = [];
    for (let b = 0; b < 8; b++)
      for (let e = 0; e < 8; e++) {
        let ok = true;
        for (let i = 1; i < 8 && ok; i++) {
          const [r, c] = rc(i);
          if (RM.mod(vals[0] + b * r + e * c, 8) !== vals[i]) ok = false;
        }
        if (ok) out.push(RM.mod(vals[0] + 2 * b + 2 * e, 8));
      }
    return out;
  }
  function colourClassPreds(cols) {
    const out = [];
    for (let b = 0; b < 3; b++)
      for (let e = 0; e < 3; e++) {
        if (!b && !e) continue;
        const cls = {};
        let ok = true;
        for (let i = 0; i < 8 && ok; i++) {
          const [r, c] = rc(i);
          const m = (b * r + e * c) % 3;
          if (cls[m] === undefined) cls[m] = cols[i];
          else if (cls[m] !== cols[i]) ok = false;
        }
        if (ok) out.push(cls[(2 * b + 2 * e) % 3]);
      }
    return out;
  }
  /* "count the directions" shortcut: the answer must not be the unique least frequent heading */
  function countShortcut(vals, ans) {
    const cnt = new Array(8).fill(0);
    for (let i = 0; i < 8; i++) cnt[vals[i]]++;
    const m = cnt[ans];
    for (let k = 0; k < 8; k++) if (k !== ans && cnt[k] > 0 && cnt[k] <= m) return false;
    return true;
  }
  const grid = (vals) => RM.grid3((r, c) => (r === 2 && c === 2 ? undefined : vals[r * 3 + c]));

  /* ---- words ---- */
  function turnWords(d) {
    const a = d <= 4 ? d : 8 - d;
    return { ang: a * 45, sense: d <= 4 ? 'clockwise' : 'anticlockwise', back: d <= 4 ? 'anticlockwise' : 'clockwise' };
  }
  function orderName(type, seq) {
    const a = CELL[seq[0]];
    const z = CELL[seq[8]];
    if (type === 'snake') {
      const byRow = rc(seq[0])[0] === rc(seq[1])[0];
      return `a <b>snake</b> ${byRow ? 'row by row' : 'column by column'}, turning back at each edge, from the ${a} to the ${z} corner`;
    }
    if (type === 'spiral') {
      const inward = seq[8] === 4;
      const i = inward ? 0 : 1;
      const [ar, ac] = rc(seq[i]);
      const [br, bc] = rc(seq[i + 1]);
      const cross = (ac - 1) * (br - 1) - (ar - 1) * (bc - 1);
      const sense = cross > 0 ? 'clockwise' : 'anticlockwise';
      return inward
        ? `a <b>${sense} spiral inwards</b>, from the ${a} corner around the edge to the centre`
        : `a <b>${sense} spiral outwards</b>, from the centre around the edge to the ${z} corner`;
    }
    if (type === 'zigzag') return `a <b>zigzag along the diagonals</b> (each diagonal read in the opposite direction to the previous one), from the ${a} to the ${z} corner`;
    return `<b>diagonal by diagonal</b>, every diagonal read in the same direction, from the ${a} to the ${z} corner`;
  }

  /* ---- drawing ---- */
  /* boat heading right (bow = the long raked point on the right), mast up, sail aft, pennant forward */
  const HULL = [[-33, 14], [34, 14], [11, 28], [-31, 28]];
  const SAIL = [[0, -24], [0, 9], [-27, 9]];
  const FLAG = [[0, -28], [0, -21], [11, -24.5]];
  function boat(pic, cx, cy, s, h, fill, flip, sw) {
    const th = (h * Math.PI) / 4;
    const co = Math.cos(th);
    const si = Math.sin(th);
    const T = (p) => {
      const x = p[0] * s;
      const y = (flip ? -p[1] : p[1]) * s;
      return [cx + x * co - y * si, cy + x * si + y * co];
    };
    RM.polygon(pic, SAIL.map(T), { fill, sw: sw * 0.9 });
    const m0 = T([0, 14]);
    const m1 = T([0, -28]);
    RM.line(pic, m0[0], m0[1], m1[0], m1[1], { sw: sw * 1.1 });
    RM.polygon(pic, FLAG.map(T), { fill: 'black', sw: sw * 0.7 });
    RM.polygon(pic, HULL.map(T), { fill: 'white', sw });
  }

  RM.register({
    id: 'zigzag',
    name: 'Reading order',
    difficulty: 8,
    generate(rng, variant) {
      init();
      const nb = variant === 3 ? 2 : 1;
      /* v0 showcase: zigzag, or snake/spiral with 90° turns (headings repeat, so the chain needs the colours too);
       * v1: spirals; v2: zigzag with 90° turns; v3: two boats per panel */
      const type = rng.pick(variant === 1 ? ['spiral'] : variant === 2 ? ['zigzag'] : variant === 3 ? ['snake', 'spiral', 'zigzag'] : ['snake', 'spiral', 'zigzag', 'zigzag']);
      const evenOnly = variant === 2 || (variant === 0 && type !== 'zigzag');
      const d = [rng.pick(evenOnly ? [2, 6] : STEPS)];
      if (nb === 2) d.push(rng.pick(STEPS.filter((x) => x !== d[0] && x !== 8 - d[0])));
      const even = d.every((x) => x % 2 === 0);
      const cands = NAMED[type].filter((o) => {
        const p = o.seq.indexOf(8);
        return p === 0 || p === 8 || (even && p === 4);
      });
      RM.need(cands.length > 0);
      const seq = rng.pick(cands).seq;
      const p = seq.indexOf(8);
      const h0 = d.map(() => rng.int(0, 7));
      const cyc = rng.shuffle(COLS);
      const pos = RM.range(9).map((x) => seq.indexOf(x));
      const specs = RM.range(9).map((x) => ({ h: d.map((dd, b) => RM.mod(h0[b] + dd * pos[x], 8)), c: cyc[pos[x] % 3], f: 0 }));
      const answer = specs[8];
      const C = answer.c;

      /* 1. every reading order a solver could try: all consistent ones must predict the same boat */
      const hv = RM.range(nb).map((b) => specs.map((x) => x.h[b]));
      const cv = specs.map((x) => x.c);
      for (const s of HYP) {
        const cp = cyclePred(cv, s);
        if (cp === null) continue;
        const hp = hv.map((v) => stepPreds(v, s));
        if (hp.some((pr) => !pr.length)) continue;
        RM.need(cp === C && hp.every((pr, b) => pr.every((v) => v === answer.h[b])));
      }
      /* 2. simple Raven readings of the grids and the counting shortcut */
      const checkHeading = (v, want) => {
        RM.need(affinePreds(v).every((x) => x === want));
        RM.needNoConflict(grid(v), want, 'numeric', 8);
        RM.need(!countShortcut(v, want));
      };
      hv.forEach((v, b) => checkHeading(v, answer.h[b]));
      if (nb === 2) checkHeading(specs.map((x) => RM.mod(x.h[1] - x.h[0], 8)), RM.mod(answer.h[1] - answer.h[0], 8));
      RM.needNoConflict(grid(cv), C, 'categorical');
      RM.need(colourClassPreds(cv).every((x) => x === C));

      /* 3. options */
      const others = COLS.filter((c) => c !== C);
      const [c1, c2] = rng.shuffle(others);
      const why = {
        next: p === 0 ? "that is boat 2's heading: the turn was not undone" : p === 4 ? "that is boat 6's heading: one turn too many" : 'one turn too many',
        prev: p === 0 ? 'the turn was undone twice' : p === 4 ? "that is boat 4's heading: one turn too few" : "that is boat 8's heading: the last turn is missing",
        row: 'it continues the bottom row from left to right, as if the panels were read like a book',
        col: 'it continues the right-hand column downwards, as if the panels were read column by column',
        left: 'it simply copies its left neighbour',
        up: 'it simply copies the boat above it',
        opp: 'it points the opposite way',
        rand: '',
      };
      const altsFor = (b) => {
        const H = answer.h[b];
        const v = hv[b];
        const out = [];
        const add = (x, w) => {
          x = RM.mod(x, 8);
          if (x !== H && !out.some((a) => a.h === x)) out.push({ h: x, w });
        };
        const np = rng.shuffle([[H + d[b], 'next'], [H - d[b], 'prev']]);
        add(np[0][0], np[0][1]);
        rng.shuffle([np[1], [2 * v[7] - v[6], 'row'], [2 * v[5] - v[2], 'col']]).forEach((a) => add(a[0], a[1]));
        add(v[7], 'left');
        add(v[5], 'up');
        add(H + 4, 'opp');
        rng.shuffle(RM.range(8)).forEach((x) => add(x, 'rand'));
        return out;
      };
      const label = nb === 2 ? ['the top-left boat', 'the bottom-right boat'] : ['the boat'];
      const headFlaw = (b, a) =>
        `${label[b][0].toUpperCase() + label[b].slice(1)} points ${DIR[a.h]} but must point ${DIR[answer.h[b]]}${why[a.w] ? ' (' + why[a.w] + ')' : ''}.`;
      const colFlaw = (c) => `The sail is ${c} but must be ${C}: in the cycle of three, the missing boat takes the ${C} sail.`;
      const options = [{ spec: answer, flaws: [] }];
      if (nb === 1) {
        const al = altsFor(0);
        const mk = (a, c) => {
          const flaws = [];
          if (a) flaws.push(headFlaw(0, a));
          if (c !== C) flaws.push(colFlaw(c));
          options.push({ spec: { h: [a ? a.h : answer.h[0]], c, f: 0 }, flaws });
        };
        mk(null, c1);
        mk(al[0], C);
        mk(al[0], c2);
        mk(al[1], C);
        mk(al[1], c1);
        mk(al[2], C);
        if (rng.chance(0.5))
          options.push({
            spec: { h: answer.h.slice(), c: C, f: 1 },
            flaws: ['This boat is mirrored (mast and sail on the wrong side of the hull): the boats are only ever turned, never flipped.'],
          });
        else mk(al[3], C);
      } else {
        const A = [null].concat(altsFor(0).slice(0, 2));
        const B = [null].concat(altsFor(1).slice(0, 2));
        const combos = [];
        A.forEach((a) => B.forEach((bb) => (a || bb) && combos.push([a, bb])));
        rng.shuffle(combos)
          .slice(0, 7)
          .forEach(([a, bb]) => {
            const flaws = [];
            if (a) flaws.push(headFlaw(0, a));
            if (bb) flaws.push(headFlaw(1, bb));
            options.push({ spec: { h: [a ? a.h : answer.h[0], bb ? bb.h : answer.h[1]], c: C, f: 0 }, flaws });
          });
      }

      /* 4. correction */
      const list = seq.map((x, i) => `${i + 1}&nbsp;${CELL[x]}`).join(', ');
      const where = p === 8 ? 'the <b>last</b> one' : p === 0 ? 'the <b>first</b> one' : 'right in the <b>middle</b> of the sequence';
      const tw = d.map(turnWords);
      const headSeq = (b) => seq.map((x) => (x === 8 ? '?' : DIR[specs[x].h[b]])).join(' → ');
      const rules = [
        {
          k: 'One boat, turned',
          t:
            (nb === 2 ? 'Each panel holds two boats (top-left and bottom-right); each one is' : 'Every panel shows') +
            ' the same sailboat, only <b>turned</b> by multiples of 45° (never flipped) — its heading is where the pointed bow points — with a white, gray or black sail.',
        },
        {
          k: 'Reading order',
          t: `The nine cells form one sequence, but it is not read like a book: it follows ${orderName(type, seq)}: ${list}. The missing bottom-right cell is number ${p + 1}, ${where}.`,
        },
        {
          k: 'Turning',
          t:
            nb === 1
              ? `Along this order, each boat is the previous one turned <b>${tw[0].ang}° ${tw[0].sense}</b>: ${headSeq(0)}.`
              : `Along this order, the top-left boat turns <b>${tw[0].ang}° ${tw[0].sense}</b> at every step (${headSeq(0)}) and the bottom-right boat turns <b>${tw[1].ang}° ${tw[1].sense}</b> (${headSeq(1)}).`,
        },
        {
          k: 'Sails',
          t: `Along the same order the sail colours repeat in a cycle of three: ${cyc[0]} → ${cyc[1]} → ${cyc[2]} → ${cyc[0]} → …`,
        },
      ];
      const same = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((i) => i !== p && i % 3 === p % 3).map((i) => i + 1);
      const calc = (b) => {
        const t = tw[b];
        const who = nb === 2 ? (b === 0 ? 'top-left boat: ' : 'bottom-right boat: ') : '';
        if (p === 0)
          return `${who}boat 2 (${CELL[seq[1]]}) points ${DIR[specs[seq[1]].h[b]]}; boat 1 comes one step before it, so undo one turn (${t.ang}° ${t.back}) → <b>${DIR[answer.h[b]]}</b>`;
        return `${who}boat ${p} (${CELL[seq[p - 1]]}) points ${DIR[specs[seq[p - 1]].h[b]]}; one more turn of ${t.ang}° ${t.sense} → <b>${DIR[answer.h[b]]}</b>${
          p < 8 ? ` (and one more turn gives boat ${p + 2}, ${DIR[specs[seq[p + 1]].h[b]]} ✓)` : ''
        }`;
      };
      rules.push({
        k: 'Missing boat',
        t: `${RM.range(nb).map(calc).join('; ')}. Its sail goes with boats ${same[0]} and ${same[1]} → <b>${C}</b>. Answer: ${
          nb === 2 ? `boats pointing <b>${DIR[answer.h[0]]}</b> and <b>${DIR[answer.h[1]]}</b>` : `a boat pointing <b>${DIR[answer.h[0]]}</b>`
        } with a <b>${C} sail</b>.`,
      });
      rules.push({
        k: 'How to spot it',
        t: 'Link each boat to the boat that is turned by the same small angle from it: the links trace the path through the matrix, and the colour cycle confirms it.',
      });

      return {
        panels: specs.slice(0, 8),
        answer,
        options,
        render(spec) {
          const pic = new RM.Pic();
          if (spec.h.length === 1) boat(pic, 50, 50, 1.0, spec.h[0], spec.c, spec.f, 2.2);
          else {
            boat(pic, 29, 29, 0.58, spec.h[0], spec.c, spec.f, 1.8);
            boat(pic, 71, 71, 0.58, spec.h[1], spec.c, spec.f, 1.8);
          }
          return pic.svg();
        },
        key: (spec) => spec.h.join('.') + '|' + spec.c + '|' + spec.f,
        rules,
        hint: 'The sequence is there — but it does not read like a book.',
        difficulty: nb === 1 && (type === 'zigzag' || even) ? 8 : 7,
      };
    },
  });
})();
