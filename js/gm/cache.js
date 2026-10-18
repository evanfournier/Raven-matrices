/* Cache memory (grandmaster): a 3-slot cache receives a periodic request stream (shown in the "next request" box);
   the replacement policy (LRU / FIFO / LFU / MRU) decides which slot a missing symbol takes. */
(function () {
  'use strict';
  const RM = window.RM;
  const SYM = [
    { shape: 'circle', fill: 'black', name: 'black circle' },
    { shape: 'square', fill: 'white', name: 'white square' },
    { shape: 'triangle', fill: 'gray', name: 'gray triangle' },
    { shape: 'star5', fill: 'black', name: 'black star' },
    { shape: 'diamond', fill: 'gray', name: 'gray diamond' },
    { shape: 'cross', fill: 'white', name: 'white cross' },
  ];
  const POL = ['LRU', 'FIFO', 'LFU', 'MRU', 'LEFT', 'RIGHT', 'ROT'];
  const PNAME = {
    LRU: 'least recently used (LRU)', FIFO: 'oldest inserted (FIFO)', LFU: 'least frequently used (LFU)',
    MRU: 'most recently used (MRU)', LEFT: 'always the left slot', RIGHT: 'always the right slot',
    ROT: 'shifting left (new symbol enters on the right)',
  };
  const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];

  function step(pol, st, sym) {
    const s = st.s.slice(), o = st.o.slice(), c = st.c.slice();
    const i = s.indexOf(sym);
    if (i >= 0) {
      if (pol !== 'FIFO') { o.splice(o.indexOf(i), 1); o.push(i); }
      c[i]++;
      return { s, o, c, hit: true, v: i };
    }
    if (pol === 'ROT') {
      return { s: [s[1], s[2], sym], o: [0, 1, 2], c: [1, 1, 1], hit: false, v: 0 };
    }
    let v;
    if (pol === 'LRU' || pol === 'FIFO') v = o[0];
    else if (pol === 'MRU') v = o[2];
    else if (pol === 'LEFT') v = 0;
    else if (pol === 'RIGHT') v = 2;
    else { v = o[0]; for (const j of o) if (c[j] < c[v]) v = j; }
    s[v] = sym; o.splice(o.indexOf(v), 1); o.push(v); c[v] = 1;
    return { s, o, c, hit: false, v };
  }
  function run(pol, st0, q, n) {
    const sts = [st0];
    for (let t = 0; t < n; t++) sts.push(step(pol, sts[t], q[t]));
    return sts;
  }
  const skey = (s) => s.join(',');

  function render(sp) {
    const pic = new RM.Pic();
    const box = (x0, y0, w, h) =>
      RM.polygon(pic, [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]], { fill: 'white', sw: 2.2 });
    const draw = (k, cx, cy, r) => {
      const d = SYM[k];
      RM.shape(pic, d.shape, cx, cy, r, { fill: d.fill, sw: 2 });
    };
    [0, 1, 2].forEach((i) => {
      box(7 + i * 30, 62, 26, 30);
      draw(sp.s[i], 20 + i * 30, 77, 9.5);
    });
    box(66, 6, 28, 28);
    draw(sp.n, 80, 20, 9.5);
    RM.line(pic, 80, 34, 80, 50, { sw: 2.2 });
    RM.line(pic, 20, 50, 80, 50, { sw: 2.2 });
    [0, 1, 2].forEach((i) => RM.line(pic, 20 + i * 30, 50, 20 + i * 30, 61, { sw: 2.2 }));
    RM.polygon(pic, [[20, 61], [16, 55], [24, 55]], { fill: 'black', sw: 1 });
    RM.polygon(pic, [[50, 61], [46, 55], [54, 55]], { fill: 'black', sw: 1 });
    RM.polygon(pic, [[80, 61], [76, 55], [84, 55]], { fill: 'black', sw: 1 });
    return pic.svg();
  }

  RM.register({
    id: 'cache',
    name: 'Cache memory',
    difficulty: 7,
    generate(rng, variant) {
      const pol = ['LRU', 'FIFO', 'LFU', 'MRU'][variant % 4];
      const m = rng.pick([4, 5]);
      const p = rng.pick([4, 5].filter((x) => x >= m));
      const alpha = rng.sample([0, 1, 2, 3, 4, 5], m);
      let pat;
      for (let tries = 0; ; tries++) {
        RM.need(tries < 30);
        pat = RM.range(p).map((i) => (i < m ? alpha[i] : rng.pick(alpha)));
        pat = rng.shuffle(pat);
        let ok = true;
        for (let i = 0; i < p; i++) if (pat[i] === pat[(i + 1) % p]) ok = false;
        if (ok) break;
      }
      const off = rng.int(0, p - 1);
      const q = RM.range(9).map((i) => pat[(off + i) % p]);
      for (let d = 1; d < p; d++) {
        let per = true;
        for (let k = d; k < 9; k++) if (q[k] !== q[k - d]) per = false;
        RM.need(!per);
      }
      const s0 = rng.sample([0, 1, 2, 3, 4, 5], 3);
      const st0 = { s: s0, o: rng.shuffle([0, 1, 2]), c: [rng.int(1, 3), rng.int(1, 3), rng.int(1, 3)] };
      const sts = run(pol, st0, q, 8);
      const hits = sts.slice(1).filter((x) => x.hit).length;
      RM.need(hits >= 2 && hits <= 5 && !sts[8].hit);
      const fin = sts[8];
      // hypotheses
      const ans = { s: fin.s, n: q[8] };
      const gens = [];
      for (const hp of POL) {
        const hist = [];
        for (const o of PERMS) {
          if (hp === 'LFU') for (let a = 1; a <= 3; a++) for (let b = 1; b <= 3; b++) for (let c = 1; c <= 3; c++) hist.push({ s: s0, o, c: [a, b, c] });
          else hist.push({ s: s0, o, c: [1, 1, 1] });
          if (hp === 'LEFT' || hp === 'RIGHT' || hp === 'ROT') break;
        }
        for (const h of hist) {
          const r = run(hp, h, q, 8);
          let ok = true;
          for (let t = 1; t <= 7 && ok; t++) if (skey(r[t].s) !== skey(sts[t].s)) ok = false;
          if (ok) gens.push({ hp, r8: r[8].s });
        }
      }
      const polOk = new Set(gens.map((g) => g.hp));
      RM.need(polOk.has(pol));
      for (const x of ['LRU', 'FIFO', 'LFU', 'MRU']) if (x !== pol) RM.need(!polOk.has(x));
      RM.need(gens.every((g) => skey(g.r8) === skey(fin.s)));
      for (let pp = 1; pp <= 6; pp++) {
        let ok = true;
        for (let k = pp; k < 8; k++) if (q[k] !== q[k - pp]) ok = false;
        if (ok) RM.need(q[8 - pp] === q[8]);
      }
      // distractors
      const groups = { pol: [], slot: [], next: [], misc: [] };
      const add = (grp, s, n, why) => groups[grp].push({ spec: { s, n }, flaws: [why] });
      for (const wp of POL) {
        if (wp === pol) continue;
        const r = run(wp, st0, q, 8)[8];
        add('pol', r.s, q[8], `the cache was updated with the rule "${PNAME[wp]}" instead of "${PNAME[pol]}"`);
      }
      const v = fin.v;
      [0, 1, 2].filter((j) => j !== v).forEach((j) => {
        const s = fin.s.slice(); s[j] = q[7]; s[v] = sts[7].s[v];
        add('slot', s, q[8], `the requested symbol was put in the wrong slot (it must take exactly the slot of the evicted symbol, and the other slots do not move)`);
      });
      add('misc', sts[7].s, q[8], 'the cache was not updated: the requested symbol was a miss and had to be loaded');
      alpha.forEach((a) => {
        if (a === q[8]) return;
        add('next', fin.s, a, `the next request breaks the repeating pattern (it should be the ${SYM[q[8]].name})`);
        add('next', fin.s, a, `the next request breaks the repeating pattern (it should be the ${SYM[q[8]].name})`);
      });
      [4, 5].forEach(() => {
        const wp = rng.pick(POL.filter((x) => x !== pol));
        const r = run(wp, st0, q, 8)[8];
        add('misc', r.s, rng.pick(alpha.filter((a) => a !== q[8])), `wrong cache update (${PNAME[wp]}) and the next request breaks the pattern`);
      });
      const seen = new Set([skey(ans.s) + '|' + ans.n]);
      const picked = [];
      const order = ['pol', 'slot', 'next', 'misc'];
      const pools = order.map((k) => rng.shuffle(groups[k]));
      let guard = 0;
      while (picked.length < 7 && guard++ < 200) {
        for (let gi = 0; gi < pools.length && picked.length < 7; gi++) {
          const lim = gi === 0 ? 3 : gi === 2 ? 2 : 99;
          if (picked.filter((x) => x.g === gi).length >= lim && guard < 40) continue;
          const cnd = pools[gi].shift();
          if (!cnd) continue;
          const kk = skey(cnd.spec.s) + '|' + cnd.spec.n;
          if (seen.has(kk)) continue;
          seen.add(kk); picked.push({ g: gi, o: cnd });
        }
      }
      RM.need(picked.length === 7);
      const options = picked.map((x) => x.o);
      options.push({ spec: ans, flaws: [] });

      const panels = RM.range(8).map((i) => ({ s: sts[i].s, n: q[i] }));
      const N = (k) => SYM[k].name;
      const nm = (arr) => arr.map(N).join(', ');
      const histWhy = {
        LRU: 'ordered from least to most recently used',
        FIFO: 'ordered from first loaded to last loaded',
        MRU: 'ordered from least to most recently used',
        LFU: 'with their use counts',
      };
      const pre = sts[7];
      const slotName = ['left', 'middle', 'right'];
      let trace;
      if (pol === 'LFU') {
        trace = `slots hold ${nm(pre.s)} with use counts ${pre.c.join(', ')} (each hit adds 1, a loaded symbol starts at 1); the lowest count is the ${slotName[fin.v]} slot` +
          (pre.c.filter((x) => x === pre.c[fin.v]).length > 1 ? ' (tie: the least recently used of the tied slots)' : '');
      } else {
        trace = `slots hold ${nm(pre.s)}; ${histWhy[pol]}: ${nm(pre.o.map((j) => pre.s[j]))}; the victim is ${pol === 'MRU' ? 'the last one' : 'the first one'}, in the ${slotName[fin.v]} slot`;
      }
      const polDesc = {
        LRU: 'on a miss, the slot whose symbol was used least recently is replaced (a hit counts as a use)',
        FIFO: 'on a miss, the slot whose symbol was loaded earliest is replaced (hits do not change this order)',
        LFU: 'on a miss, the slot whose symbol has been used the fewest times is replaced (ties: the least recently used); a newly loaded symbol has count 1 and each hit adds 1',
        MRU: 'on a miss, the slot whose symbol was used most recently is replaced (a hit counts as a use)',
      }[pol];
      return {
        panels,
        answer: ans,
        options,
        reading: 'sequence',
        difficulty: pol === 'LFU' ? 8 : 7,
        render,
        key: (sp) => skey(sp.s) + '|' + sp.n,
        rules: [
          { k: 'Reading', t: 'Each picture shows a 3-slot memory (bottom) and, in the top-right box, the <b>next request</b>. The next picture shows the memory after that request has been handled, with the following request.' },
          { k: 'Hit or miss', t: 'If the requested symbol is already in a slot (hit), nothing moves. Otherwise (miss) it is loaded into exactly one slot, replacing the symbol there; the other slots never move.' },
          { k: 'Which slot', t: `Policy here: ${polDesc}. The history before the first picture is hidden; the first evictions reveal it.` },
          { k: 'Requests', t: `The requests repeat with period ${p}: the boxes read ${nm(q.slice(0, p))}, then the same ${p} again, and so on.` },
          { k: 'Last panel', t: `The ${N(q[7])} is requested and it is a miss: ${trace}. So the memory becomes <b>${nm(fin.s)}</b> and the next request is the <b>${N(q[8])}</b>.` },
        ],
        hint: 'The box keeps what it thinks it will need again.',
      };
    },
  });
})();
