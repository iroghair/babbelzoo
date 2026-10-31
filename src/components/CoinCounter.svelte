<!-- The gold coin pill: the landing target of the coin drop. Counts up after the coins land. -->
<script lang="ts">
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { num } from '../lib/i18n.svelte';

  let { value, delay = 550 }: { value: number; delay?: number } = $props();

  const shown = new Tween(0, { duration: 700, easing: cubicOut });
  let first = true;
  $effect(() => {
    const v = value;
    if (first) {
      first = false;
      shown.set(v, { duration: 0 });
    } else shown.set(v, { delay: v > shown.target ? delay : 0 });
  });
</script>

<div id="coin-counter" class="coins" aria-live="polite" aria-label={`${value} munten`}>
  <span class="coin-icon"></span>
  <span>{num(Math.round(shown.current))}</span>
</div>

<style>
  .coins {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-radius: 999px;
    background: var(--gold);
    color: var(--ink);
    font-weight: 800;
    font-size: 19px;
    box-shadow: 0 3px 0 var(--gold-dark);
    font-variant-numeric: tabular-nums;
  }
  .coins .coin-icon {
    width: 24px;
    height: 24px;
  }
</style>
