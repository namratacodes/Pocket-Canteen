/** Closed -> open after 5 failures within 30 s. Open for 15 s, then one probe (half-open). */
export class Breaker {
  now: () => number = () => Date.now();
  private failures: number[] = [];
  private openedAt: number | null = null;
  private probing = false;

  constructor(private maxFailures = 5, private windowMs = 30_000, private openMs = 15_000) {}

  allow(): boolean {
    if (this.openedAt === null) return true;
    if (this.now() - this.openedAt < this.openMs) return false;
    if (this.probing) return false;
    this.probing = true;
    return true;
  }

  success() {
    this.failures = [];
    this.openedAt = null;
    this.probing = false;
  }

  failure() {
    const t = this.now();
    if (this.probing) {
      this.probing = false;
      this.openedAt = t;
      return;
    }
    this.failures = this.failures.filter((x) => t - x < this.windowMs);
    this.failures.push(t);
    if (this.failures.length >= this.maxFailures) this.openedAt = t;
  }

  reset() {
    this.failures = [];
    this.openedAt = null;
    this.probing = false;
    this.now = () => Date.now();
  }
}

export const mlBreaker = new Breaker();
