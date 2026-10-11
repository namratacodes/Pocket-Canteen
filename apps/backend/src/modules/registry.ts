import type { BackendModule } from './types';

/** Fixed list. A module whose folder does not exist yet is silently skipped, so every phase runs alone. */
export const MODULE_NAMES = ['identity', 'catalog', 'wallet', 'orders', 'payments', 'platform'] as const;

export function loadModules(): BackendModule[] {
  const out: BackendModule[] = [];
  for (const name of MODULE_NAMES) {
    try {
      const mod = require(`./${name}`);
      out.push(mod.default ?? mod.module);
    } catch (e: any) {
      if (e?.code === 'MODULE_NOT_FOUND' && String(e.message).includes(`'./${name}'`)) continue;
      throw e;
    }
  }
  return out;
}
