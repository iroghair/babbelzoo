<!-- End of a learning session (coins, food, words to practise) or a test (grade, mistakes). -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { celebrate } from '../lib/fx';
  import { fmt, gradeText, tr } from '../lib/i18n.svelte';
  import { profile } from '../lib/profile.svelte';
  import type { SessionSummary } from '../lib/rewards';
  import type { GameSession } from '../lib/session.svelte';
  import { playFanfare } from '../lib/sound';
  import CoinCounter from './CoinCounter.svelte';
  import Scenery from './Scenery.svelte';

  let {
    session,
    summary,
    buddy,
    onagain,
    onpractise,
    onhouse,
    onhome,
  }: {
    session: GameSession;
    summary: SessionSummary;
    buddy: string;
    onagain: () => void;
    onpractise: (entryIds: string[]) => void;
    onhouse: () => void;
    onhome: () => void;
  } = $props();

  const isTest = $derived(session.path === 'test');
  const mistakes = $derived(session.mistakes);
  const newlyKnown = $derived(Math.max(0, summary.after.known - summary.before.known));
  const pct = $derived(summary.after.total ? (100 * summary.after.known) / summary.after.total : 0);
  const grade = $derived(session.grade);
  const remark = $derived(grade >= 8 ? tr().gradeGreat : grade >= 6 ? tr().gradeGood : tr().gradeOk);

  const coinsShown = new Tween(0, { duration: 900, easing: cubicOut });

  onMount(() => {
    if (summary.stopped) return;
    coinsShown.set(summary.coins + summary.daily, { delay: 300 });
    playFanfare();
    celebrate(isTest && session.grade >= 7);
  });

  function markOf(kind: string): string {
    return kind === 'typo' ? tr().typoMark : kind === 'skipped' ? tr().skippedMark : tr().wrongMark;
  }
</script>

