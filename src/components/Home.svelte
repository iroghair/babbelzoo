<script lang="ts">
  import { fmt, langCode, tr } from '../lib/i18n.svelte';
  import { lists } from '../lib/lists.svelte';
  import type { WordList } from '../lib/types';
  import Scenery from './Scenery.svelte';
  import SharePanel from './SharePanel.svelte';

  let { oneditlist }: { oneditlist: (id: string | null) => void } = $props();

  let sharing: WordList | null = $state(null);
</script>

<main class="screen">
  <Scenery />
  <header class="topbar">
    <h1>{tr().appName}</h1>
  </header>
  <div class="wrap">
    <h2 class="section">{tr().myLists}</h2>
    <div class="lists">
      {#each lists.all as list (list.id)}
        <article class="card list-card">
          <div class="head">
            <div>
              <h3>{list.name}</h3>
              <p class="muted small">{fmt(tr().wordsCount, { n: list.entries.length })} · {langCode(list.langA)} ↔ {langCode(list.langB)}</p>
            </div>
            <div class="row">
              <button class="icon-btn" onclick={() => (sharing = list)} aria-label={tr().share}>🔗</button>
              <button class="icon-btn" onclick={() => oneditlist(list.id)} aria-label={tr().edit}>✎</button>
            </div>
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
  .section {
    font-size: 22px;
    margin: 8px 0 12px;
  }
  .lists {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
  }
  .head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }
  h3 {
    font-size: 21px;
  }
  .new-list {
    min-height: 120px;
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
</style>
