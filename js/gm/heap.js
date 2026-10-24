/* Heap (grandmaster): a binary heap drawn as a tree of discs of seven sizes (bigger = darker). Panel 2 of a row is a new disc; panel 3 is the heap after
 * attaching it at the next free place (level by level, left to right) and swapping it upwards while it beats its parent. Variants 1 and 3 use a min-heap. */
(function () {
  'use strict';
  const RM = window.RM;
  const XY = [[50, 17], [27, 47], [73, 47], [14, 80], [38, 80], [62, 80], [86, 80]];
  const FILL = ['#ffffff', '#e6e8ec', '#c5c9d0', '#9ba1ab', '#6b7280', '#3f4652', '#1f2937'];
  const PN = ['the top', 'the left place of the second row', 'the right place of the second row', 'the 1st place (from the left) of the bottom row', 'the 2nd place of the bottom row', 'the 3rd place of the bottom row', 'the 4th place of the bottom row'];
  const par = (p) => (p - 1) >> 1;
  const rad = (s) => 3 + 1.45 * (s - 1);
  const cntOf = (a) => a.filter(Boolean).length;
  const eq = (a, b) => a.every((v, i) => v === b[i]);

  function siftUp(a, p, better, maxSteps) {
    let st = 0;
    while (p > 0 && st < maxSteps && better(a[p], a[par(p)])) { const q = par(p); [a[p], a[q]] = [a[q], a[p]]; p = q; st++; }
    return st;
  }
  function insert(a, x, better, maxSteps) {
    const n = cntOf(a);
    const r = a.slice();
    r[n] = x;
    const st = siftUp(r, n, better, maxSteps);
    return { arr: r, steps: st };
  }
  const isHeap = (a, better) => {
    const m = cntOf(a);
    for (let i = 0; i < 7; i++) if ((i < m) !== !!a[i]) return false;
    for (let p = 1; p < m; p++) if (better(a[p], a[par(p)])) return false;
    return true;
  };

  RM.register({
    id: 'heap',
    name: 'Heap',
    difficulty: 7,
    generate(rng, variant) {
      const isMax = variant === 0 || variant === 2;
      const better = isMax ? (a, b) => a > b : (a, b) => a < b;
      const worse = isMax ? (a, b) => a < b : (a, b) => a > b;
      const pats = rng.shuffle([[1, 2, 2], [2, 1, 2], [1, 2, 1], [2, 1, 1], [2, 2, 1], [2, 2, 2], [1, 1, 2]]);
      const pat = pats.find((q) => q[0] === 2 || q[1] === 2);
      const ns = rng.shuffle([4, 5, 6]);
      const rows = [];
      for (let r = 0; r < 3; r++) {
        let row = null;
        for (let t = 0; t < 200 && !row; t++) {
          const vals = rng.sample([1, 2, 3, 4, 5, 6, 7], ns[r]);
          let a = new Array(7).fill(0);
          vals.forEach((v, i) => { a[i] = v; siftUp(a, i, better, 99); });
          const free = [1, 2, 3, 4, 5, 6, 7].filter((v) => vals.indexOf(v) < 0);
          const xs = free.filter((x) => insert(a, x, better, 99).steps === pat[r]);
          if (!xs.length) continue;
          const x = rng.pick(xs);
          row = { h: a, x, out: insert(a, x, better, 99).arr };
        }
        RM.need(row);
        rows.push(row);
      }
      const alts = {
        none: (r) => insert(r.h, r.x, better, 0).arr,
        one: (r) => insert(r.h, r.x, better, 1).arr,
        flip: (r) => insert(r.h, r.x, worse, 99).arr,
        root: (r) => { const a = r.h.slice(); const n = cntOf(a); if (better(r.x, a[0])) { a[n] = a[0]; a[0] = r.x; } else a[n] = r.x; return a; },
        sorted: (r) => { const v = r.h.filter(Boolean).concat([r.x]).sort((p, q) => (better(p, q) ? -1 : 1)); return v.concat(new Array(7 - v.length).fill(0)); },
      };
      Object.keys(alts).forEach((k) => RM.need(!(eq(alts[k](rows[0]), rows[0].out) && eq(alts[k](rows[1]), rows[1].out))));
      const R = rows[2];
      const A = R.out;
      const m = cntOf(A);
      // candidates
      const cands = [];
      const seen = new Set([A.join('')]);
      const posName = (p) => PN[p];
      const add = (arr, type, text) => {
        const k = arr.join('');
        if (seen.has(k) || arr.some((v) => v < 0)) return;
        seen.add(k);
        const fl = [];
        const valid = isHeap(arr, better);
        if (text) fl.push(text);
        if (!valid) {
          const mm = cntOf(arr);
          for (let p = 1; p < mm; p++) if (arr[p] && better(arr[p], arr[par(p)])) { fl.push('this is not a ' + (isMax ? 'max' : 'min') + '-heap: the disc of size ' + arr[p] + ' hangs below the ' + (isMax ? 'smaller' : 'bigger') + ' disc of size ' + arr[par(p)]); break; }
        }
        const diffs = [];
        for (let p = 0; p < 7; p++) if (arr[p] !== A[p]) diffs.push('at ' + posName(p) + ' there should be size ' + A[p] + ', not ' + arr[p]);
        fl.push(diffs.slice(0, 2).join('; ') + (diffs.length > 2 ? '; and ' + (diffs.length - 2) + ' more place(s) differ' : ''));
        cands.push({ spec: { h: arr }, type, valid, fl, d: diffs.length });
      };
      const T = {
        none: 'The new disc was only attached at the next free place and never moved up.',
        one: 'The new disc was moved up one level only; it must keep rising as long as it beats its parent.',
        flip: 'The comparison was made the wrong way round: ' + (isMax ? 'the smaller' : 'the bigger') + ' disc must NOT rise above the ' + (isMax ? 'bigger' : 'smaller') + ' one.',
        root: 'The new disc was only compared with the top disc and exchanged with it.',
        sorted: 'All discs were simply sorted level by level; a heap is only ordered along parent-child links.',
      };
      Object.keys(alts).forEach((k) => add(alts[k](R), k, T[k]));
      // valid heaps with the same discs (wrong arrangement) and exchanged-disc slips
      const vals = A.slice(0, m);
      const rec = (cur, rest) => {
        if (!rest.length) {
          const arr = cur.concat(new Array(7 - m).fill(0));
          const d = arr.filter((v, i) => v !== A[i]).length;
          if (d >= 2 && d <= 4 && isHeap(arr, better)) add(arr, 'valid', 'This is a valid heap of the same discs, but it is not what attaching the new disc and moving it up produces.');
          return;
        }
        rest.forEach((x, i) => rec(cur.concat([x]), rest.slice(0, i).concat(rest.slice(i + 1))));
      };
      rec([], vals);
      for (let i = 0; i < m; i++) for (let j = i + 1; j < m; j++) { const s = A.slice(); [s[i], s[j]] = [s[j], s[i]]; add(s, 'swap', 'Two discs are exchanged.'); }
      let pick = null;
      const typed = cands.filter((c) => c.type !== 'valid' && c.type !== 'swap');
      const valids = cands.filter((c) => c.type === 'valid');
      const swaps = cands.filter((c) => c.type === 'swap');
      for (let t = 0; t < 120 && !pick; t++) {
        const a1 = rng.shuffle(typed).slice(0, rng.int(2, 4));
        const a2 = rng.shuffle(valids).slice(0, rng.int(2, 4));
        const a3 = rng.shuffle(swaps).slice(0, 3);
        const sel = a1.concat(a2, a3).slice(0, 7);
        if (sel.length < 7) continue;
        const nv = sel.filter((c) => c.valid).length;
        if (nv >= 3 && nv <= 5) pick = sel;
      }
      RM.need(pick);
      const options = [{ spec: { h: A }, flaws: [] }].concat(pick.map((c) => ({ spec: c.spec, flaws: c.fl })));
      const panels = [];
      rows.forEach((r, i) => { panels.push({ h: r.h }, { x: r.x }); if (i < 2) panels.push({ h: r.out }); });

      // narration
      const n0 = cntOf(R.h);
      const rel = isMax ? 'bigger' : 'smaller';
      const lvl = (a) => {
        const rowsT = [[0], [1, 2], [3, 4, 5, 6]];
        return rowsT.map((q) => q.filter((p) => a[p]).map((p) => a[p]).join(', ')).filter(Boolean).join(' / ');
      };
      const sw = [];
      const tmp = R.h.slice();
      tmp[n0] = R.x;
      let p = n0;
      while (p > 0 && better(tmp[p], tmp[par(p)])) { sw.push('size ' + tmp[p] + ' beats its parent of size ' + tmp[par(p)] + ' and swaps with it'); const q = par(p); [tmp[p], tmp[q]] = [tmp[q], tmp[p]]; p = q; }
      const stop = p === 0 ? 'it has reached the top' : 'its parent (size ' + tmp[par(p)] + ') is ' + (isMax ? 'bigger' : 'smaller') + ', so it stops';
      return {
        panels,
        answer: { h: A },
        options,
        render: (s) => (s.h ? renderHeap(s.h) : renderNew(s.x)),
        key: (s) => JSON.stringify(s),
        rules: [
          { k: 'Discs', t: 'There are seven sizes of disc, from 1 (smallest, lightest) to 7 (biggest, darkest). The lines join each disc to the two discs below it.' },
          { k: 'Heap', t: 'In the 1st panel every disc is ' + rel + ' than the discs directly below it, so the ' + (isMax ? 'biggest' : 'smallest') + ' disc is on top (a ' + (isMax ? 'max' : 'min') + '-heap).' },
          { k: 'Insertion', t: 'The disc of the 2nd panel is attached at the <b>next free place</b>: the first empty place reading the tree row by row, from left to right.' },
          { k: 'Moving up', t: 'While the new disc is ' + rel + ' than its parent they swap places; it stops as soon as its parent is ' + rel + ' (or it is on top). The other discs keep their places. The 3rd panel is the result.' },
          { k: 'Last row', t: 'Rows read as top / second row / bottom row: ' + lvl(R.h) + '. New disc: size ' + R.x + ', attached at ' + posName(n0) + '. ' + (sw.length ? sw.join('; then ') + '; ' : 'it does not beat its parent; ') + stop + '. Result: <b>' + lvl(A) + '</b>.' },
        ],
        hint: 'The new disc starts at the first free place, then climbs for as long as it beats the disc above it.',
      };

      function renderHeap(a) {
        const pic = new RM.Pic();
        for (let i = 1; i < 7; i++) if (a[i]) RM.line(pic, XY[par(i)][0], XY[par(i)][1], XY[i][0], XY[i][1], { sw: 1.8, cap: 'butt', color: RM.GRAY });
        for (let i = 0; i < 7; i++) if (a[i]) RM.circle(pic, XY[i][0], XY[i][1], rad(a[i]), { fill: FILL[a[i] - 1], sw: 1.8 });
        return pic.svg();
      }
      function renderNew(x) {
        const pic = new RM.Pic();
        const cy = 66;
        RM.line(pic, 50, 8, 50, cy - rad(x) - 8, { sw: 2.2, cap: 'butt' });
        RM.polygon(pic, [[50, cy - rad(x) - 2], [45, cy - rad(x) - 9.5], [55, cy - rad(x) - 9.5]], { fill: 'black', sw: 0.8 });
        RM.circle(pic, 50, cy, rad(x), { fill: FILL[x - 1], sw: 1.8 });
        return pic.svg();
      }
    },
  });
})();
