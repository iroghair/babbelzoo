<!-- The player's home: wallet, the four big actions, and the word lists with progress. -->
<script lang="ts">
  import { animalById, TIER_BG } from '../data/animals';
  import { fmt, langCode, tr } from '../lib/i18n.svelte';
  import { lists } from '../lib/lists.svelte';
  import { currentPlayer, listStats, profile, READY_SHARE } from '../lib/profile.svelte';
  import type { Path } from '../lib/session.svelte';
  import type { WordList } from '../lib/types';
  import CoinCounter from './CoinCounter.svelte';
  import Scenery from './Scenery.svelte';
  import SharePanel from './SharePanel.svelte';

  let {
    oneditlist,
    onplay,
    onshop,
    onhouse,
    onsettings,
    onswitch,
  }: {
    oneditlist: (id: string | null) => void;
    onplay: (id: string, path: Path) => void;
    onshop: () => void;
    onhouse: () => void;
    onsettings: () => void;
    onswitch: () => void;
  } = $props();

  let sharing: WordList | null = $state(null);

  const player = $derived(currentPlayer());
  const wallet = $derived(profile.data.wallet);
  const selected = $derived(lists.all.find((l) => l.id === profile.data.lastListId) ?? lists.all[0]);
  const owned = $derived(profile.data.owned);
  const preview = $derived(owned.slice(-3).map((o) => animalById(o.animalId)).filter((a) => !!a));

  function select(list: WordList) {
    profile.data.lastListId = list.id;
  }

  function play(list: WordList | undefined, path: Path) {
    if (!list) return;
    select(list);
    onplay(list.id, path);
  }
</script>

