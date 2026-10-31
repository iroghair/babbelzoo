# Babbelzoo — Design System

## Product context

Babbelzoo is a browser game for practising school vocabulary (English ↔ Dutch) for **kids aged 9–14**.
Players paste their school word list, practise it on a **learning path** (multiple choice → typing,
words they miss come back more often) and check themselves on a **test path** (every word once,
grade 1–10). Right answers earn **coins** (with a coin-drop animation into the coin counter);
coins buy **animals** that live in the player's **house** (a small zoo). Finishing a session earns
**food** to feed the animals. Several kids share one device, each with a profile.

Full functional spec: `PLAN.md` (sections 3–8). Interface language: **Dutch** (English switch).

### Jobs to be done
- "Help me know my 30 words before Friday's test" — fast, focused practice with clear progress.
- "Make practising feel like playing" — coins, streaks, animals that are happy when fed.
- "Show me exactly what I got wrong" — spelling diff, right answer, copy step.

### Key screens
Profiles · Home (per player) · List editor · Session setup · **Question** (type / choose 4 /
choose 8) with feedback states · Introduction card · Learning results · Test results (grade) ·
Shop · House (rooms, animals, food bowl) · Settings.

### Audience tone
Playful, warm and encouraging — **but not babyish**. A 14-year-old must not feel it is "for little
kids": no baby pastels, no comic-sans, no cartoon clutter on every surface. Think of a well-made
cozy game: confident layout, chunky tactile controls, personality in the animals, coins and
micro-animations rather than in decoration everywhere. Copy is short, direct and friendly
("Goed zo!", "Bijna! Let op de spelling.", "5 op rij!"), never patronising. Wrong answers are
never punished visually (no harsh red screens, no shaking) — they are calm and helpful.

## Visual direction: cozy illustrated zoo

Sunlit savanna/jungle. Warm cream backgrounds, leafy greens, sunny gold for coins, a touch of sky
blue (pond/info) and warm wood (house/shop). Surfaces are rounded, chunky cards with soft depth
that feel tactile, like game pieces. Subtle illustrated scenery (leaf silhouettes, rolling hills,
a horizon line) appears at the edges of screens, never behind text.

### Colour tokens

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#FFF8E7` | App background (warm cream) |
| `--surface` | `#FFFFFF` | Cards, question card, inputs |
| `--surface-alt` | `#FDEFD2` | Secondary panels, sand |
| `--ink` | `#24352B` | Main text (dark forest, never pure black) |
| `--ink-soft` | `#5B6B60` | Secondary text |
| `--leaf` | `#2E9E5B` | Primary actions, right answers, progress |
| `--leaf-dark` | `#1F7542` | Primary button bottom edge, pressed |
| `--leaf-light` | `#D7F2DF` | Right-answer backgrounds, mastered chips |
| `--gold` | `#FFC233` | Coins, coin counter, rewards |
| `--gold-dark` | `#D99A00` | Coin rim, gold button edge |
| `--gold-light` | `#FFF1C7` | Coin glow, reward highlights |
| `--sky` | `#4BB4E6` | Info, hints, pond, secondary actions |
| `--sky-light` | `#DDF2FB` | Hint backgrounds |
| `--coral` | `#F26B5B` | Wrong answers (soft, not alarm red) |
| `--coral-light` | `#FFE3DE` | Wrong-answer backgrounds, spelling mistakes |
| `--wood` | `#A8693A` | House, shop shelves, food |
| `--wood-light` | `#F3DEC8` | House floor, shop panels |
| `--line` | `#EADFC8` | Borders, dividers |

Light theme only. Text on coloured buttons is white (on leaf/sky/coral/wood) or `--ink` (on gold).
All text meets WCAG AA contrast.

### Typography

- **Display / headings / the question word:** `Fredoka` (Google Fonts), weights 500–700. Rounded,
  friendly, readable — playful without being childish.
- **Body / UI / answers typed:** `Nunito` (Google Fonts), weights 400, 600, 800.
- Scale (tablet): question word 56–64px Fredoka 600; screen title 32px; card title 22px;
  body 18px; labels 15px Nunito 700; minimum 15px anywhere (young readers).
- Typed answer input: 32px Nunito 700, generous letter spacing for spelling (0.02em).
- No all-caps body text; small labels may use caps with 0.06em tracking.

### Shape, depth and spacing

- Radius: 24px for main cards, 16px for buttons/inputs/chips, full pill for counters and badges.
- **Chunky 3D buttons:** solid fill + a 5px darker bottom edge (`box-shadow: 0 5px 0 <dark>`);
  on press the button moves down 3px and the edge shrinks. Same for answer-option tiles.
- Cards: white with `0 6px 0 rgba(36,53,43,0.06), 0 12px 24px rgba(36,53,43,0.08)`.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48. Screen padding 24–32px on tablet.
- Touch targets ≥ 56px tall on tablet; answer tiles ≥ 72px.

### Iconography and imagery

- Animals: emoji placeholders for now (🦊 🐼 🐧 🦉 🐢 🦄 …), presented on round coloured
  "token" backgrounds so they read as game pieces; later replaced by illustrations.
- UI icons: rounded line icons (e.g. Phosphor "bold"/"fill" or Lucide with 2.5px stroke).
- Coin: a gold circle with darker rim and a small shine, optionally a paw print embossed.
- Food: a small bowl / carrot-and-leaf icon in wood colours.
- Day streak: a little sun or flame chip.

## Game UI patterns

- **Top bar (in play):** left — close/back and session progress ("7 / 20" + progress bar of
  leaves). Right — streak chip ("4 op rij"), **coin counter** (gold pill with coin icon, the
  target of the coin drop).
- **Question card:** large white card centred; direction chip ("Engels → Nederlands"), the word in
  Fredoka, optional hint in brackets in `--ink-soft`, mode-specific answer area below.
- **Type mode:** one big input + "Controleer" leaf button; timed letter hint appears inside/under the
  input as `h _ _ _ _` in sky blue; spelling diff after answering (green letters ok, coral
  underlined wrong, sky "missing" letters).
- **Choose 4 / 8:** 2×2 or 4×2 grid of chunky tiles; selected-right tile turns leaf, selected-wrong
  turns coral and the right one turns leaf. Faded-out (hinted) options become ghosted.
- **Feedback panel:** slides up from the bottom of the card area. Right: leaf-light panel,
  "Goed zo! +20" and the coin drop. Wrong: coral-light panel, calm, shows the right answer and the
  copy field ("Typ het goede antwoord over").
- **Animal buddy:** one of the player's own animals peeks from the corner of the play screen and
  reacts (cheers on right answers, encouraging look on wrong ones) — links play to the house.

## Motion

- **Coin drop (signature moment):** after a right answer, 3–15 coins pop from the answer area,
  arc up and fall into the coin counter in the top bar with slight stagger (60ms) and spin; the
  counter bounces and ticks up as each lands; a gold sparkle at the counter. ~900ms total.
  Easing: `cubic-bezier(0.34, 1.56, 0.64, 1)` for pops, ease-in for the fall.
- Streak milestone: a short banner "5 op rij! +5" with a wiggle.
- Buttons: 80ms press-down; tiles lift 2px on hover.
- Wrong answer: gentle fade/slide of the feedback panel only — no shake, no flash.
- Respect `prefers-reduced-motion`: replace the coin flight with a counter count-up and glow.

## Layout

- Primary target: **tablet** (1024×768 landscape and 768×1024 portrait); scales up to laptop and
  down to phone (single column, answer tiles 2 per row).
- In play the screen is focused: no navigation, only the top bar, the question card and the
  animal buddy.
