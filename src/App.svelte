<script lang="ts">
  import Game from './components/Game.svelte';
  import Home from './components/Home.svelte';
  import House from './components/House.svelte';
  import Shop from './components/Shop.svelte';
  import ListEditor from './components/ListEditor.svelte';
  import Modal from './components/Modal.svelte';
  import Profiles from './components/Profiles.svelte';
  import Results from './components/Results.svelte';
  import SessionSetup from './components/SessionSetup.svelte';
  import { animalById } from './data/animals';
  import { fmt, tr } from './lib/i18n.svelte';
  import { getList, saveList } from './lib/lists.svelte';
  import { prefs } from './lib/prefs.svelte';
  import { currentPlayer, listStats, profile, progressStore, setupFor, type ListStats } from './lib/profile.svelte';
  import { finishSession, rewardAnswer, type SessionSummary } from './lib/rewards';
  import { GameSession, type Path } from './lib/session.svelte';
  import { sharedListFromHash, type SharedList } from './lib/share';
  import type { ListSetup } from './lib/types';

  type Screen =
    | { name: 'profiles' }
    | { name: 'home' }
    | { name: 'list'; listId: string | null }
    | { name: 'setup'; listId: string; path: Path }
    | { name: 'game' }
    | { name: 'results' }
    | { name: 'shop'; tab?: 'animals' | 'rooms' }
    | { name: 'house' }
    | { name: 'settings' };

  let screen: Screen = $state({ name: 'profiles' });
  let session: GameSession | null = $state(null);
  let summary: SessionSummary | null = $state(null);
  let coinsBefore = $state(0);
  let statsBefore: ListStats | null = null;
  let lastStart: { listId: string; path: Path; setup: ListSetup; entryIds?: string[] } | null = null;
  let shared: SharedList | null = $state(null);
  let sharedError = $state(false);

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
    if (shared) {
      const list = saveList(shared);
      profile.data.lastListId = list.id;
    }
    shared = null;
  }

  /** The buddy on the play screen: the newest animal in the house, or the player's avatar. */
  const buddy = $derived.by(() => {
    const owned = profile.data.owned;
    const a = owned.length ? animalById(owned[owned.length - 1].animalId) : undefined;
    return a?.emoji ?? currentPlayer()?.avatar ?? '🦊';
  });

  function start(listId: string, path: Path, setup: ListSetup, entryIds?: string[]) {
    const list = getList(listId);
    if (!list) return;
    lastStart = { listId, path, setup, entryIds };
    profile.data.setups[listId] = setup;
    profile.data.lastListId = listId;
    statsBefore = listStats(list);
    coinsBefore = profile.data.wallet.coins;
    summary = null;
    session = new GameSession({
      path,
      list,
      dir: setup.dir,
      modes: path === 'learn' ? setup.modes : setup.testModes,
      length: setup.length,
      settings: { ...profile.data.settings },
      progress: progressStore(),
      entryIds,
    });
    screen = { name: 'game' };
  }

  function ended() {
    if (!session || !statsBefore) return;
    summary = finishSession(session, statsBefore);
    screen = session.stopped && !session.records.length ? { name: 'home' } : { name: 'results' };
  }
</script>

<svelte:window onhashchange={readSharedList} />

{#if screen.name === 'profiles' || !currentPlayer()}
  <Profiles onplay={() => (screen = { name: 'home' })} />
{:else if screen.name === 'home'}
  <Home
    oneditlist={(listId) => (screen = { name: 'list', listId })}
    onplay={(listId, path) => (screen = { name: 'setup', listId, path })}
    onshop={() => (screen = { name: 'shop' })}
    onhouse={() => (screen = { name: 'house' })}
    onsettings={() => (screen = { name: 'settings' })}
    onswitch={() => (screen = { name: 'profiles' })}
  />
{:else if screen.name === 'list'}
  <ListEditor listId={screen.listId} onclose={() => (screen = { name: 'home' })} />
{:else if screen.name === 'setup'}
  {@const s = screen}
  {@const list = getList(s.listId)}
  {#if list}
    <SessionSetup
      {list}
      path={s.path}
      setup={setupFor(s.listId)}
      onstart={(setup) => start(s.listId, s.path, setup)}
      onback={() => (screen = { name: 'home' })}
    />
  {/if}
{:else if screen.name === 'game' && session}
  <Game {session} {buddy} {coinsBefore} onanswer={rewardAnswer} onend={ended} />
{:else if screen.name === 'results' && session && summary}
  <Results
    {session}
    {summary}
    {buddy}
    onagain={() => lastStart && start(lastStart.listId, lastStart.path, lastStart.setup, lastStart.entryIds)}
    onpractise={(ids) => lastStart && start(lastStart.listId, 'learn', setupFor(lastStart.listId), ids)}
    onhouse={() => (screen = { name: 'house' })}
    onhome={() => (screen = { name: 'home' })}
  />
{:else if screen.name === 'shop'}
  <Shop tab={screen.tab} onback={() => (screen = { name: 'home' })} onhouse={() => (screen = { name: 'house' })} />
{:else if screen.name === 'house'}
  <House onback={() => (screen = { name: 'home' })} onshop={(tab) => (screen = { name: 'shop', tab })} />
{:else}
  <main class="screen"><button class="btn" onclick={() => (screen = { name: 'home' })}>{tr().toHome}</button></main>
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
