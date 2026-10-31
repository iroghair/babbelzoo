# Babbelzoo

A browser game for practising school vocabulary (English ↔ Dutch, other languages work too).
Paste the word list from school, practise it on the learning path (multiple choice first, typing
later; words you miss come back more often) and check yourself on the test path, which ends
with a grade. Right answers earn coins, coins buy animals for your house, and finishing a
practice round earns food for them.

The game rules and the development plan are in [PLAN.md](PLAN.md). The visual design comes from
the Superdesign drafts listed in [.superdesign/drafts.md](.superdesign/drafts.md), with the
design tokens in [.superdesign/design-system.md](.superdesign/design-system.md).

## Running it

You need [Node.js](https://nodejs.org/) 20 or newer.

```sh
npm install
npm run dev        # http://localhost:5173
```

## Checks

```sh
npm test           # unit tests (parsing, matching, scheduler, coins, sessions, house, …)
npm run test:e2e   # plays rounds, a test, the shop and the house in a real browser (Playwright)
npm run check      # type check
```

## Publishing

`npm run build` creates a static site in `dist/` that works from any web host or folder (all
paths are relative). It works offline after the first visit and can be installed on a tablet's
home screen.

For GitHub Pages: push the repository to GitHub, then under *Settings → Pages* choose
*GitHub Actions* as the source. The workflow in `.github/workflows/deploy.yml` builds and
publishes the site on every push to `main`.

## Word list format

One word per line; the separator is detected per line (`=`, tab, ` - `, `;`, `|`):

```
English = Nederlands          ← optional first line: names the two languages
house = het huis
big / large = groot           ← "/" separates answers that all count as right
(to) cook = koken             ← "( )" may be left out when typing
bank [river] = oever          ← "[ ]" is a hint shown with the question, never typed
```

Numbering and bullets copied from Word are ignored. `.txt` and `.csv` files can be opened too.

## Project structure

```
src/lib/          game logic: parse, text (matching), scheduler, questions, session, coins,
                  hints, rewards, house, profile, lists, share, backup, i18n, sound, fx
src/components/   screens: Profiles, Home, ListEditor, SessionSetup, Game, Results, Shop,
                  House, Settings (+ CoinCounter, Buddy, SpellingDiff, Modal, …)
src/data/         starter list and the animal/room catalogue
tests/            unit tests (Vitest) and tests/e2e (Playwright)
```

Everything a player does (profiles, lists, progress, coins, animals) is stored in the browser's
local storage; there is no server. Lists are shared as a link that contains the whole list.