<main class="screen">
  <Scenery />
  <header class="topbar">
    <div class="left">
      <span class="token me">{player?.avatar}</span>
      <div class="who">
        <span class="display pname">{player?.name}</span>
        <button class="link-btn switch" onclick={onswitch}>{tr().switchPlayer}</button>
      </div>
    </div>
    <div class="right">
      {#if wallet.dayStreak > 0}
        <span class="chip coral" title="streak">🔥 {wallet.dayStreak === 1 ? tr().day : fmt(tr().days, { n: wallet.dayStreak })}</span>
      {/if}
      <span class="chip wood">🥣 {fmt(tr().food, { n: wallet.food })}</span>
      <CoinCounter value={wallet.coins} />
      <button class="icon-btn" onclick={onsettings} aria-label={tr().settings}>⚙️</button>
    </div>
  </header>

  <div class="wrap">
    <h1 class="hello">{fmt(tr().hello, { name: player?.name ?? '' })} 👋</h1>

    <div class="tiles">
      <button class="big-tile leaf" onclick={() => play(selected, 'learn')} disabled={!selected}>
        <span class="tile-icon">▶️</span>
        <span>
          <span class="tile-title">{tr().tileLearn}</span>
          <span class="tile-sub">{selected?.name ?? tr().pickList}</span>
        </span>
      </button>
      <button class="big-tile sky" onclick={() => play(selected, 'test')} disabled={!selected}>
        <span class="tile-icon">✏️</span>
        <span>
          <span class="tile-title">{tr().tileTest}</span>
          <span class="tile-sub">{tr().tileTestSub}</span>
        </span>
      </button>
      <button class="big-tile gold" onclick={onshop}>
        <span class="tile-icon">🛒</span>
        <span>
          <span class="tile-title">{tr().tileShop}</span>
          <span class="tile-sub">{tr().tileShopSub}</span>
        </span>
      </button>
      <button class="big-tile wood" onclick={onhouse}>
        {#if preview.length}
          <span class="mini">
            {#each preview as a, i (i)}<span class="token" style:background={TIER_BG[a.tier]}>{a.emoji}</span>{/each}
          </span>
        {:else}
          <span class="tile-icon">🏡</span>
        {/if}
        <span>
          <span class="tile-title">{tr().tileHouse}</span>
          <span class="tile-sub">
            {owned.length === 0 ? tr().tileHouseEmpty : owned.length === 1 ? tr().tileHouseSubOne : fmt(tr().tileHouseSub, { n: owned.length })}
          </span>
        </span>
      </button>
    </div>

    <h2 class="section">{tr().myLists}</h2>
    <div class="lists">
      {#each lists.all as list (list.id)}
        {@const s = listStats(list)}
        {@const pct = s.total ? (100 * s.known) / s.total : 0}
        <article class="card list-card" class:selected={list.id === selected?.id}>
          <button class="select" onclick={() => select(list)} aria-label={list.name}></button>
          <div class="head">
            <div>
              <h3>{list.name}</h3>
              <p class="muted small meta">{fmt(tr().wordsCount, { n: list.entries.length })} · {langCode(list.langA)} ↔ {langCode(list.langB)}</p>
            </div>
            <div class="row tools">
              <button class="icon-btn" onclick={() => (sharing = list)} aria-label={tr().share}>🔗</button>
              <button class="icon-btn" onclick={() => oneditlist(list.id)} aria-label={tr().edit}>✎</button>
            </div>
          </div>
          {#if s.total && s.known / s.total >= READY_SHARE}
            <span class="chip gold ready">✨ {tr().readyForTest}</span>
          {/if}
          <p class="known">{fmt(tr().knownOf, { n: s.known, total: s.total })}</p>
          <div class="bar"><div style:width="{pct}%"></div></div>
          <div class="row chips">
            <span class="chip leaf">{fmt(tr().chipKnown, { n: s.known })}</span>
            <span class="chip sky">{fmt(tr().chipLearning, { n: s.learning })}</span>
            <span class="chip plain">{fmt(tr().chipNew, { n: s.fresh })}</span>
          </div>
          <div class="row actions">
            <button class="btn" onclick={() => play(list, 'learn')}>{tr().tileLearn}</button>
            <button class="btn sky" onclick={() => play(list, 'test')}>{tr().tileTest}</button>
          </div>
        </article>
      {/each}
      <button class="new-list" onclick={() => oneditlist(null)}>＋ {tr().newList}</button>
    </div>
  </div>
  {#if sharing}
    <SharePanel list={sharing} onclose={() => (sharing = null)} />
  {/if}
</main>

<style>
  .me {
    width: 52px;
    height: 52px;
    font-size: 28px;
  }
  .who {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    line-height: 1.1;
  }
  .pname {
    font-size: 20px;
  }
  .switch {
    padding: 0;
    font-size: 13px;
    font-weight: 800;
  }
  .hello {
    font-size: 32px;
    margin: 4px 0 18px;
  }
  .tiles {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 28px;
  }
  .big-tile {
    --edge: var(--leaf-dark);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    min-height: 150px;
    padding: 18px;
    border: none;
    border-radius: 24px;
    text-align: left;
    color: #fff;
    cursor: pointer;
    box-shadow: 0 6px 0 var(--edge);
    transition: transform 0.1s;
  }
  .big-tile:hover:not(:disabled) {
    transform: translateY(-3px);
  }
  .big-tile:active:not(:disabled) {
    transform: translateY(3px);
    box-shadow: 0 3px 0 var(--edge);
  }
  .big-tile:disabled {
    opacity: 0.5;
  }
  .big-tile.leaf {
    background: var(--leaf);
  }
  .big-tile.sky {
    background: var(--sky);
    --edge: var(--sky-dark);
  }
  .big-tile.gold {
    background: var(--gold);
    --edge: var(--gold-dark);
    color: var(--ink);
  }
  .big-tile.wood {
    background: var(--wood);
    --edge: var(--wood-dark);
  }
  .tile-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.25);
    font-size: 24px;
  }
  .mini {
    display: flex;
  }
  .mini .token {
    width: 42px;
    height: 42px;
    font-size: 22px;
    margin-right: -8px;
    box-shadow: 0 0 0 2px var(--wood);
  }
  .tile-title {
    display: block;
    font-family: var(--display);
    font-weight: 600;
    font-size: 24px;
  }
  .tile-sub {
    display: block;
    font-weight: 700;
    font-size: 14px;
    opacity: 0.9;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .big-tile.gold .tile-sub {
    color: var(--wood-dark);
  }
  .section {
    font-size: 22px;
    margin: 0 0 12px;
  }
  .lists {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 16px;
  }
  .list-card {
    position: relative;
    border: 3px solid transparent;
    padding: 20px;
  }
  .list-card.selected {
    border-color: var(--leaf);
  }
  .select {
    position: absolute;
    inset: 0;
    border: none;
    background: none;
    border-radius: 22px;
    cursor: pointer;
  }
  .head,
  .tools,
  .actions,
  .ready {
    position: relative;
  }
  .head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    pointer-events: none;
  }
  .tools {
    pointer-events: auto;
    flex-wrap: nowrap;
    gap: 8px;
  }
  .tools .icon-btn {
    width: 40px;
    height: 40px;
    font-size: 17px;
    border: 2px solid var(--line);
    box-shadow: none;
  }
  h3 {
    font-size: 21px;
  }
  .meta {
    margin: 2px 0 0;
  }
  .ready {
    margin-top: 8px;
    pointer-events: none;
  }
  .known {
    margin: 10px 0 4px;
    font-weight: 800;
    font-size: 15px;
    color: var(--leaf-dark);
    position: relative;
    pointer-events: none;
  }
  .bar {
    position: relative;
    height: 12px;
    border-radius: 999px;
    background: var(--leaf-light);
    overflow: hidden;
    pointer-events: none;
  }
  .bar div {
    height: 100%;
    background: var(--leaf);
    border-radius: 999px;
  }
  .chips {
    position: relative;
    gap: 6px;
    margin: 10px 0 14px;
    pointer-events: none;
  }
  .chips .chip {
    font-size: 13px;
    padding: 4px 10px;
  }
  .actions {
    flex-wrap: nowrap;
  }
  .actions .btn {
    flex: 1;
    min-height: 46px;
    font-size: 17px;
  }
  .new-list {
    min-height: 140px;
    border: 3px dashed var(--line);
    border-radius: 24px;
    background: transparent;
    color: var(--ink-soft);
    font-weight: 800;
    font-size: 18px;
    cursor: pointer;
  }
  .new-list:hover {
    background: rgba(255, 255, 255, 0.5);
  }
  @media (max-width: 860px) {
    .tiles {
      grid-template-columns: 1fr 1fr;
    }
  }
  @media (max-width: 640px) {
    .lists {
      grid-template-columns: 1fr;
    }
    .big-tile {
      min-height: 120px;
    }
    .topbar .right .chip.wood {
      display: none;
    }
  }
</style>
