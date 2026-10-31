<!-- The animal shop and room upgrades (PLAN.md 5.1, 5.2). -->
<script lang="ts">
  import { tick, untrack } from 'svelte';
  import { ANIMALS, ROOMS, TIER_BG, TIERS, type Animal, type Room } from '../data/animals';
  import { celebrate, coinDrop } from '../lib/fx';
  import { buyAnimal, buyRoom, canBuy, isUnlocked } from '../lib/house';
  import { fmt, num, tr } from '../lib/i18n.svelte';
  import { prefs } from '../lib/prefs.svelte';
  import { profile, type Owned } from '../lib/profile.svelte';
  import { playFanfare, playPop } from '../lib/sound';
  import CoinCounter from './CoinCounter.svelte';
  import Modal from './Modal.svelte';
  import Scenery from './Scenery.svelte';

  let { tab: initialTab = 'animals', onback, onhouse }: { tab?: 'animals' | 'rooms'; onback: () => void; onhouse: () => void } = $props();

  let tab: 'animals' | 'rooms' = $state(untrack(() => initialTab));
  let confirming: Animal | null = $state(null);
  let confirmingRoom: Room | null = $state(null);
  let welcome: { animal: Animal; owned: Owned } | null = $state(null);
  let petName = $state('');

  const data = $derived(profile.data);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const title = (a: Animal) => cap(prefs.uiLang === 'nl' ? a.nl : a.en);
  const ownedCount = (a: Animal) => data.owned.filter((o) => o.animalId === a.id).length;

  function reason(a: Animal): string {
    const c = canBuy(data, a);
    if (c.ok) return '';
    if (c.reason === 'locked') return tr().locks[a.lock!];
    if (c.reason === 'pond') return tr().needPond;
    if (c.reason === 'full') return tr().houseFull;
    return fmt(tr().needCoins, { n: num(a.price - data.wallet.coins) });
  }

  async function buy() {
    const a = confirming;
    if (!a) return;
    const card = document.getElementById(`animal-${a.id}`);
    const owned = buyAnimal(data, a);
    confirming = null;
    if (!owned) return;
    coinDrop(card, Math.min(15, Math.ceil(a.price / 60)), true);
    playFanfare();
    petName = owned.name;
    welcome = { animal: a, owned };
    await tick();
    celebrate();
  }

  function closeWelcome(goHouse = false) {
    if (welcome) {
      const o = data.owned.find((x) => x.id === welcome!.owned.id);
      if (o && petName.trim()) o.name = petName.trim().slice(0, 20);
    }
    welcome = null;
    if (goHouse) onhouse();
  }

  function buyRoomNow() {
    const r = confirmingRoom;
    if (!r) return;
    const card = document.getElementById(`room-${r.id}`);
    if (buyRoom(data, r.id)) {
      coinDrop(card, Math.min(15, Math.ceil(r.price / 60)), true);
      playPop();
      celebrate();
    }
    confirmingRoom = null;
  }
</script>

