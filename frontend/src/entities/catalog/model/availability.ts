import { z } from 'zod'

const httpsUrlSchema = z
  .url()
  .refine((value) => new URL(value).protocol === 'https:', 'must be an https URL')

const timestampSchema = z
  .string()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), 'must be a parseable timestamp')

export const availabilityCategorySchema = z.enum(['subscription', 'free', 'ads', 'rent', 'buy'])
export type AvailabilityCategory = z.infer<typeof availabilityCategorySchema>

export const availabilityRegionSchema = z.string().regex(/^[A-Z]{2}$/)
export type AvailabilityRegion = z.infer<typeof availabilityRegionSchema>

export const availabilityProviderSchema = z.strictObject({
  name: z.string().trim().min(1),
  logo: z
    .strictObject({
      url: httpsUrlSchema,
      urlLarge: httpsUrlSchema.optional(),
    })
    .optional(),
})
export type AvailabilityProvider = z.infer<typeof availabilityProviderSchema>

export const availabilityGroupSchema = z.strictObject({
  category: availabilityCategorySchema,
  providers: z.array(availabilityProviderSchema).min(1).readonly(),
})
export type AvailabilityGroup = z.infer<typeof availabilityGroupSchema>

export const availabilityDestinationSchema = z.strictObject({ url: httpsUrlSchema })
export type AvailabilityDestination = z.infer<typeof availabilityDestinationSchema>

export const availableDataSchema = z.strictObject({
  state: z.literal('available'),
  region: availabilityRegionSchema,
  groups: z.array(availabilityGroupSchema).min(1).readonly(),
  destination: availabilityDestinationSchema.optional(),
})

export const noInformationDataSchema = z.strictObject({
  state: z.literal('no-information'),
  region: availabilityRegionSchema,
  groups: z.array(availabilityGroupSchema).length(0),
  destination: availabilityDestinationSchema.optional(),
})

export const unsupportedRegionDataSchema = z.strictObject({
  state: z.literal('unsupported-region'),
  region: availabilityRegionSchema,
  groups: z.array(availabilityGroupSchema).length(0),
})

export const availabilityDataSchema = z.discriminatedUnion('state', [
  availableDataSchema,
  noInformationDataSchema,
  unsupportedRegionDataSchema,
])
export type AvailabilityData = z.infer<typeof availabilityDataSchema>
export type AvailabilityState = AvailabilityData['state']
export type AvailableData = z.infer<typeof availableDataSchema>
export type NoInformationData = z.infer<typeof noInformationDataSchema>
export type UnsupportedRegionData = z.infer<typeof unsupportedRegionDataSchema>

export const availabilityMetaSchema = z.strictObject({
  stale: z.boolean(),
  lastUpdatedAt: timestampSchema,
  source: z.enum(['provider', 'cache', 'stale-cache']),
  freshness: z.enum(['current', 'stale']),
  sourceUpdatedAt: timestampSchema.optional(),
})
export type AvailabilityMeta = z.infer<typeof availabilityMetaSchema>

export const availabilityEnvelopeSchema = z.union([
  z.strictObject({ data: availableDataSchema, meta: availabilityMetaSchema }),
  z.strictObject({ data: noInformationDataSchema, meta: availabilityMetaSchema }),
  z.strictObject({ data: unsupportedRegionDataSchema }),
])
export type AvailabilityEnvelope = z.infer<typeof availabilityEnvelopeSchema>

export const availabilityRegionsEnvelopeSchema = z.strictObject({
  data: z.strictObject({
    regions: z.array(availabilityRegionSchema).min(1).readonly(),
  }),
})
export type AvailabilityRegionsEnvelope = z.infer<typeof availabilityRegionsEnvelopeSchema>

export const AVAILABILITY_CATEGORY_ORDER: readonly AvailabilityCategory[] = Object.freeze([
  'subscription',
  'free',
  'ads',
  'rent',
  'buy',
])

export const AVAILABILITY_CATEGORY_LABEL_KEYS: Readonly<Record<AvailabilityCategory, string>> =
  Object.freeze({
    subscription: 'detail.availability.categories.subscription',
    free: 'detail.availability.categories.free',
    ads: 'detail.availability.categories.ads',
    rent: 'detail.availability.categories.rent',
    buy: 'detail.availability.categories.buy',
  })

export const AVAILABILITY_UNSUPPORTED_REGION_DESCRIPTION_ID =
  'availability-unsupported-region-description'
