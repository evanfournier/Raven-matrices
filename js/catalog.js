/* The fixed catalogue: 4 sets × 30 families = 120 puzzles.
 * Every set contains one puzzle of each family (using a different variant of
 * the family), ordered from the "easiest" hard ones to the hardest. */
(function () {
  'use strict';
  const RM = window.RM;
  const SETS = ['A', 'B', 'C', 'D'];
  RM.SETS = SETS;
  RM.catalog = [];
  SETS.forEach((set, si) => {
    const rng = RM.rng(RM.hash('catalogue', set));
    const fams = rng
      .shuffle(RM.familyOrder)
      .map((id, i) => ({ id, i }))
      .sort((a, b) => RM.families[a.id].difficulty - RM.families[b.id].difficulty || a.i - b.i);
    fams.forEach((f) => {
      RM.catalog.push({
        num: RM.catalog.length + 1,
        set,
        fam: f.id,
        variant: si,
        seed: RM.hash(f.id, set, 'v1'),
      });
    });
  });

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
