/* Counting-out circle (grandmaster): each row is one counting-out game (the Josephus problem). n beads sit on a
 * circle (n differs per row), a black triangle marks the bead where the counting starts. Every k-th living bead is
 * eliminated (drawn as a crossed ring that keeps its place); beads already out are skipped when counting, and each
 * new count starts at the next bead still in. Column 1: nobody out; column 2: after 2 eliminations; column 3: after
 * 4. k (3–5), the direction and where the count starts are shared by the whole puzzle and must be deduced from the
 * unordered sets of crosses of rows 1–2 (neither row alone is enough). Variants: 1 = anticlockwise, 2 = the marked
 * bead counts as 0, 3 = 3 and 6 eliminations (★8). */
(function () {
  'use strict';
  const RM = window.RM;
  const R = 32;
  const BR = 4.6;
  const MODES = ['std', 'places', 'grow', 'incl', 'restart'];
  const HYPS = [];
  for (let k = 1; k <= 10; k++)
    for (const dir of [1, -1]) for (const off of [0, 1]) for (const mode of MODES) HYPS.push({ k, dir, off, mode });

  const ks = (arr) => arr.slice().sort((a, b) => a - b).join(',');
  const ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];

  /* Positions m (0 = marked bead, counted along the direction) eliminated in order under one reading. */
  function simM(n, k, off, mode, E) {
    const dead = new Array(n).fill(false);
    const out = [];
    if (mode === 'places') {
      // every k-th PLACE, beads already out included (a place already empty removes nobody)
      let m = off + k - 1;
      for (let guard = 0; out.length < E; guard++) {
        if (guard > 3 * n) return null;
        const x = m % n;
        if (!dead[x]) {
          dead[x] = true;
          out.push(x);
        }
        m += k;
      }
      return out;
    }
    const nextAlive = (m) => {
      for (let t = 0; t < n; t++) {
        const x = (m + t) % n;
        if (!dead[x]) return x;
      }
      return -1;
    };
    let cur = off;
    for (let j = 0; j < E; j++) {
      // std: always k; grow: k, k+1, k+2…; incl: next count starts ON the bead just removed; restart: from the marker
      const kj = mode === 'grow' ? k + j : mode === 'incl' && j > 0 ? k - 1 : k;
      if (kj < 1) return null;
      let c = nextAlive(mode === 'restart' ? off : cur);
      for (let t = 1; t < kj; t++) c = nextAlive(c + 1);
      dead[c] = true;
      out.push(c);
      cur = c + 1;
    }
    return out;
  }

  /* Step-by-step trace of the intended game (positions m). */
  function trace(n, k, off, E) {
    const dead = new Array(n).fill(false);
    const steps = [];
    let cur = off;
    for (let j = 0; j < E; j++) {
      const counted = [];
      const skipped = [];
      let m = cur;
      while (counted.length < k) {
        const x = m % n;
        if (dead[x]) skipped.push(x);
        else counted.push(x);
        m++;
      }
      const out = counted[k - 1];
      dead[out] = true;
      steps.push({ counted, skipped, out });
      cur = out + 1;
    }
    return steps;
  }

  function render(spec) {
    const pic = new RM.Pic();
    const n = spec.n;
    const ang = (i) => ((-90 + (360 * i) / n) * Math.PI) / 180;
    RM.circle(pic, 50, 50, R, { stroke: RM.LIGHT, sw: 1.6 });
    // start marker: black triangle outside the circle pointing at the marked bead
    const a = ang(spec.s);
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const tip = [50 + 38.4 * ca, 50 + 38.4 * sa];
    const bc = [50 + 45 * ca, 50 + 45 * sa];
    RM.polygon(pic, [tip, [bc[0] - 3.9 * sa, bc[1] + 3.9 * ca], [bc[0] + 3.9 * sa, bc[1] - 3.9 * ca]], { fill: 'black', sw: 1 });
    const dead = new Set(spec.dead);
    for (let i = 0; i < n; i++) {
      const x = 50 + R * Math.cos(ang(i));
      const y = 50 + R * Math.sin(ang(i));
      if (dead.has(i)) {
        RM.circle(pic, x, y, BR, { fill: 'white', stroke: RM.GRAY, sw: 1.3 });
        const d = 2.7;
        RM.line(pic, x - d, y - d, x + d, y + d, { sw: 1.8 });
        RM.line(pic, x - d, y + d, x + d, y - d, { sw: 1.8 });
      } else RM.circle(pic, x, y, BR, { fill: 'black', sw: 0.6 });
    }
    return pic.svg();
  }
  const key = (s) => s.n + ':' + s.s + ':' + ks(s.dead);

  RM.register({
    id: 'josephus',
    name: 'Counting-out circle',
    difficulty: 7,
    generate(rng, variant) {
      const dir = variant === 1 ? -1 : 1;
      const off = variant === 2 ? 1 : 0;
      const E2 = variant === 3 ? 3 : 2;
      const E3 = 2 * E2;
      const k = rng.int(3, 5);
      const ns = variant === 3 ? rng.shuffle([10, 11, 12]) : rng.sample([9, 10, 11, 12], 3);
      const I = HYPS.findIndex((h) => h.k === k && h.dir === dir && h.off === off && h.mode === 'std');
      const rows = ns.map((n) => {
        const s = rng.int(0, n - 1);
        const preds = HYPS.map((h) => {
          const ms = simM(n, h.k, h.off, h.mode, E3);
          if (!ms) return null;
          const seq = ms.map((m) => RM.mod(s + h.dir * m, n));
          return { seq, a: ks(seq.slice(0, E2)), b: ks(seq) };
        });
        return { n, s, preds, seq: preds[I].seq, a: preds[I].a, b: preds[I].b };
      });
      const r3 = rows[2];
      const all = RM.range(HYPS.length);
      const fits = (hi, r, full) => {
        const p = rows[r].preds[hi];
        return !!p && p.a === rows[r].a && (!full || p.b === rows[r].b);
      };
      const ansOf = (hi) => r3.preds[hi].b;

      // 1. every reading consistent with everything visible predicts the same missing panel
      const H = all.filter((i) => fits(i, 0, true) && fits(i, 1, true) && fits(i, 2, false));
      RM.need(H.every((i) => ansOf(i) === r3.b));
      // 2. no middle panel alone reveals its right panel (both panels of a row are needed)
      for (const r of [0, 1]) {
        const Hm = all.filter((i) => fits(i, r, false));
        RM.need(new Set(Hm.map((i) => rows[r].preds[i].b)).size > 1);
      }
      // 3. skipping the beads already out must matter for the answer
      const P = HYPS.findIndex((h) => h.k === k && h.dir === dir && h.off === off && h.mode === 'places');
      RM.need(!r3.preds[P] || r3.preds[P].b !== r3.b);
      // 4. a solver who lets the count change from row to row (arithmetic progression, or "n minus a constant")
      const H0 = all.filter((i) => fits(i, 0, true));
      const H1 = all.filter((i) => fits(i, 1, true));
      for (const i0 of H0)
        for (const i1 of H1) {
          const h0 = HYPS[i0];
          const h1 = HYPS[i1];
          // "the rule alternates": row 3 follows row 1
          if (i0 !== i1 && fits(i0, 2, false)) RM.need(ansOf(i0) === r3.b);
          if (h0.k === h1.k || h0.dir !== h1.dir || h0.off !== h1.off || h0.mode !== h1.mode) continue;
          const k3s = [2 * h1.k - h0.k];
          if (rows[0].n - h0.k === rows[1].n - h1.k) k3s.push(r3.n - (rows[0].n - h0.k));
          for (const k3 of k3s) {
            const i3 = HYPS.findIndex((h) => h.k === k3 && h.dir === h0.dir && h.off === h0.off && h.mode === h0.mode);
            if (i3 >= 0 && fits(i3, 2, false)) RM.need(ansOf(i3) === r3.b);
          }
        }

      // ---------------------------------------------------------------- panels
      const spec = (row, e) => ({ n: row.n, s: row.s, dead: row.seq.slice(0, e).sort((x, y) => x - y) });
      const panels = [];
      rows.forEach((row, r) => [0, E2, E3].forEach((e, c) => (r < 2 || c < 2) && panels.push(spec(row, e))));
      const answer = spec(r3, E3);

      // ---------------------------------------------------------------- distractors
      const n3 = r3.n;
      const no = (i) => RM.mod(dir * (i - r3.s), n3) + 1; // bead number, marked bead = No. 1
      const noList = (arr) => arr.map(no).sort((x, y) => x - y);
      const say = (arr) => {
        const l = noList(arr);
        return 'No. ' + (l.length > 1 ? l.slice(0, -1).join(', ') + ' and ' : '') + l[l.length - 1];
      };
      const ansSet = new Set(r3.seq);
      const mid = r3.seq.slice(0, E2);
      const dirW = dir === 1 ? 'clockwise' : 'anticlockwise';
      const cands = new Map();
      const add = (dead, why, pri, must) => {
        const kk = ks(dead);
        if (kk === r3.b || cands.has(kk)) return;
        cands.set(kk, { dead: dead.slice().sort((x, y) => x - y), why, pri, must: !!must });
      };
      const tier = (dead) => (dead.length === E3 && mid.every((x) => dead.includes(x)) ? 1 : 3);
      // (a) other readings of the rule
      const cplx = (h) => (h.k !== k) + (h.dir !== dir) + (h.off !== off) + (h.mode !== 'std') + (h.k !== k && Math.abs(h.k - k) > 1);
      const hOrder = all.filter((i) => i !== I && r3.preds[i] && cplx(HYPS[i]) <= 2).sort((x, y) => cplx(HYPS[x]) - cplx(HYPS[y]));
      for (const i of hOrder) {
        const h = HYPS[i];
        const why = [];
        if (h.dir !== dir) why.push('counts ' + (h.dir === 1 ? 'clockwise' : 'anticlockwise') + ' instead of ' + dirW);
        if (h.mode === 'grow') why.push('makes each count one longer than the previous one');
        if (h.mode === 'incl') why.push('starts each new count on the bead just removed instead of the next bead still in');
        if (h.mode === 'restart') why.push('restarts every count at the marked bead instead of after the last bead removed');
        if (h.mode === 'places') why.push('also counts the empty places of beads already out (they must be skipped)');
        if (h.k !== k) why.push('removes every ' + ORD[h.k] + ' bead instead of every ' + ORD[k]);
        if (h.off !== off)
          why.push(h.off ? 'starts the count on the bead after the marked one (but the marked bead itself counts as 1)' : 'counts the marked bead as 1 (but the count starts on the bead after it)');
        const d = r3.preds[i].seq;
        add(d, 'This is what you get if one ' + why.join(' and ') + '.', tier(d), h.mode === 'places' && h.k === k && h.dir === dir && h.off === off);
      }
      // (b) slips
      add(r3.seq.slice(0, E3 - 1), 'Only ' + (E3 - 1) + ' beads are out: each panel shows ' + E2 + ' more beads out than the one to its left.', 2);
      const ms5 = simM(n3, k, off, 'std', E3 + 1);
      add(ms5.map((m) => RM.mod(r3.s + dir * m, n3)), (E3 + 1) + ' beads are out — one count too many (the right panel shows ' + E3 + ').', 2);
      // (c) one count done wrong (one bead too early / too late, or an empty place counted), the later counts done right
      const stepSlip = (j, mis) => {
        const dead = new Array(n3).fill(false);
        const out = [];
        const nextAlive = (m) => {
          for (let t = 0; t < n3; t++) if (!dead[(m + t) % n3]) return (m + t) % n3;
          return -1;
        };
        let cur = off;
        for (let s = 0; s < E3; s++) {
          let c;
          if (s === j && mis === 0) {
            c = (cur + k - 1) % n3;
            if (dead[c]) return null;
          } else {
            c = nextAlive(cur);
            for (let t = 1; t < (s === j ? k + mis : k); t++) c = nextAlive(c + 1);
          }
          dead[c] = true;
          out.push(c);
          cur = c + 1;
        }
        return out.map((m) => RM.mod(r3.s + dir * m, n3));
      };
      for (let j = E2; j < E3; j++)
        for (const mis of [-1, 1, 0]) {
          const d = stepSlip(j, mis);
          if (!d) continue;
          const what =
            mis === 0
              ? 'also counted the empty place of a bead already out'
              : 'stopped one bead too ' + (mis < 0 ? 'early (only ' + (k - 1) : 'late (' + (k + 1)) + ' beads counted)';
          add(d, 'The ' + ORD[j + 1] + ' count ' + what + (j < E3 - 1 ? ', and the next count' + (E3 - j > 2 ? 's were' : ' was') + ' made from there' : '') + '.', 1);
        }
      for (const step of [-1, 1])
        add(r3.seq.map((x) => RM.mod(x + step, n3)), 'The right crosses, but every one of them is shifted one bead along the circle.', 3);

      const pool = Array.from(cands.values());
      RM.need(pool.length >= 7);
      const by = (p) => pool.filter((c) => c.pri === p);
      // anti-guessing: some distractor with as many crosses as the answer must be at least as "central" as the answer
      const dist = (A, B) => A.filter((x) => !B.includes(x)).length + B.filter((x) => !A.includes(x)).length;
      const central = (pick) => {
        const sets = [answer.dead].concat(pick.map((c) => c.dead)).filter((A) => A.length === E3);
        const tot = sets.map((A) => sets.reduce((s, B) => s + dist(A, B), 0));
        // …and every cross of the answer also appears in some distractor
        return tot.slice(1).some((t) => t <= tot[0]) && answer.dead.every((x) => pick.some((c) => c.dead.includes(x)));
      };
      const must = pool.filter((c) => c.must);
      let chosen = null;
      for (let tries = 0; tries < 30 && !chosen; tries++) {
        const t1 = rng.shuffle(by(1).filter((c) => !c.must));
        const rest = rng.shuffle(by(2)).slice(0, 1).concat(rng.shuffle(by(3)));
        if (!t1.length) break;
        // a decoy centre D, then the first-tier candidates closest to D (ties: closest to the answer)
        const D = t1[0];
        const near = t1.slice(1).map((c) => ({ c, v: -2 * dist(c.dead, D.dead) - dist(c.dead, answer.dead) + rng.next() }));
        near.sort((x, y) => y.v - x.v);
        const nT1 = tries < 15 ? 6 : 5;
        const pick = must.concat([D], near.map((x) => x.c)).slice(0, nT1).concat(rest, near.map((x) => x.c).slice(nT1)).slice(0, 7);
        if (pick.length === 7 && central(pick)) chosen = pick;
      }
      RM.need(chosen);
      const options = [{ spec: answer, flaws: [] }].concat(
        chosen.map((c) => {
          const dset = new Set(c.dead);
          const lost = mid.filter((x) => !dset.has(x));
          const missing = r3.seq.filter((x) => !dset.has(x) && !lost.includes(x));
          const extra = c.dead.filter((x) => !ansSet.has(x));
          const fl = [];
          if (lost.length)
            fl.push(say(lost) + (lost.length > 1 ? ' are' : ' is') + ' already out in the middle panel, but not crossed here.');
          if (missing.length) fl.push(say(missing) + ' should be crossed out.');
          if (extra.length) fl.push(say(extra) + ' should still be in.');
          fl.push(c.why);
          return { spec: { n: n3, s: r3.s, dead: c.dead }, flaws: fl };
        })
      );

      // ---------------------------------------------------------------- correction
      const rowOrder = (row) => {
        const nn = (i) => RM.mod(dir * (i - row.s), row.n) + 1;
        return row.seq.map(nn).join(', ');
      };
      const firstMiss = (hi) => {
        for (let r = 0; r < 3; r++) {
          const p = rows[r].preds[hi];
          if (!p) return null;
          if (p.a !== rows[r].a) return 'row ' + (r + 1) + ', middle panel';
          if (r < 2 && p.b !== rows[r].b) return 'row ' + (r + 1) + ', right panel';
        }
        return null;
      };
      const checks = [];
      const missP = firstMiss(P);
      if (missP) checks.push('counting the empty places too would already contradict ' + missP);
      const Iop = HYPS.findIndex((h) => h.k === k && h.dir === -dir && h.off === off && h.mode === 'std');
      const missO = firstMiss(Iop);
      if (missO) checks.push('counting ' + (dir === 1 ? 'anticlockwise' : 'clockwise') + ' contradicts ' + missO);
      const steps = trace(n3, k, off, E3).map((st, j) => {
        const cnt = st.counted.map((m) => m + 1).join('-');
        const skip = st.skipped.length ? ' (skip No. ' + st.skipped.map((m) => m + 1).join(', ') + ': already out)' : '';
        return 'No. ' + cnt + skip + ' → No. ' + (st.out + 1) + ' out' + (j === E2 - 1 ? ' (that is the middle panel)' : '');
      });
      const rules = [
        {
          k: 'One game per row',
          t:
            'Each row is one counting-out game on a circle of beads (' + rows.map((r) => r.n).join(', ') + ' beads). The black triangle marks the bead where the counting starts. Left: nobody is out yet; middle: after ' +
            E2 + ' beads are out; right: after ' + E3 + '. A bead that is out keeps its place and is drawn as a crossed ring. The crosses do not show the order in which the beads went out — you have to find the count that produces them.',
        },
        {
          k: 'The count',
          t:
            'Count ' + dirW + ', starting ' + (off ? 'on the bead just after the marked one (the marked bead itself is not counted at first)' : 'on the marked bead (it counts as 1)') +
            '; every <b>' + ORD[k] + '</b> bead is out. Beads already out are skipped (not counted), and each new count starts on the next bead still in.',
        },
        {
          k: 'Rows 1 and 2',
          t:
            'Number the beads ' + dirW + ' from the marked one (No. 1). Row 1: out in order No. ' + rowOrder(rows[0]) + '. Row 2: No. ' + rowOrder(rows[1]) + '. The middle panels show the first ' + E2 +
            ', the right panels all ' + E3 + '. This count reproduces every visible panel' + (checks.length ? ', whereas other readings do not (' + checks.join('; ') + ')' : '') + '.',
        },
        { k: 'Row 3 (' + n3 + ' beads)', t: steps.join('; ') + '.' },
        {
          k: 'Answer',
          t: '<b>' + n3 + ' beads with ' + say(r3.seq) + ' crossed out</b> (numbered ' + dirW + ' from the marked bead), ' + (n3 - E3) + ' beads still in.',
        },
      ];

      return {
        panels,
        answer,
        options,
        render,
        key,
        rules,
        hint: "Children use this to choose who is 'it'.",
        difficulty: variant === 3 ? 8 : 7,
      };
    },
  });
})();
