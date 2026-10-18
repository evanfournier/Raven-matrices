/* Code breaker (grandmaster): Mastermind. Eight guesses with their key pegs (black = right symbol, right place;
   white = right symbol, wrong place); the ninth panel is the unique secret code consistent with all eight scores. */
(function () {
  'use strict';
  const RM = window.RM;
  const SYMS = [
    { s: 'circle', f: 'black', n: 'black circle' },
    { s: 'square', f: 'white', n: 'white square' },
    { s: 'triangle', f: 'gray', n: 'gray triangle' },
    { s: 'diamond', f: 'black', n: 'black diamond' },
    { s: 'star5', f: 'white', n: 'white star' },
    { s: 'cross', f: 'black', n: 'black cross' },
    { s: 'hexagon', f: 'gray', n: 'gray hexagon' },
  ];
  const CFG = [
    { ns: 6, n: 4, rep: false },
    { ns: 6, n: 5, rep: false },
    { ns: 6, n: 4, rep: true },
    { ns: 7, n: 4, rep: false },
  ];

  function score(g, c, ns) {
    let b = 0;
    const cg = new Array(ns).fill(0), cc = new Array(ns).fill(0);
    for (let i = 0; i < g.length; i++) { if (g[i] === c[i]) b++; cg[g[i]]++; cc[c[i]]++; }
    let t = 0;
    for (let s = 0; s < ns; s++) t += Math.min(cg[s], cc[s]);
    return [b, t - b];
  }
  function allCodes(cf) {
    const out = [];
    (function rec(cur) {
      if (cur.length === cf.n) { out.push(cur.slice()); return; }
      for (let s = 0; s < cf.ns; s++) {
        if (!cf.rep && cur.indexOf(s) >= 0) continue;
        cur.push(s); rec(cur); cur.pop();
      }
    })([]);
    return out;
  }
  function randCode(rng, cf) {
    if (cf.rep) { const c = []; for (let i = 0; i < cf.n; i++) c.push(rng.int(0, cf.ns - 1)); return c; }
    return rng.shuffle(RM.range(cf.ns)).slice(0, cf.n);
  }

  function generate(rng, variant) {
    const cf = CFG[variant & 3], N = cf.n, NS = cf.ns;
    const codes = allCodes(cf);
    const secret = randCode(rng, cf);
    const guesses = [], scores = [];
    let alive = codes;
    for (let k = 0; k < 8; k++) {
      const target = k === 7 ? 1 : Math.max(2, Math.round(Math.pow(codes.length, (7 - k) / 8) * 0.9));
      let best = null, bestD = 1e9;
      for (let t = 0; t < 14; t++) {
        const g = randCode(rng, cf);
        if (g.join() === secret.join()) continue;
        if (new Set(g).size < 2) continue;
        if (guesses.some((x) => x.join() === g.join())) continue;
        const sc = score(g, secret, NS);
        const cnt = alive.filter((c) => { const s = score(g, c, NS); return s[0] === sc[0] && s[1] === sc[1]; }).length;
        if (k < 7 && cnt < 2) continue;
        const d = Math.abs(Math.log(cnt / target));
        if (d < bestD) { bestD = d; best = { g, sc }; }
        if (k === 7 && cnt === 1) break;
      }
      RM.need(best);
      guesses.push(best.g); scores.push(best.sc);
      alive = alive.filter((c) => { const s = score(best.g, c, NS); return s[0] === best.sc[0] && s[1] === best.sc[1]; });
    }
    RM.need(alive.length === 1 && alive[0].join() === secret.join());
    // violation counts per code
    const viol = (c) => {
      const v = [];
      for (let i = 0; i < 8; i++) {
        const s = score(guesses[i], c, NS);
        if (s[0] !== scores[i][0] || s[1] !== scores[i][1]) v.push({ i, s });
      }
      return v;
    };
    // at least two guesses necessary
    let necessary = 0;
    for (let i = 0; i < 8; i++) {
      let cnt = 0;
      for (const c of codes) {
        let ok = true;
        for (let j = 0; j < 8 && ok; j++) {
          if (j === i) continue;
          const s = score(guesses[j], c, NS);
          if (s[0] !== scores[j][0] || s[1] !== scores[j][1]) ok = false;
        }
        if (ok && ++cnt >= 2) break;
      }
      if (cnt >= 2) necessary++;
    }
    RM.need(necessary >= 2);
    RM.need(scores.filter((s) => s[0] > 0).length >= 2);
    const cands = [];
    for (const c of codes) {
      if (c.join() === secret.join()) continue;
      const v = viol(c);
      if (v.length === 0 || v.length > 2) continue;
      let dist = 0;
      for (const x of v) dist += Math.abs(x.s[0] - scores[x.i][0]) + Math.abs(x.s[1] - scores[x.i][1]);
      let same = 0;
      for (let p = 0; p < N; p++) if (c[p] === secret[p]) same++;
      cands.push({ c, v, w: v.length * 10 + dist - same * 0.5 + rng.next() });
    }
    cands.sort((a, b) => a.w - b.w);
    RM.need(cands.length >= 7);
    // keep variety: take best 7 from the top 14 randomly weighted
    const pool = cands.slice(0, Math.min(cands.length, 12));
    const pick = rng.sample(pool, 7);
    const options = pick.map((o) => ({
      spec: { code: o.c, b: N, w: 0 },
      flaws: o.v.map((x) => `Against guess ${x.i + 1} this code would score ${x.s[0]} black and ${x.s[1]} white, but the key pegs show ${scores[x.i][0]} black and ${scores[x.i][1]} white.`),
    }));
    const answer = { code: secret, b: N, w: 0 };
    options.push({ spec: answer, flaws: [] });

    const panels = guesses.map((g, i) => ({ code: g, b: scores[i][0], w: scores[i][1] }));
    const nm = (s) => SYMS[s].n;
    // rules text
    const zero = [];
    for (let s = 0; s < NS; s++) {
      if (guesses.some((g, i) => scores[i][0] + scores[i][1] === 0 && g.indexOf(s) >= 0)) zero.push(s);
    }
    const lines = guesses.map((g, i) => `${i + 1}: ${scores[i][0]} black, ${scores[i][1]} white`).join(' &nbsp;|&nbsp; ');
    const rules = [
      { k: 'Reading a panel', t: `Each panel is a guess of ${N} pegs (left to right) and, below it, its key pegs: a <b>black</b> key means one peg has the right symbol in the right place, a <b>white</b> (outlined) key means a right symbol in the wrong place, an empty socket means nothing. Blacks come first. All eight panels are scored against the <b>same hidden code</b>; panels are numbered 1 to 8 in reading order.` },
      { k: 'The ninth panel', t: `The missing panel shows the hidden code itself, so its key pegs are all black (${N} black). ${cf.rep ? 'A symbol may appear several times in a code.' : 'No symbol is repeated in the code or in any guess.'} The scores are: ${lines}.` },
      { k: 'Deduction', t: (zero.length ? `Guesses scoring nothing show that the ${zero.map(nm).join(', ')} ${zero.length > 1 ? 'are' : 'is'} not in the code at all. ` : '') + `Combining the black and white counts of the eight guesses leaves exactly one code that fits every score; at least two of the guesses are indispensable to rule out the others.` },
      { k: 'Check', t: `The code is <b>${secret.map(nm).join(', ')}</b> (left to right). Check: against guess 1 it scores ${scores[0][0]} black and ${scores[0][1]} white, against guess 8 it scores ${scores[7][0]} black and ${scores[7][1]} white, exactly as shown. Each wrong option contradicts at least one guess.` },
    ];

    return {
      panels,
      answer,
      options,
      render(spec) {
        const pic = new RM.Pic();
        const r = N === 4 ? 9 : 7.4, dx = N === 4 ? 22 : 18;
        const x0 = 50 - dx * (N - 1) / 2;
        for (let i = 0; i < N; i++) {
          const sy = SYMS[spec.code[i]];
          RM.shape(pic, sy.s, x0 + i * dx, 26, r, { fill: sy.f, sw: 2 });
        }
        RM.line(pic, 12, 46, 88, 46, { sw: 1.5, color: RM.LIGHT });
        const cols = Math.ceil(N / 2), kd = 17, kx0 = 50 - kd * (cols - 1) / 2;
        for (let i = 0; i < N; i++) {
          const x = kx0 + (i % cols) * kd, y = 62 + Math.floor(i / cols) * 18;
          if (i < spec.b) RM.circle(pic, x, y, 6, { fill: 'black', sw: 1.5 });
          else if (i < spec.b + spec.w) RM.circle(pic, x, y, 6, { fill: 'white', sw: 2 });
          else RM.circle(pic, x, y, 2.5, { fill: 'light', sw: 0.1, stroke: RM.LIGHT });
        }
        return pic.svg();
      },
      key: (s) => s.code.join('') + ':' + s.b + s.w,
      rules,
      hint: 'Each small group of key pegs scores the guess above it against the one hidden code.',
    };
  }

  RM.register({ id: 'mastermind', name: 'Code breaker', difficulty: 8, generate });
})();
