/* Elite families (g1): conditional-turn, cipher, string-ops — set G "Codes & conditions". */
(function () {
  'use strict';
  const RM = window.RM;
  const { nm } = RM;
  const CN = { black: 'black', white: 'white', gray: 'grey' };
  const turnText = (d) => ({ 1: '90° clockwise', 3: '90° anticlockwise', 2: 'a half turn' }[RM.mod(d, 4)] || 'no turn');

  /* ================================================================ Two-way turn */
  const GLYPHS = ['arrow', 'flag', 'lshape', 'bolt', 'crescent', 'house', 'tshape', 'chevron', 'trapezoid', 'drop'];
  RM.register({
    id: 'conditional-turn',
    name: 'Two-way turn',
    difficulty: 6,
    generate(rng, variant) {
      const v = variant % 4;
      const cols = v < 2 ? ['black', 'white'] : ['black', 'white', 'gray'];
      let D = { black: 1, white: 3, gray: 2 };
      if (v === 3) {
        const vals = rng.shuffle([1, 3, 2]);
        D = { black: vals[0], white: vals[1], gray: vals[2] };
      }
      const sh = v === 0 || v === 2 ? 1 : -1; // colours move right (+1) or left (−1)
      const shift = (c) => c.map((_, i) => c[RM.mod(i - sh, 3)]);
      const step = (st) => ({ o: st.o.map((o, i) => RM.mod(o + D[st.c[i]], 4)), c: shift(st.c) });
      const rows = RM.range(3).map(() => {
        const s = rng.sample(GLYPHS, 3);
        let c;
        do c = RM.range(3).map(() => rng.pick(cols));
        while (new Set(c).size < 2);
        const a = { o: RM.range(3).map(() => rng.int(0, 3)), c };
        const b = step(a);
        return [a, b, step(b)].map((st) => ({ s, o: st.o, c: st.c }));
      });
      // --- colours: every position permutation fitting rows 1–2 must agree
      const perms = [[0, 1, 2], [1, 2, 0], [2, 0, 1], [0, 2, 1], [2, 1, 0], [1, 0, 2]];
      const cp = new Set();
      perms.forEach((p) => {
        const H = (c) => p.map((j) => c[j]);
        if ([0, 1].every((r) => [0, 1].every((k) => H(rows[r][k].c).join() === rows[r][k + 1].c.join()))) cp.add(H(rows[2][1].c).join());
      });
      RM.need(cp.size === 1 && cp.has(rows[2][2].c.join()));
      // --- rotations: alternative explanations of the turns
      const trans = [];
      [0, 1].forEach((r) => [0, 1].forEach((k) => rows[r][k].o.forEach((o, i) => trans.push({ step: k, i, src: rows[r][k].c[i], dst: rows[r][k + 1].c[i], d: RM.mod(rows[r][k + 1].o[i] - o, 4) }))));
      const learn = (keyf) => {
        const t = {};
        for (const x of trans) {
          const k = keyf(x);
          if (t[k] !== undefined && t[k] !== x.d) return null;
          t[k] = x.d;
        }
        return t;
      };
      const q = rows[2][1];
      const target = rows[2][2].o.join();
      const preds = new Set();
      const hyps = [
        [(x) => x.src, (i) => q.c[i]],
        [(x) => x.i, (i) => i],
        [(x) => x.step + ':' + x.i, (i) => '1:' + i],
        [(x) => x.step, () => 1],
        [(x) => x.dst, (i) => rows[2][2].c[i]],
        [() => 'all', () => 'all'],
      ];
      let intendedFits = false;
      hyps.forEach(([kf, qk], h) => {
        const t = learn(kf);
        if (!t) return;
        const ks = [0, 1, 2].map(qk);
        if (ks.some((k) => t[k] === undefined)) return;
        const p = q.o.map((o, i) => RM.mod(o + t[ks[i]], 4)).join();
        preds.add(p);
        if (h === 0) intendedFits = p === target;
      });
      RM.need(intendedFits && preds.size === 1);
      const ans = rows[2][2];
      const [a, b] = rng.sample([0, 1, 2], 2);
      const other = (i) => cols.filter((c) => c !== q.c[i] && RM.mod(q.o[i] + D[c], 4) !== ans.o[i]);
      RM.need(other(a).length && other(b).length);
      const ca = rng.pick(other(a));
      const cb = rng.pick(other(b));
      const XS = [22, 50, 78];
      const pos = ['left', 'middle', 'right'];
      const dtab = cols.map((c) => `${CN[c]} → ${turnText(D[c])}`).join(', ');
      return {
        difficulty: v >= 2 ? 7 : 6,
        hint: "a glyph's colour decides how it turns.",
        panels: RM.flat(rows),
        answer: ans,
        render(sp) {
          const pic = new RM.Pic();
          RM.line(pic, 8, 70, 92, 70, { sw: 1, color: RM.LIGHT });
          sp.s.forEach((g, i) => RM.shape(pic, g, XS[i], 46, 13, { fill: sp.c[i], rot: sp.o[i] * 90, sw: 2 }));
          return pic.svg();
        },
        perturb: [
          { apply: (s) => ((s.o[a] = RM.mod(q.o[a] + D[ca], 4)), s), why: `the ${pos[a]} glyph turned as if it were ${CN[ca]} — it was ${CN[q.c[a]]}` },
          { apply: (s) => ((s.c = q.c.slice()), s), why: 'the colours did not move on' },
          { apply: (s) => ((s.o[b] = RM.mod(q.o[b] + D[cb], 4)), s), why: `the ${pos[b]} glyph turned as if it were ${CN[cb]} — it was ${CN[q.c[b]]}` },
        ],
        rules: [
          { k: 'Turning', t: `at every step each glyph turns according to the colour it has <i>before</i> the step: ${dtab}.` },
          { k: 'Colours', t: `the colours do not travel with the glyphs: the colour pattern itself moves one place to the <b>${sh > 0 ? 'right' : 'left'}</b> at every step (the end one wraps around).` },
          { k: 'Answer', t: `in the 2nd panel of row 3 the glyphs are ${q.c.map((c) => CN[c]).join(', ')} → they turn ${q.c.map((c) => turnText(D[c])).join(', ')}; the colours become <b>${ans.c.map((c) => CN[c]).join(', ')}</b>.` },
        ],
      };
    },
  });

  /* ================================================================ Cipher */
  const SYMS = ['circle', 'triangle', 'square', 'star5', 'diamond', 'cross', 'heart'];
  const allPerms = (n) => {
    if (n === 1) return [[0]];
    const out = [];
    allPerms(n - 1).forEach((p) => {
      for (let i = 0; i <= p.length; i++) out.push(p.slice(0, i).concat([n - 1], p.slice(i)));
    });
    return out;
  };
  const P4 = allPerms(4);
  const P3 = allPerms(3);
  RM.register({
    id: 'cipher',
    name: 'Cipher',
    difficulty: 6,
    generate(rng, variant) {
      const v = variant % 4;
      const types = rng.sample(SYMS, 4);
      // derangement substitution σ (no symbol maps to itself)
      let sig;
      do sig = rng.shuffle([0, 1, 2, 3]);
      while (sig.some((x, i) => x === i) || (v === 0 && new Set([sig[0], sig[sig[0]], sig[sig[sig[0]]]]).size < 3));
      const MOVES = {
        left: [1, 2, 3, 0],
        right: [3, 0, 1, 2],
        reverse: [3, 2, 1, 0],
        halves: [2, 3, 0, 1],
      };
      const mv = ['left', 'right', 'reverse', 'halves'][v];
      const altMv = { left: 'right', right: 'left', reverse: 'left', halves: 'left' }[mv];
      const colourCycle = v === 3;
      const movePos = (arr, m) => MOVES[m].map((j) => arr[j]);
      const enc = (w) => w.map((x) => sig[x]);
      const step = (st) => ({ w: movePos(enc(st.w), mv), k: movePos(colourCycle ? st.k.map((c) => (c + 1) % 3) : st.k, mv) });
      const rows = RM.range(3).map(() => {
        let w;
        do w = RM.range(4).map(() => rng.int(0, 3));
        while (new Set(w).size < 3);
        const a = { w, k: RM.range(4).map(() => (colourCycle ? rng.int(0, 2) : 0)) };
        const b = step(a);
        return [a, b, step(b)];
      });
      const key = (st) => st.w.join('') + '/' + st.k.join('');
      const preds = new Set();
      const cmaps = colourCycle ? P3 : [[0, 1, 2]];
      P4.forEach((s2) =>
        P4.forEach((pi) =>
          cmaps.forEach((cm) => {
            const H = (st) => ({ w: pi.map((j) => s2[st.w[j]]), k: pi.map((j) => cm[st.k[j]]) });
            if ([0, 1].every((r) => [0, 1].every((c) => key(H(rows[r][c])) === key(rows[r][c + 1])))) preds.add(key(H(rows[2][1])));
          })
        )
      );
      RM.need(preds.size === 1 && preds.has(key(rows[2][2])));
      const src = rows[2][1];
      const errSlot = rng.int(0, 3);
      const compute = (sp) => {
        let w = sp.sub ? enc(src.w) : src.w.slice();
        let k = colourCycle ? src.k.map((c) => (c + 1) % 3) : src.k.slice();
        w = movePos(w, sp.mv);
        k = movePos(k, sp.mv);
        if (sp.err) w[errSlot] = sig[w[errSlot]];
        return { w, k };
      };
      const COLF = ['white', 'gray', 'black'];
      const sy = (t) => nm(types[t]);
      const sigText = [0, 1, 2, 3].map((t) => `${sy(t)} → ${sy(sig[t])}`).join(', ');
      const MV = { left: 'shifts one place to the left (the first symbol goes to the end)', right: 'shifts one place to the right (the last symbol comes to the front)', reverse: 'is reversed', halves: 'swaps its two halves' };
      return {
        difficulty: v === 3 ? 7 : 6,
        hint: 'every symbol becomes another symbol — and they move.',
        panels: RM.flat(rows.map((r) => r.map((st) => ({ fixed: st })))),
        answer: { sub: true, mv, err: false },
        key: (sp) => key(sp.fixed || compute(sp)),
        render(sp) {
          const st = sp.fixed || compute(sp);
          const pic = new RM.Pic();
          pic.add(`<rect x="5" y="30" width="90" height="40" rx="4" fill="none" stroke="${RM.INK}" stroke-width="1.8"/>`);
          st.w.forEach((t, i) => {
            const x = 6.5 + i * 22;
            if (!colourCycle && i % 2 === 0) pic.add(`<rect x="${x}" y="31.5" width="21" height="37" fill="${RM.FAINT}"/>`);
            RM.shape(pic, types[t], x + 10.5, 50, 8.5, { fill: colourCycle ? COLF[st.k[i]] : 'black', sw: 1.6 });
          });
          return pic.svg();
        },
        perturb: [
          { apply: (s) => ((s.sub = false), s), why: 'the symbols were moved but not encoded' },
          { apply: (s) => ((s.mv = altMv), s), why: 'the word moved the wrong way' },
          { apply: (s) => ((s.err = true), s), why: `the symbol in position ${errSlot + 1} was encoded one time too many` },
        ],
        rules: [
          { k: 'Code', t: `at every step each symbol is replaced by another one, always the same way: ${sigText}.` },
          { k: 'Move', t: `at the same time the whole word <b>${MV[mv]}</b>.` },
        ].concat(colourCycle ? [{ k: 'Colours', t: 'and each symbol\'s colour advances: white → grey → black → white (the colour travels with the symbol).' }] : [{ k: 'Background', t: 'the shaded boxes never move — they are only a distraction.' }]),
      };
    },
  });

  /* ================================================================ String algebra */
  const BEAD = ['●', '○', '■', '▲'];
  const rev = (a) => a.slice().reverse();
  const inter = (a, b) => {
    const o = [];
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (i < a.length) o.push(a[i]);
      if (i < b.length) o.push(b[i]);
    }
    return o;
  };
  const OPS = {
    'a+b': (a, b) => a.concat(b),
    'b+a': (a, b) => b.concat(a),
    'a+rev(b)': (a, b) => a.concat(rev(b)),
    'rev(a)+b': (a, b) => rev(a).concat(b),
    'rev(a+b)': (a, b) => rev(a.concat(b)),
    'rev(b)+a': (a, b) => rev(b).concat(a),
    'b+rev(a)': (a, b) => b.concat(rev(a)),
    'rev(a)+rev(b)': (a, b) => rev(a).concat(rev(b)),
    'int(a,b)': inter,
    'int(b,a)': (a, b) => inter(b, a),
    'a-b': (a, b) => a.filter((x) => !b.includes(x)),
    'b-a': (a, b) => b.filter((x) => !a.includes(x)),
    'a∩b': (a, b) => a.filter((x) => b.includes(x)),
    mid: (a, b) => a.slice(0, Math.floor(a.length / 2)).concat(b, a.slice(Math.floor(a.length / 2))),
    'a-first': (a, b) => {
      const o = a.slice();
      b.forEach((x) => {
        const i = o.indexOf(x);
        if (i >= 0) o.splice(i, 1);
      });
      return o;
    },
  };
  RM.register({
    id: 'string-ops',
    name: 'String algebra',
    difficulty: 6,
    generate(rng, variant) {
      const v = variant % 4;
      const op = ['a+rev(b)', 'int(a,b)', 'a-b', 'rev(a)+b'][v];
      const near = { 'a+rev(b)': 'a+b', 'int(a,b)': 'a+b', 'a-b': 'a-first', 'rev(a)+b': 'a+b' }[op];
      const str = (lo, hi) => RM.range(rng.int(lo, hi)).map(() => rng.int(0, 3));
      const rows = RM.range(3).map(() => {
        let a;
        let b;
        if (op === 'a-b') {
          a = str(4, 6);
          b = rng.sample(Array.from(new Set(a)), rng.int(1, 2));
          if (rng.chance(0.3)) b.push(rng.int(0, 3));
          b = rng.shuffle(b).slice(0, 3);
        } else {
          a = str(2, 4);
          b = str(2, 4);
        }
        const c = OPS[op](a, b);
        RM.need(c.length >= 1 && c.length <= 8 && c.join() !== a.join() && c.join() !== b.join());
        return [a, b, c];
      });
      const preds = new Set();
      Object.keys(OPS).forEach((k) => {
        if ([0, 1].every((r) => OPS[k](rows[r][0], rows[r][1]).join() === rows[r][2].join())) preds.add(OPS[k](rows[2][0], rows[2][1]).join());
      });
      RM.need(preds.size === 1 && preds.has(rows[2][2].join()));
      const [A3, B3] = rows[2];
      const ans = rows[2][2];
      const nearRes = OPS[near](A3, B3);
      RM.need(nearRes.join() !== ans.join() && nearRes.length <= 8 && nearRes.length >= 1);
      const p = rng.int(0, ans.length - 1);
      const qs = RM.range(ans.length - 1).filter((i) => ans[i] !== ans[i + 1] && i !== p && i + 1 !== p);
      RM.need(qs.length > 0);
      const qi = rng.pick(qs);
      const txt = (s) => s.map((x) => BEAD[x]).join('');
      const OPTXT = {
        'a+rev(b)': 'the 1st string followed by the 2nd string <b>reversed</b>',
        'int(a,b)': 'the beads of the 1st and 2nd strings taken <b>alternately</b>, starting with the 1st (leftovers at the end)',
        'a-b': 'the 1st string with every kind of bead that appears in the 2nd string <b>removed</b>',
        'rev(a)+b': 'the 1st string <b>reversed</b>, followed by the 2nd string',
      };
      return {
        hint: 'each panel is a word; the third word is built from the first two.',
        panels: RM.flat(rows.map((r) => r.map((s) => ({ s })))),
        answer: { s: ans },
        render(sp) {
          const pic = new RM.Pic();
          RM.line(pic, 5, 50, 95, 50, { sw: 1.3, color: RM.GRAY });
          const n = sp.s.length;
          sp.s.forEach((t, i) => {
            const x = 50 + (i - (n - 1) / 2) * 11;
            if (t === 0) RM.circle(pic, x, 50, 5, { fill: 'black', sw: 1.2 });
            else if (t === 1) RM.circle(pic, x, 50, 5, { fill: 'white', sw: 1.6 });
            else if (t === 2) RM.shape(pic, 'square', x, 50, 5.4, { fill: 'gray', sw: 1.4 });
            else RM.shape(pic, 'triangle', x, 50.5, 6, { fill: 'white', sw: 1.4 });
          });
          return pic.svg();
        },
        perturb: [
          { apply: (s) => ((s.s = nearRes.slice()), s), why: `this is ${txt(nearRes)}, built with the wrong operation` },
          { apply: (s) => (p < s.s.length ? ((s.s[p] = (s.s[p] + 1) % 4), s) : null), why: `bead ${p + 1} is of the wrong kind` },
          {
            apply: (s) => {
              if (qi + 1 >= s.s.length || s.s[qi] === s.s[qi + 1]) return null;
              [s.s[qi], s.s[qi + 1]] = [s.s[qi + 1], s.s[qi]];
              return s;
            },
            why: `beads ${qi + 1} and ${qi + 2} are swapped`,
          },
        ],
        rules: [
          { k: 'Operation', t: `the 3rd string is ${OPTXT[op]}.` },
          { k: 'Example', t: `row 1: ${txt(rows[0][0])} and ${txt(rows[0][1])} → ${txt(rows[0][2])}.` },
          { k: 'Answer', t: `row 3: ${txt(A3)} and ${txt(B3)} → <b>${txt(ans)}</b>.` },
        ],
      };
    },
  });
})();
