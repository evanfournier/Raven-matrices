/* Melodies (grandmaster): each row is a melody of 5 notes on a staff; column 2 = T1(column 1) and column 3 = T2(column 2),
   where T1, T2 are classic twelve-tone moves: retrograde (backwards), inversion (mirror around the middle line),
   transposition (up/down k steps) or a combination. Durations (hollow/filled heads) travel with their notes. */
(function () {
  'use strict';
  const RM = window.RM;
  const N = 5, MAXP = 10;
  // transformation t = {rev, sg (+1/-1), sh}: out pitch = sg*p + sh; reversed order if rev
  const ap = (t, m) => {
    const p = m.p.map(x => t.sg * x + t.sh), d = m.d.slice();
    if (t.rev) { p.reverse(); d.reverse(); }
    return { p, d };
  };
  const ok = m => m.p.every(x => x >= 0 && x <= MAXP);
  const key = m => m.p.join(',') + '|' + m.d.join('');
  const same = (a, b) => key(a) === key(b);
  const R = { rev: true, sg: 1, sh: 0 }, I = { rev: false, sg: -1, sh: 10 }, RI = { rev: true, sg: -1, sh: 10 };
  const T = k => ({ rev: false, sg: 1, sh: k });
  const RT = k => ({ rev: true, sg: 1, sh: k });
  const BASE = [R, I, RI, T(1), T(-1), T(2), T(-2), T(3), T(-3), RT(1), RT(-1), RT(2), RT(-2), RT(3), RT(-3)];
  const ALLF = [];
  for (const rev of [false, true]) for (const sg of [1, -1]) for (let sh = -10; sh <= 10; sh++) ALLF.push({ rev, sg, sh });
  const isId = t => !t.rev && t.sg === 1 && t.sh === 0;
  const name = t => {
    const parts = [];
    if (t.rev) parts.push('plays the melody backwards (last note first)');
    if (t.sg < 0) parts.push('turns it upside down around the middle line' + (t.sh !== 10 ? ' (shifted)' : ''));
    else if (t.sh) parts.push('moves every note ' + Math.abs(t.sh) + ' step' + (Math.abs(t.sh) > 1 ? 's' : '') + (t.sh > 0 ? ' up' : ' down'));
    return parts.join(', then ');
  };
  const xs = i => 22 + 15 * i;
  const yOf = p => 70 - 4 * p;

  function render(m) {
    const pic = new RM.Pic();
    for (let l = 0; l < 5; l++) RM.line(pic, 8, 34 + 8 * l, 92, 34 + 8 * l, { sw: 1.5, color: RM.GRAY });
    for (let i = 0; i < N; i++) {
      const x = xs(i), y = yOf(m.p[i]), up = m.p[i] < 5, hollow = m.d[i] === 1;
      if (up) RM.line(pic, x + 4, y, x + 4, y - 20, { sw: 2, color: RM.INK });
      else RM.line(pic, x - 4, y, x - 4, y + 20, { sw: 2, color: RM.INK });
      pic.add('<ellipse cx="' + RM.fmt(x) + '" cy="' + RM.fmt(y) + '" rx="4.8" ry="3.6" transform="rotate(-20 ' + RM.fmt(x) + ' ' + RM.fmt(y) + ')" fill="' + (hollow ? '#fff' : RM.INK) + '" stroke="' + RM.INK + '" stroke-width="' + (hollow ? 2 : 1) + '"/>');
    }
    return pic.svg();
  }

  RM.register({
    id: 'melody',
    name: 'Melodies',
    difficulty: 7,
    generate(rng, variant) {
      const useDur = variant === 0 || variant === 2;
      let t1 = rng.pick(BASE), t2 = rng.pick(BASE);
      RM.need(t1 !== t2);
      const mk = () => {
        for (let a = 0; a < 40; a++) {
          const p = []; for (let i = 0; i < N; i++) p.push(rng.int(0, MAXP));
          const d = []; for (let i = 0; i < N; i++) d.push(useDur ? (rng.chance(0.4) ? 1 : 0) : 0);
          const m = { p, d };
          const mx = Math.max(...p), mn = Math.min(...p);
          if (mx - mn < 4 || p.some((x, i) => i && x === p[i - 1])) continue;
          if ([R, I, RI].some(t => same(ap(t, m), m))) continue;
          const m2 = ap(t1, m), m3 = ap(t2, m2);
          if (ok(m2) && ok(m3) && !same(m2, m) && !same(m3, m2)) return [m, m2, m3];
        }
        return null;
      };
      const rows = [mk(), mk(), mk()];
      RM.need(rows.every(Boolean));
      RM.need(new Set(rows.map(r => key(r[0]))).size === 3);
      // hypotheses: all single transformations consistent with the visible pairs
      const S1 = ALLF.filter(f => rows.every(r => { const o = ap(f, r[0]); return ok(o) && same(o, r[1]); }));
      const S2 = ALLF.filter(f => [0, 1].every(i => { const o = ap(f, rows[i][1]); return ok(o) && same(o, rows[i][2]); }));
      RM.need(S1.length && S2.length);
      const preds = new Set(S2.map(f => { const o = ap(f, rows[2][1]); return ok(o) ? key(o) : 'x'; }));
      RM.need(preds.size === 1 && preds.has(key(rows[2][2])));

      const ans = rows[2][2], c2 = rows[2][1], c1 = rows[2][0];
      const pools = { off: [], tr: [], rev: [], axis: [], dur: [], cp: [] };
      const add = (pool, m, why) => { if (ok(m) && !same(m, ans)) pools[pool].push({ spec: m, flaws: [why] }); };
      for (let i = 0; i < N; i++) for (const s of [1, -1]) {
        const m = { p: ans.p.slice(), d: ans.d.slice() }; m.p[i] += s;
        add('off', m, 'note ' + (i + 1) + ' is one step ' + (s > 0 ? 'too high' : 'too low') + '; the transformation moves every note exactly');
      }
      for (const t of BASE) if (t !== t2) add('tr', ap(t, c2), 'applies a different transformation (it ' + name(t) + ') instead of the one used between the first two columns: it ' + name(t2));
      add('rev', { p: ans.p.slice().reverse(), d: ans.d.slice() }, 'right pitches but in reverse order of the true result');
      add('rev', { p: ans.p.slice().reverse(), d: ans.d.slice().reverse() }, 'the melody is the true result played backwards');
      for (let s = 7; s <= 13; s++) if (s !== 10) add('axis', ap({ rev: t2.rev, sg: -1, sh: s }, c2), 'mirror around the wrong line (not the middle line)');
      for (const t of BASE) add('axis', ap(t, c1), 'the transformation is applied to the first column instead of the second');
      if (useDur) {
        add('dur', { p: ans.p.slice(), d: ans.d.slice().reverse() }, 'right pitches but the hollow/filled note values were not carried with their notes');
        add('dur', { p: ans.p.slice(), d: ans.d.map(x => 1 - x) }, 'note values are inverted');
      }
      add('cp', c2, 'just repeats the middle melody of the row');
      add('cp', c1, 'just repeats the first melody of the row');
      const seen = new Set([key(ans)]), opts = [{ spec: ans, flaws: [] }];
      const names = Object.keys(pools).filter(k => pools[k].length);
      const lists = names.map(k => rng.shuffle(pools[k]));
      for (let r = 0; r < 20 && opts.length < 8; r++) for (const l of lists) {
        if (opts.length >= 8) break;
        const c = l[r]; if (!c) continue;
        const k = key(c.spec); if (seen.has(k)) continue;
        seen.add(k); opts.push(c);
      }
      RM.need(opts.length === 8);

      const numTxt = m => m.p.join(', ');
      const dtxt = useDur ? ' Hollow and filled heads (note lengths) stay attached to their notes when the melody moves.' : '';
      const rules = [
        { k: 'Numbering', t: 'Give each staff position a number: 0 = the space just below the bottom line, 1 = the bottom line, 2 = the next space, … up to 10 = the space above the top line. The middle line is 5.' + dtxt },
        { k: 'Column 1 to 2', t: 'Going from the first to the second panel, the melody ' + name(t1) + '. Check on rows 1 and 2.' },
        { k: 'Column 2 to 3', t: 'Going from the second to the third panel, the melody ' + name(t2) + '. Check on rows 1 and 2.' },
        { k: 'Row 3', t: 'First panel: ' + numTxt(c1) + '. After the first move: ' + numTxt(c2) + '. After the second move: <b>' + numTxt(ans) + '</b>' + (useDur ? ' (with the note lengths carried along)' : '') + '.' },
      ];
      return {
        panels: RM.flat([[rows[0][0], rows[0][1], rows[0][2]], [rows[1][0], rows[1][1], rows[1][2]], [c1, c2]]),
        answer: ans, options: opts, render, key, rules,
        hint: 'Musicians transform melodies in a few classic ways.',
      };
    },
  });
})();
