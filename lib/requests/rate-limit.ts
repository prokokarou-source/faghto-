export class RateLimiter {
  private lastRequestAt = new Map<string, number>()

  constructor(private windowMs: number) {}

  attempt(key: string, now: number): boolean {
    const last = this.lastRequestAt.get(key)
    if (last !== undefined && now - last < this.windowMs) {
      return false
    }
    this.lastRequestAt.set(key, now)
    return true
  }
}
