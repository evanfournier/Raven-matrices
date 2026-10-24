/* Sieve (grandmaster): the numbers 2..31 in a grid read in reading order. Each column is one step of the sieve of
 * Eratosthenes: the smallest unmarked number is circled and all its larger multiples are crossed out; marks are kept.
 * Rows use different grid widths and start at different stages. */
(function () {
  'use strict';
  const RM = window.RM;
  const NUMS = RM.range(30).map((i) => i + 2);
  const uniq = (a) => Array.from(new Set(a)).sort((x, y) => x - y);
  const isMarked = (P, n) => P.circ.includes(n) || P.cross.includes(n);
  const firstFree = (P, skip) => NUMS.find((n) => !isMarked(P, n) && !(skip || []).includes(n));
  const mult = (p, off) => {
    const r = [];
    for (let m = 2 * p; m <= 31; m += p) if (m + (off || 0) >= 2 && m + (off || 0) <= 31) r.push(m + (off || 0));
    return r;
  };
  const add = (P, c, x) => ({ circ: uniq(P.circ.concat(c || [])), cross: uniq(P.cross.concat(x || [])) });
  function run(stage) {
    let P = { circ: [], cross: [] };
    for (let s = 0; s < stage; s++) {
      const p = firstFree(P);
      if (!p) return null;
      P = add(P, [p], mult(p));
    }
    return P;
  }
  const sameState = (a, b) => RM.sameArr(a.circ, b.circ) && RM.sameArr(a.cross, b.cross);
  const stageOf = (P) => { for (let s = 0; s <= 11; s++) { const q = run(s); if (q && sameState(q, P)) return s; } return -1; };
  const keyOf = (s) => s.w + '|' + s.circ.join(',') + '|' + s.cross.join(',');
  const symd = (a, b) => a.filter((x) => !b.includes(x)).length + b.filter((x) => !a.includes(x)).length;
  const dist = (a, b) => symd(a.circ, b.circ) + symd(a.cross, b.cross);
  const lst = (a) => a.join(', ');

  function pick7(rng, ans, cands) {
    const seen = new Set([ans.key]), pool = [];
    for (const c of cands) if (!seen.has(c.key)) { seen.add(c.key); pool.push(c); }
    RM.need(pool.length >= 7);
    for (let t = 0; t < 40; t++) {
      const by = {};
      rng.shuffle(pool).forEach((c) => (by[c.tag] = by[c.tag] || []).push(c));
      const tags = rng.shuffle(Object.keys(by)), out = [];
      for (let i = 0; out.length < 7 && i < 12; i++) for (const tg of tags) if (by[tg][i] && out.length < 7) out.push(by[tg][i]);
      if (out.length < 7) continue;
      const all = [ans].concat(out), sums = all.map((a) => all.reduce((s, b) => s + dist(a.spec, b.spec), 0));
      const o = sums.slice(1);
      if (sums[0] > Math.min(...o) && sums[0] < Math.max(...o)) return out;
    }
    RM.need(false);
  }

  RM.register({
    id: 'sieve',
    name: 'Sieve',
    difficulty: 7,
    generate(rng, variant) {
      const stages = rng.sample([0, 1, 2, 3, 4, 5], 3);
      const w0 = rng.pick([5, 6]);
      const widths = [w0, 11 - w0, rng.pick([5, 6])];
      const st = (r, c) => Object.assign({ w: widths[r] }, run(stages[r] + c));
      const panels = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (r < 2 || c < 2) panels.push(st(r, c));
      // rule hypotheses: n sieve steps per column
      const okN = [1, 2, 3].filter((n) => {
        for (let r = 0; r < 3; r++) {
          const s0 = stageOf(panels[r * 3 === 6 ? 6 : r * 3]);
          if (s0 < 0) return false;
          const lim = r < 2 ? 3 : 2;
          for (let c = 1; c < lim; c++) {
            const q = run(s0 + n * c);
            if (!q || !sameState(q, panels[r * 3 + c])) return false;
          }
        }
        return true;
      });
      RM.need(okN.length === 1 && okN[0] === 1);

      const s3 = stages[2], P = run(s3 + 1), ansS = run(s3 + 2);
      const p = firstFree(P), q = firstFree(P, [p]);
      const ans = Object.assign({ w: widths[2] }, ansS);
      const newX = mult(p).filter((m) => !P.cross.includes(m));
      const cands = [];
      const mk = (S, tag, flaw) => {
        const spec = Object.assign({ w: widths[2] }, S);
        cands.push({ spec, key: keyOf(spec), tag, flaws: [flaw] });
      };
      mk(add(P, [q], mult(q)), 'wrongprime', `${q} is circled, but the smallest unmarked number is ${p}: ${p} must be circled and the multiples of ${p} crossed.`);
      mk(add(P, [p], mult(q)), 'wrongmult', `${p} is circled but the multiples of ${q} are crossed; it must be the multiples of ${p} (${lst(mult(p))}).`);
      mk(add(P, [p], mult(p, 1)), 'off+1', `The crossed numbers are one above the multiples of ${p}; the multiples of ${p} are ${lst(mult(p).slice(0, 4))}…`);
      mk(add(P, [p], mult(p, -1)), 'off-1', `The crossed numbers are one below the multiples of ${p}; the multiples of ${p} are ${lst(mult(p).slice(0, 4))}…`);
      mk(add(P, [p], mult(p).concat([p])), 'primecross', `The prime ${p} is both circled and crossed; the circled number is never crossed out.`);
      mk(add(P, [], mult(p).concat([p])), 'primecross2', `${p} is crossed out instead of circled: the smallest unmarked number gets a circle.`);
      mk({ circ: [p], cross: uniq(P.cross.concat(mult(p))) }, 'lostcirc', `The primes circled earlier (${lst(P.circ)}) have lost their circles; marks stay from panel to panel.`);
      const lostX = P.cross.filter((x) => !mult(p).includes(x));
      if (lostX.length) mk({ circ: uniq(P.circ.concat([p])), cross: mult(p) }, 'lostcross', `Numbers crossed earlier (${lst(lostX.slice(0, 5))}…) are no longer crossed; marks stay from panel to panel.`);
      mk(P, 'stale', 'Nothing has changed since the previous panel: the next step has not been carried out.');
      const nx = run(s3 + 3);
      if (nx) mk(nx, 'extra', `One step too many: ${firstFree(ansS)} has been circled as well (that would be the next step).`);
      mk(add(P, [p], []), 'nocross', `${p} is circled but its multiples (${lst(newX.length ? newX : mult(p))}) are not crossed.`);
      mk(add(P, [], mult(p)), 'nocirc', `The multiples of ${p} are crossed but ${p} itself is not circled.`);
      if (newX.length) mk(add(P, [p], mult(p).filter((m) => m !== newX[newX.length - 1])), 'partial', `${newX[newX.length - 1]} is a multiple of ${p} and must be crossed too.`);
      mk(add(P, [p, q], mult(p).concat(mult(q))), 'twocirc', `Two numbers (${p} and ${q}) were circled in a single step; one step circles only the smallest unmarked number, ${p}.`);
      const out = pick7(rng, { spec: ans, key: keyOf(ans) }, cands);

      const circNow = lst(P.circ);
      return {
        panels,
        answer: ans,
        options: [{ spec: ans, flaws: [] }].concat(out.map((x) => ({ spec: x.spec, flaws: x.flaws }))),
        render(s) {
          const pic = new RM.Pic();
          const w = s.w, rows = Math.ceil(30 / w), cs = 13.4;
          const x0 = 50 - (w * cs) / 2, y0 = 50 - (rows * cs) / 2;
          NUMS.forEach((n, i) => {
            const cx = x0 + (i % w) * cs + cs / 2, cy = y0 + Math.floor(i / w) * cs + cs / 2;
            const xd = s.cross.includes(n), cd = s.circ.includes(n);
            pic.add(`<text x="${RM.fmt(cx)}" y="${RM.fmt(cy + 3.1)}" font-family="Arial, Helvetica, sans-serif" font-size="8.8" font-weight="700" text-anchor="middle" fill="${xd ? '#a3a3a3' : RM.INK}">${n}</text>`);
            if (xd) {
              RM.line(pic, cx - 4.4, cy - 4.4, cx + 4.4, cy + 4.4, { sw: 1.5, cap: 'butt', color: '#4a4a4a' });
              RM.line(pic, cx - 4.4, cy + 4.4, cx + 4.4, cy - 4.4, { sw: 1.5, cap: 'butt', color: '#4a4a4a' });
            }
            if (cd) RM.circle(pic, cx, cy, 6.2, { sw: 1.9 });
          });
          return pic.svg();
        },
        key: keyOf,
        rules: [
          { k: 'Grid', t: 'Each panel lists the numbers 2 to 31 in reading order; the grid width (numbers per line) can change from row to row, but within a row it stays the same.' },
          { k: 'Sieve step', t: 'Each column is one step of the <b>sieve of Eratosthenes</b>: the smallest number that is still unmarked (neither circled nor crossed) gets a <b>circle</b>, and all its <b>larger multiples</b> get crossed out. Marks from earlier steps stay.' },
          { k: 'Stages', t: 'The three panels of a row are three consecutive stages of the same sieve; rows simply start at different stages.' },
          { k: 'Last row', t: `The second panel of the last row has circled: ${circNow}. The smallest unmarked number is <b>${p}</b>, so ${p} gets a circle and its multiples ${lst(mult(p))} are crossed${newX.length ? ` (new: ${lst(newX)})` : ' (all of them were already crossed)'}.` },
          { k: 'Answer', t: `<b>Circled: ${lst(ansS.circ)}. Crossed: ${lst(ansS.cross)}.</b>` },
        ],
        hint: 'Each column is one step of an ancient prime-finding method.',
      };
    },
  });
})();
