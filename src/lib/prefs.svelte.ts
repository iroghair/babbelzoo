// Device-wide preferences: interface language and sound. Everything else is per player.
import { readJson, writeJson } from './storage';
import type { UiLang } from './types';

export interface Prefs {
  uiLang: UiLang;
  sound: boolean;
}

const DEFAULTS: Prefs = { uiLang: 'nl', sound: true };

export const prefs: Prefs = $state({ ...DEFAULTS, ...readJson<Partial<Prefs>>('prefs', {}) });

$effect.root(() => {
  $effect(() => writeJson('prefs', $state.snapshot(prefs)));
});
