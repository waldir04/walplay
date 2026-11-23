import { describe, expect, it } from 'vitest'

import { encodeItemId } from '../lib/itemId.js'
import { ProviderTimeoutError } from '../providers/tmdb/tmdb.errors.js'
import { CatalogCache } from './catalog-cache.js'
import { DetailService } from './detail.service.js'
import {
  createFakeDetailProvider,
  sampleCredits,
  sampleSeasonEpisodes,
  sampleTitleDetail,
} from '../test/fixtures/fakeDetailProvider.js'
import type { FakeDetailProvider } from '../test/fixtures/fakeDetailProvider.js'

const createService = (
  options: { freshTtlMs?: number; staleTtlMs?: number; now?: () => number; provider?: FakeDetailProvider } = {}
) => {
  const provider = options.provider ?? createFakeDetailProvider()
  const cache = new CatalogCache({
    freshTtlMs: options.freshTtlMs ?? 1000,
    staleTtlMs: options.staleTtlMs ?? 10_000,
    maxEntries: 50,
    ...(options.now === undefined ? {} : { now: options.now }),
  })
  return { provider, cache, service: new DetailService({ provider, cache }) }
}

const movieId = encodeItemId('movie', 550)
const tvId = encodeItemId('tv', 213)

describe('DetailService core detail', () => {
  it('returns mapped detail and reuses the cached entry', async () => {
    const { service, provider } = createService()
    const first = await service.getDetail({ mediaType: 'movie', itemId: movieId, language: 'en-US' })
    const second = await service.getDetail({ mediaType: 'movie', itemId: movieId, language: 'en-US' })

    expect(first.data.title).toBe('Fight Club')
    expect(first.meta).toMatchObject({ language: 'en-US', stale: false, source: 'provider' })
    expect(second.meta.source).toBe('cache')
    expect(provider.fetchDetail).toHaveBeenCalledTimes(1)
  })

  it('keys the cache by language', async () => {
    const { service, provider } = createService()
    await service.getDetail({ mediaType: 'movie', itemId: movieId, language: 'en-US' })
    await service.getDetail({ mediaType: 'movie', itemId: movieId, language: 'es-ES' })
    expect(provider.fetchDetail).toHaveBeenCalledTimes(2)
  })

  it('rejects malformed identities as validation errors', async () => {
    const { service } = createService()
    await expect(
      service.getDetail({ mediaType: 'movie', itemId: 'aaaaaaaa', language: 'en-US' })
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('rejects a media type that disagrees with the identity as not found', async () => {
    const { service } = createService()
    await expect(
      service.getDetail({ mediaType: 'tv', itemId: movieId, language: 'en-US' })
    ).rejects.toMatchObject({ code: 'CATALOG_NOT_FOUND' })
  })

  it('maps a provider null to not found', async () => {
    const { service, provider } = createService()
    provider.fetchDetail.mockResolvedValueOnce(null)
    await expect(
      service.getDetail({ mediaType: 'movie', itemId: movieId, language: 'en-US' })
    ).rejects.toMatchObject({ code: 'CATALOG_NOT_FOUND' })
  })

  it('maps provider failures through the existing error mapping', async () => {
    const { service, provider } = createService()
    provider.fetchDetail.mockRejectedValueOnce(new ProviderTimeoutError())
    await expect(
      service.getDetail({ mediaType: 'movie', itemId: movieId, language: 'en-US' })
    ).rejects.toMatchObject({ code: 'CATALOG_TIMEOUT' })
  })

  it('serves a stale entry within the stale window and labels it', async () => {
    let now = 0
    const provider = createFakeDetailProvider()
    const { service } = createService({ provider, freshTtlMs: 10, staleTtlMs: 1000, now: () => now })

    await service.getDetail({ mediaType: 'movie', itemId: movieId, language: 'en-US' })
    now = 50
    provider.fetchDetail.mockRejectedValueOnce(new ProviderTimeoutError())
    const result = await service.getDetail({
      mediaType: 'movie',
      itemId: movieId,
      language: 'en-US',
    })

    expect(result.meta.stale).toBe(true)
    expect(result.meta.source).toBe('stale-cache')
    expect(result.data.title).toBe('Fight Club')
  })
})

describe('DetailService secondary surfaces', () => {
  it('returns credits through the credits surface', async () => {
    const { service, provider } = createService()
    provider.fetchCredits.mockResolvedValueOnce(sampleCredits())
    const result = await service.getCredits({
      mediaType: 'movie',
      itemId: movieId,
      language: 'en-US',
    })
    expect(result.data.cast[0]?.name).toBe('Edward Norton')
    expect(provider.fetchCredits).toHaveBeenCalledWith({
      mediaType: 'movie',
      providerId: 550,
      language: 'en-US',
    })
  })

  it('serializes similar items as catalog items only', async () => {
    const { service, provider } = createService()
    provider.fetchSimilar.mockResolvedValueOnce([{ item: sampleTitleDetail('movie', 745) }])
    const result = await service.getSimilar({
      mediaType: 'movie',
      itemId: movieId,
      language: 'en-US',
    })
    expect(result.data.items).toHaveLength(1)
    expect(result.data.items[0]?.title).toBe('Fight Club')
    expect(result.data.items[0]).not.toHaveProperty('item')
  })

  it('returns an empty collection without calling the provider when there is no membership', async () => {
    const { service, provider } = createService()
    provider.fetchDetail.mockResolvedValueOnce({ detail: sampleTitleDetail('movie', 550) })
    const result = await service.getCollection({
      mediaType: 'movie',
      itemId: movieId,
      language: 'en-US',
    })
    expect(result.data.items).toEqual([])
    expect(provider.fetchCollection).not.toHaveBeenCalled()
  })

  it('reads collection membership from the cached core entry', async () => {
    const { service, provider } = createService()
    provider.fetchCollection.mockResolvedValueOnce({
      name: 'Example Collection',
      items: [{ item: sampleTitleDetail('movie', 603) }],
    })

    const result = await service.getCollection({
      mediaType: 'movie',
      itemId: movieId,
      language: 'en-US',
    })

    expect(result.data.name).toBe('Example Collection')
    expect(result.data.items).toHaveLength(1)
    expect(provider.fetchCollection).toHaveBeenCalledWith({
      providerId: 550,
      language: 'en-US',
      collectionProviderId: 100,
    })
  })

  it('rejects a tv collection and a movie season as not found', async () => {
    const { service } = createService()
    await expect(
      service.getCollection({ mediaType: 'tv', itemId: tvId, language: 'en-US' })
    ).rejects.toMatchObject({ code: 'CATALOG_NOT_FOUND' })
    await expect(
      service.getSeason({
        mediaType: 'movie',
        itemId: movieId,
        language: 'en-US',
        seasonNumber: 1,
      })
    ).rejects.toMatchObject({ code: 'CATALOG_NOT_FOUND' })
  })

  it('maps a missing season to DETAIL_SEASON_NOT_FOUND', async () => {
    const { service, provider } = createService()
    provider.fetchSeason.mockResolvedValueOnce(null)
    await expect(
      service.getSeason({ mediaType: 'tv', itemId: tvId, language: 'en-US', seasonNumber: 9 })
    ).rejects.toMatchObject({ code: 'DETAIL_SEASON_NOT_FOUND' })
  })

  it('validates the season range', async () => {
    const { service } = createService()
    await expect(
      service.getSeason({ mediaType: 'tv', itemId: tvId, language: 'en-US', seasonNumber: 1000 })
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('returns season episodes and caches by season and language', async () => {
    const { service, provider } = createService()
    provider.fetchSeason.mockImplementation(async ({ seasonNumber }) =>
      sampleSeasonEpisodes(seasonNumber)
    )

    const first = await service.getSeason({
      mediaType: 'tv',
      itemId: tvId,
      language: 'en-US',
      seasonNumber: 2,
    })
    const second = await service.getSeason({
      mediaType: 'tv',
      itemId: tvId,
      language: 'en-US',
      seasonNumber: 2,
    })
    await service.getSeason({
      mediaType: 'tv',
      itemId: tvId,
      language: 'es-ES',
      seasonNumber: 2,
    })

    expect(first.data.season.number).toBe(2)
    expect(second.meta.source).toBe('cache')
    expect(provider.fetchSeason).toHaveBeenCalledTimes(2)
  })
})
