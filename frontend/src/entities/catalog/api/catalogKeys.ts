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
  search: (identity: string, language: InterfaceLanguage) =>
    [...catalogKeys.all, 'search', identity, language] as const,
} as const
