import express from 'express'
import type { Express } from 'express'

import type { BackendConfig } from './config/env.js'
import { createAvailabilityController } from './controllers/availability.controller.js'
import { createCatalogController } from './controllers/catalog.controller.js'
import { createDetailController } from './controllers/detail.controller.js'
import { createSearchController } from './controllers/search.controller.js'
import { createTrailerController } from './controllers/trailer.controller.js'
import { createLogger, silentLogger } from './lib/logger.js'
import type { Logger } from './lib/logger.js'
import { createCorsMiddleware } from './middleware/cors.js'
import { createErrorMiddleware, createNotFoundHandler } from './middleware/error.js'
import { requestIdMiddleware } from './middleware/requestId.js'
import { createAvailabilityRouter } from './routes/availability.routes.js'
import { createCatalogRouter } from './routes/catalog.routes.js'
import { createDetailRouter } from './routes/detail.routes.js'
import { createSearchRouter } from './routes/search.routes.js'
import { createTrailerRouter } from './routes/trailer.routes.js'
import type { AvailabilityService } from './services/availability.service.js'
import type { CatalogService } from './services/catalog.service.js'
import type { DetailService } from './services/detail.service.js'
import type { SearchService } from './services/search.service.js'
import type { TrailerService } from './services/trailer.service.js'

export interface CreateAppOptions {
  readonly config: BackendConfig
  readonly service: CatalogService
  readonly detailService: DetailService
  readonly searchService: SearchService
  readonly availabilityService?: AvailabilityService
  readonly trailerService?: TrailerService
  readonly logger?: Logger
}

export const createApp = ({
  config,
  service,
  detailService,
  searchService,
  availabilityService,
  trailerService,
  logger,
}: CreateAppOptions): Express => {
  if (config.availabilityEnabled && availabilityService === undefined) {
    throw new Error('Availability is enabled but no availability service was provided.')
  }
  if (config.trailersEnabled && trailerService === undefined) {
    throw new Error('Trailers are enabled but no trailer service was provided.')
  }

  const app = express()
  const activeLogger =
    logger ?? (config.nodeEnv === 'test' ? silentLogger : createLogger(config.logLevel))

  app.disable('x-powered-by')
  app.use(express.json({ limit: '16kb' }))
  app.use(requestIdMiddleware)
  app.use(createCorsMiddleware({ allowedOrigins: config.corsAllowedOrigins }))

  app.get('/api/health', (_request, response) => {
    response.status(200).json({ status: 'ok' })
  })

  if (config.availabilityEnabled && availabilityService !== undefined) {
    app.use(
      '/api/catalog',
      createAvailabilityRouter(createAvailabilityController(availabilityService))
    )
  }
  if (config.trailersEnabled && trailerService !== undefined) {
    app.use('/api/catalog', createTrailerRouter(createTrailerController(trailerService)))
  }
  app.use('/api/catalog', createDetailRouter(createDetailController(detailService)))
  app.use('/api/catalog', createCatalogRouter(createCatalogController(service)))
  app.use('/api/search', createSearchRouter(createSearchController(searchService)))

  app.use(createNotFoundHandler())
  app.use(createErrorMiddleware(activeLogger))

  return app
}
