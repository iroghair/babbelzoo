<script lang="ts">
  import { fmt, tr } from '../lib/i18n.svelte';
  import { qrSvg, shareLink } from '../lib/share';
  import type { WordList } from '../lib/types';
  import Modal from './Modal.svelte';

  let { list, onclose }: { list: WordList; onclose: () => void } = $props();

  let link = $state('');
  let copied = $state(false);
  $effect(() => {
    shareLink(list).then((l) => (link = l));
  });

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const input = document.getElementById('share-link') as HTMLInputElement | null;
      input?.select();
      document.execCommand?.('copy');
    }
    copied = true;
    setTimeout(() => (copied = false), 1800);
  }
</script>

<Modal {onclose}>
  <h2>{tr().shareTitle}</h2>
  <p class="muted">{tr().shareHelp}</p>
  <p class="chip leaf">{list.name} · {fmt(tr().wordsCount, { n: list.entries.length })}</p>
  {#if link}
    <div class="qr" aria-label="QR">{@html qrSvg(link)}</div>
    <div class="row link-row">
      <input id="share-link" class="input" readonly value={link} onfocus={(e) => e.currentTarget.select()} />
      <button class="btn" onclick={copy}>{copied ? tr().copied : tr().copyLink}</button>
    </div>
  {/if}
  <div class="row end">
    <button class="btn plain" onclick={onclose}>{tr().close}</button>
  </div>
</Modal>

<style>
  h2 {
    font-size: 26px;
    margin-bottom: 6px;
  }
  .qr {
    width: min(260px, 70vw);
    margin: 16px auto;
    padding: 10px;
    border-radius: 16px;
    background: #fff;
    border: 2px solid var(--line);
  }
  .qr :global(svg) {
    display: block;
    width: 100%;
    height: auto;
  }
  .link-row {
    flex-wrap: nowrap;
  }
  .link-row .input {
    font-size: 14px;
    font-weight: 600;
  }
  .end {
    justify-content: flex-end;
    margin-top: 16px;
  }
</style>
