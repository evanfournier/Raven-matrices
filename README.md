# Raven Matrix Trainer

A training site for hard Raven-style progressive matrices, built to prepare for psychometric
reasoning tests such as the Air France cadet programme's PSY1 assessments.

- **120 catalogue puzzles** in 4 sets (A–D). Each set has one puzzle from each of the
  **30 rule families**, sorted from ★★★ (hard) to ★★★★★ (extreme).
- **8 options per puzzle, exactly one correct**, with a full explanation of every rule and the
  reason each wrong option fails.
- **Timed test mode**: 10–40 questions, 45 s – 2 min each, no feedback until the end,
  then a full review.
- **Endless mode**: new puzzles are generated on the fly, from any family or one you choose.
- Progress (solved / failed) is saved in your browser.

## How to use

Open `index.html` in any modern browser. No install, no server, no internet connection needed.
It also works on GitHub Pages: *Settings → Pages → Deploy from a branch*.

Keyboard: `1`–`8` select · `Enter` check / next · `h` hint · `←` `→` previous / next puzzle.

## The 30 rule families

| Family | What you have to find |
| --- | --- |
| Triple rule | shape, fill and count each follow their own rule |
| Four axes | four attributes ruled along rows, columns, diagonals and vertical addition |
| Two counters | two token types counted separately with different arithmetic |
| Cogwheels | arithmetic on the number of teeth |
| Bar charts | each bar follows a different rule (sum, difference, progression, max, min) |
| Inheritance | the 3rd panel takes each attribute from a different source |
| Edge budget | the total number of straight edges is constant along a row |
| Inventory | every row holds the same total collection of figures |
| Broken rings | ring-count arithmetic, rotating gap, distributed style |
| Hatching | the hatching angle rotates, density and outline are distributed |
| Pixel logic | XOR / OR / AND / subtraction on grids, sometimes after a mirror or rotation |
| Line logic | the same logic on line segments (star, pentagram, lattice…) |
| Region logic | the same logic on Venn diagrams, tiles and targets |
| Colour algebra | spot-by-spot colour arithmetic (e.g. addition modulo 3) |
| Torus slide | patterns slide on a wrap-around grid, sometimes swapping colours |
| Shuffle code | a fixed secret reshuffle of positions applied at every step |
| Mirror & turn | find the two transformations (rotation / mirror) applied along each row |
| Orbits | three tokens travel around a track at different speeds |
| Clock arithmetic | hand angles add or subtract like numbers |
| Compass & moon | two independent rotations at different speeds |
| Carousel | shapes rotate one way, the black fill moves on its own |
| Rotor | sector patterns rotate (and recolour); speed can depend on the row |
| Twin rings | two rings of tokens counter-rotate |
| Matryoshka | nested shapes cycle inwards while colours cycle outwards |
| Decorated needles | a needle rotates; each end carries its own family of decorations |
| Dot-driven arrow | the number of dots tells how far the arrow turns next |
| Fraction pies | shaded fractions add up while the starting edge rotates |
| Vector sum | arrows are moves on a grid and add like vectors |
| Stacking order | track which overlapping figure is on top |
| Billiards | a sequence: balls bounce off the walls |

## How each puzzle is made fair

Puzzles are generated from a fixed seed by `js/families-*.js` and checked before being shown:

1. **No second answer.** For every attribute, the generator tries a long list of rules a solver
   might think of: constant, progression, distribution of three, sum, difference, max/min,
   copying, diagonals, column-wise versions, every boolean overlay with every mirror/rotation,
   every rotation or reshuffle. The intended rule must be found, and every other rule that fits
   rows 1–2 must predict the same answer. Otherwise the puzzle is redrawn.
2. **No answering by elimination.** The 8 options are every combination of three independent
   mistakes, so each attribute value appears in exactly half of the options. Picking the
   "most typical" option does not work.
3. **Visibly distinct options.** `tools/validate.js` renders every option in a headless browser
   and checks that no two options look the same.

## Development

```
NODE_PATH=$(npm root -g) node tools/validate.js --random 40   # build, rasterise and stress-test all puzzles
NODE_PATH=$(npm root -g) node tools/ui-smoke.js /tmp/shots     # click through the UI and save screenshots
```

Both scripts need Playwright with Chromium. The `Screenshot *.png` files are the reference
examples the families were designed from.
