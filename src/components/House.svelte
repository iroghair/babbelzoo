<!-- The player's house: rooms with their animals, dragging, feeding and growing up (PLAN.md 5.2, 5.3). -->
<script lang="ts">
  import { animalById, ROOMS, TIER_BG } from '../data/animals';
  import { dayKey } from '../lib/coins';
  import { celebrate } from '../lib/fx';
  import { animalsIn, feed, fitsIn, freeSlots, GROW_DAYS, isAdult, isFedToday, moveAnimal, placeIn, POND, type Margin } from '../lib/house';
  import { fmt, num, tr } from '../lib/i18n.svelte';
  import { prefs } from '../lib/prefs.svelte';
  import { profile, type Owned, type RoomId } from '../lib/profile.svelte';
  import { playFanfare, playPop } from '../lib/sound';
  import CoinCounter from './CoinCounter.svelte';
  import Modal from './Modal.svelte';
  import Scenery from './Scenery.svelte';

  let { onback, onshop }: { onback: () => void; onshop: (tab: 'animals' | 'rooms') => void } = $props();

  const data = $derived(profile.data);
  const today = dayKey();
  let room: RoomId = $state(profile.data.owned[0]?.roomId ?? 'living');
  let scene: HTMLDivElement | undefined = $state();
  let sceneW = $state(0);
  let sceneH = $state(0);
  let innerWidth = $state(1024);
  let info: Owned | null = $state(null);
  let toast = $state('');
  let bursts: Record<string, number> = $state({});
  let hops: Record<string, number> = $state({});

  /* drag state (animals and food) */
  let drag: { kind: 'animal' | 'food'; id?: string; x0: number; y0: number; moved: boolean; px: number; py: number } | null = $state(null);

  const here = $derived(animalsIn(data, room));
  /** Half a pet token (80px, 62px on phones) in % of the scene, so a fish stays fully in the water. */
  const margin: Margin = $derived.by(() => {
    const half = (innerWidth <= 640 ? 62 : 80) / 2;
    return sceneW && sceneH ? { x: (100 * half) / sceneW, y: (100 * half) / sceneH } : { x: 5, y: 9 };
  });
  const free = $derived(freeSlots(data, room));
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  function say(text: string) {
    toast = text;
    setTimeout(() => toast === text && (toast = ''), 2400);
  }

  function hop(id: string) {
    hops[id] = (hops[id] ?? 0) + 1;
  }

  function doFeed(o: Owned) {
    const r = feed(data, o.id, today);
    if (r === 'nofood') return say(tr().noFood);
    if (r === 'already') return say(`${o.name}: ${tr().fedToday}`);
    bursts[o.id] = Date.now();
    setTimeout(() => delete bursts[o.id], 1400);
    hop(o.id);
    playPop();
    if (r === 'grown') {
      playFanfare();
      celebrate(true);
      say(fmt(tr().grownUp, { name: o.name }));
    }
  }

  /* ───── pointer handling ───── */

  function scenePos(e: PointerEvent): { x: number; y: number } {
    const r = scene!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
  }

  function startAnimal(e: PointerEvent, o: Owned) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag = { kind: 'animal', id: o.id, x0: e.clientX, y0: e.clientY, moved: false, px: o.x, py: o.y };
  }

  function startFood(e: PointerEvent) {
    if (data.wallet.food <= 0) return say(tr().noFood);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag = { kind: 'food', x0: e.clientX, y0: e.clientY, moved: false, px: e.clientX, py: e.clientY };
  }

  function onMove(e: PointerEvent) {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
    drag.moved = true;
    if (drag.kind === 'animal' && scene) {
      const p = scenePos(e);
      const q = placeIn(room, p.x, p.y, margin);
      drag.px = q.x;
      drag.py = q.y;
    } else {
      drag.px = e.clientX;
      drag.py = e.clientY;
    }
  }

  function onUp(e: PointerEvent) {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (d.kind === 'animal') {
      const o = data.owned.find((x) => x.id === d.id);
      if (!o) return;
      if (d.moved) moveAnimal(data, o.id, o.roomId, d.px, d.py, margin);
      else {
        hop(o.id);
        playPop();
        info = o;
      }
    } else if (d.moved) {
      const target = document.elementsFromPoint(e.clientX, e.clientY).find((el) => (el as HTMLElement).dataset?.owned);
      const o = target && data.owned.find((x) => x.id === (target as HTMLElement).dataset.owned);
      if (o) doFeed(o);
      else say(tr().dragFood);
    } else say(tr().dragFood);
  }

  function pos(o: Owned): { x: number; y: number } {
    if (drag?.kind === 'animal' && drag.id === o.id && drag.moved) return { x: drag.px, y: drag.py };
    // Also corrects animals saved before the pond kept them in the water.
    return placeIn(o.roomId, o.x, o.y, margin);
  }

  function moveTo(o: Owned, r: RoomId) {
    if (moveAnimal(data, o.id, r)) {
      room = r;
      info = null;
    }
  }
