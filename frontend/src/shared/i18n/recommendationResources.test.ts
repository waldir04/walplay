import { describe, expect, it } from 'vitest'

import en from './resources/en.json'
import es from './resources/es.json'

type ResourceNode = { [key: string]: string | ResourceNode }

const flattenKeys = (node: ResourceNode, prefix = ''): string[] =>
  Object.entries(node).flatMap(([key, value]) => {
    const path = prefix.length === 0 ? key : `${prefix}.${key}`
    return typeof value === 'string' ? [path] : flattenKeys(value, path)
  })

const valuesUnder = (node: ResourceNode): string[] =>
  Object.values(node).flatMap((value) => (typeof value === 'string' ? [value] : valuesUnder(value)))

const readRecommendation = (node: ResourceNode, key: string): string | undefined => {
  let current: string | ResourceNode | undefined = node
  for (const part of key.split('.')) {
    if (typeof current === 'string' || current === undefined) {
      return undefined
    }
    current = current[part]
  }
  return typeof current === 'string' ? current : undefined
}

const PROHIBITED_PHRASES = [
  'for you',
  'recommended for you',
  'picked for you',
  'because you watched',
  'matches your taste',
  'para ti',
  'recomendado para ti',
  'porque viste',
]

describe('recommendation localization resources', () => {
  const enNode = en.recommendations as ResourceNode
  const esNode = es.recommendations as ResourceNode
  const enKeys = flattenKeys(enNode)
  const esKeys = flattenKeys(esNode)

  it('defines the same recommendation keys in both locales', () => {
    expect([...esKeys].sort()).toEqual([...enKeys].sort())
  })

  it('contains no empty recommendation values', () => {
    const emptyKeys = enKeys.filter(
      (key) =>
        (readRecommendation(enNode, key) ?? '').trim().length === 0 ||
        (readRecommendation(esNode, key) ?? '').trim().length === 0
    )

    expect(emptyKeys).toEqual([])
  })

  it('avoids prohibited personalization claims in both languages', () => {
    const normalized = [...valuesUnder(enNode), ...valuesUnder(esNode)].map((value) =>
      value.toLowerCase()
    )

    for (const phrase of PROHIBITED_PHRASES) {
      expect(normalized.some((value) => value.includes(phrase))).toBe(false)
    }
  })

  it('keeps the explanation truthful about AI, saved titles, scope, and retention', () => {
    expect(en.recommendations.explanation.noAi).toMatch(/AI|machine learning/)
    expect(en.recommendations.explanation.noAi).toMatch(/profile/)
    expect(es.recommendations.explanation.noAi).toMatch(/inteligencia artificial/)
    expect(es.recommendations.explanation.noAi).toMatch(/perfil/)

    expect(en.recommendations.explanation.savedTitles).toMatch(/does not use the titles you saved/)
    expect(es.recommendations.explanation.savedTitles).toMatch(/no usa los títulos que guardaste/)

    expect(en.recommendations.explanation.scope).toMatch(/guest/)
    expect(es.recommendations.explanation.scope).toMatch(/invitado/)

    expect(en.recommendations.explanation.retention).toMatch(/browser/)
    expect(en.recommendations.explanation.retention).toMatch(/clear browsing data/)
    expect(es.recommendations.explanation.retention).toMatch(/navegador/)
    expect(es.recommendations.explanation.retention).toMatch(/datos de navegación/)
  })

  it('uses interpolation only for the media type and the localized date', () => {
    expect(en.recommendations.section.accessibleName).toBe('Popular now, {{mediaType}}')
    expect(es.recommendations.section.accessibleName).toBe('Popular ahora, {{mediaType}}')
    expect(en.recommendations.states.stale.lastUpdated).toBe('Loaded on {{date}}')
    expect(es.recommendations.states.stale.lastUpdated).toBe('Datos cargados el {{date}}')
  })
})
