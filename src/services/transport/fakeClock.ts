import type { Clock } from './GameHost';

/** Testler için elle ilerletilen saat. */
export class FakeClock implements Clock {
  private t = 1_000_000;
  private seq = 0;
  private readonly tasks = new Map<number, { at: number; fn: () => void }>();

  now(): number {
    return this.t;
  }

  setTimeout(fn: () => void, ms: number): unknown {
    const id = ++this.seq;
    this.tasks.set(id, { at: this.t + ms, fn });
    return id;
  }

  clearTimeout(handle: unknown): void {
    this.tasks.delete(handle as number);
  }

  /** Zamanı ilerletir; vadesi gelen görevleri sırayla (zincirlenenler dahil) çalıştırır. */
  advance(ms: number): void {
    const end = this.t + ms;
    for (;;) {
      let next: [number, { at: number; fn: () => void }] | null = null;
      for (const entry of this.tasks) {
        if (entry[1].at <= end && (!next || entry[1].at < next[1].at)) next = entry;
      }
      if (!next) break;
      this.tasks.delete(next[0]);
      this.t = Math.max(this.t, next[1].at);
      next[1].fn();
    }
    this.t = end;
  }

  get pending(): number {
    return this.tasks.size;
  }
}
