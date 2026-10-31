<!-- Settings per player (spelling, hints, …), per device (language, sound) and backups (PLAN.md 7). -->
<script lang="ts">
  import { backupFileName, makeBackup, restoreBackup } from '../lib/backup';
  import { fmt, tr } from '../lib/i18n.svelte';
  import { prefs } from '../lib/prefs.svelte';
  import { currentPlayer, profile } from '../lib/profile.svelte';
  import { downloadText } from '../lib/share';
  import Scenery from './Scenery.svelte';

  let { onback, onplayers }: { onback: () => void; onplayers: () => void } = $props();

  const s = $derived(profile.data.settings);
  let fileInput: HTMLInputElement | undefined = $state();
  let error = $state('');

  async function restore(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      if (!confirm(tr().restoreConfirm)) return;
      restoreBackup(text);
      location.reload();
    } catch {
      error = tr().restoreError;
    }
  }
</script>

<main class="screen">
  <Scenery />
  <header class="topbar">
    <div class="left">
      <button class="icon-btn" onclick={onback} aria-label={tr().back}>←</button>
      <h1>{tr().settings}</h1>
    </div>
  </header>

  <div class="wrap col">
    <section class="card">
      <div class="row head">
        <span class="token me">{currentPlayer()?.avatar}</span>
        <h2>{fmt(tr().playerSettings, { name: currentPlayer()?.name ?? '' })}</h2>
        <button class="btn plain small-btn" onclick={onplayers}>✎ {tr().editPlayer}</button>
      </div>

      <div class="setting">
        <span class="label">{tr().spelling}</span>
        <div class="seg">
          <button aria-pressed={s.spelling === 'lenient'} onclick={() => (s.spelling = 'lenient')}>{tr().lenient}</button>
          <button aria-pressed={s.spelling === 'strict'} onclick={() => (s.spelling = 'strict')}>{tr().strict}</button>
        </div>
      </div>
      <div class="setting">
        <span class="label">{tr().articles}</span>
        <div class="seg">
          <button aria-pressed={s.articles === 'optional'} onclick={() => (s.articles = 'optional')}>{tr().articlesOptional}</button>
          <button aria-pressed={s.articles === 'required'} onclick={() => (s.articles = 'required')}>{tr().articlesRequired}</button>
        </div>
      </div>
      <div class="setting">
        <span class="label">{tr().hintSpeed}</span>
        <div class="seg">
          <button aria-pressed={s.hintSpeed === 'slow'} onclick={() => (s.hintSpeed = 'slow')}>{tr().slow}</button>
          <button aria-pressed={s.hintSpeed === 'normal'} onclick={() => (s.hintSpeed = 'normal')}>{tr().normal}</button>
          <button aria-pressed={s.hintSpeed === 'off'} onclick={() => (s.hintSpeed = 'off')}>{tr().off}</button>
        </div>
      </div>
      <div class="setting">
        <span class="label">{tr().copyStepSetting}</span>
        <div class="seg">
          <button aria-pressed={s.copyAfterWrong} onclick={() => (s.copyAfterWrong = true)}>{tr().on}</button>
          <button aria-pressed={!s.copyAfterWrong} onclick={() => (s.copyAfterWrong = false)}>{tr().off}</button>
        </div>
      </div>
      <div class="setting">
        <span class="label">{tr().testFeedback}</span>
        <div class="seg">
          <button aria-pressed={s.testFeedback === 'each'} onclick={() => (s.testFeedback = 'each')}>{tr().feedbackEach}</button>
          <button aria-pressed={s.testFeedback === 'end'} onclick={() => (s.testFeedback = 'end')}>{tr().feedbackEnd}</button>
        </div>
      </div>
    </section>

    <section class="card">
      <h2>📱 {tr().deviceSettings}</h2>
      <div class="setting">
        <span class="label">{tr().uiLanguage}</span>
        <div class="seg">
          <button aria-pressed={prefs.uiLang === 'nl'} onclick={() => (prefs.uiLang = 'nl')}>🇳🇱 Nederlands</button>
          <button aria-pressed={prefs.uiLang === 'en'} onclick={() => (prefs.uiLang = 'en')}>🇬🇧 English</button>
        </div>
      </div>
      <div class="setting">
        <span class="label">{tr().sound}</span>
        <div class="seg">
          <button aria-pressed={prefs.sound} onclick={() => (prefs.sound = true)}>🔊 {tr().on}</button>
          <button aria-pressed={!prefs.sound} onclick={() => (prefs.sound = false)}>🔇 {tr().off}</button>
        </div>
      </div>
    </section>

    <section class="card">
      <h2>💾 {tr().backup}</h2>
      <p class="muted">{tr().backupHelp}</p>
      {#if error}<p class="panel bad">{error}</p>{/if}
      <div class="row">
        <button class="btn" onclick={() => downloadText(backupFileName(), JSON.stringify(makeBackup()), 'application/json')}>{tr().downloadBackup}</button>
        <button class="btn plain" onclick={() => fileInput?.click()}>{tr().restoreBackup}</button>
        <input bind:this={fileInput} type="file" accept=".json,application/json" hidden onchange={restore} />
      </div>
    </section>
  </div>
</main>

<style>
  h1 {
    font-size: 30px;
  }
  h2 {
    font-size: 22px;
  }
  .col {
    max-width: 760px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .head {
    margin-bottom: 8px;
  }
  .head h2 {
    flex: 1;
  }
  .me {
    width: 48px;
    height: 48px;
    font-size: 26px;
  }
  .small-btn {
    min-height: 42px;
    font-size: 15px;
    padding: 6px 14px;
  }
  .setting {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px 0;
    border-bottom: 2px solid var(--surface-alt);
  }
  .setting:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
  .label {
    font-weight: 800;
    color: var(--ink-soft);
    font-size: 15px;
  }
</style>