</script>

<svelte:window bind:innerWidth onpointermove={onMove} onpointerup={onUp} onpointercancel={() => (drag = null)} />

<main class="screen">
  <Scenery />
  <header class="topbar">
    <div class="left">
      <button class="icon-btn" onclick={onback} aria-label={tr().back}>←</button>
      <h1>{tr().houseTitle}</h1>
    </div>
    <div class="right">
      <span class="chip wood big-chip">🥣 {fmt(tr().food, { n: data.wallet.food })}</span>
      <CoinCounter value={data.wallet.coins} />
    </div>
  </header>

  <div class="wrap">
    <div class="room-tabs">
      {#each ROOMS as r (r.id)}
        {@const has = data.rooms.includes(r.id)}
        {#if has}
          <button class="room-tab" class:on={room === r.id} onclick={() => (room = r.id)}>
            {r.icon} {tr().rooms[r.id]} <span class="n">{animalsIn(data, r.id).length}/{r.capacity}</span>
          </button>
        {:else}
          <button class="room-tab locked" onclick={() => onshop('rooms')}>
            🔒 {tr().rooms[r.id]} <span class="chip gold mini-price"><span class="coin-icon"></span>{num(r.price)}</span>
          </button>
        {/if}
      {/each}
    </div>

    <div class="card scene {room}" bind:this={scene} bind:clientWidth={sceneW} bind:clientHeight={sceneH}>
      {#if room === 'living'}
        <div class="window"><span>☀️</span></div>
        <span class="deco plant">🪴</span>
        <div class="rug"></div>
      {:else if room === 'garden'}
        <span class="deco sun">☀️</span>
        <span class="deco tree">🌳</span>
        <span class="deco flowers">🌷🌼🌷</span>
      {:else if room === 'pond'}
        <div class="water" style:left="{POND.cx}%" style:top="{POND.cy}%" style:width="{2 * POND.rx}%" style:height="{2 * POND.ry}%"></div>
        <span class="deco reeds">🌾</span>
        <span class="deco lily">🪷</span>
      {:else}
        <div class="beam b1"></div>
        <div class="beam b2"></div>
        <div class="round-window"></div>
        <span class="deco boxes">📦🧸</span>
      {/if}

      {#if data.owned.length === 0}
        <div class="empty">
          <p class="display">{tr().emptyHouse}</p>
          <button class="btn gold big" onclick={() => onshop('animals')}>🛒 {tr().toShop}</button>
        </div>
      {:else if here.length === 0}
        <div class="empty"><p class="display">{tr().emptyRoom}</p></div>
      {/if}

      {#each here as o (o.id)}
        {@const a = animalById(o.animalId)}
        {@const p = pos(o)}
        {@const fed = isFedToday(o, today)}
        {@const adult = isAdult(o)}
        {#if a}
          <div class="pet" class:dragging={drag?.id === o.id && drag.moved} style:left="{p.x}%" style:top="{p.y}%">
            <button
              class="token pet-token"
              class:baby={!adult}
              class:happy={fed}
              class:asleep={!fed}
              data-owned={o.id}
              style:background={TIER_BG[a.tier]}
              onpointerdown={(e) => startAnimal(e, o)}
              aria-label={o.name}
            >
              {#key hops[o.id]}<span class="emoji" class:hop={hops[o.id]} data-owned={o.id}>{a.emoji}</span>{/key}
            </button>
            {#if fed}<span class="heart">💛</span>{:else}<span class="zzz">💤</span>{/if}
            {#if bursts[o.id]}
              <span class="burst" aria-hidden="true">
                {#each [0, 1, 2, 3, 4] as i (i)}<span style:--i={i}>💛</span>{/each}
              </span>
            {/if}
            <span class="name-tag">{o.name}</span>
            {#if !adult}<span class="baby-tag">{tr().baby} · {fmt(tr().babyDays, { n: o.fedDays.length })}</span>{/if}
          </div>
        {/if}
      {/each}

      {#if data.owned.length && free > 0}
        <div class="slot">
          <span class="slot-circle">＋</span>
          <span class="slot-text">{free === 1 ? tr().freeSlot : fmt(tr().freeSlots, { n: free })}</span>
          <button class="link-btn shop-link" onclick={() => onshop('animals')}>{tr().toShop}</button>
        </div>
      {/if}

      <div class="bowl" class:empty-bowl={data.wallet.food <= 0}>
        <button class="food" onpointerdown={startFood} aria-label={tr().dragFood} disabled={data.wallet.food <= 0}>
          <span class="bowl-shape"><span class="veg">🥕🥬</span></span>
        </button>
        <div>
          <p class="display portions">{data.wallet.food === 1 ? tr().portion : fmt(tr().portions, { n: data.wallet.food })}</p>
          <p class="bowl-hint">{data.wallet.food > 0 ? tr().dragFood : tr().noFood}</p>
        </div>
      </div>
    </div>
  </div>

  {#if drag?.kind === 'food' && drag.moved}
    <span class="food-ghost" style:left="{drag.px}px" style:top="{drag.py}px">🥕</span>
  {/if}
  {#if toast}<div class="toast" role="status">{toast}</div>{/if}
</main>

{#if info}
  {@const a = animalById(info.animalId)}
  {@const o = info}
  {#if a}
    <Modal onclose={() => (info = null)}>
      <div class="info">
        <span class="token info-token" style:background={TIER_BG[a.tier]}>{a.emoji}</span>
        <label class="field">
          {tr().playerName}
          <input class="input" value={o.name} maxlength="20" oninput={(e) => (o.name = e.currentTarget.value)}
            onblur={() => (o.name = o.name.trim() || cap(a.nl))}
          />
        </label>
        <p class="species">{cap(a.nl)} · {cap(a.en)}</p>
        <p class="status">
          {#if isAdult(o)}⭐ {tr().adult}{:else}🌱 {fmt(tr().feedProgress, { n: o.fedDays.length, left: GROW_DAYS - o.fedDays.length })}{/if}
        </p>
        {#if isFedToday(o, today)}
          <p class="chip leaf">{tr().fedToday}</p>
        {:else}
          <button class="btn wood big" onclick={() => doFeed(o)} disabled={data.wallet.food <= 0}>🥕 {tr().feed} ({data.wallet.food})</button>
        {/if}
        {#if data.rooms.length > 1}
          <div class="move">
            <span class="strong">{tr().moveTo}</span>
            <div class="seg">
              {#each data.rooms.filter((r) => fitsIn(a, r)) as r (r)}
                <button aria-pressed={o.roomId === r} disabled={o.roomId !== r && freeSlots(data, r) <= 0} onclick={() => moveTo(o, r)}>
                  {tr().rooms[r]}
                </button>
              {/each}
            </div>
          </div>
        {/if}
        <button class="btn plain" onclick={() => (info = null)}>{tr().close}</button>
      </div>
    </Modal>
  {/if}
{/if}

<style>
  h1 {
    font-size: 30px;
  }
  .big-chip {
    font-size: 16px;
    padding: 9px 16px;
  }
  .room-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 14px;
  }
  .room-tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 48px;
    padding: 8px 18px;
    border: none;
    border-radius: 16px;
    background: var(--surface-alt);
    font-weight: 800;
    font-size: 16px;
    cursor: pointer;
    box-shadow: 0 4px 0 var(--line);
  }
  .room-tab.on {
    background: var(--leaf);
    color: #fff;
    box-shadow: 0 4px 0 var(--leaf-dark);
  }
  .room-tab .n {
    opacity: 0.75;
  }
  .room-tab.locked {
    color: var(--ink-soft);
  }
  .mini-price {
    padding: 2px 8px;
    font-size: 12px;
  }
  .mini-price .coin-icon {
    width: 12px;
    height: 12px;
  }
  .scene {
    --tok: 80px;
    position: relative;
    height: min(470px, calc(100dvh - 230px));
    min-height: 360px;
    padding: 0;
    overflow: hidden;
    touch-action: none;
    user-select: none;
  }
  .scene.living {
    background: linear-gradient(to bottom, #fbe9c9 0 40%, var(--wood-light) 40% 100%);
  }
  .scene.garden {
    background: linear-gradient(to bottom, #cdeffb 0 32%, #bfe6b0 32% 100%);
  }
  .scene.pond {
    background: linear-gradient(to bottom, #cdeffb 0 22%, #bfe6b0 22% 100%);
  }
  .scene.attic {
    background: linear-gradient(to bottom, #e9d2b5, #f3dec8);
  }
  .deco {
    position: absolute;
    font-size: 46px;
    pointer-events: none;
  }
  .window {
    position: absolute;
    left: 6%;
    top: 6%;
    width: 140px;
    height: 100px;
    border: 6px solid var(--wood);
    border-radius: 14px;
    background:
      linear-gradient(var(--wood), var(--wood)) center / 3px 100% no-repeat,
      linear-gradient(var(--wood), var(--wood)) center / 100% 3px no-repeat,
      linear-gradient(to bottom, #bfe8f7, #ddf2fb);
  }
  .window span {
    position: absolute;
    top: 6px;
    right: 8px;
    font-size: 22px;
  }
  .plant {
    right: 4%;
    top: 5%;
  }
  .rug {
    position: absolute;
    left: 50%;
    bottom: 6%;
    width: 360px;
    height: 90px;
    transform: translateX(-50%);
    border-radius: 50%;
    background: radial-gradient(ellipse, #e8c98f 0%, #ddb97a 70%, transparent 72%);
    opacity: 0.7;
  }
  .sun {
    right: 6%;
    top: 4%;
  }
  .tree {
    left: 4%;
    top: 12%;
    font-size: 90px;
  }
  .flowers {
    left: 40%;
    bottom: 3%;
    font-size: 30px;
  }
  .water {
    /* position and size come from POND in lib/house.ts */
    position: absolute;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: radial-gradient(ellipse at 40% 35%, #c4ecfa, #8fd2ef 70%);
    box-shadow: inset 0 -8px 0 rgba(42, 140, 192, 0.18);
  }
  .reeds {
    left: 3%;
    top: 26%;
  }
  .lily {
    right: 18%;
    top: 30%;
    font-size: 34px;
  }
  .beam {
    position: absolute;
    top: -20%;
    width: 60%;
    height: 34px;
    background: var(--wood);
    opacity: 0.55;
  }
  .b1 {
    left: -8%;
    transform: rotate(18deg);
  }
  .b2 {
    right: -8%;
    transform: rotate(-18deg);
  }
  .round-window {
    position: absolute;
    left: 50%;
    top: 8%;
    width: 80px;
    height: 80px;
    transform: translateX(-50%);
    border-radius: 50%;
    border: 6px solid var(--wood);
    background: linear-gradient(#bfe8f7, #ddf2fb);
  }
  .boxes {
    left: 4%;
    bottom: 4%;
    font-size: 40px;
  }
  .empty {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 24px;
    text-align: center;
    pointer-events: none;
  }
  .empty p {
    max-width: 420px;
    font-size: 22px;
  }
  .empty .btn {
    pointer-events: auto;
  }
  .pet {
    /* the saved position is the centre of the round token; name tags hang below it */
    position: absolute;
    transform: translate(-50%, calc(var(--tok) / -2));
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 2;
  }
  .pet.dragging {
    z-index: 10;
  }
  .pet-token {
    width: var(--tok);
    height: var(--tok);
    font-size: 42px;
    border: none;
    padding: 0;
    cursor: grab;
    touch-action: none;
    box-shadow: 0 5px 0 rgba(36, 53, 43, 0.12);
  }
  .dragging .pet-token {
    cursor: grabbing;
    transform: scale(1.08);
    box-shadow: 0 12px 18px rgba(36, 53, 43, 0.2);
  }
  .pet-token.baby {
    width: 58px;
    height: 58px;
    font-size: 28px;
  }
  .pet-token.happy .emoji {
    display: inline-block;
    animation: happy 1.6s ease-in-out infinite;
  }
  .pet-token.happy .emoji.hop {
    animation: hop 0.6s var(--pop);
  }
  .pet-token.asleep {
    opacity: 0.6;
  }
  .emoji.hop {
    display: inline-block;
    animation: hop 0.6s var(--pop);
  }
  @keyframes happy {
    0%,
    100% {
      transform: translateY(0) rotate(0);
    }
    25% {
      transform: translateY(-4px) rotate(-5deg);
    }
    75% {
      transform: translateY(-4px) rotate(5deg);
    }
  }
  .heart {
    position: absolute;
    top: -6px;
    left: -2px;
    font-size: 18px;
  }
  .zzz {
    position: absolute;
    top: -14px;
    right: -6px;
    font-size: 18px;
    animation: hop 2.4s ease-in-out infinite;
  }
  .burst span {
    position: absolute;
    top: 0;
    left: calc(50% + (var(--i) - 2) * 16px);
    font-size: 20px;
    animation: float-up 1.2s ease-out both;
    animation-delay: calc(var(--i) * 0.08s);
    pointer-events: none;
  }
  .name-tag {
    margin-top: 6px;
    padding: 2px 12px;
    border-radius: 999px;
    background: #fff;
    box-shadow: 0 2px 0 var(--line);
    font-weight: 800;
    font-size: 14px;
    white-space: nowrap;
  }
  .baby-tag {
    margin-top: 3px;
    padding: 1px 8px;
    border-radius: 999px;
    background: var(--sky-light);
    color: var(--sky-dark);
    font-weight: 800;
    font-size: 11px;
    white-space: nowrap;
  }
  .slot {
    position: absolute;
    left: 3%;
    bottom: 4%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .slot-circle {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 3px dashed rgba(91, 107, 96, 0.4);
    border-radius: 50%;
    color: var(--ink-soft);
    font-size: 26px;
  }
  .slot-text {
    font-size: 12px;
    font-weight: 800;
    color: var(--ink-soft);
  }
  .shop-link {
    font-size: 12px;
    color: var(--leaf-dark);
    padding: 0;
  }
  .bowl {
    position: absolute;
    right: 2.5%;
    bottom: 4%;
    z-index: 3;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 18px;
    background: var(--wood-light);
    border: 2px solid #e6c9a3;
    box-shadow: 0 4px 0 rgba(168, 105, 58, 0.25);
    max-width: 260px;
  }
  .food {
    border: none;
    background: none;
    padding: 0;
    cursor: grab;
    touch-action: none;
  }
  .food:disabled {
    cursor: default;
    opacity: 0.5;
  }
  .bowl-shape {
    position: relative;
    display: block;
    width: 64px;
    height: 40px;
    border-radius: 0 0 40px 40px;
    background: var(--wood);
  }
  .veg {
    position: absolute;
    top: -14px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 22px;
    white-space: nowrap;
  }
  .empty-bowl .veg {
    display: none;
  }
  .portions {
    margin: 0;
    font-size: 18px;
    color: var(--wood-dark);
  }
  .bowl-hint {
    margin: 0;
    font-size: 12px;
    font-weight: 800;
    color: var(--ink-soft);
  }
  .food-ghost {
    position: fixed;
    z-index: 100;
    font-size: 38px;
    transform: translate(-50%, -60%);
    pointer-events: none;
    filter: drop-shadow(0 6px 6px rgba(0, 0, 0, 0.2));
  }
  .toast {
    position: fixed;
    left: 50%;
    top: 90px;
    z-index: 90;
    translate: -50% 0;
    padding: 10px 20px;
    border-radius: 999px;
    background: var(--ink);
    color: #fff;
    font-weight: 800;
    animation: slide-up 0.3s var(--pop);
  }
  .info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    text-align: center;
  }
  .info .field {
    width: 100%;
    text-align: left;
  }
  .info-token {
    width: 110px;
    height: 110px;
    font-size: 60px;
  }
  .species {
    margin: 0;
    font-weight: 800;
    color: var(--ink-soft);
  }
  .status {
    margin: 0;
    font-weight: 700;
  }
  .move {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .strong {
    font-weight: 800;
  }
  @media (max-width: 640px) {
    .scene {
      --tok: 62px;
    }
    .pet-token {
      font-size: 32px;
    }
    .bowl {
      max-width: 180px;
      padding: 8px 10px;
    }
    .bowl-hint {
      display: none;
    }
    .window {
      width: 90px;
      height: 70px;
    }
  }
</style>
