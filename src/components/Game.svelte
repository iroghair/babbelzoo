<!-- The question screen: type / choose 4 / choose 8, timed hints, feedback with the coin drop. -->
<script lang="ts">
  import { tick, untrack } from 'svelte';
  import { coinDrop } from '../lib/fx';
  import { hintTarget, hintTimes, letterCount, maskAnswer } from '../lib/hints';
  import { fmt, langName, pick, tr } from '../lib/i18n.svelte';
  import type { AnswerRecord, GameSession } from '../lib/session.svelte';
  import { playCoins, playRight, playWrong } from '../lib/sound';
  import { matchAnswer } from '../lib/text';
  import Buddy from './Buddy.svelte';
  import CoinCounter from './CoinCounter.svelte';
  import Scenery from './Scenery.svelte';
  import SpellingDiff from './SpellingDiff.svelte';

  let {
    session,
    buddy = '🦊',
    coinsBefore = 0,
    onanswer,
    onend,
  }: {
    session: GameSession;
    buddy?: string;
    /** Coins in the wallet before this session; the counter shows these plus what is earned. */
    coinsBefore?: number;
    /** Called after every answer (saving coins). */
    onanswer?: (r: AnswerRecord) => void;
    onend: () => void;
  } = $props();

  const q = $derived(session.question);
  const last = $derived(session.last);
  const isLearn = $derived(session.path === 'learn');
  const quietTest = $derived(session.path === 'test' && session.settings.testFeedback === 'end');

  let typed = $state('');
  let copyText = $state('');
  let hintShown = $state(0);
  let faded: string[] = $state([]);
  let chosen: string | null = $state(null);
  let bubble = $state(pick(tr().buddyStart));
  let mood = $state(0);
  let banner = $state('');
  let praise = $state('');
  let answeredAt = 0;

  let answerInput: HTMLInputElement | undefined = $state();
  let copyInput: HTMLInputElement | undefined = $state();
  let answerArea: HTMLElement | undefined = $state();

  let hintTimer: ReturnType<typeof setTimeout> | undefined;
  let nextTimer: ReturnType<typeof setTimeout> | undefined;

  const target = $derived(q ? hintTarget(q.answer, q.aLang, session.settings.articles) : '');
  const wrongOptions = $derived(q ? q.options.filter((o) => o !== q.answer) : []);
  const hintTotal = $derived(!q ? 0 : q.mode === 'type' ? letterCount(target) : wrongOptions.length);
  const timing = $derived(q && isLearn ? hintTimes(q.mode === 'type' ? 'type' : 'choose', session.settings.hintSpeed) : null);

  const needsCopy = $derived(
    isLearn && session.settings.copyAfterWrong && session.phase === 'feedback' && !!last && (last.kind === 'wrong' || last.kind === 'revealed'),
  );
  const copyOk = $derived(
    !!q &&
      matchAnswer(copyText, q.accepted, { lang: q.aLang, spelling: 'lenient', articles: session.settings.articles }).kind === 'exact',
  );
  const canContinue = $derived(session.phase === 'feedback' && (!needsCopy || copyOk));
  const good = $derived(!!last && (last.kind === 'right' || last.kind === 'typo'));

  const leaves = $derived(Math.min(session.total, 20));
  const done = $derived(session.index + (session.phase === 'feedback' ? 1 : 0));

  /* ───── a new question ───── */

  $effect(() => {
    // Runs when a new question is shown or its intro card is dismissed.
    if (session.phase !== 'question' || !session.question) return;
    session.index;
    untrack(() => {
      typed = '';
      copyText = '';
      hintShown = 0;
      faded = [];
      chosen = null;
      scheduleHint(true);
      tick().then(() => answerInput?.focus());
    });
    return () => clearTimeout(hintTimer);
  });

  function scheduleHint(first: boolean) {
    clearTimeout(hintTimer);
    if (!timing || session.phase !== 'question') return;
    hintTimer = setTimeout(stepHint, first || hintShown === 0 ? timing.first : timing.next);
  }

  function stepHint() {
    if (!q || session.phase !== 'question') return;
    if (hintShown === 0) bubble = pick(tr().buddyHint);
    if (q.mode === 'type') {
      hintShown++;
    } else {
      const left = wrongOptions.filter((o) => !faded.includes(o));
      faded = [...faded, left[Math.floor(Math.random() * left.length)]];
      hintShown = faded.length;
    }
    if (hintShown >= hintTotal) after(session.reveal());
    else scheduleHint(false);
  }

  /* ───── answering ───── */

  function submitTyped() {
    if (session.phase !== 'question' || !typed.trim()) return;
    after(session.answerText(typed, hintShown, hintTotal));
  }

  function choose(option: string) {
    if (session.phase !== 'question' || faded.includes(option)) return;
    chosen = option;
    after(session.answerOption(option, hintShown, hintTotal));
  }

  function skip() {
    const r = session.skip();
    if (r) after(r);
  }

  function after(r: AnswerRecord) {
    clearTimeout(hintTimer);
    answeredAt = performance.now();
    onanswer?.(r);
    if (quietTest) {
      next();
      return;
    }
    const isGood = r.kind === 'right' || r.kind === 'typo';
    const total = r.coins + r.streakBonus;
    if (isGood) {
      praise = pick(tr().praise);
      bubble = pick(tr().buddyRight);
      mood++;
      playRight(session.streak);
      if (total > 0) {
        coinDrop(answerArea ?? null, Math.min(15, Math.max(3, Math.ceil(total / 3))));
        playCoins(total);
      }
      if (r.streakBonus) {
        banner = fmt(tr().streakBanner, { n: session.streak, c: r.streakBonus });
        setTimeout(() => (banner = ''), 1800);
      }
      if (!r.other) nextTimer = setTimeout(next, r.kind === 'typo' || r.hinted ? 2600 : 1500);
    } else {
      bubble = pick(tr().buddyWrong);
      playWrong();
      if (needsCopyFor(r)) tick().then(() => copyInput?.focus());
    }
  }

  const needsCopyFor = (r: AnswerRecord) => isLearn && session.settings.copyAfterWrong && (r.kind === 'wrong' || r.kind === 'revealed');

  function next() {
    clearTimeout(nextTimer);
    session.next();
    if (session.phase === 'done') onend();
  }

  function proceed() {
    if (canContinue && performance.now() - answeredAt > 250) next();
  }

  function quit() {
    if (session.records.length && !confirm(tr().quitConfirm)) return;
    clearTimeout(hintTimer);
    clearTimeout(nextTimer);
    session.stop();
    onend();
  }

  function onKey(e: KeyboardEvent) {
    if (e.defaultPrevented) return;
    if (session.phase === 'intro' && e.key === 'Enter') {
      e.preventDefault();
      session.dismissIntro();
    } else if (session.phase === 'feedback' && (e.key === 'Enter' || (e.key === ' ' && document.activeElement !== copyInput))) {
      e.preventDefault();
      proceed();
    } else if (session.phase === 'question' && q && q.mode !== 'type' && /^[1-8]$/.test(e.key)) {
      const option = q.options[Number(e.key) - 1];
      if (option) choose(option);
    }
  }

  function onTypedKey(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitTyped();
    }
  }

  function onTypedInput() {
    // Typing means thinking: the hint waits again.
    scheduleHint(false);
  }

  function tileClass(option: string): string {
    if (session.phase !== 'feedback') return faded.includes(option) ? 'ghost' : '';
    if (q && option === q.answer) return 'right';
    if (option === chosen) return 'wrong';
    return faded.includes(option) ? 'ghost' : '';
  }

  const dirLabel = $derived(q ? `${langName(q.qLang)} → ${langName(q.aLang)}` : '');
