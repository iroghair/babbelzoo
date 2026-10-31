<!-- A centred card over a dimmed screen. Closes with Escape or a click outside. -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let { onclose, children, wide = false }: { onclose?: () => void; children: Snippet; wide?: boolean } = $props();
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose?.()} />

<div class="backdrop" role="presentation" onclick={(e) => e.target === e.currentTarget && onclose?.()}>
  <div class="card sheet" class:wide role="dialog" aria-modal="true">
    {@render children()}
  </div>
</div>

<style>
  .wide {
    width: min(640px, 100%);
  }
</style>
