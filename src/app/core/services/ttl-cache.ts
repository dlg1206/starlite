/** Simple in-memory cache where each entry expires a fixed duration after it's set. */
export class TtlCache<T> {
  private readonly store = new Map<string, { expiresAt: number; value: T }>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, { expiresAt: Date.now() + this.ttlMs, value });
  }

  clear(): void {
    this.store.clear();
  }
}