</script>

<svelte:window onkeydown={onKey} />

<main class="screen game">
  <Scenery />
  <header class="topbar">
    <div class="left">
      <button class="icon-btn" onclick={quit} aria-label={tr().close}>✕</button>
      <div class="progress">
        <span class="count">
          {#if isLearn}{Math.min(session.index + 1, session.total)} / {session.total}{:else}{fmt(tr().testQuestion, {
              n: Math.min(session.index + 1, session.total),
              total: session.total,
            })}{/if}
        </span>
        {#if session.total <= 20}
          <div class="leaves" aria-hidden="true">
            {#each Array(leaves) as _, i (i)}<span class:on={i < done}>🍃</span>{/each}
          </div>
        {:else}
          <div class="bar" aria-hidden="true"><div style:width="{(100 * done) / session.total}%"></div></div>
        {/if}
      </div>
    </div>
    <div class="right">
      {#if session.streak > 0 && !quietTest}
        <span class="chip gold streak">☀️ {fmt(tr().streakChip, { n: session.streak })}</span>
      {/if}
      <CoinCounter value={coinsBefore + session.coins} />
    </div>
  </header>

  {#if banner}
    <div class="banner wiggle" role="status">{banner}</div>
  {/if}

  {#if q}
    <section class="stage">
      <div class="card qcard" bind:this={answerArea}>
        {#if session.phase === 'intro'}
          <div class="center">
            <span class="chip sky">✨ {tr().introTitle}</span>
            <p class="word display">{q.prompt}</p>
            {#if q.hint}<p class="hint-text">({q.hint})</p>{/if}
            <p class="intro-arrow" aria-hidden="true">↓</p>
            <p class="word display answer-word">{q.accepted.join(' / ')}</p>
            <button class="btn big block" onclick={() => session.dismissIntro()}>{tr().introGo}</button>
          </div>
        {:else}
          <div class="center">
            <span class="chip sky">{dirLabel}</span>
            <h1 class="word">{q.prompt}</h1>
            {#if q.hint}<p class="hint-text">({q.hint})</p>{/if}
          </div>

          {#if q.mode === 'type'}
            <div class="type-row">
              <input
                bind:this={answerInput}
                bind:value={typed}
                class="input answer"
                placeholder={tr().typePlaceholder}
                autocomplete="off"
                autocapitalize="off"
                spellcheck="false"
                disabled={session.phase !== 'question'}
                onkeydown={onTypedKey}
                oninput={onTypedInput}
                aria-label={tr().typePlaceholder}
              />
              <button class="btn big" onclick={submitTyped} disabled={session.phase !== 'question' || !typed.trim()}>{tr().check}</button>
            </div>
          {:else}
            <div class="tiles" class:eight={q.mode === 'choose8'}>
              {#each q.options as option, i (option)}
                <button class="tile {tileClass(option)}" onclick={() => choose(option)} disabled={session.phase !== 'question' || faded.includes(option)}>
                  <span class="key" aria-hidden="true">{i + 1}</span>{option}
                </button>
              {/each}
            </div>
          {/if}

          <div class="under">
            <span class="mask display" aria-live="polite">
              {#if q.mode === 'type' && hintShown > 0 && session.phase === 'question'}{maskAnswer(target, hintShown)}{/if}
            </span>
            {#if isLearn && session.phase === 'question'}
              <button class="link-btn" onclick={skip} disabled={session.skipsLeft <= 0}>{fmt(tr().skip, { n: session.skipsLeft })}</button>
            {/if}
          </div>
        {/if}
      </div>

      {#if session.phase === 'feedback' && last}
        {#if good}
          <div class="panel good feedback">
            <div class="row between">
              <span class="display praise">
                {praise}
                {#if last.coins + last.streakBonus > 0}+{last.coins + last.streakBonus}{/if}
                {#if last.hinted}<small>({tr().withHint})</small>{/if}
              </span>
              <span class="answer-chip">{q.answer}</span>
            </div>
            {#if last.kind === 'typo'}
              <div class="row typo">
                <span class="muted strong">{tr().typoGood}</span>
                <SpellingDiff typed={last.typed} correct={last.form ?? q.answer} />
              </div>
            {/if}
            <button class="btn block go" onclick={proceed}>{tr().next}</button>
          </div>
        {:else}
          <div class="panel bad feedback">
            <p class="display wrong-line">
              {last.kind === 'revealed' ? tr().revealed : tr().rightAnswer}
              <span class="right-word">{q.accepted.join(' / ')}</span>
            </p>
            {#if last.other}
              <p class="other">{fmt(tr().otherWord, { typed: last.typed, meaning: last.other.meaning })}</p>
            {/if}
            {#if needsCopy}
              <label class="field">
                {tr().copyStep}
                <input
                  bind:this={copyInput}
                  bind:value={copyText}
                  class="input copy"
                  class:ok={copyOk}
                  autocomplete="off"
                  autocapitalize="off"
                  spellcheck="false"
                />
              </label>
            {/if}
            <button class="btn block go" onclick={proceed} disabled={!canContinue}>{tr().next}</button>
          </div>
        {/if}
      {/if}
    </section>
  {/if}

  <Buddy emoji={buddy} text={bubble} {mood} />
</main>

<style>
  .game {
    padding-bottom: 140px;
  }
  .progress {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .count {
    font-weight: 800;
    font-size: 15px;
    color: var(--ink-soft);
  }
  .leaves {
    display: flex;
    gap: 2px;
    font-size: 12px;
  }
  .leaves span {
    filter: grayscale(1);
    opacity: 0.3;
    transition:
      opacity 0.3s,
      filter 0.3s;
  }
  .leaves span.on {
    filter: none;
    opacity: 1;
  }
  .bar {
    width: 180px;
    height: 10px;
    border-radius: 999px;
    background: var(--leaf-light);
    overflow: hidden;
  }
  .bar div {
    height: 100%;
    background: var(--leaf);
    border-radius: 999px;
    transition: width 0.4s;
  }
  .banner {
    position: fixed;
    top: 84px;
    left: 50%;
    z-index: 80;
    translate: -50% 0;
    padding: 8px 20px;
    border-radius: 999px;
    background: var(--gold);
    box-shadow: 0 4px 0 var(--gold-dark);
    font-weight: 800;
    font-size: 18px;
  }
  .stage {
    max-width: 600px;
    margin: 12px auto 0;
  }
  .qcard {
    padding: 28px 32px;
  }
  .center {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .word {
    margin: 18px 0 4px;
    font-family: var(--display);
    font-weight: 600;
    font-size: clamp(38px, 7vw, 60px);
    line-height: 1.1;
    overflow-wrap: anywhere;
  }
  .hint-text {
    margin: 0;
    color: var(--ink-soft);
    font-weight: 700;
    font-size: 19px;
  }
  .answer-word {
    color: var(--leaf);
    margin: 0 0 24px;
  }
  .intro-arrow {
    margin: 4px 0 0;
    font-size: 28px;
    color: var(--ink-soft);
  }
  .type-row {
    display: flex;
    gap: 12px;
    margin-top: 22px;
  }
  .answer {
    flex: 1;
    min-width: 0;
    height: 68px;
    font-size: 28px;
    letter-spacing: 0.02em;
  }
  .tiles {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 22px;
  }
  .tiles .tile {
    position: relative;
    min-height: 86px;
    padding: 10px 14px;
    font-size: 25px;
    overflow-wrap: anywhere;
  }
  .tiles.eight {
    grid-template-columns: repeat(4, 1fr);
  }
  .tiles.eight .tile {
    min-height: 76px;
    font-size: 20px;
  }
  .key {
    position: absolute;
    top: 6px;
    left: 10px;
    font-family: var(--body);
    font-size: 12px;
    font-weight: 800;
    opacity: 0.35;
  }
  .under {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 32px;
    margin-top: 14px;
  }
  .mask {
    color: var(--sky);
    font-size: 22px;
    letter-spacing: 0.08em;
    white-space: pre;
  }
  .feedback {
    margin-top: 16px;
  }
  .between {
    justify-content: space-between;
  }
  .praise {
    font-size: 26px;
    color: var(--leaf-dark);
  }
  .praise small {
    font-size: 15px;
    font-family: var(--body);
    font-weight: 700;
  }
  .answer-chip {
    padding: 6px 14px;
    border-radius: 12px;
    background: #fff;
    color: var(--leaf-dark);
    font-weight: 800;
    font-size: 19px;
  }
  .typo {
    margin-top: 10px;
  }
  .strong {
    font-weight: 800;
  }
  .wrong-line {
    margin: 0 0 12px;
    font-size: 22px;
    color: var(--coral-dark);
  }
  .right-word {
    color: var(--ink);
    background: #fff;
    padding: 2px 12px;
    border-radius: 10px;
    margin-left: 4px;
  }
  .other {
    margin: 0 0 12px;
    font-weight: 700;
  }
  .copy {
    background: #fff;
    font-size: 20px;
  }
  .copy.ok {
    border-color: var(--leaf);
    background: var(--leaf-light);
  }
  .go {
    margin-top: 16px;
  }
  @media (max-width: 640px) {
    .qcard {
      padding: 20px 16px;
    }
    .type-row {
      flex-direction: column;
    }
    .tiles.eight {
      grid-template-columns: 1fr 1fr;
    }
    .tiles .tile {
      min-height: 64px;
      font-size: 20px;
    }
    .streak {
      display: none;
    }
  }
</style>
