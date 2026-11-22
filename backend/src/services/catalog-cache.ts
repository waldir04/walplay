export interface CacheResult<T> {
  readonly value: T
  readonly stale: boolean
  readonly source: 'provider' | 'cache' | 'stale-cache'
  readonly lastUpdatedAt: string
}

interface CacheEntry<T> {
  readonly value: T
  readonly freshUntil: number
  readonly staleUntil: number
  readonly lastUpdatedAt: number
}

export interface CatalogCacheOptions {
  readonly freshTtlMs: number
  readonly staleTtlMs: number
  readonly maxEntries: number
  readonly now?: () => number
}

export class CatalogCache {
  private readonly entries = new Map<string, CacheEntry<unknown>>()
  private readonly inFlight = new Map<string, Promise<CacheResult<unknown>>>()
  private readonly freshTtlMs: number
  private readonly staleTtlMs: number
  private readonly maxEntries: number
  private readonly now: () => number

  public constructor({ freshTtlMs, staleTtlMs, maxEntries, now = Date.now }: CatalogCacheOptions) {
    this.freshTtlMs = freshTtlMs
    this.staleTtlMs = staleTtlMs
    this.maxEntries = maxEntries
    this.now = now
  }

  public get size(): number {
    return this.entries.size
  }

  public async getOrLoad<T>(key: string, loader: () => Promise<T>): Promise<CacheResult<T>> {
    const now = this.now()
    const entry = this.entries.get(key) as CacheEntry<T> | undefined

    if (entry && entry.freshUntil > now) {
      return {
        value: entry.value,
        stale: false,
        source: 'cache',
        lastUpdatedAt: new Date(entry.lastUpdatedAt).toISOString(),
      }
    }

    const pending = this.inFlight.get(key) as Promise<CacheResult<T>> | undefined
    if (pending) {
      return pending
    }

    const load = async (): Promise<CacheResult<T>> => {
      try {
        const value = await loader()
        const fetchedAt = this.now()
        const nextEntry: CacheEntry<T> = {
          value,
          freshUntil: fetchedAt + this.freshTtlMs,
          staleUntil: fetchedAt + this.staleTtlMs,
          lastUpdatedAt: fetchedAt,
        }
        this.store(key, nextEntry, fetchedAt)
        return {
          value,
          stale: false,
          source: 'provider',
          lastUpdatedAt: new Date(fetchedAt).toISOString(),
        }
      } catch (error) {
        const staleEntry = this.entries.get(key) as CacheEntry<T> | undefined
        if (staleEntry && staleEntry.staleUntil > this.now()) {
          return {
            value: staleEntry.value,
            stale: true,
            source: 'stale-cache',
            lastUpdatedAt: new Date(staleEntry.lastUpdatedAt).toISOString(),
          }
        }
        throw error
      }
    }

    const promise = load().finally(() => {
      this.inFlight.delete(key)
    })
    this.inFlight.set(key, promise)
    return promise
  }

  public clear(): void {
    this.entries.clear()
    this.inFlight.clear()
  }

  private store<T>(key: string, entry: CacheEntry<T>, now: number): void {
    if (!this.entries.has(key) && this.entries.size >= this.maxEntries) {
      this.evict(now, 1)
    }
    this.entries.set(key, entry)
  }

  private evict(now: number, needed: number): void {
    let removed = 0
    for (const [key, entry] of this.entries) {
      if (removed >= needed) {
        break
      }
      if (entry.staleUntil <= now) {
        this.entries.delete(key)
        removed += 1
      }
    }

    while (removed < needed && this.entries.size > 0) {
      const oldestKey = this.entries.keys().next().value
      if (oldestKey === undefined) {
        break
      }
      this.entries.delete(oldestKey)
      removed += 1
    }
  }
}
