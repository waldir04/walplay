import { z } from 'zod'

export const watchProviderDto = z.object({
  logo_path: z.string().nullish(),
  provider_id: z.number().int(),
  provider_name: z.string().nullish(),
  display_priority: z.number().nullish(),
})

export const watchProviderRegionDto = z.object({
  link: z.string().nullish(),
  flatrate: z.array(watchProviderDto).nullish(),
  free: z.array(watchProviderDto).nullish(),
  ads: z.array(watchProviderDto).nullish(),
  rent: z.array(watchProviderDto).nullish(),
  buy: z.array(watchProviderDto).nullish(),
})

export const watchProvidersDto = z.object({
  id: z.number(),
  results: z.record(z.string(), watchProviderRegionDto.nullish()).nullish(),
})

export type WatchProviderDto = z.infer<typeof watchProviderDto>
export type WatchProviderRegionDto = z.infer<typeof watchProviderRegionDto>
export type WatchProvidersDto = z.infer<typeof watchProvidersDto>
