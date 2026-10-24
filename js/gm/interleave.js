/* Interleaved sequences (grandmaster): the 8 panels are read in order but they hold TWO series that alternate. Every
 * panel is one regular polygon with a small dot marking one corner (so the turning is readable); attributes: number
 * of sides, orientation, shade (3-cycle), size. The odd panels (1, 3, 5, 7) are figure X, which moves in two of the
 * attributes by a constant step (variant 0: +1 side and +45 degrees per step) while its other attributes stay fixed;
 * the even panels (2, 4, 6, 8) are figure Y, which moves in the two OTHER attributes (variant 0: shade cycle and
 * shrinking size). The answer is the next odd term. Every reading of each attribute (constant, constant step, constant
 * second difference, period 2 or 3) must agree on the odd subsequence, and readings of the whole sequence in order must
 * either be inconsistent or predict the same value. */
(function () {
  'use strict';
  const RM = window.RM;

  const FILLS = ['white', 'gray', 'black'];
  const FN = ['white', 'grey', 'black'];
  const ATTR = ['S', 'R', 'F', 'Z'];
  const FIELD = { S: 'n', R: 'rot', F: 'f', Z: 'L' };
  const MOD = { S: 0, R: 360, F: 3, Z: 0 };

  function render(sp) {
    const pic = new RM.Pic();
    const r = 10 + 5 * sp.L;
    const pts = [];
    for (let i = 0; i < sp.n; i++) {
      const a = ((sp.rot + (360 * i) / sp.n) * Math.PI) / 180;
      pts.push([50 + r * Math.sin(a), 50 - r * Math.cos(a)]);
    }
    RM.polygon(pic, pts, { fill: FILLS[sp.f], sw: 2.4 });
    const a0 = (sp.rot * Math.PI) / 180;
    const d = r - 9;
    RM.circle(pic, 50 + d * Math.sin(a0), 50 - d * Math.cos(a0), 3.8, { fill: sp.f === 2 ? 'white' : 'black', sw: 1.4 });
    return pic.svg();
  }
  const key = (sp) => `${sp.n}|${sp.rot}|${sp.f}|${sp.L}`;

  /* series: {base, step} per attribute, value at index t */
  function mk(rng, attr, mov, n) {
    let base;
    let step = 0;
    const span = n - 1;
    if (attr === 'S') {
      if (mov) {
        step = rng.pick([1, -1]);
        base = step > 0 ? rng.int(3, 7 - span) : rng.int(3 + span, 7);
      } else base = rng.int(3, 7);
    } else if (attr === 'R') {
      base = 15 * rng.int(0, 23);
      if (mov) step = rng.pick([45, -45, 60, -60]);
    } else if (attr === 'F') {
      base = rng.int(0, 2);
      if (mov) step = rng.pick([1, 2]);
    } else {
      if (mov) {
        step = rng.pick([1, -1]);
        base = step > 0 ? rng.int(1, 6 - span) : rng.int(1 + span, 6);
      } else base = rng.int(2, 5);
    }
    return { base, step, mov };
  }
  const val = (s, attr, t) => (MOD[attr] ? RM.mod(s.base + s.step * t, MOD[attr]) : s.base + s.step * t);
  const specAt = (ser, t) => ({ n: val(ser.S, 'S', t), rot: val(ser.R, 'R', t), f: val(ser.F, 'F', t), L: val(ser.Z, 'Z', t) });
  const valid = (sp) => sp.n >= 3 && sp.n <= 8 && sp.L >= 1 && sp.L <= 6;

  /* every reading of one attribute sequence that fits it, and what it predicts next */
  function preds(arr, m) {
    const N = (v) => (m ? RM.mod(v, m) : v);
    const n = arr.length;
    const out = [];
    const d = N(arr[1] - arr[0]);
    if (arr.every((v) => N(v - arr[0]) === 0)) out.push(arr[n - 1]);
    if (arr.every((v, i) => i === 0 || N(v - arr[i - 1]) === d)) out.push(arr[n - 1] + d);
    const dd = N(arr[2] - 2 * arr[1] + arr[0]);
    if (arr.every((v, i) => i + 2 >= n || N(arr[i + 2] - 2 * arr[i + 1] + arr[i]) === dd)) out.push(2 * arr[n - 1] - arr[n - 2] + dd);
    for (const p of [2, 3]) if (arr.every((v, i) => i + p >= n || N(arr[i + p] - v) === 0)) out.push(arr[n - p]);
    return out.map(N);
  }

  RM.register({
    id: 'interleave',
    name: 'Interleaved sequences',
    difficulty: 7,
    reading: 'sequence',
    generate(rng, variant) {
      let xm;
      if (variant === 0) xm = ['S', 'R'];
      else xm = rng.sample(ATTR, 2);
      const ym = ATTR.filter((a) => !xm.includes(a));
      const X = {};
      const Y = {};
      ATTR.forEach((a) => {
        X[a] = mk(rng, a, xm.includes(a), 5);
        Y[a] = mk(rng, a, ym.includes(a), 5 - 1);
      });
      const xs = [0, 1, 2, 3, 4].map((t) => specAt(X, t));
      const ys = [0, 1, 2, 3].map((t) => specAt(Y, t));
      const vis = [];
      for (let t = 0; t < 4; t++) vis.push(xs[t], ys[t]);
      const ans = xs[4];
      RM.need(xs.every(valid) && ys.every(valid));
      RM.need(new Set(vis.concat([ans]).map(key)).size === 9);
      /* the two figures must not simply look alike (otherwise nothing to interleave) */
      RM.need(ys.every((y) => key(y) !== key(ans)));

      /* identifiability, attribute by attribute */
      for (const a of ATTR) {
        const f = FIELD[a];
        const m = MOD[a];
        const N = (v) => (m ? RM.mod(v, m) : v);
        const odd = [0, 1, 2, 3].map((t) => xs[t][f]);
        const po = preds(odd, m);
        RM.need(po.length > 0 && po.every((v) => v === N(ans[f])));
        const whole = vis.map((s) => s[f]);
        RM.need(preds(whole, m).every((v) => v === N(ans[f])));
      }

      /* distractors */
      const X5 = ans;
      const nameOf = (a) => ({ S: 'number of sides', R: 'orientation', F: 'shade', Z: 'size' }[a]);
      const diffTxt = (c, a) => {
        if (a === 'S') return `${c.n} sides instead of ${X5.n}`;
        if (a === 'R') return `the corner dot sits at ${c.rot}° instead of ${X5.rot}° (clockwise from the top)`;
        if (a === 'F') return `${FN[c.f]} shade instead of ${FN[X5.f]}`;
        return `size level ${c.L} instead of ${X5.L}`;
      };
      const pool = new Map();
      const put = (sp, bonus, why) => {
        if (!valid(sp)) return;
        sp = { n: sp.n, rot: RM.mod(sp.rot, 360), f: RM.mod(sp.f, 3), L: sp.L };
        const k = key(sp);
        if (k === key(ans)) return;
        const diffs = ATTR.filter((a) => sp[FIELD[a]] !== X5[FIELD[a]]);
        const score = diffs.length + bonus + rng.next() * 0.6;
        const flaws = [(why ? why + ': ' : '') + diffs.map((a) => diffTxt(sp, a)).join('; ')];
        if (!pool.has(k) || pool.get(k).score > score) pool.set(k, { spec: sp, flaws, score });
      };
      const modv = (a, v) => (MOD[a] ? RM.mod(v, MOD[a]) : v);
      put(specAt(Y, 4), -0.2, 'this is the next figure of the even series (panels 2, 4, 6, 8), not of the odd series');
      put(specAt(X, 5), -0.5, 'the odd series was advanced twice instead of once');
      put(xs[3], 0.2, 'no step at all: panel 7 repeated');
      const onP8 = Object.assign({}, ys[3]);
      xm.forEach((a) => (onP8[FIELD[a]] = modv(a, ys[3][FIELD[a]] + X[a].step)));
      put(onP8, 0.3, "the odd series' steps were applied to panel 8, which belongs to the other series");
      const hyb = Object.assign({}, X5);
      ym.forEach((a) => (hyb[FIELD[a]] = specAt(Y, 4)[FIELD[a]]));
      put(hyb, 0.1, "the even series' changes were applied here, but in the odd series these attributes never change");
      const hyb2 = Object.assign({}, specAt(Y, 4));
      xm.forEach((a) => (hyb2[FIELD[a]] = X5[FIELD[a]]));
      put(hyb2, 0.2, 'the two series were mixed');
      ym.forEach((a) => {
        const sp = Object.assign({}, X5);
        sp[FIELD[a]] = specAt(Y, 4)[FIELD[a]];
        put(sp, 0.3, `the ${nameOf(a)} of the even series was used, but in the odd series it never changes`);
      });
      for (const a of ATTR) {
        const f = FIELD[a];
        const alts = [];
        if (a === 'S') alts.push(X5.n + 1, X5.n - 1, X5.n + 2, X5.n - 2);
        if (a === 'R') {
          const st = X[a].mov ? X[a].step : 45;
          alts.push(X5.rot + st, X5.rot - st, X5.rot + 90, X5.rot - 90);
        }
        if (a === 'F') alts.push(X5.f + 1, X5.f + 2);
        if (a === 'Z') alts.push(X5.L + 1, X5.L - 1, X5.L + 2, X5.L - 2);
        if (X[a].mov) alts.push(val(X[a], a, 3), val(X[a], a, 5));
        alts.forEach((v, i) => {
          const sp = Object.assign({}, X5);
          sp[f] = v;
          put(sp, i < 2 ? 0 : 0.5, X[a].mov && (v === val(X[a], a, 3) || v === val(X[a], a, 5)) ? `the ${nameOf(a)} ${v === val(X[a], a, 3) ? 'did not advance' : 'advanced twice'}` : `the ${nameOf(a)} is wrong`);
        });
      }
      let chosen = null;
      for (let t = 0; t < 400 && !chosen; t++) {
        const list = [...pool.values()].map((o) => ({ o, r: o.score + rng.next() * 4 })).sort((x, y) => x.r - y.r).slice(0, 7).map((x) => x.o);
        const specs = list.map((o) => o.spec).concat([ans]);
        let modes = 0;
        for (const a of ATTR) {
          const f = FIELD[a];
          const m = {};
          specs.forEach((s) => (m[s[f]] = (m[s[f]] || 0) + 1));
          if (Object.values(m).filter((x) => x >= m[ans[f]]).length === 1) modes++;
        }
        if (modes <= 3 && ATTR.every((a) => list.some((o) => o.spec[FIELD[a]] === ans[FIELD[a]]))) chosen = list;
      }
      RM.need(chosen);

      /* correction */
      const fmtV = (a, v) => (a === 'S' ? String(v) : a === 'R' ? v + '°' : a === 'F' ? FN[v] : 'level ' + v);
      const stepTxt = (a, s) => {
        if (a === 'S') return `${s.step > 0 ? '+' : '−'}1 side each time`;
        if (a === 'R') return `${s.step > 0 ? '+' : '−'}${Math.abs(s.step)}° each time`;
        if (a === 'F') return `shade moves ${s.step === 1 ? 'white → grey → black → white' : 'white → black → grey → white'} (cycle of three)`;
        return `one size level ${s.step > 0 ? 'bigger' : 'smaller'} each time`;
      };
      const label = { S: 'number of sides', R: 'orientation of the corner dot (degrees clockwise from the top)', F: 'shade', Z: 'size (levels 1 = smallest to 6 = largest)' };
      const series = (S, n, movers) =>
        ATTR.map((a) => {
          const vs = [];
          for (let t = 0; t < n; t++) vs.push(fmtV(a, val(S[a], a, t)));
          return movers.includes(a) ? `${label[a]}: ${vs.join(', ')} (${stepTxt(a, S[a])})` : `${label[a]}: always ${vs[0]}`;
        });
      const li = (arr) => '<ul style="margin:.3em 0 .3em 1.1em;padding:0"><li>' + arr.join('</li><li>') + '</li></ul>';
      const rules = [
        { k: 'Two series', t: 'read in order, the panels do not form one sequence: the <b>odd panels</b> (1, 3, 5, 7) belong to one series and the <b>even panels</b> (2, 4, 6, 8) to another, but both are drawn as the same kind of figure (a regular polygon with one marked corner). Look at the attributes of every other panel.' },
        { k: 'Odd series', t: `panels 1, 3, 5, 7 (the series that continues in panel 9): ${li(series(X, 4, xm))}` },
        { k: 'Even series', t: `panels 2, 4, 6, 8: ${li(series(Y, 4, ym))}These steps belong to the other series and have no effect on panel 9; applying them (or the odd series' steps) to the neighbouring panel gives the wrong figure.` },
        { k: 'Panel 9', t: `panel 9 is the next odd term: ${li(ATTR.map((a) => `${label[a]}: <b>${fmtV(a, ans[FIELD[a]])}</b>${xm.includes(a) ? ' (' + fmtV(a, xs[3][FIELD[a]]) + ' → ' + fmtV(a, ans[FIELD[a]]) + ')' : ' (unchanged)'}`))}` },
      ];
      return {
        difficulty: 7,
        hint: 'compare each panel with the one two places before it, not with its neighbour.',
        panels: vis,
        answer: ans,
        options: [{ spec: ans, flaws: [] }].concat(chosen.map((o) => ({ spec: o.spec, flaws: o.flaws }))),
        render,
        key,
        rules,
      };
    },
  });
})();
