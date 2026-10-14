/* Tower of Hanoi (grandmaster): the panels, read as one sequence, are snapshots of the OPTIMAL solution of a
 * Tower of Hanoi (5 or 6 discs) that moves the whole tower from one peg to another — but only every 2nd (or 3rd)
 * position is shown, and the first panel is already mid-solution. The solver has to recognise the puzzle, find
 * how many moves separate two panels, the direction in which the smallest disc cycles and whether each step
 * starts with the smallest disc or with the "other" forced move, then play the hidden moves after panel 8. */
(function () {
  'use strict';
  const RM = window.RM;

  const PEGX = [18, 50, 82];
  const BASE = 86;
  const PEG = ['left', 'middle', 'right'];
  const FNAME = { black: 'black', white: 'white', gray: 'grey', hatch: 'striped', dots: 'dotted', checker: 'chequered' };
  const ORD = ['smallest', '2nd smallest', '3rd smallest', '4th smallest', '5th smallest', '6th smallest'];

  /* Optimal solution: list of moves [disc, from, to] (disc 0 = smallest) and the n-disc peg vectors after each move. */
  function solve(n, S, T) {
    const moves = [];
    const rec = (k, a, b, c) => {
      if (k < 0) return;
      rec(k - 1, a, c, b);
      moves.push([k, a, b]);
      rec(k - 1, c, b, a);
    };
    rec(n - 1, S, T, 3 - S - T);
    const pos = [new Array(n).fill(S)];
    moves.forEach(([d, , b]) => {
      const p = pos[pos.length - 1].slice();
      p[d] = b;
      pos.push(p);
    });
    return { moves, pos };
  }
  /* stacks (bottom → top) from a peg vector: largest disc at the bottom */
  const stacksOf = (pos) => [0, 1, 2].map((p) => RM.range(pos.length).filter((d) => pos[d] === p).reverse());
  const skey = (st) => st.map((a) => a.join('.')).join('|');
  const cl = (st) => st.map((a) => a.slice());
  const top = (st, p) => (st[p].length ? st[p][st[p].length - 1] : -1);
  const legal = (st) => st.every((a) => a.every((d, i) => i === 0 || a[i - 1] > d));
  const pegOf = (st, d) => st.findIndex((a) => a.indexOf(d) >= 0);
  function doMove(st, a, b) {
    const s = cl(st);
    const d = s[a].pop();
    s[b].push(d);
    return { st: s, mv: [d, a, b] };
  }
  /* the only legal move that does not touch the smallest disc (null if none) */
  function otherMove(st) {
    const sp = pegOf(st, 0);
    const [a, b] = [0, 1, 2].filter((p) => p !== sp);
    const ta = top(st, a);
    const tb = top(st, b);
    if (ta < 0 && tb < 0) return null;
    if (tb < 0 || (ta >= 0 && ta < tb)) return [a, b];
    return [b, a];
  }
  /* play s moves from st, alternating smallest-disc moves (direction dir) and the forced other move */
  function play(st, s, startSmall, dir) {
    let cur = st;
    const mv = [];
    for (let i = 0; i < s; i++) {
      const small = (i % 2 === 0) === startSmall;
      let ab;
      if (small) {
        const p = pegOf(cur, 0);
        ab = [p, RM.mod(p + dir, 3)];
      } else {
        ab = otherMove(cur);
        if (!ab) return null;
      }
      const r = doMove(cur, ab[0], ab[1]);
      cur = r.st;
      mv.push(r.mv);
    }
    return { st: cur, mv };
  }

  RM.register({
    id: 'hanoi',
    name: 'Tower of Hanoi',
    difficulty: 7,
    generate(rng, variant) {
      const v = variant % 4;
      const n = v >= 2 ? 6 : 5;
      const s = v % 2 === 1 ? 3 : 2; // moves between two consecutive panels
      const last = (1 << n) - 1; // number of moves of the full solution
      const S = rng.int(0, 2);
      const T = rng.pick([0, 1, 2].filter((p) => p !== S));
      const t0 = rng.int(1, last - 8 * s - 2);
      const t = t0 + 8 * s;
      const sol = solve(n, S, T);
      const seq = sol.pos.map(stacksOf);
      const panels = RM.range(8).map((i) => ({ st: seq[t0 + i * s] }));
      const answer = { st: seq[t] };
      const P8 = seq[t - s];
      const ansKey = skey(answer.st);

      /* ---- rule identifiability: every optimal solution (any start / target peg), any number of moves per
       * panel, any starting move — all hypotheses that reproduce the 8 panels must predict the same 9th panel.
       * (The other cycling direction of the smallest disc = the solution towards the other peg.) */
      const pk = panels.map((p) => skey(p.st));
      const preds = new Set();
      let selfFound = false;
      for (let S2 = 0; S2 < 3; S2++)
        for (let T2 = 0; T2 < 3; T2++) {
          if (S2 === T2) continue;
          const keys2 = solve(n, S2, T2).pos.map((p) => skey(stacksOf(p)));
          for (let s2 = 1; 7 * s2 <= last; s2++)
            for (let a = 0; a + 7 * s2 <= last; a++) {
              if (!pk.every((k, i) => keys2[a + i * s2] === k)) continue;
              preds.add(keys2[Math.min(a + 8 * s2, last)]);
              if (S2 === S && T2 === T && s2 === s && a === t0) selfFound = true;
            }
        }
      RM.need(selfFound && preds.size === 1 && preds.has(ansKey));

      /* ---- no accidental salient Raven rule (constant, distribution of three, progression along rows or
       * columns) on the number of discs per peg or on the top disc of each peg. The full arithmetic catalogue
       * (sums, products, copies…) is not used: with counts 0–6 it fits by pure chance and nobody reads a
       * sequence puzzle that way. */
      const all = panels.map((p) => p.st).concat([answer.st]);
      const SALIENT = /^(row|column)[- ](constant|latin|progression)$/;
      for (let p = 0; p < 3; p++) {
        const g = RM.grid3((r, c) => (r === 2 && c === 2 ? undefined : all[r * 3 + c][p].length));
        RM.need(RM.preds.numeric(g).every((q) => !SALIENT.test(q[0]) || q[1] === answer.st[p].length));
        const gt = RM.grid3((r, c) => (r === 2 && c === 2 ? undefined : top(all[r * 3 + c], p)));
        RM.need(RM.preds.categorical(gt).every((q) => !SALIENT.test(q[0]) || q[1] === top(answer.st, p)));
      }

      /* ---- appearance: one fill per disc, widths clearly different */
      const fills = rng.shuffle(n === 5 ? ['black', 'white', 'gray', 'hatch', 'dots'] : ['black', 'white', 'gray', 'hatch', 'dots', 'checker']);
      const W = RM.range(n).map((d) => 10 + (18 * d) / (n - 1));
      const H = n === 5 ? 12 : 10;
      const fn = (d) => FNAME[fills[d]];
      const dn = (d) => `${fn(d)} disc`;
      const dnr = (d) => `${fn(d)} disc (${d === n - 1 ? 'largest' : ORD[d]})`;
      const mvTxt = (m) => `the ${dn(m[0])} from the ${PEG[m[1]]} peg to the ${PEG[m[2]]} peg`;
      const mvList = (ms) => ms.map(mvTxt).join(', then ');

      const dir = RM.mod(sol.moves.find((m) => m[0] === 0)[2] - sol.moves.find((m) => m[0] === 0)[1], 3);
      const dirS = dir === 1 ? 1 : -1;
      const cycleTxt =
        dirS === 1
          ? 'always moves one peg to the <b>right</b> (from the right peg it wraps round to the left peg)'
          : 'always moves one peg to the <b>left</b> (from the left peg it wraps round to the right peg)';
      const gapMoves = (i) => sol.moves.slice(t0 + i * s, t0 + (i + 1) * s); // moves from panel i+1 to panel i+2
      const lastGap = gapMoves(7);
      const startSmall = lastGap[0][0] === 0;
      const prevMove = sol.moves[t - s - 1]; // last move made before panel 8
      const chk = play(P8, s, startSmall, dirS);
      RM.need(chk && skey(chk.st) === ansKey); // sanity: the iterative rule reproduces the solution

      /* ---- distractors: specific misunderstandings of the rule, all checked against the answer */
      const cands = [];
      const add = (st, why, pri) => {
        if (st) cands.push({ st, why, pri });
      };
      const word = (k) => (k === 1 ? 'one move' : RM.word(k) + ' moves');
      // too few / too many moves
      for (let k = -s; k <= 2; k++) {
        if (k === 0 || t + k > last) continue;
        if (k === -s) add(seq[t + k], 'nothing has moved: this is panel 8 again — ' + RM.word(s) + ' moves are made between two panels', 2);
        else if (k < 0)
          add(seq[t + k], `${word(-k)} short: ${mvList(sol.moves.slice(t + k, t))} ${-k === 1 ? 'has' : 'have'} not been made yet — ${RM.word(s)} moves are made between two panels`, k === -1 ? 0 : 2);
        else
          add(seq[t + k], `${word(k)} too many: ${mvList(sol.moves.slice(t, t + k))} ${k === 1 ? 'was' : 'were'} also made — only ${RM.word(s)} moves are made between two panels`, k === 1 ? 0 : 2);
      }
      // smallest disc cycling the wrong way
      const firstSmall = lastGap.find((m) => m[0] === 0);
      const wrongDir = play(P8, s, startSmall, -dirS);
      if (wrongDir)
        add(
          wrongDir.st,
          `the smallest (${fn(0)}) disc went the wrong way round: it ${cycleTxt.replace(/<\/?b>/g, '')}, so from the ${PEG[firstSmall[1]]} peg it must go to the ${PEG[firstSmall[2]]} peg`,
          1
        );
      // wrong alternation (other move first / smallest disc first)
      const wrongOrd = play(P8, s, !startSmall, dirS);
      const ordWhy =
        `the moves alternate the wrong way: the last move before panel 8 was ${prevMove[0] === 0 ? 'a move of the smallest disc' : 'not a move of the smallest disc'}, ` +
        `so the first move after it must be ${startSmall ? 'the smallest disc' : 'the other legal move'} (${mvTxt(lastGap[0])})`;
      if (wrongOrd) add(wrongOrd.st, ordWhy, 1);
      const wrongBoth = play(P8, s, !startSmall, -dirS);
      if (wrongBoth) add(wrongBoth.st, ordWhy + '; and the smallest disc also went the wrong way round', 3);
      // only the smallest disc moved
      if (s === 2) {
        const twice = play(P8, 1, true, dirS);
        const tw2 = twice && play(twice.st, 1, true, dirS);
        if (tw2) add(tw2.st, 'only the smallest disc moved (twice): it never moves twice in a row — every second move is made by another disc', 1);
      }
      // two smallest discs swapped
      {
        const sw = cl(answer.st).map((a) => a.map((d) => (d === 0 ? 1 : d === 1 ? 0 : d)));
        const same = pegOf(answer.st, 0) === pegOf(answer.st, 1);
        add(sw, `the ${dn(0)} and the ${dn(1)} have been swapped` + (same ? ' (and a larger disc now lies on a smaller one)' : ''), same ? 5 : 3);
      }
      // solution towards the other peg
      {
        const T2 = 3 - S - T;
        add(stacksOf(solve(n, S, T2).pos[t]), `this position belongs to the solution that builds the tower on the ${PEG[T2]} peg — the panels show it travelling from the ${PEG[S]} peg to the ${PEG[T]} peg`, 4);
      }
      // the forced move made backwards (larger disc onto a smaller one)
      {
        let cur = P8;
        let why = null;
        lastGap.forEach((m) => {
          if (m[0] !== 0 && !why && top(cur, m[2]) >= 0) {
            why = `the ${dn(top(cur, m[2]))} was put on the smaller ${dn(m[0])} — a disc may never lie on a smaller one`;
            cur = doMove(cur, m[2], m[1]).st;
          } else cur = doMove(cur, m[1], m[2]).st;
        });
        if (why) add(cur, why, 6);
      }

      const seen = new Set([ansKey]);
      const uniq = [];
      cands
        .map((c, i) => ({ c, i, r: c.pri * 10 + (c.pri >= 2 && c.pri <= 4 ? rng.next() * 25 : 0) }))
        .sort((a, b) => a.r - b.r || a.i - b.i)
        .forEach(({ c }) => {
          const k = skey(c.st);
          if (seen.has(k)) return;
          seen.add(k);
          uniq.push(c);
        });
      RM.need(uniq.length >= 7);
      const wrong = uniq.slice(0, 7);
      RM.need(wrong.filter((c) => !legal(c.st)).length <= 1);

      /* ---- the answer must not be guessable from the options: it must not be the unique "average" option */
      const opts = [answer.st].concat(wrong.map((c) => c.st));
      const score = (st) => RM.range(n).reduce((sum, d) => sum + opts.filter((o) => pegOf(o, d) === pegOf(st, d)).length, 0);
      const sc = opts.map(score);
      RM.need(sc.slice(1).some((x) => x >= sc[0]));
      for (let d = 0; d < n; d++) RM.need(wrong.some((c) => pegOf(c.st, d) === pegOf(answer.st, d)));

      /* ---- correction text */
      const stackTxt = (st) =>
        st.map((a, p) => `${PEG[p]} peg: ${a.length ? a.map(fn).join(', ') : 'empty'}`).join('; ');
      const g0 = gapMoves(0);
      const altTxt =
        s === 2
          ? startSmall
            ? 'so each step between two panels is: first the smallest disc, then the other legal move.'
            : 'so each step between two panels is: first the other legal move, then the smallest disc.'
          : 'with three moves per step, the steps alternate between "smallest – other – smallest" and "other – smallest – other".';
      const discList = RM.range(n).map((d) => fn(d)).join(' < ');
      return {
        difficulty: s === 3 ? 8 : 7,
        reading: 'sequence',
        hint: 'a famous puzzle, solved as fast as possible — but you do not see every move.',
        panels,
        answer,
        key: (sp) => skey(sp.st),
        options: [{ spec: answer, flaws: [] }].concat(wrong.map((c) => ({ spec: { st: c.st }, flaws: [c.why] }))),
        render(sp) {
          const pic = new RM.Pic();
          const pegTop = BASE - n * H - 8;
          pic.add(`<rect x="5" y="${BASE}" width="90" height="5" rx="1.5" fill="${RM.DARK}"/>`);
          PEGX.forEach((x) => pic.add(`<rect x="${RM.fmt(x - 1.3)}" y="${RM.fmt(pegTop)}" width="2.6" height="${RM.fmt(BASE - pegTop)}" rx="1.1" fill="${RM.GRAY}"/>`));
          sp.st.forEach((stack, p) =>
            stack.forEach((d, i) => {
              const w = W[d];
              const y = BASE - (i + 1) * H;
              pic.add(
                `<rect x="${RM.fmt(PEGX[p] - w / 2)}" y="${RM.fmt(y + 0.4)}" width="${RM.fmt(w)}" height="${RM.fmt(H - 0.8)}" rx="1.6" fill="${pic.paint(fills[d])}" stroke="${RM.INK}" stroke-width="1.5"/>`
              );
            })
          );
          return pic.svg();
        },
        rules: [
          {
            k: 'Tower of Hanoi',
            t: `the panels, read as one sequence (left → right, then top → bottom), are snapshots of a <b>Tower of Hanoi</b>: one disc moves at a time, from peg to peg, and a disc never lies on a smaller one (sizes: ${discList}). The whole tower is being moved from the <b>${PEG[S]} peg to the ${PEG[T]} peg in the fewest possible moves</b> (${last} moves); panel 1 is already ${t0} moves into that solution.`,
          },
          {
            k: 'Hidden moves',
            t: `only every ${s === 2 ? 'second' : 'third'} position is shown: <b>${RM.word(s)} moves</b> are made between two consecutive panels. For example, from panel 1 to panel 2: ${mvList(g0)}.`,
          },
          {
            k: 'The shortest solution',
            t: `in the shortest solution every other move is a move of the <b>smallest disc</b> (${fn(0)}), which ${cycleTxt}. The moves in between are the only legal move that does not touch the smallest disc: on the two other pegs, the smaller top disc goes onto the other peg. ${RM.cap(altTxt)}`,
          },
          {
            k: 'After panel 8',
            t: `the last move before panel 8 was ${mvTxt(prevMove)}. The next ${RM.word(s)} moves are: ${lastGap.map((m, i) => `(${i + 1}) the ${dnr(m[0])} from the ${PEG[m[1]]} peg to the ${PEG[m[2]]} peg`).join('; ')}.`,
          },
          { k: 'Answer', t: `the missing panel shows (bottom → top) <b>${stackTxt(answer.st)}</b>.` },
        ],
      };
    },
  });
})();
