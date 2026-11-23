import type { InterfaceLanguage } from '@/entities/catalog/model/catalogLanguage'
import type { MediaType } from '@/entities/catalog/model/catalogItem'
import type { SectionId } from '@/entities/catalog/model/catalogSection'

export const catalogKeys = {
  all: ['catalog'] as const,
  capabilities: () => [...catalogKeys.all, 'capabilities'] as const,
  section: (mediaType: MediaType, section: SectionId, language: InterfaceLanguage, page: number) =>
    [...catalogKeys.all, 'section', mediaType, section, language, page] as const,
  category: (mediaType: MediaType, section: SectionId, language: InterfaceLanguage) =>
    [...catalogKeys.all, 'category', mediaType, section, language] as const,
  item: (mediaType: MediaType, itemId: string, language: InterfaceLanguage) =>
    [...catalogKeys.all, 'item', mediaType, itemId, language] as const,
  detail: (mediaType: MediaType, itemId: string, language: InterfaceLanguage) =>
    [...catalogKeys.all, 'detail', mediaType, itemId, language] as const,
  credits: (mediaType: MediaType, itemId: string, language: InterfaceLanguage) =>
    [...catalogKeys.all, 'credits', mediaType, itemId, language] as const,
  similar: (mediaType: MediaType, itemId: string, language: InterfaceLanguage) =>
    [...catalogKeys.all, 'similar', mediaType, itemId, language] as const,
  collection: (mediaType: MediaType, itemId: string, language: InterfaceLanguage) =>
    [...catalogKeys.all, 'collection', mediaType, itemId, language] as const,
  season: (
    mediaType: MediaType,
    itemId: string,
    seasonNumber: number,
    language: InterfaceLanguage
  ) => [...catalogKeys.all, 'season', mediaType, itemId, seasonNumber, language] as const,
  availability: (mediaType: MediaType, itemId: string, region: string) =>
    [...catalogKeys.all, 'availability', mediaType, itemId, region] as const,
  availabilityRegions: () => [...catalogKeys.all, 'availabilityRegions'] as const,
  search: (identity: string, language: InterfaceLanguage) =>
    [...catalogKeys.all, 'search', identity, language] as const,
} as const
