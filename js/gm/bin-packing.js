/* Bin packing (grandmaster): three bins of capacity 6 (grey blocks already inside), a queue of 3-4 items (height = size, each with its own pattern);
 * panel 3 shows the bins after the items were placed one by one in queue order with a fixed policy (First-Fit; variants Best-Fit and Worst-Fit),
 * each new item stacked on top of what the bin already holds. */
(function () {
  'use strict';
  const RM = window.RM;
  const C = 6;
  const B = 3;
  const CU = 12;
  const FILLS = ['black', 'lines:45:3.8:1.5', 'dots', 'checker'];
  const BN = ['the left bin', 'the middle bin', 'the right bin'];
  const ORD = ['1st', '2nd', '3rd', '4th'];
  const POLS = ['ff', 'bf', 'wf', 'nf', 'lf'];
  const POLTXT = {
    ff: 'First-Fit: each item goes into the <b>leftmost bin that still has enough room</b>',
    bf: 'Best-Fit: each item goes into the bin where it fits <b>most tightly</b> (the bin that has the <b>least free space</b> among those with enough room)',
    wf: 'Worst-Fit: each item goes into the bin with <b>the most free space</b> (it only has to have enough room)',
  };

  function choose(pol, free, s, st) {
    const ok = [];
    free.forEach((f, i) => { if (f >= s) ok.push(i); });
    if (!ok.length) return null;
    if (pol === 'ff') return { b: ok[0], tie: false };
    if (pol === 'lf') return { b: ok[ok.length - 1], tie: false };
    if (pol === 'nf') {
      while (st.cur < B && free[st.cur] < s) st.cur++;
      return st.cur < B ? { b: st.cur, tie: false } : null;
    }
    const m = pol === 'bf' ? Math.min.apply(null, ok.map((i) => free[i])) : Math.max.apply(null, ok.map((i) => free[i]));
    const c = ok.filter((i) => free[i] === m);
    return { b: c[0], tie: c.length > 1 };
  }
  const sortItems = (items, Q) => {
    const it = items.map((x, i) => ({ s: x[0], id: x[1], pos: i }));
    if (Q === 'rev') return it.reverse();
    if (Q === 'desc') return it.sort((a, b) => b.s - a.s || a.pos - b.pos);
    if (Q === 'asc') return it.sort((a, b) => a.s - b.s || a.pos - b.pos);
    return it;
  };
  /* returns {bins, assign (by queue position), ties} or null */
  function simulate(pol, Q, S, old, items) {
    const free = old.map((bl) => C - bl.reduce((s, x) => s + x[0], 0));
    const st = { cur: 0 };
    const per = old.map(() => []);
    const assign = [];
    let ties = false;
    const seq = sortItems(items, Q);
    for (const it of seq) {
      const c = choose(pol, free, it.s, st);
      if (!c) return null;
      if (c.tie) ties = true;
      free[c.b] -= it.s;
      per[c.b].push(it);
      assign[it.pos] = c.b;
    }
    const bins = old.map((bl, b) => {
      let nw = per[b].slice();
      if (S === 'rev') nw = nw.reverse();
      else if (S === 'big') nw.sort((x, y) => y.s - x.s || x.pos - y.pos);
      else if (S === 'small') nw.sort((x, y) => x.s - y.s || x.pos - y.pos);
      return bl.concat(nw.map((x) => [x.s, x.id]));
    });
    return { bins, assign, ties };
  }
  const K = (x) => JSON.stringify(x);

  RM.register({
    id: 'bin-packing',
    name: 'Bin packing',
    difficulty: 7,
    generate(rng, variant) {
      const pol = ['ff', 'bf', 'wf', rng.pick(['ff', 'bf', 'wf'])][variant];
      const alts = POLS.filter((p) => p !== pol);
      const genRow = (needAll, want) => {
        for (let t = 0; t < 400; t++) {
          const old = RM.range(B).map(() => {
            let rem = rng.int(1, 5);
            const bl = [];
            while (rem > 0) { const s = Math.min(rem, rng.int(1, 3)); bl.push([s, -1]); rem -= s; }
            return bl;
          });
          const k = variant === 0 || variant === 3 ? 4 : rng.int(3, 4);
          const ids = rng.sample([0, 1, 2, 3], k);
          const items = ids.map((id) => [rng.int(1, 4), id]);
          const r = simulate(pol, 'fwd', 'arr', old, items);
          if (!r || r.ties) continue;
          const kk = K(r.bins);
          const diff = alts.filter((p) => { const q = simulate(p, 'fwd', 'arr', old, items); return !q || K(q.bins) !== kk; }).length;
          if (diff < (needAll ? alts.length : 3)) continue;
          let okp = false;
          r.bins.forEach((bl) => {
            const nw = bl.filter((x) => x[1] >= 0);
            for (let q = 0; q + 1 < nw.length; q++) {
              if (want === 'asc' && nw[q][0] < nw[q + 1][0]) okp = true;
              if (want === 'desc' && nw[q][0] > nw[q + 1][0]) okp = true;
              if (want === 'any' && nw[q][0] !== nw[q + 1][0]) okp = true;
            }
          });
          if (!okp) continue;
          return { old, items, out: r.bins, assign: r.assign };
        }
        RM.need(false);
        return null;
      };
      const wp = rng.chance(0.5) ? ['asc', 'desc'] : ['desc', 'asc'];
      const rows = [genRow(false, wp[0]), genRow(false, wp[1]), genRow(true, 'any')];
      RM.need(new Set(rows.map((r) => K(r.old))).size === 3 && new Set(rows.map((r) => K(r.items.map((x) => x[0])))).size === 3);
      const R = rows[2];
      const A = R.out;
      const Ak = K(A);
      // all alternative readings (policy x queue order x stacking order)
      const Qs = ['fwd', 'rev', 'desc', 'asc'];
      const Ss = ['arr', 'rev', 'big', 'small'];
      const hy = [];
      POLS.forEach((p) => Qs.forEach((q) => Ss.forEach((s) => { if (!(p === pol && q === 'fwd' && s === 'arr')) hy.push([p, q, s]); })));
      hy.forEach((h) => {
        const res = rows.map((r) => simulate(h[0], h[1], h[2], r.old, r.items));
        const c0 = res[0] && K(res[0].bins) === K(rows[0].out);
        const c1 = res[1] && K(res[1].bins) === K(rows[1].out);
        if (c0 && c1) RM.need(!res[2] || K(res[2].bins) === Ak);
        if (h[1] === 'fwd' && h[2] === 'arr') RM.need(!(c0 && c1));
      });
      // candidates
      const cands = [];
      const seen = new Set([Ak]);
      const stepFree = (assign, upto) => {
        const free = R.old.map((bl) => C - bl.reduce((s, x) => s + x[0], 0));
        for (let i = 0; i < upto; i++) free[assign[i]] -= R.items[i][0];
        return free;
      };
      const reason = (i, free) => {
        const s = R.items[i][0];
        const b = R.assign[i];
        const f = free.join(', ');
        if (pol === 'ff') return 'with ' + free.map((x, j) => x + ' free in ' + BN[j].replace('the ', '')).join(', ') + ', the leftmost bin with at least ' + s + ' free is ' + BN[b];
        if (pol === 'bf') return 'free space is ' + f + ' (left, middle, right); among the bins with at least ' + s + ' free, ' + BN[b] + ' (' + free[b] + ' free) is the tightest fit';
        return 'free space is ' + f + ' (left, middle, right); ' + BN[b] + ' has the most (' + free[b] + ')';
      };
      const addC = (res, type, text) => {
        const k = K(res.bins);
        if (seen.has(k)) return;
        seen.add(k);
        const fl = [];
        if (text) fl.push(text);
        let first = -1;
        for (let i = 0; i < R.items.length; i++) if (res.assign[i] !== R.assign[i]) { first = i; break; }
        if (first >= 0) {
          const fr = stepFree(R.assign, first);
          const pre = 'the ' + ORD[first] + ' item (size ' + R.items[first][0] + ') should go into ' + BN[R.assign[first]] + ' (' + reason(first, fr).replace(/^with /, 'with ') + '), not into ' + BN[res.assign[first]];
          fl.push(pre);
        } else {
          for (let b = 0; b < B; b++) if (K(res.bins[b]) !== K(A[b])) { fl.push('inside ' + BN[b] + ' the new items must be stacked in the order they arrived (earliest at the bottom)'); break; }
        }
        res.bins.forEach((bl, b) => { const tot = bl.reduce((s, x) => s + x[0], 0); if (tot > C) fl.push(BN[b] + ' overflows (' + tot + ' of ' + C + ' units)'); });
        cands.push({ spec: { b: res.bins }, type, fl, pol: res.pol });
      };
      const T = {
        ff: 'The items were put into the leftmost bin with room (First-Fit), which is not the rule of this puzzle.',
        bf: 'The items were put into the tightest-fitting bin (Best-Fit), which is not the rule of this puzzle.',
        wf: 'The items were put into the emptiest bin (Worst-Fit), which is not the rule of this puzzle.',
        nf: 'Each item stayed in the current bin until it no longer fitted and the bins to the left were never revisited (Next-Fit), which is not the rule of this puzzle.',
        lf: 'The items were put into the rightmost bin with room, which is not the rule of this puzzle.',
        rev: 'The queue was processed from right to left; the first item is the leftmost.',
        desc: 'The items were sorted by size (biggest first) instead of being placed in arrival order.',
        asc: 'The items were sorted by size (smallest first) instead of being placed in arrival order.',
        stack: 'The new items inside a bin are not stacked in arrival order.',
      };
      hy.forEach((h) => {
        const r = simulate(h[0], h[1], h[2], R.old, R.items);
        if (!r) return;
        const type = h[1] === 'fwd' && h[2] === 'arr' ? h[0] : h[1] !== 'fwd' ? h[1] : 'stack';
        addC(r, type, h[1] !== 'fwd' && h[2] === 'arr' ? T[h[1]] : type === 'stack' ? '' : T[h[0]]);
      });
      // single-item moves (valid placements)
      const n = R.items.length;
      for (let i = 0; i < n; i++) for (let b = 0; b < B; b++) {
        if (b === R.assign[i]) continue;
        const asg = R.assign.slice();
        asg[i] = b;
        const free = R.old.map((bl) => C - bl.reduce((s, x) => s + x[0], 0));
        asg.forEach((bb, j) => (free[bb] -= R.items[j][0]));
        if (free.some((f) => f < 0)) continue;
        const bins = R.old.map((bl, bb) => bl.concat(R.items.filter((_, j) => asg[j] === bb).map((x) => [x[0], x[1]])));
        addC({ bins, assign: asg }, 'move', 'One item was put into another bin.');
      }
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        if (R.assign[i] === R.assign[j]) continue;
        const asg = R.assign.slice();
        asg[i] = R.assign[j];
        asg[j] = R.assign[i];
        const free = R.old.map((bl) => C - bl.reduce((s, x) => s + x[0], 0));
        asg.forEach((bb, q) => (free[bb] -= R.items[q][0]));
        if (free.some((f) => f < 0)) continue;
        const bins = R.old.map((bl, bb) => bl.concat(R.items.filter((_, q) => asg[q] === bb).map((x) => [x[0], x[1]])));
        addC({ bins, assign: asg }, 'swap', 'Two items were put into each other\'s bins.');
      }
      let pick = null;
      const typed = cands.filter((c) => c.type !== 'move' && c.type !== 'swap');
      for (let t = 0; t < 60 && !pick; t++) {
        const a1 = rng.shuffle(typed).slice(0, rng.int(3, 5));
        const a2 = rng.shuffle(cands.filter((c) => a1.indexOf(c) < 0)).slice(0, 7 - a1.length);
        const sel = a1.concat(a2);
        if (sel.length === 7) pick = sel;
      }
      RM.need(pick);
      const options = [{ spec: { b: A }, flaws: [] }].concat(pick.map((c) => ({ spec: c.spec, flaws: c.fl })));
      const panels = [];
      rows.forEach((r, i) => { panels.push({ b: r.old }, { q: r.items }); if (i < 2) panels.push({ b: r.out }); });

      // narration
      const st = R.old.map((bl) => C - bl.reduce((s, x) => s + x[0], 0));
      const free = st.slice();
      const steps = R.items.map((it, i) => {
        const txt = 'item ' + (i + 1) + ' (size ' + it[0] + '): ' + reason(i, free) + '.';
        free[R.assign[i]] -= it[0];
        return txt;
      });
      const fin = A.map((bl, b) => BN[b].replace('the ', '') + ': ' + (R.old[b].reduce((s, x) => s + x[0], 0) ? 'grey ' + R.old[b].reduce((s, x) => s + x[0], 0) : 'nothing grey') + bl.filter((x) => x[1] >= 0).map((x) => ' + item ' + (R.items.findIndex((y) => y[1] === x[1]) + 1) + ' (' + x[0] + ')').join('')).join('; ');
      return {
        panels,
        answer: { b: A },
        options,
        render: (s) => (s.b ? drawBins(s.b) : drawQueue(s.q)),
        key: (s) => K(s),
        rules: [
          { k: 'Bins', t: 'Each bin holds <b>6 units</b>. A block\'s height is its size (1 to 4 units); the grey blocks are already inside the bins. The faint lines mark single units.' },
          { k: 'Queue', t: 'The 2nd panel is the queue of items, read <b>from left to right</b>, each with its own pattern. Items are placed one by one, as a whole, on top of what the chosen bin already holds, so inside a bin the new items stack in order of arrival.' },
          { k: 'Policy', t: 'Choice of bin, identical in every row: ' + POLTXT[pol] + '. Free space always changes after each item.' },
          { k: 'Not another policy', t: 'Leftmost bin, tightest bin, emptiest bin, "stay in the current bin", rightmost bin, sorting the queue, or reading it backwards each give a different result in rows 1 and 2.' },
          { k: 'Last row', t: 'Free space at the start (left, middle, right): ' + st.join(', ') + '.<br>' + steps.join('<br>') + '<br>Result: <b>' + fin + '</b>.' },
        ],
        hint: 'Place the items one at a time and recompute the free space of every bin after each one.',
      };

      function drawBins(bins) {
        const pic = new RM.Pic();
        const bot = 90;
        const w = 24;
        bins.forEach((bl, b) => {
          const cx = [21, 50, 79][b];
          for (let u = 1; u < C; u++) RM.line(pic, cx - w / 2 + 1, bot - u * CU, cx + w / 2 - 1, bot - u * CU, { sw: 0.8, color: RM.LIGHT, cap: 'butt' });
          let y = bot - 1;
          bl.forEach((x) => {
            const h = x[0] * CU - (x[0] === 0 ? 0 : 0);
            const top = y - h;
            RM.polygon(pic, [[cx - w / 2 + 2.6, top], [cx + w / 2 - 2.6, top], [cx + w / 2 - 2.6, y], [cx - w / 2 + 2.6, y]], { fill: x[1] < 0 ? '#cfd3da' : FILLS[x[1]], sw: 1.6 });
            y = top;
          });
          RM.polyline(pic, [[cx - w / 2, 14], [cx - w / 2, bot], [cx + w / 2, bot], [cx + w / 2, 14]], { sw: 2.4 });
        });
        return pic.svg();
      }
      function drawQueue(q) {
        const pic = new RM.Pic();
        const w = 15;
        const gap = 5;
        const tot = q.length * w + (q.length - 1) * gap;
        let x = 50 - tot / 2;
        const bot = 78;
        q.forEach((it) => {
          const top = bot - it[0] * CU;
          RM.polygon(pic, [[x, top], [x + w, top], [x + w, bot], [x, bot]], { fill: FILLS[it[1]], sw: 1.6 });
          x += w + gap;
        });
        RM.line(pic, 8, 90, 84, 90, { sw: 2, cap: 'butt' });
        RM.polygon(pic, [[93, 90], [84, 85.5], [84, 94.5]], { fill: 'black', sw: 0.8 });
        return pic.svg();
      }
    },
  });
})();
