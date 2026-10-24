/* Five rules (grandmaster): a compound figure with five parts, each driven by a different kind of rule.
 * outer shape (circle / square / hexagon) = Latin square; inner arrow rotation = a fixed quarter-turn step per column;
 * dot count (1–6) = col 1 + col 2 = col 3 (variants: col 1 − col 2); position of a bar around the shape (8 places) =
 * moves clockwise by a fixed step per ROW (down each column); fill of the inner arrow = Latin square in the other
 * orientation. Each of the five attribute grids is checked with RM.needUnique, and every distractor breaks one or two
 * rules, each with a precise flaw. */
(function () {
  'use strict';
  const RM = window.RM;

  const SHN = ['circle', 'square', 'hexagon'];
  const FLN = ['white', 'grey', 'black'];
  const FILL = ['white', 'gray', 'black'];
  const DIRN = ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'];

  RM.register({
    id: 'five-rules',
    name: 'Five rules',
    difficulty: 7,
    generate(rng, variant) {
      const aS = rng.pick([1, 2]);
      const pS = rng.shuffle([0, 1, 2]);
      const pF = rng.shuffle([0, 1, 2]);
      const oS = rng.int(0, 2);
      const oF = rng.int(0, 2);
      const SH = RM.grid3((r, c) => pS[RM.latin(r, c, aS, oS)]);
      const FL = RM.grid3((r, c) => pF[RM.latin(r, c, 3 - aS, oF)]);
      const st = [1, 3, 1, 3][variant % 4];
      const R0 = rng.sample([0, 1, 2, 3], 3);
      const ROT = RM.grid3((r, c) => (R0[r] + st * c) % 4);
      const diff = variant % 2 === 1;
      const pairs = [];
      while (pairs.length < 3) {
        let a;
        let b;
        if (diff) {
          a = rng.int(2, 6);
          b = rng.int(1, a - 1);
        } else {
          a = rng.int(1, 5);
          b = rng.int(1, 5);
          if (a + b > 6) continue;
        }
        if (!pairs.some((p) => p[0] === a && p[1] === b)) pairs.push([a, b]);
      }
      const DT = RM.grid3((r, c) => (c < 2 ? pairs[r][c] : diff ? pairs[r][0] - pairs[r][1] : pairs[r][0] + pairs[r][1]));
      const s = rng.pick([1, 2, 3]);
      const P0 = rng.sample(RM.range(8), 3);
      const BR = RM.grid3((r, c) => (P0[c] + s * r) % 8);

      RM.needUnique(SH, SH[2][2], 'categorical');
      RM.needUnique(FL, FL[2][2], 'categorical');
      RM.needUnique(ROT, ROT[2][2], 'numeric', 4);
      RM.needUnique(DT, DT[2][2], 'numeric');
      RM.needUnique(BR, BR[2][2], 'numeric', 8);

      const spec = (r, c) => ({ sh: SH[r][c], rot: ROT[r][c], dots: DT[r][c], bar: BR[r][c], fl: FL[r][c] });
      const ans = spec(2, 2);
      const key = (x) => [x.sh, x.rot, x.dots, x.bar, x.fl].join('.');

      /* ---------------------------------------------------------- distractors */
      const op = diff ? '−' : '+';
      const alts = {
        sh: [],
        fl: [],
        rot: [],
        dots: [],
        bar: [],
      };
      [0, 1, 2].forEach((w) => {
        if (w === ans.sh) return;
        const col = w === SH[2][0] ? 1 : 2;
        alts.sh.push({ v: w, why: `the outer shape must be the ${SHN[ans.sh]}: the ${SHN[w]} already appears in this row (column ${col}), and each outer shape occurs once per row and column` });
        if (w === ans.fl) return;
      });
      [0, 1, 2].forEach((w) => {
        if (w === ans.fl) return;
        const col = w === FL[2][0] ? 1 : 2;
        alts.fl.push({ v: w, why: `the inner shape must be ${FLN[ans.fl]}: ${FLN[w]} already appears in this row (column ${col}), and each fill occurs once per row and column` });
      });
      [0, 1, 2, 3].forEach((w) => {
        if (w === ans.rot) return;
        alts.rot.push({
          v: w,
          why: `the inner arrow must turn ${st === 1 ? '90°' : '270°'} clockwise from column 2 (${ROT[2][1] * 90}° → ${ans.rot * 90}°, measured clockwise from "pointing up"); here it is at ${w * 90}°`,
        });
      });
      const dotCands = [ans.dots + 1, ans.dots - 1, ans.dots + 2, ans.dots - 2, DT[2][1], DT[2][0]];
      new Set(dotCands.filter((d) => d >= 1 && d <= 6 && d !== ans.dots)).forEach((w) =>
        alts.dots.push({ v: w, why: `the dots must be ${DT[2][0]} ${op} ${DT[2][1]} = ${ans.dots}; here there are ${w}` })
      );
      [BR[1][2], RM.mod(ans.bar - s, 8), RM.mod(ans.bar + 1, 8), RM.mod(ans.bar - 1, 8), RM.mod(ans.bar + 4, 8), RM.mod(ans.bar + s, 8)].forEach((w, i, a) => {
        if (w === ans.bar || a.indexOf(w) !== i) return;
        alts.bar.push({ v: w, why: `the bar must move ${s * 45}° clockwise per row: ${DIRN[BR[1][2]]} (row 2) → ${DIRN[ans.bar]}; here it is at ${DIRN[w]}` });
      });
      const attrs = ['sh', 'rot', 'dots', 'bar', 'fl'];
      attrs.forEach((a) => RM.need(alts[a].length >= 1));
      const chosen = [];
      const seen = new Set([key(ans)]);
      const push = (x, flaws) => {
        const k = key(x);
        if (seen.has(k)) return false;
        seen.add(k);
        chosen.push({ s: x, flaws });
        return true;
      };
      attrs.forEach((a) => {
        const alt = rng.pick(alts[a]);
        push(Object.assign({}, ans, { [a]: alt.v }), [alt.why]);
      });
      let guard = 0;
      while (chosen.length < 7 && guard++ < 60) {
        const [a, b] = rng.sample(attrs, 2);
        const x = rng.pick(alts[a]);
        const y = rng.pick(alts[b]);
        push(Object.assign({}, ans, { [a]: x.v, [b]: y.v }), [x.why, y.why]);
      }
      RM.need(chosen.length === 7);

      /* ---------------------------------------------------------- drawing */
      const render = (x) => {
        const pic = new RM.Pic();
        if (x.sh === 0) RM.shape(pic, 'circle', 50, 50, 29, { sw: 2.4 });
        else if (x.sh === 1) RM.shape(pic, 'square', 50, 50, 27, { sw: 2.4 });
        else RM.shape(pic, 'hexagon', 50, 50, 29, { sw: 2.4 });
        // bar
        const a = (x.bar * Math.PI) / 4;
        const ux = Math.sin(a);
        const uy = -Math.cos(a);
        RM.line(pic, 50 + 35 * ux, 50 + 35 * uy, 50 + 45 * ux, 50 + 45 * uy, { sw: 4.6, cap: 'butt' });
        // inner arrow
        RM.shape(pic, 'arrow', 50, 41, 9, { fill: FILL[x.fl], rot: x.rot * 90, sw: 2 });
        // dots
        const rows = x.dots <= 3 ? [x.dots] : [Math.ceil(x.dots / 2), Math.floor(x.dots / 2)];
        const ys = rows.length === 1 ? [62] : [59.5, 67];
        rows.forEach((n, i) => {
          for (let j = 0; j < n; j++) RM.circle(pic, 50 + (j - (n - 1) / 2) * 9.5, ys[i], 3, { fill: 'black', sw: 0.8 });
        });
        return pic.svg();
      };

      /* ---------------------------------------------------------- correction */
      const rules = [
        {
          k: 'Outer shape',
          t: `circle, square and hexagon each appear once in every row and every column (Latin square). Row 3 already has the ${SHN[SH[2][0]]} and the ${SHN[SH[2][1]]}, so the last panel has the <b>${SHN[ans.sh]}</b>.`,
        },
        {
          k: 'Inner arrow',
          t: `the arrow inside turns <b>${st === 1 ? '90° clockwise' : '270° clockwise (= 90° anticlockwise)'}</b> from each column to the next (row starts differ). In row 3 it is at ${ROT[2][0] * 90}° then ${ROT[2][1] * 90}°, so it ends at <b>${ans.rot * 90}°</b> (angles measured clockwise from "pointing up").`,
        },
        {
          k: 'Dots',
          t: `${diff ? 'column 1 minus column 2 gives column 3' : 'column 1 plus column 2 gives column 3'} (${DT[0][0]} ${op} ${DT[0][1]} = ${DT[0][2]}, ${DT[1][0]} ${op} ${DT[1][1]} = ${DT[1][2]}). Row 3: ${DT[2][0]} ${op} ${DT[2][1]} = <b>${ans.dots}</b> dots.`,
        },
        {
          k: 'Bar',
          t: `the bar moves <b>${s * 45}° clockwise</b> from each row to the next, down each column (it does not change along a row). Column 3: ${DIRN[BR[0][2]]} → ${DIRN[BR[1][2]]} → <b>${DIRN[ans.bar]}</b>.`,
        },
        {
          k: 'Fill',
          t: `white, grey and black arrows each appear once per row and per column, in the other diagonal direction than the outer shapes. Row 3 has ${FLN[FL[2][0]]} and ${FLN[FL[2][1]]}, so the arrow is <b>${FLN[ans.fl]}</b>.`,
        },
        { k: 'Answer', t: `${SHN[ans.sh]} outline, ${FLN[ans.fl]} arrow turned ${ans.rot * 90}°, ${ans.dots} dots, bar at the ${DIRN[ans.bar]}.` },
      ];

      const panels = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (r < 2 || c < 2) panels.push(spec(r, c));
      return {
        difficulty: 7,
        hint: 'five independent features, five different kinds of rule: some work along the rows, one works down the columns.',
        panels,
        answer: ans,
        options: [{ spec: ans, flaws: [] }].concat(chosen.map((c) => ({ spec: c.s, flaws: c.flaws }))),
        render,
        key,
        rules,
      };
    },
  });
})();