<main class="screen">
  <Scenery />
  <header class="topbar">
    <div class="left">
      <button class="icon-btn" onclick={onback} aria-label={tr().back}>←</button>
      <h1>{tr().shopTitle}</h1>
    </div>
    <div class="right"><CoinCounter value={data.wallet.coins} delay={0} /></div>
  </header>

  <div class="wrap">
    <div class="tabs" role="tablist">
      <button role="tab" aria-selected={tab === 'animals'} onclick={() => (tab = 'animals')}>{tr().tabAnimals}</button>
      <button role="tab" aria-selected={tab === 'rooms'} onclick={() => (tab = 'rooms')}>{tr().tabRooms}</button>
    </div>

    {#if tab === 'animals'}
      {#each TIERS as tier (tier)}
        <div class="tier-head">
          <span class="chip tier-{tier}">{tr().tiers[tier]}</span>
          <span class="line"></span>
        </div>
        <div class="grid">
          {#each ANIMALS.filter((a) => a.tier === tier) as a (a.id)}
            {@const locked = !isUnlocked(a, data.milestones)}
            {@const check = canBuy(data, a)}
            {@const n = ownedCount(a)}
            <article class="card animal" id="animal-{a.id}" class:locked>
              {#if a.water}<span class="drop" title={tr().livesInPond}>💧</span>{/if}
              {#if n}<span class="count">x{n}</span>{/if}
              <span class="token big-token" style:background={TIER_BG[a.tier]}>
                <span class="emoji">{a.emoji}</span>
                {#if locked}<span class="lock">🔒</span>{/if}
              </span>
              <h3>{title(a)}</h3>
              <p class="names">{a.nl} · {a.en}</p>
              {#if a.water}<p class="water">{tr().livesInPond}</p>{/if}
              <button class="btn price" class:gold={check.ok} class:plain={!check.ok} disabled={!check.ok} onclick={() => (confirming = a)}>
                <span class="coin-icon"></span>{num(a.price)}
              </button>
              {#if !check.ok}<p class="why">{reason(a)}</p>{/if}
            </article>
          {/each}
        </div>
      {/each}
    {:else}
      <div class="rooms">
        {#each ROOMS.filter((r) => r.price > 0) as r (r.id)}
          {@const has = data.rooms.includes(r.id)}
          <article class="card room" id="room-{r.id}">
            <span class="room-icon">{r.icon}</span>
            <h3>{tr().rooms[r.id]}</h3>
            <p class="names">{fmt(tr().roomPlaces, { n: r.capacity })}</p>
            {#if r.water}<p class="water">{tr().roomPondNote}</p>{/if}
            {#if has}
              <span class="chip leaf">✓ {tr().owned}</span>
            {:else}
              <button class="btn price" class:gold={data.wallet.coins >= r.price} class:plain={data.wallet.coins < r.price} disabled={data.wallet.coins < r.price} onclick={() => (confirmingRoom = r)}>
                <span class="coin-icon"></span>{num(r.price)}
              </button>
              {#if data.wallet.coins < r.price}<p class="why">{fmt(tr().needCoins, { n: num(r.price - data.wallet.coins) })}</p>{/if}
            {/if}
          </article>
        {/each}
      </div>
    {/if}
  </div>
</main>

{#if confirming}
  <Modal onclose={() => (confirming = null)}>
    <div class="center">
      <span class="token huge" style:background={TIER_BG[confirming.tier]}>{confirming.emoji}</span>
      <h2>{fmt(tr().buyConfirm, { animal: title(confirming), price: num(confirming.price) })}</h2>
      <div class="row buttons">
        <button class="btn plain" onclick={() => (confirming = null)}>{tr().cancel}</button>
        <button class="btn gold big" onclick={buy}>{tr().buy}</button>
      </div>
    </div>
  </Modal>
{/if}

{#if confirmingRoom}
  <Modal onclose={() => (confirmingRoom = null)}>
    <div class="center">
      <span class="room-icon huge-icon">{confirmingRoom.icon}</span>
      <h2>{fmt(tr().buyConfirm, { animal: tr().rooms[confirmingRoom.id], price: num(confirmingRoom.price) })}</h2>
      <div class="row buttons">
        <button class="btn plain" onclick={() => (confirmingRoom = null)}>{tr().cancel}</button>
        <button class="btn gold big" onclick={buyRoomNow}>{tr().buy}</button>
      </div>
    </div>
  </Modal>
{/if}

{#if welcome}
  <Modal onclose={() => closeWelcome()}>
    <div class="center">
      <span class="token huge hop-in" style:background={TIER_BG[welcome.animal.tier]}>{welcome.animal.emoji}</span>
      <h2>{fmt(tr().welcome, { animal: title(welcome.animal) })}</h2>
      <label class="field name-field">
        {fmt(tr().nameIt, { animal: prefs.uiLang === 'nl' ? welcome.animal.nl : welcome.animal.en })}
        <input class="input" bind:value={petName} maxlength="20" onkeydown={(e) => e.key === 'Enter' && closeWelcome()} />
      </label>
      <div class="row buttons">
        <button class="btn plain" onclick={() => closeWelcome()}>{tr().done}</button>
        <button class="btn wood" onclick={() => closeWelcome(true)}>🏡 {tr().tileHouse}</button>
      </div>
    </div>
  </Modal>
{/if}

<style>
  h1 {
    font-size: 30px;
  }
  .tabs {
    display: flex;
    width: fit-content;
    margin: 0 auto 20px;
    padding: 5px;
    gap: 4px;
    border-radius: 999px;
    background: var(--surface-alt);
  }
  .tabs button {
    min-height: 46px;
    padding: 8px 30px;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: var(--ink-soft);
    font-weight: 800;
    font-size: 17px;
    cursor: pointer;
  }
  .tabs button[aria-selected='true'] {
    background: var(--leaf);
    color: #fff;
    box-shadow: 0 4px 0 var(--leaf-dark);
  }
  .tier-head {
    display: flex;
    align-items: center;
    gap: 14px;
    margin: 18px 0 14px;
  }
  .tier-head .chip {
    font-family: var(--display);
    font-weight: 600;
    font-size: 18px;
  }
  .tier-common {
    background: var(--leaf-light);
    color: var(--leaf-dark);
  }
  .tier-uncommon {
    background: var(--sky-light);
    color: var(--sky-dark);
  }
  .tier-rare {
    background: var(--gold-light);
    color: #8a6200;
  }
  .tier-legendary {
    background: var(--coral-light);
    color: var(--coral-dark);
  }
  .line {
    flex: 1;
    height: 2px;
    background: var(--line);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 14px;
  }
  .animal,
  .room {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 16px 12px;
  }
  .big-token {
    position: relative;
    width: 80px;
    height: 80px;
    font-size: 44px;
    box-shadow: 0 5px 0 rgba(36, 53, 43, 0.08);
  }
  .locked .emoji {
    filter: brightness(0);
    opacity: 0.3;
  }
  .lock {
    position: absolute;
    font-size: 26px;
  }
  h3 {
    margin-top: 10px;
    font-size: 20px;
  }
  .names {
    margin: 2px 0 0;
    font-size: 13px;
    font-weight: 700;
    color: var(--ink-soft);
  }
  .water {
    margin: 2px 0 0;
    font-size: 12px;
    font-weight: 800;
    color: var(--sky-dark);
  }
  .drop {
    position: absolute;
    top: 10px;
    left: 10px;
    padding: 2px 6px;
    border-radius: 999px;
    background: var(--sky-light);
    font-size: 12px;
  }
  .count {
    position: absolute;
    top: 10px;
    right: 10px;
    padding: 2px 9px;
    border-radius: 999px;
    background: var(--leaf);
    color: #fff;
    font-weight: 800;
    font-size: 13px;
  }
  .price {
    margin-top: 10px;
    width: 100%;
    min-height: 46px;
    font-size: 17px;
  }
  .price .coin-icon {
    width: 20px;
    height: 20px;
  }
  .why {
    margin: 8px 0 0;
    font-size: 12px;
    font-weight: 800;
    color: var(--ink-soft);
    line-height: 1.25;
  }
  .rooms {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
  }
  .room-icon {
    font-size: 52px;
  }
  .room .chip {
    margin-top: 12px;
  }
  .center {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 14px;
  }
  .center h2 {
    font-size: 24px;
  }
  .huge {
    width: 120px;
    height: 120px;
    font-size: 66px;
  }
  .huge-icon {
    font-size: 72px;
  }
  .hop-in {
    animation: bounce 0.8s var(--pop) 0.2s both;
  }
  .name-field {
    width: 100%;
    text-align: left;
  }
  .buttons {
    justify-content: center;
  }
</style>
