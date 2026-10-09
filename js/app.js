/* Raven Matrix Trainer — user interface (catalogue, practice, timed test, endless, guide). */
(function () {
  'use strict';
  const RM = window.RM;
  const app = document.getElementById('app');
  const $ = (sel, el) => (el || document).querySelector(sel);
  const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));
  const stars = (d) => '★'.repeat(d) + '☆'.repeat(5 - d);
  const mmss = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  const BLURB = {
    'tri-rule': 'Shape, fill and number of figures each follow their own rule.',
    'four-axes': 'Four attributes, four different directions: rows, columns, diagonals and vertical arithmetic.',
    'dual-counter': 'Two kinds of tokens are counted separately, each with its own arithmetic. Positions are noise.',
    cogs: 'Count the teeth of cogwheels and do arithmetic with them; hub and fill are distributed.',
    bars: 'Each bar of the chart follows a different rule (sum, difference, progression, max, min).',
    'attribute-mix': 'The 3rd panel inherits each attribute from a different source.',
    'edge-budget': 'The total number of straight edges per panel is constant along a row.',
    inventory: 'Every row contains the same total collection of figures.',
    concentric: 'Ring-count arithmetic, a rotating gap, distributed line style and centre symbol.',
    hatching: 'The hatching angle rotates; density and outline are distributed.',
    'pixel-logic': 'Grid overlays: XOR, OR, AND, subtraction — sometimes after a mirror or rotation.',
    'segment-logic': 'Line overlays on a template (star, pentagram, lattice …).',
    'region-logic': 'Shaded regions of Venn diagrams, tiles and targets combine logically.',
    'color-algebra': 'Spot-by-spot colour arithmetic (e.g. addition modulo 3).',
    'wrap-shift': 'A pattern slides across a wrap-around grid, sometimes swapping colours.',
    permutation: 'A fixed secret reshuffle of positions is applied at every step.',
    dihedral: 'Figures are mirrored and rotated: find the two transformations.',
    orbits: 'Three tokens travel around a track at different speeds and directions.',
    'clock-sum': 'Clock-hand angles add or subtract like numbers.',
    'clock-speed': 'Two independent rotations at different speeds.',
    carousel: 'Shapes rotate one way; the black fill moves along its own path.',
    rotor: 'Sector patterns rotate (and recolour); the speed may depend on the row.',
    'twin-rings': 'Two rings of tokens counter-rotate.',
    matryoshka: 'Nested shapes cycle one way while their colours cycle the other way.',
    needles: 'A decorated needle rotates; each end carries its own family of decorations.',
    'dot-driven': 'One attribute drives another: the dots tell how far the arrow turns next.',
    'fraction-pie': 'Shaded fractions add up while the starting edge rotates.',
    'vector-sum': 'Arrows are moves on a grid: add them like vectors.',
    'z-order': 'Track the stacking order of overlapping figures.',
    billiards: 'A sequence: balls move with constant velocity and bounce off the walls.',
  };

  /* ------------------------------------------------------------ progress storage */
  const STORE = 'rmt-progress-v1';
  let progress = {};
  try {
    progress = JSON.parse(localStorage.getItem(STORE)) || {};
  } catch (e) {
    progress = {};
  }
  function record(num, ok, secs) {
    if (!num) return;
    const p = progress[num] || { tries: 0 };
    p.tries += 1;
    if (p.ok === undefined) p.first = ok;
    p.ok = ok || !!p.ok;
    p.last = ok;
    p.t = Math.round(secs);
    progress[num] = p;
    try {
      localStorage.setItem(STORE, JSON.stringify(progress));
    } catch (e) {
      /* storage unavailable: progress is kept for this session only */
    }
    updateStats();
  }
  function status(num) {
    const p = progress[num];
    if (!p) return 'new';
    return p.ok ? 'ok' : 'ko';
  }
  function updateStats() {
    const tried = Object.keys(progress).filter((k) => RM.catalog[k - 1]);
    const solved = tried.filter((k) => progress[k].ok).length;
    const first = tried.filter((k) => progress[k].first).length;
    $('#stats').textContent = tried.length
      ? `Solved ${solved}/${RM.catalog.length} · first-try accuracy ${Math.round((100 * first) / tried.length)}%`
      : `${RM.catalog.length} puzzles · ${RM.familyOrder.length} rule families`;
  }

  /* ------------------------------------------------------------ timers */
  let timers = [];
  function every(ms, fn) {
    const id = setInterval(fn, ms);
    timers.push(id);
    return id;
  }
  function clearTimers() {
    timers.forEach(clearInterval);
    timers = [];
  }
  let keyHandler = null;
  document.addEventListener('keydown', (e) => {
    if (keyHandler && !e.ctrlKey && !e.metaKey && !e.altKey && e.target.tagName !== 'SELECT') keyHandler(e);
  });

  /* ------------------------------------------------------------ puzzle view */
  function solutionHTML(P, choice) {
    let verdict;
    if (choice === null || choice === undefined) verdict = `<div class="verdict">Answer: option ${P.answerIndex + 1}</div>`;
    else if (choice === P.answerIndex) verdict = `<div class="verdict ok">✔ Correct — option ${P.answerIndex + 1}</div>`;
    else verdict = `<div class="verdict ko">✘ You chose ${choice + 1} — the answer is option ${P.answerIndex + 1}</div>`;
    const rules = `<ol class="rules">${P.rules.map((r) => `<li><b>${r.k}</b> — ${r.t}</li>`).join('')}</ol>`;
    const why = P.options
      .map((s, i) => (i === P.answerIndex ? '' : `<li><span class="mini">${s}</span><span><b>${i + 1}.</b> ${cap(P.flaws[i].join('; '))}.</span></li>`))
      .join('');
    return `<div class="card">${verdict}${rules}<div class="why"><h4>Why the other options are wrong</h4><ul>${why}</ul></div></div>`;
  }

  /* cfg: title, mode ('practice' | 'endless' | 'test' | 'review'), choice (for review),
   *      onResult(ok, secs, choice), extraActions (html), onAction(name), countdown() */
  function mountPuzzle(P, cfg) {
    clearTimers();
    const mode = cfg.mode;
    const reading = P.reading === 'sequence' ? '<div class="note">This one is a <b>sequence</b>: read the panels in order, left → right, then top → bottom.</div>' : '';
    const buttons =
      mode === 'test'
        ? `<button class="primary" data-a="next">${cfg.last ? 'Finish' : 'Next'} ›</button><span class="sp"></span><button data-a="finish">End test</button>`
        : mode === 'review'
          ? cfg.extraActions || ''
          : `<button data-a="hint">Hint</button><button class="primary" data-a="check" disabled>Check</button><button data-a="reveal">Show solution</button><span class="sp"></span>${cfg.extraActions || ''}`;
    app.innerHTML = `
      <section class="puzzle">
        <div class="pz-head">
          <div class="pz-title">${cfg.title}</div>
          <div class="pz-meta"><span class="stars" title="difficulty">${stars(P.difficulty)}</span> · ${P.name}</div>
          <div class="timer" id="timer"></div>
        </div>
        ${reading}
        <div class="pz-body">
          <div class="matrix">${P.panels.map((s) => `<div class="cell">${s}</div>`).join('')}<div class="cell q" id="qcell">?</div></div>
          <div class="side">
            <div class="label">Which option completes the matrix?</div>
            <div class="options">${P.options.map((s, i) => `<button class="opt" data-i="${i}" title="Option ${i + 1}"><span class="n">${i + 1}</span>${s}</button>`).join('')}</div>
            <div class="actions">${buttons}</div>
            <div id="hint"></div>
          </div>
        </div>
        <div class="solution" id="solution"></div>
      </section>`;
    window.scrollTo(0, 0);

    let selected = mode === 'test' ? (cfg.choice !== undefined ? cfg.choice : null) : null;
    let done = false;
    const t0 = Date.now();
    const timerEl = $('#timer');
    const tick = () => {
      if (cfg.countdown) {
        const left = cfg.countdown();
        timerEl.textContent = '⏱ ' + mmss(Math.max(0, left));
        timerEl.classList.toggle('low', left < 60);
        if (left <= 0 && cfg.onTimeout) cfg.onTimeout(selected);
      } else if (!done && mode !== 'review') timerEl.textContent = mmss((Date.now() - t0) / 1000);
    };
    tick();
    if (mode !== 'review') every(250, tick);

    const opts = $$('.opt', app);
    const paint = () => opts.forEach((b, i) => b.classList.toggle('sel', i === selected));
    const checkBtn = $('[data-a="check"]', app);

    function finishPuzzle(choice) {
      done = true;
      const secs = (Date.now() - t0) / 1000;
      opts.forEach((b, i) => {
        b.classList.remove('sel');
        if (i === P.answerIndex) b.classList.add('good');
        else if (i === choice) b.classList.add('bad');
        else b.classList.add('dim');
      });
      const q = $('#qcell');
      q.innerHTML = P.options[P.answerIndex];
      q.classList.add('filled');
      $('#solution').innerHTML = solutionHTML(P, choice);
      if (checkBtn) checkBtn.disabled = true;
      $$('[data-a="hint"],[data-a="reveal"]', app).forEach((b) => (b.disabled = true));
      if (cfg.onResult && choice !== null) cfg.onResult(choice === P.answerIndex, secs, choice);
    }

    if (mode === 'review') {
      finishPuzzle(cfg.choice === undefined ? null : cfg.choice);
    } else paint();

    opts.forEach((b) =>
      b.addEventListener('click', () => {
        if (done) return;
        selected = +b.dataset.i;
        paint();
        if (checkBtn) checkBtn.disabled = false;
        if (cfg.onSelect) cfg.onSelect(selected);
      })
    );
    opts.forEach((b) =>
      b.addEventListener('dblclick', () => {
        if (done) return;
        selected = +b.dataset.i;
        if (mode === 'test') cfg.onAction('next', selected);
        else finishPuzzle(selected);
      })
    );
    $$('.actions [data-a]', app).forEach((b) =>
      b.addEventListener('click', () => {
        const a = b.dataset.a;
        if (a === 'check' && selected !== null && !done) finishPuzzle(selected);
        else if (a === 'reveal' && !done) finishPuzzle(null);
        else if (a === 'hint') {
          const h = cap(P.hint) || `Look separately at: <b>${P.rules.filter((r) => !/^(Answer|Tip|Method|Table|Positions|Rows)$/.test(r.k)).map((r) => r.k).join(' · ')}</b>.`;
          $('#hint').innerHTML = `<div class="hint">💡 ${h}</div>`;
        } else if (cfg.onAction) cfg.onAction(a, selected);
      })
    );
    keyHandler = (e) => {
      if (/^[1-8]$/.test(e.key) && !done) {
        selected = +e.key - 1;
        paint();
        if (checkBtn) checkBtn.disabled = false;
        if (cfg.onSelect) cfg.onSelect(selected);
      } else if (e.key === 'Enter') {
        if (mode === 'test') cfg.onAction('next', selected);
        else if (!done && selected !== null) finishPuzzle(selected);
        else if (done && cfg.onAction) cfg.onAction('next', selected);
      } else if (e.key === 'h' && mode !== 'test' && !done) $('[data-a="hint"]', app).click();
      else if (e.key === 'ArrowRight' && cfg.onAction && mode !== 'test') cfg.onAction('next', selected);
      else if (e.key === 'ArrowLeft' && cfg.onAction && mode !== 'test') cfg.onAction('prev', selected);
    };
  }

  /* ------------------------------------------------------------ catalogue */
  const filt = { show: 'all', diff: 0 };
  function viewCatalogue() {
    clearTimers();
    keyHandler = null;
    const all = RM.catalog.map((e) => RM.puzzle(e.num));
    const solved = all.filter((P) => status(P.num) === 'ok').length;
    const chip = (group, val, label) => `<button class="chip ${filt[group] === val ? 'on' : ''}" data-g="${group}" data-v="${val}">${label}</button>`;
    const tiles = (set) =>
      all
        .filter((P) => P.set === set)
        .filter((P) => (filt.diff ? P.difficulty === filt.diff : true))
        .filter((P) => filt.show === 'all' || status(P.num) === filt.show)
        .map((P) => {
          const st = status(P.num);
          const badge = st === 'ok' ? '✔' : st === 'ko' ? '✘' : '';
          return `<a class="tile s-${st}" href="#/p/${P.num}" title="${BLURB[P.famId] || ''}"><span class="num">${P.num}</span><span class="st">${stars(P.difficulty)}</span><span class="fn">${P.name}</span><span class="badge">${badge}</span></a>`;
        })
        .join('');
    app.innerHTML = `
      <h1>Hard Raven matrices — 120 puzzles</h1>
      <p class="muted">Each puzzle is a 3 × 3 matrix with the last panel missing and 8 options, exactly one of which is correct. Every puzzle comes with a full explanation and the reason each wrong option fails.
      The catalogue has 4 sets; each set contains one puzzle of each of the 30 rule families, sorted from hard (★★★) to extreme (★★★★★).</p>
      <div class="progress"><span style="width:${(100 * solved) / all.length}%"></span></div>
      <div class="muted" style="font-size:13px">${solved} / ${all.length} solved</div>
      <div class="filters">
        <span class="lbl">Show</span>${chip('show', 'all', 'All')}${chip('show', 'new', 'Not tried')}${chip('show', 'ko', 'Failed')}${chip('show', 'ok', 'Solved')}
        <span class="lbl">Difficulty</span>${chip('diff', 0, 'All')}${chip('diff', 3, '★★★')}${chip('diff', 4, '★★★★')}${chip('diff', 5, '★★★★★')}
        <span class="sp" style="flex:1"></span><button class="chip" id="reset">Reset progress</button>
      </div>
      ${RM.SETS.map((s) => {
        const t = tiles(s);
        return t ? `<h2>Set ${s}</h2><div class="tiles">${t}</div>` : '';
      }).join('')}`;
    $$('.filters .chip[data-g]').forEach((b) =>
      b.addEventListener('click', () => {
        filt[b.dataset.g] = b.dataset.g === 'diff' ? +b.dataset.v : b.dataset.v;
        viewCatalogue();
      })
    );
    $('#reset').addEventListener('click', () => {
      if (!confirm('Erase all recorded progress?')) return;
      progress = {};
      try {
        localStorage.removeItem(STORE);
      } catch (e) {
        /* ignore */
      }
      updateStats();
      viewCatalogue();
    });
  }

  function viewPractice(num) {
    num = Math.max(1, Math.min(RM.catalog.length, num | 0));
    const P = RM.puzzle(num);
    const go = (n) => (location.hash = '#/p/' + n);
    mountPuzzle(P, {
      title: `Puzzle ${num} <span class="muted" style="font-weight:400;font-size:15px">· set ${P.set}</span>`,
      mode: 'practice',
      extraActions: `<button data-a="prev" ${num === 1 ? 'disabled' : ''}>‹ Prev</button><button data-a="next" ${num === RM.catalog.length ? 'disabled' : ''}>Next ›</button>`,
      onResult: (ok, secs) => record(num, ok, secs),
      onAction: (a) => {
        if (a === 'next' && num < RM.catalog.length) go(num + 1);
        if (a === 'prev' && num > 1) go(num - 1);
      },
    });
  }

  /* ------------------------------------------------------------ endless */
  let endless = { fam: '', n: 0, ok: 0 };
  function viewEndless() {
    const P = RM.randomPuzzle(endless.fam || undefined);
    const options = ['<option value="">All families (random)</option>']
      .concat(RM.familyOrder.map((f) => `<option value="${f}" ${f === endless.fam ? 'selected' : ''}>${RM.families[f].name}</option>`))
      .join('');
    mountPuzzle(P, {
      title: 'Endless',
      mode: 'endless',
      extraActions: `<select id="famsel" title="Rule family">${options}</select><button data-a="next">New puzzle ›</button>`,
      onResult: (ok) => {
        endless.n++;
        if (ok) endless.ok++;
        $('.pz-meta').insertAdjacentHTML('beforeend', ` · session ${endless.ok}/${endless.n}`);
      },
      onAction: (a) => {
        if (a === 'next') viewEndless();
      },
    });
    $('#famsel').addEventListener('change', (e) => {
      endless.fam = e.target.value;
      viewEndless();
    });
  }

  /* ------------------------------------------------------------ timed test */
  let test = null;
  const testCfg = { n: 20, per: 60, src: 'catalogue' };
  function viewTestSetup() {
    clearTimers();
    keyHandler = null;
    const sel = (key, vals) => vals.map(([v, l]) => `<button class="chip ${testCfg[key] === v ? 'on' : ''}" data-k="${key}" data-v="${v}">${l}</button>`).join('');
    app.innerHTML = `
      <h1>Timed test</h1>
      <p class="muted">Simulates exam conditions: a fixed time budget, no feedback until the end, then a full correction. You can skip questions and come back with ‹ Prev.</p>
      <div class="card">
        <div class="form-row"><span>Questions</span>${sel('n', [[10, '10'], [20, '20'], [30, '30'], [40, '40']])}</div>
        <div class="form-row"><span>Time per question</span>${sel('per', [[45, '45 s'], [60, '60 s'], [90, '90 s'], [120, '2 min']])}</div>
        <div class="form-row"><span>Puzzles</span>${sel('src', [['catalogue', 'From the catalogue'], ['hard', 'Catalogue ★★★★★ only'], ['fresh', 'Freshly generated']])}</div>
        <div class="form-row"><span>Total time</span><b>${mmss(testCfg.n * testCfg.per)}</b></div>
        <div class="actions"><button class="primary" id="start">Start test</button></div>
      </div>`;
    $$('.chip[data-k]').forEach((b) =>
      b.addEventListener('click', () => {
        const k = b.dataset.k;
        testCfg[k] = k === 'src' ? b.dataset.v : +b.dataset.v;
        viewTestSetup();
      })
    );
    $('#start').addEventListener('click', startTest);
  }
  function startTest() {
    let puzzles;
    if (testCfg.src === 'fresh') {
      const fams = [];
      while (fams.length < testCfg.n) fams.push(...RM.familyOrder.slice().sort(() => Math.random() - 0.5));
      puzzles = fams.slice(0, testCfg.n).map((f) => RM.randomPuzzle(f));
    } else {
      let pool = RM.catalog.map((e) => e.num);
      if (testCfg.src === 'hard') pool = pool.filter((n) => RM.puzzle(n).difficulty === 5);
      pool.sort(() => Math.random() - 0.5);
      puzzles = pool.slice(0, testCfg.n).map((n) => RM.puzzle(n));
    }
    test = { puzzles, answers: puzzles.map(() => null), times: puzzles.map(() => 0), i: 0, end: Date.now() + puzzles.length * testCfg.per * 1000, finished: false };
    showTestQuestion();
  }
  function showTestQuestion() {
    const P = test.puzzles[test.i];
    const shownAt = Date.now();
    const leave = (sel) => {
      test.answers[test.i] = sel;
      test.times[test.i] += (Date.now() - shownAt) / 1000;
    };
    mountPuzzle(P, {
      title: `Question ${test.i + 1} / ${test.puzzles.length}`,
      mode: 'test',
      last: test.i === test.puzzles.length - 1,
      choice: test.answers[test.i],
      countdown: () => (test.end - Date.now()) / 1000,
      onSelect: (sel) => (test.answers[test.i] = sel),
      onTimeout: (sel) => {
        if (test.finished) return;
        leave(sel);
        finishTest();
      },
      onAction: (a, sel) => {
        if (a === 'next') {
          leave(sel);
          if (test.i < test.puzzles.length - 1) {
            test.i++;
            showTestQuestion();
          } else finishTest();
        } else if (a === 'finish') {
          leave(sel);
          if (confirm('End the test now?')) finishTest();
        }
      },
    });
    if (test.i > 0) {
      $('.actions').insertAdjacentHTML('afterbegin', '<button data-a2="prev">‹ Prev</button>');
      $('[data-a2="prev"]').addEventListener('click', () => {
        const sel = test.answers[test.i];
        leave(sel);
        test.i--;
        showTestQuestion();
      });
    }
  }
  function finishTest() {
    if (!test.finished) {
      test.finished = true;
      test.puzzles.forEach((P, i) => {
        if (P.num && test.answers[i] !== null) record(P.num, test.answers[i] === P.answerIndex, test.times[i]);
      });
      test.used = Math.min(test.puzzles.length * testCfg.per, test.puzzles.length * testCfg.per - Math.max(0, (test.end - Date.now()) / 1000));
    }
    showResults();
  }
  function showResults() {
    clearTimers();
    keyHandler = null;
    const n = test.puzzles.length;
    const score = test.puzzles.filter((P, i) => test.answers[i] === P.answerIndex).length;
    const used = test.used;
    app.innerHTML = `
      <h1>Test results</h1>
      <div class="card">
        <div class="big-score">${score} / ${n} <span class="muted" style="font-size:20px">(${Math.round((100 * score) / n)}%)</span></div>
        <div class="muted">Time used: ${mmss(used)} of ${mmss(n * testCfg.per)} · unanswered: ${test.answers.filter((a) => a === null).length}</div>
        <div class="actions"><button class="primary" id="again">New test</button></div>
      </div>
      <table class="results">
        <tr><th>#</th><th>Puzzle</th><th>Family</th><th>Difficulty</th><th>Your answer</th><th>Correct</th><th>Time</th><th></th></tr>
        ${test.puzzles
          .map((P, i) => {
            const a = test.answers[i];
            const ok = a === P.answerIndex;
            return `<tr><td>${i + 1}</td><td>${P.num ? 'Catalogue #' + P.num : 'generated'}</td><td>${P.name}</td><td class="stars">${stars(P.difficulty)}</td>
              <td style="color:${ok ? 'var(--good)' : 'var(--bad)'}">${a === null ? '—' : a + 1} ${ok ? '✔' : '✘'}</td><td>${P.answerIndex + 1}</td><td>${mmss(test.times[i])}</td>
              <td><button class="chip" data-r="${i}">Review</button></td></tr>`;
          })
          .join('')}
      </table>`;
    $('#again').addEventListener('click', viewTestSetup);
    $$('[data-r]').forEach((b) => b.addEventListener('click', () => reviewTest(+b.dataset.r)));
  }
  function reviewTest(i) {
    const P = test.puzzles[i];
    mountPuzzle(P, {
      title: `Review ${i + 1} / ${test.puzzles.length}`,
      mode: 'review',
      choice: test.answers[i],
      extraActions: `<button data-a="back">‹ Back to results</button>${i > 0 ? '<button data-a="prev">‹ Prev</button>' : ''}${i < test.puzzles.length - 1 ? '<button data-a="next">Next ›</button>' : ''}`,
      onAction: (a) => {
        if (a === 'back') showResults();
        if (a === 'next' && i < test.puzzles.length - 1) reviewTest(i + 1);
        if (a === 'prev' && i > 0) reviewTest(i - 1);
      },
    });
    $('#timer').textContent = '';
  }
  /* ------------------------------------------------------------ guide */
  function viewGuide() {
    clearTimers();
    keyHandler = null;
    app.innerHTML = `
      <div class="guide">
        <h1>How to solve Raven matrices</h1>
        <p>A Raven matrix is a 3 × 3 grid of figures that follow hidden rules; the bottom-right figure is missing and you must pick it among 8 options. Unless a puzzle says otherwise, the rules run along the <b>rows</b> (they often also work down the columns).</p>
        <h2>A method that works</h2>
        <ol>
          <li><b>Decompose.</b> List the attributes that vary: shape, number, fill/colour, size, position, orientation, line style, order… Find a rule for each attribute <i>separately</i>.</li>
          <li><b>Check row 1, confirm on row 2, apply to row 3.</b> A rule only counts if it works on both complete rows.</li>
          <li><b>Predict before you look</b> at the options. Then eliminate options attribute by attribute.</li>
          <li><b>Don't trust the "most typical" option.</b> Here every wrong option differs from the answer in 1–3 attributes, and each attribute value appears in exactly half of the options — guessing by similarity gives nothing.</li>
          <li><b>Watch the clock.</b> If you are stuck after ~60 s, mark your best elimination and move on.</li>
        </ol>
        <h2>The main rule types</h2>
        <ul>
          <li><b>Constant</b> — the same value across a row.</li>
          <li><b>Progression</b> — a value grows / shrinks / turns by a fixed step (+1 dot, 45° clockwise, one cell to the right…).</li>
          <li><b>Distribution of three</b> — three values each appear once per row (Latin square). The missing one is the value not yet used in the row.</li>
          <li><b>Arithmetic</b> — 3rd = 1st + 2nd or 1st − 2nd (on counts, lengths, angles, fractions, vectors…).</li>
          <li><b>Overlay logic</b> — superposition (OR), keep the common part (AND), keep what is in exactly one (XOR), subtraction.</li>
          <li><b>Movement</b> — elements travel around a track or a grid at their own speed.</li>
          <li><b>Transformation</b> — mirror, rotation, reshuffle of positions, colour swap.</li>
          <li><b>Linked attributes</b> — one attribute controls another (e.g. the number of dots says how far the arrow turns next).</li>
          <li><b>Conservation</b> — a total (edges, figures) stays the same along a row.</li>
          <li><b>Sequence</b> — the 9 panels are read like a text (marked clearly when it happens).</li>
        </ul>
        <h2>Keyboard</h2>
        <p><kbd>1</kbd>–<kbd>8</kbd> select an option · <kbd>Enter</kbd> check / next · <kbd>h</kbd> hint · <kbd>←</kbd> <kbd>→</kbd> previous / next puzzle · double-click an option to answer directly.</p>
        <h2>The 30 rule families</h2>
        <div class="fam-list">${RM.familyOrder.map((f) => `<div class="card"><b>${RM.families[f].name} <span class="stars">${stars(RM.families[f].difficulty)}</span></b><span class="muted">${BLURB[f] || ''}</span></div>`).join('')}</div>
      </div>`;
  }

  /* ------------------------------------------------------------ router */
  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    const [v, arg] = h.split('/');
    $$('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.v === (v === 'p' ? 'catalogue' : v || 'catalogue')));
    try {
      if (v === 'p') viewPractice(+arg);
      else if (v === 'test') viewTestSetup();
      else if (v === 'endless') viewEndless();
      else if (v === 'guide') viewGuide();
      else viewCatalogue();
    } catch (e) {
      app.innerHTML = `<div class="card"><b>Something went wrong.</b><pre>${String(e && e.stack ? e.stack : e)}</pre></div>`;
      throw e;
    }
  }
  window.addEventListener('hashchange', route);
  updateStats();
  route();
})();
