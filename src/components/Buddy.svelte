<!-- One of the player's animals, peeking in from the corner and reacting to answers. -->
<script lang="ts">
  let { emoji, text, mood = 0 }: { emoji: string; text: string; mood?: number } = $props();

  let el: HTMLDivElement | undefined = $state();
  $effect(() => {
    if (mood && el) {
      el.classList.remove('hop');
      void el.offsetWidth;
      el.classList.add('hop');
    }
  });
</script>

<div class="buddy" aria-hidden="true">
  {#if text}
    <div class="bubble">{text}</div>
  {/if}
  <div class="token big" bind:this={el}>{emoji}</div>
</div>

<style>
  .buddy {
    position: fixed;
    right: 24px;
    bottom: 0;
    z-index: 5;
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: none;
  }
  .bubble {
    position: relative;
    margin-bottom: 10px;
    padding: 8px 16px;
    border-radius: 16px;
    background: var(--surface);
    box-shadow: 0 4px 10px rgba(36, 53, 43, 0.12);
    font-weight: 800;
    font-size: 15px;
    animation: slide-up 0.3s var(--pop);
  }
  .bubble::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: -6px;
    width: 12px;
    height: 12px;
    background: var(--surface);
    transform: translateX(-50%) rotate(45deg);
  }
  .big {
    width: 96px;
    height: 96px;
    font-size: 50px;
    margin-bottom: -24px;
  }
  @media (max-width: 640px) {
    .buddy {
      right: 8px;
    }
    .big {
      width: 72px;
      height: 72px;
      font-size: 38px;
    }
    .bubble {
      display: none;
    }
  }
</style>
