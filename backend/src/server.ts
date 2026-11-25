import { existsSync } from 'node:fs'

import { createApp } from './app.js'
import { ConfigError, loadConfig } from './config/env.js'
import { createLogger } from './lib/logger.js'
import { createTmdbClient } from './providers/tmdb/tmdb.client.js'
import { createGenreResolver } from './providers/tmdb/tmdb.genres.js'
import { createImageResolver } from './providers/tmdb/tmdb.images.js'
import { createTmdbAvailabilityProvider } from './providers/tmdb/tmdb.availability.provider.js'
import { createTmdbDetailProvider } from './providers/tmdb/tmdb.detail.provider.js'
import { createTmdbProvider } from './providers/tmdb/tmdb.provider.js'
import { createTmdbSearchProvider } from './providers/tmdb/tmdb.search.provider.js'
import { createTmdbTrailerProvider } from './providers/tmdb/tmdb.trailer.provider.js'
import { AvailabilityService } from './services/availability.service.js'
import { CatalogCache } from './services/catalog-cache.js'
import { CatalogService } from './services/catalog.service.js'
import { DetailService } from './services/detail.service.js'
import { SearchService } from './services/search.service.js'
import { TrailerService } from './services/trailer.service.js'

const loadLocalEnvironment = (): void => {
  if (!existsSync('.env.local')) {
    return
  }
  try {
    process.loadEnvFile('.env.local')
  } catch {
    // A malformed local env file is reported by configuration validation.
  }
}

const start = (): void => {
  loadLocalEnvironment()

  let config
  try {
    config = loadConfig()
  } catch (error) {
    if (error instanceof ConfigError) {
      process.stderr.write(`${error.message}\n`)
      process.exitCode = 1
      return
    }
    throw error
  }

  const logger = createLogger(config.logLevel)
  const client = createTmdbClient({
    baseUrl: config.tmdbBaseUrl,
    accessToken: config.tmdbAccessToken,
    timeoutMs: config.tmdbTimeoutMs,
    maxRetries: config.tmdbMaxRetries,
  })
  const genres = createGenreResolver(client)
  const images = createImageResolver(client, { ttlMs: config.tmdbImageConfigTtlMs })
  const provider = createTmdbProvider({ client, images, genres })
  const searchProvider = createTmdbSearchProvider({ client, images, genres })
  const detailProvider = createTmdbDetailProvider({ client, images, genres })
  const trailerProvider = createTmdbTrailerProvider({
    client,
    embedHosts: config.trailersEmbedHosts,
    externalHosts: config.trailersExternalHosts,
    maxInventory: config.trailersMaxInventory,
  })
  const cacheOptions = {
    freshTtlMs: config.tmdbCacheTtlMs,
    staleTtlMs: config.tmdbCacheStaleMs,
    maxEntries: config.tmdbCacheMaxEntries,
  }
  const cache = new CatalogCache(cacheOptions)
  const searchCache = new CatalogCache(cacheOptions)
  const detailCache = new CatalogCache(cacheOptions)
  const availabilityProvider = createTmdbAvailabilityProvider({
    client,
    images,
    logosEnabled: config.availabilityLogosEnabled,
    destinationHosts: config.availabilityDestinationHosts,
  })
  const availabilityCache = new CatalogCache({
    freshTtlMs: config.availabilityCacheTtlMs,
    staleTtlMs: config.availabilityCacheStaleMs,
    maxEntries: config.availabilityCacheMaxEntries,
  })
  const trailerCache = new CatalogCache({
    freshTtlMs: config.trailersCacheTtlMs,
    staleTtlMs: config.trailersCacheStaleMs,
    maxEntries: config.trailersCacheMaxEntries,
  })
  const trailerService = new TrailerService({
    provider: trailerProvider,
    cache: trailerCache,
    freshnessWindowMs: config.trailersCacheTtlMs,
    retentionMs: config.trailersCacheStaleMs,
  })
  const availabilityService = new AvailabilityService({
    provider: availabilityProvider,
    cache: availabilityCache,
    supportedRegions: config.availabilitySupportedRegions,
    freshnessWindowMs: config.availabilityFreshnessWindowMs,
    retentionMs: config.availabilityCacheStaleMs,
  })
  const app = createApp({
    config,
    service: new CatalogService({ provider, cache }),
    detailService: new DetailService({ provider: detailProvider, cache: detailCache }),
    searchService: new SearchService({ provider: searchProvider, cache: searchCache }),
    availabilityService,
    trailerService,
    logger,
  })

  app.listen(config.port, () => {
    logger.info({ outcome: 'success', statusClass: '2xx' })
  })
}

start()
