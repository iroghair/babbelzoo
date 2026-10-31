<!-- Pasting, checking and editing a word list (PLAN.md 2.2). -->
<script lang="ts">
  import { untrack } from 'svelte';
  import { fmt, langName, tr, WORD_LANGS } from '../lib/i18n.svelte';
  import { deleteList, getList, saveList } from '../lib/lists.svelte';
  import { csvToText, listToCsv, listToText, parseList, parseSide, serializeSide, type ParseWarning } from '../lib/parse';
  import { downloadText } from '../lib/share';
  import { newId } from '../lib/storage';
  import { normalize } from '../lib/text';
  import type { Entry, WordLang } from '../lib/types';
  import Scenery from './Scenery.svelte';
  import SharePanel from './SharePanel.svelte';

  let { listId, onclose }: { listId: string | null; onclose: () => void } = $props();

  interface Row {
    id: string;
    a: string;
    b: string;
  }

  const existing = untrack(() => (listId ? getList(listId) : undefined));
  let name = $state(existing?.name ?? '');
  let langA: WordLang = $state(existing?.langA ?? 'en');
  let langB: WordLang = $state(existing?.langB ?? 'nl');
  let rows: Row[] = $state(existing ? existing.entries.map((e) => ({ id: e.id, a: serializeSide(e.a), b: serializeSide(e.b) })) : []);
  let paste = $state('');
  let warnings: ParseWarning[] = $state([]);
  let error = $state('');
  let sharing = $state(false);
  let fileInput: HTMLInputElement | undefined = $state();

  const snapshot = () => JSON.stringify({ name, langA, langB, rows });
  let saved = snapshot();
  const dirty = $derived(snapshot() !== saved);

  const parsed = $derived(paste.trim() ? parseList(paste) : null);

  /** Per row: which earlier row has the same left or right word, and whether a side is empty. */
  const checks = $derived.by(() => {
    const seenA = new Map<string, number>();
    const seenB = new Map<string, number>();
    return rows.map((r, i) => {
      const a = parseSide(r.a);
      const b = parseSide(r.b);
      const ka = a ? normalize(a.text) : '';
      const kb = b ? normalize(b.text) : '';
      const same = (ka && seenA.get(ka)) || (kb && seenB.get(kb)) || null;
      if (ka && !seenA.has(ka)) seenA.set(ka, i + 1);
      if (kb && !seenB.has(kb)) seenB.set(kb, i + 1);
      return { empty: !a || !b, sameAs: same };
    });
  });

  function addPasted() {
    if (!parsed) return;
    if (parsed.langs && rows.length === 0) [langA, langB] = parsed.langs;
    rows.push(...parsed.entries.map((e) => ({ id: e.id, a: serializeSide(e.a), b: serializeSide(e.b) })));
    warnings = parsed.warnings;
    paste = '';
    error = '';
  }

  function addRow() {
    rows.push({ id: newId(), a: '', b: '' });
    queueMicrotask(() => {
      const inputs = document.querySelectorAll<HTMLInputElement>('.word-row input');
      inputs[inputs.length - 2]?.focus();
    });
  }

  function swap() {
    rows = rows.map((r) => ({ ...r, a: r.b, b: r.a }));
    [langA, langB] = [langB, langA];
  }

  function entries(): Entry[] {
    const out: Entry[] = [];
    for (const r of rows) {
      const a = parseSide(r.a);
      const b = parseSide(r.b);
      if (a && b) out.push({ id: r.id, a, b });
    }
    return out;
  }

  function save() {
    const list = entries();
    if (!name.trim()) return (error = tr().needName);
    if (!list.length) return (error = tr().needWords);
    saveList({ id: existing?.id, name: name.trim(), langA, langB, entries: list });
    saved = snapshot();
    onclose();
  }

  function back() {
    if (dirty && !confirm(tr().unsavedConfirm)) return;
    onclose();
  }

  function remove() {
    if (!existing || !confirm(fmt(tr().deleteListConfirm, { name: existing.name }))) return;
    deleteList(existing.id);
    onclose();
  }

  async function openFile(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    const text = await file.text();
    paste = /\.csv$/i.test(file.name) ? csvToText(text) : text;
    if (!name.trim()) name = file.name.replace(/\.[^.]+$/, '');
    (e.currentTarget as HTMLInputElement).value = '';
  }

  const fileName = (ext: string) => `${(name.trim() || 'woordenlijst').replace(/[\\/:*?"<>|]/g, '')}.${ext}`;

  function warningText(w: ParseWarning): string {
    const t = tr();
    const tpl = w.kind === 'unreadable' ? t.warnUnreadable : w.kind === 'duplicate' ? t.warnDuplicate : t.warnShared;
    return fmt(tpl, { line: w.line, text: w.text });
  }
