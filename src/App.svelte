<script lang="ts">
  import Game from './components/Game.svelte';
  import Home from './components/Home.svelte';
  import ListEditor from './components/ListEditor.svelte';
  import Modal from './components/Modal.svelte';
  import SessionSetup from './components/SessionSetup.svelte';
  import { fmt, tr } from './lib/i18n.svelte';
  import { getList, saveList } from './lib/lists.svelte';
  import { prefs } from './lib/prefs.svelte';
  import { NEW_PROGRESS, updateProgress, type ItemProgress } from './lib/scheduler';
  import { GameSession, type Path, type ProgressStore } from './lib/session.svelte';
  import { sharedListFromHash, type SharedList } from './lib/share';
  import { DEFAULT_SETUP, type ListSetup } from './lib/types';

  type Screen =
    | { name: 'home' }
    | { name: 'list'; listId: string | null }
    | { name: 'setup'; listId: string; path: Path }
    | { name: 'game' };

  let screen: Screen = $state({ name: 'home' });
  let session: GameSession | null = $state(null);
  let shared: SharedList | null = $state(null);
  let sharedError = $state(false);
  let setups: Record<string, ListSetup> = $state({});

  // Temporary in-memory progress (profiles come in phase 3).
  const progressMap: Record<string, ItemProgress> = {};
  const progress: ProgressStore = {
    get: (k) => progressMap[k] ?? NEW_PROGRESS,
    record: (k, o) => (progressMap[k] = updateProgress(progressMap[k] ?? NEW_PROGRESS, o)),
  };

  $effect(() => {
    document.documentElement.lang = prefs.uiLang;
  });

  function readSharedList() {
    if (!location.hash.startsWith('#list=')) return;
    sharedListFromHash(location.hash)
      .then((list) => {
        if (!list) throw new Error('invalid');
        shared = list;
      })
      .catch(() => (sharedError = true))
      .finally(() => history.replaceState(null, '', location.pathname + location.search));
  }
  readSharedList();

  function addShared() {
    if (shared) saveList(shared);
    shared = null;
    screen = { name: 'home' };
  }

  function start(listId: string, path: Path, setup: ListSetup) {
    const list = getList(listId);
    if (!list) return;
    setups[listId] = setup;
    session = new GameSession({
      path,
      list,
      dir: setup.dir,
      modes: path === 'learn' ? setup.modes : setup.testModes,
      length: setup.length,
      settings: { spelling: 'lenient', articles: 'optional', hintSpeed: 'normal', copyAfterWrong: true, testFeedback: 'each' },
      progress,
    });
    screen = { name: 'game' };
  }
</script>

<svelte:window onhashchange={readSharedList} />

{#if screen.name === 'home'}
  <Home oneditlist={(listId) => (screen = { name: 'list', listId })} onplay={(listId, path) => (screen = { name: 'setup', listId, path })} />
{:else if screen.name === 'list'}
  <ListEditor listId={screen.listId} onclose={() => (screen = { name: 'home' })} />
{:else if screen.name === 'setup'}
  {@const s = screen}
  {@const list = getList(s.listId)}
  {#if list}
    <SessionSetup
      {list}
      path={s.path}
      setup={setups[s.listId] ?? DEFAULT_SETUP}
      onstart={(setup) => start(s.listId, s.path, setup)}
      onback={() => (screen = { name: 'home' })}
    />
  {/if}
{:else if screen.name === 'game' && session}
  <Game {session} onend={() => (screen = { name: 'home' })} />
{/if}

{#if shared}
  <Modal onclose={() => (shared = null)}>
    <h2>📬 {tr().sharedTitle}</h2>
    <p class="big-line">{fmt(tr().sharedBody, { name: shared.name, n: shared.entries.length })}</p>
    <div class="row end">
      <button class="btn plain" onclick={() => (shared = null)}>{tr().cancel}</button>
      <button class="btn" onclick={addShared}>{tr().addIt}</button>
    </div>
  </Modal>
{/if}
{#if sharedError}
  <Modal onclose={() => (sharedError = false)}>
    <p class="big-line">{tr().sharedError}</p>
    <div class="row end"><button class="btn" onclick={() => (sharedError = false)}>{tr().close}</button></div>
  </Modal>
{/if}

<style>
  .big-line {
    font-size: 19px;
    font-weight: 700;
    margin: 12px 0 20px;
  }
  .end {
    justify-content: flex-end;
  }
</style>
