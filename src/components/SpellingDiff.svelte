<!-- The right spelling, letter by letter: green = right, coral = typed wrong, blue = missing. -->
<script lang="ts">
  import { spellingDiff } from '../lib/text';

  let { typed, correct }: { typed: string; correct: string } = $props();
  const parts = $derived(spellingDiff(typed, correct));
</script>

<span class="diff display">
  {#each parts as p, i (i)}<span class={p.kind}>{p.text}</span>{/each}
</span>

<style>
  .diff {
    font-size: 26px;
    letter-spacing: 0.02em;
  }
  .ok {
    color: var(--leaf);
  }
  .wrong {
    color: var(--coral);
    text-decoration: line-through;
    text-decoration-thickness: 2px;
  }
  .swap {
    color: var(--coral);
    text-decoration: underline wavy;
    text-decoration-thickness: 2px;
    text-underline-offset: 5px;
  }
  .missing {
    color: var(--sky);
    text-decoration: underline;
    text-decoration-thickness: 3px;
    text-underline-offset: 4px;
  }
</style>
