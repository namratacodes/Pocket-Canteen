import { AppError } from './lib/errors';
import type { Ports } from './ports';

class Container {
  private map = new Map<string, unknown>();
  register<K extends keyof Ports>(key: K, impl: Ports[K]): void {
    this.map.set(key, impl);
  }
  get<K extends keyof Ports>(key: K): Ports[K] {
    const v = this.map.get(key);
    if (!v) throw new AppError('NOT_IMPLEMENTED', `Port '${key}' is not registered`);
    return v as Ports[K];
  }
  reset(): void {
    this.map.clear();
  }
}

/** A phase calls container.register('<port>', impl) inside its module's register(). Consumers call container.get('<port>') at call time, never at import time. */
export const container = new Container();
