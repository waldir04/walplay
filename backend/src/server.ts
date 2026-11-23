import { existsSync } from 'node:fs'

import { createApp } from './app.js'
import { ConfigError, loadConfig } from './config/env.js'
import { createLogger } from './lib/logger.js'
import { createTmdbClient } from './providers/tmdb/tmdb.client.js'
import { createGenreResolver } from './providers/tmdb/tmdb.genres.js'
import { createImageResolver } from './providers/tmdb/tmdb.images.js'
import { createTmdbDetailProvider } from './providers/tmdb/tmdb.detail.provider.js'
import { createTmdbProvider } from './providers/tmdb/tmdb.provider.js'
import { createTmdbSearchProvider } from './providers/tmdb/tmdb.search.provider.js'
import { CatalogCache } from './services/catalog-cache.js'
import { CatalogService } from './services/catalog.service.js'
import { DetailService } from './services/detail.service.js'
import { SearchService } from './services/search.service.js'

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
  const cacheOptions = {
    freshTtlMs: config.tmdbCacheTtlMs,
    staleTtlMs: config.tmdbCacheStaleMs,
    maxEntries: config.tmdbCacheMaxEntries,
  }
  const cache = new CatalogCache(cacheOptions)
  const searchCache = new CatalogCache(cacheOptions)
  const detailCache = new CatalogCache(cacheOptions)
  const app = createApp({
    config,
    service: new CatalogService({ provider, cache }),
    detailService: new DetailService({ provider: detailProvider, cache: detailCache }),
    searchService: new SearchService({ provider: searchProvider, cache: searchCache }),
    logger,
  })

  app.listen(config.port, () => {
    logger.info({ outcome: 'success', statusClass: '2xx' })
  })
}

start()
