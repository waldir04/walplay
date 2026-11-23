import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import en from './resources/en.json'
import es from './resources/es.json'

type ResourceNode = { [key: string]: string | ResourceNode }

const flattenKeys = (node: ResourceNode, prefix = ''): string[] =>
  Object.entries(node).flatMap(([key, value]) => {
    const path = prefix.length === 0 ? key : `${prefix}.${key}`
    return typeof value === 'string' ? [path] : flattenKeys(value, path)
  })

const collectSourceText = (directory: string): string =>
  readdirSync(directory)
    .map((entry) => {
      const path = join(directory, entry)
      if (statSync(path).isDirectory()) {
        return collectSourceText(path)
      }
      return /\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)
        ? readFileSync(path, 'utf8')
        : ''
    })
    .join('\n')

const baseKey = (key: string): string => key.replace(/_(one|other)$/, '')

describe('detail localization resources', () => {
  const source = collectSourceText(join(process.cwd(), 'src'))
  const enKeys = flattenKeys(en.detail as ResourceNode)
  const esKeys = flattenKeys(es.detail as ResourceNode)

  it('defines the same detail keys in both locales', () => {
    expect([...esKeys].sort()).toEqual([...enKeys].sort())
  })

  it('uses plural suffixes only in complete one/other pairs', () => {
    for (const key of enKeys.filter((candidate) => /_one$|_other$/.test(candidate))) {
      const base = baseKey(key)
      expect(enKeys).toContain(`${base}_one`)
      expect(enKeys).toContain(`${base}_other`)
      expect(esKeys).toContain(`${base}_one`)
      expect(esKeys).toContain(`${base}_other`)
    }
  })

  it('references every detail key from application source', () => {
    const unused = enKeys.filter((key) => !source.includes(baseKey(key)))
    expect(unused).toEqual([])
  })

  it('keeps core and section loading and stale copy distinct', () => {
    expect(en.detail.states.loading).not.toBe(en.detail.states.sectionLoading)
    expect(en.detail.states.stale.label).not.toBe(en.detail.states.sectionStale)
    expect(en.detail.episodes.loading).not.toBe(en.detail.states.sectionLoading)
    expect(es.detail.states.loading).not.toBe(es.detail.states.sectionLoading)
    expect(es.detail.states.stale.label).not.toBe(es.detail.states.sectionStale)
    expect(es.detail.episodes.loading).not.toBe(es.detail.states.sectionLoading)
  })

  it('never defines two section labels for the same section', () => {
    const sectionValues = Object.entries(en.detail.sections).map(([key, value]) => [key, value])
    const values = sectionValues.map(([, value]) => value)
    expect(new Set(values).size).toBe(values.length)
    expect(Object.keys(en.detail.sections).sort()).toEqual(
      [
        'actions',
        'cast',
        'collection',
        'crew',
        'episodes',
        'overview',
        'providerMetadata',
        'seasons',
        'similar',
      ].sort()
    )
  })

  it('exposes the document title template and removes the placeholder detail copy', () => {
    expect(en.meta.detailTitle).toBe('{{title}} · {{mediaType}}')
    expect(es.meta.detailTitle).toBe('{{title}} · {{mediaType}}')
    expect('detailsUnavailable' in en.catalog.states).toBe(false)
    expect('detailsUnavailable' in es.catalog.states).toBe(false)
  })
})
