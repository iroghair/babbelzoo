// Word lists, shared by all players on this device (PLAN.md 2).
import { STARTER_NAME, STARTER_TEXT } from '../data/starter';
import { parseList } from './parse';
import { newId, readJson, writeJson } from './storage';
import type { Entry, WordLang, WordList } from './types';

function starterList(): WordList {
  const now = Date.now();
  return { id: 'starter', name: STARTER_NAME, langA: 'en', langB: 'nl', entries: parseList(STARTER_TEXT).entries, created: now, updated: now };
}

export const lists: { all: WordList[] } = $state({ all: readJson<WordList[] | null>('lists', null) ?? [starterList()] });

$effect.root(() => {
  $effect(() => writeJson('lists', $state.snapshot(lists.all)));
});

export function getList(id: string): WordList | undefined {
  return lists.all.find((l) => l.id === id);
}

export interface ListDraft {
  id?: string;
  name: string;
  langA: WordLang;
  langB: WordLang;
  entries: Entry[];
}

/** Creates a list, or updates it when the id exists. Entries keep their ids, so progress survives edits. */
export function saveList(draft: ListDraft): WordList {
  const now = Date.now();
  const existing = draft.id ? getList(draft.id) : undefined;
  if (existing) {
    Object.assign(existing, { name: draft.name, langA: draft.langA, langB: draft.langB, entries: draft.entries, updated: now });
    return existing;
  }
  const list: WordList = { id: newId(), name: draft.name, langA: draft.langA, langB: draft.langB, entries: draft.entries, created: now, updated: now };
  lists.all.push(list);
  return list;
}

export function deleteList(id: string): void {
  lists.all = lists.all.filter((l) => l.id !== id);
}
