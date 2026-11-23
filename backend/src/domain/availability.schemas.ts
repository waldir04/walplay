import { z } from 'zod'

import { AVAILABILITY_REGION_PATTERN } from './availability.js'

const httpsUrlSchema = z.string().refine((value) => {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}, 'must be an https URL')

const isoDateTimeSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'must be a parseable timestamp')

const regionSchema = z.string().regex(AVAILABILITY_REGION_PATTERN)

export const availabilityProviderEntrySchema = z.strictObject({
  name: z.string().trim().min(1),
  logo: z
    .strictObject({
      url: httpsUrlSchema,
      urlLarge: httpsUrlSchema.optional(),
    })
    .optional(),
})

export const availabilityGroupSchema = z.strictObject({
  category: z.enum(['subscription', 'free', 'ads', 'rent', 'buy']),
  providers: z.array(availabilityProviderEntrySchema).min(1),
})

const destinationSchema = z.strictObject({ url: httpsUrlSchema })

const emptyGroups = z.array(availabilityGroupSchema).length(0)

export const availabilityMetaSchema = z.strictObject({
  stale: z.boolean(),
  lastUpdatedAt: isoDateTimeSchema,
  source: z.enum(['provider', 'cache', 'stale-cache']),
  freshness: z.enum(['current', 'stale']),
  sourceUpdatedAt: isoDateTimeSchema.optional(),
})

export const availableDataSchema = z.strictObject({
  state: z.literal('available'),
  region: regionSchema,
  groups: z.array(availabilityGroupSchema).min(1),
  destination: destinationSchema.optional(),
})

export const noInformationDataSchema = z.strictObject({
  state: z.literal('no-information'),
  region: regionSchema,
  groups: emptyGroups,
  destination: destinationSchema.optional(),
})

export const unsupportedRegionDataSchema = z.strictObject({
  state: z.literal('unsupported-region'),
  region: regionSchema,
  groups: emptyGroups,
})

export const availabilityDataSchema = z.discriminatedUnion('state', [
  availableDataSchema,
  noInformationDataSchema,
  unsupportedRegionDataSchema,
])

const withMeta = <T extends z.ZodType>(data: T) =>
  z.strictObject({ data, meta: availabilityMetaSchema })

export const availabilityEnvelopeSchema = z.union([
  withMeta(availableDataSchema),
  withMeta(noInformationDataSchema),
  z.strictObject({ data: unsupportedRegionDataSchema }),
])

export const availabilityRegionsEnvelopeSchema = z.strictObject({
  data: z.strictObject({
    regions: z.array(regionSchema).min(1),
  }),
})
