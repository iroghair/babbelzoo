<script lang="ts">
  import Home from './components/Home.svelte';
  import ListEditor from './components/ListEditor.svelte';
  import Modal from './components/Modal.svelte';
  import { fmt, tr } from './lib/i18n.svelte';
  import { saveList } from './lib/lists.svelte';
  import { prefs } from './lib/prefs.svelte';
  import { sharedListFromHash, type SharedList } from './lib/share';

  type Screen = { name: 'home' } | { name: 'list'; listId: string | null };

  let screen: Screen = $state({ name: 'home' });
  let shared: SharedList | null = $state(null);
  let sharedError = $state(false);

  $effect(() => {
    document.documentElement.lang = prefs.uiLang;
  });

  // Opening a shared link (#list=…) offers to add the list. The link may also be pasted
  // into a tab where the game is already open, which only changes the hash.
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
</script>

<svelte:window onhashchange={readSharedList} />

{#if screen.name === 'home'}
  <Home oneditlist={(listId) => (screen = { name: 'list', listId })} />
{:else if screen.name === 'list'}
  <ListEditor listId={screen.listId} onclose={() => (screen = { name: 'home' })} />
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
