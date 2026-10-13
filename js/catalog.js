/* The fixed catalogue.
 *
 * Every set has its own theme: its own rule families and its own visual
 * language — no family appears in more than one set. Each family contributes
 * its 4 variants to its set. Sets A–D are hard to extreme (★3–★5); sets E–H
 * are the elite sets (★6–★7) built on logic that appears nowhere else. */
(function () {
  'use strict';
  const RM = window.RM;
  RM.SETS = [
    {
      id: 'A',
      name: 'Numbers in disguise',
      blurb: 'Counting and arithmetic hidden in teeth, bars, rings, fractions, edges and collections.',
      fams: ['tri-rule', 'dual-counter', 'cogs', 'bars', 'concentric', 'fraction-pie', 'inventory', 'edge-budget'],
    },
    {
      id: 'B',
      name: 'Overlays & inheritance',
      blurb: 'Superposition logic on grids, lines, regions and colours; attributes inherited from different panels.',
      fams: ['pixel-logic', 'hatching', 'attribute-mix', 'z-order', 'segment-logic', 'region-logic', 'color-algebra'],
    },
    {
      id: 'C',
      name: 'Transformations',
      blurb: 'Rotations, mirrors, reshuffles, slides and cycles — find the hidden operation.',
      fams: ['four-axes', 'carousel', 'dihedral', 'permutation', 'wrap-shift', 'rotor', 'twin-rings', 'matryoshka'],
    },
    {
      id: 'D',
      name: 'Motion & clocks',
      blurb: 'Things that travel, turn and bounce: orbits, needles, clock hands, vectors and billiard balls.',
      fams: ['orbits', 'clock-speed', 'needles', 'vector-sum', 'clock-sum', 'dot-driven', 'billiards'],
    },
    {
      id: 'E',
      name: 'Hidden quantities',
      elite: true,
      blurb: 'Elite. The quantity that obeys the rule is never drawn directly: secret values, other bases, crossings, translated numbers, balances.',
      fams: ['secret-values', 'abacus', 'crossings', 'translations', 'seesaw', 'containers'],
    },
    {
      id: 'F',
      name: 'Panel physics',
      elite: true,
      blurb: 'Elite. Simulate what happens: gravity, folding paper, rolling marbles, lasers, sliding tiles, falling pieces.',
      fams: ['tumble', 'paper-fold', 'tilt-maze', 'laser', 'slide-puzzle', 'line-clear'],
    },
    {
      id: 'G',
      name: 'Codes & conditions',
      elite: true,
      blurb: 'Elite. Rules that depend on other rules: conditional turns, operator keys, string algebra, ciphers, switches.',
      fams: ['conditional-turn', 'operator-key', 'string-ops', 'cipher', 'toggle-grid', 'if-then'],
    },
    {
      id: 'H',
      name: 'Networks & paths',
      elite: true,
      blurb: 'Elite. Graphs, walks, pipes, mazes and switch boards — properties that propagate through connections.',
      fams: ['graph-parity', 'turtle', 'pipes', 'contagion', 'maze-flood', 'flipflop'],
    },
  ];
  const OLD_LETTER = ['A', 'B', 'C', 'D'];

  RM.catalog = [];
  RM.SETS.forEach((set) => {
    const fams = set.fams.filter((f) => RM.families[f]);
    const order = RM.rng(RM.hash('order', set.id)).shuffle(fams);
    const entries = [];
    for (let v = 0; v < 4; v++)
      order.forEach((fam, i) => {
        // the original 30 families keep the seeds they had in the first version
        const seed = set.elite ? RM.hash(fam, set.id, 'v1', v) : RM.hash(fam, OLD_LETTER[v], 'v1');
        entries.push({ fam, variant: v, seed, k: v * 100 + RM.families[fam].difficulty * 10 + i / 10 });
      });
    entries.sort((a, b) => a.k - b.k);
    entries.forEach((e) => RM.catalog.push({ num: RM.catalog.length + 1, set: set.id, fam: e.fam, variant: e.variant, seed: e.seed }));
  });
  RM.setOf = (famId) => RM.SETS.find((s) => s.fams.includes(famId));

  const cache = {};
  RM.puzzle = function (num) {
    if (!cache[num]) {
      const e = RM.catalog[num - 1];
      cache[num] = Object.assign(RM.build(e.fam, e.seed, e.variant), { num, set: e.set });
    }
    return cache[num];
  };
  RM.randomPuzzle = function (famId) {
    const seed = Math.floor(Math.random() * 2147483647);
    const fam = famId || RM.familyOrder[Math.floor(Math.random() * RM.familyOrder.length)];
    return Object.assign(RM.build(fam, seed), { num: null, set: null });
  };
})();
