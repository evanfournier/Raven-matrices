/* Peg solitaire (grandmaster): every row starts with a board of pegs (column 1). Each following column is the board one
 * more jump later (variant 3: two more jumps). The jump is chosen by a fixed policy: scanning the board in a fixed order
 * (reading order, reverse, by columns…), the FIRST peg that can jump in the fixed direction D over an adjacent peg into
 * an empty hole jumps; the jumped peg is removed. Hypotheses checked against all visible transitions: direction (4, or
 * "any direction with a priority"), scan order (8), whether the jumper / the jumped peg / the landing hole is the thing
 * scanned, whether the jumped peg is removed, jumps per column (1–2 / 1–3). All surviving hypotheses must predict the
 * same final board. */
(function () {
  'use strict';
  const RM = window.RM;

  const DIRS = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
  const DW = { up: 'upwards', down: 'downwards', left: 'to the left', right: 'to the right' };
  const ORDERS = {
    rd: ['r', true, true], rv: ['r', false, false], rl: ['r', true, false], rb: ['r', false, true],
    cd: ['c', true, true], cv: ['c', false, false], cu: ['c', true, false], ca: ['c', false, true],
  };
  const SCANTXT = {
    rd: 'line by line from the top, left to right inside each line',
    rv: 'line by line from the bottom, right to left inside each line',
    rl: 'line by line from the top, right to left inside each line',
    rb: 'line by line from the bottom, left to right inside each line',
    cd: 'column by column from the left, top to bottom inside each column',
    cv: 'column by column from the right, bottom to top inside each column',
    cu: 'column by column from the left, bottom to top inside each column',
    ca: 'column by column from the right, top to bottom inside each column',
  };
  const orderList = (n, id) => {
    const [maj, ma, mi] = ORDERS[id];
    const A = RM.range(n);
    const a1 = ma ? A : A.slice().reverse(), a2 = mi ? A : A.slice().reverse();
    const L = [];
    for (const x of a1) for (const y of a2) L.push(maj === 'r' ? x * n + y : y * n + x);
    return L;
  };
  const perms = (a) => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms(a.slice(0, i).concat(a.slice(i + 1))).map((p) => [x].concat(p))));
  const DKEYS = Object.keys(DIRS);
  const CORES = [];
  for (const scan of Object.keys(ORDERS)) {
    for (const remove of [true, false]) {
      for (const key of ['jumper', 'jumped', 'landing'])
        for (const dn of DKEYS) CORES.push({ id: CORES.length, scan, remove, key, dn, dirs: [DIRS[dn]] });
      for (const pr of perms(DKEYS)) CORES.push({ id: CORES.length, scan, remove, key: 'jumper', dn: 'any', prio: pr, dirs: pr.map((d) => DIRS[d]) });
    }
  }

  function jumpOnce(b, n, core, ORD) {
    const m = core.key === 'jumped' ? 1 : core.key === 'landing' ? 2 : 0;
    for (const x of ORD[core.scan]) {
      const r = (x / n) | 0, c = x % n;
      for (const d of core.dirs) {
        const pr = r - m * d[0], pc = c - m * d[1], lr = pr + 2 * d[0], lc = pc + 2 * d[1];
        if (pr < 0 || pc < 0 || pr >= n || pc >= n || lr < 0 || lc < 0 || lr >= n || lc >= n) continue;
        const p = pr * n + pc, q = (pr + d[0]) * n + pc + d[1], l = lr * n + lc;
        if (b[p] && b[q] && !b[l]) {
          const nb = b.slice();
          nb[p] = 0; nb[l] = 1;
          if (core.remove) nb[q] = 0;
          return { b: nb, p, q, l };
        }
      }
    }
    return null;
  }

  RM.register({
    id: 'peg-jump',
    name: 'Peg solitaire',
    difficulty: 7,
    generate(rng, variant) {
      const n = variant === 2 ? 6 : 5;
      const K = variant === 3 ? 2 : 1;
      const ORD = {};
      for (const id of Object.keys(ORDERS)) ORD[id] = orderList(n, id);
      const memo = new Map();
      const jmp = (core, b) => {
        const k = core.id + ':' + b.join('');
        if (!memo.has(k)) memo.set(k, jumpOnce(b, n, core, ORD));
        return memo.get(k);
      };
      const chain = (core, b, k) => {
        for (let i = 0; i < k && b; i++) { const r = jmp(core, b); b = r && r.b; }
        return b;
      };
      const eqb = (a, b) => !!a && a.join('') === b.join('');

      const D = rng.pick(DKEYS);
      const scan = rng.pick(variant === 0 ? ['rd', 'rv', 'cd', 'cv'] : Object.keys(ORDERS));
      const truth = CORES.find((c) => c.key === 'jumper' && c.dn === D && c.scan === scan && c.remove);
      const dens = n === 5 ? 0.6 : 0.55;
      const P = [];
      for (let r = 0; r < 3; r++) {
        let row = null;
        for (let t = 0; t < 30 && !row; t++) {
          const b0 = RM.range(n * n).map(() => (rng.chance(dens) ? 1 : 0));
          const b1 = chain(truth, b0, K), b2 = b1 && chain(truth, b1, K);
          if (b2) row = [b0, b1, b2];
        }
        RM.need(row);
        P.push(row);
      }
      // hypotheses
      const trans = [[0, 0, 1], [0, 1, 2], [1, 0, 1], [1, 1, 2], [2, 0, 1]]; // [row, from col, to col]
      const test = (core, k2, k3, upTo) => {
        for (const [r, a, b] of trans) {
          const got = chain(core, P[r][a], a === 0 ? k2 : k3);
          if (!eqb(got, P[r][b])) return [r, a, b];
        }
        return null;
      };
      const ans = P[2][2];
      const preds = new Set();
      for (const core of CORES) {
        for (const k2 of [1, 2]) {
          if (!eqb(chain(core, P[0][0], k2), P[0][1])) continue;
          for (const k3 of [1, 2, 3]) {
            if (test(core, k2, k3)) continue;
            const pr = chain(core, P[2][1], k3);
            if (pr) preds.add(pr.join(''));
          }
        }
      }
      RM.need(preds.size === 1 && preds.has(ans.join('')));

      // ---- distractors
      const dirsTxt = (core) => (core.dn === 'any' ? 'a peg may jump in any direction (priority ' + core.prio.join(', ') + ')' : 'the pegs jump ' + DW[core.dn]);
      const cands = new Map();
      for (const core of CORES) {
        for (const k2 of [1, 2]) for (const k3 of [1, 2, 3]) {
          const pr = chain(core, P[2][1], k3);
          if (!pr || eqb(pr, ans)) continue;
          const diffs = [];
          if (core.dn !== D) diffs.push('dir');
          if (core.scan !== scan) diffs.push('scan');
          if (core.key !== 'jumper') diffs.push('key');
          if (!core.remove) diffs.push('rem');
          if (k2 !== K || k3 !== K) diffs.push('k');
          const key = pr.join('');
          if (cands.has(key) && cands.get(key).diffs.length <= diffs.length) continue;
          cands.set(key, { b: pr, core, k2, k3, diffs });
        }
      }
      const arr = Array.from(cands.values()).map((c) => ({ c, s: c.diffs.length + rng.next() * 0.9 })).sort((a, b) => a.s - b.s).map((x) => x.c);
      const chosen = [], cnt = {};
      for (const c of arr) { const sig = c.diffs.join('+'); if ((cnt[sig] || 0) < 2 && chosen.length < 7) { chosen.push(c); cnt[sig] = (cnt[sig] || 0) + 1; } }
      for (const c of arr) if (chosen.length < 7 && !chosen.includes(c)) chosen.push(c);
      RM.need(chosen.length === 7);
      const pos = (i) => `line ${((i / n) | 0) + 1}, place ${(i % n) + 1}`;
      const flawOf = (c) => {
        const parts = [];
        if (c.core.dn !== D) parts.push(dirsTxt(c.core));
        if (c.core.scan !== scan) parts.push('the pegs are scanned ' + SCANTXT[c.core.scan]);
        if (c.core.key === 'jumped') parts.push('the scan looks for the peg to be jumped over instead of the peg that jumps');
        if (c.core.key === 'landing') parts.push('the scan looks for the first empty landing hole instead of the peg that jumps');
        if (!c.core.remove) parts.push('the jumped peg stays on the board');
        if (c.k2 !== K || c.k3 !== K) parts.push(`column 2 is ${c.k2} jump${c.k2 > 1 ? 's' : ''} after column 1 and column 3 is ${c.k3} jump${c.k3 > 1 ? 's' : ''} after column 2`);
        const t = test(c.core, c.k2, c.k3);
        const ev = t ? `, but it does not turn column ${t[1] + 1} into column ${t[2] + 1} in row ${t[0] + 1}` : '';
        return [`This is what you get if ${parts.join(' and ')}${ev}.`];
      };

      // ---- rules
      const dw = DW[D];
      const d = DIRS[D];
      const avail = (b) => {
        const out = [];
        for (const x of ORD[scan]) {
          const r = (x / n) | 0, c = x % n, r2 = r + 2 * d[0], c2 = c + 2 * d[1];
          if (r2 < 0 || c2 < 0 || r2 >= n || c2 >= n) continue;
          if (b[x] && b[(r + d[0]) * n + c + d[1]] && !b[r2 * n + c2]) out.push(x);
        }
        return out;
      };
      let ev = '';
      for (let r = 0; r < 2 && !ev; r++) {
        const av = avail(P[r][0]);
        if (av.length >= 2) {
          const mv = jmp(truth, P[r][0]);
          ev = ` In row ${r + 1} the pegs at ${pos(av[0])} and ${pos(av[1])} (among others) could both jump ${dw}; the picture of column 2 shows that the one at ${pos(mv.p)} did, the first in the scan.`;
        }
      }
      let b = P[2][1];
      const moves = [];
      for (let i = 0; i < K; i++) {
        const mv = jmp(truth, b);
        moves.push(`the first peg that can jump ${dw} is at ${pos(mv.p)}; it jumps over ${pos(mv.q)} and lands in ${pos(mv.l)}, the peg at ${pos(mv.q)} is removed`);
        b = mv.b;
      }
      const lines = RM.range(n).map((r) => ans.slice(r * n, r * n + n).map((v) => (v ? '●' : '○')).join('')).join(' / ');
      const rules = [
        { k: 'A jump', t: `a peg <b>jumps ${dw}</b>: it leaps over the neighbouring peg in that direction into the empty hole right behind it, and the peg it jumped over is <b>removed</b>.` },
        { k: 'Which peg', t: `exactly one peg jumps per step: scan the board <b>${SCANTXT[scan]}</b>; the first peg that is able to jump ${dw} is the one.${ev}` },
        { k: 'Columns', t: K === 1 ? 'column 1 is the starting position, column 2 is the position after <b>one</b> jump, column 3 after <b>two</b> jumps (one more).' : 'column 1 is the starting position; each further column adds <b>two</b> jumps, one after the other, scanning the new position again each time.' },
        { k: 'Row 3', t: `from the column 2 board of row 3: ${moves.map((m, i) => (K > 1 ? `jump ${i + 1}: ` : '') + m).join('; then ')}.` },
        { k: 'Answer', t: `pegs (●) and holes (○), line by line: <b>${lines}</b>.` },
      ];

      const spec = (bd) => ({ n, b: bd });
      const panels = [];
      for (let r = 0; r < 3; r++) { panels.push(spec(P[r][0]), spec(P[r][1])); if (r < 2) panels.push(spec(P[r][2])); }
      const render = (s) => {
        const pic = new RM.Pic();
        const st = 72 / (n - 1);
        s.b.forEach((v, i) => {
          const x = 14 + (i % n) * st, y = 14 + ((i / n) | 0) * st;
          if (v) RM.circle(pic, x, y, st * 0.38, { fill: 'black', sw: 1 });
          else RM.circle(pic, x, y, 2.4, { fill: 'white', stroke: RM.GRAY, sw: 1.3 });
        });
        return pic.svg();
      };
      return {
        difficulty: K === 2 || variant === 2 ? 8 : 7,
        hint: 'one peg jumps per step — work out which one, and in which direction, from the first two rows.',
        panels,
        answer: spec(ans),
        options: [{ spec: spec(ans), flaws: [] }].concat(chosen.map((c) => ({ spec: spec(c.b), flaws: flawOf(c) }))),
        render,
        key: (s) => s.b.join(''),
        rules,
      };
    },
  });
})();
