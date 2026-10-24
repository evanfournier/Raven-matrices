/* Proportions (grandmaster): every panel is a cluster of identical shapes, some black, some white. Along each ROW the
 * black share is a constant fraction (different in every row: 1/2, 1/3, 2/3, 1/4, 3/4, 2/5, 3/5). The TOTAL number of
 * shapes follows its own rule DOWN THE COLUMNS (row 3 = row 1 + row 2, row 1 - row 2, or an arithmetic progression),
 * so neither the black nor the white counts follow a simple rule by themselves: the solver must combine the column
 * rule for the total with the row fraction. Checked: the total rule is the only listed rule on the totals, and no
 * listed rule on the black or white counts predicts anything else. */
(function () {
  'use strict';
  const RM = window.RM;

  const FR = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5]];
  const SH = ['circle', 'square', 'triangle', 'diamond', 'hexagon', 'pentagon'];
  const X = [16, 39, 61, 84];
  const Y = [25, 50, 75];
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const red = (b, n) => {
    if (b === 0) return ' (none black)';
    if (b === n) return ' (all black)';
    const g = gcd(b, n) || 1;
    return g === 1 ? '' : ' (= ' + b / g + '/' + n / g + ')';
  };
  const fs = (f) => f[0] + '/' + f[1];
  const RULES = {
    colsum: { f: (a, b) => a + b, name: 'sum', txt: 'in each column the number of shapes in the 3rd row is the <b>sum</b> of the numbers in the two rows above it', calc: (a, b, t) => `${a} + ${b} = ${t}` },
    coldiff: { f: (a, b) => a - b, name: 'difference', txt: 'in each column the number of shapes in the 3rd row is the <b>difference</b> of the two rows above it (1st row minus 2nd row)', calc: (a, b, t) => `${a} − ${b} = ${t}` },
    colprog: { f: (a, b) => 2 * b - a, name: 'progression', txt: 'in each column the number of shapes changes by a <b>constant step</b> (the same step between row 1 → row 2 and row 2 → row 3)', calc: (a, b, t) => `${a}, ${b}, ${t} (step ${b - a > 0 ? '+' : '−'}${Math.abs(b - a)})` },
  };

  RM.register({
    id: 'proportions',
    name: 'Proportions',
    difficulty: 7,
    generate(rng, variant) {
      const rk = variant === 0 ? 'colsum' : variant === 1 ? 'colprog' : variant === 2 ? 'coldiff' : rng.pick(['colsum', 'colprog', 'coldiff']);
      const R = RULES[rk];
      let T = null;
      let fr = null;
      for (let tries = 0; tries < 80 && !T; tries++) {
        fr = rng.sample(FR, 3);
        const opts = [];
        for (let a = 2; a <= 12; a++)
          if (a % fr[0][1] === 0)
            for (let b = 2; b <= 12; b++)
              if (b % fr[1][1] === 0 && b !== a) {
                const t = R.f(a, b);
                if (t >= 2 && t <= 12 && t % fr[2][1] === 0 && t !== b) opts.push([a, b, t]);
              }
        if (opts.length >= 3) {
          const cols = rng.sample(opts, 3);
          T = [0, 1, 2].map((r) => cols.map((cl) => cl[r]));
        }
      }
      RM.need(T);
      const B = T.map((row, r) => row.map((t) => (t * fr[r][0]) / fr[r][1]));
      const W = T.map((row, r) => row.map((t, c) => t - B[r][c]));
      const Tn = T[2][2];
      const Bn = B[2][2];
      const [p, q] = fr[2];
      RM.needUnique(T, Tn, 'numeric');
      RM.needNoConflict(B, Bn, 'numeric');
      RM.needNoConflict(W, Tn - Bn, 'numeric');

      const sh = rng.pick(SH);
      const mk = (n, b) => {
        const cells = rng.sample([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], n).sort((x, y) => x - y);
        const blk = rng.shuffle(cells.map((_, i) => i < b));
        return { n, b, cells, blk };
      };
      const panels = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (r < 2 || c < 2) panels.push(mk(T[r][c], B[r][c]));
      const answer = mk(Tn, Bn);

      const calc = R.calc(T[0][2], T[1][2], Tn);
      const cand = new Map();
      const add = (n, b) => {
        if (n < 2 || n > 12 || b < 0 || b > n || (n === Tn && b === Bn)) return;
        cand.set(n + ',' + b, [n, b]);
      };
      for (const g of FR) if ((Tn * g[0]) % g[1] === 0) add(Tn, (Tn * g[0]) / g[1]);
      for (let d = -3; d <= 3; d++) add(Tn, Bn + d);
      add(Tn, Tn - Bn);
      for (let n = q; n <= 12; n += q) add(n, (n * p) / q);
      const alts = [T[2][0] + T[2][1], 2 * T[2][1] - T[2][0], T[2][1], T[2][0], T[0][2], T[1][2], Math.abs(T[2][0] - T[2][1])];
      for (const n of alts) {
        add(n, Math.round((n * p) / q));
        add(n, Bn);
      }
      for (let n = Bn + 1; n <= 12; n++) add(n, Bn);
      for (let n = Tn - Bn + 1; n <= 12; n++) add(n, n - (Tn - Bn));
      const all = [...cand.values()];
      const same = all.filter((x) => x[0] === Tn);
      const sb = all.filter((x) => x[1] === Bn || x[0] - x[1] === Tn - Bn);
      const fo = all.filter((x) => x[0] !== Tn && x[1] * q === p * x[0]);
      const chosen = new Map();
      const take = (arr, k) => {
        for (const x of rng.shuffle(arr)) {
          if (k <= 0) break;
          if (!chosen.has(x[0] + ',' + x[1])) {
            chosen.set(x[0] + ',' + x[1], x);
            k--;
          }
        }
      };
      take(same, 2);
      take(sb, 2);
      take(fo, 2);
      take(all, 7 - chosen.size);
      RM.need(chosen.size === 7);

      const flawsOf = (n, b) => {
        const fl = [];
        if (n !== Tn) fl.push(`it has ${n} shapes, but the column rule gives ${Tn} for this panel (${calc})`);
        if (b * q !== p * n) {
          let other = '';
          for (let k = 0; k < 2; k++) if (b * fr[k][1] === fr[k][0] * n) other = ` — that is the fraction of row ${k + 1}, not of row 3`;
          fl.push(`${b} black out of ${n}${red(b, n)} is not ${fs(fr[2])}, the fraction of row 3${other}`);
        }
        return fl;
      };
      const options = [{ spec: answer, flaws: [] }];
      for (const [n, b] of chosen.values()) options.push({ spec: mk(n, b), flaws: flawsOf(n, b) });

      const evid = (r) => T[r].map((t, c) => `${B[r][c]} of ${t}`).join(', ');
      const rules = [
        { k: 'Black share', t: `in every row all three panels have the <b>same fraction</b> of black shapes, and every row has its own fraction. Row 1: ${evid(0)} → <b>${fs(fr[0])}</b>. Row 2: ${evid(1)} → <b>${fs(fr[1])}</b>. Row 3 (so far): ${T[2].slice(0, 2).map((t, c) => `${B[2][c]} of ${t}`).join(', ')} → <b>${fs(fr[2])}</b>.` },
        { k: 'Total', t: `the <b>total</b> number of shapes has its own rule: ${R.txt}. Totals, column by column: ${[0, 1, 2].map((c) => `${T[0][c]}, ${T[1][c]}${c < 2 ? ', ' + T[2][c] : ', ?'}`).join(' | ')}. Neither the black nor the white counts follow a simple rule on their own.` },
        { k: 'Answer', t: `column 3: ${calc}, so the last panel has <b>${Tn}</b> shapes. Row 3 has the fraction ${fs(fr[2])}: ${fs(fr[2])} of ${Tn} = ${Bn} black, and ${Tn - Bn} white. Answer: <b>${Tn} shapes, ${Bn} black and ${Tn - Bn} white</b>.` },
      ];
      return {
        difficulty: 7,
        hint: 'Each row keeps its own black share; the total number of shapes is governed by something else.',
        panels,
        answer,
        options,
        rules,
        key: (s) => JSON.stringify([s.cells, s.blk]),
        render(s) {
          const pic = new RM.Pic();
          s.cells.forEach((cell, i) => RM.shape(pic, sh, X[cell % 4], Y[Math.floor(cell / 4)], 9.5, { fill: s.blk[i] ? 'black' : 'white', sw: 2 }));
          return pic.svg();
        },
      };
    },
  });
})();
