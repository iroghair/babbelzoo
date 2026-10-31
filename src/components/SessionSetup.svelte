<!-- Choosing direction, answer modes and length before a session (PLAN.md 3.1, 3.2, 4). -->
<script lang="ts">
  import { untrack } from 'svelte';
  import { fmt, langName, tr } from '../lib/i18n.svelte';
  import { modeAvailable } from '../lib/questions';
  import type { Path } from '../lib/session.svelte';
  import type { Dir, DirSetting, ListSetup, Mode, WordList } from '../lib/types';
  import Scenery from './Scenery.svelte';

  let {
    list,
    path,
    setup,
    onstart,
    onback,
  }: { list: WordList; path: Path; setup: ListSetup; onstart: (setup: ListSetup) => void; onback: () => void } = $props();

  let dir: DirSetting = $state(untrack(() => setup.dir));
  let auto = $state(untrack(() => setup.modes === 'auto'));
  let modes: Mode[] = $state(untrack(() => (path === 'test' ? [...setup.testModes] : setup.modes === 'auto' ? [] : [...setup.modes])));
  let length: 10 | 20 = $state(untrack(() => setup.length));

  const dirs = $derived<Dir[]>(dir === 'both' ? ['ab', 'ba'] : [dir]);
  const usable = (m: Mode) => modeAvailable(list, m, dirs);

  const MODES: { mode: Mode; icon: string }[] = [
    { mode: 'choose4', icon: '🃏' },
    { mode: 'choose8', icon: '🧩' },
    { mode: 'type', icon: '⌨️' },
  ];

  const chosen = $derived(modes.filter(usable));
  const ready = $derived((path === 'learn' && auto) || chosen.length > 0);

  function toggle(m: Mode) {
    auto = false;
    modes = modes.includes(m) ? modes.filter((x) => x !== m) : [...modes, m];
  }

  function chooseAuto() {
    auto = true;
    modes = [];
  }

  function start() {
    if (!ready) return;
    onstart(
      path === 'learn'
        ? { ...setup, dir, modes: auto ? 'auto' : chosen, length }
        : { ...setup, dir, testModes: chosen },
    );
  }
</script>

<main class="screen">
  <Scenery />
  <header class="topbar">
    <div class="left">
      <button class="icon-btn" onclick={onback} aria-label={tr().back}>←</button>
      <div>
        <h1>{path === 'learn' ? tr().setupLearnTitle : tr().setupTestTitle}</h1>
        <p class="muted list-name">{list.name} · {fmt(tr().wordsCount, { n: list.entries.length })}</p>
      </div>
    </div>
    <div class="right">
      <button class="btn" class:sky={path === 'test'} onclick={start} disabled={!ready}>{path === 'learn' ? tr().start : tr().startTest}</button>
    </div>
  </header>

  <div class="wrap narrow">
    <section class="card">
      <h2>{tr().direction}</h2>
      <div class="seg">
        <button aria-pressed={dir === 'ab'} onclick={() => (dir = 'ab')}>{langName(list.langA)} → {langName(list.langB)}</button>
        <button aria-pressed={dir === 'ba'} onclick={() => (dir = 'ba')}>{langName(list.langB)} → {langName(list.langA)}</button>
        <button aria-pressed={dir === 'both'} onclick={() => (dir = 'both')}>⇄ {tr().both}</button>
      </div>
    </section>

    <section class="card">
      <h2>{tr().modes}</h2>
      <p class="muted small">{tr().modesHint}</p>
      <div class="modes">
        {#if path === 'learn'}
          <button class="tile mode auto" class:selected={auto} aria-pressed={auto} onclick={chooseAuto}>
            <span class="icon">🎯</span>
            <span class="label">{tr().auto}</span>
            <span class="sub">{tr().autoHint}</span>
          </button>
        {/if}
        {#each MODES as { mode, icon } (mode)}
          {@const on = !auto && modes.includes(mode) && usable(mode)}
          <button class="tile mode" class:selected={on} aria-pressed={on} disabled={!usable(mode)} onclick={() => toggle(mode)}>
            <span class="icon">{icon}</span>
            <span class="label">{tr()[mode]}</span>
            {#if !usable(mode)}<span class="sub">{tr().modeTooFew}</span>{/if}
          </button>
        {/each}
      </div>
    </section>

    {#if path === 'learn'}
      <section class="card">
        <h2>{tr().length}</h2>
        <div class="seg">
          {#each [10, 20] as const as n (n)}
            <button aria-pressed={length === n} onclick={() => (length = n)}>{fmt(tr().questionsN, { n })} · 🥣 {n === 20 ? 2 : 1}</button>
          {/each}
        </div>
      </section>
    {:else}
      <p class="panel info test-info">✏️ {tr().testInfo}</p>
    {/if}

    <button class="btn big block start" class:sky={path === 'test'} onclick={start} disabled={!ready}>
      {path === 'learn' ? tr().start : tr().startTest}
    </button>
  </div>
</main>

<style>
  h1 {
    font-size: 30px;
  }
  h2 {
    font-size: 21px;
    margin-bottom: 10px;
  }
  .list-name {
    margin: 2px 0 0;
    font-weight: 700;
  }
  .narrow {
    max-width: 720px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .small {
    margin: -6px 0 12px;
  }
  .modes {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  .mode {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-height: 110px;
    padding: 12px;
    text-align: center;
  }
  .mode.auto {
    grid-column: 1 / -1;
    min-height: 88px;
  }
  .icon {
    font-size: 30px;
  }
  .label {
    font-size: 20px;
  }
  .sub {
    font-family: var(--body);
    font-size: 14px;
    font-weight: 700;
    color: var(--ink-soft);
  }
  .test-info {
    margin: 0;
    font-weight: 700;
  }
  .start {
    margin-top: 4px;
  }
  @media (max-width: 640px) {
    .modes {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
