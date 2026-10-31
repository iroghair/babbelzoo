// Backups: everything on this device in one file (PLAN.md 6). Based on TopoChamp's backup.ts.
import { readJson, writeJson } from './storage';

interface Backup {
  app: 'babbelzoo';
  v: 1;
  exported: string;
  prefs: unknown;
  players: { list: { id: string }[]; currentId: string };
  profiles: Record<string, unknown>;
  progress: Record<string, unknown>;
  lists: unknown[];
}

export function makeBackup(): Backup {
  const players = readJson<Backup['players']>('players', { list: [], currentId: '' });
  return {
    app: 'babbelzoo',
    v: 1,
    exported: new Date().toISOString(),
    prefs: readJson('prefs', {}),
    players,
    profiles: Object.fromEntries(players.list.map((p) => [p.id, readJson(`profile.${p.id}`, {})])),
    progress: Object.fromEntries(players.list.map((p) => [p.id, readJson(`progress.${p.id}`, {})])),
    lists: readJson('lists', []),
  };
}

export function backupFileName(): string {
  return `babbelzoo-${new Date().toISOString().slice(0, 10)}.json`;
}

/** Replaces everything stored with the backup. The page must be reloaded afterwards. */
export function restoreBackup(text: string): void {
  const data = JSON.parse(text) as Backup;
  if (data?.app !== 'babbelzoo' || !Array.isArray(data.players?.list) || !Array.isArray(data.lists)) {
    throw new Error('not a Babbelzoo backup');
  }
  writeJson('prefs', data.prefs ?? {});
  writeJson('players', data.players);
  for (const [id, profile] of Object.entries(data.profiles ?? {})) writeJson(`profile.${id}`, profile);
  for (const [id, progress] of Object.entries(data.progress ?? {})) writeJson(`progress.${id}`, progress);
  writeJson('lists', data.lists);
}
