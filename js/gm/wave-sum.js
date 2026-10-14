/* Superposition (grandmaster): every panel is a wave sampled at 9 vertical guide lines, each sample sitting a whole
 * number of steps (−3..+3) above or below the axis. In every row the third wave is the guide-by-guide superposition
 * of the first two: their sum (variants 0 and 2), first minus second (variant 1) or second minus first (variant 3).
 * Crests meeting troughs cancel, crests meeting crests reinforce. The solver must discover the operation from the
 * 18 samples of rows 1–2 and compute all nine heights of the missing wave; distractors are near misses (one height
 * misread, one sign slip, both) and wrong rules (difference, max/min, mirrored, slid waves…), arranged so that the
 * answer is not the "most central" option. */
(function () {
  'use strict';
  const RM = window.RM;
  const N = 9;
  const XS = RM.range(N).map((i) => 10 + 10 * i);
  const Y = (v) => 50 - 12 * v;
  const MINUS = '−';
  const S = (v) => (v > 0 ? '+' + v : v < 0 ? MINUS + -v : '0'); // signed height
  const F = (v) => (v < 0 ? MINUS + -v : String(v)); // first operand
  const P = (v) => (v < 0 ? '(' + MINUS + -v + ')' : String(v)); // second operand
  const clip = (v) => Math.max(-3, Math.min(3, v));
  const inRange = (arr) => arr.every((v) => v >= -3 && v <= 3);
  const mirror = (v) => v.slice().reverse();
  const cyc = (v, s) => v.map((_, i) => v[RM.mod(i - s, N)]); // moved s guides to the right, wrapping round
  const edge = (v, s) => v.map((_, i) => v[Math.max(0, Math.min(N - 1, i - s))]); // moved, end height repeated
  const K = (v) => v.join(',');
  const sumArr = (v) => v.reduce((s, x) => s + x, 0);

  // the three superposition rules. x/y = operands in written order
  const OPS = {
    sum: { f: (a, b) => a + b, sym: '+', ops: (a, b) => [a, b], slip: 'sub' },
    sub: { f: (a, b) => a - b, sym: MINUS, ops: (a, b) => [a, b], slip: 'sum' },
    rsub: { f: (a, b) => b - a, sym: MINUS, ops: (a, b) => [b, a], slip: 'rsum' },
    rsum: { f: (a, b) => b + a, sym: '+', ops: (a, b) => [b, a] },
  };
  const calc = (op, a, b) => {
    const [x, y] = op.ops(a, b);
    return `${F(x)} ${op.sym} ${P(y)} = ${S(op.f(a, b))}`;
  };

  /* a wave: rounded sinusoid with a little noise, gentle slopes (|step| ≤ 2) */
  function wave(rng) {
    for (let t = 0; t < 60; t++) {
      const A = rng.pick([1.4, 2, 2.6, 3.2]);
      const per = rng.pick([5, 6, 7, 8, 9, 10, 12, 14]);
      const ph = rng.next() * 2 * Math.PI;
      const v = RM.range(N).map((i) => clip(Math.round(A * Math.sin((2 * Math.PI * i) / per + ph) + (rng.chance(0.3) ? rng.pick([-1, 1]) : 0))));
      if (v.some((x, i) => i && Math.abs(x - v[i - 1]) > 2)) continue;
      if (new Set(v).size < 3 || Math.max(...v) - Math.min(...v) < 3) continue;
      return v;
    }
    throw RM.RETRY;
  }
  function makeRow(rng, op) {
    for (let t = 0; t < 300; t++) {
      const a = wave(rng);
      const b = wave(rng);
      const c = a.map((x, i) => op.f(x, b[i]));
      if (!inRange(c)) continue;
      let opp = 0;
      let same = 0;
      for (let i = 0; i < N; i++) {
        if (a[i] * b[i] < 0) opp++;
        if (a[i] * b[i] > 0) same++;
      }
      if (opp < 2 || same < 2) continue;
      if (new Set(c).size < 3 || Math.max(...c) - Math.min(...c) < 3) continue;
      if (K(c) === K(a) || K(c) === K(b) || K(a) === K(b)) continue;
      return [a, b, c];
    }
    throw RM.RETRY;
  }

  /* ---------------------------------------------------------- hypotheses a solver could hold */
  const HYP = (function () {
    const H = [];
    const pw = (f) => (a, b) => a.map((x, i) => f(x, b[i]));
    for (let al = -2; al <= 2; al++)
      for (let be = -2; be <= 2; be++)
        for (let ga = -1; ga <= 1; ga++) {
          H.push(pw((x, y) => al * x + be * y + ga));
          H.push(pw((x, y) => clip(al * x + be * y + ga)));
        }
    H.push(pw(Math.max), pw(Math.min));
    H.push(pw((x, y) => Math.abs(x + y)), pw((x, y) => Math.abs(x - y)), pw((x, y) => -Math.abs(x + y)), pw((x, y) => -Math.abs(x - y)));
    H.push(pw((x, y) => clip(x * y)), pw((x, y) => -clip(x * y)));
    H.push(pw((x, y) => Math.round((x + y) / 2)), pw((x, y) => Math.floor((x + y) / 2)), pw((x, y) => Math.ceil((x + y) / 2)), pw((x, y) => Math.trunc((x + y) / 2)));
    H.push(pw((x, y) => (Math.abs(x) >= Math.abs(y) ? x : y)), pw((x, y) => (Math.abs(x) > Math.abs(y) ? x : y)));
    H.push(pw((x, y) => (Math.abs(x) <= Math.abs(y) ? x : y)), pw((x, y) => (Math.abs(x) < Math.abs(y) ? x : y)));
    H.push(pw((x, y) => (x * y < 0 ? 0 : x + y)), pw((x, y) => (x * y > 0 ? x + y : x === 0 ? y : y === 0 ? x : 0)));
    const T = [mirror, (v) => cyc(v, 1), (v) => cyc(v, -1), (v) => cyc(v, 2), (v) => cyc(v, -2), (v) => edge(v, 1), (v) => edge(v, -1)];
    const lin = [(x, y) => x + y, (x, y) => x - y, (x, y) => y - x, Math.max, Math.min];
    T.forEach((t) => {
      lin.forEach((f) => {
        H.push((a, b) => t(pw(f)(a, b)));
        H.push((a, b) => pw(f)(t(a), b));
        H.push((a, b) => pw(f)(a, t(b)));
        H.push((a, b) => pw(f)(t(a), t(b)));
      });
      H.push((a) => t(a), (a, b) => t(b), (a) => t(a).map((x) => -x), (a, b) => t(b).map((x) => -x));
    });
    return H;
  })();

  /* set of predictions of all hypotheses consistent with the grid (rows and columns) */
  function predictions(W) {
    const preds = new Set();
    const rowWise = [
      [W[0][0], W[0][1], W[0][2]],
      [W[1][0], W[1][1], W[1][2]],
      [W[2][0], W[2][1]],
    ];
    const colWise = [
      [W[0][0], W[1][0], W[2][0]],
      [W[0][1], W[1][1], W[2][1]],
      [W[0][2], W[1][2]],
    ];
    [rowWise, colWise].forEach((G) => {
      HYP.forEach((h) => {
        if (K(h(G[0][0], G[0][1])) === K(G[0][2]) && K(h(G[1][0], G[1][1])) === K(G[1][2])) preds.add(K(h(G[2][0], G[2][1])));
      });
    });
    return preds;
  }

  /* simple per-panel attributes a solver might count */
  const ATTR = [
    (v) => v.filter((x, i) => i > 0 && i < N - 1 && x > v[i - 1] && x > v[i + 1]).length,
    (v) => v.filter((x, i) => i > 0 && i < N - 1 && x < v[i - 1] && x < v[i + 1]).length,
    (v) => v.filter((x) => x === 0).length,
    (v) => v.filter((x) => x > 0).length,
    (v) => v.filter((x) => x < 0).length,
    (v) => Math.max(...v),
    (v) => Math.min(...v),
    (v) => v[4],
    (v) => v[0],
    (v) => v[N - 1],
    (v) => {
      const nz = v.filter((x) => x !== 0);
      return nz.filter((x, i) => i && x * nz[i - 1] < 0).length;
    },
  ];

  function pathD(v) {
    const ys = v.map(Y);
    const h = 10;
    const d = [];
    for (let k = 0; k < N - 1; k++) d.push((ys[k + 1] - ys[k]) / h);
    const m = ys.map((_, k) => (k === 0 ? d[0] : k === N - 1 ? d[N - 2] : d[k - 1] * d[k] <= 0 ? 0 : (d[k - 1] + d[k]) / 2));
    for (let k = 0; k < N - 1; k++) {
      if (d[k] === 0) {
        m[k] = 0;
        m[k + 1] = 0;
        continue;
      }
      const al = m[k] / d[k];
      const be = m[k + 1] / d[k];
      const s = al * al + be * be;
      if (s > 9) {
        const tau = 3 / Math.sqrt(s);
        m[k] = tau * al * d[k];
        m[k + 1] = tau * be * d[k];
      }
    }
    let p = `M${RM.fmt(XS[0])} ${RM.fmt(ys[0])}`;
    for (let k = 0; k < N - 1; k++) {
      p += `C${RM.fmt(XS[k] + h / 3)} ${RM.fmt(ys[k] + (m[k] * h) / 3)} ${RM.fmt(XS[k + 1] - h / 3)} ${RM.fmt(ys[k + 1] - (m[k + 1] * h) / 3)} ${RM.fmt(XS[k + 1])} ${RM.fmt(ys[k + 1])}`;
    }
    return p;
  }

  function render(spec) {
    const pic = new RM.Pic();
    for (let k = 1; k <= 3; k++)
      [-1, 1].forEach((s) => pic.add(`<line x1="5" y1="${50 + s * 12 * k}" x2="95" y2="${50 + s * 12 * k}" stroke="${RM.LIGHT}" stroke-width="0.9"/>`));
    XS.forEach((x) => pic.add(`<line x1="${x}" y1="9" x2="${x}" y2="91" stroke="${RM.LIGHT}" stroke-width="0.9"/>`));
    pic.add(`<line x1="4" y1="50" x2="96" y2="50" stroke="${RM.GRAY}" stroke-width="1.4"/>`);
    const dash = spec.dash ? ` stroke-dasharray="4.2 2.6"` : '';
    pic.add(`<path d="${pathD(spec.v)}" fill="none" stroke="${RM.INK}" stroke-width="2.1" stroke-linejoin="round" stroke-linecap="round"${dash}/>`);
    spec.v.forEach((v, i) => pic.add(`<circle cx="${XS[i]}" cy="${Y(v)}" r="2.3" fill="${RM.INK}"/>`));
    return pic.svg();
  }
  const key = (spec) => K(spec.v) + (spec.dash ? 'd' : 's');

  RM.register({
    id: 'wave-sum',
    name: 'Superposition',
    difficulty: 7,
    generate(rng, variant) {
      const v4 = variant % 4;
      const opName = ['sum', 'sub', 'sum', 'rsub'][v4];
      const op = OPS[opName];
      const W = [makeRow(rng, op), makeRow(rng, op), makeRow(rng, op)];
      const ans = W[2][2];
      const a = W[2][0];
      const b = W[2][1];
      // the waves of a puzzle must all look different
      const all = [].concat(...W).map(K);
      RM.need(new Set(all).size === 9);
      RM.need(K(mirror(ans)) !== K(ans));

      // 1. rule identifiability: every hypothesis consistent with rows 1–2 (or columns 1–2) predicts the answer
      const preds = predictions(W);
      RM.need(preds.size === 1 && preds.has(K(ans)));
      // 2. no shortcut through simple counts (peaks, zeros, extremes…)
      ATTR.forEach((f) => RM.needNoConflict(RM.grid3((r, c) => f(W[r][c])), f(ans), 'numeric'));

      // ---------------------------------------------------------- distractors
      const slipOp = OPS[op.slip];
      const firstName = opName === 'rsub' ? 'second' : 'first';
      const singles = [];
      for (let g = 0; g < N; g++) {
        const tricky = a[g] * b[g] !== 0 && (opName === 'sum' ? a[g] * b[g] < 0 : a[g] * b[g] > 0);
        const sv = slipOp.f(a[g], b[g]);
        if (sv !== ans[g] && sv >= -3 && sv <= 3)
          singles.push({
            g,
            val: sv,
            pri: tricky ? 3 : 2,
            why:
              opName === 'sum'
                ? `at guide ${g + 1} the second height was subtracted instead of added: ${calc(op, a[g], b[g])}, not ${S(sv)}`
                : `at guide ${g + 1} the heights were added instead of subtracted: ${calc(op, a[g], b[g])}, not ${S(sv)}`,
          });
        [-1, 1].forEach((d) => {
          const val = ans[g] + d;
          if (val < -3 || val > 3) return;
          singles.push({
            g,
            val,
            pri: tricky || ans[g] === 0 ? 2 : 1,
            why: `at guide ${g + 1} the wave is one step too ${d > 0 ? 'high' : 'low'}: ${calc(op, a[g], b[g])}, not ${S(val)}`,
          });
        });
        const keep = opName === 'rsub' ? b[g] : a[g];
        if (keep !== ans[g] && keep !== sv && Math.abs(keep - ans[g]) <= 2)
          singles.push({
            g,
            val: keep,
            pri: 1,
            why: `at guide ${g + 1} only the ${firstName} wave's height was kept: ${calc(op, a[g], b[g])}, not ${S(keep)}`,
          });
      }
      RM.need(singles.length >= 4);

      // wrong rules applied to the whole wave
      const far = [];
      const addFar = (vals, why) => {
        if (!vals || !inRange(vals) || K(vals) === K(ans)) return;
        const diffs = vals.filter((x, i) => x !== ans[i]).length;
        if (diffs < 2) return;
        far.push({ vals, why });
      };
      const pw = (f) => a.map((x, i) => f(x, b[i]));
      const otherOps = ['sum', 'sub', 'rsub'].filter((o) => o !== opName);
      const opWords = {
        sum: 'the two waves added together',
        sub: 'the first wave minus the second',
        rsub: 'the second wave minus the first',
      };
      const ruleWord = opWords[opName];
      otherOps.forEach((o) => addFar(pw(OPS[o].f), `this is ${opWords[o]}, not ${ruleWord}`));
      addFar(pw(Math.max), `this keeps, at every guide, the higher of the two heights — it is not ${ruleWord}`);
      addFar(pw(Math.min), `this keeps, at every guide, the lower of the two heights — it is not ${ruleWord}`);
      addFar(mirror(ans), `this is the right wave mirrored left-to-right`);
      addFar(
        ans.map((x) => -x),
        `this is the right wave turned upside down`
      );
      addFar(
        ans.map((x) => Math.abs(x)),
        `the negative heights were flipped above the axis`
      );
      [1, -1].forEach((s) => {
        const bs = edge(b, s);
        addFar(
          a.map((x, i) => op.f(x, bs[i])),
          `the second wave was slid one guide to the ${s > 0 ? 'right' : 'left'} before combining (guides no longer line up)`
        );
      });
      addFar(
        a.map((x, i) => op.f(x, b[N - 1 - i])),
        `the second wave was read backwards (right to left) before combining`
      );
      RM.need(far.length >= 2);

      const detail = (vals) => {
        const bad = RM.range(N).filter((g) => vals[g] !== ans[g]);
        const g = bad[0];
        return `e.g. at guide ${g + 1}: ${calc(op, a[g], b[g])}, but this wave is at ${S(vals[g])}`;
      };
      const tryBuild = () => {
        // two near misses at different guides + their combination ("square" around the answer)
        const sorted = rng.shuffle(singles).sort((x, y) => y.pri - x.pri);
        const s1 = sorted[rng.int(0, Math.min(2, sorted.length - 1))];
        const rest = sorted.filter((s) => s.g !== s1.g);
        if (!rest.length) return null;
        const s2 = rest[rng.int(0, Math.min(3, rest.length - 1))];
        const apply = (base, ...ss) => {
          const v = base.slice();
          ss.forEach((s) => (v[s.g] = s.val));
          return v;
        };
        const opts = [
          { v: ans, flaws: [] },
          { v: apply(ans, s1), flaws: [s1.why] },
          { v: apply(ans, s2), flaws: [s2.why] },
          { v: apply(ans, s1, s2), flaws: [s1.why, s2.why] },
        ];
        // two wrong rules, each also with an extra slip
        const fs = rng.sample(far, 2);
        fs.forEach((f) => {
          opts.push({ v: f.vals, flaws: [f.why, detail(f.vals)] });
          const gs = rng.shuffle(RM.range(N));
          for (const g of gs) {
            const d = rng.pick([-1, 1]);
            const val = f.vals[g] + d;
            if (val < -3 || val > 3) continue;
            const v = f.vals.slice();
            v[g] = val;
            opts.push({ v, flaws: [f.why + `, and guide ${g + 1} is moved one step ${d > 0 ? 'up' : 'down'} on top of that`, detail(v)] });
            break;
          }
        });
        if (opts.length !== 8) return null;
        if (new Set(opts.map((o) => K(o.v))).size !== 8) return null;
        // the answer must not stand out as the most "central" or most "typical" option
        const dist = (u, w) => u.reduce((s, x, i) => s + Math.abs(x - w[i]), 0);
        const tot = opts.map((o) => sumArr(opts.map((p) => dist(o.v, p.v))));
        if (tot.slice(1).every((t) => t > tot[0])) return null;
        const typ = opts.map((o) => sumArr(opts.map((p) => o.v.filter((x, i) => x === p.v[i]).length)));
        if (typ.slice(1).every((t) => t < typ[0])) return null;
        // every height of the answer also appears in some distractor at that guide
        if (!RM.range(N).every((g) => opts.slice(1).some((o) => o.v[g] === ans[g]))) return null;
        return opts;
      };
      let opts = null;
      for (let t = 0; t < 30 && !opts; t++) opts = tryBuild();
      RM.need(opts);

      // ---------------------------------------------------------- correction
      const dashRow = (r) => v4 === 2 && r === 1;
      const panels = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (r < 2 || c < 2) panels.push({ v: W[r][c], dash: dashRow(r) });
      const options = opts.map((o) => ({ spec: { v: o.v, dash: false }, flaws: o.flaws }));

      // examples from rows 1–2
      const find = (pred) => {
        for (let r = 0; r < 2; r++)
          for (let g = 0; g < N; g++) if (pred(W[r][0][g], W[r][1][g], W[r][2][g])) return { r, g };
        return null;
      };
      const ex = (e) => `row ${e.r + 1}, guide ${e.g + 1}: ${calc(op, W[e.r][0][e.g], W[e.r][1][e.g])}`;
      const cancel = find((x, y, z) => x !== 0 && y !== 0 && z === 0) || find((x, y, z) => x !== 0 && y !== 0 && Math.abs(z) < Math.max(Math.abs(x), Math.abs(y)));
      const reinf = find((x, y, z) => x !== 0 && y !== 0 && Math.abs(z) > Math.max(Math.abs(x), Math.abs(y)));
      RM.need(cancel && reinf);
      const notMax = find((x, y, z) => Math.max(x, y) !== z);
      const altOp = OPS[otherOps[0]];
      const notAlt = find((x, y, z) => altOp.f(x, y) !== z);
      RM.need(notMax && notAlt);
      const ruleText = {
        sum: 'the first two waves <b>added together, guide by guide</b> (height 3 = height 1 + height 2)',
        sub: 'the first wave <b>minus</b> the second, guide by guide (height 3 = height 1 − height 2)',
        rsub: 'the second wave <b>minus</b> the first, guide by guide (height 3 = height 2 − height 1)',
      }[opName].replace('−', MINUS);
      const altWord = { sum: 'their sum', sub: 'first minus second', rsub: 'second minus first' }[otherOps[0]];
      const list = (v) => v.map(S).join(', ');
      const rules = [
        {
          k: 'Reading a wave',
          t:
            'Each panel shows a wave crossing nine faint vertical guide lines (numbered 1 to 9 from the left). On every guide there is a dot lying exactly on one of the faint horizontal lines: read its height in steps above (+) or below (' +
            MINUS +
            ') the darker middle axis, from ' +
            MINUS +
            '3 to +3.',
        },
        {
          k: 'Superposition',
          t: `In every row the third wave is ${ruleText} — the way real waves interfere. Where the dots pull in opposite directions they cancel out (${ex(
            cancel
          )}); where they pull the same way they reinforce (${ex(reinf)}).`,
        },
        {
          k: 'Not a look-alike rule',
          t: `The third wave is not simply the higher of the two dots (row ${notMax.r + 1}, guide ${notMax.g + 1}: the higher dot is at ${S(
            Math.max(W[notMax.r][0][notMax.g], W[notMax.r][1][notMax.g])
          )}, the third wave at ${S(W[notMax.r][2][notMax.g])}), nor ${altWord} (row ${notAlt.r + 1}, guide ${notAlt.g + 1}: that would give ${S(
            altOp.f(W[notAlt.r][0][notAlt.g], W[notAlt.r][1][notAlt.g])
          )}, not ${S(W[notAlt.r][2][notAlt.g])}). Its shape is not a copy, mirror or shift of either wave either: only the guide-by-guide ${
            opName === 'sum' ? 'sum' : 'difference'
          } fits all 18 dots of rows 1 and 2.`,
        },
      ];
      if (v4 === 2) rules.push({ k: 'Solid or dashed', t: 'The middle row is drawn dashed only for decoration: the line style plays no part in the rule.' });
      rules.push({
        k: 'Row 3',
        t: `First wave: ${list(a)}. Second wave: ${list(b)}. Guide by guide: ${RM.range(N)
          .map((g) => `${g + 1}: ${calc(op, a[g], b[g])}`)
          .join('; ')}. So the missing wave passes through <b>${list(ans)}</b>.`,
      });

      return {
        panels,
        answer: { v: ans, dash: false },
        options,
        render,
        key,
        rules,
        hint: 'Two waves meet: compare the heights on each vertical guide line.',
        difficulty: 7,
      };
    },
  });
})();