</script>

<main class="screen">
  <Scenery />
  <header class="topbar">
    <div class="left">
      <button class="icon-btn" onclick={back} aria-label={tr().back}>←</button>
      <h1>{existing ? tr().editListTitle : tr().newListTitle}</h1>
    </div>
    <div class="right">
      {#if existing}
        <button class="btn plain" onclick={() => (sharing = true)} disabled={dirty}>🔗 {tr().share}</button>
      {/if}
      <button class="btn" onclick={save}>{tr().save}</button>
    </div>
  </header>

  <div class="wrap stack">
    {#if error}
      <p class="panel bad" role="alert">{error}</p>
    {/if}

    <section class="card meta">
      <label class="field name">
        {tr().listName}
        <input class="input" bind:value={name} placeholder={tr().listNamePlaceholder} maxlength="60" />
      </label>
      <label class="field">
        {tr().langLeft}
        <select class="input" bind:value={langA}>
          {#each WORD_LANGS as l (l)}<option value={l}>{langName(l)}</option>{/each}
        </select>
      </label>
      <label class="field">
        {tr().langRight}
        <select class="input" bind:value={langB}>
          {#each WORD_LANGS as l (l)}<option value={l}>{langName(l)}</option>{/each}
        </select>
      </label>
    </section>

    <section class="card">
      <div class="row between">
        <h2>{tr().pasteTitle}</h2>
        <button class="btn plain" onclick={() => fileInput?.click()}>📄 {tr().importFile}</button>
        <input bind:this={fileInput} type="file" accept=".txt,.csv,text/plain,text/csv" hidden onchange={openFile} />
      </div>
      <p class="muted small">{tr().pasteHelp}</p>
      <textarea class="input paste" bind:value={paste} placeholder={tr().pastePlaceholder} rows="6" spellcheck="false"></textarea>
      <p class="muted small tips">{tr().pasteTips}</p>
      {#if parsed}
        <div class="row between">
          <span class="chip leaf">✓ {fmt(tr().recognised, { n: parsed.entries.length })}</span>
          <button class="btn" onclick={addPasted} disabled={!parsed.entries.length}>{tr().addToList}</button>
        </div>
        {#if parsed.entries.length}
          <div class="preview">
            {#each parsed.entries.slice(0, 50) as e (e.id)}
              <div class="pair"><span>{serializeSide(e.a)}</span><span class="arrow">→</span><span>{serializeSide(e.b)}</span></div>
            {/each}
          </div>
        {/if}
        {#each parsed.warnings as w (w.line)}
          <p class="warn" class:info={w.kind === 'shared'}>{warningText(w)}</p>
        {/each}
      {/if}
    </section>

    {#if warnings.length}
      <section>
        {#each warnings as w (w.line)}
          <p class="warn" class:info={w.kind === 'shared'}>{warningText(w)}</p>
        {/each}
      </section>
    {/if}

    <section class="card">
      <div class="row between">
        <h2>{fmt(tr().wordsTitle, { n: rows.length })}</h2>
        <button class="btn plain" onclick={swap} disabled={!rows.length}>⇄ {tr().swapSides}</button>
      </div>
      {#if !rows.length}
        <p class="muted">{tr().noWordsYet}</p>
      {:else}
        <div class="cols muted small"><span></span><span>{langName(langA)}</span><span>{langName(langB)}</span><span></span></div>
      {/if}
      {#each rows as r, i (r.id)}
        <div class="word-row">
          <span class="nr">{i + 1}</span>
          <input class="input" bind:value={r.a} aria-label={`${langName(langA)} ${i + 1}`} />
          <input class="input" bind:value={r.b} aria-label={`${langName(langB)} ${i + 1}`} />
          <button class="icon-btn del" onclick={() => rows.splice(i, 1)} aria-label={tr().delete}>✕</button>
          {#if checks[i]?.empty}
            <span class="note chip coral">{tr().emptySide}</span>
          {:else if checks[i]?.sameAs}
            <span class="note chip sky">{fmt(tr().sameAs, { n: checks[i].sameAs ?? '' })}</span>
          {/if}
        </div>
      {/each}
      <button class="btn plain add" onclick={addRow}>+ {tr().addWord}</button>
    </section>

    <section class="row footer">
      <button class="btn plain" onclick={() => downloadText(fileName('txt'), listToText(entries()))} disabled={!rows.length}>{tr().exportTxt}</button>
      <button class="btn plain" onclick={() => downloadText(fileName('csv'), listToCsv(entries(), [langName(langA), langName(langB)]), 'text/csv')} disabled={!rows.length}>
        {tr().exportCsv}
      </button>
      {#if existing}
        <button class="btn coral" onclick={remove}>{tr().deleteList}</button>
      {/if}
    </section>
  </div>

  {#if sharing && existing}
    <SharePanel list={existing} onclose={() => (sharing = false)} />
  {/if}
</main>

<style>
  h1 {
    font-size: 30px;
  }
  h2 {
    font-size: 22px;
  }
  .stack {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .between {
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .meta {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 14px;
  }
  .paste {
    min-height: 150px;
    resize: vertical;
    font-weight: 600;
    line-height: 1.5;
  }
  .tips {
    margin: 8px 0 12px;
  }
  .preview {
    max-height: 220px;
    overflow: auto;
    margin: 8px 0;
    padding: 8px 12px;
    border-radius: 14px;
    background: var(--surface-alt);
  }
  .pair {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 10px;
    padding: 3px 0;
    font-weight: 700;
  }
  .arrow {
    color: var(--ink-soft);
  }
  .warn {
    margin: 6px 0 0;
    padding: 8px 12px;
    border-radius: 12px;
    background: var(--coral-light);
    color: var(--coral-dark);
    font-weight: 700;
    font-size: 15px;
  }
  .warn.info {
    background: var(--sky-light);
    color: var(--sky-dark);
  }
  .cols,
  .word-row {
    display: grid;
    grid-template-columns: 32px 1fr 1fr 46px;
    gap: 10px;
    align-items: center;
  }
  .cols {
    font-weight: 800;
    margin-bottom: 4px;
  }
  .word-row {
    margin-bottom: 10px;
  }
  .word-row .input {
    min-height: 46px;
  }
  .nr {
    text-align: right;
    font-weight: 800;
    color: var(--ink-soft);
  }
  .note {
    grid-column: 2 / 4;
    justify-self: start;
    margin-top: -4px;
    font-size: 13px;
    padding: 3px 10px;
  }
  .del {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }
  .add {
    margin-top: 6px;
  }
  .footer {
    justify-content: flex-end;
  }
  @media (max-width: 640px) {
    .meta {
      grid-template-columns: 1fr 1fr;
    }
    .meta .name {
      grid-column: 1 / -1;
    }
    .cols {
      display: none;
    }
    .word-row {
      grid-template-columns: 1fr 1fr 40px;
    }
    .nr {
      display: none;
    }
    .note {
      grid-column: 1 / 3;
    }
  }
</style>
