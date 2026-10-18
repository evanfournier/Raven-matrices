/* Rotating board (grandmaster): a 5×5 board with a black tab on its "north" edge carries a black and a white disc.
 * From one panel to the next (left to right) the black disc first slides towards the tabbed edge (the board's own
 * frame), the white disc slides towards the top of the panel (the page's frame), and then the board makes a
 * quarter-turn, carrying both discs with it. A disc that cannot slide (edge of the board) stops at the edge.
 * Variants: 1 = the board turns anticlockwise, 2 = the black disc slides two cells, 3 = the white disc slides towards
 * the right of the panel. The generator enumerates ~500 alternative readings per disc (frame, direction, distance,
 * slide before/after the turn, carried or not, edge behaviour, plus free displacement vectors, constant columns and
 * Latin squares) and keeps only draws where every reading consistent with the visible panels gives the same answer.
 * Distractors form a balanced cube of three misunderstandings: black disc in the page's frame, white disc in the
 * board's frame, discs not carried by the turn. */
(function () {
  'use strict';
  const RM = window.RM;

  const N = 5;
  const CELL = 14;
  const X0 = 15;
  const DV = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  const SIDE = ['top', 'right', 'bottom', 'left'];
  const DIRW = ['up', 'to the right', 'down', 'to the left'];
  const inB = (p) => p[0] >= 0 && p[0] < N && p[1] >= 0 && p[1] < N;
  const eq = (a, b) => a[0] === b[0] && a[1] === b[1];
  const pk = (p) => p[0] + ',' + p[1];
  const add = (p, v) => [p[0] + v[0], p[1] + v[1]];
  const sub = (p, q) => [p[0] - q[0], p[1] - q[1]];
  /* clockwise quarter-turns of a cell about the board centre (x = column from the left, y = row from the top) */
  function rotK(p, k) {
    k = RM.mod(k, 4);
    let q = p;
    for (let i = 0; i < k; i++) q = [N - 1 - q[1], q[0]];
    return q;
  }
  /* slide s cells in screen direction d; edge: 'clamp' (stop at the edge), 'stay' (cancel the move), 'wrap' */
  function slide(p, d, s, edge) {
    let q = p;
    for (let i = 0; i < s; i++) {
      let n = add(q, DV[d]);
      if (!inB(n)) {
        if (edge === 'wrap') n = [RM.mod(n[0], N), RM.mod(n[1], N)];
        else if (edge === 'stay') return p;
        else return q;
      }
      q = n;
    }
    return q;
  }
  const cellTxt = (p) => 'row ' + (p[1] + 1) + ', column ' + (p[0] + 1);

  /* ---------------------------------------------------------------- alternative readings of one disc's motion */
  const HYPS = [];
  for (let k = 0; k < 4; k++) {
    HYPS.push({ k, frame: 'screen', d: 0, s: 0, timing: 'before', edge: 'clamp' });
    for (const frame of ['board', 'screen'])
      for (let d = 0; d < 4; d++)
        for (const timing of ['before', 'after'])
          for (let s = 1; s <= 3; s++)
            for (const edge of s === 1 ? ['clamp', 'wrap'] : ['clamp', 'stay', 'wrap']) HYPS.push({ k, frame, d, s, timing, edge });
  }
  function stepH(h, p, R, t) {
    const dir = h.frame === 'board' ? RM.mod(h.d + R + (h.timing === 'after' ? t : 0), 4) : h.d;
    if (h.timing === 'before') return rotK(slide(p, dir, h.s, h.edge), h.k);
    return slide(rotK(p, h.k), dir, h.s, h.edge);
  }
  const VIS = [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
    [2, 0],
  ];
  /* every answer cell that some reading consistent with the visible panels predicts for this disc */
  function predictions(P, Rg, t) {
    const out = new Set();
    for (const h of HYPS) {
      if (VIS.every(([r, c]) => eq(stepH(h, P[r][c], Rg[r][c], t), P[r][c + 1]))) out.add(pk(stepH(h, P[2][1], Rg[2][1], t)));
    }
    const R22 = Rg[2][1] + t;
    const vecRule = (Q, toScreen) => {
      // free displacement vector per column step, measured in the frame given by Q
      const v = (r, c) => sub(Q(r, c + 1), Q(r, c));
      const a = v(0, 0);
      const b = v(0, 1);
      if (!eq(v(1, 0), a) || !eq(v(2, 0), a) || !eq(v(1, 1), b)) return;
      const q = add(Q(2, 1), b);
      if (inB(q)) out.add(pk(toScreen(q)));
    };
    // free displacement vector in a frame that turns k quarter-turns per step
    for (let k = 0; k < 4; k++)
      vecRule(
        (r, c) => rotK(P[r][c], -k * c),
        (q) => rotK(q, 2 * k)
      );
    for (let k = 0; k < 4; k++) {
      // free slide vector per column step, then a k-quarter-turn of the disc
      const v = (r, c) => sub(rotK(P[r][c + 1], -k), P[r][c]);
      const a = v(0, 0);
      const b = v(0, 1);
      if (eq(v(1, 0), a) && eq(v(2, 0), a) && eq(v(1, 1), b)) {
        const q = add(P[2][1], b);
        if (inB(q)) out.add(pk(rotK(q, k)));
      }
    }
    const B = (r, c) => rotK(P[r][c], -Rg[r][c]);
    vecRule(B, (q) => rotK(q, R22));
    // constant last column, Latin squares (in the panel and in the board's own frame)
    for (const [F, back] of [
      [(r, c) => P[r][c], (q) => q],
      [B, (q) => rotK(q, R22)],
    ]) {
      if (eq(F(0, 2), F(1, 2))) out.add(pk(back(F(0, 2))));
      const s0 = [0, 1, 2].map((c) => pk(F(0, c)));
      const s1 = new Set([0, 1, 2].map((c) => pk(F(1, c))));
      if (new Set(s0).size === 3 && s0.every((x) => s1.has(x))) {
        const a = pk(F(2, 0));
        const b = pk(F(2, 1));
        const rest = s0.filter((x) => x !== a && x !== b);
        if (a !== b && rest.length === 1) {
          const q = rest[0].split(',').map(Number);
          out.add(pk(back(q)));
        }
      }
    }
    return out;
  }

  /* ---------------------------------------------------------------- drawing */
  const TAB = [
    [38, X0],
    [62, X0],
    [56.5, 7.5],
    [43.5, 7.5],
  ];
  function render(spec) {
    const pic = new RM.Pic();
    pic.add(`<rect x="${X0}" y="${X0}" width="${N * CELL}" height="${N * CELL}" fill="${RM.WHITE}"/>`);
    for (let i = 1; i < N; i++) {
      const v = X0 + i * CELL;
      RM.line(pic, v, X0, v, X0 + N * CELL, { sw: 1.1, color: RM.GRAY, cap: 'butt' });
      RM.line(pic, X0, v, X0 + N * CELL, v, { sw: 1.1, color: RM.GRAY, cap: 'butt' });
    }
    pic.add(`<rect x="${X0}" y="${X0}" width="${N * CELL}" height="${N * CELL}" fill="none" stroke="${RM.INK}" stroke-width="2.4"/>`);
    let pts = TAB;
    for (let i = 0; i < spec.R; i++) pts = pts.map(([x, y]) => [100 - y, x]);
    RM.polygon(pic, pts, { fill: 'black', sw: 1.2 });
    const ctr = (p) => [X0 + (p[0] + 0.5) * CELL, X0 + (p[1] + 0.5) * CELL];
    const cb = ctr(spec.b);
    const cw = ctr(spec.w);
    RM.circle(pic, cb[0], cb[1], 4.9, { fill: 'black', sw: 1.4 });
    RM.circle(pic, cw[0], cw[1], 4.6, { fill: 'white', sw: 2.1 });
    return pic.svg();
  }
  const key = (s) => s.R + '|' + pk(s.b) + '|' + pk(s.w);

  /* ---------------------------------------------------------------- generator */
  function generate(rng, variant) {
    const t = variant === 1 ? 3 : 1; // quarter-turns clockwise per step
    const bS = variant === 2 ? 2 : 1; // black slide length
    const wD = variant === 3 ? 1 : 0; // white slide direction in the panel
    const turnTxt = t === 1 ? 'clockwise' : 'anticlockwise';
    const R0 = rng.sample([0, 1, 2, 3], 3);
    RM.need(RM.mod(R0[2] + t, 4) !== wD); // in the answer step the two compasses disagree

    const cells = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) cells.push([x, y]);
    const events = [];
    const P = { b: [], w: [] };
    const Rg = [];
    for (let r = 0; r < 3; r++) {
      let row = null;
      for (let tries = 0; tries < 40 && !row; tries++) {
        const [b0, w0] = rng.sample(cells, 2);
        const rb = [b0];
        const rw = [w0];
        const ev = [];
        let ok = true;
        for (let c = 0; c < 2 && ok; c++) {
          const R = R0[r] + c;
          const bd = RM.mod(R, 4);
          const b1 = slide(rb[c], bd, bS, 'clamp');
          const w1 = slide(rw[c], wD, 1, 'clamp');
          if (r < 2 || c === 0) {
            const full = add(rb[c], [DV[bd][0] * bS, DV[bd][1] * bS]);
            if (!eq(b1, full)) ev.push({ r, c, tok: 'b', moved: !eq(b1, rb[c]) });
            if (eq(w1, rw[c])) ev.push({ r, c, tok: 'w' });
          }
          rb.push(rotK(b1, t));
          rw.push(rotK(w1, t));
          ok = !eq(rb[c + 1], rw[c + 1]) && !eq(b1, w1);
        }
        if (ok) row = { rb, rw, ev };
      }
      RM.need(row);
      P.b.push(row.rb);
      P.w.push(row.rw);
      Rg.push([0, 1, 2].map((c) => RM.mod(R0[r] + c, 4)));
      events.push(...row.ev);
    }
    if (variant === 0) RM.need(events.length > 0);
    // uniqueness: every reading consistent with the 8 visible panels predicts the same cell, for each disc
    for (const tok of ['b', 'w']) {
      const pr = predictions(P[tok], Rg, t);
      RM.need(pr.size === 1 && pr.has(pk(P[tok][2][2])));
    }

    const spec = (r, c) => ({ R: Rg[r][c], b: P.b[r][c], w: P.w[r][c] });
    const panels = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (r < 2 || c < 2) panels.push(spec(r, c));
    const answer = spec(2, 2);
    RM.need(!panels.some((s) => key(s) === key(answer)));

    /* distractor cube: (black in the page's frame) × (white in the board's frame) × (discs not carried) */
    const R21 = Rg[2][1];
    const b21 = P.b[2][1];
    const w21 = P.w[2][1];
    const options = [];
    const seen = new Set();
    for (let m = 0; m < 8; m++) {
      const bScreen = !!(m & 1);
      const wBoard = !!(m & 2);
      const loose = !!(m & 4);
      const bm = slide(b21, bScreen ? wD : R21, bS, 'clamp');
      const wm = slide(w21, wBoard ? R21 : wD, 1, 'clamp');
      const o = { R: answer.R, b: loose ? bm : rotK(bm, t), w: loose ? wm : rotK(wm, t) };
      RM.need(!eq(o.b, o.w) && !seen.has(key(o)));
      seen.add(key(o));
      const flaws = [];
      if (bScreen)
        flaws.push(
          `The black disc slid ${DIRW[wD]} (the page's direction, like the white disc) instead of towards the tabbed edge, which is on the ${SIDE[R21]} in that panel.`
        );
      if (wBoard)
        flaws.push(
          `The white disc slid towards the tabbed edge (${DIRW[R21]}) like the black one, instead of towards the ${SIDE[wD]} of the panel.`
        );
      if (loose) flaws.push(`The discs were not carried by the quarter-turn: they stayed on their panel cells while the board turned under them.`);
      if (flaws.length) {
        const wrong = [];
        if (!eq(o.b, answer.b)) wrong.push('the black disc belongs in ' + cellTxt(answer.b));
        if (!eq(o.w, answer.w)) wrong.push('the white disc in ' + cellTxt(answer.w));
        flaws.push(RM.cap(wrong.join(' and ')) + '.');
      }
      options.push({ spec: o, flaws });
    }

    /* ---------------------------------------------------------------- correction */
    const wSideTxt = SIDE[wD];
    const blackRule =
      bS === 1
        ? 'Before the turn, the black disc slides <b>one cell towards the tabbed edge</b>, whichever way that edge faces in the panel. A disc already touching that edge cannot slide: it only turns with the board.'
        : 'Before the turn, the black disc slides <b>two cells towards the tabbed edge</b>, whichever way that edge faces in the panel. It stops at the edge if there is less room (one cell, or none).';
    const whiteRule = `Before the turn, the white disc slides <b>one cell towards the ${wSideTxt} of the panel</b>, whatever the board's position. A disc already in the ${
      wD === 0 ? 'top row' : 'right-hand column'
    } cannot slide.`;
    const turnFormula =
      t === 1 ? 'a disc in row r, column c ends in row c, column 6 − r' : 'a disc in row r, column c ends in row 6 − c, column r';
    const stepName = (c) => (c === 0 ? 'left → middle' : 'middle → right');
    const evTxt = events.map((e) => {
      const where = `row ${e.r + 1}, ${stepName(e.c)}`;
      if (e.tok === 'w') return `${where}: the white disc is already against the ${wSideTxt} edge, so it does not slide — it only turns`;
      return e.moved
        ? `${where}: the black disc has room for only one cell before the tabbed edge, so it stops there`
        : `${where}: the black disc already touches the tabbed edge, so it does not slide — it only turns`;
    });
    const bm = slide(b21, R21, bS, 'clamp');
    const wm = slide(w21, wD, 1, 'clamp');
    const bTxt = eq(bm, b21)
      ? 'already touches the tabbed edge, so it stays'
      : `slides ${DIRW[R21]} (towards the tab) to ${cellTxt(bm)}`;
    const wTxt = eq(wm, w21) ? `is already against the ${wSideTxt} edge, so it stays` : `slides ${DIRW[wD]} to ${cellTxt(wm)}`;
    const rules = [
      {
        k: 'The board turns',
        t: `Every panel shows the same 5×5 board; the black tab marks the board's own “north” edge. From one panel to the next the board makes a <b>quarter-turn ${turnTxt}</b> about its centre and carries both discs with it (rows and columns below are counted from the top-left corner of the panel: in a ${turnTxt} quarter-turn ${turnFormula}).`,
      },
      { k: "Black disc: the board's compass", t: blackRule },
      { k: "White disc: the page's compass", t: whiteRule + ' Both slides happen <b>before</b> the board turns.' },
    ];
    if (evTxt.length) rules.push({ k: 'Blocked slides', t: RM.cap(evTxt.join('; ')) + '.' });
    rules.push({
      k: 'Row 3',
      t: `Middle panel: tab on the ${SIDE[R21]}, black disc in ${cellTxt(b21)}, white disc in ${cellTxt(w21)}. The black disc ${bTxt}; the white disc ${wTxt}. The quarter-turn ${turnTxt} then puts the tab on the <b>${SIDE[answer.R]}</b>, the black disc in <b>${cellTxt(
        answer.b
      )}</b> and the white disc in <b>${cellTxt(answer.w)}</b>.`,
    });

    return {
      panels,
      answer,
      options,
      render,
      key,
      rules,
      hint: "One disc reads the board's compass, the other the page's — and the board takes both along when it turns.",
    };
  }

  RM.register({
    id: 'relative-frame',
    name: 'Rotating board',
    difficulty: 7,
    generate,
  });
})();
