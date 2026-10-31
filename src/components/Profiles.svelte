<!-- "Who is playing?": pick, add or edit a player (PLAN.md 6). -->
<script lang="ts">
  import { fmt, num, tr } from '../lib/i18n.svelte';
  import { addPlayer, AVATARS, peekProfile, players, removePlayer, selectPlayer, updatePlayer, type Player } from '../lib/profile.svelte';
  import Modal from './Modal.svelte';
  import Scenery from './Scenery.svelte';

  let { onplay }: { onplay: () => void } = $props();

  let editing: Player | null = $state(null);
  let creating = $state(players.list.length === 0);
  let name = $state('');
  let avatar = $state(AVATARS[0]);

  function openNew() {
    editing = null;
    name = '';
    avatar = AVATARS.find((a) => !players.list.some((p) => p.avatar === a)) ?? AVATARS[0];
    creating = true;
  }

  function openEdit(p: Player) {
    editing = p;
    name = p.name;
    avatar = p.avatar;
    creating = true;
  }

  function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (editing) {
      updatePlayer(editing.id, name, avatar);
      creating = false;
    } else {
      addPlayer(name, avatar);
      creating = false;
      onplay();
    }
  }

  function remove() {
    if (!editing || !confirm(fmt(tr().deletePlayerConfirm, { name: editing.name }))) return;
    removePlayer(editing.id);
    creating = false;
  }

  function choose(p: Player) {
    selectPlayer(p.id);
    onplay();
  }
</script>

<main class="screen">
  <Scenery />
  <div class="wrap">
    <div class="brand">
      <span class="logo" aria-hidden="true">🦜</span>
      <span class="display name">{tr().appName}</span>
    </div>
    <h1>{tr().whoPlays}</h1>
    <div class="players">
      {#each players.list as p (p.id)}
        <div class="player">
          <button class="tile pick" onclick={() => choose(p)}>
            <span class="token avatar">{p.avatar}</span>
            <span class="pname">{p.name}</span>
            <span class="chip gold"><span class="coin-icon small-coin"></span>{num(peekProfile(p.id).wallet.coins)}</span>
          </button>
          <button class="icon-btn edit" onclick={() => openEdit(p)} aria-label={`${tr().editPlayer}: ${p.name}`}>✎</button>
        </div>
      {/each}
      <button class="tile pick add" onclick={openNew}>
        <span class="plus">＋</span>
        <span class="pname">{tr().newPlayer}</span>
      </button>
    </div>
  </div>
</main>

{#if creating}
  <Modal onclose={players.list.length ? () => (creating = false) : undefined}>
    <form onsubmit={submit}>
      <h2>{editing ? tr().editPlayer : tr().newPlayer}</h2>
      <label class="field">
        {tr().playerName}
        <!-- svelte-ignore a11y_autofocus -->
        <input class="input" bind:value={name} maxlength="20" autofocus required />
      </label>
      <p class="field-label">{tr().chooseAvatar}</p>
      <div class="avatars">
        {#each AVATARS as a (a)}
          <button type="button" class="token choice" class:on={a === avatar} aria-pressed={a === avatar} onclick={() => (avatar = a)}>{a}</button>
        {/each}
      </div>
      <div class="row actions">
        {#if editing}
          <button type="button" class="btn coral" onclick={remove}>{tr().deletePlayer}</button>
        {/if}
        <span class="spacer"></span>
        {#if players.list.length}
          <button type="button" class="btn plain" onclick={() => (creating = false)}>{tr().cancel}</button>
        {/if}
        <button class="btn" disabled={!name.trim()}>{editing ? tr().save : tr().play}</button>
      </div>
    </form>
  </Modal>
{/if}

<style>
  .wrap {
    max-width: 860px;
    text-align: center;
  }
  .brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin: 24px 0 8px;
  }
  .logo {
    font-size: 44px;
  }
  .brand .name {
    font-size: 34px;
    font-weight: 600;
    color: var(--leaf-dark);
  }
  h1 {
    font-size: 40px;
    margin: 8px 0 32px;
  }
  .players {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 20px;
  }
  .player {
    position: relative;
  }
  .pick {
    width: 100%;
    min-height: 210px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 18px;
    background: var(--surface);
  }
  .avatar {
    width: 96px;
    height: 96px;
    font-size: 54px;
  }
  .pname {
    font-size: 24px;
  }
  .small-coin {
    width: 16px;
    height: 16px;
  }
  .edit {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 38px;
    height: 38px;
    font-size: 16px;
  }
  .add {
    background: transparent;
    border: 3px dashed var(--line);
    box-shadow: none;
    color: var(--ink-soft);
  }
  .plus {
    font-size: 48px;
    line-height: 1;
  }
  form h2 {
    font-size: 26px;
    margin-bottom: 16px;
  }
  .field-label {
    margin: 16px 0 8px;
    font-weight: 800;
    font-size: 15px;
    color: var(--ink-soft);
  }
  .avatars {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
    gap: 10px;
  }
  .choice {
    width: 56px;
    height: 56px;
    font-size: 30px;
    border: 3px solid transparent;
    cursor: pointer;
    padding: 0;
  }
  .choice.on {
    border-color: var(--leaf);
    background: var(--leaf-light);
  }
  .actions {
    margin-top: 22px;
  }
  .spacer {
    flex: 1;
  }
</style>
