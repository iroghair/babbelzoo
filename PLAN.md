# Babbelzoo: Game Rules & Development Plan

**Status:** decisions answered 2026-10-31; design done in Superdesign; phases 0–6 built
2026-10-31 (see [section 12](#12-implementation-status)). The look follows the approved drafts
in `.superdesign/`.

**Timing:** the first real use is a school test of about 30 words in the week of 2026-11-02.
Phases 0–5 (section 11) are the version to have ready for that.

---

## 1. Goal

Turn a school word list (English ↔ Dutch for now) into a game that makes practising fun.
A player loads or pastes their word list, then:

- **Learns** the words on a learning path that starts easy (multiple choice) and ends hard
  (typing), with words they get wrong coming back more often.
- **Tests** themselves on a final test path that works like the real school test, with a grade.

Right answers earn **coins**, shown with a coin-drop animation. Coins buy **animals**, which live
in the player's **house**. Finishing a practice session earns **food** for those animals.

Much of this comes from TopoChamp (`../topochamp`). Its scheduler, typing matcher, share links,
profiles and storage code are reused (section 9).

---

## 2. Word lists

### 2.1 What a list contains

| Field | Example | Notes |
|---|---|---|
| Name | "Unit 3 – At home" | Chosen by the player |
| Languages | `en` ↔ `nl` | Each side has a language, so other pairs (de, fr, es…) work later without changes |
| Entries | `house = huis` | One word or phrase per side |

Each **entry** has:
- **Side A / side B:** the word as shown in a question.
- **Alternatives:** other answers that also count as right (`big / large = groot`).
- **Hint** (optional): extra meaning shown with the question but not typed. Example:
  `bank [river] = oever`. The player sees "bank (river)" and only has to type "oever".
- **Optional parts:** `(to) walk = lopen` accepts both "walk" and "to walk".

### 2.2 Entering a list

1. **Paste** a list, one entry per line. The separator is detected automatically:
   `=`, tab (pasted from Excel or Google Sheets), ` - `, `;` or `|`.
   - `/` separates alternatives: `big / large = groot`.
   - `(…)` at the start or end of a word is optional when typing: `(to) walk`.
   - `[…]` is a hint that is shown but never typed: `bank [river] = oever`.
   - Empty lines and lines starting with `#` are skipped.
2. **Preview** before saving: a table of the parsed pairs, with warnings for lines that could not
   be read, duplicates, and words that appear in more than one entry (e.g. two entries that both
   mean "groot"; see 3.3).
3. **Edit** afterwards: add, change or delete entries, swap the two sides, rename the list.
4. **Import / export** as a `.csv` or `.txt` file.
5. **Built-in starter list** (about 30 basic words) so the game can be tried straight away.

Lists are shared by all profiles on the device. Progress, coins and animals are per profile.

### 2.3 Sharing a list

- **Link (no server needed):** the list is compressed into the address, `…/#list=z…`. Opening
  the link offers "Add this list?". This is the TopoChamp code, which already works. A 40-word
  list gives a link of about 400–700 characters. That is fine to send in a chat.
- **QR code** of the link, so it can be scanned from a screen or a printed sheet.
- **Short code** (e.g. `K7P-2QX`), *optional, phase 7*: a tiny free backend (a Cloudflare
  Worker with KV storage, about 30 lines, no accounts) saves the list and returns a code. A short
  code can't hold a whole list, so it needs that store. Built-in lists can have short codes
  without a server.

---

## 3. Playing

### 3.1 Direction

- **English → Dutch**, **Dutch → English**, or **both** (a random direction per question).
- Progress is kept **per direction** because recognising a word and producing it are different
  skills. Learning "huis" from English is a separate step from learning "house" from Dutch.

### 3.2 Answer modes

The player ticks **one or more** modes. With more than one ticked, each question uses a random
mode from the ticked ones. On the learning path the "Automatic" option picks the mode instead
(section 4).

| Mode | Question | How to answer | Coin multiplier |
|---|---|---|---|
| **Choose 4** | The word | Pick 1 of 4 | ×1 |
| **Choose 8** | The word | Pick 1 of 8 | ×1.5 |
| **Type** | The word | Type the translation | ×2 |
| *(later)* **Letter tiles** | The word | Put scrambled letters in order | ×1.5 |
| *(later)* **Match pairs** | 5 words + 5 translations | Connect the pairs | ×1 per pair |

**Wrong options** for multiple choice:
- They come from the same list and the same direction.
- They never include another right answer. If "big" and "large" both mean "groot", "large" is
  never a wrong option for "groot".
- **Choose 4:** random words from the list.
- **Choose 8:** half are look-alikes (same first letters or similar length), so it is harder.
- If the list is too short (fewer than 4 or 8 entries), that mode can't be ticked and the reason
  is shown next to it.

### 3.3 Typing and fuzzy matching

Comparison steps, in order:

1. **Clean up:** capitals, accents, extra spaces, hyphens and apostrophes are ignored
   (`cafe` = `café`).
2. **Small words:** a leading `to` (English verbs) and `the / a / an` are optional. For Dutch
   `de / het / een`, see the article setting below.
3. **Exact match** with the answer or one of its alternatives → **right**, full coins.
4. **Typo match** → **right**, 75 % of the coins. The correct spelling is shown with the mistakes
   highlighted (missing, wrong and swapped letters). Typos allowed:

   | Length of the word | Typos allowed |
   |---|---|
   | 1–3 letters (`ik`, `cat`) | 0 |
   | 4–7 letters | 1 |
   | 8 + letters | 2 |

   Swapping two neighbouring letters counts as one typo.
5. **Typo guard:** if the typed answer is *exactly* another word in the list, it is **wrong**,
   even when it is within the typo limit. The feedback names that word, for example:
   "'horse' is a different word: that's paard. You were looking for 'house'".
6. Otherwise → **wrong**, and the right answer is shown.

**Settings:**
- **Spelling:** *lenient* (default; steps 1–6) or *strict*, where only capitals are ignored.
  Use strict when spelling counts on the test.
- **Dutch articles:** *not needed* (default; "hond" is right for "de hond", and the feedback shows
  "de hond") or *required* (de/het must be right, and a wrong article counts as wrong).

### 3.4 Hints when an answer takes too long (learning path only)

If the player doesn't answer for a while, the game gives away the answer bit by bit. Each step
gives fewer coins. When the whole answer is shown, the question is worth 0 coins.

- **Type mode:** after **8 s** without typing, the first letter and the number of letters are
  shown (`h _ _ _ _`). After every further **4 s** without typing, the next letter appears.
  The timer starts again with every keystroke, so a player who is busy typing is never
  interrupted. Spaces and punctuation are shown for free.
- **Choose 4 / 8:** after **6 s**, one wrong option fades out, then another every **3 s**, until
  only the right one is left.
- **Coins:** `coins × (1 − shown / total)`, where *shown / total* is the share of letters
  revealed (Type) or wrong options removed (Choose).
- **Effect on progress:** a right answer after one or more hints keeps the word in its box (it
  doesn't move up). A fully revealed answer counts as **wrong**: the word goes back to box 1
  and the copy step (3.5) follows.
- **Setting:** hint speed *slow* (times ×2) / *normal* (default) / *off*.
- The times are starting values to tune by play-testing. The design pass decides how the waiting
  time is shown (or not shown).

### 3.5 Feedback after an answer

- **Right:** a coin drop. Coins fall into the coin counter, and the counter ticks up as each coin
  lands. The number of coins drawn grows with the coins earned (capped at about 15). There is a
  short "clink" sound, which can be muted. With *reduced motion* switched on in the device
  settings, only the counter animates.
- **Right with a typo:** the same coin drop with fewer coins, plus the spelling feedback.
- **Streak milestone:** an extra moment ("5 in a row!") with its bonus coins (3.6).
- **Wrong** (or fully revealed): no coins. The right answer is shown. On the learning path the
  player then **types the right answer once** (copying it) before going on. The copy step is
  **on by default** on the learning path and can be switched off in the settings.
- **How long it shows:** about 1.5 s after a right answer. After a wrong one it stays until the
  player continues (Enter, tap, or the copy step).

### 3.6 Coins

**Per right answer:**

```
coins = 10 × mode multiplier (3.2) × word factor × typo factor × hint factor
```

rounded to whole coins, with a minimum of 1 for any right answer that wasn't fully revealed.

| Factor | Values |
|---|---|
| **Mode** | Choose 4 ×1, Choose 8 ×1.5, Type ×2 |
| **Word** | **Hard word ×2:** the word is in box 1 (answered wrong recently), or fewer than 60 % of its answers so far were right (after 3 or more tries). **Easy word ×0.5:** the word is in box 4–5 (mastered). Otherwise ×1. |
| **Typo** | ×0.75 for a right answer with a typo, else ×1 |
| **Hint** | `1 − shown / total` (3.4) |

Examples: an easy word in Choose 4 gives 5 coins. A hard word typed correctly gives 40.

**Bonuses:**

| Bonus | Coins |
|---|---|
| **Streak** | +5 at every 5 right answers in a row (5, 10, 15…). A wrong answer, skip or fully revealed answer resets the streak; a right answer with hints keeps it but doesn't add to it |
| **Daily** | First finished session of the day: +20, plus +5 for each day in a row played (max +50). The day streak is shown on the home screen |

Coins are never taken away. There are no paid hints; hints come by themselves over time (3.4).

**Economy target.** With a 30-word list and a test about a week away, a 20-question session
earns roughly 150–250 coins early on (mostly multiple choice) and 300–400 later (mostly typing).
A week of daily practice (8–10 sessions) gives about 2,000–3,000 coins. Prices (5.1) are set so
that:
- the first animal can be bought after the first session;
- by test day a player can own a few common and uncommon animals and one rare animal;
- a legendary animal takes longer and is something to save for over the next word list.

These values will be tuned after the first play-tests.

---

## 4. The two paths

### 4.1 Learning path ("Oefenen")

The goal is to get every word to "mastered" before the test.

- **Session length:** **10 or 20 questions**, picked from the list by the scheduler below.
  A finished session earns food (5.3).
- **Choosing words:** Leitner boxes, taken over from TopoChamp with softer weights:
  - Each word/direction pair is in box 0–5 (0 = new, 1 = wrong recently, 4 + = mastered).
  - A right answer moves it up one box, a wrong one puts it back in box 1. A right answer with
    hints keeps it in its box (3.4).
  - The next question is a random draw with weights per box:

    | Box | 1 (wrong recently) | 0 (new) | 2 | 3 | 4 | 5 (mastered) |
    |---|---|---|---|---|---|---|
    | Weight | 5 | 4 | 4 | 3 | 2 | 1 |

    Words that need practice come up most, but mastered words still come by regularly: a
    mastered word is asked about 1 in 5 times as often as a word that was just answered wrong.
  - **Not forgotten:** a word not asked for 2 days gets at least the weight of box 3, so every
    word is seen again before the test.
  - No repeat within 3 questions. A wrong word comes back 3–5 questions later in the same session.
- **New words in small batches:** at most 5 new (box 0) words are active at once. The next batch
  starts when the current words reach box 2. A 30-word list is introduced in 6 batches.
- **Introduction card:** the first time a word comes up, it is shown as a card ("house = huis")
  before it is asked.
- **Automatic mode (default on the learning path):** the mode grows with the word's box:

  | Box | 0–1 | 2 | 3 + |
  |---|---|---|---|
  | Mode | Choose 4 | Choose 8 | Type |

  The player can switch Automatic off and tick the modes by hand.
- **Hints over time** (3.4) and the **copy step** (3.5) are on.
- **Skips:** 2 per session. The answer is shown, the word counts as wrong for the boxes, and there
  are no coins.
- **End of session:** coins earned, food earned, the words to practise (the ones answered wrong)
  and a progress bar such as "18 of 30 mastered".

### 4.2 Test path ("Toets")

The goal is to check, like the real test, without help.

- **Every word in the list is asked exactly once,** in random order. With "both" directions, each
  word is asked once in a random direction.
- **Mode:** Type by default, because that is what school tests ask. Multiple choice can be ticked
  for younger players.
- **No hints, no skips, no introduction cards, no copy step.** Feedback is shown after each answer
  as usual. A setting can switch it to "only at the end", like a real test.
- **Coins** per right answer as in 3.6 (with the hint factor always 1). The daily bonus counts for
  a test too.
- **Grade 1–10** at the end: `1 + 9 × (right / total)`, rounded to one decimal. A typo counts as
  right; with strict spelling it counts as wrong.
- **Result screen:** grade, coins, food, and a list of the mistakes with "Practise these words",
  which starts a learning session with only those words.
- **Test results feed the boxes too.** A right answer moves the word up, a wrong one sends it back
  to box 1.
- **Readiness hint:** the home screen of a list shows "Ready for the test?" once 80 % of the words
  are mastered. The test is always available; this is only a hint.

---

## 5. Animals and the house

### 5.1 Shop

- About 24 animals in 4 tiers. Starting prices, matching the economy target in 3.6:

  | Tier | Examples | Price |
  |---|---|---|
  | Common | mouse, chick, fish, frog, rabbit, hamster | 50–120 |
  | Uncommon | cat, dog, duck, pig, owl, turtle | 250–450 |
  | Rare | fox, penguin, panda, koala, parrot, horse | 700–1,200 |
  | Legendary | lion, elephant, whale, unicorn, dragon, phoenix | 2,500–5,000 |

- Some animals are **locked** until a milestone, so learning counts, not only collecting coins:
  - **Unicorn:** a test with a 9 or higher.
  - **Phoenix:** every word of a list mastered.
  - **Dragon:** a day streak of 7 days.
- Each animal shows its name in **both languages** (the shop is also a small vocabulary lesson).
- Animals can be bought more than once. Food can't be bought; it only comes from practising (5.3).
- **Graphics:** emoji as placeholders, so this phase does not depend on the design work. The
  design pass can replace them with drawings.

### 5.2 House

- The player's animals live in the house. Each animal can be given a name. Tapping it plays a
  small reaction (a hop or a sound).
- **Rooms:** the house starts with 1 room for 6 animals. More rooms cost coins and give room for
  more animals, so there is always something to save for: garden (300), pond (600, the only
  place for water animals such as fish, duck, turtle and whale), attic (1,000).
- **Placing:** the player drags animals to a spot in a room. Positions are saved.

### 5.3 Food

Practising feeds the animals.

| Finished… | Food |
|---|---|
| Learning session of 10 questions | 1 portion |
| Learning session of 20 questions | 2 portions |
| Test | 2 portions |

- Food is earned for **finishing** a session, whatever the score, because it rewards practising,
  not being right. A session that is stopped halfway gives no food.
- Food goes into a **food bowl / pantry** in the house. The player feeds an animal by dragging a
  portion to it (or tapping the animal and then "Feed").
- A **fed animal is happy for the rest of the day.** It shows hearts, plays and moves around.
  An animal that hasn't been fed is just calm or asleep. Animals never get sick, sad or run away;
  the game shouldn't make a child feel guilty.
- **Growing up:** an animal that has been fed on 5 different days grows from baby to adult (shown
  bigger, with a small celebration). This gives food a lasting purpose.

---

## 6. Players, saving and settings

- **Profiles (required):** several kids use one device, so each player has a profile (name and
  emoji avatar) with their own progress, coins, food, animals and house. The profile picker is
  the first screen. Taken over from TopoChamp.
- **What is saved:** profiles, lists, progress per word/direction, coins, food, animals, house
  layout and settings.
- **Where it is saved:** in the browser's **localStorage** (decision 1), with no account and no
  server. To the player it works like a cookie: everything is still there next time on the same
  device.
- **Backup:** download everything as a file and restore it on another device.
- **Menu language:** Dutch or English, with a switch.
- *(later)* **Pronunciation:** a speaker button that reads the word aloud with the browser's
  built-in speech (Web Speech API, free and offline on most devices).

---

## 7. Settings overview

| Setting | Options | Default | Where it applies |
|---|---|---|---|
| Direction | EN→NL / NL→EN / both | both | session setup |
| Modes | Choose 4, Choose 8, Type (one or more) / Automatic | Automatic (learning), Type (test) | session setup |
| Session length | 10 / 20 | 10 | learning path |
| Spelling | lenient / strict | lenient | both paths |
| Dutch articles | not needed / required | not needed | both paths |
| Hint speed | slow / normal / off | normal | learning path |
| Copy step after a wrong answer | on / off | on | learning path |
| Feedback in a test | after each answer / at the end | after each answer | test path |
| Sound | on / off | on | everywhere |
| Menu language | Nederlands / English | Nederlands | everywhere |

---

## 8. Screens (for the design pass)

What each screen must contain. The layout and look are up to the design.

| Screen | Contents |
|---|---|
| **Profiles** | Pick a player or add one (name + emoji avatar). |
| **Home** (per player) | Coins, food, day streak; the word lists with progress ("18 of 30 mastered", readiness hint); buttons to Learn, Test, Shop, House; add / paste / open a shared list; settings. |
| **List editor** | Paste box, preview table with warnings, edit entries, swap sides, name, share (link + QR), import/export. |
| **Session setup** | Direction, modes (multi-select or Automatic), session length (learning) — remembered per list. |
| **Question** | The word (+ hint in brackets), the answer field or 4/8 option buttons, the timed letter hint (3.4), coin counter, streak, progress in the session (e.g. 7/20), skip button (learning only). |
| **Feedback** | Coin drop into the counter; right answer; spelling diff with highlighted mistakes; typo-guard message; copy-step field; streak milestone moment. |
| **Introduction card** | A new word with its translation, before it is asked for the first time. |
| **Learning results** | Coins and food earned, words to practise, progress bar. |
| **Test results** | Grade (1–10), coins, food, mistakes with "Practise these words"; celebration for a high grade. |
| **Shop** | Animals by tier with price, name in both languages, locked animals with their milestone, room upgrades. |
| **House** | Rooms with animals placed by dragging; naming; tapping for a reaction; food bowl and feeding; happy / calm state; baby → adult. |
| **Shared-list prompt** | "Add this list?" with its name and number of words. |
| **Settings** | Section 7, plus backup / restore. |

---

## 9. Technical design

| Part | Choice |
|---|---|
| App type | Static web app with no backend (GitHub Pages), like TopoChamp |
| Language / build | TypeScript + Vite |
| UI | Svelte 5 |
| Animations | CSS / Web Animations API for the coin drop (no extra library); `canvas-confetti` for test results and growing up |
| Storage | `localStorage` behind the TopoChamp `storage.ts` wrapper (never throws) |
| Offline | Service worker / PWA, installable on a tablet |
| Tests | Vitest for parsing, matching, scheduling, coins, hints, food and sharing; Playwright for full rounds |

### Reused from TopoChamp

| TopoChamp file | Used for | Changes |
|---|---|---|
| `src/lib/text.ts` | normalising, typo distance, spelling diff | Typo limits by word length (3.3), optional words, articles, typo guard |
| `src/lib/scheduler.ts` | Leitner boxes, practice draw, retries | Softer weights, "not forgotten" rule, new-word batches (4.1) |
| `src/lib/backup.ts` | backup file, share link (`#list=…`) | Different payload |
| `src/lib/storage.ts` | safe localStorage | Prefix only |
| `src/lib/players.svelte.ts`, `i18n.svelte.ts`, `sound.ts` | profiles, menu language, sounds | Texts |
| `public/sw.js`, `manifest`, deploy workflow | offline and publishing | Names |

### Project structure

```
flashcard-learn/
├─ PLAN.md
├─ src/
│  ├─ lib/
│  │  ├─ parse.ts        # pasted text / CSV → entries, with warnings
│  │  ├─ text.ts         # normalising, fuzzy matching, spelling diff
│  │  ├─ scheduler.ts    # Leitner boxes, batches, retries
│  │  ├─ questions.ts    # build a question: mode, direction, wrong options
│  │  ├─ hints.ts        # timed letter / option reveal and its coin factor
│  │  ├─ coins.ts        # coin rules and bonuses (3.6)
│  │  ├─ session.svelte.ts  # a learning or test session
│  │  ├─ shop.ts         # animal catalogue, prices, unlocks
│  │  ├─ house.svelte.ts # rooms, placed animals, food, feeding, growing up
│  │  ├─ share.ts        # share link, QR, (short code)
│  │  └─ storage.ts, players.svelte.ts, i18n.svelte.ts, sound.ts
│  ├─ components/        # the screens in section 8, plus CoinDrop
│  └─ data/starter.ts    # built-in starter list + animal catalogue
└─ tests/
```

### Data model (sketch)

```ts
Entry     { id, a: Side, b: Side }
Side      { text: string, alts: string[], hint?: string }       // "(to) walk" kept as text; matcher handles "( )"
WordList  { id, name, langA: 'en', langB: 'nl', entries: Entry[], created, updated }   // shared by all profiles
Progress  { box: 0..5, attempts, correct, last }                // per profile; key `${listId}:${entryId}:${'ab'|'ba'}`
Wallet    { coins, earnedTotal, food, dayStreak, lastPlayedDay } // per profile
Owned     { id, animalId, name, roomId, x, y, boughtAt, fedDays: string[] }   // adult when fedDays.length ≥ 5
House     { rooms: { id, kind: 'room'|'garden'|'pond'|'attic', capacity }[] }
Milestones{ bestGrade, listsMastered, longestDayStreak }        // for unlocks
Settings  { direction, modes, sessionLength, spelling, articles, hintSpeed, copyAfterWrong,
            testFeedback, sound, uiLang }
```

Progress is stored per list entry. When a list is edited, entries keep their id, so progress
survives renaming a word.

---

## 10. Decisions

Answered 2026-10-31 (answers in italics).

1. **Cookie or localStorage?** A cookie holds about 4 KB, which a few lists plus progress quickly
   exceed, and on GitHub Pages it would be shared with other projects on the same `*.github.io`
   address. *Use localStorage (6).*
2. **Short code for sharing.** *Link + QR in phase 1; the short-code backend is optional, in
   phase 7 (2.3).*
3. **Coin economy.** *The test is next week, with about 30 words. Coins for each right answer, a
   small streak bonus and a daily bonus for regular play. Hard words answered right are worth
   extra; easy words that are always right are worth less, and come up a bit less often while
   still coming back now and then.* → 3.6 (word factor, bonuses, economy target), 4.1 (softer
   weights, "not forgotten" rule), 5.1 (prices).
4. **Profiles.** *Several kids on one device, so profiles are required.* → 6, phase 3.
5. **Copy step after a wrong answer.** *On by default on the learning path. Also, when answering
   takes too long, show the first letter of the answer, then the next one, until the whole answer
   is shown, which gives zero coins.* → 3.4, 3.5.
6. **Feeding animals.** *Finishing a practice session of 10 or 20 questions gives food for the
   animals.* → 5.3.
7. **Name of the app.** *Babbelzoo* ("babbelen" = to chatter: a zoo of chatty animals). Chosen
   from: Woordzoo, WoordChamp, Woordenark, Vocabeest, Muntwoord, Taalzoo, Vocazoo, Lingozoo,
   Spellzoo.

---

## 11. Development phases

Each phase ends with something you can play or check. Phases 0–5 are the target for the test in
the week of 2026-11-02; the design pass can run alongside.

| # | Phase | Contents | Done when |
|---|---|---|---|
| 0 | **Foundation** | Vite/TS/Svelte setup, tests, TopoChamp libs copied and adapted (storage, text, scheduler). Starter list. | `npm test` runs; matcher tests cover 3.3 (typo limits, `(to)`, articles, typo guard) |
| 1 | **Lists** | Paste parser with preview and warnings, list editor, share link + QR + "add shared list", CSV import/export | The real 30-word school list pasted from Word, Excel or plain text gives the right pairs; a shared link opens on another device |
| 2 | **Core game** | Session with Type, Choose 4, Choose 8, multi-select modes, direction, feedback, spelling diff, typo guard, skips | A 20-question round can be played in every mode and direction |
| 3 | **Profiles & coins** | Profiles; coin formula with word factor; coin-drop animation + counter + sound; streak and daily bonuses; wallet saved per profile | Right answers drop coins; hard words give more than easy ones; two profiles keep separate coins after a reload |
| 4 | **Learning path & test path** | Leitner scheduling with soft weights and "not forgotten", new-word batches, Automatic mode, intro cards, timed hints, copy step; test path with grade, mistakes, "practise these", readiness hint | Wrong words visibly come back, mastered ones less often; hints reveal letters and lower coins; a full test gives a grade |
| 5 | **Shop, house & food** | Animal catalogue and buying, house with first room, naming, food from finished sessions, feeding, happy state | Coins earned in play buy an animal; a finished session gives food that can be fed to it |
| 6 | **House extras & release** | Extra rooms, dragging animals into place, growing up, locked animals and milestones; menu language, backup, PWA/offline, deploy | The kids play it on their own devices |
| — | **Design pass** | Separate design work on the screens in section 8 | — |
| 7 | *(later)* | Short-code backend, letter tiles, match pairs, pronunciation, more language pairs | — |

After phases 0–3 there is a first playable version with coins. The kids can try it early, and the
modes and coin values can be tuned from how they play.

---

## 12. Implementation status

*Last updated 2026-10-31.*

| # | Phase | Status |
|---|---|---|
| 0 | Foundation | ✅ Vite + Svelte 5 + TypeScript, matcher and scheduler with tests, starter list. |
| 1 | Lists | ✅ Paste parser (separator per line, numbering/bullets, language header line, alternatives, hints, optional parts), preview with warnings, editor, txt/csv import and export, share link + QR. |
| 2 | Core game | ✅ Type / choose 4 / choose 8 (mixable), directions, intro cards, feedback, spelling diff, typo guard, skips, timed hints, copy step, session setup. |
| 3 | Profiles & coins | ✅ Profiles; per-player wallet, food, progress, settings; coin drop; streak and daily bonus. |
| 4 | Learning & test path | ✅ Soft Leitner weights, "not forgotten", batches of 5, automatic mode; test with grade, mistakes, "practise these words", readiness hint; results screens. |
| 5 | Shop, house & food | ✅ 24 animals, rooms (pond for water animals), locked animals, naming, drag to place, drag food to feed, happy/asleep, growing up. |
| 6 | House extras & release | ✅ Settings screen, Dutch/English menus, backup/restore, offline/PWA with icons, GitHub Pages workflow. Not yet published (needs a GitHub repository). |
| 7 | Later | Short-code backend, letter tiles, match pairs, pronunciation. |

**Checks:** unit tests for parsing, matching, scheduling, questions, coins, hints, sessions,
rewards, the house and backups; browser tests for pasting and sharing a list, a full learning
round, a full test with "practise these words", and buying/naming/feeding an animal.

### Deviations from the plan

- **Phases 5 and 6 merged for the house:** extra rooms, dragging, growing up and locked animals
  were built together with the shop, because the designs show them on the same screens.
- **Spelling diff:** two swapped letters are shown as one highlighted pair in the right order,
  instead of a wrong and a missing letter.
- **Choose 4 / 8 copy step:** after a wrong multiple-choice answer the copy step also asks to
  type the answer, as the plan says for all wrong answers on the learning path.
- **Hinted answers** keep their streak but don't add to it; a new word answered after hints goes
  to box 1 (so it no longer counts as new).
- **Typo guard** also covers other entries' alternatives; answers of entries with the same
  question word all count as right (and are never wrong options).
- **Settings per player** (spelling, articles, hints, copy step, test feedback); menu language
  and sound per device.
- **Profiles screen** always opens first, so siblings pick themselves each time.
- **Fonts are bundled** (Fredoka and Nunito via Fontsource) so the game also looks right offline.

### Known limitations

- Offline: the app is cached on the second load after installing (the service worker starts
  caching once it controls the page).
- Animals are emoji; the phoenix uses a recent emoji (🐦‍🔥) that older tablets may show as two
  symbols.
- Placing animals by dragging uses % positions; on very narrow phones tokens can overlap.

### Next steps

1. Play-test with the kids before the test; tune hint timing and coin values (3.4, 3.6).
2. Publish on GitHub Pages (needs a GitHub repository).
3. Replace the emoji animals with illustrations (design pass).
