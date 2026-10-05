type Listener = (...args: any[]) => void;

export class MockSocket {
  private listeners: Map<string, Set<Listener>> = new Map();
  public connected: boolean = true;

  on(event: string, fn: Listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(fn);
    return this;
  }

  off(event: string, fn: Listener) {
    this.listeners.get(event)?.delete(fn);
    return this;
  }

  emit(event: string, ..._args: any[]) {
    // client emit simulation
    return this;
  }

  connect() {
    this.connected = true;
    return this;
  }

  disconnect() {
    this.connected = false;
    return this;
  }

  __serverEmit(event: string, payload?: any) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((fn) => fn(payload));
    }
  }
}

export const mockSocket = new MockSocket();