<main class="screen">
  <Scenery />
  <header class="topbar">
    <div class="left">
      <button class="icon-btn" onclick={onhome} aria-label={tr().toHome}>✕</button>
      <h2 class="title">{isTest ? tr().testDone : tr().sessionDone}</h2>
    </div>
    <div class="right"><CoinCounter value={profile.data.wallet.coins} /></div>
  </header>

  <div class="wrap col">
    {#if isTest}
      <section class="card top test-top">
        <div class="grade-col">
          <div class="medal" class:pop={!summary.stopped}>
            <span class="star s1">⭐</span><span class="star s2">⭐</span>
            <span class="display grade">{gradeText(grade)}</span>
            <span class="grade-label">{tr().yourGrade}</span>
          </div>
          <p class="remark display">{remark}</p>
          <p class="muted strong">{fmt(tr().rightOfTotal, { n: session.rightCount, total: session.total })} · {session.list.name}</p>
        </div>
        <div class="side">
          <div class="rewards two">
            <div class="reward gold">
              <span class="coin-icon r-coin"></span>
              <span><b class="display">+{Math.round(coinsShown.current)}</b><small>{tr().coinsEarned}</small></span>
            </div>
            <div class="reward wood">
              <span class="r-icon">🥣</span>
              <span><b class="display">+{summary.food}</b><small>{tr().foodEarned}</small></span>
            </div>
          </div>
          {#if summary.unicorn}
            <div class="unicorn unlocked">
              <span class="token">🦄</span>
              <p class="strong">{tr().unicornUnlocked}</p>
            </div>
          {:else if profile.data.milestones.bestGrade < 9}
            <div class="unicorn">
              <span class="token">🦄</span>
              <div class="grow">
                <p class="strong">{tr().unicornTeaser}</p>
                <div class="ubar"><div style:width="{Math.min(100, (100 * grade) / 9)}%"></div></div>
                <p class="small">{fmt(tr().unicornProgress, { grade: gradeText(grade) })}</p>
              </div>
            </div>
          {/if}
          {#if summary.daily}
            <p class="daily">☀️ {fmt(summary.dayStreak > 1 ? tr().dailyBonus : tr().dailyBonusOne, { c: summary.daily, n: summary.dayStreak })}</p>
          {/if}
        </div>
      </section>

      <section class="card">
        <div class="row between">
          <h3>{tr().mistakes}</h3>
          {#if mistakes.length}<span class="chip coral">{fmt(tr().wordsChip, { n: mistakes.length })}</span>{/if}
        </div>
        {#if !mistakes.length}
          <p class="strong all-right">{tr().noMistakes} 🎉</p>
        {/if}
        {#each mistakes as m (m.q.entry.id)}
          <div class="mistake">
            <span class="q">{m.q.prompt}</span>
            <span class="fix">
              {#if m.typed}<s class="typed display">{m.typed}</s> →{/if}
              <span class="display right">{m.q.answer}</span>
            </span>
            <span class="chip coral mark">{markOf(m.kind)}</span>
          </div>
        {/each}
      </section>

      <div class="row buttons">
        {#if mistakes.length}
          <button class="btn big" onclick={() => onpractise(mistakes.map((m) => m.q.entry.id))}>🎯 {tr().practiseMistakes}</button>
        {/if}
        <button class="btn big sky" onclick={onagain}>🔁 {tr().testAgain}</button>
        <button class="btn big plain" onclick={onhome}>{tr().toHome}</button>
      </div>
    {:else}
      <section class="card top learn-top">
        <span class="token buddy">{buddy}</span>
        <h1>{tr().sessionDone}</h1>
        {#if summary.stopped}
          <p class="muted">{tr().noFoodStopped}</p>
        {:else}
          <p class="muted">{tr().rewardLine}</p>
        {/if}
        <div class="rewards three">
          <div class="reward gold col-r">
            <span class="coin-icon r-coin"></span>
            <b class="display">+{Math.round(coinsShown.current) || summary.coins}</b><small>{tr().coinsEarned}</small>
          </div>
          <div class="reward wood col-r">
            <span class="r-icon">🥣</span>
            <b class="display">+{summary.food}</b><small>{tr().foodEarned}</small>
          </div>
          <div class="reward leaf col-r">
            <span class="r-icon">🔥</span>
            <b class="display">{session.bestStreak}</b><small>{tr().longestStreakLabel}</small>
          </div>
        </div>
        {#if summary.daily}
          <p class="daily">☀️ {fmt(summary.dayStreak > 1 ? tr().dailyBonus : tr().dailyBonusOne, { c: summary.daily, n: summary.dayStreak })}</p>
        {/if}
        <div class="list-progress">
          <div class="row between">
            <span class="display lname">{session.list.name}</span>
            <span class="strong"><b class="leafc">{summary.after.known}</b> / {summary.after.total}</span>
          </div>
          <div class="pbar"><div style:width="{pct}%"></div></div>
          {#if newlyKnown}<span class="chip leaf">✨ {fmt(tr().newlyKnown, { n: newlyKnown })}</span>{/if}
        </div>
        <div class="practise">
          <h3>{mistakes.length ? tr().practiseThese : tr().allRight}</h3>
          <div class="words">
            {#each mistakes as m (m.q.entry.id)}
              <div class="word-chip"><span>{m.q.prompt}</span><span class="w-ans">{m.q.answer}</span></div>
            {/each}
          </div>
        </div>
      </section>
      <div class="row buttons">
        <button class="btn big" onclick={onagain}>{tr().again}</button>
        <button class="btn big wood" onclick={onhouse}>🥣 {tr().feedAnimals}</button>
        <button class="btn big plain" onclick={onhome}>{tr().toHome}</button>
      </div>
    {/if}
  </div>
</main>

<style>
  .title {
    font-size: 24px;
  }
  .col {
    max-width: 780px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .strong {
    font-weight: 800;
  }
  .between {
    justify-content: space-between;
  }
  .learn-top {
    text-align: center;
    margin-top: 36px;
    padding-top: 0;
  }
  .buddy {
    width: 96px;
    height: 96px;
    font-size: 50px;
    margin-top: -48px;
    animation: hop 0.8s var(--pop) 0.3s;
  }
  .learn-top h1 {
    font-size: 34px;
    margin-top: 10px;
  }
  .rewards {
    display: grid;
    gap: 12px;
    margin: 18px 0 12px;
  }
  .rewards.three {
    grid-template-columns: repeat(3, 1fr);
  }
  .rewards.two {
    grid-template-columns: 1fr 1fr;
    margin: 0;
  }
  .reward {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border-radius: 18px;
    animation: slide-up 0.5s var(--pop) both;
  }
  .reward:nth-child(2) {
    animation-delay: 0.15s;
  }
  .reward:nth-child(3) {
    animation-delay: 0.3s;
  }
  .col-r {
    flex-direction: column;
    gap: 2px;
  }
  .reward b {
    font-size: 30px;
    display: block;
  }
  .reward small {
    display: block;
    font-weight: 800;
    font-size: 14px;
    color: var(--ink-soft);
  }
  .reward.gold {
    background: var(--gold-light);
  }
  .reward.gold b {
    color: var(--gold-dark);
  }
  .reward.wood {
    background: var(--wood-light);
  }
  .reward.wood b {
    color: var(--wood);
  }
  .reward.leaf {
    background: var(--leaf-light);
  }
  .reward.leaf b {
    color: var(--leaf-dark);
  }
  .r-coin {
    width: 38px;
    height: 38px;
  }
  .r-icon {
    font-size: 34px;
  }
  .daily {
    margin: 0;
    padding: 12px;
    border-radius: 14px;
    background: var(--gold-light);
    font-weight: 800;
  }
  .list-progress {
    margin-top: 14px;
    padding: 16px;
    border-radius: 18px;
    background: var(--surface-alt);
    text-align: left;
  }
  .lname {
    font-size: 19px;
  }
  .leafc {
    color: var(--leaf);
  }
  .pbar {
    height: 14px;
    margin: 10px 0;
    border-radius: 999px;
    background: #fff;
    overflow: hidden;
  }
  .pbar div {
    height: 100%;
    border-radius: 999px;
    background: var(--leaf);
    transition: width 1s ease 0.4s;
  }
  .practise {
    margin-top: 18px;
    text-align: left;
  }
  .practise h3 {
    font-size: 20px;
    margin-bottom: 10px;
  }
  .words {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .word-chip {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    padding: 12px 16px;
    border-radius: 14px;
    background: var(--coral-light);
    font-weight: 800;
  }
  .w-ans {
    color: var(--coral-dark);
  }
  .buttons {
    justify-content: center;
  }
  /* test */
  .test-top {
    display: grid;
    grid-template-columns: 260px 1fr;
    gap: 24px;
    align-items: center;
  }
  .grade-col {
    text-align: center;
  }
  .medal {
    position: relative;
    width: 180px;
    height: 180px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #ffe9a8, var(--gold) 60%);
    border: 6px solid var(--gold-dark);
    box-shadow: 0 8px 0 rgba(217, 154, 0, 0.35);
  }
  .medal.pop {
    animation: bounce 0.7s var(--pop) 0.2s both;
  }
  .grade {
    font-size: 62px;
    line-height: 1;
  }
  .grade-label {
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }
  .star {
    position: absolute;
    font-size: 26px;
  }
  .s1 {
    top: -4px;
    left: 4px;
  }
  .s2 {
    bottom: 6px;
    right: -4px;
  }
  .remark {
    margin: 14px 0 2px;
    font-size: 20px;
    color: var(--leaf-dark);
  }
  .side {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .unicorn {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    border-radius: 18px;
    background: var(--sky-light);
    border: 2px dashed var(--sky);
  }
  .unicorn.unlocked {
    background: var(--gold-light);
    border-color: var(--gold);
  }
  .unicorn p {
    margin: 0;
  }
  .unicorn .token {
    background: #fff;
    width: 54px;
    height: 54px;
    font-size: 30px;
  }
  .grow {
    flex: 1;
  }
  .ubar {
    height: 10px;
    margin: 8px 0 4px;
    border-radius: 999px;
    background: #fff;
    overflow: hidden;
  }
  .ubar div {
    height: 100%;
    background: var(--sky);
  }
  h3 {
    font-size: 21px;
  }
  .all-right {
    margin: 10px 0 0;
  }
  .mistake {
    display: grid;
    grid-template-columns: 1fr 1.6fr auto;
    gap: 12px;
    align-items: center;
    padding: 12px 0;
    border-bottom: 2px solid var(--surface-alt);
    font-weight: 800;
  }
  .mistake:last-child {
    border-bottom: none;
  }
  .typed {
    color: var(--coral);
    margin-right: 4px;
  }
  .right {
    color: var(--leaf);
    font-size: 19px;
  }
  .mark {
    font-size: 13px;
    padding: 4px 10px;
  }
  @media (max-width: 700px) {
    .test-top {
      grid-template-columns: 1fr;
    }
    .rewards.three {
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
    }
    .reward b {
      font-size: 24px;
    }
    .words {
      grid-template-columns: 1fr;
    }
    .mistake {
      grid-template-columns: 1fr auto;
    }
    .mistake .fix {
      grid-column: 1 / -1;
      grid-row: 2;
    }
  }
</style>
