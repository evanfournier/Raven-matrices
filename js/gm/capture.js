/* Surrounded (grandmaster): every row has a board with black stones only (column 1), a board with white stones only
 * (column 2, never on the same cell) and, in column 3, both boards together after the captures: every stone that has NO
 * empty orthogonal neighbour and NO orthogonal neighbour of its own colour is removed (all at once; the board edge gives
 * no protection). Hypotheses checked against rows 1–2: edge protects / not, 4- or 8-neighbourhood, friends protect /
 * only empty points protect / whole chains judged together (Go rule), both colours / only black / only white / one
 * colour after the other, no capture. All surviving hypotheses must predict the same row 3. */
(function () {
  'use strict';
  const RM = window.RM;

  const TOPO = {};
  function topo(n) {
    if (TOPO[n]) return TOPO[n];
    const mk = (diag) => RM.range(n * n).map((i) => {
      const r = (i / n) | 0, c = i % n, on = [];
      let off = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if ((!dr && !dc) || (!diag && dr && dc)) continue;
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= n || cc >= n) off++;
        else on.push(rr * n + cc);
      }
      return { on, off };
    });
    return (TOPO[n] = { 4: mk(false), 8: mk(true) });
  }

  function cap1(M, n, o, colours) {
    const NB = topo(n)[o.nb8 ? 8 : 4];
    const out = M.slice();
    if (o.protect !== 'group') {
      for (let i = 0; i < M.length; i++) {
        const v = M[i];
        if (!v || !colours.includes(v)) continue;
        let prot = o.edge && NB[i].off > 0;
        for (const j of NB[i].on) if (M[j] === 0 || (M[j] === v && o.protect === 'friend')) prot = true;
        if (!prot) out[i] = 0;
      }
    } else {
      const seen = new Array(M.length).fill(false);
      for (let s = 0; s < M.length; s++) {
        const v = M[s];
        if (!v || seen[s]) continue;
        const grp = [s];
        seen[s] = true;
        let lib = false;
        for (let k = 0; k < grp.length; k++) {
          const i = grp[k];
          if (o.edge && NB[i].off > 0) lib = true;
          for (const j of NB[i].on) {
            if (M[j] === 0) lib = true;
            else if (M[j] === v && !seen[j]) { seen[j] = true; grp.push(j); }
          }
        }
        if (!lib && colours.includes(v)) grp.forEach((i) => (out[i] = 0));
      }
    }
    return out;
  }
  function capt(M, n, o) {
    if (o.colors === 'nocap') return M.slice();
    const seq = { both: [[1, 2]], b: [[1]], w: [[2]], bw: [[1], [2]], wb: [[2], [1]] }[o.colors];
    let b = M;
    for (const cl of seq) b = cap1(b, n, o, cl);
    return b;
  }
  const TRUE_O = { nb8: false, edge: false, protect: 'friend', colors: 'both' };
  const HYPS = [{ nb8: false, edge: false, protect: 'friend', colors: 'nocap' }];
  for (const nb8 of [false, true]) for (const edge of [false, true]) for (const protect of ['friend', 'none', 'group']) for (const colors of ['both', 'b', 'w', 'bw', 'wb']) HYPS.push({ nb8, edge, protect, colors });
  const diffs = (o) => {
    const d = [];
    if (o.colors === 'nocap') return ['nocap'];
    if (o.nb8) d.push('nb8');
    if (o.edge) d.push('edge');
    if (o.protect !== 'friend') d.push(o.protect);
    if (o.colors !== 'both') d.push(o.colors);
    return d;
  };
  const ALTS = [{ edge: true }, { nb8: true }, { protect: 'none' }, { protect: 'group' }, { colors: 'b' }, { colors: 'w' }, { colors: 'nocap' }].map((a) => Object.assign({}, TRUE_O, a));
  const same = (a, b) => a.join('') === b.join('');
  const CN = ['', 'black', 'white'];

  RM.register({
    id: 'capture',
    name: 'Surrounded',
    difficulty: 7,
    generate(rng, variant) {
      const n = variant === 2 ? 6 : 5;
      const NN = n * n;
      const NB4 = topo(n)[4];
      const minS = Math.round(NN * 0.56), maxS = Math.round(NN * 0.8);
      const tru = (M) => capt(M, n, TRUE_O);
      const evalRow = (M) => {
        const t = tru(M);
        return { t, cnt: M.filter((v, i) => v !== t[i]).length, K: ALTS.map((a, i) => (same(capt(M, n, a), t) ? -1 : i)).filter((i) => i >= 0) };
      };
      const covered = new Set();
      const rowsM = [];
      for (let r = 0; r < 3; r++) {
        let M = RM.range(NN).map(() => { const u = rng.next(); return u < 0.36 ? 1 : u < 0.72 ? 2 : 0; });
        const score = (e) => 4 * (r < 2 ? new Set([...covered, ...e.K]).size : Math.min(5, e.K.length)) - 2 * Math.abs(e.cnt - 3) - (e.cnt === 0 ? 6 : 0);
        let cur = evalRow(M), cs = score(cur);
        for (let t = 0; t < 120; t++) {
          const M2 = M.slice();
          const i = rng.int(0, NN - 1);
          M2[i] = (M2[i] + rng.int(1, 2)) % 3;
          const st = M2.filter((v) => v).length;
          if (st < minS || st > maxS) continue;
          const e = evalRow(M2), s2 = score(e);
          if (s2 >= cs) { M = M2; cur = e; cs = s2; }
        }
        RM.need(cur.cnt >= 2 && cur.cnt <= 5);
        cur.K.forEach((k) => covered.add(k));
        rowsM.push({ M, t: cur.t, K: cur.K });
      }
      RM.need(covered.size === ALTS.length);
      RM.need(rowsM[2].K.length >= 4);
      const rows = rowsM.map((x) => ({ A: x.M.map((v) => (v === 1 ? 1 : 0)), B: x.M.map((v) => (v === 2 ? 2 : 0)), M: x.M, C: x.t }));
      const live = HYPS.filter((h) => [0, 1].every((r) => same(capt(rows[r].M, n, h), rows[r].C)));
      const M3 = rows[2].M, answer = rows[2].C;
      RM.need(live.length >= 1 && live.every((h) => same(capt(M3, n, h), answer)));

      // ---- distractors
      const place = (i) => `line ${((i / n) | 0) + 1}, place ${(i % n) + 1}`;
      const dirOf = (i, j) => (j === i - n ? 'above' : j === i + n ? 'below' : j === i - 1 ? 'on its left' : 'on its right');
      const dirs = (i, list) => list.map((j) => dirOf(i, j)).join(' and ');
      const cellFlaw = (i, opt) => {
        const v = M3[i];
        const nbs = NB4[i].on;
        if (opt[i] && !answer[i])
          return `The ${CN[v]} stone at ${place(i)} must be captured: every neighbour it has (${dirs(i, nbs)}${NB4[i].off ? '; the edge gives no protection' : ''}) is a ${CN[3 - v]} stone — no empty point, no friendly stone.`;
        const emp = nbs.filter((j) => M3[j] === 0), fr = nbs.filter((j) => M3[j] === v);
        return `The ${CN[v]} stone at ${place(i)} must stay: ${emp.length ? 'the point ' + dirs(i, emp) + ' is empty' : 'a friendly stone ' + dirs(i, fr) + ' protects it'}.`;
      };
      const dtxt = {
        nocap: 'nothing is ever captured', nb8: 'diagonal neighbours count too', edge: 'the board edge counts as protection',
        none: 'a friendly neighbour does not protect a stone', group: 'a chain of stones of one colour is judged as a whole (captured only if the whole chain has no empty neighbour)',
        b: 'only black stones can be captured', w: 'only white stones can be captured',
        bw: 'black stones are captured first and the white ones are then judged on the new board', wb: 'white stones are captured first and the black ones are then judged on the new board',
      };
      const cands = new Map();
      const add = (bd, flaws, p, sig) => {
        const k = bd.join('');
        if (k === answer.join('') || (cands.has(k) && cands.get(k).p <= p)) return;
        cands.set(k, { bd, flaws, p, sig });
      };
      for (const h of HYPS) {
        const d = diffs(h);
        if (!d.length) continue;
        const bd = capt(M3, n, h);
        const dc = answer.map((v, i) => (bd[i] !== v ? i : -1)).filter((i) => i >= 0);
        if (!dc.length) continue;
        add(bd, [`This is what you get if ${d.map((x) => dtxt[x]).join(' and ')}. ` + dc.slice(0, 2).map((i) => cellFlaw(i, bd)).join(' ')], d.length + rng.next() * 0.9, d.join('+'));
      }
      const capSet = M3.map((v, i) => (v && !answer[i] ? i : -1)).filter((i) => i >= 0);
      const stay = M3.map((v, i) => (answer[i] ? i : -1)).filter((i) => i >= 0);
      for (let t = 0; t < 14; t++) {
        const bd = answer.slice();
        const ids = [];
        const k = t < 8 ? 1 : 2;
        for (let j = 0; j < k; j++) {
          const i = rng.chance(0.5) && capSet.length ? rng.pick(capSet) : rng.pick(stay);
          if (ids.includes(i)) continue;
          ids.push(i);
          bd[i] = answer[i] ? 0 : M3[i];
        }
        add(bd, [ids.map((i) => cellFlaw(i, bd)).join(' ')], 20 + ids.length + rng.next(), 'cell');
      }
      const arr = Array.from(cands.values()).sort((a, b) => a.p - b.p);
      const chosen = [], cnt = {};
      for (const c of arr) if ((cnt[c.sig] = (cnt[c.sig] || 0) + 1) <= 2 && chosen.length < 5 && c.sig !== 'cell') chosen.push(c);
      for (const c of arr) if (chosen.length < 7 && !chosen.includes(c)) chosen.push(c);
      RM.need(chosen.length === 7);

      // ---- rules
      const stoneTxt = (M, i) => `the ${CN[M[i]]} stone at ${place(i)}`;
      const isEdge = (i) => NB4[i].off > 0;
      let exEdge = '', exProt = '';
      for (let r = 0; r < 2; r++) for (let i = 0; i < NN; i++) {
        const nb = NB4[i].on, M = rows[r].M;
        if (!M[i]) continue;
        if (!exEdge && isEdge(i) && !rows[r].C[i]) exEdge = ` In row ${r + 1}, ${stoneTxt(M, i)} is captured although it stands on the edge.`;
        if (!exProt && rows[r].C[i] && nb.every((j) => M[j]) && nb.some((j) => M[j] === M[i])) exProt = ` In row ${r + 1}, ${stoneTxt(M, i)} is completely enclosed but stays, because it touches a stone of its own colour.`;
      }
      const lost = capSet.map((i) => stoneTxt(M3, i) + (isEdge(i) ? ' (edge)' : ''));
      const sym = (v) => (v === 1 ? '●' : v === 2 ? '○' : '·');
      const lines = RM.range(n).map((r) => answer.slice(r * n, r * n + n).map(sym).join(' ')).join(' / ');
      const rules = [
        { k: 'Boards', t: 'column 1 has the <b>black</b> stones, column 2 the <b>white</b> stones (never on the same cell); column 3 is both boards together <b>after the captures</b> (lines run across, places run down the board).' },
        { k: 'Capture', t: `every stone that has <b>no empty neighbouring cell</b> (above, below, left, right) and <b>no neighbouring stone of its own colour</b> is removed — all at once. The board edge gives no protection: only neighbours that exist count, so a stone is captured exactly when every neighbour it has is an enemy stone.${exEdge}${exProt}` },
        { k: 'Row 3', t: `put both boards of the last row together and look at every stone: captured — ${lost.join('; ')}. Every other stone has an empty neighbour or a friend next to it and stays.` },
        { k: 'Answer', t: `the board after the captures (● black, ○ white, · empty), line by line: <b>${lines}</b>.` },
      ];

      const spec = (c) => ({ n, c });
      const panels = [];
      for (let r = 0; r < 3; r++) {
        panels.push(spec(rows[r].A), spec(rows[r].B));
        if (r < 2) panels.push(spec(rows[r].C));
      }
      const render = (s) => {
        const pic = new RM.Pic();
        const k = s.n, x0 = 8, cs = 84 / k;
        for (let i = 0; i <= k; i++) {
          const edge = i === 0 || i === k;
          RM.line(pic, x0, x0 + i * cs, x0 + 84, x0 + i * cs, { sw: edge ? 1.8 : 1, color: edge ? RM.INK : RM.LIGHT, cap: 'butt' });
          RM.line(pic, x0 + i * cs, x0, x0 + i * cs, x0 + 84, { sw: edge ? 1.8 : 1, color: edge ? RM.INK : RM.LIGHT, cap: 'butt' });
        }
        s.c.forEach((v, i) => {
          if (v) RM.circle(pic, x0 + ((i % k) + 0.5) * cs, x0 + (((i / k) | 0) + 0.5) * cs, cs * 0.37, { fill: v === 1 ? 'black' : 'white', sw: 1.8 });
        });
        return pic.svg();
      };
      return {
        difficulty: 7,
        hint: 'a stone is safe if something next to it is empty or friendly — and the edge of the board is not a friend.',
        panels,
        answer: spec(answer),
        options: [{ spec: spec(answer), flaws: [] }].concat(chosen.map((c) => ({ spec: spec(c.bd), flaws: c.flaws }))),
        render,
        key: (s) => s.c.join(''),
        rules,
      };
    },
  });
})();
