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

describe('saved localization resources', () => {
  const source = collectSourceText(join(process.cwd(), 'src'))
  const enKeys = flattenKeys(en.saved as ResourceNode)
  const esKeys = flattenKeys(es.saved as ResourceNode)

  it('defines the same saved keys in both locales', () => {
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

  it('references every saved key from application source', () => {
    const unused = enKeys.filter((key) => !source.includes(baseKey(key)))
    expect(unused).toEqual([])
  })

  it('keeps collection titles unique and both empty states distinct', () => {
    expect(en.saved.title.watchlist).not.toBe(en.saved.title.favorites)
    expect(es.saved.title.watchlist).not.toBe(es.saved.title.favorites)
    expect(en.saved.empty.watchlist.title).not.toBe(en.saved.empty.favorites.title)
    expect(en.saved.empty.watchlist.description).not.toBe(en.saved.empty.favorites.description)
    expect(es.saved.empty.watchlist.title).not.toBe(es.saved.empty.favorites.title)
    expect(es.saved.empty.watchlist.description).not.toBe(es.saved.empty.favorites.description)
  })

  it('exposes the navigation and document title keys in both locales', () => {
    expect(en.navigation.saved).toBe('Saved')
    expect(es.navigation.saved).toBe('Guardados')
    expect(en.meta.title.saved).toBe('Saved · Walplay')
    expect(es.meta.title.saved).toBe('Guardados · Walplay')
  })
})
