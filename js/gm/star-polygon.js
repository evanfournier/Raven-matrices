/* Star polygons (grandmaster): {n/k} stars - n points on an invisible circle, each joined to the k-th next one.
   Rows/columns vary n and k by hidden progressions; compound stars (gcd>1) are drawn as several polygons. */
(function () {
  'use strict';
  const RM = window.RM;
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const kc = (n, k) => Math.min(k, n - k);

  RM.register({
    id: 'star-polygon',
    name: 'Star polygons',
    difficulty: 7,
    generate(rng, variant) {
      let N, K; // N[r][c], K[r][c]
      if (variant === 2) {
        const ks = rng.shuffle([2, 3, 4]);
        const n0 = rng.shuffle([7, 8, 9, 10]).slice(0, 3);
        N = RM.grid3((r, c) => n0[r] + c);
        K = RM.grid3((r) => ks[r]);
      } else {
        const ns = rng.shuffle([9, 10, 11, 12]).slice(0, 3);
        N = RM.grid3((r) => ns[r]);
        K = RM.grid3((r, c) => (variant === 1 ? 4 - c : 2 + c));
        if (variant === 3) for (let r = 0; r < 3; r++) RM.need([0, 1, 2].some((c) => gcd(N[r][c], K[r][c]) > 1));
      }
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) RM.need(K[r][c] * 2 < N[r][c]);
      const KN = RM.grid3((r, c) => kc(N[r][c], K[r][c]));
      RM.needUnique(N, N[2][2], 'numeric');
      RM.needUnique(KN, KN[2][2], 'numeric');
      const mk = (r, c) => ({ n: N[r][c], k: K[r][c], rot: rng.int(0, 359), part: 0 });
      const panels = RM.flat(RM.grid3(mk));
      const an = N[2][2], ak = KN[2][2];
      const answer = mk(2, 2);
      const canon = (s) => s.n + '/' + kc(s.n, s.k) + '/' + s.part;
      const ansCanon = canon(answer);
      const seen = {};
      const cands = [];
      const add = (n, k, why, part) => {
        if (n < 7 || k < 2 || 2 * k >= n) return;
        const s = { n, k, rot: rng.int(0, 359), part: part || 0 };
        if (part && gcd(n, k) === 1) return;
        const ck = canon(s);
        if (ck === ansCanon || seen[ck]) return;
        seen[ck] = 1;
        cands.push({ spec: s, flaws: [why] });
      };
      add(an, ak + 1, 'The line jump is one step too long (k = ' + (ak + 1) + ' instead of ' + ak + ').');
      add(an, ak - 1, 'The line jump is one step too short (k = ' + (ak - 1) + ' instead of ' + ak + ').');
      add(an + 1, ak, 'It has ' + (an + 1) + ' points instead of ' + an + '.');
      add(an - 1, ak, 'It has ' + (an - 1) + ' points instead of ' + an + '.');
      add(an + 1, ak + 1, 'Both the number of points and the jump are wrong.');
      add(an - 1, ak - 1, 'Both the number of points and the jump are wrong.');
      add(an + 1, ak - 1, 'Both the number of points and the jump are wrong.');
      add(an - 1, ak + 1, 'Both the number of points and the jump are wrong.');
      add(N[2][1], K[2][1], 'This is the figure of the left neighbour: the step was not applied.');
      add(N[1][2], K[1][2], 'This is the figure above: the row n was copied from the wrong place.');
      add(an, 2 * ak, 'The jump was doubled.');
      add(an + 2, ak, 'It has ' + (an + 2) + ' points instead of ' + an + '.');
      add(an, ak + 2, 'The line jump is two steps too long.');
      if (gcd(an, ak) > 1) {
        add(an, ak, 'Only one of the ' + gcd(an, ak) + ' interlaced polygons is drawn; the points are shared among several polygons.', 1);
      } else {
        // a figure that is compound where the answer is a single star
        for (let d = ak + 1; d < an / 2; d++) if (gcd(an, d) > 1) { add(an, d, 'The jump is wrong and the figure falls apart into several polygons.'); break; }
      }
      RM.need(cands.length >= 7);
      const picked = rng.shuffle(cands).slice(0, 7);
      const options = [{ spec: answer, flaws: [] }].concat(picked);
      const d = gcd(an, answer.k);
      const desc = (n, k) => '{' + n + '/' + k + '}';
      const names = ['left', 'middle', 'right'];
      const list = [0, 1, 2].map((r) => '<br>row ' + (r + 1) + ': ' + [0, 1, 2].map((c) => (r === 2 && c === 2 ? '?' : desc(N[r][c], K[r][c]))).join(', ')).join('');
      let rnRule, rkRule;
      if (variant === 2) {
        rnRule = 'In each row the number of points <b>increases by 1</b> from one panel to the next.';
        rkRule = 'The jump k is the <b>same along a row</b> and differs between rows.';
      } else {
        rnRule = 'The number of points n is the <b>same along a row</b> and differs between rows.';
        rkRule = 'In each row the jump k ' + (variant === 1 ? '<b>decreases by 1</b>' : '<b>increases by 1</b>') + ' from one panel to the next.';
      }
      return {
        panels, answer, options,
        key: (s) => [s.n, s.k, s.rot, s.part].join('_'),
        render(s) {
          const pic = new RM.Pic();
          const pt = (i) => {
            const a = ((s.rot + (360 * i) / s.n) * Math.PI) / 180;
            return [50 + 38 * Math.cos(a), 50 + 38 * Math.sin(a)];
          };
          const dd = gcd(s.n, s.k);
          for (let st = 0; st < (s.part ? 1 : dd); st++) {
            let i = st;
            do {
              const j = (i + s.k) % s.n, a = pt(i), b = pt(j);
              RM.line(pic, a[0], a[1], b[0], b[1], { sw: 1.8 });
              i = j;
            } while (i !== st);
          }
          for (let i = 0; i < s.n; i++) { const p = pt(i); RM.circle(pic, p[0], p[1], 2.2, { fill: RM.INK }); }
          return pic.svg();
        },
        rules: [
          { k: 'Reading a figure', t: 'Each panel has <b>n</b> dots on an invisible circle. Every dot is joined to the dot <b>k</b> places further round (a star {n/k}). If n and k share a divisor d, the figure falls apart into d separate polygons. The figure may be turned: only n and k matter.' },
          { k: 'Rule for n', t: rnRule },
          { k: 'Rule for k', t: rkRule },
          { k: 'The panels', t: 'Counting the dots and the jump of each panel gives:' + list },
          { k: 'Missing panel', t: 'n = <b>' + an + '</b> and k = <b>' + answer.k + '</b>' + (d > 1 ? ' (' + d + ' separate polygons)' : '') + ': the answer is the star <b>' + desc(an, answer.k) + '</b>.' },
        ],
        hint: 'Count the points, then count how far each line jumps.',
      };
    },
  });
})();
